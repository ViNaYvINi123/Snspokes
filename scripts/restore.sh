#!/bin/bash
# =============================================================
# snspokes — Restore / Rollback Script
# Usage:
#   ./restore.sh list                        — list available backups
#   ./restore.sh db 2025-01-15_02-00-00     — restore only database
#   ./restore.sh full 2025-01-15_02-00-00   — full restore
#   ./restore.sh container nextjs            — restore single container
# =============================================================

set -euo pipefail

BACKUP_ROOT="/opt/snspokes-backups"
APP_DIR="/root/snspokes"
DECRYPT_KEY="${BACKUP_ENCRYPT_KEY:-changeme-32chars-key-here}"
S3_BUCKET="${S3_BUCKET:-s3://snspokes-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-}"

[ -f /root/snspokes/.env.backup ] && source /root/snspokes/.env.backup

log() { echo "[$(date '+%H:%M:%S')] $1"; }
err() { echo "ERROR: $1" >&2; exit 1; }

s3_cmd() {
  if [ -n "$S3_ENDPOINT" ]; then
    aws s3 "$@" --endpoint-url="${S3_ENDPOINT}"
  else
    aws s3 "$@"
  fi
}

decrypt_backup() {
  local ARCHIVE="$1"
  local OUT_DIR="$2"
  log "Decrypting backup..."
  mkdir -p "$OUT_DIR"
  openssl enc -d -aes-256-cbc -pbkdf2 -k "${DECRYPT_KEY}" \
    -in "${ARCHIVE}" | tar -xzf - -C "${OUT_DIR}"
  log "  ✓ Decrypted to ${OUT_DIR}"
}

fetch_backup() {
  local DATE="$1"
  local ARCHIVE="${BACKUP_ROOT}/daily/snspokes_backup_${DATE}.tar.gz.enc"
  if [ ! -f "$ARCHIVE" ]; then
    log "Not found locally, fetching from remote storage..."
    s3_cmd cp "${S3_BUCKET}/daily/snspokes_backup_${DATE}.tar.gz.enc" "$ARCHIVE"
  fi
  echo "$ARCHIVE"
}

case "${1:-help}" in

  list)
    log "=== Local backups ==="
    ls -lht "${BACKUP_ROOT}/daily/"*.enc 2>/dev/null || log "No local backups found"
    echo ""
    log "=== Remote backups (last 10) ==="
    s3_cmd ls "${S3_BUCKET}/daily/" 2>/dev/null | tail -10 || log "Could not list remote backups"
    ;;

  db)
    DATE="${2:-}" ; [ -z "$DATE" ] && err "Usage: ./restore.sh db <DATE>"
    ARCHIVE=$(fetch_backup "$DATE")
    WORK_DIR="/tmp/snspokes_restore_${DATE}"
    decrypt_backup "$ARCHIVE" "$WORK_DIR"
    DUMP_FILE=$(find "$WORK_DIR" -name "database.dump" | head -1)
    [ -z "$DUMP_FILE" ] && err "database.dump not found in backup"
    log "Restoring PostgreSQL database..."
    docker cp "$DUMP_FILE" snspokes_db:/tmp/restore.dump
    docker exec snspokes_db psql -U snspokes_user -c "DROP DATABASE IF EXISTS snspokes_restore;"
    docker exec snspokes_db psql -U snspokes_user -c "CREATE DATABASE snspokes_restore;"
    docker exec snspokes_db pg_restore \
      -U snspokes_user -d snspokes_restore \
      --no-password --verbose /tmp/restore.dump
    log "  ✓ Restored to snspokes_restore (test it first!)"
    log ""
    log "  To make live: docker exec snspokes_db psql -U snspokes_user -c 'ALTER DATABASE snspokes RENAME TO snspokes_old; ALTER DATABASE snspokes_restore RENAME TO snspokes;'"
    rm -rf "$WORK_DIR"
    ;;

  full)
    DATE="${2:-}" ; [ -z "$DATE" ] && err "Usage: ./restore.sh full <DATE>"
    read -p "⚠️  Full restore will stop all containers. Continue? [y/N] " CONFIRM
    [ "$CONFIRM" != "y" ] && exit 0
    ARCHIVE=$(fetch_backup "$DATE")
    WORK_DIR="/tmp/snspokes_restore_${DATE}"
    decrypt_backup "$ARCHIVE" "$WORK_DIR"

    log "Stopping all containers..."
    cd "$APP_DIR" && docker compose down

    log "Restoring app code..."
    BACKUP_APP=$(find "$WORK_DIR" -name "app_code.tar.gz" | head -1)
    if [ -n "$BACKUP_APP" ]; then
      tar -xzf "$BACKUP_APP" -C /
      log "  ✓ App code restored"
    fi

    log "Restoring Docker volumes..."
    for vol_file in "$WORK_DIR"/volumes/*.tar.gz; do
      VOL_NAME=$(basename "$vol_file" .tar.gz)
      docker volume create "$VOL_NAME" 2>/dev/null || true
      docker run --rm \
        -v "${VOL_NAME}:/data" \
        -v "$(dirname $vol_file):/backup:ro" \
        alpine sh -c "rm -rf /data/* && tar -xzf /backup/$(basename $vol_file) -C /data"
      log "  ✓ Volume ${VOL_NAME} restored"
    done

    log "Restoring database..."
    cd "$APP_DIR" && docker compose up -d snspokes_db
    sleep 5
    DUMP=$(find "$WORK_DIR" -name "database.dump" | head -1)
    docker cp "$DUMP" snspokes_db:/tmp/restore.dump
    docker exec snspokes_db pg_restore -U snspokes_user -d snspokes \
      --no-password --clean --if-exists /tmp/restore.dump || true

    log "Restoring n8n workflows..."
    cd "$APP_DIR" && docker compose up -d snspokes_n8n
    sleep 8
    N8N_WF=$(find "$WORK_DIR" -name "workflows_backup.json" | head -1)
    N8N_CR=$(find "$WORK_DIR" -name "credentials_backup.json" | head -1)
    [ -n "$N8N_WF" ] && docker cp "$N8N_WF" snspokes_n8n:/tmp/ && \
      docker exec snspokes_n8n n8n import:workflow --input=/tmp/workflows_backup.json || true
    [ -n "$N8N_CR" ] && docker cp "$N8N_CR" snspokes_n8n:/tmp/ && \
      docker exec snspokes_n8n n8n import:credentials --input=/tmp/credentials_backup.json || true

    log "Starting all containers..."
    cd "$APP_DIR" && docker compose up -d
    rm -rf "$WORK_DIR"
    log ""
    log "=== Full restore complete! Check: curl http://localhost:3001/api/health ==="
    ;;

  container)
    CONTAINER="${2:-}" ; [ -z "$CONTAINER" ] && err "Usage: ./restore.sh container <name>"
    log "Rolling back container: snspokes_${CONTAINER}..."
    cd "$APP_DIR"
    docker compose stop "${CONTAINER}" 2>/dev/null || true
    docker compose rm -f "${CONTAINER}" 2>/dev/null || true
    docker compose up -d "${CONTAINER}"
    log "  ✓ Container snspokes_${CONTAINER} restarted with latest image"
    ;;

  *)
    echo "Usage:"
    echo "  ./restore.sh list"
    echo "  ./restore.sh db <DATE>         e.g. 2025-01-15_02-00-00"
    echo "  ./restore.sh full <DATE>"
    echo "  ./restore.sh container <name>  e.g. nextjs / n8n / db"
    ;;
esac
