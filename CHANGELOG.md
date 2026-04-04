# Changelog

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
