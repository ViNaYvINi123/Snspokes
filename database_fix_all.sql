-- snspokes — Fix All Missing Tables
-- Safe to run multiple times (IF NOT EXISTS)
BEGIN;

-- ── Users (CRITICAL — must be first, everything references it) ──
CREATE TABLE IF NOT EXISTS sn_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  image TEXT,
  provider VARCHAR(50) DEFAULT 'credentials',
  provider_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  role VARCHAR(50),
  search_count INT DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  is_active BOOLEAN DEFAULT true,
  onboarded BOOLEAN DEFAULT false,
  referral_code VARCHAR(50),
  referred_by INT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to sn_users if table already exists
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS search_count INT DEFAULT 0;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'credentials';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add missing columns to sn_spokes if needed
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS search_count INT DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS use_cases JSONB;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS code_examples JSONB;


CREATE TABLE IF NOT EXISTS sn_announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_feature_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  spoke_slug VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, spoke_slug)
);

CREATE TABLE IF NOT EXISTS sn_spoke_ratings (
  id SERIAL PRIMARY KEY,
  spoke_slug VARCHAR(200),
  user_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  rating INT CHECK (rating IN (-1, 1)),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(spoke_slug, user_id)
);

CREATE TABLE IF NOT EXISTS sn_code_generations (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  code_type VARCHAR(50),
  prompt TEXT,
  generated TEXT,
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_dev_activity (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  action VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_error_encyclopedia (
  id SERIAL PRIMARY KEY,
  error_pattern VARCHAR(500),
  title VARCHAR(255),
  description TEXT,
  root_cause TEXT,
  fix_steps JSONB,
  category VARCHAR(100),
  severity VARCHAR(50),
  source VARCHAR(100) DEFAULT 'manual',
  view_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_error_logs (
  id SERIAL PRIMARY KEY,
  message TEXT,
  source VARCHAR(100),
  stack TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_api_logs (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500),
  method VARCHAR(10),
  status_code INT,
  duration_ms INT,
  user_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_audit_logs (
  id SERIAL PRIMARY KEY,
  actor VARCHAR(200),
  action VARCHAR(100),
  resource VARCHAR(100),
  resource_id VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_teams (
  id SERIAL PRIMARY KEY,
  owner_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  name VARCHAR(200),
  plan VARCHAR(50) DEFAULT 'enterprise',
  max_members INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_team_members (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES sn_teams(id) ON DELETE CASCADE,
  user_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS sn_team_invitations (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES sn_teams(id) ON DELETE CASCADE,
  email VARCHAR(255),
  token VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  referred_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  code VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  reward_given BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_webhooks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  url VARCHAR(500) NOT NULL,
  events TEXT[],
  secret VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_api_connectors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  base_url VARCHAR(500),
  auth_type VARCHAR(50) DEFAULT 'none',
  auth_config JSONB,
  headers JSONB,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_api_endpoints (
  id SERIAL PRIMARY KEY,
  connector_id INT REFERENCES sn_api_connectors(id) ON DELETE CASCADE,
  name VARCHAR(200),
  method VARCHAR(10) DEFAULT 'GET',
  path VARCHAR(500),
  body_template JSONB,
  response_mapping JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent INT DEFAULT 0,
  max_uses INT DEFAULT 100,
  used_count INT DEFAULT 0,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_saved_queries (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  name VARCHAR(200),
  query_text TEXT,
  query_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_spoke_submissions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200),
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_changelog (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50),
  title VARCHAR(255),
  date DATE DEFAULT CURRENT_DATE,
  type VARCHAR(50) DEFAULT 'feature',
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_footer_config (
  id SERIAL PRIMARY KEY,
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_cookie_consents (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  consent JSONB,
  ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_ip_blocks (
  id SERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  reason TEXT,
  blocked_by VARCHAR(200) DEFAULT 'admin',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_api_keys (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(20),
  name VARCHAR(200),
  permissions JSONB,
  last_used TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_spoke_versions (
  id SERIAL PRIMARY KEY,
  spoke_id INT REFERENCES sn_spokes(id) ON DELETE CASCADE,
  version_number INT DEFAULT 1,
  data JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(200) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default plans if empty
INSERT INTO sn_plans (name, price_monthly, price_yearly, search_limit, features, is_active)
VALUES
  ('free', 0, 0, 10, '{"searches":10,"tools":true,"bookmarks":5}', true),
  ('pro', 999, 9990, 100, '{"searches":100,"tools":true,"bookmarks":50,"api_access":true}', true),
  ('enterprise', 4999, 49990, -1, '{"searches":-1,"tools":true,"bookmarks":-1,"api_access":true,"team":true}', true)
ON CONFLICT (name) DO NOTHING;

-- Seed default system properties
INSERT INTO sn_system_properties (name, value, category) VALUES
  ('maintenance_mode', 'false', 'system'),
  ('app_version', '32.7.0', 'system'),
  ('site_name', 'snspokes', 'general')
ON CONFLICT (name) DO NOTHING;

COMMIT;
