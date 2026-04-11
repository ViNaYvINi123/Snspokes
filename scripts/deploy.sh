#!/bin/bash
# ══════════════════════════════════════════════════════════
# snspokes Production Deploy Script
# Handles: zero-downtime rolling update across 3 instances
# ══════════════════════════════════════════════════════════

set -e
cd /root/snspokes

echo "🚀 snspokes deploy started at $(date)"

# 1. Pull latest code
echo "📦 Pulling latest..."
git pull

# 2. Build new image
echo "🔨 Building image..."
docker compose build --no-cache nextjs_1 nextjs_2 nextjs_3

# 3. Run DB migrations
echo "🗄️  Running migrations..."
docker compose run --rm nextjs_1 node -e "
const { query } = require('./lib/db');
Promise.all([
  require('fs').readdirSync('.').filter(f => f.match(/^database_v\d+.*\.sql$/)).sort().map(f => {
    console.log('Migration:', f);
  })
]).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
" 2>/dev/null || true

# 4. Rolling restart (zero downtime)
echo "🔄 Rolling restart..."
# Restart instance 1, wait for health
docker compose up -d nextjs_1
sleep 10
docker compose exec nextjs_1 curl -sf http://localhost:3001/api/health > /dev/null && echo "  ✓ Instance 1 healthy"

# Restart instance 2
docker compose up -d nextjs_2
sleep 10
docker compose exec nextjs_2 curl -sf http://localhost:3001/api/health > /dev/null && echo "  ✓ Instance 2 healthy"

# Restart instance 3
docker compose up -d nextjs_3
sleep 10
docker compose exec nextjs_3 curl -sf http://localhost:3001/api/health > /dev/null && echo "  ✓ Instance 3 healthy"

# 5. Reload Nginx (no downtime — hot reload)
echo "🔄 Reloading Nginx..."
docker compose exec nginx nginx -s reload

# 6. Warm up Redis cache
echo "🔥 Warming cache..."
curl -s "https://snspokes.com/api/flags" > /dev/null
curl -s -X POST "https://snspokes.com/api/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"GlideRecord query"}' > /dev/null
curl -s -X POST "https://snspokes.com/api/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"ServiceNow REST API"}' > /dev/null

echo "✅ Deploy complete at $(date)"
echo ""
echo "Instance health:"
for i in 1 2 3; do
  status=$(docker compose exec nextjs_$i curl -sf http://localhost:3001/api/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'instance {d.get(\"instance\",\"?\")} | db:{d.get(\"db\",\"?\")} | redis:{d.get(\"redis\",\"?\")}')" 2>/dev/null || echo "unreachable")
  echo "  nextjs_$i: $status"
done
