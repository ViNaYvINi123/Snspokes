-- ============================================
-- snspokes v10 — ServiceNow Developer Toolkit
-- ============================================

-- ── GlideRecord Query Builder ──
CREATE TABLE IF NOT EXISTS sn_saved_queries (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES sn_users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  table_name   TEXT NOT NULL,
  conditions   JSONB DEFAULT '[]',
  order_by     TEXT,
  order_dir    TEXT DEFAULT 'ASC',
  limit_rows   INTEGER DEFAULT 10,
  script       TEXT,               -- generated GlideRecord script
  encoded_query TEXT,              -- encoded query string
  is_public    BOOLEAN DEFAULT FALSE,
  use_count    INTEGER DEFAULT 0,
  ai_optimized BOOLEAN DEFAULT FALSE,
  ai_tips      TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_queries_user ON sn_saved_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_table ON sn_saved_queries(table_name);

-- ── Error Encyclopedia ──
CREATE TABLE IF NOT EXISTS sn_error_encyclopedia (
  id            SERIAL PRIMARY KEY,
  error_code    TEXT,
  error_pattern TEXT NOT NULL,        -- regex or exact match pattern
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  root_cause    TEXT NOT NULL,
  fix_steps     JSONB DEFAULT '[]',   -- array of steps
  category      TEXT DEFAULT 'General', -- Script | API | Flow | DB | Auth | Spoke
  severity      TEXT DEFAULT 'medium', -- low | medium | high | critical
  sn_versions   TEXT[] DEFAULT ARRAY['All'],
  tags          TEXT[] DEFAULT '{}',
  source        TEXT DEFAULT 'manual', -- manual | ai_generated | community
  verified      BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_errors_pattern ON sn_error_encyclopedia USING gin(to_tsvector('english', error_pattern || ' ' || title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_errors_category ON sn_error_encyclopedia(category);
CREATE INDEX IF NOT EXISTS idx_errors_trgm ON sn_error_encyclopedia USING gin(title gin_trgm_ops);

-- ── Version Matrix ──
CREATE TABLE IF NOT EXISTS sn_version_matrix (
  id           SERIAL PRIMARY KEY,
  feature_name TEXT NOT NULL,
  feature_type TEXT NOT NULL,  -- api | spoke | method | table | plugin
  category     TEXT,
  description  TEXT,
  versions     JSONB NOT NULL, -- {"Tokyo":{"status":"ga","notes":"..."}, "Utah":{...}}
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matrix_feature ON sn_version_matrix(feature_name);
CREATE INDEX IF NOT EXISTS idx_matrix_type ON sn_version_matrix(feature_type);
CREATE INDEX IF NOT EXISTS idx_matrix_trgm ON sn_version_matrix USING gin(feature_name gin_trgm_ops);

-- ── Flow Designer Snippets ──
CREATE TABLE IF NOT EXISTS sn_flow_snippets (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT DEFAULT 'General',
  use_case     TEXT,
  spokes_used  TEXT[] DEFAULT '{}',
  flow_json    TEXT,          -- exportable Flow Designer JSON template
  script       TEXT,          -- optional script action
  sn_version   TEXT DEFAULT 'Rome+',
  difficulty   TEXT DEFAULT 'intermediate', -- beginner | intermediate | advanced
  tags         TEXT[] DEFAULT '{}',
  view_count   INTEGER DEFAULT 0,
  copy_count   INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snippets_category ON sn_flow_snippets(category);
CREATE INDEX IF NOT EXISTS idx_snippets_trgm ON sn_flow_snippets USING gin(title gin_trgm_ops);

-- ── SN Tables Reference ──
CREATE TABLE IF NOT EXISTS sn_table_reference (
  id           SERIAL PRIMARY KEY,
  table_name   TEXT UNIQUE NOT NULL,
  label        TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  fields       JSONB DEFAULT '[]',   -- [{name, type, label, mandatory}]
  state_values JSONB DEFAULT '{}',   -- {field: [{value, label}]}
  extends      TEXT,                 -- parent table
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tables_name ON sn_table_reference(table_name);
CREATE INDEX IF NOT EXISTS idx_tables_trgm ON sn_table_reference USING gin(table_name gin_trgm_ops);

-- ── Developer Activity / Analytics ──
CREATE TABLE IF NOT EXISTS sn_dev_activity (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES sn_users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,  -- query_built | error_searched | snippet_copied | etc
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dev_activity_user ON sn_dev_activity(user_id);

-- ── Seed: Common SN Tables ──
INSERT INTO sn_table_reference (table_name, label, description, category, fields, state_values) VALUES
('incident', 'Incident', 'IT service disruptions requiring resolution', 'ITSM',
 '[{"name":"number","type":"string","label":"Number"},{"name":"short_description","type":"string","label":"Short Description","mandatory":true},{"name":"priority","type":"integer","label":"Priority"},{"name":"state","type":"integer","label":"State"},{"name":"assigned_to","type":"reference","label":"Assigned To","ref_table":"sys_user"},{"name":"assignment_group","type":"reference","label":"Assignment Group","ref_table":"sys_user_group"},{"name":"caller_id","type":"reference","label":"Caller","ref_table":"sys_user"},{"name":"category","type":"string","label":"Category"},{"name":"impact","type":"integer","label":"Impact"},{"name":"urgency","type":"integer","label":"Urgency"},{"name":"sys_created_on","type":"glide_date_time","label":"Created"},{"name":"resolved_at","type":"glide_date_time","label":"Resolved"}]',
 '{"state":{"1":"New","2":"In Progress","3":"On Hold","4":"Awaiting Info","6":"Resolved","7":"Closed"},"priority":{"1":"Critical","2":"High","3":"Moderate","4":"Low","5":"Planning"},"impact":{"1":"High","2":"Medium","3":"Low"},"urgency":{"1":"High","2":"Medium","3":"Low"}}'),
('change_request', 'Change Request', 'Controlled changes to IT infrastructure', 'ITSM',
 '[{"name":"number","type":"string","label":"Number"},{"name":"short_description","type":"string","label":"Short Description","mandatory":true},{"name":"type","type":"string","label":"Type"},{"name":"state","type":"integer","label":"State"},{"name":"assignment_group","type":"reference","label":"Assignment Group","ref_table":"sys_user_group"},{"name":"assigned_to","type":"reference","label":"Assigned To","ref_table":"sys_user"},{"name":"risk","type":"integer","label":"Risk"},{"name":"start_date","type":"glide_date_time","label":"Planned Start"},{"name":"end_date","type":"glide_date_time","label":"Planned End"}]',
 '{"state":{"-5":"New","-4":"Assess","-3":"Authorize","-2":"Scheduled","-1":"Implement","0":"Review","3":"Closed","4":"Cancelled"},"type":{"standard":"Standard","normal":"Normal","emergency":"Emergency"},"risk":{"1":"High","2":"Medium","3":"Low","4":"Very High"}}'),
('sys_user', 'User', 'Platform user accounts', 'Platform',
 '[{"name":"user_name","type":"string","label":"Username","mandatory":true},{"name":"email","type":"string","label":"Email"},{"name":"first_name","type":"string","label":"First Name"},{"name":"last_name","type":"string","label":"Last Name"},{"name":"active","type":"boolean","label":"Active"},{"name":"department","type":"reference","label":"Department","ref_table":"cmn_department"},{"name":"manager","type":"reference","label":"Manager","ref_table":"sys_user"},{"name":"roles","type":"string","label":"Roles"}]',
 '{"active":{"true":"Active","false":"Inactive"}}'),
('sc_request', 'Service Request', 'End-user service catalog requests', 'Service Catalog',
 '[{"name":"number","type":"string","label":"Number"},{"name":"short_description","type":"string","label":"Short Description"},{"name":"state","type":"integer","label":"State"},{"name":"requested_for","type":"reference","label":"Requested For","ref_table":"sys_user"},{"name":"price","type":"price","label":"Price"},{"name":"opened_at","type":"glide_date_time","label":"Opened"}]',
 '{"state":{"1":"Open","2":"Work in Progress","3":"Closed Complete","4":"Closed Incomplete","7":"Approved","8":"Pending Approval"}}'),
('problem', 'Problem', 'Root cause investigation of recurring incidents', 'ITSM',
 '[{"name":"number","type":"string","label":"Number"},{"name":"short_description","type":"string","label":"Short Description","mandatory":true},{"name":"state","type":"integer","label":"State"},{"name":"assignment_group","type":"reference","label":"Assignment Group","ref_table":"sys_user_group"},{"name":"assigned_to","type":"reference","label":"Assigned To","ref_table":"sys_user"},{"name":"known_error","type":"boolean","label":"Known Error"}]',
 '{"state":{"1":"Open","2":"Known Error","3":"Pending Change","4":"Closed/Resolved","107":"RCA"}}')
ON CONFLICT (table_name) DO NOTHING;

-- ── Seed: Real ServiceNow Error Encyclopedia ──
INSERT INTO sn_error_encyclopedia (error_pattern, title, description, root_cause, fix_steps, category, severity, sn_versions, tags, source, verified) VALUES

('Transaction cancelled: maximum execution time exceeded',
 'Script Transaction Timeout',
 'A server-side script exceeded the maximum allowed execution time and was automatically cancelled by ServiceNow.',
 'The script contains a slow or unoptimized database query, infinite loop, or processes too many records without limits.',
 '["Add gr.setLimit() to restrict records processed","Add LIMIT to encoded queries","Use GlideAggregate instead of GlideRecord for counting","Move heavy processing to a Scheduled Job","Check for missing indexes on queried fields","Use gs.sleep() workarounds only as last resort"]',
 'Script', 'high', ARRAY['All'], ARRAY['timeout','gliderecord','performance'], 'manual', true),

('GlideRecord is not defined',
 'GlideRecord Not Defined in Client Script',
 'GlideRecord cannot be used in client-side scripts (Client Scripts, UI Policies, UI Actions running on client).',
 'GlideRecord is a server-side API only. Attempting to use it in a client script causes this error.',
 '["Use GlideAjax to call a Script Include from client side","Use g_form.getValue() for field values on client","Use GlideRecord only in Business Rules, Script Includes, Scheduled Jobs","Create a Script Include with ajaxFunction and call it via GlideAjax"]',
 'Script', 'high', ARRAY['All'], ARRAY['gliderecord','client-script','ajax'], 'manual', true),

('org.mozilla.javascript.EcmaError: TypeError',
 'JavaScript TypeError in Script',
 'A JavaScript TypeError occurred, usually from accessing a property on null/undefined or calling a non-function.',
 'Common causes: calling .getValue() on null reference, accessing property before null check, or using undefined variable.',
 '["Add null checks before accessing object properties: if(gr.isValidRecord())","Check gr.get() return value before using","Use optional chaining pattern: var val = obj && obj.field","Add try/catch around risky code blocks","Enable script debugger and add breakpoints"]',
 'Script', 'medium', ARRAY['All'], ARRAY['javascript','typeerror','null'], 'manual', true),

('Security restricted: requires role',
 'Insufficient Role / ACL Restriction',
 'The current user does not have the required role or ACL permission to perform the attempted operation.',
 'ACL rules are blocking the operation. The user lacks the required role, or the script is not running with elevated privileges.',
 '["Check ACLs on the table/field in Security > Access Controls","Use gs.hasRole() to verify role before operation","Use GlideRecord with elevated privileges via gs.runScriptGlobal()","Add required role to the user or group","Consider using a Script Include with no-ACL flag for background operations","Review record-level ACLs that may be restricting access"]',
 'Auth', 'high', ARRAY['All'], ARRAY['acl','roles','security','permissions'], 'manual', true),

('HTTP 401 Unauthorized',
 'OAuth Token Expired or Invalid',
 'The Integration Hub spoke returned a 401 error, meaning the authentication credentials are invalid or expired.',
 'OAuth 2.0 access tokens expire. The connection credential in ServiceNow has an expired or revoked token.',
 '["Go to Connections & Credentials > Credentials","Find the affected credential and click Test Connection","If failing, click Re-authenticate and complete OAuth flow","Check if the external app revoked the token","Verify the client_id and client_secret are still valid","For API Key auth: verify the key has not been rotated"]',
 'API', 'high', ARRAY['All'], ARRAY['oauth','401','credentials','spoke','authentication'], 'manual', true),

('No MID Server available',
 'No MID Server Available for Discovery',
 'ServiceNow cannot find an active MID Server to execute the operation, such as Discovery or on-premise spoke execution.',
 'The MID Server is offline, unreachable, or not configured for the required application.',
 '["Check MID Server status: MID Server > Servers","Verify MID Server service is running on the host machine","Check network connectivity between MID Server and ServiceNow instance","Restart MID Server: net stop snc_mid && net start snc_mid (Windows)","Verify MID Server is validated and in UP state","Check MID Server includes/excludes IP ranges"]',
 'API', 'critical', ARRAY['All'], ARRAY['midserver','discovery','onpremise','connectivity'], 'manual', true),

('Illegal reference qualifier',
 'Illegal Reference Qualifier in Query',
 'The encoded query or reference qualifier contains an invalid or improperly formatted condition.',
 'The query condition uses wrong field names, invalid operators, or malformed syntax that ServiceNow cannot parse.',
 '["Open List View and use Condition Builder to build query visually","Right-click condition breadcrumb and copy encoded query","Verify field names match exactly (case-sensitive in some versions)","Check reference field queries use .sys_id or dot-walking syntax","Use gr.addEncodedQuery() with pre-validated query string"]',
 'Script', 'medium', ARRAY['All'], ARRAY['query','encoded-query','gliderecord','reference'], 'manual', true),

('Maximum response size exceeded',
 'REST API Response Size Limit Exceeded',
 'The outbound REST API call returned more data than ServiceNow allows, causing the spoke or REST step to fail.',
 'The external API is returning a very large payload that exceeds the Integration Hub transaction size limit.',
 '["Add pagination parameters to the API request (page_size, limit, offset)","Use Stream actions instead of standard REST actions for large datasets","Filter response fields using API parameters (select, fields, $select)","Split the request into multiple smaller requests","Consider using a MID Server for large data transfers","Increase sysprop: com.glide.hub.flow_engine.max_response_size (admin only)"]',
 'API', 'medium', ARRAY['Quebec+'], ARRAY['rest','api','response','size','integration-hub'], 'manual', true)

ON CONFLICT DO NOTHING;

-- ── Seed: Version Matrix (Real SN Data) ──
INSERT INTO sn_version_matrix (feature_name, feature_type, category, description, versions, tags) VALUES

('GlideRecord.setLimit()', 'method', 'GlideRecord',
 'Limits the number of records returned by a query',
 '{"New York":{"status":"ga","notes":"Available"},"Orlando":{"status":"ga","notes":"Available"},"Paris":{"status":"ga","notes":"Available"},"Quebec":{"status":"ga","notes":"Available"},"Rome":{"status":"ga","notes":"Available"},"San Diego":{"status":"ga","notes":"Available"},"Tokyo":{"status":"ga","notes":"Available"},"Utah":{"status":"ga","notes":"Available"},"Vancouver":{"status":"ga","notes":"Available"},"Washington":{"status":"ga","notes":"Available"},"Xanadu":{"status":"ga","notes":"Available"},"Yokohama":{"status":"ga","notes":"Available"}}',
 ARRAY['gliderecord','query','performance']),

('Flow Designer', 'feature', 'Automation',
 'Visual workflow automation tool replacing legacy workflows',
 '{"New York":{"status":"beta","notes":"Initial release, limited actions"},"Orlando":{"status":"ga","notes":"GA with Integration Hub"},"Paris":{"status":"ga","notes":"Expanded action catalog"},"Quebec":{"status":"ga","notes":"Added subflows"},"Rome":{"status":"ga","notes":"Improved performance"},"San Diego":{"status":"ga","notes":"AI features preview"},"Tokyo":{"status":"ga","notes":"Now recommended over Legacy Workflow"},"Utah":{"status":"ga","notes":"Workflow Studio replaces Flow Designer UI"},"Vancouver":{"status":"ga","notes":"Part of Workflow Data Fabric"},"Washington":{"status":"ga","notes":"Enhanced AI integration"},"Xanadu":{"status":"ga","notes":"AI Agent Studio added"},"Yokohama":{"status":"ga","notes":"Full AI agent support"}}',
 ARRAY['flow-designer','automation','workflow-studio']),

('Integration Hub Spoke Transactions', 'feature', 'Integration',
 'Billable unit for Integration Hub spoke executions',
 '{"New York":{"status":"ga","notes":"Introduced transaction model"},"Orlando":{"status":"ga","notes":"Free tier: 1M transactions/year"},"Paris":{"status":"ga","notes":"No change"},"Quebec":{"status":"ga","notes":"Starter spokes free"},"Rome":{"status":"ga","notes":"Professional & Enterprise tiers"},"San Diego":{"status":"ga","notes":"No change"},"Tokyo":{"status":"ga","notes":"Automation Engine bundles added"},"Utah":{"status":"ga","notes":"Some spokes now free with products"},"Vancouver":{"status":"ga","notes":"Workflow Data Fabric entitlement model"},"Washington":{"status":"ga","notes":"Revised entitlement"},"Xanadu":{"status":"ga","notes":"Check your license for inclusions"},"Yokohama":{"status":"ga","notes":"Latest entitlement model"}}',
 ARRAY['integration-hub','transactions','licensing']),

('Generative AI Controller', 'feature', 'AI',
 'Native GenAI integration supporting OpenAI and Azure OpenAI',
 '{"Tokyo":{"status":"not_available","notes":"Not available"},"Utah":{"status":"not_available","notes":"Not available"},"Vancouver":{"status":"beta","notes":"Preview release"},"Washington":{"status":"ga","notes":"GA release with Now Assist"},"Xanadu":{"status":"ga","notes":"Expanded AI agent capabilities"},"Yokohama":{"status":"ga","notes":"Full Now Assist suite"}}',
 ARRAY['ai','now-assist','genai','openai']),

('GlideExcelParser', 'api', 'Scripting',
 'Server-side API for parsing Excel files',
 '{"New York":{"status":"ga","notes":"Available"},"Orlando":{"status":"ga","notes":"Available"},"Paris":{"status":"ga","notes":"Available"},"Quebec":{"status":"ga","notes":"Available"},"Rome":{"status":"ga","notes":"Available"},"San Diego":{"status":"ga","notes":"Available"},"Tokyo":{"status":"ga","notes":"Available"},"Utah":{"status":"ga","notes":"Available, new streaming variant added"},"Vancouver":{"status":"ga","notes":"Available"},"Washington":{"status":"ga","notes":"Available"},"Xanadu":{"status":"ga","notes":"Available"},"Yokohama":{"status":"ga","notes":"Available"}}',
 ARRAY['excel','scripting','files','parsing']),

('Workspace (Next Experience)', 'feature', 'UI',
 'Modern agent workspace replacing Classic UI for ITSM',
 '{"Quebec":{"status":"beta","notes":"Preview"},"Rome":{"status":"beta","notes":"Beta"},"San Diego":{"status":"ga","notes":"GA for ITSM"},"Tokyo":{"status":"ga","notes":"Improved performance"},"Utah":{"status":"ga","notes":"Configurable workspace"},"Vancouver":{"status":"ga","notes":"Default for new instances"},"Washington":{"status":"ga","notes":"AI-enhanced"},"Xanadu":{"status":"ga","notes":"Full feature parity with Classic"},"Yokohama":{"status":"ga","notes":"Classic UI deprecated notice"}}',
 ARRAY['workspace','next-experience','ui','itsm'])

ON CONFLICT DO NOTHING;

-- ── Seed: Flow Designer Snippets ──
INSERT INTO sn_flow_snippets (title, description, category, use_case, spokes_used, script, sn_version, difficulty, tags) VALUES
('Create Incident + Slack Alert',
 'Automatically creates an incident and sends a Slack notification with incident details and link.',
 'ITSM', 'Triggered when monitoring detects an outage. Creates P1 incident and alerts the on-call team on Slack.',
 ARRAY['Slack'],
 '// Trigger: Service Catalog, Inbound Email, or Webhook\n// Action 1: Create Record (incident table)\nvar incidentData = {\n  short_description: fd_data.trigger.short_description,\n  priority: "1",\n  urgency: "1",\n  impact: "1",\n  category: "software"\n};\n// Action 2: Slack - Post Message\nvar message = ":red_circle: *P1 Incident Created*\\n" +\n  "*" + incidentData.short_description + "*\\n" +\n  "View: https://your-instance.service-now.com/incident.do?sys_id=" + fd_data.steps.create_incident.sys_id;',
 'Orlando+', 'beginner', ARRAY['incident','slack','alerting','p1']),

('Employee Offboarding Automation',
 'Complete offboarding: disable AD user, revoke Okta, close HRSD tasks, notify manager.',
 'HR', 'Triggered when HRSD offboarding case reaches status Executing. Runs all deprovisioning steps in parallel.',
 ARRAY['Active Directory', 'Okta', 'Microsoft Teams'],
 '// Trigger: HRSD Lifecycle Event - Offboarding\n// Parallel Branch 1: Active Directory\n//   Action: Disable AD User (input: user.user_name)\n// Parallel Branch 2: Okta\n//   Action: Deactivate Okta User (input: user.email)\n// After parallel: Teams notification to manager\n// Action: Create Task for equipment return\nvar offboardMsg = "Offboarding complete for: " + fd_data.trigger.subject_person.name + "\\nAll access revoked.";',
 'Paris+', 'advanced', ARRAY['offboarding','hr','ad','okta','automation']),

('Auto-Resolve Incident from Monitoring',
 'Monitors an alert and auto-resolves the linked incident when the alert clears.',
 'ITSM', 'Used with Dynatrace/Datadog webhook. When alert state changes to resolved, closes the ServiceNow incident.',
 ARRAY['PagerDuty', 'Dynatrace'],
 '// Trigger: Inbound Webhook (monitoring tool)\n// Condition: fd_data.trigger.payload.state == "resolved"\nvar gr = new GlideRecord("incident");\ngr.addQuery("correlation_id", fd_data.trigger.payload.alert_id);\ngr.addQuery("state", "NOT IN", "6,7"); // Not resolved or closed\ngr.query();\nif (gr.next()) {\n  gr.state = 6; // Resolved\n  gr.close_code = "Solved (Permanently)";\n  gr.close_notes = "Auto-resolved: monitoring alert cleared at " + new GlideDateTime();\n  gr.update();\n}',
 'Quebec+', 'intermediate', ARRAY['incident','monitoring','auto-resolve','webhook'])
ON CONFLICT DO NOTHING;

SELECT 'v10 schema ready! GlideRecord builder, Error Encyclopedia, Version Matrix seeded.' as status;
