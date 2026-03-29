-- ============================================
-- snspokes v7 — Universal Admin Control Panel
-- ============================================

-- Feature Flags
CREATE TABLE IF NOT EXISTS sn_feature_flags (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  enabled     BOOLEAN DEFAULT FALSE,
  rollout_pct INTEGER DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  environment TEXT DEFAULT 'all',
  created_by  TEXT DEFAULT 'admin',
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Enhanced System Properties (add env_key column)
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS env_key TEXT;
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS is_env_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- API Request Logs
CREATE TABLE IF NOT EXISTS sn_api_logs (
  id           SERIAL PRIMARY KEY,
  method       TEXT NOT NULL,
  path         TEXT NOT NULL,
  status_code  INTEGER,
  duration_ms  INTEGER,
  user_id      INTEGER,
  user_ip      TEXT,
  request_body JSONB,
  error_msg    TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_path ON sn_api_logs(path);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON sn_api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON sn_api_logs(created_at DESC);

-- Error Logs
CREATE TABLE IF NOT EXISTS sn_error_logs (
  id          SERIAL PRIMARY KEY,
  level       TEXT DEFAULT 'error',
  source      TEXT,
  message     TEXT NOT NULL,
  stack       TEXT,
  context     JSONB,
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_level ON sn_error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON sn_error_logs(created_at DESC);

-- Audit Logs (who did what when)
CREATE TABLE IF NOT EXISTS sn_audit_logs (
  id          SERIAL PRIMARY KEY,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON sn_audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON sn_audit_logs(resource);

-- API Performance Stats
CREATE TABLE IF NOT EXISTS sn_api_stats (
  id           SERIAL PRIMARY KEY,
  path         TEXT NOT NULL,
  method       TEXT NOT NULL,
  avg_ms       DECIMAL(10,2),
  min_ms       INTEGER,
  max_ms       INTEGER,
  total_calls  INTEGER DEFAULT 0,
  error_count  INTEGER DEFAULT 0,
  last_called  TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_stats_path ON sn_api_stats(path, method);

-- Seed feature flags
INSERT INTO sn_feature_flags (key, label, description, enabled, environment) VALUES
('ai_search', 'AI Search', 'Enable AI-powered search with OpenRouter', true, 'all'),
('streaming', 'SSE Streaming', 'Enable streaming AI responses', true, 'all'),
('google_login', 'Google Login', 'Allow Google OAuth sign-in', false, 'all'),
('razorpay_payments', 'Razorpay Payments', 'Enable payment processing', false, 'all'),
('chatbot', 'AI Chatbot', 'Show chatbot widget on all pages', true, 'all'),
('maintenance_mode', 'Maintenance Mode', 'Show maintenance page to all users', false, 'all'),
('beta_features', 'Beta Features', 'Enable experimental features for beta users', false, 'beta'),
('search_cache', 'Search Caching', 'Cache search results in Redis/memory', true, 'all')
ON CONFLICT (key) DO NOTHING;

SELECT 'v7 schema ready!' as status;
