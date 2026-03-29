// ============================================================
// snspokes — Complete Mock Data
// Used by both frontend (MSW) and backend (mock DB)
// ============================================================

// ── Users ──────────────────────────────────────────────────
export const MOCK_USERS = [
  { id: 1, name: 'Vinay Kumar',    email: 'vinay@snspokes.com',   plan: 'enterprise', is_active: true, is_banned: false, onboarded: true,  role: 'developer',   sn_version: 'Yokohama (2025)', created_at: '2025-01-01T00:00:00Z', last_login: new Date().toISOString() },
  { id: 2, name: 'Rahul Sharma',   email: 'rahul@example.com',    plan: 'pro',        is_active: true, is_banned: false, onboarded: true,  role: 'architect',   sn_version: 'Xanadu (2024)',   created_at: '2025-01-15T00:00:00Z', last_login: new Date(Date.now()-86400000).toISOString() },
  { id: 3, name: 'Priya Singh',    email: 'priya@techcorp.com',   plan: 'pro',        is_active: true, is_banned: false, onboarded: true,  role: 'consultant',  sn_version: 'Washington DC (2024)', created_at: '2025-02-01T00:00:00Z', last_login: new Date(Date.now()-172800000).toISOString() },
  { id: 4, name: 'Amit Patel',     email: 'amit@devshop.in',      plan: 'free',       is_active: true, is_banned: false, onboarded: true,  role: 'student',     sn_version: 'Tokyo (2022)',    created_at: '2025-02-10T00:00:00Z', last_login: new Date(Date.now()-3600000).toISOString() },
  { id: 5, name: 'Sarah Johnson',  email: 'sarah@enterprise.com', plan: 'enterprise', is_active: true, is_banned: false, onboarded: true,  role: 'admin',       sn_version: 'Yokohama (2025)', created_at: '2025-02-15T00:00:00Z', last_login: new Date(Date.now()-7200000).toISOString() },
  { id: 6, name: 'John Doe',       email: 'john@spam.com',        plan: 'free',       is_active: true, is_banned: true,  onboarded: false, role: null,          sn_version: null,              created_at: '2025-03-01T00:00:00Z', last_login: null },
  { id: 7, name: 'Meera Reddy',    email: 'meera@itfirm.com',     plan: 'pro',        is_active: true, is_banned: false, onboarded: true,  role: 'developer',   sn_version: 'Vancouver (2023)',created_at: '2025-03-05T00:00:00Z', last_login: new Date(Date.now()-43200000).toISOString() },
  { id: 8, name: 'Carlos Mendez',  email: 'carlos@sncorp.mx',     plan: 'free',       is_active: true, is_banned: false, onboarded: true,  role: 'developer',   sn_version: 'Utah (2023)',     created_at: '2025-03-10T00:00:00Z', last_login: new Date(Date.now()-21600000).toISOString() },
];

