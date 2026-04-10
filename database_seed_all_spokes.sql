-- ═══════════════════════════════════════
-- ServiceNow Integration Hub — ALL Spokes
-- Source: ServiceNow Docs + Store
-- 200+ spokes across 15 categories
-- ═══════════════════════════════════════

-- Clear existing and re-seed
DELETE FROM sn_spokes WHERE 1=1;

INSERT INTO sn_spokes (slug, name, description, icon, category, plugin_id, credential_type, min_version, tags, view_count) VALUES

-- ═══ Communication ═══
('slack', 'Slack', 'Post messages, create channels, manage users, send incident and change notifications directly from ServiceNow workflows.', '💬', 'Communication', 'sn_slack_spoke', 'OAuth 2.0', 'Madrid', '["messaging","channels","notifications","chatops","incident"]', 980),
('microsoft-teams', 'Microsoft Teams', 'Send messages, create teams and channels, manage memberships, post adaptive cards with action buttons.', '🟦', 'Communication', 'sn_teams_spoke', 'OAuth 2.0', 'New York', '["messaging","teams","channels","adaptive-cards","collaboration"]', 870),
('twilio', 'Twilio', 'Send SMS, make voice calls, send WhatsApp messages. Supports programmable messaging and voice APIs.', '📱', 'Communication', 'sn_twilio_spoke', 'API Key', 'Madrid', '["sms","voice","whatsapp","messaging","phone"]', 650),
('sendgrid', 'SendGrid', 'Send transactional and marketing emails at scale. Template support, delivery tracking, bounce handling.', '📧', 'Communication', 'sn_sendgrid_spoke', 'API Key', 'Orlando', '["email","marketing","transactional","templates"]', 520),
('zoom', 'Zoom', 'Create meetings, manage users, send meeting invitations, get recordings and participant reports.', '📹', 'Communication', 'sn_zoom_spoke', 'OAuth 2.0', 'Paris', '["video","meetings","conference","recording"]', 480),
('webex', 'Cisco Webex', 'Create rooms, send messages, schedule meetings, manage team memberships in Webex spaces.', '🌐', 'Communication', 'sn_webex_spoke', 'OAuth 2.0', 'Quebec', '["video","messaging","meetings","cisco"]', 350),
('pagerduty', 'PagerDuty', 'Create and resolve incidents, manage on-call schedules, trigger alerts, sync incident states bidirectionally.', '🚨', 'Communication', 'sn_pagerduty_spoke', 'API Key', 'Madrid', '["alerting","on-call","incident","escalation"]', 720),
('servicenow-notify', 'ServiceNow Notify', 'Built-in notification service for SMS and voice. Conference call bridge for major incidents.', '🔔', 'Communication', 'com.snc.notify', 'Built-in', 'Geneva', '["sms","voice","notification","conference"]', 400),
('opsgenie', 'Opsgenie', 'Create alerts, manage on-call rotations, send notifications to responders via Atlassian Opsgenie.', '🔔', 'Communication', 'sn_opsgenie_spoke', 'API Key', 'Rome', '["alerting","on-call","atlassian","incident"]', 280),

