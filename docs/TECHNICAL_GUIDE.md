# snspokes — Technical Guide

## Architecture

```
User → Nginx (SSL :443) → Next.js (:3001) → n8n (:5678) → OpenRouter AI
                                           → PostgreSQL (DB)
                                           → Redis (Cache)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | Yes | PostgreSQL host (`snspokes_db` in Docker) |
| `DB_PORT` | Yes | PostgreSQL port (default: `5432`) |
| `DB_NAME` | Yes | Database name (`snspokes`) |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `REDIS_HOST` | Yes | Redis host (`snspokes_redis` in Docker) |
| `N8N_URL` | Yes | n8n internal URL (`http://snspokes_n8n:5678`) |
| `N8N_TIMEOUT` | No | n8n request timeout in ms (default: `90000`) |
| `NEXTAUTH_URL` | Yes | Your domain (`https://snspokes.com`) |
| `NEXTAUTH_SECRET` | Yes | Random 32+ char string for JWT signing |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `ADMIN_USERNAME` | Yes | Admin panel username |
| `ADMIN_PASSWORD` | Yes | Admin panel password |
| `ADMIN_SECRET` | Yes | JWT secret for admin tokens |

## n8n Workflows

All AI calls go through n8n. Next.js NEVER calls OpenRouter/Ollama directly.

| Webhook Path | Purpose | Workflow |
|-------------|---------|----------|
| `sn-search-spokes` | Search spokes | Search Pipeline |
| `sn-enrich-spoke` | Generate spoke content | AI Spoke Enricher |
| `sn-get-spoke` | Get spoke detail | Get Spoke |
| `sn-list-spokes` | List all spokes | List Spokes |
| `sn-chatbot` | Chatbot responses | AI Chatbot |
| `sn-generate-code` | Code generator tool | AI Code Generator |
| `sn-lint-script` | Script linter tool | Script Linter |
| `sn-analyze-error` | Error analyzer tool | Error Analyzer |
| `sn-ai-debug` | Admin AI debug | AI Debug |
| `sn-optimize-query` | Query optimizer | Query Optimizer |

### How to modify AI behavior
1. Open n8n at `https://n8n.snspokes.com`
2. Find the workflow you want to change
3. Edit the OpenRouter node — change model, prompt, temperature
4. Save and activate — no app restart needed

### OpenRouter setup in n8n
1. In any workflow, add an HTTP Request node
2. URL: `https://openrouter.ai/api/v1/chat/completions`
3. Header: `Authorization: Bearer YOUR_OPENROUTER_KEY`
4. Free models: `mistralai/mistral-7b-instruct:free`, `meta-llama/llama-3.1-8b-instruct:free`

## Authentication

- **Google OAuth**: Configured in NextAuth. Redirect URI: `https://snspokes.com/api/auth/callback/google`
- **Email/Password**: bcrypt hashed, stored in `sn_users`
- **Admin Panel**: Separate JWT-based auth via `ADMIN_SECRET`

### Google OAuth Setup
1. Go to `console.cloud.google.com`
2. APIs & Services → Credentials → Create OAuth 2.0 Client
3. Authorized redirect URI: `https://snspokes.com/api/auth/callback/google`
4. Copy Client ID and Secret to `.env.local`

## Docker Services

| Container | Port | Purpose |
|-----------|------|---------|
| `snspokes_nextjs` | 3001 | Next.js app |
| `snspokes_nginx` | 80/443 | Reverse proxy + SSL |
| `snspokes_n8n` | 5678 | Workflow automation |
| `snspokes_db` | 5432 | PostgreSQL database |
| `snspokes_redis` | 6379 | Cache + rate limiting |
| `portainer` | 9443 | Container management UI |

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| APIs return empty | Port mapping wrong | Check docker-compose ports |
| n8n webhook fails | X-Forwarded-For error | Add `N8N_PROXY_HOPS=1` |
| "relation does not exist" | Missing tables | Run `database_fix_all.sql` |
| Admin login loop | JWT secret mismatch | Ensure `ADMIN_SECRET` is set |
| "setSecurityHeaders not defined" | Missing import | Add import from `lib/security` |
| Redis disconnected | Wrong host | Set `REDIS_HOST=snspokes_redis` |

## Restart & Debug Commands

```bash
# Restart single service
docker compose restart nextjs

# Full rebuild
docker compose up -d --build nextjs

# View logs
docker logs snspokes_nextjs --tail=50
docker logs snspokes_n8n --tail=50

# Database console
docker exec -it snspokes_db psql -U snspokes_user -d snspokes

# Run migrations
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_fix_all.sql
```

## Redis

Redis is used for caching and rate limiting. If Redis is down, the app falls back to in-memory cache.

```bash
# Check Redis
docker exec snspokes_redis redis-cli ping

# Check Redis inside the app network
docker exec snspokes_nextjs sh -c "nc -z snspokes_redis 6379 && echo OK || echo FAIL"
```

Ensure `REDIS_HOST=snspokes_redis` in `.env.local` (not `localhost`).

## Subscription Flow

1. User visits `/pricing`
2. Clicks plan → Razorpay checkout opens
3. Payment completes → `/api/payment` webhook fires
4. User plan updated in `sn_users` + `sn_subscriptions`
5. Session refreshes with new plan
6. Rate limits adjust based on plan
