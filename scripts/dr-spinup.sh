#!/bin/bash
# =============================================================
# snspokes — Disaster Recovery: Spin Up Fresh Server
# Run this on a brand new Hetzner server to restore everything
# from remote backups.
#
# Usage:
#   curl -s https://your-domain.com/dr-spinup.sh | bash
# OR copy this file and run: ./dr-spinup.sh <BACKUP_DATE>
# =============================================================

set -euo pipefail

BACKUP_DATE="${1:-latest}"
APP_DIR="/root/snspokes"
BACKUP_ROOT="/opt/snspokes-backups"

log() { echo "[$(date '+%H:%M:%S')] $1"; }
step() { echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; echo "STEP: $1"; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }

step "1. Install dependencies"
apt-get update -qq
apt-get install -y -qq docker.io docker-compose git awscli openssl curl unzip
systemctl start docker && systemctl enable docker
log "  ✓ Docker + tools installed"

step "2. Fetch backup credentials"
log "You need to provide your .env.backup file."
log "Create it at /root/snspokes/.env.backup with:"
cat << 'ENV'
S3_BUCKET=s3://snspokes-backups
S3_ENDPOINT=https://xxxx.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=your-r2-access-key
AWS_SECRET_ACCESS_KEY=your-r2-secret-key
AWS_DEFAULT_REGION=auto
BACKUP_ENCRYPT_KEY=your-32char-encryption-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
ENV
read -p "Press Enter once .env.backup is ready..."
source /root/snspokes/.env.backup

step "3. List available backups"
aws s3 ls "${S3_BUCKET}/daily/" --endpoint-url="${S3_ENDPOINT}" | tail -5
if [ "$BACKUP_DATE" = "latest" ]; then
  BACKUP_DATE=$(aws s3 ls "${S3_BUCKET}/daily/" --endpoint-url="${S3_ENDPOINT}" | \
    awk '{print $4}' | grep ".enc" | sort | tail -1 | \
    sed 's/snspokes_backup_//' | sed 's/.tar.gz.enc//')
fi
log "Restoring from: ${BACKUP_DATE}"

step "4. Download + decrypt backup"
mkdir -p "$BACKUP_ROOT/daily" "$APP_DIR"
ARCHIVE="${BACKUP_ROOT}/daily/snspokes_backup_${BACKUP_DATE}.tar.gz.enc"
aws s3 cp "${S3_BUCKET}/daily/snspokes_backup_${BACKUP_DATE}.tar.gz.enc" \
  "$ARCHIVE" --endpoint-url="${S3_ENDPOINT}"
WORK_DIR="/tmp/snspokes_restore"
mkdir -p "$WORK_DIR"
openssl enc -d -aes-256-cbc -pbkdf2 -k "${BACKUP_ENCRYPT_KEY}" \
  -in "${ARCHIVE}" | tar -xzf - -C "${WORK_DIR}"
log "  ✓ Backup decrypted"

step "5. Restore app code"
BACKUP_APP=$(find "$WORK_DIR" -name "app_code.tar.gz" | head -1)
tar -xzf "$BACKUP_APP" -C /
cp "${WORK_DIR}"/*/. env.local "${APP_DIR}/app/.env.local" 2>/dev/null || true
log "  ✓ App code restored"

step "6. Start PostgreSQL + restore DB"
cd "$APP_DIR"
docker compose up -d snspokes_db
log "  Waiting for DB to start..."
sleep 10
DUMP=$(find "$WORK_DIR" -name "database.dump" | head -1)
docker cp "$DUMP" snspokes_db:/tmp/restore.dump
docker exec snspokes_db pg_restore \
  -U snspokes_user -d snspokes \
  --no-password --clean --if-exists /tmp/restore.dump || true
log "  ✓ Database restored"

step "7. Restore Docker volumes"
for vol_file in "$WORK_DIR"/*/volumes/*.tar.gz; do
  VOL_NAME=$(basename "$vol_file" .tar.gz)
  docker volume create "$VOL_NAME" 2>/dev/null || true
  docker run --rm \
    -v "${VOL_NAME}:/data" \
    -v "$(dirname $vol_file):/backup:ro" \
    alpine sh -c "rm -rf /data/* && tar -xzf /backup/$(basename $vol_file) -C /data"
  log "  ✓ Volume ${VOL_NAME}"
done

step "8. Start all containers"
cd "$APP_DIR" && docker compose up -d
sleep 15
log "  ✓ All containers up"

step "9. Restore n8n workflows"
N8N_WF=$(find "$WORK_DIR" -name "workflows_backup.json" | head -1)
[ -n "$N8N_WF" ] && docker cp "$N8N_WF" snspokes_n8n:/tmp/ && \
  docker exec snspokes_n8n n8n import:workflow --input=/tmp/workflows_backup.json || true
log "  ✓ n8n workflows restored"

step "10. Setup SSL"
if [ -f "${APP_DIR}/scripts/setup-ssl.sh" ]; then
  read -p "Domain name for SSL (e.g. snspokes.com): " DOMAIN
  bash "${APP_DIR}/scripts/setup-ssl.sh" "$DOMAIN"
fi

step "11. Setup cron for backups"
(crontab -l 2>/dev/null; echo "0 2 * * * /root/snspokes/scripts/backup.sh >> /opt/snspokes-backups/logs/cron.log 2>&1") | crontab -
log "  ✓ Backup cron set for 2:00 AM daily"

step "12. Health check"
sleep 5
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health || echo "000")
if [ "$STATUS" = "200" ]; then
  log "  ✓ App is healthy! HTTP 200"
else
  log "  ⚠️  App returned HTTP ${STATUS} — check docker logs"
fi

rm -rf "$WORK_DIR"
echo ""
echo "══════════════════════════════════════════"
echo "✅  DISASTER RECOVERY COMPLETE!"
echo "   App: http://$(curl -s ifconfig.me 2>/dev/null):3001"
echo "   Admin: http://$(curl -s ifconfig.me 2>/dev/null)/admin"
echo "   Update DNS to point to this server IP"
echo "══════════════════════════════════════════"
