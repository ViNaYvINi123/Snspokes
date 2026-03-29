#!/bin/bash
# =============================================================
# snspokes — Zero-Downtime Blue/Green Deploy
# Usage: ./deploy.sh [blue|green]  (or auto-detects)
# =============================================================

set -euo pipefail
APP_DIR="/root/snspokes"
[ -f "${APP_DIR}/.env.backup" ] && source "${APP_DIR}/.env.backup"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
log() { echo "[$(date '+%H:%M:%S')] $1"; }
alert() { [ -n "$SLACK_WEBHOOK" ] && curl -s -X POST "$SLACK_WEBHOOK" -H "Content-Type: application/json" -d "{\"text\":\"$1\"}" || true; }

# Detect current active slot
CURRENT=$(cat "${APP_DIR}/.active_slot" 2>/dev/null || echo "blue")
if [ "$CURRENT" = "blue" ]; then NEXT="green"; NEXT_PORT=3002; ACTIVE_PORT=3001
else NEXT="blue"; NEXT_PORT=3001; ACTIVE_PORT=3002; fi
log "Current slot: ${CURRENT} (port ${ACTIVE_PORT}) → Deploying to: ${NEXT} (port ${NEXT_PORT})"
alert "🚀 Deploying snspokes to slot \`${NEXT}\`..."

# Pull latest code
cd "$APP_DIR" && git pull origin main
log "  ✓ Code pulled"

# Build new image
log "Building new image for slot ${NEXT}..."
docker build -t "snspokes_nextjs_${NEXT}:latest" -f Dockerfile ./app
log "  ✓ Image built"

# Start new container on alternate port
log "Starting ${NEXT} container on port ${NEXT_PORT}..."
docker rm -f "snspokes_nextjs_${NEXT}" 2>/dev/null || true
docker run -d \
  --name "snspokes_nextjs_${NEXT}" \
  --network snspokes_internal \
  --env-file "${APP_DIR}/app/.env.local" \
  -e PORT="${NEXT_PORT}" \
  -p "${NEXT_PORT}:${NEXT_PORT}" \
  "snspokes_nextjs_${NEXT}:latest"

# Health check new container
log "Waiting for ${NEXT} to be healthy..."
for i in {1..12}; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${NEXT_PORT}/api/health" 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ]; then log "  ✓ ${NEXT} is healthy (attempt ${i})"; break; fi
  [ "$i" = "12" ] && { alert "❌ Deploy failed — ${NEXT} not healthy"; docker rm -f "snspokes_nextjs_${NEXT}"; exit 1; }
  sleep 5
done

# Switch nginx to new slot
log "Switching nginx to ${NEXT} (port ${NEXT_PORT})..."
sed -i "s/server nextjs:[0-9]*/server nextjs:${NEXT_PORT}/" "${APP_DIR}/nginx.conf" 2>/dev/null || \
  docker exec snspokes_nginx sed -i "s/server nextjs:[0-9]*/server snspokes_nextjs_${NEXT}:${NEXT_PORT}/" /etc/nginx/nginx.conf
docker exec snspokes_nginx nginx -s reload
log "  ✓ Traffic switched to ${NEXT}"

# Stop old slot
sleep 3
log "Stopping old slot: ${CURRENT}..."
docker stop "snspokes_nextjs_${CURRENT}" 2>/dev/null || true
echo "$NEXT" > "${APP_DIR}/.active_slot"

log ""
log "═══════════════════════════════"
log "✅  Deploy complete! Active: ${NEXT}"
log "═══════════════════════════════"
alert "✅ Deploy complete! Active slot: \`${NEXT}\` | Port: ${NEXT_PORT}"
