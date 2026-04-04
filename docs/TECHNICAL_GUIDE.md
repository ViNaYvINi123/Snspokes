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


## Adding or Removing Tools

### Add a new tool
1. Create frontend page: `pages/tools/my-tool.js`
2. Create API route: `pages/api/tools/my-tool.js`
3. Add n8n webhook path to `lib/n8n.js`: `export const n8nMyTool = (input) => callN8n('sn-my-tool', { input }, 60000);`
4. Add webhook node in n8n workflow
5. Add link to Navbar and Footer

### Remove a tool
1. Delete `pages/tools/my-tool.js`
2. Delete `pages/api/tools/my-tool.js`
3. Remove from Navbar links
4. Remove from Footer links

## Admin Panel — Full Feature List

| Page | Purpose | API |
|------|---------|-----|
| /admin/dashboard | Overview stats | /api/admin/dashboard |
| /admin/users | User management (CRUD) | /api/admin/users |
| /admin/spokes | Spoke management (CRUD) | /api/admin/spokes |
| /admin/properties | System properties + AI assist | /api/admin/properties |
| /admin/flags | Feature flags on/off | /api/admin/flags |
| /admin/announcements | Banner announcements (CRUD) | /api/admin/announcements |
| /admin/plans | Subscription plans | /api/admin/plans |
| /admin/payments | Payment history | /api/admin/payments |
| /admin/analytics | Search & usage analytics | /api/admin/analytics |
| /admin/system | System health + Redis + DB | /api/admin/system |
| /admin/backup | Database backup | /api/admin/backup |
| /admin/logs | Error & API logs | /api/admin/logs |
| /admin/ai-debug | AI debugging assistant | /api/admin/ai-debug |
| /admin/teams | Team management | /api/admin/teams |
| /admin/changelog | Version changelog | /api/admin/changelog |
| /admin/submissions | User-submitted spokes | /api/admin/submissions |

## Subscription System Flow

```
User clicks "Upgrade" on /pricing
  → Frontend calls POST /api/payment { action: 'create_subscription', plan_id: 'pro' }
  → Backend creates Razorpay plan + subscription
  → Returns checkout URL
  → User completes payment on Razorpay
  → Frontend calls POST /api/payment { action: 'verify', razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
  → Backend verifies cryptographic signature
  → Updates sn_users.plan + sn_payments.status
  → Invalidates plan cache (Redis)
  → Sends upgrade email
  → User session refreshes with new plan
  → Rate limits adjust automatically
```

### Cancel subscription
```
User clicks "Cancel" in dashboard
  → POST /api/payment { action: 'cancel' }
  → Backend cancels Razorpay subscription
  → Sets user plan back to 'free'
  → Invalidates cache
```

### Webhook (automatic)
Razorpay sends webhooks to `/api/payment` for:
- `subscription.cancelled` → downgrades user to free
- `subscription.completed` → downgrades user to free

## Redis — Setup & Reconnection

Redis is used for:
- **Search caching** (TTL: 5 min)
- **Rate limiting** (per IP/user)
- **Plan caching** (TTL: 5 min)

If Redis is down, the app falls back to in-memory `Map()` cache. No data loss.

### Fix Redis connection
```bash
# Check Redis is running
docker exec snspokes_redis redis-cli ping
# Should return: PONG

# Check from app container
docker exec snspokes_nextjs sh -c "nc -z snspokes_redis 6379 && echo OK"

# If Redis is down
docker compose restart redis

# Verify in .env.local
REDIS_HOST=snspokes_redis
REDIS_PORT=6379
```

## Error Reference

| Error Message | Cause | Fix |
|--------------|-------|-----|
| `setSecurityHeaders is not defined` | Missing import | Add `import { setSecurityHeaders } from '../../lib/security'` |
| `relation "sn_xxx" does not exist` | Table not created | Run `database_fix_all.sql` |
| `ECONNREFUSED 127.0.0.1:5432` | DB_HOST is localhost | Set `DB_HOST=snspokes_db` in .env.local |
| `ECONNREFUSED 127.0.0.1:6379` | REDIS_HOST is localhost | Set `REDIS_HOST=snspokes_redis` in .env.local |
| `n8n webhook returns empty` | Workflow not activated | Open n8n → activate workflow |
| `X-Forwarded-For error in n8n` | Missing proxy config | Add `N8N_PROXY_HOPS=1` to docker-compose |
| `JWT invalid` | Secret mismatch | Ensure ADMIN_SECRET is same in .env.local |
| `Access Denied (Google)` | Wrong redirect URI | Set `https://snspokes.com/api/auth/callback/google` in Google Console |
| `Backup failed` | pg_dump not installed | Dockerfile includes postgresql-client |
| `Rate limit exceeded` | Too many requests | Wait or increase limit in Redis rate limiter |
