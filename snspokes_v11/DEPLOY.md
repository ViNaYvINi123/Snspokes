# snspokes v9 — Production Deployment Guide

## What's new in v9
- ✅ .do removed from all branding
- ✅ Fuzzy search (pg_trgm)
- ✅ Freemium enforcement (Free/Pro/Team)
- ✅ Login brute force protection
- ✅ Health check endpoint (/api/health)
- ✅ SEO meta tags + sitemap.xml + robots.txt
- ✅ Request ID tracing
- ✅ Spoke versioning (save/restore)
- ✅ Spoke ratings (👍/👎)
- ✅ User API keys
- ✅ Email system (Nodemailer/Gmail)
- ✅ DB auto-backup (daily at 2AM)
- ✅ Cron jobs (cleanup, email queue)
- ✅ Request size limits
- ✅ Cookie consent banner

## Deploy on Hetzner (5 min)

```bash
ssh root@77.42.71.149
cd ~/snspokes/app && git pull

# Run migrations (once)
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_v9.sql

# Update .env.local
nano ~/snspokes/app/.env.local
# Add: EMAIL_USER, EMAIL_PASS, ENCRYPTION_KEY, BACKUP_DIR

# Rebuild
cd ~/snspokes && docker compose up -d --build nextjs
```

## Test health check
```bash
curl http://77.42.71.149/api/health
```

## Uptime monitoring (free)
1. Sign up at https://uptimerobot.com
2. Add monitor: http://77.42.71.149/api/health
3. Get alerts when server goes down

## New .env.local vars needed
```
ENCRYPTION_KEY=snspokes-encryption-key-32chars!
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
BACKUP_DIR=/tmp/snspokes-backups
```

## Migrations order
```
database_setup.sql
database_auth.sql
database_admin.sql
database_v5.sql
database_v6.sql
database_v7.sql
database_v8.sql
database_v9.sql  ← NEW (pg_trgm, ratings, api_keys, versions)
```
