-- snspokes v6 -- Complete schema
-- Run once after all other SQL files

-- Ensure all columns exist on sn_spokes
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS official_description TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS personal_tip TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS ai_description TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS min_version TEXT DEFAULT 'Rome';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS code_example TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Ensure tags is array type
DO $$ BEGIN
  BEGIN
    ALTER TABLE sn_spokes ALTER COLUMN tags TYPE TEXT[] USING
      CASE WHEN tags IS NULL THEN ARRAY[]::TEXT[]
           WHEN tags::text = '[]' THEN ARRAY[]::TEXT[]
           ELSE ARRAY(SELECT json_array_elements_text(tags::json))
      END;
  EXCEPTION WHEN OTHERS THEN NULL;
END; END $$;

-- Ensure sn_system_properties has ai_description
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS ai_description TEXT DEFAULT '';

-- Search cache table
CREATE TABLE IF NOT EXISTS sn_search_cache (
  id          SERIAL PRIMARY KEY,
  query_hash  TEXT UNIQUE NOT NULL,
  query       TEXT NOT NULL,
  response    JSONB NOT NULL,
  model       TEXT,
  hit_count   INTEGER DEFAULT 1,
  created_at  TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_search_cache_hash ON sn_search_cache(query_hash);

-- Full text search index on spokes
CREATE INDEX IF NOT EXISTS idx_spokes_search ON sn_spokes USING gin(to_tsvector('english', name || ' ' || COALESCE(description,'') || ' ' || COALESCE(category,'')));

-- Index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_spokes_slug ON sn_spokes(slug);
CREATE INDEX IF NOT EXISTS idx_spokes_category ON sn_spokes(category);
CREATE INDEX IF NOT EXISTS idx_spokes_views ON sn_spokes(view_count DESC);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON sn_users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON sn_users(plan);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_created ON sn_search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_query ON sn_search_analytics(query);

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_props_name ON sn_system_properties(name);
CREATE INDEX IF NOT EXISTS idx_props_category ON sn_system_properties(category);

-- Auto cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_data() RETURNS void AS $$
BEGIN
  DELETE FROM sn_search_cache WHERE expires_at < NOW();
  DELETE FROM sn_admin_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

SELECT 'v6 schema ready! Indexes created.' as status;
