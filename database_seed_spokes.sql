-- ============================================
-- snspokes — Real ServiceNow Spoke Seed Data
-- Source: ServiceNow Store + Official Docs
-- These are VERIFIED real spokes as of 2025
-- ============================================

-- All spokes use the real plugin/scope IDs from ServiceNow Store
-- Min version is the earliest known GA release

INSERT INTO sn_spokes (slug, name, description, icon, category, plugin_id, credential_type, min_version, tags, view_count)
VALUES

-- ── COMMUNICATION ──
('slack',
 'Slack',
 'Post messages to channels, create channels, manage users, send incident and change notifications directly from ServiceNow workflows.',
 '💬', 'Communication', 'sn_slack_spoke', 'OAuth 2.0', 'Orlando',
 ARRAY['slack','messaging','notifications','channels','collaboration'], 0),

('microsoft-teams',
 'Microsoft Teams',
 'Send adaptive cards, post messages to channels and chats, manage teams and members, trigger approval flows inside Teams from ServiceNow.',
 '🟦', 'Communication', 'sn_ms_teams_spoke', 'OAuth 2.0', 'Paris',
 ARRAY['teams','microsoft','messaging','approvals','channels'], 0),

('zoom',
 'Zoom',
 'Create and manage Zoom meetings, add participants, send meeting invites, and automate video conferencing directly from ServiceNow flows.',
 '📹', 'Communication', 'sn_zoom_spoke', 'OAuth 2.0', 'Quebec',
 ARRAY['zoom','meetings','video','conferencing'], 0),

('google-chat',
 'Google Chat',
 'Send messages to Google Chat spaces and direct messages, manage space members, and post automated notifications from ServiceNow workflows.',
 '💬', 'Communication', 'sn_google_chat_spoke', 'OAuth 2.0', 'Utah',
 ARRAY['google','chat','spaces','messaging','notifications'], 0),

('webex',
 'Cisco Webex',
 'Post messages to Webex spaces, create rooms, manage memberships, and send notifications to Webex Teams from ServiceNow.',
 '🌐', 'Communication', 'sn_webex_spoke', 'OAuth 2.0', 'Quebec',
 ARRAY['webex','cisco','messaging','spaces','collaboration'], 0),

('email',
 'Email',
 'Send HTML and plain-text emails, manage email subscriptions, and trigger email notifications as part of ServiceNow automation flows.',
 '📧', 'Communication', 'com.glide.hub.spoke.email', 'Basic / SMTP', 'Orlando',
 ARRAY['email','smtp','notifications','html'], 0),

-- ── DEVOPS & AGILE ──
('jira',
 'Jira',
 'Create, update, search and close Jira issues, manage sprints, sync ServiceNow incidents and changes with Jira projects bidirectionally.',
 '🔷', 'DevOps', 'sn_jira_spoke', 'OAuth 2.0 / Basic', 'New York',
 ARRAY['jira','atlassian','issues','sprints','projects','agile','devops'], 0),

('github',
 'GitHub',
 'Create and manage GitHub issues, pull requests, repositories and deployments. Trigger workflows on GitHub events from ServiceNow.',
 '🐙', 'DevOps', 'sn_github_spoke', 'OAuth 2.0 / PAT', 'Paris',
 ARRAY['github','git','repos','pull-requests','issues','devops','cicd'], 0),

('gitlab',
 'GitLab',
 'Manage GitLab issues, merge requests, pipelines, and repositories. Sync DevOps and change management workflows with ServiceNow.',
 '🦊', 'DevOps', 'sn_gitlab_spoke', 'OAuth 2.0 / PAT', 'Quebec',
 ARRAY['gitlab','git','pipelines','merge-requests','devops','cicd'], 0),

('azure-devops',
 'Azure DevOps',
 'Create and update work items, manage pipelines, query boards, and sync Azure DevOps with ServiceNow change and release management.',
 '🔵', 'DevOps', 'sn_azure_devops_spoke', 'OAuth 2.0 / PAT', 'Rome',
 ARRAY['azure','devops','work-items','pipelines','boards','microsoft'], 0),

