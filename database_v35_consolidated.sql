-- ══════════════════════════════════════════════════════════
-- snspokes v35 — Consolidated migration
-- Safe to run multiple times (IF NOT EXISTS everywhere)
-- Run: docker exec -i snspokes_db psql -U snspokes_user -d snspokes < database_v35_consolidated.sql
-- ══════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Core tables ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  image TEXT,
  provider TEXT DEFAULT 'credentials',
  role TEXT DEFAULT 'user',
  plan TEXT DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  onboarded BOOLEAN DEFAULT false,
  referral_code TEXT,
  referred_by TEXT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  interval TEXT DEFAULT 'monthly',
  search_limit INTEGER DEFAULT 10,
  code_gen_limit INTEGER DEFAULT 5,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_spokes (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🔌',
  category TEXT DEFAULT 'General',
  plugin_id TEXT,
  credential_type TEXT,
  min_version TEXT,
  official_description TEXT,
  setup_steps TEXT,
  actions TEXT,
  common_errors TEXT,
  tags TEXT[] DEFAULT '{}',
  tier TEXT DEFAULT 'professional',
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  avg_rating NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  ai_description TEXT,
  personal_tip TEXT,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_system_properties (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  type TEXT DEFAULT 'string',
  default_value TEXT,
  description TEXT,
  editable BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Search & AI ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_search_analytics (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id INTEGER,
  results_count INTEGER DEFAULT 0,
  ai_used BOOLEAN DEFAULT false,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_ai_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  response TEXT,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sn_search_gaps (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  last_searched TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Auth & Security ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_login_attempts (
  id SERIAL PRIMARY KEY,
  email TEXT,
  ip TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_password_resets (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES sn_users(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT,
  scopes TEXT[] DEFAULT '{read}',
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_ip_blocks (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  reason TEXT,
  blocked_by TEXT DEFAULT 'admin',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Payments ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES sn_users(id),
  plan_id INTEGER,
  amount NUMERIC,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending',
  provider TEXT DEFAULT 'razorpay',
  payment_id TEXT,
  order_id TEXT,
  subscription_id TEXT,
  signature TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES sn_users(id),
  plan_id INTEGER,
  status TEXT DEFAULT 'active',
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_promo_uses (
  id SERIAL PRIMARY KEY,
  promo_id INTEGER,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_revenue_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  type TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── User content ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_user_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES sn_users(id),
  spoke_slug TEXT NOT NULL,
  name TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, spoke_slug)
);

CREATE TABLE IF NOT EXISTS sn_saved_queries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  query TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_saved_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  type TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_code_generations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  code_type TEXT,
  prompt TEXT,
  generated_code TEXT,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_shared_scripts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'javascript',
  title TEXT,
  description TEXT,
  user_id INTEGER,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_spoke_ratings (
  id SERIAL PRIMARY KEY,
  spoke_slug TEXT NOT NULL,
  user_id INTEGER REFERENCES sn_users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(spoke_slug, user_id)
);

CREATE TABLE IF NOT EXISTS sn_spoke_submissions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  plugin_id TEXT,
  description TEXT,
  category TEXT,
  credential_type TEXT,
  min_version TEXT,
  status TEXT DEFAULT 'pending',
  submitted_by TEXT,
  reviewer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Chatbot ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_chatbot_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  ip TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_chatbot_messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  role TEXT DEFAULT 'user',
  content TEXT,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Teams ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id INTEGER REFERENCES sn_users(id),
  plan TEXT DEFAULT 'team',
  max_members INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES sn_teams(id),
  user_id INTEGER REFERENCES sn_users(id),
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS sn_team_invites (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES sn_teams(id),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  invited_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Referrals ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_referrals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES sn_users(id),
  code TEXT UNIQUE NOT NULL,
  reward_type TEXT DEFAULT 'credit',
  reward_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_referral_uses (
  id SERIAL PRIMARY KEY,
  referral_id INTEGER,
  referred_user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Admin & System ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  target TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_changelog (
  id SERIAL PRIMARY KEY,
  version TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'improvement',
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_feature_flags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_admin_logs (
  id SERIAL PRIMARY KEY,
  admin TEXT,
  action TEXT NOT NULL,
  target TEXT,
  details JSONB,
  ip TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_admin_notes (
  id SERIAL PRIMARY KEY,
  admin TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_admin_notifications (
  id SERIAL PRIMARY KEY,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_error_logs (
  id SERIAL PRIMARY KEY,
  message TEXT,
  source TEXT,
  stack TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_backup_logs (
  id SERIAL PRIMARY KEY,
  filename TEXT,
  size_bytes BIGINT,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'website',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_dev_activity (
  id SERIAL PRIMARY KEY,
  type TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Webhooks ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_webhooks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  name TEXT,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] DEFAULT '{spoke.new}',
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_webhook_events (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER,
  event TEXT,
  payload JSONB,
  status_code INTEGER,
  response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── API & Logs ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_api_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_api_reference (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  category TEXT,
  scope TEXT,
  description TEXT,
  methods JSONB,
  examples JSONB,
  since_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Error Encyclopedia ──────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_error_encyclopedia (
  id SERIAL PRIMARY KEY,
  error_code TEXT,
  error_message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  cause TEXT,
  solution TEXT,
  prevention TEXT,
  related_api TEXT,
  severity TEXT DEFAULT 'medium',
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Spoke versions ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_spoke_versions (
  id SERIAL PRIMARY KEY,
  spoke_slug TEXT,
  version TEXT,
  changes TEXT,
  release_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_version_matrix (
  id SERIAL PRIMARY KEY,
  spoke_slug TEXT,
  sn_version TEXT,
  supported BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_scope_comparison (
  id SERIAL PRIMARY KEY,
  api_name TEXT,
  global_access BOOLEAN DEFAULT true,
  scoped_access BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Sync log ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sn_sync_log (
  id SERIAL PRIMARY KEY,
  action TEXT,
  spokes_updated INTEGER DEFAULT 0,
  props_updated INTEGER DEFAULT 0,
  releases_found INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Safe ALTER statements (add missing columns) ─────────

ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS avg_rating NUMERIC DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'professional';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS personal_tip TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS official_description TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS setup_steps TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS actions TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS common_errors TEXT;

ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS referred_by TEXT;

ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'razorpay';

ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

ALTER TABLE sn_announcements ADD COLUMN IF NOT EXISTS target TEXT DEFAULT 'all';

-- ── Indexes for performance ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_spokes_slug ON sn_spokes(slug);
CREATE INDEX IF NOT EXISTS idx_spokes_category ON sn_spokes(category);
CREATE INDEX IF NOT EXISTS idx_spokes_trgm_name ON sn_spokes USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spokes_trgm_desc ON sn_spokes USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON sn_search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON sn_search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON sn_users(email);
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON sn_ai_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_chatbot_session ON sn_chatbot_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_api_reference_slug ON sn_api_reference(slug);

-- ── Seed default plan if empty ──────────────────────────

INSERT INTO sn_plans (name, slug, price, currency, interval, search_limit, code_gen_limit, features, is_active)
VALUES ('Free', 'free', 0, 'INR', 'monthly', 20, 10, '["Search spokes","Code generator","Error finder","Cheatsheet"]', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO sn_plans (name, slug, price, currency, interval, search_limit, code_gen_limit, features, is_active)
VALUES ('Pro', 'pro', 499, 'INR', 'monthly', 200, 100, '["Unlimited search","Unlimited code gen","Priority AI","API access","Export"]', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO sn_plans (name, slug, price, currency, interval, search_limit, code_gen_limit, features, is_active)
VALUES ('Team', 'team', 1999, 'INR', 'monthly', 1000, 500, '["Everything in Pro","Team management","Shared bookmarks","Admin dashboard","SSO"]', true)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed default feature flags ──────────────────────────

INSERT INTO sn_feature_flags (name, description, enabled) VALUES
  ('chatbot', 'Show chatbot widget on all pages', true),
  ('code_generator', 'Enable AI code generator tool', true),
  ('error_finder', 'Enable AI error finder tool', true),
  ('search_ai', 'Enable AI-powered search answers', true),
  ('announcements', 'Show announcement banners', true),
  ('command_palette', 'Enable ⌘K command palette', true),
  ('dark_mode', 'Force dark mode', true)
ON CONFLICT (name) DO NOTHING;

SELECT 'v35 migration complete — all tables ready' AS status;

-- Fix: missing columns needed by NextAuth
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS image TEXT;
