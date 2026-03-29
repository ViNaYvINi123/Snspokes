#!/bin/bash
# =============================================================
# snspokes — Automated Backup Script
# Runs daily via cron. Backs up DB, volumes, code, n8n.
# Uploads to Cloudflare R2 (or AWS S3).
# =============================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────
BACKUP_ROOT="/opt/snspokes-backups"
APP_DIR="/root/snspokes"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DAY=$(date +%A | tr '[:upper:]' '[:lower:]')     # monday, tuesday...
WEEK=$(date +%U)                                  # week number
BACKUP_DIR="${BACKUP_ROOT}/daily/${DATE}"
LOG_FILE="${BACKUP_ROOT}/logs/backup-${DATE}.log"
RETENTION_DAYS=7
RETENTION_WEEKS=4

# Load env
[ -f /root/snspokes/.env.backup ] && source /root/snspokes/.env.backup

# R2 / S3 config (set in .env.backup)
S3_BUCKET="${S3_BUCKET:-s3://snspokes-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-}"   # for R2: https://xxxx.r2.cloudflarestorage.com
ENCRYPT_KEY="${BACKUP_ENCRYPT_KEY:-changeme-32chars-key-here}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# ── Helpers ───────────────────────────────────────────────────
log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
alert_slack() {
  local msg="$1"
  local emoji="${2:-⚠️}"
  [ -z "$SLACK_WEBHOOK" ] && return 0
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"${emoji} *snspokes backup* — ${msg}\"}" || true
}
alert_fail() {
  log "ERROR: $1"
  alert_slack "FAILED on ${DATE}: $1" "🔴"
  exit 1
}

# ── Start ─────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR" "${BACKUP_ROOT}/logs" "${BACKUP_ROOT}/weekly"
log "=== snspokes backup started: $DATE ==="
alert_slack "Backup started: $DATE" "🟡"

# ── 1. PostgreSQL dump ────────────────────────────────────────
log "Backing up PostgreSQL..."
docker exec snspokes_db pg_dump \
  -U snspokes_user \
  -d snspokes \
  --no-password \
  --verbose \
  --format=custom \
  --compress=9 \
  -f /tmp/snspokes_db_${DATE}.dump || alert_fail "PostgreSQL dump failed"

docker cp snspokes_db:/tmp/snspokes_db_${DATE}.dump "${BACKUP_DIR}/database.dump"
docker exec snspokes_db rm -f /tmp/snspokes_db_${DATE}.dump
log "  ✓ Database: $(du -sh ${BACKUP_DIR}/database.dump | cut -f1)"

# ── 2. n8n export (workflows + credentials) ───────────────────
log "Backing up n8n workflows..."
docker exec snspokes_n8n n8n export:workflow --all \
  --output=/home/node/.n8n/workflows_backup.json 2>/dev/null || true
docker exec snspokes_n8n n8n export:credentials --all \
  --output=/home/node/.n8n/credentials_backup.json 2>/dev/null || true

mkdir -p "${BACKUP_DIR}/n8n"
docker cp snspokes_n8n:/home/node/.n8n/workflows_backup.json "${BACKUP_DIR}/n8n/" 2>/dev/null || true
docker cp snspokes_n8n:/home/node/.n8n/credentials_backup.json "${BACKUP_DIR}/n8n/" 2>/dev/null || true
log "  ✓ n8n workflows + credentials exported"

# ── 3. Docker volumes ─────────────────────────────────────────
log "Backing up Docker volumes..."
mkdir -p "${BACKUP_DIR}/volumes"
for vol in snspokes_postgres_data snspokes_redis_data snspokes_n8n_data; do
  if docker volume inspect "$vol" &>/dev/null; then
    docker run --rm \
      -v ${vol}:/data:ro \
      -v "${BACKUP_DIR}/volumes":/backup \
      alpine tar -czf "/backup/${vol}.tar.gz" -C /data . 2>/dev/null
    log "  ✓ Volume ${vol}: $(du -sh ${BACKUP_DIR}/volumes/${vol}.tar.gz | cut -f1)"
  fi
done

# ── 4. Application code + env ─────────────────────────────────
log "Backing up application code..."
tar -czf "${BACKUP_DIR}/app_code.tar.gz" \
  --exclude="${APP_DIR}/node_modules" \
  --exclude="${APP_DIR}/.next" \
  --exclude="${APP_DIR}/app/node_modules" \
  --exclude="${APP_DIR}/app/.next" \
  "${APP_DIR}" 2>/dev/null || alert_fail "App code backup failed"
