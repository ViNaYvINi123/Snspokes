-- snspokes v16 — Schema fixes & missing columns
-- Run after all previous migrations

-- ── sn_users missing columns ───────────────────────────────
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_banned     BOOLEAN DEFAULT FALSE;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS ban_reason    TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS plan          VARCHAR(20) DEFAULT 'free';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS onboarded     BOOLEAN DEFAULT FALSE;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS role          VARCHAR(50);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS sn_version    VARCHAR(50);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS goals         JSONB DEFAULT '[]';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider_id   VARCHAR(255);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS churn_email_sent TIMESTAMPTZ;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS search_count  INTEGER DEFAULT 0;

-- ── sn_spokes missing columns ──────────────────────────────
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS is_active    BOOLEAN DEFAULT TRUE;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS avg_rating   FLOAT DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS view_count   INTEGER DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tags         JSONB DEFAULT '[]';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS logo_url     TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS source       VARCHAR(50) DEFAULT 'official';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS setup_guide  TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS use_cases    TEXT;

-- ── sn_payments missing columns ───────────────────────────
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS payment_id      VARCHAR(255);
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS provider        VARCHAR(50) DEFAULT 'razorpay';
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS currency        VARCHAR(10) DEFAULT 'INR';

-- ── Referral system ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sn_referrals (
  id            SERIAL PRIMARY KEY,
  referrer_id   INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  code          VARCHAR(20) UNIQUE NOT NULL,
  months_earned INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_referral_uses (
  id               SERIAL PRIMARY KEY,
  referral_id      INTEGER REFERENCES sn_referrals(id) ON DELETE CASCADE,
  referred_user_id INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  converted        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referral_id, referred_user_id)
);

-- ── Spoke submissions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sn_spoke_submissions (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  plugin_id        VARCHAR(255) NOT NULL,
  description      TEXT,
  category         VARCHAR(100),
  credential_type  VARCHAR(100),
  min_version      VARCHAR(50),
  use_cases        TEXT,
  store_url        TEXT,
  submitter_notes  TEXT,
  submitted_by     VARCHAR(255),
  status           VARCHAR(20) DEFAULT 'pending',
  reviewer_notes   TEXT,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Password resets ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sn_password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Teams ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sn_teams (
  id         SERIAL PRIMARY KEY,
  owner_id   INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sn_team_members (
  id         SERIAL PRIMARY KEY,
  team_id    INTEGER REFERENCES sn_teams(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  role       VARCHAR(20) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS sn_team_invites (
  id         SERIAL PRIMARY KEY,
  team_id    INTEGER REFERENCES sn_teams(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  token      VARCHAR(255) UNIQUE NOT NULL,
  accepted   BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, email)
);

-- ── Bookmarks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sn_user_bookmarks (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  spoke_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spoke_slug)
);

-- ── Backup logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sn_backup_logs (
  id          SERIAL PRIMARY KEY,
  status      VARCHAR(20) NOT NULL,
  backup_date VARCHAR(50),
  size_bytes  BIGINT,
  duration_s  INTEGER,
  remote_path TEXT,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── pg_trgm for fuzzy search ───────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_similarity;

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_plan       ON sn_users(plan);
CREATE INDEX IF NOT EXISTS idx_users_banned     ON sn_users(is_banned);
CREATE INDEX IF NOT EXISTS idx_users_provider   ON sn_users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_sub     ON sn_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_spokes_active    ON sn_spokes(is_active);
CREATE INDEX IF NOT EXISTS idx_spokes_category  ON sn_spokes(category);
CREATE INDEX IF NOT EXISTS idx_spokes_trgm_name ON sn_spokes USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spokes_trgm_desc ON sn_spokes USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_referrals_code   ON sn_referrals(code);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON sn_spoke_submissions(status);
CREATE INDEX IF NOT EXISTS idx_pw_resets_token  ON sn_password_resets(token);

-- ── Verify all tables exist ────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'sn_users','sn_spokes','sn_payments','sn_search_analytics',
    'sn_system_properties','sn_audit_logs','sn_error_logs',
    'sn_referrals','sn_referral_uses','sn_spoke_submissions',
    'sn_password_resets','sn_teams','sn_team_members',
    'sn_user_bookmarks','sn_backup_logs','sn_api_keys',
    'sn_code_generations','sn_lint_results','sn_admin_notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name=tbl) THEN
      RAISE WARNING 'Missing table: %', tbl;
    ELSE
      RAISE NOTICE 'OK: %', tbl;
    END IF;
  END LOOP;
END $$;

-- Add tier column to sn_spokes for Integration Hub subscription tier
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'professional';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Add sync tracking to sn_system_properties
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
