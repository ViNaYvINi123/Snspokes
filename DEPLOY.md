# snspokes — Production Deployment Guide
# =======================================
# Follow this top to bottom. Server will be live at end.

## Prerequisites
- Hetzner CX21 server (Ubuntu 22.04)
- Domain name pointed at server IP
- GitHub repo cloned on server

## Step 1 — SSH & Clone
```bash
ssh root@77.42.71.149
git clone https://github.com/ViNaYvINi123/Snspokes ~/snspokes
cd ~/snspokes
```

## Step 2 — Set environment variables
```bash
cp .env.example app/.env.local
nano app/.env.local
# Fill in: NEXTAUTH_SECRET, OPENROUTER_API_KEY, RAZORPAY_*, SMTP_*, GITHUB_*, GOOGLE_*
```

## Step 3 — Start Docker containers
```bash
docker compose up -d
# Wait 30 seconds for DB to initialize
sleep 30
docker ps  # all 5 containers should be Up
```

## Step 4 — Run all SQL migrations (in order)
```bash
for f in database_setup.sql database_auth.sql database_admin.sql \
          database_v5.sql database_v6.sql database_v7.sql database_v8.sql \
          database_v9.sql database_v10.sql database_v11.sql database_v12.sql \
          database_v13.sql database_v14.sql database_v17.sql
  database_v18.sql database_v19.sql
  database_seed_spokes.sql; do
  echo "Running $f..."
  docker exec -i snspokes_db psql -U snspokes_user -d snspokes < $f
done
```

## Step 5 — Import n8n workflows
```bash
# Open n8n: http://YOUR_IP:5678
# Go to: Workflows → Import from file
# Import in order: workflow1 through workflow15
# Add Postgres credential: host=snspokes_db, db=snspokes, user=snspokes_user, pass=Vinay@123
# Add env var: OPENROUTER_API_KEY=sk-or-v1-xxx
# Activate ALL workflows
```

## Step 6 — Setup SSL
```bash
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh snspokes.com admin@snspokes.com
```

## Step 7 — Setup backups
```bash
cp .env.backup.example .env.backup
nano .env.backup  # fill in R2 keys + BACKUP_ENCRYPT_KEY
chmod +x scripts/backup.sh
./scripts/backup.sh  # test run
# Add to crontab:
crontab -e
# 0 2 * * * /root/snspokes/scripts/backup.sh >> /opt/snspokes-backups/logs/cron.log 2>&1
# */5 * * * * /root/snspokes/scripts/health-check.sh >> /var/log/snspokes-health.log 2>&1
```

## Step 8 — Health check
```bash
curl https://snspokes.com/api/health
# Should return: {"status":"ok","db":true,"redis":true}
```

## Done! 🚀
- App:    https://snspokes.com
- Admin:  https://snspokes.com/admin  (admin / snspokes@admin2025)
- n8n:    http://YOUR_IP:5678

## Quick commands
```bash
# View logs
docker logs snspokes_nextjs -f

# Restart app
docker compose restart nextjs

# Deploy new version (zero downtime)
./scripts/deploy.sh

# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh list
./scripts/restore.sh db 2025-01-15_02-00-00
```
