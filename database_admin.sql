-- ============================================
-- snspokes v4 — Complete Admin Tables
-- ============================================

-- Update users table
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;

-- Plans
CREATE TABLE IF NOT EXISTS sn_plans (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency      TEXT DEFAULT 'INR',
  interval      TEXT DEFAULT 'monthly',
  features      JSONB DEFAULT '[]',
  search_limit  INTEGER DEFAULT 20,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS sn_subscriptions (
  id                        SERIAL PRIMARY KEY,
  user_id                   INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  plan_id                   INTEGER REFERENCES sn_plans(id),
  razorpay_order_id         TEXT,
  razorpay_payment_id       TEXT,
  razorpay_signature        TEXT,
  status                    TEXT DEFAULT 'pending',
  amount                    DECIMAL(10,2),
  currency                  TEXT DEFAULT 'INR',
  started_at                TIMESTAMP,
  expires_at                TIMESTAMP,
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW()
);

-- Search analytics
CREATE TABLE IF NOT EXISTS sn_search_analytics (
  id            SERIAL PRIMARY KEY,
  query         TEXT NOT NULL,
  user_id       INTEGER REFERENCES sn_users(id) ON DELETE SET NULL,
  results       INTEGER DEFAULT 0,
  spoke_clicked TEXT,
  user_ip       TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ServiceNow System Properties table
CREATE TABLE IF NOT EXISTS sn_system_properties (
  id            SERIAL PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  value         TEXT,
  default_value TEXT,
  type          TEXT DEFAULT 'string',
  category      TEXT DEFAULT 'general',
  description   TEXT,
  ai_description TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  source_url    TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Admin logs
CREATE TABLE IF NOT EXISTS sn_admin_logs (
  id          SERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON sn_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON sn_search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_query ON sn_search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_properties_name ON sn_system_properties(name);
CREATE INDEX IF NOT EXISTS idx_properties_category ON sn_system_properties(category);

-- Seed plans
INSERT INTO sn_plans (name, slug, price, currency, interval, search_limit, features) VALUES
('Free', 'free', 0, 'INR', 'forever', 20, '["20 searches/day","Basic spoke info","AI chatbot"]'),
('Pro', 'pro', 799, 'INR', 'monthly', -1, '["Unlimited searches","Full spoke details","Code examples","Priority support"]'),
('Team', 'team', 2499, 'INR', 'monthly', -1, '["5 users","Unlimited searches","API access","Slack integration","Priority support"]')
ON CONFLICT (slug) DO NOTHING;

-- Seed some sample system properties
INSERT INTO sn_system_properties (name, value, default_value, type, category, description) VALUES
('glide.ui.dark_mode', 'false', 'false', 'boolean', 'UI', 'Enables dark mode for the Next Experience UI'),
('glide.ui.polaris.enabled', 'false', 'false', 'boolean', 'UI', 'Enables the Next Experience (Polaris) UI'),
('glide.email.smtp.host', '', '', 'string', 'Email', 'SMTP server hostname for outbound email'),
('glide.email.sender', 'noreply@company.com', '', 'string', 'Email', 'Default sender email address'),
('glide.record.counts', 'true', 'true', 'boolean', 'Performance', 'Show record counts in list views'),
('glide.security.use_csrf_token', 'true', 'true', 'boolean', 'Security', 'Enable CSRF token validation'),
('glide.db.max_pool_size', '50', '50', 'integer', 'Database', 'Maximum database connection pool size'),
('glide.cache.size', '4000', '4000', 'integer', 'Performance', 'Application cache size in MB')
ON CONFLICT (name) DO NOTHING;

SELECT 'Admin tables created successfully!' as status;
