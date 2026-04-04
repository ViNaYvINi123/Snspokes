# snspokes — Complete Deployment Guide
**Version: 32.11.0 | Last Updated: 2026-04-04**

---

## Prerequisites

- Hetzner Cloud account (cloud.hetzner.com)
- Domain: snspokes.com (with DNS access)
- GitHub repo: github.com/ViNaYvINi123/Snspokes
- Google Cloud Console account (for OAuth)
- OpenRouter account (openrouter.ai — free)

---

## Step 1 — Create Hetzner Server

1. Go to cloud.hetzner.com → Servers → Add Server
2. Location: Helsinki (or closest to users)
3. Image: **Ubuntu 24.04**
4. Type: **CX22** (2 vCPU, 4GB RAM, 40GB disk)
5. Add your SSH key
6. Name: `snspokes-docker`
7. Click Create

Note your server IP: `YOUR_SERVER_IP`

---

## Step 2 — SSH In & Install Docker

```bash
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose v2
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

---

## Step 3 — Point Domain to Server

Go to your domain registrar and add DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 300 |
| A | www | YOUR_SERVER_IP | 300 |
| A | n8n | YOUR_SERVER_IP | 300 |
| A | portainer | YOUR_SERVER_IP | 300 |

Wait 5-10 minutes for DNS propagation. Test:
```bash
ping snspokes.com
```

---

## Step 4 — Get SSL Certificate

```bash
# Install certbot
apt install certbot -y

# Get certificate for all subdomains
certbot certonly --standalone \
  -d snspokes.com \
  -d www.snspokes.com \
  -d n8n.snspokes.com \
  -d portainer.snspokes.com
```

Certificates saved at:
- `/etc/letsencrypt/live/snspokes.com/fullchain.pem`
- `/etc/letsencrypt/live/snspokes.com/privkey.pem`

---

## Step 5 — Clone Repository

```bash
cd ~
git clone https://github.com/ViNaYvINi123/Snspokes.git snspokes
cd ~/snspokes
```

---

## Step 6 — Create Environment Files

### 6a. Create `.env` (for docker-compose — DB + n8n passwords)

```bash
nano ~/snspokes/.env
```

Paste:
```
DB_PASSWORD=YourStrongDBPassword123!
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
```

### 6b. Create `.env.local` (for Next.js app)

```bash
nano ~/snspokes/.env.local
```

Paste (change all values marked CHANGE):
```
# Database
DB_HOST=snspokes_db
DB_PORT=5432
DB_NAME=snspokes
DB_USER=snspokes_user
DB_PASSWORD=YourStrongDBPassword123!

# Redis
REDIS_HOST=snspokes_redis
REDIS_PORT=6379

# n8n
N8N_URL=http://snspokes_n8n:5678
N8N_TIMEOUT=90000

# Auth
NEXTAUTH_URL=https://snspokes.com
NEXTAUTH_SECRET=CHANGE_random_string_32_chars_minimum

# Google OAuth (Step 8)
GOOGLE_CLIENT_ID=CHANGE_after_step_8
GOOGLE_CLIENT_SECRET=CHANGE_after_step_8

# OpenRouter (same key as .env)
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_your_admin_password
ADMIN_SECRET=CHANGE_random_string_for_admin_jwt

# Email (optional — skip for now)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM_EMAIL=noreply@snspokes.com
# SMTP_FROM_NAME=snspokes

# Payment (optional — skip for now)
# RAZORPAY_KEY_ID=rzp_test_xxx
# RAZORPAY_KEY_SECRET=xxx
```

**IMPORTANT:** The `DB_PASSWORD` must be identical in both `.env` and `.env.local`

---

## Step 7 — Start Everything

```bash
cd ~/snspokes

# Build and start all 6 containers
docker compose up -d --build

# This takes 2-3 minutes on first run
# Watch progress:
docker compose logs -f --tail=20
# Press Ctrl+C when you see "Ready" from nextjs
```

### Verify all containers are running:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected output:
```
NAMES              STATUS
snspokes_nginx     Up (healthy)
snspokes_nextjs    Up (health: starting)
snspokes_n8n       Up
snspokes_redis     Up (healthy)
snspokes_db        Up (healthy)
portainer          Up
```

Wait 1 minute for nextjs health to change from "starting" to "healthy".

---

## Step 8 — Initialize Database

Run ALL migration files:
```bash
# Core tables (users, spokes)
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_setup.sql

# Admin tables (plans, properties, analytics)
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_admin.sql

# ALL remaining tables (announcements, flags, bookmarks, ratings, etc.)
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_fix_all.sql

