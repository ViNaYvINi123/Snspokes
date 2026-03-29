-- ============================================
-- snspokes v11 — Complete Platform Upgrade
-- ============================================

-- ── Admin Notifications ──
CREATE TABLE IF NOT EXISTS sn_admin_notifications (
  id           SERIAL PRIMARY KEY,
  type         TEXT NOT NULL, -- info | warning | error | success
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  source       TEXT,          -- system | user | payment | error | ai
  link         TEXT,
  read         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_read ON sn_admin_notifications(read, created_at DESC);

-- ── Announcements (user-facing banners) ──
CREATE TABLE IF NOT EXISTS sn_announcements (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  type         TEXT DEFAULT 'info', -- info | warning | success | promo
  target       TEXT DEFAULT 'all',  -- all | free | pro | team
  cta_text     TEXT,
  cta_url      TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  starts_at    TIMESTAMP DEFAULT NOW(),
  ends_at      TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ── A/B Tests ──
CREATE TABLE IF NOT EXISTS sn_ab_tests (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  key          TEXT UNIQUE NOT NULL,
  variant_a    JSONB NOT NULL,  -- {name, description, config}
  variant_b    JSONB NOT NULL,
  split_pct    INTEGER DEFAULT 50,
  status       TEXT DEFAULT 'draft', -- draft | running | paused | completed
  winner       TEXT,           -- a | b | null
  started_at   TIMESTAMP,
  ended_at     TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_ab_impressions (
  id           SERIAL PRIMARY KEY,
  test_id      INTEGER REFERENCES sn_ab_tests(id) ON DELETE CASCADE,
  variant      TEXT NOT NULL,  -- a | b
  user_id      INTEGER,
  user_ip      TEXT,
  converted    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ab_test ON sn_ab_impressions(test_id, variant);

-- ── AI Code Generator History ──
CREATE TABLE IF NOT EXISTS sn_code_generations (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES sn_users(id) ON DELETE SET NULL,
  code_type    TEXT NOT NULL,  -- business_rule | script_include | client_script | scheduled_job | rest_api
  prompt       TEXT NOT NULL,
  generated    TEXT NOT NULL,
  model        TEXT,
  rating       SMALLINT,       -- 1-5 user rating
  copied       BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_codegen_user ON sn_code_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_codegen_type ON sn_code_generations(code_type);

-- ── Script Lint Results ──
CREATE TABLE IF NOT EXISTS sn_lint_results (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES sn_users(id) ON DELETE SET NULL,
  script       TEXT NOT NULL,
  script_type  TEXT,
  issues       JSONB DEFAULT '[]',
  score        INTEGER DEFAULT 0,
  ai_review    TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ── Personal Dashboard ──
CREATE TABLE IF NOT EXISTS sn_user_bookmarks (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES sn_users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,  -- spoke | query | snippet | error
  ref_id       TEXT NOT NULL,
  title        TEXT,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, type, ref_id)
);

CREATE TABLE IF NOT EXISTS sn_user_snippets (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES sn_users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  code         TEXT NOT NULL,
  language     TEXT DEFAULT 'javascript',
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ── Revenue Tracking ──
CREATE TABLE IF NOT EXISTS sn_revenue_events (
  id           SERIAL PRIMARY KEY,
  event_type   TEXT NOT NULL,  -- subscription | upgrade | downgrade | churn | payment_failed
  user_id      INTEGER REFERENCES sn_users(id) ON DELETE SET NULL,
  from_plan    TEXT,
  to_plan      TEXT,
  amount       DECIMAL(10,2) DEFAULT 0,
  currency     TEXT DEFAULT 'INR',
  payment_id   TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revenue_type ON sn_revenue_events(event_type, created_at DESC);

-- ── System Health Timeline ──
CREATE TABLE IF NOT EXISTS sn_health_snapshots (
  id           SERIAL PRIMARY KEY,
  db_latency   INTEGER,
  redis_hit_rate DECIMAL(5,2),
  error_rate   DECIMAL(5,2),
  avg_response INTEGER,
  active_users INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_created ON sn_health_snapshots(created_at DESC);

-- ── Multi-Admin Roles ──
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS admin_role TEXT; -- null=user | viewer | editor | admin | superadmin
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS churn_risk TEXT DEFAULT 'low'; -- low | medium | high

-- ── User Lifecycle ──
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS first_search_at TIMESTAMP;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS pro_trial_ends TIMESTAMP;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- ── Content Quality ──
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS content_flags TEXT[] DEFAULT '{}';

-- Health snapshot cron (every 15 min via app)
CREATE OR REPLACE FUNCTION record_health_snapshot(
  p_db_latency INTEGER,
  p_redis_hit_rate DECIMAL,
  p_error_rate DECIMAL,
  p_avg_response INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO sn_health_snapshots (db_latency, redis_hit_rate, error_rate, avg_response, created_at)
  VALUES (p_db_latency, p_redis_hit_rate, p_error_rate, p_avg_response, NOW());
  -- Keep only 30 days
  DELETE FROM sn_health_snapshots WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Seed default announcement
INSERT INTO sn_announcements (title, message, type, target, cta_text, cta_url, is_active)
VALUES ('🚀 Welcome to snspokes!', 'The most powerful free ServiceNow developer toolkit. Try the new GlideRecord Query Builder and Error Finder.', 'info', 'all', 'Explore Tools', '/tools/query-builder', true)
ON CONFLICT DO NOTHING;

SELECT 'v11 schema ready!' as status;