// ── Spokes ─────────────────────────────────────────────────
export const MOCK_SPOKES = [
  { id: 1,  slug: 'slack-spoke',          name: 'Slack Spoke',           category: 'Communication',  plugin_id: 'com.snc.slack',           credential_type: 'OAuth2',  min_version: 'Rome',       is_active: true, avg_rating: 4.8, view_count: 2450, tags: ['messaging','notifications','alerts'], description: 'Connect ServiceNow workflows to Slack. Send messages, create channels, manage users directly from Flow Designer. Supports incident notifications, approval requests, and custom alerts.' },
  { id: 2,  slug: 'jira-spoke',           name: 'Jira Spoke',            category: 'DevOps',         plugin_id: 'com.snc.jira',            credential_type: 'OAuth2',  min_version: 'Quebec',     is_active: true, avg_rating: 4.6, view_count: 1890, tags: ['jira','tickets','devops'],           description: 'Bidirectional integration between ServiceNow and Jira. Create, update, and sync issues. Perfect for DevOps teams managing incidents and change requests.' },
  { id: 3,  slug: 'microsoft-teams-spoke',name: 'Microsoft Teams Spoke', category: 'Communication',  plugin_id: 'com.snc.ms_teams',        credential_type: 'OAuth2',  min_version: 'San Diego',  is_active: true, avg_rating: 4.5, view_count: 1654, tags: ['teams','microsoft','chat'],          description: 'Send adaptive cards, messages, and create meetings in Microsoft Teams from ServiceNow workflows.' },
  { id: 4,  slug: 'servicenow-spoke',     name: 'ServiceNow Spoke',      category: 'ITSM',           plugin_id: 'com.snc.servicenow',      credential_type: 'Basic',   min_version: 'Rome',       is_active: true, avg_rating: 4.9, view_count: 3200, tags: ['itsm','records','gliderecord'],      description: 'Create, read, update and delete records in another ServiceNow instance. Essential for multi-instance architectures.' },
  { id: 5,  slug: 'pagerduty-spoke',      name: 'PagerDuty Spoke',       category: 'Monitoring',     plugin_id: 'com.snc.pagerduty',       credential_type: 'API Key', min_version: 'Tokyo',      is_active: true, avg_rating: 4.7, view_count: 987,  tags: ['oncall','alerts','incidents'],       description: 'Trigger, acknowledge, and resolve PagerDuty incidents from ServiceNow. Sync on-call schedules and escalation policies.' },
  { id: 6,  slug: 'aws-spoke',            name: 'AWS Spoke',             category: 'Cloud',          plugin_id: 'com.snc.aws',             credential_type: 'API Key', min_version: 'San Diego',  is_active: true, avg_rating: 4.4, view_count: 1234, tags: ['aws','cloud','ec2','s3'],            description: 'Manage AWS resources from ServiceNow. Start/stop EC2 instances, manage S3 buckets, trigger Lambda functions.' },
  { id: 7,  slug: 'github-spoke',         name: 'GitHub Spoke',          category: 'DevOps',         plugin_id: 'com.snc.github',          credential_type: 'OAuth2',  min_version: 'Utah',       is_active: true, avg_rating: 4.6, view_count: 876,  tags: ['github','git','devops','code'],      description: 'Create issues, pull requests, and manage repositories from ServiceNow. Perfect for change management workflows.' },
  { id: 8,  slug: 'salesforce-spoke',     name: 'Salesforce Spoke',      category: 'CSM',            plugin_id: 'com.snc.salesforce',      credential_type: 'OAuth2',  min_version: 'Quebec',     is_active: true, avg_rating: 4.3, view_count: 765,  tags: ['salesforce','crm','leads'],          description: 'Sync accounts, cases, and leads between Salesforce and ServiceNow.' },
  { id: 9,  slug: 'azure-devops-spoke',   name: 'Azure DevOps Spoke',    category: 'DevOps',         plugin_id: 'com.snc.azure_devops',    credential_type: 'OAuth2',  min_version: 'Vancouver',  is_active: true, avg_rating: 4.5, view_count: 654,  tags: ['azure','devops','boards'],           description: 'Connect ServiceNow change management with Azure DevOps boards and pipelines.' },
  { id: 10, slug: 'zoom-spoke',           name: 'Zoom Spoke',            category: 'Communication',  plugin_id: 'com.snc.zoom',            credential_type: 'OAuth2',  min_version: 'Tokyo',      is_active: true, avg_rating: 4.2, view_count: 543,  tags: ['zoom','meetings','video'],           description: 'Create Zoom meetings, manage webinars, and send notifications from ServiceNow workflows.' },
  { id: 11, slug: 'servicenow-hr-spoke',  name: 'HR Service Delivery',   category: 'HR',             plugin_id: 'com.snc.hr',              credential_type: 'Basic',   min_version: 'San Diego',  is_active: true, avg_rating: 4.7, view_count: 890,  tags: ['hr','onboarding','leave'],           description: 'Automate HR processes including onboarding, offboarding, and leave management.' },
  { id: 12, slug: 'okta-spoke',           name: 'Okta Spoke',            category: 'Identity',       plugin_id: 'com.snc.okta',            credential_type: 'OAuth2',  min_version: 'Utah',       is_active: true, avg_rating: 4.6, view_count: 723,  tags: ['okta','identity','sso','mfa'],       description: 'Manage Okta users, groups, and applications from ServiceNow. Perfect for access management workflows.' },
];

