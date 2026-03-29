# snspokes — Mock Mode Setup

Run the full app locally **without** PostgreSQL, Redis, n8n, or OpenRouter.

## Quick Start (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Copy mock env
cp .env.mock .env.local

# 3. Start the app
npm run dev

# 4. Open browser
# App:   http://localhost:3001
# Admin: http://localhost:3001/admin
#        username: admin
#        password: snspokes@admin2025
```

## What works in Mock Mode

| Feature | Mock Mode | Notes |
|---------|-----------|-------|
| Browse spokes | ✅ | 12 real spokes preloaded |
| Search spokes | ✅ | Filters mock data |
| User dashboard | ✅ | Mock user data |
| Admin panel | ✅ | All 31 pages work |
| Command Center | ✅ | Live stats from mock data |
| Activity Feed | ✅ | Simulated events |
| Code Generator | ✅ | Returns mock code |
| Script Linter | ✅ | Real lint rules run |
| Chatbot | ✅ | Returns mock AI answer |
| Error Analyzer | ✅ | Mock analysis |
| Login/Register | ✅ | Mock auth |
| Payments | ⚠️ | UI works, no real charge |
| Email | ✅ | Logs to console only |
| Backups | ⚠️ | Not functional |
| SSL | ⚠️ | Not needed locally |

## Mock Data Summary

- **8 users** (free, pro, enterprise)
- **12 spokes** (Slack, Jira, Teams, AWS, GitHub, etc.)
- **5 payments** (active subscriptions)
- **7 search records**
- **2 code generations**
- **3 error logs**
- **2 pending spoke submissions**

## Switch to Real DB

```bash
# Edit .env.local
MOCK_MODE=false

# Start real services
docker compose up -d

# Run migrations
./run-migrations.sh
```

## Admin Login

```
URL:      http://localhost:3001/admin
Username: admin
Password: snspokes@admin2025
```