# Seed initial spoke data (15 popular spokes)
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_seed_spokes.sql
```

### Verify database:
```bash
docker exec snspokes_db psql -U snspokes_user -d snspokes -c "SELECT COUNT(*) FROM sn_spokes;"
# Should show: 15

docker exec snspokes_db psql -U snspokes_user -d snspokes -c "SELECT COUNT(*) FROM sn_users;"
# Should show: 0 (no users yet)
```

---

## Step 9 — Setup Google OAuth

1. Go to **console.cloud.google.com**
2. Create a project (or select existing)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Name: `snspokes`
7. Authorized JavaScript origins:
   ```
   https://snspokes.com
   ```
8. Authorized redirect URIs:
   ```
   https://snspokes.com/api/auth/callback/google
   ```
9. Click Create
10. Copy the **Client ID** and **Client Secret**

### Update `.env.local` with Google credentials:
```bash
nano ~/snspokes/.env.local
```
Replace:
```
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

### Restart nextjs to load new env:
```bash
docker compose restart nextjs
```

---

## Step 10 — Setup n8n Workflows

### 10a. Open n8n:
Go to `https://n8n.snspokes.com` in your browser.

First time: Create an n8n admin account (email + password).

### 10b. Delete old workflows:
If any old workflows exist, delete them all.

### 10c. Import new workflows:
Go to **Workflows → Import from File** and import these 7 files one by one:

| File | Purpose |
|------|---------|
| `n8n_workflow_search.json` | Search spokes (DB query) |
| `n8n_workflow_chatbot.json` | AI chatbot (OpenRouter) |
| `n8n_workflow_spoke_enricher.json` | Generate spoke content (OpenRouter) |
| `n8n_workflow_tools.json` | Code gen + lint + error + query (OpenRouter) |
| `n8n_workflow_ai_debug.json` | Admin AI debug (OpenRouter) |
| `n8n_workflow_list_spokes.json` | List all spokes (DB query) |
| `n8n_workflow_property_assist.json` | AI property suggestions (OpenRouter) |

### 10d. Setup Postgres credentials:
For the 2 DB workflows (search + list spokes):
1. Click the Postgres node
2. Create new credential:
   - Host: `snspokes_db`
   - Database: `snspokes`
   - User: `snspokes_user`
   - Password: (same password from `.env`)
   - Port: `5432`
   - SSL: off
3. Save

### 10e. Activate ALL 7 workflows:
Open each workflow → toggle the **Active** switch (top right) to ON.

### 10f. Test:
```bash
# Test chatbot
curl -s -X POST https://n8n.snspokes.com/webhook/sn-chatbot \
  -H "Content-Type: application/json" \
  -d '{"question":"What is Slack spoke?"}'

# Test search
curl -s -X POST https://n8n.snspokes.com/webhook/sn-search-spokes \
  -H "Content-Type: application/json" \
  -d '{"query":"slack"}'

# Test spoke enricher
curl -s -X POST https://n8n.snspokes.com/webhook/sn-enrich-spoke \
  -H "Content-Type: application/json" \
  -d '{"slug":"slack","name":"Slack","category":"Communication"}'
```

Each should return JSON with `success: true`.

---

## Step 11 — Get OpenRouter API Key

1. Go to **openrouter.ai/keys**
2. Create account (free)
3. Click **Create Key**
4. Copy the key (starts with `sk-or-v1-`)

This key is already in your `.env` and `.env.local` from Step 6.
If you skipped it, add it now:
```bash
# Add to .env (for n8n)
echo "OPENROUTER_API_KEY=sk-or-v1-your-key" >> ~/snspokes/.env

# Add to .env.local (for Next.js)
echo "OPENROUTER_API_KEY=sk-or-v1-your-key" >> ~/snspokes/.env.local

# Restart n8n to pick up the key
docker compose restart n8n
```

---

## Step 12 — Final Verification

```bash
# 1. Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# 2. Health check
curl -s https://snspokes.com/api/health | python3 -m json.tool

# 3. Check site loads
curl -s https://snspokes.com | head -5

# 4. Check admin login
curl -s -X POST https://snspokes.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}'
```

### Visit in browser:
- **Site:** https://snspokes.com
- **Admin:** https://snspokes.com/admin
- **n8n:** https://n8n.snspokes.com
- **Portainer:** https://portainer.snspokes.com

---

## Step 13 — Setup Automated Backups & Monitoring

### 13a. Auto SSL renewal:
```bash
crontab -e
```
Add:
```
0 3 * * * certbot renew --pre-hook "cd /root/snspokes && docker compose stop nginx" --post-hook "cd /root/snspokes && docker compose start nginx" >> /var/log/certbot-renew.log 2>&1
```

