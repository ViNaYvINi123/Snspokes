# snspokes — ServiceNow Integration Hub Reference Platform

> AI-powered search + admin control panel for ServiceNow developers

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/ViNaYvINi123/Snspokes
cd Snspokes && npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Run locally
npm run dev
# Visit http://localhost:3001

# 4. Admin panel
# Visit http://localhost:3001/admin
# Login: admin / snspokes@admin2025
```

## 🏗️ Architecture

```
Browser
  ↓
Next.js (port 3001)
  ├── /pages          Frontend pages
  ├── /pages/admin    Admin panel
  ├── /pages/api      Backend API routes
  └── /lib            Shared utilities
       ├── db.js      PostgreSQL connection
       ├── redis.js   Redis cache (optional)
       ├── llm.js     AI (OpenRouter + Ollama)
       ├── features.js Feature flags
       └── logger.js  Winston logging
  ↓
PostgreSQL (snspokes_db)
  ↓
Redis (snspokes_redis) [optional]
  ↓
Ollama (localhost:11434) or OpenRouter
```

## 📁 Project Structure

```
├── pages/
│   ├── index.js              Homepage
│   ├── search.js             Search + AI answers
│   ├── spokes.js             Browse all spokes
│   ├── spoke/[slug].js       Spoke detail
│   ├── admin/
│   │   ├── index.js          Admin login
│   │   ├── dashboard.js      System metrics
│   │   ├── users.js          User management
│   │   ├── spokes.js         Spoke CRUD
│   │   ├── properties.js     System properties
│   │   ├── flags.js          Feature flags ← NEW
│   │   ├── env-manager.js    Env file manager ← NEW
│   │   ├── ai-debug.js       AI debug assistant ← NEW
│   │   ├── global-search.js  Search everything ← NEW
│   │   ├── payments.js       Payment monitoring
│   │   ├── analytics.js      Search analytics
│   │   ├── database.js       DB management
│   │   ├── logs.js           Activity logs
│   │   └── settings.js       Google/Razorpay setup
│   └── api/
│       ├── search.js         Search API (Redis + AI)
│       ├── spoke.js          Spoke detail + AI gen
│       ├── chatbot.js        AI chatbot
│       ├── stream.js         SSE streaming
│       └── admin/
│           ├── flags.js      Feature flags CRUD ← NEW
│           ├── env.js        Env file read/write ← NEW
│           ├── ai-debug.js   AI debug API ← NEW
│           ├── global-search.js Cross-table search ← NEW
│           ├── analyzer.js   App performance analyzer ← NEW
│           ├── properties.js System properties CRUD
│           ├── spokes.js     Admin spokes CRUD
│           ├── users.js      User management
│           └── ...
├── lib/
│   ├── db.js                 PostgreSQL Pool
│   ├── redis.js              Redis + memory fallback
│   ├── llm.js                OpenRouter + Ollama AI
│   ├── features.js           Feature flags engine ← NEW
│   ├── logger.js             Winston logger
│   ├── adminAuth.js          JWT admin auth
│   ├── validate.js           Input validation
│   └── apiMiddleware.js      CORS + error handler
├── components/
│   ├── Navbar.js
│   ├── Footer.js
│   ├── Chatbot.js
│   └── admin/
│       └── AdminLayout.js    Medusa-style admin UI
├── public/
│   ├── logo.svg              App logo
│   └── favicon.svg           Browser tab icon
└── database_*.sql            DB migrations
```

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| sn_users | Registered users |
| sn_spokes | Integration Hub spokes |
| sn_system_properties | Dynamic config (no redeploy) |
| sn_feature_flags | Feature toggles |
| sn_search_analytics | Search query tracking |
| sn_search_cache | Persistent AI cache |
| sn_subscriptions | Payment subscriptions |
| sn_plans | Pricing plans |
| sn_api_logs | API request logs |
| sn_error_logs | Error tracking |
| sn_audit_logs | Who changed what |
| sn_admin_logs | Admin action logs |

## ⚙️ Admin Panel Features

### Dashboard `/admin`
- Real-time system health (Redis, Queue, DB)
- Trending search queries
- Live query feed

### Feature Flags `/admin/flags`
- Enable/disable features without redeploy
- Percentage rollout (e.g. 10% of users)
- Environment targeting (prod/beta/dev)

### Env Manager `/admin/env-manager`
- View all .env.local variables
- Edit values directly from browser
- Add/remove variables
- Sensitive values masked by default

### AI Debug Assistant `/admin/ai-debug`
- Ask AI questions about your system
- Auto-loads error logs / slow API context
- Generate SQL queries
- Debug issues without SSH

### Global Search `/admin/global-search`
- Search across users, spokes, properties, flags, logs
- 400ms debounce
- Filter by type

### SN Properties `/admin/properties`
- Store configs in DB (not .env)
- Control frontend behavior dynamically
- Enable/disable individual properties

## 🔧 Environment Variables

See `.env.example` for full list. Required minimum:

```env
# Database
DB_HOST=snspokes_db
DB_PASSWORD=Vinay@123

# Auth
NEXTAUTH_SECRET=your-secret

# AI (at least one required)
OLLAMA_URL=http://172.19.0.1:11434
# OR
OPENROUTER_API_KEY=sk-or-v1-xxx
```

## 🚢 Deploy to Hetzner

```bash
ssh root@77.42.71.149
cd ~/snspokes/app && git pull

# First time only - run migrations
docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_v7.sql

# Every deploy
cd ~/snspokes && docker compose up -d --build nextjs
```

## 🔄 No-Redeploy Changes

These changes take effect **immediately** without rebuild:
- Feature flags (toggle on/off in admin)
- System properties (edit in admin)
- n8n workflows (save in n8n UI)

These require **app restart only** (no rebuild):
- .env.local changes → `docker restart snspokes_nextjs`

These require **full rebuild**:
- Code changes → `docker compose up -d --build nextjs`
