-- snspokes v5 schema additions
-- Run after database_admin.sql

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

CREATE TABLE IF NOT EXISTS sn_ai_metrics (
  id          SERIAL PRIMARY KEY,
  model       TEXT,
  query       TEXT,
  latency_ms  INTEGER,
  cached      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Make sure sn_spokes has all needed columns
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS official_description TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS personal_tip TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS ai_description TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS min_version TEXT DEFAULT 'Rome';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS code_example TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Make sure tags column is array type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='sn_spokes' AND column_name='tags'
    AND data_type='ARRAY'
  ) THEN
    ALTER TABLE sn_spokes ALTER COLUMN tags TYPE TEXT[] USING ARRAY[tags::TEXT];
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT 'v5 schema ready!' as status;
