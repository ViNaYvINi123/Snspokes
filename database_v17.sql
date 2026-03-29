-- ============================================================
-- snspokes v17 — Performance Indexes + Missing Tables
-- Run after database_v16.sql
-- ============================================================

-- ── Performance indexes for common queries ─────────────────
CREATE INDEX IF NOT EXISTS idx_users_email         ON sn_users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan          ON sn_users(plan);
CREATE INDEX IF NOT EXISTS idx_users_active        ON sn_users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at    ON sn_users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spokes_slug         ON sn_spokes(slug);
CREATE INDEX IF NOT EXISTS idx_spokes_category     ON sn_spokes(category);
CREATE INDEX IF NOT EXISTS idx_spokes_active       ON sn_spokes(is_active);
CREATE INDEX IF NOT EXISTS idx_spokes_view_count   ON sn_spokes(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_spokes_name_gin     ON sn_spokes USING gin(to_tsvector('english', name || ' ' || COALESCE(description,'')));

CREATE INDEX IF NOT EXISTS idx_payments_user_id    ON sn_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON sn_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON sn_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_searches_created_at ON sn_search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_searches_query      ON sn_search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_searches_user_id    ON sn_search_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_errors_resolved     ON sn_error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_errors_created_at   ON sn_error_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_status  ON sn_spoke_submissions(status);
CREATE INDEX IF NOT EXISTS idx_code_gens_user_id   ON sn_code_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id   ON sn_user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_queries_user  ON sn_saved_queries(user_id);

-- ── Missing tables (safety net) ────────────────────────────
CREATE TABLE IF NOT EXISTS sn_admin_notifications (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  type        VARCHAR(50) DEFAULT 'info',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_feature_flags (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  enabled     BOOLEAN DEFAULT true,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_webhook_configs (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  url        TEXT NOT NULL,
  events     JSONB DEFAULT '[]',
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_health_snapshots (
  id                  SERIAL PRIMARY KEY,
  active_users        INTEGER DEFAULT 0,
  searches_last_hour  INTEGER DEFAULT 0,
  errors_last_hour    INTEGER DEFAULT 0,
  db_connections      INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_backup_logs (
  id          SERIAL PRIMARY KEY,
  status      VARCHAR(50) DEFAULT 'pending',
  file_size   VARCHAR(50),
  backup_date DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Insert default feature flags ───────────────────────────
INSERT INTO sn_feature_flags (name, enabled, description) VALUES
  ('ai_code_generator',     true,  'Enable AI code generator'),
  ('script_linter',         true,  'Enable script linter'),
  ('community_submissions', true,  'Allow community spoke submissions'),
  ('referral_system',       true,  'Enable referral rewards'),
  ('team_features',         false, 'Enable team features')
ON CONFLICT (name) DO NOTHING;

-- ── pg_trgm for fuzzy search (already in v5 but safety) ────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