// ── Payments ───────────────────────────────────────────────
export const MOCK_PAYMENTS = [
  { id: 1, user_id: 1, plan: 'enterprise', amount: 4999, status: 'active',    currency: 'INR', provider: 'razorpay', created_at: '2025-01-01T00:00:00Z' },
  { id: 2, user_id: 2, plan: 'pro',        amount: 999,  status: 'active',    currency: 'INR', provider: 'razorpay', created_at: '2025-01-15T00:00:00Z' },
  { id: 3, user_id: 3, plan: 'pro',        amount: 999,  status: 'active',    currency: 'INR', provider: 'razorpay', created_at: '2025-02-01T00:00:00Z' },
  { id: 4, user_id: 5, plan: 'enterprise', amount: 4999, status: 'active',    currency: 'INR', provider: 'razorpay', created_at: '2025-02-15T00:00:00Z' },
  { id: 5, user_id: 7, plan: 'pro',        amount: 999,  status: 'active',    currency: 'INR', provider: 'razorpay', created_at: '2025-03-05T00:00:00Z' },
  { id: 6, user_id: 8, plan: 'pro',        amount: 999,  status: 'cancelled', currency: 'INR', provider: 'razorpay', created_at: '2025-01-20T00:00:00Z' },
];

// ── Search Analytics ────────────────────────────────────────
export const MOCK_SEARCHES = [
  { id: 1, query: 'slack',         user_id: 2, results: 3, user_ip: '192.168.1.1', created_at: new Date(Date.now()-3600000).toISOString() },
  { id: 2, query: 'jira',          user_id: 3, results: 2, user_ip: '192.168.1.2', created_at: new Date(Date.now()-7200000).toISOString() },
  { id: 3, query: 'microsoft',     user_id: 4, results: 4, user_ip: '192.168.1.3', created_at: new Date(Date.now()-1800000).toISOString() },
  { id: 4, query: 'pagerduty',     user_id: null, results: 1, user_ip: '10.0.0.1', created_at: new Date(Date.now()-900000).toISOString() },
  { id: 5, query: 'aws cloud',     user_id: 5, results: 2, user_ip: '192.168.1.5', created_at: new Date(Date.now()-600000).toISOString() },
  { id: 6, query: 'github devops', user_id: 7, results: 2, user_ip: '192.168.1.7', created_at: new Date(Date.now()-300000).toISOString() },
  { id: 7, query: 'okta',          user_id: 8, results: 1, user_ip: '192.168.1.8', created_at: new Date(Date.now()-120000).toISOString() },
];

// ── Code Generations ────────────────────────────────────────
export const MOCK_CODE_GENERATIONS = [
  {
    id: 1, user_id: 2, code_type: 'business_rule',
    prompt: 'Auto-assign P1 incidents to on-call group',
    generated: `(function executeRule(current, previous) {
  try {
    if (current.priority == '1') {
      var gr = new GlideRecord('sys_user_group');
      gr.addQuery('name', 'On-Call Team');
      gr.setLimit(1);
      gr.query();
      if (gr.next()) {
        current.assignment_group = gr.sys_id;
        gs.info('Auto-assigned P1 incident to on-call team');
      }
    }
  } catch(e) {
    gs.error('Error in P1 assignment BR: ' + e.message);
  }
})(current, previous);`,
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    created_at: new Date(Date.now()-86400000).toISOString(),
  },
  {
    id: 2, user_id: 3, code_type: 'script_include',
    prompt: 'Utility class for sending Slack notifications',
    generated: `var SlackUtils = Class.create();
SlackUtils.prototype = {
  initialize: function() {
    this.webhookUrl = gs.getProperty('slack.webhook.url');
  },
  sendMessage: function(channel, message) {
    try {
      var rm = new sn_ws.RESTMessageV2();
      rm.setEndpoint(this.webhookUrl);
      rm.setHttpMethod('POST');
      rm.setRequestBody(JSON.stringify({ channel: channel, text: message }));
      var response = rm.execute();
      return response.getStatusCode() === 200;
    } catch(e) {
      gs.error('SlackUtils.sendMessage error: ' + e.message);
      return false;
    }
  },
  type: 'SlackUtils'
};`,
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    created_at: new Date(Date.now()-43200000).toISOString(),
  },
];

