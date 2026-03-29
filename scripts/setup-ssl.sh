#!/bin/bash
# =============================================================
# snspokes — Let's Encrypt SSL Setup
# Usage: ./setup-ssl.sh snspokes.com
# =============================================================

DOMAIN="${1:-}" ; [ -z "$DOMAIN" ] && echo "Usage: ./setup-ssl.sh yourdomain.com" && exit 1
EMAIL="${2:-admin@${DOMAIN}}"
APP_DIR="/root/snspokes"

log() { echo "[SSL] $1"; }

log "Installing certbot..."
apt-get install -y -qq certbot

log "Stopping nginx temporarily for cert generation..."
docker compose -f "$APP_DIR/docker-compose.yml" stop nginx 2>/dev/null || true

log "Getting Let's Encrypt cert for ${DOMAIN}..."
certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  -d "www.${DOMAIN}"

mkdir -p "${APP_DIR}/ssl"
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem "${APP_DIR}/ssl/fullchain.pem"
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem "${APP_DIR}/ssl/privkey.pem"
chmod 600 "${APP_DIR}/ssl/"*.pem
log "  ✓ Certs copied to ${APP_DIR}/ssl/"

log "Writing SSL nginx config..."
cat > "${APP_DIR}/nginx-ssl.conf" << NGINX
events { worker_connections 1024; }
http {
  upstream nextjs { server nextjs:3001; }
  upstream n8n     { server snspokes_n8n:5678; }

  # Redirect HTTP → HTTPS
  server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$host\$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / { proxy_pass http://nextjs; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
    location /webhook/ { proxy_pass http://n8n; proxy_set_header Host \$host; }
  }
}
NGINX

log "Restarting nginx with SSL config..."
docker compose -f "$APP_DIR/docker-compose.yml" up -d nginx

# Auto-renew cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${APP_DIR}/ssl/fullchain.pem && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${APP_DIR}/ssl/privkey.pem && docker exec snspokes_nginx nginx -s reload") | crontab -
log "  ✓ Auto-renew cron added"
log "  ✅  SSL ready! https://${DOMAIN}"
