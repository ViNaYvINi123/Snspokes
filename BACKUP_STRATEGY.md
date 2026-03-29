# snspokes — Backup & Disaster Recovery Strategy

## Architecture Overview

```
Hetzner Server (Primary)
    │
    ├── /root/snspokes/scripts/backup.sh  ← runs daily at 2 AM
    │       │
    │       ├── 1. pg_dump (PostgreSQL)
    │       ├── 2. n8n export:workflow
    │       ├── 3. Docker volumes (tar)
    │       ├── 4. App code + .env
    │       ├── 5. Encrypt (AES-256)
    │       └── 6. Upload to R2 + keep 7 days local
    │
    └── /opt/snspokes-backups/
            ├── daily/   ← 7 days
            └── weekly/  ← 4 weeks (Sunday snapshots)

Cloudflare R2 (Remote, Free 10GB)
    ├── daily/   ← last 7 days
    └── weekly/  ← last 4 weeks
```

## Quick Start

### Step 1 — Install AWS CLI (for R2 access)
```bash
apt install awscli -y
aws configure  # enter R2 access/secret keys
```

### Step 2 — Create .env.backup
```bash
cp /root/snspokes/.env.backup.example /root/snspokes/.env.backup
nano /root/snspokes/.env.backup  # fill in all values
```

### Step 3 — Test backup manually
```bash
chmod +x /root/snspokes/scripts/backup.sh
/root/snspokes/scripts/backup.sh
# Check: ls /opt/snspokes-backups/daily/
```

### Step 4 — Schedule daily backups (2 AM)
```bash
crontab -e
# Add this line:
0 2 * * * /root/snspokes/scripts/backup.sh >> /opt/snspokes-backups/logs/cron.log 2>&1
```

### Step 5 — Schedule health checks (every 5 min)
```bash
# Add to crontab:
*/5 * * * * /root/snspokes/scripts/health-check.sh >> /var/log/snspokes-health.log 2>&1
```

---

## Backup Contents (per run)

| File | Contents | Encrypted |
|------|----------|-----------|
| database.dump | Full PostgreSQL dump (custom format) | ✅ |
| n8n/workflows_backup.json | All n8n workflows | ✅ |
| n8n/credentials_backup.json | n8n credentials | ✅ |
| volumes/*.tar.gz | Docker volumes (postgres, redis, n8n) | ✅ |
| app_code.tar.gz | Next.js app code | ✅ |
| .env.local | App environment variables | ✅ |
| docker-compose.yml | Container definitions | ✅ |
| MANIFEST.txt | What's in this backup | ✅ |

---

## Restore Commands

### List available backups
```bash
/root/snspokes/scripts/restore.sh list
```

### Restore database only (safest, fastest)
```bash
/root/snspokes/scripts/restore.sh db 2025-01-15_02-00-00
# Restores to snspokes_restore DB first (test it!)
# Then rename: docker exec snspokes_db psql -U snspokes_user -c \
#   "ALTER DATABASE snspokes RENAME TO snspokes_old; \
#    ALTER DATABASE snspokes_restore RENAME TO snspokes;"
```

### Full restore
```bash
/root/snspokes/scripts/restore.sh full 2025-01-15_02-00-00
```

### Rollback single container
```bash
# Roll back just Next.js
/root/snspokes/scripts/restore.sh container nextjs
# Roll back n8n
/root/snspokes/scripts/restore.sh container n8n
```

---

## Zero-Downtime Blue/Green Deploy

```
         NGINX
           │
    ┌──────┴──────┐
    │             │
  BLUE          GREEN
 (current)    (new build)
  port 3001    port 3002
```

### How it works:
1. Build new image in background (green slot)
2. Start green on port 3002
3. Health check green container
4. Switch nginx to green (< 1 second downtime)
5. Stop blue

### Usage:
```bash
chmod +x /root/snspokes/scripts/deploy.sh
/root/snspokes/scripts/deploy.sh
# That's it! Automatic blue/green switching
```

---

## Disaster Recovery (Server Dies Completely)

### Time to recovery: ~20-30 minutes

```bash
# 1. Spin up new Hetzner server (CX21, Ubuntu 22.04)
#    Go to: https://console.hetzner.cloud

# 2. SSH in and run DR script
ssh root@NEW_SERVER_IP
wget https://raw.githubusercontent.com/you/snspokes/main/scripts/dr-spinup.sh
chmod +x dr-spinup.sh
./dr-spinup.sh  # follows interactive prompts

# 3. Update DNS
#    Go to Cloudflare (or wherever your DNS is)
#    Change A record for snspokes.com → NEW_SERVER_IP
#    TTL: already set low? Changes in 5 min. Otherwise ~5 hours.
```

### DNS Strategy (set this up BEFORE disaster):
```
A     snspokes.com      → 77.42.71.149 (current)  TTL: 300 (5 min!)
A     www.snspokes.com  → 77.42.71.149             TTL: 300
```
Keep TTL at 300 (5 minutes) in normal operation. This way DNS failover is fast.

---

## Backup Retention Policy

| Type | Keep for | Location |
|------|----------|---------|
| Daily backups | 7 days | Local + R2 |
| Weekly snapshots (Sunday) | 4 weeks | Local + R2 |
| Old backups | Auto-deleted | — |

---

## Security

- All backups encrypted with AES-256-CBC + PBKDF2 before upload
- Encryption key stored only in `.env.backup` (never in code or git)
- R2 bucket set to private (no public access)
- Backup credentials separate from app credentials

---

## Monitoring & Alerts

| Event | Alert channel |
|-------|--------------|
| Backup complete | Slack ✅ |
| Backup failed | Slack 🔴 |
| App down | Slack 🔴 (health-check.sh) |
| Disk > 85% | Slack ⚠️ |
| DB unresponsive | Slack 🔴 |
| Daily digest | Slack 📊 (8 AM) |

---

## Checklist

- [ ] R2 bucket created and credentials in `.env.backup`
- [ ] `BACKUP_ENCRYPT_KEY` set and stored safely (password manager!)
- [ ] `backup.sh` runs clean manually before enabling cron
- [ ] Daily cron added at 2 AM
- [ ] Health check cron added every 5 min
- [ ] Slack webhook configured for alerts
- [ ] DNS TTL set to 300 (5 min)
- [ ] DR script tested on a test server
- [ ] Team knows where `.env.backup` is stored