### 13b. Daily database backup:
```bash
cat > ~/backup.sh << 'BKEOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p ~/backups
docker exec snspokes_db pg_dump -U snspokes_user snspokes > ~/backups/db_$DATE.sql
find ~/backups -name "db_*.sql" -mtime +7 -delete
echo "$(date) Backup done: db_$DATE.sql ($(stat -c%s ~/backups/db_$DATE.sql) bytes)" >> /var/log/snspokes-backup.log
BKEOF
chmod +x ~/backup.sh

# Add to cron (runs daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup.sh
```

### 13c. Create deploy script:
```bash
cat > ~/deploy.sh << 'DPEOF'
#!/bin/bash
echo "🚀 Deploying snspokes..."
cd ~/snspokes
git pull
docker compose up -d --build nextjs
echo "⏳ Waiting for health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ App is healthy!"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep snspokes
    exit 0
  fi
  sleep 3
done
echo "⚠️ App did not become healthy in 90s. Check logs:"
echo "docker logs snspokes_nextjs --tail=20"
DPEOF
chmod +x ~/deploy.sh
```

---

## Day-to-Day Operations

### Deploy new code:
```bash
# On your Windows machine (Git Bash):
cd /d/snspokes/Snspokes
# make changes...
git add . && git commit -m "description" && git push

# On Hetzner:
~/deploy.sh
```

### Restart a single service:
```bash
docker compose restart nextjs   # app
docker compose restart n8n      # workflows
docker compose restart nginx    # proxy
docker compose restart redis    # cache
docker compose restart db       # database (careful!)
```

### View logs:
```bash
docker logs snspokes_nextjs --tail=50      # app logs
docker logs snspokes_n8n --tail=50         # n8n logs
docker logs snspokes_nginx --tail=50       # nginx logs
docker compose logs -f --tail=20           # all logs live
```

### Manual backup:
```bash
~/backup.sh
```

### Check disk space:
```bash
df -h
docker system df
docker system prune -f  # clean unused images (safe)
```

### Enter database console:
```bash
docker exec -it snspokes_db psql -U snspokes_user -d snspokes
```

### Full rebuild (nuclear option):
```bash
cd ~/snspokes
docker compose down
docker compose up -d --build
# Wait 3 minutes
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_fix_all.sql
```

---

## Architecture

```
Internet
   │
   ▼
Nginx (:80/:443) ──── SSL termination
   │
   ├── snspokes.com ──────→ Next.js (:3001)
   │                            │
   │                            ├── PostgreSQL (DB)
   │                            ├── Redis (Cache)
   │                            └── n8n (AI workflows)
   │                                   │
   │                                   └── OpenRouter API (free AI)
   │
   ├── n8n.snspokes.com ─────→ n8n (:5678)
   │
   └── portainer.snspokes.com → Portainer (:9443)
```

## Containers

| Container | Port | Network | Purpose |
|-----------|------|---------|---------|
| snspokes_nginx | 80, 443 | external | SSL + reverse proxy |
| snspokes_nextjs | 3001 | internal, external | Next.js app |
| snspokes_n8n | 5678 (internal) | internal, external | AI workflows |
| snspokes_db | 5432 (internal) | internal | PostgreSQL |
| snspokes_redis | 6379 (internal) | internal | Cache + rate limit |
| portainer | 9443 | external | Container management |

**Note:** Only nginx ports (80/443) and Portainer (9443) are exposed to the internet. All other services communicate internally via Docker network.

---

## Environment Files

| File | Used By | Contains |
|------|---------|----------|
| `.env` | docker-compose | `DB_PASSWORD`, `OPENROUTER_API_KEY` |
| `.env.local` | Next.js app | All app config (DB, Redis, Auth, Admin) |
| `.env.example` | Reference only | Template with all variable names |

**CRITICAL:** `.env` and `.env.local` are NOT in the git repo (`.gitignore`). You must create them manually on the server.

---

## Troubleshooting

| Problem | Command |
|---------|---------|
| Site not loading | `docker ps` — check all containers UP |
| API returns empty | `docker logs snspokes_nextjs --tail=20` |
| n8n webhooks fail | `docker logs snspokes_n8n --tail=20` |
| DB connection error | Check `DB_HOST=snspokes_db` in `.env.local` |
| Redis disconnected | Check `REDIS_HOST=snspokes_redis` in `.env.local` |
| Google login fails | Check redirect URI in Google Console |
| Admin login loop | Check `ADMIN_SECRET` is set in `.env.local` |
| Build fails | `docker compose logs nextjs --tail=50` |
| Disk full | `docker system prune -f` |
| SSL expired | `certbot renew && docker compose restart nginx` |
