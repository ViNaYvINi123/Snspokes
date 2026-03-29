-- snspokes v13 migrations

-- Password reset tokens
CREATE TABLE IF NOT EXISTS sn_password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON sn_password_resets(token);

-- Razorpay subscriptions (extend existing payments table)
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'razorpay';
ALTER TABLE sn_payments ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

-- User plan field
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- User bookmarks (if not exists)
CREATE TABLE IF NOT EXISTS sn_user_bookmarks (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  spoke_slug VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spoke_slug)
);

-- Backup logs
CREATE TABLE IF NOT EXISTS sn_backup_logs (
  id          SERIAL PRIMARY KEY,
  status      VARCHAR(20) NOT NULL, -- success, failed
  backup_date VARCHAR(50),
  size_bytes  BIGINT,
  duration_s  INTEGER,
  remote_path TEXT,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_plan ON sn_users(plan);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON sn_payments(subscription_id);

COMMENT ON TABLE sn_backup_logs IS 'Track every automated backup run';
COMMENT ON TABLE sn_password_resets IS 'Password reset token table';
COMMENT ON COLUMN sn_users.plan IS 'free | pro | enterprise';
