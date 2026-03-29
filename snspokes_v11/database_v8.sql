-- ============================================
-- snspokes v8 — API Integration Platform
-- ============================================

-- External API Connectors
CREATE TABLE IF NOT EXISTS sn_api_connectors (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  base_url        TEXT NOT NULL,
  auth_type       TEXT DEFAULT 'none', -- none | api_key | bearer | oauth2 | basic
  auth_config     JSONB DEFAULT '{}',  -- encrypted credential config
  default_headers JSONB DEFAULT '{}',
  timeout_ms      INTEGER DEFAULT 10000,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- API Endpoints (per connector)
CREATE TABLE IF NOT EXISTS sn_api_endpoints (
  id              SERIAL PRIMARY KEY,
  connector_id    INTEGER REFERENCES sn_api_connectors(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  path            TEXT NOT NULL,
  method          TEXT DEFAULT 'GET',
  description     TEXT,
  params_schema   JSONB DEFAULT '{}',
  body_schema     JSONB DEFAULT '{}',
  response_map    JSONB DEFAULT '{}', -- transform rules
  cache_ttl       INTEGER DEFAULT 0,  -- 0 = no cache
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- API Execution Logs
CREATE TABLE IF NOT EXISTS sn_api_exec_logs (
  id              SERIAL PRIMARY KEY,
  connector_id    INTEGER REFERENCES sn_api_connectors(id) ON DELETE SET NULL,
  endpoint_id     INTEGER REFERENCES sn_api_endpoints(id) ON DELETE SET NULL,
  method          TEXT,
  url             TEXT,
  status_code     INTEGER,
  duration_ms     INTEGER,
  request_data    JSONB,
  response_data   JSONB,
  error_msg       TEXT,
  triggered_by    TEXT DEFAULT 'manual', -- manual | webhook | n8n | scheduled
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exec_logs_connector ON sn_api_exec_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_exec_logs_created ON sn_api_exec_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exec_logs_status ON sn_api_exec_logs(status_code);

-- Webhooks (incoming)
CREATE TABLE IF NOT EXISTS sn_webhooks (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  secret          TEXT,          -- for signature verification
  description     TEXT,
  forward_to      TEXT,          -- optional: forward to n8n or internal handler
  transform_rules JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  total_received  INTEGER DEFAULT 0,
  last_received   TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Webhook Events (received payloads)
CREATE TABLE IF NOT EXISTS sn_webhook_events (
  id              SERIAL PRIMARY KEY,
  webhook_id      INTEGER REFERENCES sn_webhooks(id) ON DELETE CASCADE,
  payload         JSONB,
  headers         JSONB,
  source_ip       TEXT,
  processed       BOOLEAN DEFAULT FALSE,
  error_msg       TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook ON sn_webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON sn_webhook_events(created_at DESC);

-- API Alerts config
CREATE TABLE IF NOT EXISTS sn_api_alerts (
  id              SERIAL PRIMARY KEY,
  connector_id    INTEGER REFERENCES sn_api_connectors(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL, -- error_rate | slow_response | rate_limit | downtime
  threshold       DECIMAL(10,2),
  notify_email    TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_triggered  TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connectors_slug ON sn_api_connectors(slug);
CREATE INDEX IF NOT EXISTS idx_endpoints_connector ON sn_api_endpoints(connector_id);

-- Seed example connectors
INSERT INTO sn_api_connectors (name, slug, description, base_url, auth_type, is_active) VALUES
('ServiceNow Docs', 'servicenow-docs', 'ServiceNow official documentation API', 'https://docs.servicenow.com', 'none', true),
('OpenRouter AI', 'openrouter-ai', 'OpenRouter LLM API', 'https://openrouter.ai/api/v1', 'bearer', true)
ON CONFLICT (slug) DO NOTHING;

SELECT 'v8 schema ready!' as status;