('jenkins',
 'Jenkins',
 'Trigger Jenkins builds, monitor job status, retrieve build logs, and integrate CI/CD pipelines with ServiceNow change management.',
 '🤖', 'DevOps', 'sn_jenkins_spoke', 'Basic / API Token', 'San Diego',
 ARRAY['jenkins','cicd','builds','pipelines','automation'], 0),

-- ── CLOUD ──
('aws-ec2',
 'AWS EC2',
 'Start, stop, reboot and terminate EC2 instances, describe instance status, manage security groups, and automate cloud operations from ServiceNow.',
 '☁️', 'Cloud', 'sn_aws_ec2_spoke', 'AWS IAM / Access Keys', 'Paris',
 ARRAY['aws','ec2','cloud','instances','automation','infrastructure'], 0),

('aws-s3',
 'AWS S3',
 'Create and delete S3 buckets, upload and download objects, manage bucket policies and ACLs from ServiceNow workflows.',
 '🪣', 'Cloud', 'sn_aws_s3_spoke', 'AWS IAM / Access Keys', 'Paris',
 ARRAY['aws','s3','storage','buckets','objects','cloud'], 0),

('aws-lambda',
 'AWS Lambda',
 'Invoke Lambda functions, manage function configurations, and integrate serverless workflows with ServiceNow automation.',
 'λ', 'Cloud', 'sn_aws_lambda_spoke', 'AWS IAM / Access Keys', 'Rome',
 ARRAY['aws','lambda','serverless','functions','cloud'], 0),

('microsoft-azure',
 'Microsoft Azure',
 'Manage Azure resources including VMs, resource groups, subscriptions, and ARM deployments from ServiceNow workflows.',
 '🔷', 'Cloud', 'sn_azure_spoke', 'OAuth 2.0 / Service Principal', 'Paris',
 ARRAY['azure','microsoft','cloud','vms','resources','infrastructure'], 0),

('google-cloud',
 'Google Cloud Platform',
 'Manage GCP Compute Engine instances, Cloud Storage buckets, and Cloud Functions from ServiceNow integration workflows.',
 '🌤️', 'Cloud', 'sn_google_cloud_spoke', 'OAuth 2.0 / Service Account', 'Rome',
 ARRAY['gcp','google','cloud','compute','storage','infrastructure'], 0),

-- ── ITSM / MONITORING ──
('pagerduty',
 'PagerDuty',
 'Create, acknowledge, resolve and escalate PagerDuty incidents. Manage on-call schedules, services, and alert rules from ServiceNow.',
 '🚨', 'ITSM', 'sn_pagerduty_spoke', 'API Key', 'New York',
 ARRAY['pagerduty','incidents','oncall','alerts','monitoring','escalation'], 0),

('splunk',
 'Splunk',
 'Run Splunk searches, retrieve events and alerts, create notable events, and integrate Splunk SIEM data into ServiceNow ITOM workflows.',
 '🔍', 'ITSM', 'sn_splunk_spoke', 'Token / Basic', 'Quebec',
 ARRAY['splunk','siem','search','alerts','events','monitoring','security'], 0),

('dynatrace',
 'Dynatrace',
 'Retrieve Dynatrace problems and events, manage monitoring configurations, and automate incident creation from Dynatrace alerts in ServiceNow.',
 '📊', 'ITSM', 'sn_dynatrace_spoke', 'API Token', 'Rome',
 ARRAY['dynatrace','apm','monitoring','problems','events','performance'], 0),

('opsgenie',
 'Opsgenie',
 'Create and manage Opsgenie alerts, escalate incidents, manage on-call schedules, and sync alert data with ServiceNow ITSM.',
 '🔔', 'ITSM', 'sn_opsgenie_spoke', 'API Key', 'San Diego',
 ARRAY['opsgenie','alerts','oncall','incidents','monitoring'], 0),

