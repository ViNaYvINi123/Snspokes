# Changelog

## v32.10.0 (2026-04-04)

### Admin CRUD
- Teams API: added DELETE
- Changelog API: added DELETE  
- Submissions API: added DELETE
- User-detail API: added PUT (update user)
- Plans API: added DELETE

### System Properties
- Added AI assist endpoint (n8n-powered property suggestions)
- Created 7th n8n workflow: property-assist

### Tools
- All AI tools show "n8n required" banner when n8n is down
- Health check integrated into each tool page

### Pages
- Created /privacy and /terms pages

### Documentation
- TECHNICAL_GUIDE.md: added tools guide, admin features, subscription flow, Redis setup, full error reference

## v32.9.0 (2026-04-04)

### Infrastructure
- Redis: default host changed from localhost → snspokes_redis (fixes Redis disconnected in admin)
- Dockerfile: added postgresql-client for DB backup feature
- docker-compose: nextjs now depends on redis healthcheck
- docker-compose: OPENROUTER_API_KEY passed to n8n container

### Admin Panel
- Backup: rewrote dbBackup.js to use pg_dump with connection params (not docker exec)
- Activity Feed: fixed sn_payments → sn_subscriptions table reference
- Announcements: added missing 'target' column to database migration
- CookieBanner: now rendered in _app.js (was imported but not shown)

### Frontend
- Footer: replaced gradient 'S' box with actual logo.svg
- Chatbot: added to all pages, welcome message open to all topics
- Search: animated loading messages, removed off-topic restrictions entirely
- Stream: removed ServiceNow-only restriction

### Database
- Added sn_payments table to migration
- Added target column to sn_announcements

## v32.8.0 (2026-04-04)

### Critical Fixes
- **Port mapping**: Fixed `3001:3000` → `3001:3001` in docker-compose (APIs were unreachable)
- **n8n proxy crash**: Added `N8N_PROXY_HOPS=1` (webhooks were failing with X-Forwarded-For error)
- **Database**: Created all 25+ missing tables including `sn_users`, `sn_announcements`, `sn_feature_flags`
- **Security**: Removed `.env.local` from repository (passwords were publicly visible)

### Authentication
- Removed GitHub OAuth completely (login, register, NextAuth)
- Rewrote login page — Google OAuth + email/password only
- Fixed Google OAuth callback flow
- Added `is_active`, `onboarded`, `role` columns to sn_users

### Search & AI
- Removed ServiceNow-only restriction — users can search anything
- Added animated loading messages during search
- All AI calls route through n8n workflows exclusively
- Chatbot added to all pages via _app.js

### Admin Panel
- Fixed `setSecurityHeaders` missing import in version-matrix and query-builder APIs
- Fixed JWT secret mismatch (login vs auth middleware)
- Added 401 response interceptor
- Dark theme applied across all admin pages

### Code Quality
- Removed junk files (11.12.1, ERROR, [builder, etc.)
- Updated .gitignore
- Updated .env.example with complete config guide
