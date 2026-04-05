# snspokes — Complete Fresh Deployment Guide
**Version: 33.4.0 | Updated: 2026-04-05**

This guide deploys snspokes from ZERO on a fresh Hetzner server. Follow every step in order.

---

## Step 1 — Create Hetzner Server

1. Go to **cloud.hetzner.com** → Servers → Add Server
2. Location: **Helsinki** (or nearest to your users)
3. Image: **Ubuntu 24.04**
4. Type: **CX22** (2 vCPU, 4GB RAM, 40GB disk — €4.5/month)
5. Add your SSH key (or set root password)
6. Name: `snspokes`
7. Click **Create & Buy**

Copy your server IP: `YOUR_IP`

---

## Step 2 — SSH Into Server

```bash
ssh root@YOUR_IP
```

---

## Step 3 — Install Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin git -y
docker --version
docker compose version
```

Both should print versions. If not, reboot and retry.

---

## Step 4 — Point Domain to Server

Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these DNS A records:

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_IP |
| A | www | YOUR_IP |
| A | n8n | YOUR_IP |
| A | portainer | YOUR_IP |

Wait 5 minutes, then verify:
```bash
ping snspokes.com
# Should show your server IP
```

---

## Step 5 — Get SSL Certificate

```bash
apt install certbot -y

# Stop anything on port 80 first
docker stop $(docker ps -q) 2>/dev/null

certbot certonly --standalone \
  -d snspokes.com \
  -d www.snspokes.com \
  -d n8n.snspokes.com \
  -d portainer.snspokes.com \
  --agree-tos \
  --email your@email.com
```

Verify:
```bash
ls /etc/letsencrypt/live/snspokes.com/
# Should show: fullchain.pem  privkey.pem
```

---

## Step 6 — Clone Repository

```bash
cd ~
git clone https://github.com/ViNaYvINi123/Snspokes.git snspokes
cd ~/snspokes
```

---

## Step 7 — Create Environment Files

### 7a. Create `.env` (used by docker-compose for DB and n8n)

```bash
cat > ~/snspokes/.env << 'EOF'
DB_PASSWORD=ChangeThis_StrongPassword_123!
OPENROUTER_API_KEY=sk-or-v1-paste-your-key-here
EOF
```

**Get your OpenRouter key:** Go to https://openrouter.ai/keys → Create free account → Create Key → Copy it

### 7b. Create `.env.local` (used by Next.js app)

```bash
cat > ~/snspokes/.env.local << 'EOF'
# ── Database ──
DB_HOST=snspokes_db
DB_PORT=5432
DB_NAME=snspokes
DB_USER=snspokes_user
DB_PASSWORD=ChangeThis_StrongPassword_123!
DB_POOL_MAX=25

# ── Redis ──
REDIS_HOST=snspokes_redis
REDIS_PORT=6379

# ── n8n (AI workflows) ──
N8N_URL=http://snspokes_n8n:5678
N8N_TIMEOUT=90000

# ── Auth ──
NEXTAUTH_URL=https://snspokes.com
NEXTAUTH_SECRET=change-this-to-random-32-chars-abc123xyz

# ── Google OAuth (fill after Step 10) ──
GOOGLE_CLIENT_ID=placeholder
GOOGLE_CLIENT_SECRET=placeholder

# ── OpenRouter ──
OPENROUTER_API_KEY=sk-or-v1-paste-your-key-here

# ── Admin Panel ──
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeThis_AdminPassword_456!
ADMIN_SECRET=change-this-random-admin-jwt-secret
EOF
```

**CRITICAL:** `DB_PASSWORD` must be IDENTICAL in both `.env` and `.env.local`

---

## Step 8 — Build and Start All Containers

```bash
cd ~/snspokes
docker compose up -d --build
```

This takes **3-5 minutes** on first build. Watch progress:
```bash
docker compose logs -f --tail=20
```

Press `Ctrl+C` when you see nextjs printing "Ready".

### Verify all 6 containers are running:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected:
```
NAMES              STATUS
snspokes_nginx     Up
snspokes_nextjs    Up (health: starting)
snspokes_n8n       Up
snspokes_redis     Up (healthy)
snspokes_db        Up (healthy)
portainer          Up
```

Wait 1-2 minutes for nextjs health to become "healthy".

**If any container is not running:**
```bash
docker logs CONTAINER_NAME --tail=30
```

---

## Step 9 — Initialize Database

Run these 3 SQL files in order:

```bash
# 1. Core tables (spokes, users, search)
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_setup.sql

# 2. Admin tables (plans, properties, analytics)
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_admin.sql