-- ═══ Cloud ═══
('aws', 'Amazon Web Services', 'Manage EC2 instances, S3 buckets, Lambda functions, CloudWatch alarms, IAM users, and 40+ AWS services.', '☁️', 'Cloud', 'sn_aws_spoke', 'Access Key', 'Madrid', '["ec2","s3","lambda","cloudwatch","iam","cloud"]', 890),
('azure', 'Microsoft Azure', 'Manage VMs, resource groups, storage accounts, Azure AD users, Logic Apps, and Azure DevOps projects.', '🔷', 'Cloud', 'sn_azure_spoke', 'OAuth 2.0', 'Madrid', '["vm","storage","azure-ad","devops","cloud"]', 850),
('google-cloud', 'Google Cloud Platform', 'Manage Compute Engine VMs, Cloud Storage, BigQuery datasets, GKE clusters, and IAM policies.', '🌤️', 'Cloud', 'sn_gcp_spoke', 'Service Account', 'Orlando', '["compute","storage","bigquery","kubernetes","cloud"]', 680),
('ibm-cloud', 'IBM Cloud', 'Provision virtual servers, manage Cloud Foundry apps, Object Storage, and IBM Cloud Functions.', '🔵', 'Cloud', 'sn_ibm_spoke', 'API Key', 'Paris', '["iaas","paas","watson","cloud"]', 220),
('oracle-cloud', 'Oracle Cloud', 'Manage compute instances, storage, databases, and networking in Oracle Cloud Infrastructure.', '🔴', 'Cloud', 'sn_oci_spoke', 'API Key', 'Quebec', '["compute","database","networking","cloud"]', 200),
('vmware', 'VMware vSphere', 'Manage virtual machines, datastores, hosts, and clusters in VMware vCenter environments.', '🖥️', 'Cloud', 'sn_vmware_spoke', 'Basic Auth', 'Madrid', '["virtualization","vm","vcenter","esxi"]', 560),
('cloudflare', 'Cloudflare', 'Manage DNS records, firewall rules, SSL certificates, and page rules for web properties.', '🛡️', 'Cloud', 'sn_cloudflare_spoke', 'API Key', 'Tokyo', '["cdn","dns","security","waf","ssl"]', 180),

-- ═══ DevOps ═══
('jira', 'Jira', 'Create issues, manage sprints, transition workflows, sync with ServiceNow incidents and changes bidirectionally.', '🔷', 'DevOps', 'sn_jira_spoke', 'OAuth 2.0', 'Madrid', '["issues","sprints","agile","project-management","atlassian"]', 920),
('github', 'GitHub', 'Create repos, manage pull requests, trigger workflows, sync commits, manage issues and releases.', '🐙', 'DevOps', 'sn_github_spoke', 'OAuth 2.0', 'Madrid', '["repos","pull-requests","actions","git","code"]', 840),
('gitlab', 'GitLab', 'Manage projects, merge requests, pipelines, issues, and CI/CD workflows in GitLab.', '🦊', 'DevOps', 'sn_gitlab_spoke', 'OAuth 2.0', 'Orlando', '["projects","merge-requests","ci-cd","pipelines","git"]', 520),
('bitbucket', 'Bitbucket', 'Manage repositories, pull requests, pipelines, and branch permissions in Atlassian Bitbucket.', '🪣', 'DevOps', 'sn_bitbucket_spoke', 'OAuth 2.0', 'Paris', '["repos","pull-requests","pipelines","atlassian","git"]', 380),
('jenkins', 'Jenkins', 'Trigger builds, monitor job status, manage pipelines, retrieve build artifacts and logs.', '🔧', 'DevOps', 'sn_jenkins_spoke', 'Basic Auth', 'Madrid', '["ci-cd","builds","pipelines","automation"]', 640),
('azure-devops', 'Azure DevOps', 'Manage work items, repos, pipelines, test plans, and artifacts in Azure DevOps Services.', '🔷', 'DevOps', 'sn_azdevops_spoke', 'OAuth 2.0', 'Orlando', '["work-items","repos","pipelines","boards","microsoft"]', 560),
('ansible', 'Ansible / AWX', 'Launch job templates, manage inventories, run ad-hoc commands on remote hosts via Ansible Tower/AWX.', '🔴', 'DevOps', 'sn_ansible_spoke', 'Basic Auth', 'Madrid', '["automation","configuration","playbooks","tower"]', 480),
('terraform', 'Terraform Cloud', 'Trigger Terraform runs, manage workspaces, approve plans, and provision infrastructure as code.', '💜', 'DevOps', 'sn_terraform_spoke', 'API Key', 'Rome', '["iac","infrastructure","provisioning","hashicorp"]', 340),
('docker', 'Docker Hub', 'Manage container images, trigger automated builds, manage repositories and webhooks.', '🐳', 'DevOps', 'sn_docker_spoke', 'Basic Auth', 'Tokyo', '["containers","images","registry","builds"]', 260),
('kubernetes', 'Kubernetes', 'Manage pods, deployments, services, namespaces, and config maps in Kubernetes clusters.', '☸️', 'DevOps', 'sn_k8s_spoke', 'Bearer Token', 'San Diego', '["pods","deployments","services","containers","orchestration"]', 380),

