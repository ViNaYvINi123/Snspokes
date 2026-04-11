-- v17: Add sync infrastructure
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'professional';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';
ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Track sync runs
CREATE TABLE IF NOT EXISTS sn_sync_log (
  id          SERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  spokes_added    INTEGER DEFAULT 0,
  spokes_updated  INTEGER DEFAULT 0,
  props_added     INTEGER DEFAULT 0,
  props_updated   INTEGER DEFAULT 0,
  duration_ms     INTEGER,
  errors      JSONB DEFAULT '[]',
  created_at  TIMESTAMP DEFAULT NOW()
);