// ── Saved Queries ───────────────────────────────────────────
export const MOCK_SAVED_QUERIES = [
  { id: 1, user_id: 2, name: 'Active P1 Incidents',  query: 'active=true^priority=1', table_name: 'incident',  created_at: new Date(Date.now()-86400000).toISOString() },
  { id: 2, user_id: 2, name: 'Open Change Requests', query: 'state=1^type=normal',    table_name: 'change_request', created_at: new Date(Date.now()-43200000).toISOString() },
  { id: 3, user_id: 3, name: 'My Assigned Tasks',    query: 'assigned_to=javascript:gs.getUserID()^active=true', table_name: 'task', created_at: new Date(Date.now()-21600000).toISOString() },
];

// ── Bookmarks ───────────────────────────────────────────────
export const MOCK_BOOKMARKS = [
  { id: 1, user_id: 2, spoke_slug: 'slack-spoke',     name: 'Slack Spoke',           category: 'Communication', created_at: new Date(Date.now()-86400000).toISOString() },
  { id: 2, user_id: 2, spoke_slug: 'jira-spoke',      name: 'Jira Spoke',            category: 'DevOps',        created_at: new Date(Date.now()-43200000).toISOString() },
  { id: 3, user_id: 3, spoke_slug: 'pagerduty-spoke', name: 'PagerDuty Spoke',       category: 'Monitoring',    created_at: new Date(Date.now()-21600000).toISOString() },
];

// ── Error Logs ──────────────────────────────────────────────
export const MOCK_ERRORS = [
  { id: 1, message: 'n8n webhook timeout on sn-chatbot', source: 'chatbot', resolved: false, created_at: new Date(Date.now()-3600000).toISOString() },
  { id: 2, message: 'OpenRouter rate limit exceeded',    source: 'llm',     resolved: false, created_at: new Date(Date.now()-7200000).toISOString() },
  { id: 3, message: 'Redis connection failed, using memory fallback', source: 'redis', resolved: true, resolved_at: new Date(Date.now()-1800000).toISOString(), created_at: new Date(Date.now()-86400000).toISOString() },
];

// ── Spoke Submissions ───────────────────────────────────────
export const MOCK_SUBMISSIONS = [
  { id: 1, name: 'Twilio Spoke',    plugin_id: 'com.snc.twilio',    description: 'Send SMS and make voice calls from ServiceNow workflows using Twilio API. Supports OTP verification, mass notifications.', category: 'Communication', credential_type: 'API Key', min_version: 'Tokyo', status: 'pending', submitted_by: 'rahul@example.com', created_at: new Date(Date.now()-86400000).toISOString() },
  { id: 2, name: 'Notion Spoke',    plugin_id: 'com.snc.notion',    description: 'Create and update Notion pages from ServiceNow. Sync knowledge base articles and project documentation automatically.', category: 'DevOps',         credential_type: 'OAuth2',  min_version: 'Utah',  status: 'pending', submitted_by: 'priya@techcorp.com', created_at: new Date(Date.now()-43200000).toISOString() },
  { id: 3, name: 'WhatsApp Spoke',  plugin_id: 'com.snc.whatsapp', description: 'Send WhatsApp Business messages from ServiceNow. Support notifications, approvals, and two-way communication.', category: 'Communication', credential_type: 'API Key', min_version: 'Vancouver', status: 'approved', submitted_by: 'meera@itfirm.com', created_at: new Date(Date.now()-172800000).toISOString() },
];