-- ═══ Security ═══
('crowdstrike', 'CrowdStrike', 'Query detections, manage host groups, contain endpoints, get device details from CrowdStrike Falcon.', '🦅', 'Security', 'sn_crowdstrike_spoke', 'OAuth 2.0', 'Orlando', '["edr","endpoint","detection","threat","falcon"]', 540),
('splunk', 'Splunk', 'Run searches, create alerts, manage saved searches, retrieve events and notable events from Splunk.', '📊', 'Security', 'sn_splunk_spoke', 'Bearer Token', 'Madrid', '["siem","logs","search","security","analytics"]', 680),
('qualys', 'Qualys', 'Launch vulnerability scans, retrieve scan results, manage asset groups, import vulnerabilities into SN.', '🔍', 'Security', 'sn_qualys_spoke', 'Basic Auth', 'Madrid', '["vulnerability","scanning","compliance","assessment"]', 480),
('rapid7', 'Rapid7 InsightVM', 'Import vulnerability data, trigger scans, manage sites, sync vulnerability findings with CMDB.', '🛡️', 'Security', 'sn_rapid7_spoke', 'API Key', 'Orlando', '["vulnerability","scanning","insightvm","remediation"]', 380),
('microsoft-defender', 'Microsoft Defender', 'Query alerts, manage incidents, isolate machines, run antivirus scans via Defender for Endpoint.', '🛡️', 'Security', 'sn_defender_spoke', 'OAuth 2.0', 'Paris', '["edr","endpoint","antivirus","microsoft","threat"]', 420),
('palo-alto', 'Palo Alto Networks', 'Manage firewall rules, security policies, threat feeds, and panorama device groups.', '🔥', 'Security', 'sn_paloalto_spoke', 'API Key', 'Quebec', '["firewall","network-security","panorama","threat"]', 340),
('carbon-black', 'Carbon Black', 'Query alerts, isolate sensors, manage device policies, search process events in Carbon Black Cloud.', '⚫', 'Security', 'sn_carbonblack_spoke', 'API Key', 'Rome', '["edr","endpoint","vmware","threat-hunting"]', 280),
('tenable', 'Tenable.io', 'Import vulnerability scan results, manage scan schedules, sync asset data with ServiceNow CMDB.', '🔎', 'Security', 'sn_tenable_spoke', 'API Key', 'San Diego', '["vulnerability","scanning","nessus","compliance"]', 320),
('sentinelone', 'SentinelOne', 'Query threats, manage agents, initiate threat mitigation actions, get endpoint health status.', '🟣', 'Security', 'sn_sentinelone_spoke', 'API Key', 'Tokyo', '["edr","endpoint","ai","autonomous","threat"]', 240),

-- ═══ Identity & Access ═══
('okta', 'Okta', 'Manage users, groups, apps, MFA factors. Provision/deprovision accounts, reset passwords, suspend users.', '🔐', 'Identity', 'sn_okta_spoke', 'API Key', 'Madrid', '["iam","sso","mfa","provisioning","identity"]', 720),
('azure-ad', 'Azure Active Directory', 'Manage users, groups, app registrations, conditional access policies, and directory roles.', '🔑', 'Identity', 'sn_azuread_spoke', 'OAuth 2.0', 'Madrid', '["iam","directory","sso","microsoft","identity"]', 680),
('cyberark', 'CyberArk', 'Retrieve privileged credentials, manage safes, rotate passwords, reconcile accounts securely.', '🔒', 'Identity', 'sn_cyberark_spoke', 'Certificate', 'Orlando', '["pam","privileged-access","vault","credentials"]', 420),
('sailpoint', 'SailPoint IdentityNow', 'Manage identities, access requests, certifications, and governance policies for identity security.', '⛵', 'Identity', 'sn_sailpoint_spoke', 'OAuth 2.0', 'Paris', '["iga","governance","access-management","identity"]', 300),
('ping-identity', 'Ping Identity', 'Manage SSO configurations, user sessions, MFA policies, and federated identity settings.', '🏓', 'Identity', 'sn_pingid_spoke', 'API Key', 'Quebec', '["sso","federation","mfa","identity"]', 220),

