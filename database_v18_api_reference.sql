-- v18: ServiceNow API Reference tables

CREATE TABLE IF NOT EXISTS sn_api_reference (
  id           SERIAL PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,        -- 'REST API', 'Server-Side', 'Client-Side', 'Context'
  api_type     TEXT NOT NULL,        -- 'rest', 'server', 'client', 'context', 'scope'
  scope        TEXT DEFAULT 'both',  -- 'scoped_only', 'global_only', 'both', 'client_only', 'service_portal'
  global_var   TEXT,                 -- 'gs', 'g_form', 'GlideRecord', etc.
  base_path    TEXT,                 -- for REST APIs
  description  TEXT,
  methods      JSONB DEFAULT '[]',
  params       JSONB DEFAULT '[]',
  auth         JSONB DEFAULT '[]',
  code_example TEXT,
  gotcha       TEXT,
  scoped_differences TEXT,
  best_practices JSONB DEFAULT '[]',
  available_vars JSONB DEFAULT '[]',
  types        JSONB DEFAULT '[]',
  roles_required JSONB DEFAULT '[]',
  view_count   INTEGER DEFAULT 0,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_ref_slug     ON sn_api_reference(slug);
CREATE INDEX IF NOT EXISTS idx_api_ref_category ON sn_api_reference(category);
CREATE INDEX IF NOT EXISTS idx_api_ref_type     ON sn_api_reference(api_type);
CREATE INDEX IF NOT EXISTS idx_api_ref_scope    ON sn_api_reference(scope);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_api_ref_search ON sn_api_reference
  USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,'')));

-- Scope comparison table
CREATE TABLE IF NOT EXISTS sn_scope_comparison (
  id       SERIAL PRIMARY KEY,
  topic    TEXT NOT NULL,
  scoped   TEXT,
  global   TEXT,
  gotcha   TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