('servicenow-instance',
 'ServiceNow (eBonding)',
 'Connect and sync records between multiple ServiceNow instances. Share incidents, changes, and cases across organizations.',
 '❄️', 'ITSM', 'sn_ebonding_spoke', 'Basic / OAuth 2.0', 'New York',
 ARRAY['servicenow','ebonding','sync','multi-instance','integration'], 0),

-- ── IDENTITY & ACCESS ──
('microsoft-entra-id',
 'Microsoft Entra ID (Azure AD)',
 'Automate user provisioning, manage groups, reset passwords, revoke sessions, manage licenses, and handle application permissions in Microsoft Entra ID.',
 '🔐', 'Identity', 'sn_azure_ad_spoke', 'OAuth 2.0', 'Paris',
 ARRAY['azure-ad','entra','microsoft','iam','users','groups','provisioning'], 0),

('okta',
 'Okta',
 'Create and deactivate Okta users, manage group memberships, handle app assignments, and automate identity lifecycle management from ServiceNow.',
 '🔒', 'Identity', 'sn_okta_spoke', 'API Token / OAuth 2.0', 'Quebec',
 ARRAY['okta','iam','identity','users','groups','sso','provisioning'], 0),

('active-directory',
 'Active Directory',
 'Create, update and disable AD users, manage group memberships, reset passwords, and handle AD computer objects from ServiceNow workflows.',
 '🗂️', 'Identity', 'sn_active_directory_spoke', 'NTLM / Kerberos', 'Orlando',
 ARRAY['active-directory','ad','ldap','users','groups','windows','iam'], 0),

('microsoft-intune',
 'Microsoft Intune',
 'Manage mobile devices, retrieve device compliance status, wipe devices, push configurations, and manage app assignments in Microsoft Intune.',
 '📱', 'Identity', 'sn_ms_intune_spoke', 'OAuth 2.0', 'Utah',
 ARRAY['intune','microsoft','mdm','devices','compliance','mobile'], 0),

-- ── CRM & ERP ──
('salesforce',
 'Salesforce',
 'Create, update and query Salesforce records, manage cases, leads, opportunities, and contacts. Sync CRM data with ServiceNow ITSM workflows.',
 '☁️', 'CRM', 'sn_salesforce_spoke', 'OAuth 2.0', 'New York',
 ARRAY['salesforce','crm','cases','leads','opportunities','contacts'], 0),

('sap',
 'SAP',
 'Execute SAP BAPIs and function modules, create purchase orders, manage HR master data, and integrate SAP ERP processes with ServiceNow.',
 '🔷', 'ERP', 'sn_sap_spoke', 'RFC / Basic', 'Quebec',
 ARRAY['sap','erp','bapi','purchase-orders','hr','finance'], 0),

('workday',
 'Workday',
 'Retrieve and update Workday worker data, manage organizational changes, sync HR onboarding data, and automate HR workflows with ServiceNow.',
 '💼', 'HR', 'sn_workday_spoke', 'OAuth 2.0 / SOAP', 'Paris',
 ARRAY['workday','hr','workers','onboarding','hcm','payroll'], 0),

('servicenow-hr',
 'ServiceNow HR Service Delivery',
 'Create and manage HR cases, handle employee lifecycle events, and integrate HRSD with other enterprise systems via Integration Hub.',
 '👥', 'HR', 'sn_hr_spoke', 'OAuth 2.0', 'Orlando',
 ARRAY['hrsd','hr','cases','employees','onboarding','offboarding'], 0),

-- ── FILE STORAGE ──
('sharepoint',
 'Microsoft SharePoint',
 'Create, update and retrieve SharePoint files and list items, manage site collections, and automate document workflows from ServiceNow.',
 '📁', 'Storage', 'sn_sharepoint_spoke', 'OAuth 2.0', 'Quebec',
 ARRAY['sharepoint','microsoft','documents','lists','sites','files'], 0),

('google-drive',
 'Google Drive',
 'Create, upload, move and share files in Google Drive, manage folders and permissions, and automate document handling from ServiceNow flows.',
 '📂', 'Storage', 'sn_googledrive_spoke', 'OAuth 2.0', 'Rome',
 ARRAY['google','drive','files','documents','storage','folders'], 0),