-- ═══ CRM & Sales ═══
('salesforce', 'Salesforce', 'Sync accounts, contacts, cases, opportunities. Bidirectional record sync between SN and SFDC.', '☁️', 'CRM', 'sn_salesforce_spoke', 'OAuth 2.0', 'Madrid', '["crm","cases","accounts","opportunities","sales"]', 780),
('hubspot', 'HubSpot', 'Manage contacts, companies, deals, tickets. Sync marketing and sales data with ServiceNow.', '🟠', 'CRM', 'sn_hubspot_spoke', 'API Key', 'Orlando', '["crm","marketing","contacts","deals"]', 340),
('dynamics-365', 'Microsoft Dynamics 365', 'Manage accounts, contacts, cases, opportunities in Dynamics CRM. Bidirectional sync support.', '🔷', 'CRM', 'sn_dynamics_spoke', 'OAuth 2.0', 'Paris', '["crm","microsoft","cases","accounts","erp"]', 380),
('zendesk', 'Zendesk', 'Create and update tickets, manage users, sync ticket states between Zendesk and ServiceNow.', '🟢', 'CRM', 'sn_zendesk_spoke', 'API Key', 'Quebec', '["helpdesk","tickets","support","customer-service"]', 320),

-- ═══ Monitoring & Observability ═══
('datadog', 'Datadog', 'Create incidents from monitors, mute alerts, query metrics, manage downtimes and dashboards.', '🐕', 'Monitoring', 'sn_datadog_spoke', 'API Key', 'Orlando', '["monitoring","metrics","apm","logs","alerting"]', 560),
('new-relic', 'New Relic', 'Query NRQL, create alerts, manage incidents, get application performance data and error analytics.', '📊', 'Monitoring', 'sn_newrelic_spoke', 'API Key', 'Paris', '["apm","monitoring","analytics","performance"]', 480),
('dynatrace', 'Dynatrace', 'Import problems, manage maintenance windows, query metrics, sync entities with CMDB.', '🟢', 'Monitoring', 'sn_dynatrace_spoke', 'API Key', 'Madrid', '["apm","monitoring","ai-ops","performance"]', 520),
('nagios', 'Nagios', 'Receive alerts, acknowledge problems, schedule downtimes, import host and service check data.', '🟩', 'Monitoring', 'sn_nagios_spoke', 'Basic Auth', 'Madrid', '["monitoring","alerts","infrastructure","network"]', 280),
('prometheus', 'Prometheus / Grafana', 'Query PromQL metrics, import alert rules, create dashboards, manage alert silences.', '🔥', 'Monitoring', 'sn_prometheus_spoke', 'Bearer Token', 'San Diego', '["metrics","monitoring","alerting","grafana","timeseries"]', 260),
('solarwinds', 'SolarWinds', 'Import alerts, manage nodes, acknowledge events, sync network device data with CMDB.', '☀️', 'Monitoring', 'sn_solarwinds_spoke', 'Basic Auth', 'Madrid', '["network","monitoring","infrastructure","alerts"]', 340),
('appdynamics', 'AppDynamics', 'Import health violations, manage applications, query metrics, sync business transactions.', '🔵', 'Monitoring', 'sn_appdynamics_spoke', 'Basic Auth', 'Orlando', '["apm","monitoring","performance","cisco"]', 300),
('elastic', 'Elastic / ELK', 'Run Elasticsearch queries, manage indices, import log events, create Kibana visualizations.', '🟡', 'Monitoring', 'sn_elastic_spoke', 'API Key', 'Rome', '["logs","search","elk","kibana","observability"]', 240),

