-- v19: Retention + Personalization + Community tables

-- User activity tracking (anonymous + authenticated)
CREATE TABLE IF NOT EXISTS sn_user_activity (
  id           BIGSERIAL PRIMARY KEY,
  session_id   TEXT NOT NULL,
  user_id      INTEGER REFERENCES sn_users(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL,  -- search, view_spoke, view_api, save, share, copy_code
  entity_type  TEXT,           -- spoke, api, property
  entity_slug  TEXT,
  query        TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_session ON sn_user_activity(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user    ON sn_user_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_event   ON sn_user_activity(event_type, created_at DESC);

-- Saved items (spokes, APIs, code snippets)
CREATE TABLE IF NOT EXISTS sn_saved_items (
  id           BIGSERIAL PRIMARY KEY,
  session_id   TEXT NOT NULL,
  user_id      INTEGER REFERENCES sn_users(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL,   -- spoke, api, search
  entity_slug  TEXT,
  title        TEXT NOT NULL,
  description  TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, entity_type, entity_slug)
);
CREATE INDEX IF NOT EXISTS idx_saved_session ON sn_saved_items(session_id, created_at DESC);

-- Trending searches (aggregated hourly)
CREATE TABLE IF NOT EXISTS sn_trending_searches (
  query        TEXT NOT NULL,
  count        INTEGER DEFAULT 1,
  hour_bucket  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (query, hour_bucket)
);

-- Search failures (no DB match + no AI match)
CREATE TABLE IF NOT EXISTS sn_search_gaps (
  id         BIGSERIAL PRIMARY KEY,
  query      TEXT NOT NULL,
  count      INTEGER DEFAULT 1,
  last_seen  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(query)
);

-- Shared links (viral feature)
CREATE TABLE IF NOT EXISTS sn_shared_links (
  id           TEXT PRIMARY KEY,   -- short ID
  entity_type  TEXT NOT NULL,
  entity_slug  TEXT,
  query        TEXT,
  created_by   TEXT,               -- session_id or user_id
  view_count   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Extend search analytics with has_result flag
ALTER TABLE sn_search_analytics ADD COLUMN IF NOT EXISTS has_result BOOLEAN DEFAULT TRUE;
ALTER TABLE sn_search_analytics ADD COLUMN IF NOT EXISTS answer_source TEXT;
ALTER TABLE sn_search_analytics ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

-- Trending view
CREATE OR REPLACE VIEW sn_trending_24h AS
  SELECT query, COUNT(*) as count
  FROM sn_search_analytics
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND has_result = TRUE
    AND LENGTH(query) > 3
  GROUP BY query
  ORDER BY count DESC
  LIMIT 20;
