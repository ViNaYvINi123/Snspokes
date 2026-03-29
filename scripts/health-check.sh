#!/bin/bash
# =============================================================
# snspokes — Health Monitor
# Run every 5 min via cron. Alerts Slack if anything is down.
# Cron: */5 * * * * /root/snspokes/scripts/health-check.sh
# =============================================================

[ -f /root/snspokes/.env.backup ] && source /root/snspokes/.env.backup
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
BASE_URL="${APP_URL:-http://localhost:3001}"
STATE_FILE="/tmp/snspokes_health_state"

alert() {
  local msg="$1"
  echo "[$(date)] ALERT: $msg"
  [ -n "$SLACK_WEBHOOK" ] && curl -s -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"🔴 *snspokes DOWN*: ${msg}\"}" || true
}
recover() {
  local svc="$1"
  [ -n "$SLACK_WEBHOOK" ] && curl -s -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"🟢 *snspokes RECOVERED*: ${svc} is back up\"}" || true
}

declare -A CHECKS=(
  ["nextjs"]="${BASE_URL}/api/health"
  ["n8n"]="http://localhost:5678/healthz"
)

for svc in "${!CHECKS[@]}"; do
  URL="${CHECKS[$svc]}"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null || echo "000")
  STATE_KEY="${svc}_down"
  WAS_DOWN=$(grep -c "^${STATE_KEY}$" "$STATE_FILE" 2>/dev/null || echo "0")
  if [[ "$HTTP" != "200" ]]; then
    if [ "$WAS_DOWN" = "0" ]; then
      alert "${svc} returned HTTP ${HTTP} (${URL})"
      echo "$STATE_KEY" >> "$STATE_FILE"
    fi
  else
    if [ "$WAS_DOWN" != "0" ]; then
      recover "$svc"
      sed -i "/^${STATE_KEY}$/d" "$STATE_FILE" 2>/dev/null || true
    fi
  fi
done

# Check disk
DISK=$(df / | awk 'NR==2{print $5}' | tr -d '%')
if [ "$DISK" -gt 85 ]; then
  alert "Disk usage ${DISK}% — cleanup needed!"
fi

# Check DB
DB_OK=$(docker exec snspokes_db psql -U snspokes_user -d snspokes -c "SELECT 1" -q -t 2>/dev/null | grep -c "1" || echo "0")
if [ "$DB_OK" = "0" ]; then
  alert "PostgreSQL is not responding!"
fi
