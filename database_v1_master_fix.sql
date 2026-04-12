-- ══════════════════════════════════════════════════════════
-- snspokes v1.0.0 MASTER FIX
-- Adds ALL columns that code references but DB doesn't have
-- 100% safe — IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── sn_search_analytics — code uses: results, has_result, answer_source, latency_ms, user_ip
ALTER TABLE sn_search_analytics ADD COLUMN IF NOT EXISTS results INTEGER DEFAULT 0;
ALTER TABLE sn_search_analytics ADD COLUMN IF NOT EXISTS has_result BOOLEAN DEFAULT false;
ALTER TABLE sn_search_analytics ADD COLUMN IF NOT EXISTS answer_source TEXT;
ALTER TABLE sn_search_analytics ADD COLUMN IF NOT EXISTS latency_ms INTEGER;
ALTER TABLE sn_search_analytics ADD COLUMN IF NOT EXISTS user_ip TEXT;

-- ── sn_search_gaps — code uses: last_seen, but table has last_searched
ALTER TABLE sn_search_gaps ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW();
-- Add unique constraint on query if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sn_search_gaps_query_key') THEN
    ALTER TABLE sn_search_gaps ADD CONSTRAINT sn_search_gaps_query_key UNIQUE (query);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── sn_user_activity — code uses: session_id, event_type, query
ALTER TABLE sn_user_activity ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE sn_user_activity ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE sn_user_activity ADD COLUMN IF NOT EXISTS query TEXT;

-- ── sn_users — admin panel uses: ban_reason, search_count
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'credentials';
ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- ── sn_system_properties — sync uses: value
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ── sn_api_reference — sync uses ALL these
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
ALTER TABLE sn_api_reference ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- ── sn_spokes — search/answer uses all these
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

-- ── sn_spoke_submissions
ALTER TABLE sn_spoke_submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE sn_spoke_submissions ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- ── Plans — only Free + Pro
DELETE FROM sn_plans WHERE slug NOT IN ('free', 'pro');
INSERT INTO sn_plans (name, slug, price, currency, interval, search_limit, code_gen_limit, features, is_active)
VALUES ('Free', 'free', 0, 'INR', 'monthly', 50, 20, '["Search spokes","Code generator","Error finder","Cheatsheet","API reference"]', true)
ON CONFLICT (slug) DO UPDATE SET search_limit=50, code_gen_limit=20, features='["Search spokes","Code generator","Error finder","Cheatsheet","API reference"]';

INSERT INTO sn_plans (name, slug, price, currency, interval, search_limit, code_gen_limit, features, is_active)
VALUES ('Pro', 'pro', 499, 'INR', 'monthly', 2000, 500, '["Everything in Free","Unlimited search","Unlimited code gen","Priority AI","API access","Export","Priority support"]', true)
ON CONFLICT (slug) DO UPDATE SET search_limit=2000, code_gen_limit=500;

-- ── Feature flags
INSERT INTO sn_feature_flags (name, description, enabled) VALUES
  ('chatbot', 'Chatbot widget', true),
  ('code_generator', 'AI code gen', true),
  ('error_finder', 'AI error finder', true),
  ('search_ai', 'AI search', true),
  ('command_palette', '⌘K palette', true)
ON CONFLICT (name) DO NOTHING;

-- ── Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_spokes_slug ON sn_spokes(slug);
CREATE INDEX IF NOT EXISTS idx_spokes_category ON sn_spokes(category);
CREATE INDEX IF NOT EXISTS idx_spokes_name_trgm ON sn_spokes USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email ON sn_users(email);
CREATE INDEX IF NOT EXISTS idx_api_ref_slug ON sn_api_reference(slug);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON sn_search_analytics(created_at);

SELECT 'v1.0.0 master fix complete' AS status;