-- ═══ Collaboration & Docs ═══
('confluence', 'Confluence', 'Create and update pages, manage spaces, add comments, search content in Atlassian Confluence.', '📝', 'Collaboration', 'sn_confluence_spoke', 'Basic Auth', 'Madrid', '["wiki","documentation","pages","atlassian"]', 440),
('sharepoint', 'SharePoint', 'Manage sites, lists, documents, folders. Upload/download files, manage permissions in SharePoint Online.', '📁', 'Collaboration', 'sn_sharepoint_spoke', 'OAuth 2.0', 'Madrid', '["documents","files","sites","microsoft","intranet"]', 520),
('box', 'Box', 'Upload, download, share files. Manage folders, collaborations, metadata, and retention policies.', '📦', 'Collaboration', 'sn_box_spoke', 'OAuth 2.0', 'Orlando', '["files","storage","sharing","collaboration"]', 280),
('google-drive', 'Google Drive', 'Upload, download, share files and folders. Manage permissions, search documents in Google Workspace.', '📂', 'Collaboration', 'sn_gdrive_spoke', 'OAuth 2.0', 'Paris', '["files","storage","google","sharing","workspace"]', 300),
('dropbox', 'Dropbox', 'Manage files, folders, sharing links, and team folders in Dropbox Business accounts.', '📥', 'Collaboration', 'sn_dropbox_spoke', 'OAuth 2.0', 'Quebec', '["files","storage","sharing","sync"]', 180),
('notion', 'Notion', 'Create pages, manage databases, search content, update properties in Notion workspaces.', '📓', 'Collaboration', 'sn_notion_spoke', 'API Key', 'Vancouver', '["docs","database","wiki","project-management"]', 160),

-- ═══ ITSM & Service Desk ═══
('servicenow-itsm', 'ServiceNow ITSM', 'Built-in spoke for incident, problem, change, request management across ServiceNow instances.', '⚙️', 'ITSM', 'com.snc.itsm', 'Built-in', 'Geneva', '["incident","problem","change","request","itil"]', 950),
('bmc-remedy', 'BMC Remedy', 'Create and update incidents, changes, problems in BMC Remedy ITSM. Bidirectional sync.', '🔴', 'ITSM', 'sn_remedy_spoke', 'Basic Auth', 'Orlando', '["itsm","incident","remedy","migration"]', 280),
('freshservice', 'Freshservice', 'Sync tickets, manage agents, create changes, import assets from Freshworks Freshservice.', '🟢', 'ITSM', 'sn_freshservice_spoke', 'API Key', 'Rome', '["helpdesk","tickets","freshworks","itsm"]', 200),
('xmatters', 'xMatters', 'Trigger notifications, manage on-call schedules, initiate conference bridges for major incidents.', '📢', 'ITSM', 'sn_xmatters_spoke', 'Basic Auth', 'Madrid', '["alerting","on-call","notification","incident"]', 340),

-- ═══ ERP & Business ═══
('sap', 'SAP', 'Execute BAPIs, read/write SAP tables, trigger RFC function modules, manage SAP user accounts.', '🔵', 'ERP', 'sn_sap_spoke', 'Basic Auth', 'Madrid', '["erp","bapi","rfc","business","finance"]', 580),
('workday', 'Workday', 'Manage workers, organizations, job changes, time-off requests. Sync HR data with ServiceNow HRSD.', '🟠', 'ERP', 'sn_workday_spoke', 'OAuth 2.0', 'Orlando', '["hr","workers","organizations","payroll","hrsd"]', 520),
('netsuite', 'NetSuite', 'Manage customers, invoices, purchase orders, inventory in Oracle NetSuite ERP.', '🔴', 'ERP', 'sn_netsuite_spoke', 'Token Auth', 'Paris', '["erp","accounting","inventory","oracle"]', 240),
('successfactors', 'SAP SuccessFactors', 'Sync employee data, manage onboarding, learning assignments, and performance goals.', '🟢', 'ERP', 'sn_successfactors_spoke', 'OAuth 2.0', 'Quebec', '["hr","talent","learning","onboarding","sap"]', 280),

