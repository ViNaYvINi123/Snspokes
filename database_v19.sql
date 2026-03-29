-- ============================================================
-- snspokes v19 — New tables for v26 admin features
-- Run after database_v18.sql
-- ============================================================

-- Admin notes on users (impersonation system)
CREATE TABLE IF NOT EXISTS sn_admin_notes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES sn_users(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_by  VARCHAR(100) DEFAULT 'admin',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user ON sn_admin_notes(user_id);

-- Promo codes
CREATE TABLE IF NOT EXISTS sn_promo_codes (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(50) UNIQUE NOT NULL,
  type         VARCHAR(50) NOT NULL, -- free_months | plan_upgrade | percentage
  value        DECIMAL(10,2) NOT NULL,
  max_uses     INTEGER,
  plan_override VARCHAR(50),
  active       BOOLEAN DEFAULT true,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON sn_promo_codes(code);

-- Promo uses tracking
CREATE TABLE IF NOT EXISTS sn_promo_uses (
  id         SERIAL PRIMARY KEY,
  promo_id   INTEGER REFERENCES sn_promo_codes(id),
  user_id    INTEGER REFERENCES sn_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_id, user_id)
);

-- IP blocks
CREATE TABLE IF NOT EXISTS sn_ip_blocks (
  id          SERIAL PRIMARY KEY,
  ip_address  VARCHAR(50) UNIQUE NOT NULL,
  reason      TEXT,
  active      BOOLEAN DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ip_blocks_ip ON sn_ip_blocks(ip_address, active);

-- Audit logs
CREATE TABLE IF NOT EXISTS sn_audit_logs (
  id          SERIAL PRIMARY KEY,
  admin       VARCHAR(100) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id   VARCHAR(255),
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON sn_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON sn_audit_logs(created_at DESC);

-- Revenue events (churn tracking)
CREATE TABLE IF NOT EXISTS sn_revenue_events (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES sn_users(id),
  event_type VARCHAR(50) NOT NULL, -- churn | upgrade | downgrade | refund
  details    JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON sn_revenue_events(event_type, created_at DESC);

-- Add missing columns to existing tables
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS is_featured   BOOLEAN DEFAULT false;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS pin_order     INTEGER DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS status        VARCHAR(50) DEFAULT 'published';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS seo_title     VARCHAR(255);
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS seo_description TEXT;

ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS payment_id  VARCHAR(255);
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Index for featured/pinned spokes
CREATE INDEX IF NOT EXISTS idx_spokes_featured ON sn_spokes(is_featured, pin_order);
CREATE INDEX IF NOT EXISTS idx_spokes_status   ON sn_spokes(status);

-- Spoke ratings table (if not exists from earlier)
CREATE TABLE IF NOT EXISTS sn_spoke_ratings (
  id         SERIAL PRIMARY KEY,
  spoke_slug VARCHAR(255) NOT NULL,
  user_id    INTEGER REFERENCES sn_users(id),
  user_ip    VARCHAR(100),
  rating     INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spoke_slug, user_id)
);
CREATE INDEX IF NOT EXISTS idx_spoke_ratings_slug ON sn_spoke_ratings(spoke_slug);
