# 💡 snspokes — Developer Tips & Tricks

## ⚡ Performance Tips

### 1. Redis makes it 10x faster
Without Redis, every search hits the AI (2-5s).
With Redis, cached results return in <50ms.

```bash
# Check if Redis is working
docker exec snspokes_redis redis-cli ping
# Should return: PONG
```

### 2. Use Feature Flags for risky changes
Instead of deploying new code, use feature flags:
```
1. Create flag in /admin/flags with enabled=false
2. Deploy new code that checks the flag:
   import { isEnabled } from '../lib/features'
   const useNewSearch = await isEnabled('new_search_algo')
3. Enable flag in admin when ready
4. Roll back by disabling flag (no redeploy!)
```

### 3. System Properties for dynamic config
Store settings in DB instead of code:
```sql
-- Add a new property
INSERT INTO sn_system_properties (name, value, category, description)
VALUES ('homepage_banner', 'Welcome to snspokes!', 'UI', 'Banner shown on homepage');
```
Then read in your page:
```js
const bannerRes = await query("SELECT value FROM sn_system_properties WHERE name='homepage_banner' AND is_active=true")
const banner = bannerRes.rows[0]?.value
```

---

## 🔐 Security Tips

### 1. Change default admin password
```bash
# Edit .env.local on Hetzner
nano ~/snspokes/app/.env.local
# Change ADMIN_PASSWORD=your-new-password
# Restart: docker restart snspokes_nextjs
```

### 2. Rotate ADMIN_SECRET regularly
The JWT secret signs admin tokens. Change it monthly:
```
ADMIN_SECRET=new-random-string-$(date +%Y%m)
```

### 3. Sensitive env vars
- Never put real secrets in source code
- Use Env Manager in admin (/admin/env-manager)
- Sensitive keys (password, secret, key) are auto-masked

---

## 🤖 AI Tips

### 1. OpenRouter is FREE
Get free AI keys at https://openrouter.ai
Best free models:
- `meta-llama/llama-3.1-8b-instruct:free` - Fast, good quality
- `mistralai/mistral-7b-instruct:free` - Alternative
- `google/gemma-2-9b-it:free` - Google model

### 2. Ollama is your fallback
If OpenRouter fails or rate limits, Ollama on your server kicks in.
Always have both configured.

### 3. AI Debug prompts that work well
```
"Why are my searches returning 0 results?"
"Write SQL to find the top 10 most searched queries this week"
"How do I add a new feature flag for beta users?"
"Explain why Redis cache hit rate might be low"
"Generate a migration to add a 'phone' column to users"
```

---

## 🚀 Deployment Tips

### 1. Zero-downtime deploy
```bash
# Pull new code while old container still running
cd ~/snspokes/app && git pull

# Build and restart (brief downtime ~10s)
cd ~/snspokes && docker compose up -d --build nextjs
```

### 2. Monitor logs in real-time
```bash
docker logs -f snspokes_nextjs    # App logs
docker logs -f snspokes_n8n       # n8n logs  
docker logs -f snspokes_db        # DB logs
```

### 3. Quick health check
```bash
curl http://localhost:3001/api/admin/system \
  -H "Authorization: Bearer $(cat ~/.admin_token)"
```

### 4. Backup database
```bash
docker exec snspokes_db pg_dump -U snspokes_user snspokes > backup_$(date +%Y%m%d).sql
```

### 5. When things break
```bash
# Check what's running
docker ps

# Restart everything
cd ~/snspokes && docker compose restart

# Nuclear option - full rebuild
docker compose down && docker compose up -d --build
```

---

## 📊 Monitoring Tips

### 1. Use AI Debug for quick analysis
Go to /admin/ai-debug, select "Performance" context, ask:
"Which APIs are slowest and why?"

### 2. Watch for these warning signs
- Redis hit rate < 50% → Check REDIS_HOST in .env
- Error count > 10/hour → Check /admin/logs
- Searches returning 0 results → Check n8n workflows
- Admin login loop → Check ADMIN_SECRET in .env

### 3. DB query to find slow users
```sql
SELECT email, search_count, last_login, plan
FROM sn_users
ORDER BY search_count DESC LIMIT 20;
```

---

## 🔌 Adding New Spokes

### Via Admin (easiest)
1. Go to /admin/spokes
2. Click "+ Add Spoke"  
3. Fill in slug, name, category
4. AI will generate full content on first visit

### Via SQL (bulk import)
```sql
INSERT INTO sn_spokes (slug, name, description, icon, category, tags)
VALUES 
  ('zoom', 'Zoom', 'Video meetings integration', '📹', 'Communication', ARRAY['video','meetings']),
  ('dropbox', 'Dropbox', 'File storage and sharing', '📦', 'Storage', ARRAY['files','storage']);
```

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Admin login redirects back | Check ADMIN_SECRET in .env.local |
| Spoke page stuck loading | Check Ollama: `systemctl status ollama` |
| Search returns empty | Check n8n workflow is active |
| Redis not connected | Add `snspokes_redis` to docker-compose |
| Build fails | Run `npm install` then retry |
| DB connection error | Check DB_HOST=snspokes_db (not localhost) |

---

## 💰 Cost Optimization

- **OpenRouter free tier**: 10 requests/min, limited daily
- **Ollama**: Completely free, runs on your server
- **Redis**: Uses ~50MB RAM for normal usage
- **Postgres**: ~200MB for typical usage

Total cost for 4GB Hetzner server: ~€4/month