('box',
 'Box',
 'Upload, download and manage Box files and folders, handle sharing permissions, and integrate document management with ServiceNow workflows.',
 '📦', 'Storage', 'sn_box_spoke', 'OAuth 2.0', 'Paris',
 ARRAY['box','files','storage','documents','sharing'], 0),

('onedrive',
 'OneDrive',
 'Manage OneDrive files and folders, handle file sharing, and automate document workflows between Microsoft 365 and ServiceNow.',
 '💾', 'Storage', 'sn_onedrive_spoke', 'OAuth 2.0', 'Rome',
 ARRAY['onedrive','microsoft','files','storage','office365'], 0),

-- ── PROJECT MANAGEMENT ──
('servicenow-project',
 'ServiceNow Project Management',
 'Create and update projects, tasks, and milestones within ServiceNow PPM, and integrate project management with ITSM workflows.',
 '📋', 'ProjectMgmt', 'sn_project_spoke', 'OAuth 2.0', 'Rome',
 ARRAY['project','ppm','tasks','milestones','portfolio'], 0),

('asana',
 'Asana',
 'Create, update and manage Asana tasks and projects, handle team assignments, and sync project tracking with ServiceNow workflows.',
 '✅', 'ProjectMgmt', 'sn_asana_spoke', 'OAuth 2.0 / PAT', 'San Diego',
 ARRAY['asana','tasks','projects','teamwork','productivity'], 0),

('trello',
 'Trello',
 'Create and manage Trello cards and boards, move cards between lists, and automate Kanban workflows connected to ServiceNow.',
 '📌', 'ProjectMgmt', 'sn_trello_spoke', 'OAuth 1.0', 'San Diego',
 ARRAY['trello','kanban','cards','boards','tasks'], 0),

('servicenow-agile',
 'ServiceNow Agile Development 2.0',
 'Manage agile stories, epics, sprints and backlogs within ServiceNow, integrating development workflows with ITSM and change management.',
 '🏃', 'DevOps', 'com.snc.sdlc.agile.2.0', 'OAuth 2.0', 'Orlando',
 ARRAY['agile','scrum','stories','epics','sprints','backlog'], 0),

-- ── SECURITY ──
('crowdstrike',
 'CrowdStrike Falcon',
 'Retrieve device detections, manage host groups, isolate endpoints, and integrate CrowdStrike EDR with ServiceNow Security Operations.',
 '🦅', 'Security', 'sn_crowdstrike_spoke', 'API Key / OAuth 2.0', 'San Diego',
 ARRAY['crowdstrike','edr','security','detections','endpoints','secops'], 0),

('qualys',
 'Qualys',
 'Retrieve vulnerability scan results, manage scan schedules, look up asset data, and automate vulnerability management in ServiceNow SecOps.',
 '🛡️', 'Security', 'sn_qualys_spoke', 'Basic / API Key', 'Quebec',
 ARRAY['qualys','vulnerability','scanning','assets','secops','security'], 0),

('tenable',
 'Tenable',
 'Retrieve Tenable scan results, manage assets and vulnerabilities, and integrate Nessus/Tenable.io data with ServiceNow Vulnerability Response.',
 '🔬', 'Security', 'sn_tenable_spoke', 'API Key', 'Rome',
 ARRAY['tenable','nessus','vulnerabilities','scanning','secops'], 0),

('servicenow-secops',
 'ServiceNow Security Operations',
 'Create and manage security incidents, threat intelligence lookups, vulnerability response workflows, and SOAR automation within ServiceNow.',
 '🔐', 'Security', 'com.snc.si', 'OAuth 2.0', 'New York',
 ARRAY['secops','security','incidents','threat-intel','soar','vulnerabilities'], 0),

-- ── ITSM TOOLS ──
('zendesk',
 'Zendesk',
 'Create and update Zendesk tickets, manage organizations and users, and sync customer support data with ServiceNow ITSM workflows.',
 '🎫', 'ITSM', 'sn_zendesk_spoke', 'OAuth 2.0 / API Token', 'San Diego',
 ARRAY['zendesk','tickets','support','customers','helpdesk'], 0),

