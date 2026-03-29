-- ============================================================
-- snspokes v12 — Missing migration (gap filler)
-- This file exists to maintain migration sequence continuity
-- Run after database_v11.sql
-- ============================================================

-- Performance improvements and missing columns from v11
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS plugin_id       VARCHAR(255);
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS credential_type VARCHAR(100);
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS min_version     VARCHAR(50);
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS view_count      INTEGER DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS rating_avg      DECIMAL(3,2) DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS rating_count    INTEGER DEFAULT 0;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT true;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS is_verified     BOOLEAN DEFAULT false;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tags            JSONB DEFAULT '[]';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS setup_steps     JSONB DEFAULT '[]';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS common_errors   JSONB DEFAULT '[]';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS actions         JSONB DEFAULT '[]';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS related_spokes  JSONB DEFAULT '[]';
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS code_example    TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS ai_description  TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS personal_tip    TEXT;
ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- Index for view count ranking
CREATE INDEX IF NOT EXISTS idx_spokes_view_count ON sn_spokes(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_spokes_active     ON sn_spokes(is_active);