// ── System Properties ───────────────────────────────────────
export const MOCK_PROPERTIES = [
  { id: 1, name: 'maintenance_mode',  value: 'false',        description: 'Enable/disable maintenance mode' },
  { id: 2, name: 'rate_limit_search', value: '50',           description: 'Search rate limit for free users per day' },
  { id: 3, name: 'ai_model',          value: 'meta-llama/llama-3.1-8b-instruct:free', description: 'Default OpenRouter model' },
  { id: 4, name: 'max_api_keys',      value: '5',            description: 'Max API keys per user' },
  { id: 5, name: 'pro_monthly_price', value: '999',          description: 'Pro plan monthly price in INR' },
];

// ── Health Snapshots ────────────────────────────────────────
export const MOCK_HEALTH_SNAPSHOTS = Array.from({ length: 7 }, (_, i) => ({
  id: i + 1,
  active_users:       Math.floor(Math.random() * 50) + 10,
  searches_last_hour: Math.floor(Math.random() * 200) + 20,
  errors_last_hour:   Math.floor(Math.random() * 5),
  db_connections:     Math.floor(Math.random() * 10) + 3,
  created_at:         new Date(Date.now() - (6 - i) * 86400000).toISOString(),
}));

// ── Notifications ───────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'New Pro Subscription',   message: 'Rahul Sharma upgraded to Pro plan. Revenue +₹999/month.', type: 'success', read_at: null, created_at: new Date(Date.now()-1800000).toISOString() },
  { id: 2, title: 'Error Spike Detected',   message: '5 errors in last 15 minutes. Check error logs.', type: 'error', read_at: null, created_at: new Date(Date.now()-3600000).toISOString() },
  { id: 3, title: 'New Spoke Submission',   message: 'Twilio Spoke submitted by rahul@example.com. Pending review.', type: 'info', read_at: null, created_at: new Date(Date.now()-7200000).toISOString() },
  { id: 4, title: 'Backup Completed',       message: 'Daily backup completed. Size: 45MB. Uploaded to R2.', type: 'success', read_at: new Date(Date.now()-1000).toISOString(), created_at: new Date(Date.now()-86400000).toISOString() },
];

// ── Referrals ───────────────────────────────────────────────
export const MOCK_REFERRALS = [
  { id: 1, referrer_id: 2, code: 'RAHUL1A2B', months_earned: 1, created_at: '2025-01-15T00:00:00Z' },
  { id: 2, referrer_id: 3, code: 'PRIYA3C4D', months_earned: 0, created_at: '2025-02-01T00:00:00Z' },
];

// ── Error Encyclopedia ──────────────────────────────────────
export const MOCK_ERROR_ENCYCLOPEDIA = [
  {
    id: 1, error_pattern: 'Transaction cancelled',
    title: 'Transaction Cancelled Error',
    description: 'Occurs when a GlideRecord operation exceeds the maximum allowed time or when a business rule causes an infinite loop.',
    root_cause: 'Long-running queries without setLimit(), or recursive business rule triggers.',
    fix_steps: ['Add gr.setLimit() before gr.query()', 'Check for recursive BR triggers', 'Use GlideAggregate for counts instead of getRowCount()'],
    category: 'Script', severity: 'high', verified: true, helpful_count: 45, view_count: 234,
  },
  {
    id: 2, error_pattern: 'Cannot read property of undefined',
    title: 'Null Reference in Client Script',
    description: 'Accessing a property on a null or undefined object in a client script.',
    root_cause: 'Not checking if g_form.getValue() or REST response is null before accessing properties.',
    fix_steps: ['Always null-check before accessing properties', 'Use optional chaining: obj?.property', 'Add defensive programming patterns'],
    category: 'Script', severity: 'medium', verified: true, helpful_count: 89, view_count: 567,
  },
  {
    id: 3, error_pattern: 'Integration Hub transaction limit',
    title: 'Integration Hub Transaction Limit Exceeded',
    description: 'Your ServiceNow subscription has run out of Integration Hub transactions for the billing period.',
    root_cause: 'Too many spoke executions or inefficient flows triggering multiple unnecessary API calls.',
    fix_steps: ['Review Flow Designer flows for unnecessary spoke calls', 'Add conditions to prevent duplicate executions', 'Contact ServiceNow to increase transaction limit', 'Optimize flows to batch operations'],
    category: 'Spoke', severity: 'critical', verified: true, helpful_count: 123, view_count: 789,
  },
];