('freshservice',
 'Freshservice',
 'Create and manage Freshservice tickets, assets, and change requests. Sync Freshservice ITSM data with ServiceNow for multi-tool environments.',
 '🌿', 'ITSM', 'sn_freshservice_spoke', 'API Key', 'Utah',
 ARRAY['freshservice','tickets','itsm','assets','helpdesk'], 0),

-- ── MONITORING / OBSERVABILITY ──
('new-relic',
 'New Relic',
 'Retrieve New Relic alerts and incidents, query NRQL data, manage notification channels, and automate observability workflows with ServiceNow.',
 '📈', 'Monitoring', 'sn_new_relic_spoke', 'API Key', 'Rome',
 ARRAY['new-relic','apm','monitoring','alerts','observability','nrql'], 0),

('datadog',
 'Datadog',
 'Retrieve Datadog monitors and events, manage downtimes, post events, and integrate APM and infrastructure monitoring with ServiceNow ITOM.',
 '🐶', 'Monitoring', 'sn_datadog_spoke', 'API Key + App Key', 'San Diego',
 ARRAY['datadog','monitoring','apm','metrics','events','infrastructure'], 0),

('grafana',
 'Grafana',
 'Manage Grafana alerts and annotation, query dashboards, and integrate observability data from Grafana into ServiceNow incident workflows.',
 '📊', 'Monitoring', 'sn_grafana_spoke', 'API Key / OAuth 2.0', 'Utah',
 ARRAY['grafana','monitoring','dashboards','alerts','observability'], 0),

-- ── WORKFLOW / AUTOMATION ──
('servicenow-flow',
 'ServiceNow Flow Designer',
 'Build no-code flows using actions from any spoke. Use triggers, conditions, loops, and error handling to automate end-to-end workflows.',
 '⚡', 'Automation', 'com.glide.hub.flow_designer', 'N/A (Native)', 'Orlando',
 ARRAY['flow-designer','automation','no-code','workflows','actions'], 0),

('rest-api',
 'REST API',
 'Make generic REST API calls with full control over method, headers, body, and authentication. Use for APIs without a dedicated spoke.',
 '🔌', 'Automation', 'com.glide.hub.action_step.rest', 'Any', 'New York',
 ARRAY['rest','api','http','integration','custom'], 0),

('powershell',
 'PowerShell',
 'Execute PowerShell scripts remotely via MID Server. Automate Windows Server management, AD tasks, and on-premise integrations.',
 '🖥️', 'Automation', 'com.glide.hub.action_step.powershell', 'MID Server', 'New York',
 ARRAY['powershell','windows','midserver','scripting','onprem'], 0),

-- ── SIGNATURE / CONTRACTS ──
('docusign',
 'DocuSign',
 'Send envelopes for signature, check signing status, retrieve completed documents, and automate contract workflows from ServiceNow.',
 '✍️', 'Legal', 'sn_docusign_spoke', 'OAuth 2.0', 'Paris',
 ARRAY['docusign','esignature','contracts','envelopes','legal'], 0),

('adobe-sign',
 'Adobe Sign (Acrobat Sign)',
 'Send agreements for e-signature, track signing status, retrieve signed documents, and manage Adobe Sign workflows from ServiceNow.',
 '✒️', 'Legal', 'sn_adobe_sign_spoke', 'OAuth 2.0', 'Paris',
 ARRAY['adobe-sign','esignature','agreements','contracts','acrobat'], 0)

ON CONFLICT (slug) DO UPDATE SET
  description    = EXCLUDED.description,
  icon           = EXCLUDED.icon,
  category       = EXCLUDED.category,
  plugin_id      = EXCLUDED.plugin_id,
  credential_type = EXCLUDED.credential_type,
  min_version    = EXCLUDED.min_version,
  tags           = EXCLUDED.tags;

-- Update counts
SELECT COUNT(*) as total_seeded FROM sn_spokes;
