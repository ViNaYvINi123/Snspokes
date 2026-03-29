-- ============================================
-- snspokes — Database Setup Script
-- Run on your Hetzner Postgres instance
-- ============================================

-- Step 1: Create main spokes table
CREATE TABLE IF NOT EXISTS sn_spokes (
  id                  SERIAL PRIMARY KEY,
  slug                TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  official_description TEXT,
  personal_tip        TEXT,
  ai_description      TEXT,
  icon                TEXT DEFAULT '🔌',
  plugin_id           TEXT,
  category            TEXT DEFAULT 'Integration',
  credential_type     TEXT,
  min_version         TEXT DEFAULT 'Rome',
  setup_steps         JSONB DEFAULT '[]',
  actions             JSONB DEFAULT '[]',
  common_errors       JSONB DEFAULT '[]',
  code_example        TEXT,
  tags                TEXT[] DEFAULT '{}',
  view_count          INTEGER DEFAULT 0,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Step 2: Related spokes table
CREATE TABLE IF NOT EXISTS sn_related_spokes (
  id          SERIAL PRIMARY KEY,
  spoke_slug  TEXT REFERENCES sn_spokes(slug) ON DELETE CASCADE,
  related_slug TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Step 3: Search history for analytics
CREATE TABLE IF NOT EXISTS sn_search_history (
  id          SERIAL PRIMARY KEY,
  query       TEXT NOT NULL,
  results     INTEGER DEFAULT 0,
  user_ip     TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Step 4: Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_spokes_slug ON sn_spokes(slug);
CREATE INDEX IF NOT EXISTS idx_spokes_category ON sn_spokes(category);
CREATE INDEX IF NOT EXISTS idx_spokes_name ON sn_spokes USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_spokes_description ON sn_spokes USING gin(to_tsvector('english', COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_related_spoke_slug ON sn_related_spokes(spoke_slug);

-- Step 5: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_spokes_updated_at
  BEFORE UPDATE ON sn_spokes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Step 6: Seed initial popular spokes
INSERT INTO sn_spokes (slug, name, description, icon, category, plugin_id, credential_type, tags) VALUES
('slack', 'Slack', 'Send messages, manage channels and users in Slack workspaces', '💬', 'Communication', 'com.glide.hub.spoke.slack', 'OAuth 2.0', ARRAY['messaging', 'notifications', 'collaboration']),
('microsoft-teams', 'Microsoft Teams', 'Post messages, manage channels and send adaptive cards to Teams', '🟦', 'Communication', 'com.glide.hub.spoke.teams', 'OAuth 2.0', ARRAY['messaging', 'microsoft', 'collaboration']),
('jira', 'Jira', 'Create issues, update sprints and sync projects with Jira', '🔷', 'DevOps', 'com.glide.hub.spoke.jira', 'OAuth 2.0', ARRAY['ticketing', 'agile', 'atlassian']),
('github', 'GitHub', 'Manage repositories, issues, pull requests and workflows', '🐙', 'DevOps', 'com.glide.hub.spoke.github', 'OAuth 2.0', ARRAY['git', 'code', 'ci-cd']),
('aws', 'AWS', 'Manage EC2, S3, Lambda and other Amazon Web Services', '☁️', 'Cloud', 'com.glide.hub.spoke.aws', 'AWS Credentials', ARRAY['cloud', 'amazon', 'infrastructure']),
('azure', 'Microsoft Azure', 'Manage Azure resources, VMs, storage and services', '🔵', 'Cloud', 'com.glide.hub.spoke.azure', 'OAuth 2.0', ARRAY['cloud', 'microsoft', 'infrastructure']),
('pagerduty', 'PagerDuty', 'Create incidents, manage on-call schedules and escalations', '🚨', 'ITSM', 'com.glide.hub.spoke.pagerduty', 'API Key', ARRAY['alerting', 'incidents', 'on-call']),
('servicenow', 'ServiceNow', 'Cross-instance ServiceNow operations and record management', '🔧', 'ITSM', 'com.glide.hub.spoke.servicenow', 'Basic Auth', ARRAY['cross-instance', 'itsm', 'integration']),
('zoom', 'Zoom', 'Create meetings, manage users and webinars in Zoom', '📹', 'Communication', 'com.glide.hub.spoke.zoom', 'OAuth 2.0', ARRAY['video', 'meetings', 'collaboration']),
('salesforce', 'Salesforce', 'Manage CRM records, opportunities and cases in Salesforce', '☁️', 'CRM', 'com.glide.hub.spoke.salesforce', 'OAuth 2.0', ARRAY['crm', 'sales', 'leads']),
('okta', 'Okta', 'Manage users, groups and applications in Okta IAM', '🔐', 'Security', 'com.glide.hub.spoke.okta', 'API Key', ARRAY['iam', 'sso', 'security']),
('workday', 'Workday', 'Sync employees, manage HR workflows and business processes', '👥', 'HR', 'com.glide.hub.spoke.workday', 'OAuth 2.0', ARRAY['hr', 'employees', 'payroll']),
('gitlab', 'GitLab', 'Manage GitLab repositories, issues and CI/CD pipelines', '🦊', 'DevOps', 'com.glide.hub.spoke.gitlab', 'API Key', ARRAY['git', 'ci-cd', 'devops']),
('jenkins', 'Jenkins', 'Trigger builds, manage jobs and pipelines in Jenkins', '⚙️', 'DevOps', 'com.glide.hub.spoke.jenkins', 'API Key', ARRAY['ci-cd', 'builds', 'automation']),
('ansible', 'Ansible', 'Run playbooks, manage inventory and automation jobs', '🤖', 'DevOps', 'com.glide.hub.spoke.ansible', 'Basic Auth', ARRAY['automation', 'infrastructure', 'playbooks'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- VERIFY SETUP
-- ============================================
-- SELECT COUNT(*) FROM sn_spokes;
-- SELECT slug, name, category FROM sn_spokes ORDER BY name;