# 3. ALL remaining tables (30+ tables including sessions, cache, shared scripts)
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_fix_all.sql

# 4. Seed 15 popular spokes
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_seed_spokes.sql
```

### Verify database:
```bash
# Check tables created
docker exec snspokes_db psql -U snspokes_user -d snspokes -c "\dt sn_*" | head -20

# Check spokes seeded
docker exec snspokes_db psql -U snspokes_user -d snspokes -c "SELECT COUNT(*) FROM sn_spokes;"
# Should show: 15
```

---

## Step 10 — Setup Google OAuth

1. Go to **console.cloud.google.com**
2. Create a new project (or select existing)
3. Go to **APIs & Services → OAuth consent screen**
   - User type: External
   - App name: snspokes
   - Authorized domains: snspokes.com
   - Save
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: snspokes
   - Authorized JavaScript origins: `https://snspokes.com`
   - Authorized redirect URIs: `https://snspokes.com/api/auth/callback/google`
   - Click **Create**
6. Copy **Client ID** and **Client Secret**

### Update `.env.local`:
```bash
nano ~/snspokes/.env.local
```

Replace the placeholder values:
```
GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

### Restart nextjs to pick up new env:
```bash
docker compose restart nextjs
```

---

## Step 11 — Setup n8n Workflows

### 11a. Open n8n:
Go to `https://n8n.snspokes.com` in your browser.

**First time:** Create an n8n admin account (owner email + password). Save these credentials.

### 11b. Delete any old workflows:
If workflows exist, delete them all.

### 11c. Import 7 new workflows:
Go to **Workflows → Import from File** and import each file one by one:

| # | File | What it does |
|---|------|-------------|
| 1 | `n8n_workflow_search.json` | Search spokes in database |
| 2 | `n8n_workflow_chatbot.json` | AI chatbot answers |
| 3 | `n8n_workflow_spoke_enricher.json` | Generate spoke documentation |
| 4 | `n8n_workflow_tools.json` | Code gen + lint + error + query optimizer |
| 5 | `n8n_workflow_ai_debug.json` | Admin AI debugging |
| 6 | `n8n_workflow_list_spokes.json` | List all spokes |
| 7 | `n8n_workflow_property_assist.json` | AI property suggestions |

### 11d. Setup Postgres credentials:
For workflows #1 and #6 (search + list spokes), you need to set database credentials:

1. Open the workflow
2. Click the **Postgres** node
3. Click **Create New Credential**
4. Fill in:
   - Host: `snspokes_db`
   - Database: `snspokes`
   - User: `snspokes_user`
   - Password: (same as DB_PASSWORD in your .env)
   - Port: `5432`
   - SSL: **OFF**
5. Save

### 11e. Activate ALL 7 workflows:
Open each workflow → click the **Active** toggle (top right) → must show ON (green).

### 11f. Test workflows:
```bash
# Test chatbot
curl -s -X POST https://n8n.snspokes.com/webhook/sn-chatbot \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the Slack spoke?"}'

# Test search
curl -s -X POST https://n8n.snspokes.com/webhook/sn-search-spokes \
  -H "Content-Type: application/json" \
  -d '{"query":"slack"}'

# Test spoke enricher
curl -s -X POST https://n8n.snspokes.com/webhook/sn-enrich-spoke \
  -H "Content-Type: application/json" \
  -d '{"slug":"slack","name":"Slack","category":"Communication"}'
```

Each should return JSON with content. If chatbot returns an answer, AI is working.

---

## Step 12 — Verify Everything Works

```bash
# Health check
curl -s https://snspokes.com/api/health | python3 -m json.tool

# Check site loads
curl -s -o /dev/null -w "%{http_code}" https://snspokes.com
# Should print: 200

# Test admin login
curl -s -X POST https://snspokes.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}'
# Should return: {"success":true,"token":"..."}
```

### Open in browser and test:
- **Homepage:** https://snspokes.com — search bar, spoke cards, tools grid
- **Search:** https://snspokes.com/search — type anything, get AI answer
- **Spokes:** https://snspokes.com/spokes — browse all spokes
- **Tools:** each tool page:
  - https://snspokes.com/tools/code-generator
  - https://snspokes.com/tools/query-builder
  - https://snspokes.com/tools/script-linter
  - https://snspokes.com/tools/error-finder
  - https://snspokes.com/tools/version-matrix
  - https://snspokes.com/tools/snippets
  - https://snspokes.com/tools/cheatsheet
  - https://snspokes.com/tools/formatter
