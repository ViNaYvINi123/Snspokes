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


-- Add missing columns
ALTER TABLE sn_announcements ADD COLUMN IF NOT EXISTS target VARCHAR(50) DEFAULT 'all';

-- Payments table (referenced by activity feed)
CREATE TABLE IF NOT EXISTS sn_payments (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  subscription_id VARCHAR(255),
  payment_id VARCHAR(255),
  plan VARCHAR(50),
  amount INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'pending',
  provider VARCHAR(50) DEFAULT 'razorpay',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add columns if table already exists
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'razorpay';



-- ══════════════════════════════════════
-- Additional tables referenced in code
-- ══════════════════════════════════════

-- Query Builder — ServiceNow table reference
CREATE TABLE IF NOT EXISTS sn_table_reference (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(200) UNIQUE NOT NULL,
  label VARCHAR(200),
  description TEXT,
  category VARCHAR(100),
  fields JSONB DEFAULT '[]',
  state_values JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Version Matrix
CREATE TABLE IF NOT EXISTS sn_version_matrix (
  id SERIAL PRIMARY KEY,
  feature_name VARCHAR(200) NOT NULL,
  feature_type VARCHAR(50) DEFAULT 'api',
  description TEXT,
  category VARCHAR(100),
  versions JSONB DEFAULT '{}',
  deprecated_in VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lint results
CREATE TABLE IF NOT EXISTS sn_lint_results (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  script TEXT,
  script_type VARCHAR(50),
  issues JSONB,
  score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Password resets
CREATE TABLE IF NOT EXISTS sn_password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Login attempts (rate limiting)
CREATE TABLE IF NOT EXISTS sn_login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  ip VARCHAR(45),
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Health snapshots (system monitoring)
CREATE TABLE IF NOT EXISTS sn_health_snapshots (
  id SERIAL PRIMARY KEY,
  db_ok BOOLEAN DEFAULT true,
  redis_ok BOOLEAN DEFAULT true,
  n8n_ok BOOLEAN DEFAULT true,
  response_time_ms INT,
  error_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Request traces (API performance)
CREATE TABLE IF NOT EXISTS sn_request_traces (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500),
  method VARCHAR(10),
  status_code INT,
  duration_ms INT,
  user_id INT,
  ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook events
CREATE TABLE IF NOT EXISTS sn_webhook_events (
  id SERIAL PRIMARY KEY,
  webhook_id INT REFERENCES sn_webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100),
  payload JSONB,
  status VARCHAR(50) DEFAULT 'sent',
  response_code INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Revenue events
CREATE TABLE IF NOT EXISTS sn_revenue_events (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  event_type VARCHAR(50),
  amount INT DEFAULT 0,
  plan VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Promo code uses
CREATE TABLE IF NOT EXISTS sn_promo_uses (
  id SERIAL PRIMARY KEY,
  promo_id INT REFERENCES sn_promo_codes(id) ON DELETE CASCADE,
  user_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin notifications
CREATE TABLE IF NOT EXISTS sn_admin_notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Backup logs
CREATE TABLE IF NOT EXISTS sn_backup_logs (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(500),
  size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'success',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to sn_saved_queries
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS conditions JSONB;
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS order_by VARCHAR(200);
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS order_dir VARCHAR(10) DEFAULT 'ASC';
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS limit_rows INT DEFAULT 10;
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS table_name VARCHAR(200);
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS script TEXT;
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS encoded_query TEXT;
ALTER TABLE sn_saved_queries ADD COLUMN IF NOT EXISTS use_count INT DEFAULT 0;

-- Seed ServiceNow tables for Query Builder
INSERT INTO sn_table_reference (table_name, label, category, fields, state_values) VALUES
('incident', 'Incident', 'ITSM', '["number","short_description","description","state","priority","urgency","impact","category","subcategory","assigned_to","assignment_group","caller_id","opened_by","opened_at","resolved_at","closed_at","sys_created_on","sys_updated_on"]', '{"1":"New","2":"In Progress","3":"On Hold","6":"Resolved","7":"Closed","8":"Cancelled"}'),
('change_request', 'Change Request', 'ITSM', '["number","short_description","description","state","type","priority","risk","impact","assignment_group","assigned_to","start_date","end_date","sys_created_on"]', '{"1":"New","2":"Assess","3":"Authorize","4":"Scheduled","5":"Implement","6":"Review","7":"Closed","8":"Cancelled"}'),
('problem', 'Problem', 'ITSM', '["number","short_description","description","state","priority","urgency","impact","assigned_to","assignment_group","known_error","workaround"]', '{"1":"New","2":"Assess","3":"Root Cause Analysis","4":"Fix in Progress","5":"Resolved","6":"Closed"}'),
('sc_request', 'Service Request', 'Catalog', '["number","short_description","description","state","priority","requested_for","opened_by","assignment_group","stage"]', '{"1":"Pending Approval","2":"Approved","3":"Closed Complete","4":"Closed Incomplete"}'),
('sys_user', 'User', 'Platform', '["user_name","first_name","last_name","email","active","department","company","manager","title","phone","mobile_phone","vip"]', '{}'),
('cmdb_ci', 'Configuration Item', 'CMDB', '["name","sys_class_name","category","subcategory","operational_status","assigned_to","support_group","install_status","manufacturer","model_id"]', '{"1":"Operational","2":"Non-Operational","3":"Repair in Progress","4":"DR Standby"}'),
('kb_knowledge', 'Knowledge Article', 'Knowledge', '["number","short_description","text","kb_category","workflow_state","author","published","sys_created_on"]', '{}'),
('sys_user_group', 'Group', 'Platform', '["name","description","email","manager","type","active"]', '{}'),
('task', 'Task', 'Platform', '["number","short_description","description","state","priority","assigned_to","assignment_group","sys_created_on"]', '{}'),
('sc_cat_item', 'Catalog Item', 'Catalog', '["name","short_description","description","category","active","price","recurring_price"]', '{}')
ON CONFLICT (table_name) DO NOTHING;

-- Seed Version Matrix data
INSERT INTO sn_version_matrix (feature_name, feature_type, description, category, versions) VALUES
('GlideRecord', 'api', 'Server-side database query API', 'Data Access', '{"New York":"Full","Orlando":"Full","Paris":"Full","Quebec":"Full","Rome":"Full","San Diego":"Full","Tokyo":"Full","Utah":"Full","Vancouver":"Full","Washington":"Full","Xanadu":"Full","Yokohama":"Full"}'),
('GlideAggregate', 'api', 'Aggregation queries (COUNT, SUM, AVG)', 'Data Access', '{"New York":"Full","Orlando":"Full","Paris":"Full","Quebec":"Full","Rome":"Full","San Diego":"Full","Tokyo":"Full","Utah":"Full","Vancouver":"Full","Washington":"Full","Xanadu":"Full","Yokohama":"Full"}'),
('Flow Designer', 'feature', 'Visual workflow builder', 'Automation', '{"New York":"Beta","Orlando":"GA","Paris":"GA","Quebec":"GA","Rome":"Enhanced","San Diego":"Enhanced","Tokyo":"Enhanced","Utah":"Enhanced","Vancouver":"Enhanced","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('Integration Hub', 'feature', 'Spoke-based integrations', 'Integration', '{"Orlando":"Beta","Paris":"GA","Quebec":"GA","Rome":"GA","San Diego":"GA","Tokyo":"GA","Utah":"Enhanced","Vancouver":"Enhanced","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('Next Experience', 'feature', 'Polaris UI framework', 'UI', '{"San Diego":"Beta","Tokyo":"GA","Utah":"GA","Vancouver":"Enhanced","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('Virtual Agent', 'feature', 'AI-powered chatbot', 'AI', '{"Quebec":"Beta","Rome":"GA","San Diego":"GA","Tokyo":"Enhanced","Utah":"Enhanced","Vancouver":"Enhanced","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('Predictive Intelligence', 'feature', 'ML-based predictions', 'AI', '{"Orlando":"Beta","Paris":"GA","Quebec":"GA","Rome":"Enhanced","San Diego":"Enhanced","Tokyo":"Enhanced","Utah":"Enhanced","Vancouver":"Enhanced","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('ATF (Automated Testing)', 'feature', 'Automated test framework', 'DevOps', '{"New York":"GA","Orlando":"GA","Paris":"GA","Quebec":"Enhanced","Rome":"Enhanced","San Diego":"Enhanced","Tokyo":"Enhanced","Utah":"Enhanced","Vancouver":"Enhanced","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('App Engine Studio', 'feature', 'Low-code app builder', 'Development', '{"Tokyo":"Beta","Utah":"GA","Vancouver":"GA","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('REST API', 'api', 'RESTful web services', 'Integration', '{"New York":"Full","Orlando":"Full","Paris":"Full","Quebec":"Full","Rome":"Full","San Diego":"Full","Tokyo":"Full","Utah":"Full","Vancouver":"Full","Washington":"Full","Xanadu":"Full","Yokohama":"Full"}'),
('GraphQL API', 'api', 'GraphQL query support', 'Integration', '{"San Diego":"Beta","Tokyo":"GA","Utah":"GA","Vancouver":"GA","Washington":"GA","Xanadu":"GA","Yokohama":"GA"}'),
('Workspace', 'feature', 'Configurable workspaces', 'UI', '{"Utah":"Beta","Vancouver":"GA","Washington":"GA","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('CMDB Health', 'feature', 'CMDB data quality dashboard', 'CMDB', '{"Rome":"Beta","San Diego":"GA","Tokyo":"GA","Utah":"Enhanced","Vancouver":"Enhanced","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}'),
('Service Graph Connector', 'plugin', 'Discovery integrations', 'CMDB', '{"Tokyo":"Beta","Utah":"GA","Vancouver":"GA","Washington":"Enhanced","Xanadu":"Enhanced","Yokohama":"Enhanced"}')
ON CONFLICT DO NOTHING;



-- ══════════════════════════════════════
-- Final missing tables
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS sn_admin_notes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  note TEXT,
  created_by VARCHAR(200) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_api_exec_logs (
  id SERIAL PRIMARY KEY,
  connector_id INT,
  endpoint_id INT,
  method VARCHAR(10),
  url VARCHAR(500),
  status_code INT,
  response_time_ms INT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_email_queue (
  id SERIAL PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_referral_uses (
  id SERIAL PRIMARY KEY,
  referral_code VARCHAR(50),
  referrer_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  referred_id INT REFERENCES sn_users(id) ON DELETE SET NULL,
  reward_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_search_cache (
  id SERIAL PRIMARY KEY,
  query_hash VARCHAR(64) UNIQUE,
  query_text TEXT,
  results JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_team_invites (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES sn_teams(id) ON DELETE CASCADE,
  email VARCHAR(255),
  token VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'member',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_user_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES sn_users(id) ON DELETE CASCADE,
  spoke_slug VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, spoke_slug)
);

CREATE TABLE IF NOT EXISTS sn_version (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50),
  description TEXT,
  release_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;
