-- ══════════════════════════════════════════════════════════
-- v36 FIX — Add ALL missing columns that sync engine needs
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── sn_system_properties — needs "value" column ─────────
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ── sn_api_reference — needs ALL these columns ──────────
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS api_type TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS global_var TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS base_path TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS params TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS auth TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS code_example TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS gotcha TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS scoped_differences TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS best_practices TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS available_vars TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS types TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS roles_required TEXT;
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ── sn_users — auth columns ─────────────────────────────
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'credentials';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- ── sn_spokes — search/answer columns ───────────────────
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS official_description TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS setup_steps TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS actions TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS common_errors TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS personal_tip TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS avg_rating NUMERIC DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'professional';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- ── Seed plans (remove Enterprise, keep Free + Pro) ─────
DELETE FROM sn_plans WHERE slug = 'team';
INSERT INTO sn_plans (name, slug, price, currency, interval, search_limit, code_gen_limit, features, is_active)
VALUES ('Free', 'free', 0, 'INR', 'monthly', 50, 20, '["Search spokes","Code generator","Error finder","Cheatsheet","API reference"]', true)
ON CONFLICT (slug) DO UPDATE SET search_limit=50, code_gen_limit=20, features='["Search spokes","Code generator","Error finder","Cheatsheet","API reference"]';

INSERT INTO sn_plans (name, slug, price, currency, interval, search_limit, code_gen_limit, features, is_active)
VALUES ('Pro', 'pro', 499, 'INR', 'monthly', 2000, 500, '["Everything in Free","Unlimited search","Unlimited code gen","Priority AI","API access","Export","Priority support"]', true)
ON CONFLICT (slug) DO UPDATE SET search_limit=2000, code_gen_limit=500, features='["Everything in Free","Unlimited search","Unlimited code gen","Priority AI","API access","Export","Priority support"]';

-- ── Feature flags ───────────────────────────────────────
INSERT INTO sn_feature_flags (name, description, enabled) VALUES
  ('chatbot', 'Show chatbot widget', true),
  ('code_generator', 'AI code generator', true),
  ('error_finder', 'AI error finder', true),
  ('search_ai', 'AI search answers', true),
  ('announcements', 'Show banners', true),
  ('command_palette', 'Enable ⌘K', true)
ON CONFLICT (name) DO NOTHING;

SELECT 'v36 fix complete — all columns added' AS status;