- **Login:** https://snspokes.com/login — Google button + email/password
- **Admin:** https://snspokes.com/admin — login with admin credentials
- **n8n:** https://n8n.snspokes.com
- **Portainer:** https://portainer.snspokes.com

### Test keyboard shortcuts:
- Press **Ctrl+K** (or Cmd+K on Mac) → Command Palette opens
- Press **/** on search page → search input focuses
- Press **Escape** → closes palette/modals

---

## Step 13 — Setup Automated Backups & SSL Renewal

### 13a. Daily database backup:
```bash
cat > ~/backup.sh << 'BKEOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p ~/backups
docker exec snspokes_db pg_dump -U snspokes_user snspokes > ~/backups/db_$DATE.sql
# Keep only last 7 days
find ~/backups -name "db_*.sql" -mtime +7 -delete
echo "$(date) Backup: db_$DATE.sql ($(du -h ~/backups/db_$DATE.sql | cut -f1))" >> /var/log/snspokes-backup.log
BKEOF
chmod +x ~/backup.sh

# Test backup
~/backup.sh
ls -la ~/backups/
```

### 13b. Auto SSL renewal:
```bash
crontab -e
```
Add these 2 lines at the bottom:
```
0 2 * * * /root/backup.sh
0 3 1 * * certbot renew --pre-hook "cd /root/snspokes && docker compose stop nginx" --post-hook "cd /root/snspokes && docker compose start nginx" >> /var/log/certbot.log 2>&1
```

### 13c. Create deploy script (for future updates):
```bash
cat > ~/deploy.sh << 'DPEOF'
#!/bin/bash
echo "🚀 Deploying snspokes..."
cd ~/snspokes
git pull
docker compose up -d --build nextjs
echo "⏳ Waiting for health..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Deployed successfully!"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep snspokes
    exit 0
  fi
  sleep 3
done
echo "⚠️ Health check failed. Run: docker logs snspokes_nextjs --tail=30"
DPEOF
chmod +x ~/deploy.sh
```

---

## Done! 🎉

Your app is live at **https://snspokes.com**

### What's running:

| Service | URL | Purpose |
|---------|-----|---------|
| Website | https://snspokes.com | Main app |
| Admin | https://snspokes.com/admin | Admin panel |
| n8n | https://n8n.snspokes.com | AI workflows |
| Portainer | https://portainer.snspokes.com | Container management |

### What users can do:
- Search 200+ spokes with AI answers
- Use 8 developer tools (code gen, query builder, linter, error finder, version matrix, snippets, cheatsheet, formatter)
- Chat with AI assistant (appears on every page)
- Share scripts via /share/[id] links
- Press ⌘K to search from anywhere

---

## Day-to-Day Commands

```bash
# Deploy new code
~/deploy.sh

# Restart single service
docker compose restart nextjs

# View logs
docker logs snspokes_nextjs --tail=50
docker logs snspokes_n8n --tail=50

# Enter database
docker exec -it snspokes_db psql -U snspokes_user -d snspokes

# Manual backup
~/backup.sh

# Check disk
df -h && docker system df

# Clean unused images
docker system prune -f

# Run new migrations
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_fix_all.sql
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Site blank / 502 | `docker logs snspokes_nextjs --tail=30` — check error |
| "relation does not exist" | Run `database_fix_all.sql` again |
| Search returns nothing | Check n8n workflows are activated |
| Google login "Access Denied" | Check redirect URI in Google Console: `https://snspokes.com/api/auth/callback/google` |
| Admin login loop | Check `ADMIN_SECRET` is set in `.env.local` then `docker compose restart nextjs` |
| Redis disconnected | Verify `REDIS_HOST=snspokes_redis` in `.env.local` |
| n8n webhooks empty | Check OPENROUTER_API_KEY in `.env`, then `docker compose restart n8n` |
| Container restarting | `docker logs CONTAINER --tail=30` to see error |
| Disk full | `docker system prune -af` (removes unused images) |
| SSL expired | `certbot renew && docker compose restart nginx` |
| Build fails | `docker compose logs nextjs --tail=50` |
| Slow performance | Check `docker stats` for memory/CPU usage |

---

## Architecture

```
Internet → Nginx (:443 SSL)
              ├── snspokes.com → Next.js (:3001)
              │                    ├── PostgreSQL (DB)
              │                    ├── Redis (Cache)
              │                    └── n8n → OpenRouter AI (free)
              ├── n8n.snspokes.com → n8n (:5678)
              └── portainer.snspokes.com → Portainer (:9443)
```

All internal ports (DB 5432, Redis 6379, n8n 5678) are NOT exposed to the internet.
Only Nginx (80/443) and Portainer (9443) are publicly accessible.