// ── Feature Flags ───────────────────────────────────────────
export const MOCK_FLAGS = [
  { id: 1, name: 'ai_code_generator',  enabled: true,  description: 'Enable AI code generator tool' },
  { id: 2, name: 'script_linter',      enabled: true,  description: 'Enable script linter tool' },
  { id: 3, name: 'community_submissions', enabled: true, description: 'Allow community spoke submissions' },
  { id: 4, name: 'referral_system',    enabled: true,  description: 'Enable referral rewards system' },
  { id: 5, name: 'team_features',      enabled: false, description: 'Enable team/org features (enterprise only)' },
];

// ── API Keys ────────────────────────────────────────────────
export const MOCK_API_KEYS = [
  { id: 1, user_id: 2, name: 'Production App', key_prefix: 'snsk_a1b2c3d4', is_active: true, last_used_at: new Date(Date.now()-3600000).toISOString(), created_at: '2025-01-20T00:00:00Z' },
  { id: 2, user_id: 2, name: 'Dev Testing',    key_prefix: 'snsk_e5f6g7h8', is_active: true, last_used_at: null, created_at: '2025-02-01T00:00:00Z' },
];

// ── Webhooks ────────────────────────────────────────────────
export const MOCK_WEBHOOKS = [
  { id: 1, name: 'Slack Alerts', url: 'https://hooks.slack.com/services/xxx', events: ['error_spike', 'backup_failed', 'new_user'], created_at: '2025-01-01T00:00:00Z' },
  { id: 2, name: 'Revenue Monitor', url: 'https://hooks.slack.com/services/yyy', events: ['plan_upgrade'], created_at: '2025-02-01T00:00:00Z' },
];

// ── Announcements ───────────────────────────────────────────
export const MOCK_ANNOUNCEMENTS = [
  { id: 1, title: '🚀 snspokes v18 is live!', message: 'Command Center, Live Activity Feed, and Quick Actions are now available. Check the admin panel!', type: 'info', is_active: true, created_at: new Date().toISOString() },
  { id: 2, title: '🎁 Refer a developer, get 1 month free', message: 'Share your referral link from the dashboard. When they upgrade to Pro, you both get a free month!', type: 'success', is_active: true, created_at: new Date(Date.now()-86400000).toISOString() },
];

// ── Command Center Stats ────────────────────────────────────
export const MOCK_COMMAND_CENTER = {
  success: true,
  timestamp: new Date().toISOString(),
  stats: {
    total_users: 8,
    new_users_today: 2,
    total_revenue: 11995,
    active_subs: 5,
    searches_today: 47,
    code_gens_today: 12,
    open_errors: 2,
    pending_submissions: 2,
    db_size: '24 MB',
  },
  plan_distribution: [
    { plan: 'free', count: '3' },
    { plan: 'pro', count: '3' },
    { plan: 'enterprise', count: '2' },
  ],
  recent_users:   MOCK_USERS.slice(0, 5),
  recent_searches: MOCK_SEARCHES.slice(0, 5),
  recent_errors:   MOCK_ERRORS.filter(e => !e.resolved).slice(0, 3),
  top_searches: [
    { query: 'slack', count: '23' },
    { query: 'jira', count: '18' },
    { query: 'microsoft teams', count: '15' },
    { query: 'pagerduty', count: '11' },
    { query: 'aws', count: '9' },
  ],
};
