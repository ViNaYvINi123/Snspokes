-- ============================================================
-- snspokes v18 — Additional tables + fixes
-- Run after database_v17.sql
-- ============================================================

-- Email queue table (used by cron.js)
CREATE TABLE IF NOT EXISTS sn_email_queue (
  id          SERIAL PRIMARY KEY,
  to_email    VARCHAR(255) NOT NULL,
  subject     VARCHAR(500) NOT NULL,
  body_html   TEXT NOT NULL,
  status      VARCHAR(50) DEFAULT 'pending',
  attempts    INTEGER DEFAULT 0,
  error_msg   TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON sn_email_queue(status, attempts);

-- API execution logs
CREATE TABLE IF NOT EXISTS sn_api_exec_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES sn_users(id),
  endpoint    VARCHAR(255),
  method      VARCHAR(10),
  status_code INTEGER,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_exec_created ON sn_api_exec_logs(created_at DESC);

-- Search cache table
CREATE TABLE IF NOT EXISTS sn_search_cache (
  key         VARCHAR(255) PRIMARY KEY,
  value       TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Login attempts (for rate limiting reference)
CREATE TABLE IF NOT EXISTS sn_login_attempts (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255),
  ip_address VARCHAR(100),
  success    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON sn_login_attempts(ip_address, created_at DESC);

-- Request traces
CREATE TABLE IF NOT EXISTS sn_request_traces (
  id          SERIAL PRIMARY KEY,
  trace_id    VARCHAR(100),
  method      VARCHAR(10),
  path        VARCHAR(500),
  status_code INTEGER,
  duration_ms INTEGER,
  user_id     INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- User bookmarks (if not exists)
CREATE TABLE IF NOT EXISTS sn_user_bookmarks (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES sn_users(id) ON DELETE CASCADE,
  spoke_slug  VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spoke_slug)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON sn_user_bookmarks(user_id);

-- Code generations (if not exists)
CREATE TABLE IF NOT EXISTS sn_code_generations (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES sn_users(id),
  code_type   VARCHAR(100),
  prompt      TEXT,
  generated   TEXT,
  model       VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_code_gens_user ON sn_code_generations(user_id, created_at DESC);

-- Error encyclopedia (if not exists)
CREATE TABLE IF NOT EXISTS sn_error_encyclopedia (
  id            SERIAL PRIMARY KEY,
  error_pattern VARCHAR(500),
  title         VARCHAR(500),
  description   TEXT,
  root_cause    TEXT,
  fix_steps     JSONB DEFAULT '[]',
  category      VARCHAR(100),
  severity      VARCHAR(50),
  verified      BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Referral uses (if not exists)
CREATE TABLE IF NOT EXISTS sn_referral_uses (
  id               SERIAL PRIMARY KEY,
  referral_id      INTEGER,
  referred_user_id INTEGER REFERENCES sn_users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referral_id, referred_user_id)
);

-- Ban reason column (if not exists)
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS api_calls_today INTEGER DEFAULT 0;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS api_calls_reset TIMESTAMPTZ;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS use_case TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS sn_version VARCHAR(100);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS role VARCHAR(100);

-- Payments table (if not exists from earlier migrations)
CREATE TABLE IF NOT EXISTS sn_payments (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES sn_users(id),
  subscription_id  VARCHAR(255),
  payment_id       VARCHAR(255),
  plan             VARCHAR(50) NOT NULL,
  amount           DECIMAL(10,2) NOT NULL,
  currency         VARCHAR(10) DEFAULT 'INR',
  status           VARCHAR(50) DEFAULT 'pending',
  provider         VARCHAR(50) DEFAULT 'razorpay',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user_id   ON sn_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON sn_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created   ON sn_payments(created_at DESC);