log "  ✓ App code: $(du -sh ${BACKUP_DIR}/app_code.tar.gz | cut -f1)"

# ── 5. Env files (critical!) ──────────────────────────────────
cp "${APP_DIR}/app/.env.local" "${BACKUP_DIR}/.env.local" 2>/dev/null || true
cp "${APP_DIR}/.env.backup" "${BACKUP_DIR}/.env.backup" 2>/dev/null || true
cp "${APP_DIR}/docker-compose.yml" "${BACKUP_DIR}/docker-compose.yml" 2>/dev/null || true
cp "${APP_DIR}/nginx.conf" "${BACKUP_DIR}/nginx.conf" 2>/dev/null || true
log "  ✓ Config files copied"

# ── 6. Create manifest ────────────────────────────────────────
cat > "${BACKUP_DIR}/MANIFEST.txt" << EOF
snspokes Backup Manifest
========================
Date: ${DATE}
Server: $(hostname)
IP: $(curl -s ifconfig.me 2>/dev/null || echo "unknown")
Docker containers:
$(docker ps --format "  {{.Names}}: {{.Image}}" 2>/dev/null)
Disk usage:
$(du -sh ${BACKUP_DIR}/* 2>/dev/null)
EOF
log "  ✓ Manifest created"

# ── 7. Encrypt the entire backup ─────────────────────────────
log "Encrypting backup..."
ARCHIVE="${BACKUP_ROOT}/daily/snspokes_backup_${DATE}.tar.gz.enc"
tar -czf - -C "${BACKUP_ROOT}/daily" "${DATE}" | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -k "${ENCRYPT_KEY}" \
  -out "${ARCHIVE}" || alert_fail "Encryption failed"
rm -rf "${BACKUP_DIR}"  # remove unencrypted after encryption
log "  ✓ Encrypted: $(du -sh ${ARCHIVE} | cut -f1)"

# ── 8. Upload to R2 / S3 ─────────────────────────────────────
log "Uploading to remote storage..."
if [ -n "$S3_ENDPOINT" ]; then
  # Cloudflare R2
  aws s3 cp "${ARCHIVE}" "${S3_BUCKET}/daily/snspokes_backup_${DATE}.tar.gz.enc" \
    --endpoint-url="${S3_ENDPOINT}" \
    --no-progress 2>>"$LOG_FILE" || alert_fail "Upload to R2 failed"
else
  # AWS S3
  aws s3 cp "${ARCHIVE}" "${S3_BUCKET}/daily/snspokes_backup_${DATE}.tar.gz.enc" \
    --no-progress 2>>"$LOG_FILE" || alert_fail "Upload to S3 failed"
fi
log "  ✓ Uploaded to remote storage"

# ── 9. Weekly snapshot (every Sunday) ────────────────────────
if [ "$DAY" = "sunday" ]; then
  log "Creating weekly snapshot (week ${WEEK})..."
  cp "${ARCHIVE}" "${BACKUP_ROOT}/weekly/snspokes_week_${WEEK}_${DATE}.tar.gz.enc"
  if [ -n "$S3_ENDPOINT" ]; then
    aws s3 cp "${BACKUP_ROOT}/weekly/snspokes_week_${WEEK}_${DATE}.tar.gz.enc" \
      "${S3_BUCKET}/weekly/" --endpoint-url="${S3_ENDPOINT}" --no-progress || true
  else
    aws s3 cp "${BACKUP_ROOT}/weekly/snspokes_week_${WEEK}_${DATE}.tar.gz.enc" \
      "${S3_BUCKET}/weekly/" --no-progress || true
  fi
  log "  ✓ Weekly snapshot saved"
fi

# ── 10. Cleanup old backups ───────────────────────────────────
log "Cleaning up old backups (keep ${RETENTION_DAYS} days)..."
find "${BACKUP_ROOT}/daily" -name "*.enc" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_ROOT}/weekly" -name "*.enc" -mtime +$((RETENTION_WEEKS * 7)) -delete 2>/dev/null || true
find "${BACKUP_ROOT}/logs" -name "*.log" -mtime +30 -delete 2>/dev/null || true
log "  ✓ Cleanup done"

# ── Done ─────────────────────────────────────────────────────
TOTAL_SIZE=$(du -sh "${BACKUP_ROOT}" 2>/dev/null | cut -f1)
log "=== Backup complete! Total storage: ${TOTAL_SIZE} ==="
alert_slack "Backup complete ✅  Date: ${DATE} | Size: ${TOTAL_SIZE}" "🟢"