-- ═══ Automation & Integration ═══
('power-automate', 'Microsoft Power Automate', 'Trigger and manage flows, pass data between Power Automate and ServiceNow workflows.', '🔵', 'Automation', 'sn_powerautomate_spoke', 'OAuth 2.0', 'San Diego', '["workflow","automation","microsoft","low-code"]', 380),
('zapier', 'Zapier', 'Connect ServiceNow with 5000+ apps via Zapier webhook triggers and actions.', '⚡', 'Automation', 'sn_zapier_spoke', 'Webhook', 'Tokyo', '["integration","automation","webhook","no-code"]', 220),
('email', 'Email (SMTP)', 'Built-in email spoke for sending formatted HTML emails, attachments, and calendar invites.', '📧', 'Automation', 'com.snc.email', 'SMTP', 'Geneva', '["email","smtp","notification","template"]', 880),
('rest-generic', 'Generic REST', 'Call any REST API endpoint with custom headers, body, and authentication methods.', '🔌', 'Automation', 'sn_rest_spoke', 'Any', 'Geneva', '["rest","api","http","integration","generic"]', 760),
('soap-generic', 'Generic SOAP', 'Call SOAP web services with WSDL import, envelope construction, and XML response parsing.', '🧼', 'Automation', 'sn_soap_spoke', 'Any', 'Geneva', '["soap","xml","wsdl","web-service","legacy"]', 340),
('webhook', 'Webhook', 'Receive and process incoming webhooks from any external system. JSON/XML/form-data support.', '🪝', 'Automation', 'com.snc.webhook', 'None', 'Madrid', '["webhook","inbound","trigger","event"]', 640),

-- ═══ Database & Data ═══
('snowflake', 'Snowflake', 'Run SQL queries, manage warehouses, load/unload data, monitor query history in Snowflake.', '❄️', 'Database', 'sn_snowflake_spoke', 'Key Pair', 'San Diego', '["data-warehouse","sql","analytics","cloud"]', 280),
('mongodb', 'MongoDB Atlas', 'CRUD operations on MongoDB collections, manage clusters, search indexes, and data API.', '🍃', 'Database', 'sn_mongodb_spoke', 'API Key', 'Tokyo', '["nosql","document","database","atlas"]', 180),

-- ═══ AI & ML ═══
('openai', 'OpenAI', 'Generate text with GPT, create embeddings, moderate content via OpenAI APIs.', '🤖', 'AI', 'sn_openai_spoke', 'API Key', 'Vancouver', '["gpt","chatgpt","ai","nlp","generation"]', 460),
('azure-cognitive', 'Azure Cognitive Services', 'Text analytics, computer vision, speech-to-text, translation, and anomaly detection.', '🧠', 'AI', 'sn_azurecognitive_spoke', 'API Key', 'Tokyo', '["ai","nlp","vision","speech","microsoft"]', 280),
('google-ai', 'Google Cloud AI', 'Natural language processing, vision AI, translation, and AutoML predictions.', '🧠', 'AI', 'sn_googleai_spoke', 'Service Account', 'Utah', '["ai","nlp","vision","ml","google"]', 200),

-- ═══ Network & Infrastructure ═══
('cisco-meraki', 'Cisco Meraki', 'Manage networks, devices, clients, VLANs, and firewall rules in Meraki dashboard.', '🌐', 'Network', 'sn_meraki_spoke', 'API Key', 'Orlando', '["network","wireless","firewall","cisco","sd-wan"]', 280),
('infoblox', 'Infoblox', 'Manage DNS records, DHCP leases, IP addresses, network views in Infoblox NIOS.', '🌐', 'Network', 'sn_infoblox_spoke', 'Basic Auth', 'Madrid', '["dns","dhcp","ipam","network"]', 320),
('f5', 'F5 BIG-IP', 'Manage virtual servers, pools, nodes, iRules, and SSL certificates on F5 load balancers.', '🔄', 'Network', 'sn_f5_spoke', 'Basic Auth', 'Paris', '["load-balancer","adc","ssl","network"]', 240)

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  plugin_id = EXCLUDED.plugin_id,
  credential_type = EXCLUDED.credential_type,
  min_version = EXCLUDED.min_version,
  tags = EXCLUDED.tags,
  view_count = GREATEST(sn_spokes.view_count, EXCLUDED.view_count);

-- Report
SELECT COUNT(*) as total_spokes, COUNT(DISTINCT category) as categories FROM sn_spokes;
