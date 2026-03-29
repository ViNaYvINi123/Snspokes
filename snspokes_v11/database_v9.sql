-- ============================================
-- snspokes v9 — Production-Grade Upgrades
-- ============================================

-- Enable fuzzy search extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Fuzzy search indexes on spokes
CREATE INDEX IF NOT EXISTS idx_spokes_trgm_name ON sn_spokes USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spokes_trgm_desc ON sn_spokes USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spokes_trgm_tags ON sn_spokes USING gin(CAST(tags AS text) gin_trgm_ops);

-- Fuzzy search on users
CREATE INDEX IF NOT EXISTS idx_users_trgm_name ON sn_users USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_trgm_email ON sn_users USING gin(email gin_trgm_ops);

-- Spoke versions (history/rollback)
CREATE TABLE IF NOT EXISTS sn_spoke_versions (
  id           SERIAL PRIMARY KEY,
  spoke_id     INTEGER NOT NULL REFERENCES sn_spokes(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL DEFAULT 1,
  data         JSONB NOT NULL,
  changed_by   TEXT DEFAULT 'system',
  change_note  TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spoke_versions_spoke ON sn_spoke_versions(spoke_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_spoke_versions_uniq ON sn_spoke_versions(spoke_id, version);

-- Spoke ratings
CREATE TABLE IF NOT EXISTS sn_spoke_ratings (
  id           SERIAL PRIMARY KEY,
  spoke_id     INTEGER NOT NULL REFERENCES sn_spokes(id) ON DELETE CASCADE,
  user_id      INTEGER REFERENCES sn_users(id) ON DELETE SET NULL,
  user_ip      TEXT,
  rating       SMALLINT NOT NULL CHECK (rating IN (1, -1)), -- 1=up, -1=down
  comment      TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(spoke_id, user_ip)
);
CREATE INDEX IF NOT EXISTS idx_ratings_spoke ON sn_spoke_ratings(spoke_id);

-- User API Keys
CREATE TABLE IF NOT EXISTS sn_api_keys (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES sn_users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  key_prefix   TEXT NOT NULL,
  last_used    TIMESTAMP,
  usage_count  INTEGER DEFAULT 0,
  rate_limit   INTEGER DEFAULT 100,
  is_active    BOOLEAN DEFAULT TRUE,
  expires_at   TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON sn_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON sn_api_keys(key_hash);

-- Login attempts (brute force protection)
CREATE TABLE IF NOT EXISTS sn_login_attempts (
  id           SERIAL PRIMARY KEY,
  identifier   TEXT NOT NULL,
  success      BOOLEAN DEFAULT FALSE,
  ip_address   TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_id ON sn_login_attempts(identifier, created_at DESC);

-- Request traces
CREATE TABLE IF NOT EXISTS sn_request_traces (
  id           SERIAL PRIMARY KEY,
  request_id   TEXT NOT NULL,
  method       TEXT,
  path         TEXT,
  status_code  INTEGER,
  duration_ms  INTEGER,
  user_id      INTEGER,
  user_ip      TEXT,
  error        TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_traces_request_id ON sn_request_traces(request_id);
CREATE INDEX IF NOT EXISTS idx_traces_created ON sn_request_traces(created_at DESC);

-- Email queue
CREATE TABLE IF NOT EXISTS sn_email_queue (
  id           SERIAL PRIMARY KEY,
  to_email     TEXT NOT NULL,
  subject      TEXT NOT NULL,
  body_html    TEXT NOT NULL,
  body_text    TEXT,
  status       TEXT DEFAULT 'pending',
  attempts     INTEGER DEFAULT 0,
  error_msg    TEXT,
  sent_at      TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON sn_email_queue(status, created_at);

-- Plan limits (actual enforcement)
INSERT INTO sn_plans (name, price, search_limit, spokes_limit, api_access, features) VALUES
('free',  0,    50,   10, false, '["basic_search","chatbot"]'),
('pro',   999,  500,  50, true,  '["ai_search","streaming","api_keys","export"]'),
('team',  2999, 5000, 999, true, '["everything","priority_support","custom_integrations"]')
ON CONFLICT (name) DO UPDATE SET
  search_limit = EXCLUDED.search_limit,
  spokes_limit = EXCLUDED.spokes_limit,
  api_access   = EXCLUDED.api_access,
  features     = EXCLUDED.features;

-- Add avg_rating to spokes
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add last_login to users
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS api_calls_today INTEGER DEFAULT 0;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS api_calls_reset TIMESTAMP DEFAULT NOW();

SELECT 'v9 schema ready! pg_trgm enabled, spoke versions, ratings, API keys.' as status;
