-- snspokes v14 migrations

-- Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_spokes_name_trgm ON sn_spokes USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spokes_desc_trgm ON sn_spokes USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spokes_search_ts ON sn_spokes USING gin(to_tsvector('english', COALESCE(name,'') || ' ' || COALESCE(description,'')));

-- User onboarding fields
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS sn_version VARCHAR(50);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '[]';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS churn_email_sent TIMESTAMPTZ;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- Referral system
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

-- Spoke submissions (community)
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
  status           VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  reviewer_notes   TEXT,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_code ON sn_referrals(code);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred ON sn_referral_uses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_spoke_submissions_status ON sn_spoke_submissions(status);
CREATE INDEX IF NOT EXISTS idx_users_provider ON sn_users(provider, provider_id);

COMMENT ON TABLE sn_referrals IS 'Referral codes per user';
COMMENT ON TABLE sn_spoke_submissions IS 'Community-submitted spokes pending review';
