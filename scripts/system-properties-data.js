// ServiceNow System Properties — comprehensive reference
// Source: docs.servicenow.com, SN community, developer documentation
// Covers: Platform, ITSM, Flow Designer, Integration Hub, Security, Email, UI

const SYSTEM_PROPERTIES = [
  // ── PLATFORM / CORE ───────────────────────────────────────
  { name:'glide.ui.date_format', category:'Platform', type:'string', default_value:'MM/dd/yyyy', description:'Default date format for the platform UI.', editable:true },
  { name:'glide.ui.time_format', category:'Platform', type:'string', default_value:'HH:mm:ss', description:'Default time format for the platform UI.', editable:true },
  { name:'glide.sys.default.tz', category:'Platform', type:'string', default_value:'US/Pacific', description:'Default timezone for the system.', editable:true },
  { name:'glide.ui.per_page', category:'Platform', type:'integer', default_value:'20', description:'Default number of records per page in list views.', editable:true },
  { name:'glide.sys.max_query', category:'Platform', type:'integer', default_value:'300000', description:'Maximum number of records returned by a query.', editable:true },
  { name:'glide.sys.rest.max_response_body_size', category:'Platform', type:'integer', default_value:'10485760', description:'Maximum REST response body size in bytes (10MB default).', editable:true },
  { name:'glide.sys.attachment.max_size', category:'Platform', type:'integer', default_value:'25', description:'Maximum attachment size in MB.', editable:true },
  { name:'glide.record.operations.audit', category:'Platform', type:'boolean', default_value:'true', description:'Enable auditing of record operations (insert/update/delete).', editable:true },
  { name:'glide.ui.record_popup', category:'Platform', type:'boolean', default_value:'true', description:'Enable record info popup when hovering over reference fields.', editable:true },
  { name:'glide.log.level', category:'Platform', type:'string', default_value:'warning', description:'System log level (debug, info, warning, error).', editable:true },

  // ── EMAIL ────────────────────────────────────────────────
  { name:'glide.email.smtp.server', category:'Email', type:'string', default_value:'', description:'SMTP server hostname for outbound email.', editable:true },
  { name:'glide.email.smtp.port', category:'Email', type:'integer', default_value:'587', description:'SMTP port number for outbound email.', editable:true },
  { name:'glide.email.smtp.user', category:'Email', type:'string', default_value:'', description:'SMTP authentication username.', editable:true },
  { name:'glide.email.from_address', category:'Email', type:'string', default_value:'', description:'Default From address for system emails.', editable:true },
  { name:'glide.email.reply_to', category:'Email', type:'string', default_value:'', description:'Reply-To address for system notification emails.', editable:true },
  { name:'glide.email.inbound.enabled', category:'Email', type:'boolean', default_value:'true', description:'Enable inbound email processing.', editable:true },
  { name:'glide.email.read.active', category:'Email', type:'boolean', default_value:'true', description:'Enable reading emails from mailboxes.', editable:true },
  { name:'glide.email.test.user', category:'Email', type:'string', default_value:'', description:'Redirect all outbound emails to this address during testing.', editable:true },

  // ── SECURITY ─────────────────────────────────────────────
  { name:'glide.security.use_csrf_token', category:'Security', type:'boolean', default_value:'true', description:'Enable CSRF token protection for form submissions.', editable:false },
  { name:'glide.security.strict_customer_uploaded_content', category:'Security', type:'boolean', default_value:'true', description:'Restrict execution of customer-uploaded content.', editable:true },
  { name:'glide.security.file.mime_type.blacklist', category:'Security', type:'string', default_value:'exe,bat,com,cmd', description:'Comma-separated list of blocked file extension uploads.', editable:true },
  { name:'glide.login.max_failures', category:'Security', type:'integer', default_value:'5', description:'Maximum login failures before account lockout.', editable:true },
  { name:'glide.login.lockout_duration', category:'Security', type:'integer', default_value:'30', description:'Account lockout duration in minutes after max failures.', editable:true },
  { name:'glide.security.two_factor.enabled', category:'Security', type:'boolean', default_value:'false', description:'Enable two-factor authentication globally.', editable:true },
  { name:'glide.security.password.policy.min_length', category:'Security', type:'integer', default_value:'8', description:'Minimum password length for user accounts.', editable:true },
  { name:'glide.security.password.expiry_days', category:'Security', type:'integer', default_value:'90', description:'Password expiration period in days. 0 = never expires.', editable:true },
  { name:'glide.security.session.timeout', category:'Security', type:'integer', default_value:'1800', description:'Session timeout in seconds (default 30 minutes).', editable:true },
  { name:'glide.security.ip_access_control.enabled', category:'Security', type:'boolean', default_value:'false', description:'Enable IP allowlist/blocklist access control.', editable:true },

  // ── ITSM / SERVICE MANAGEMENT ────────────────────────────
  { name:'com.glide.ui.incident.default_state', category:'ITSM', type:'integer', default_value:'1', description:'Default state for new incidents (1=New, 2=In Progress, 3=On Hold).', editable:true },
  { name:'com.glide.ui.change.default_approval', category:'ITSM', type:'string', default_value:'requested', description:'Default approval state for new change requests.', editable:true },
  { name:'incident.default_priority_calculation', category:'ITSM', type:'boolean', default_value:'true', description:'Auto-calculate incident priority from impact and urgency.', editable:true },
  { name:'com.glide.sla.engine.enabled', category:'ITSM', type:'boolean', default_value:'true', description:'Enable the SLA engine for SLA calculations.', editable:true },
  { name:'com.glide.ui.change.allow_cascade_approval', category:'ITSM', type:'boolean', default_value:'true', description:'Allow approval cascading on change requests.', editable:true },
  { name:'com.snc.incident.auto_assign', category:'ITSM', type:'boolean', default_value:'false', description:'Enable automatic assignment of incidents based on assignment rules.', editable:true },
  { name:'com.glide.sla.timezone', category:'ITSM', type:'string', default_value:'System', description:'Timezone used for SLA calculations (System or specific timezone).', editable:true },
  { name:'com.snc.problem.auto_close', category:'ITSM', type:'boolean', default_value:'false', description:'Automatically close problems when all linked incidents are resolved.', editable:true },

  // ── FLOW DESIGNER / INTEGRATION HUB ─────────────────────
  { name:'com.glide.hub.action.execution.timeout', category:'Flow Designer', type:'integer', default_value:'3600', description:'Maximum execution time in seconds for a single flow action.', editable:true },
  { name:'com.glide.hub.flow.log_level', category:'Flow Designer', type:'string', default_value:'error', description:'Logging level for flow executions (debug, info, warn, error).', editable:true },
  { name:'com.snc.integration.max_retry_count', category:'Integration Hub', type:'integer', default_value:'3', description:'Maximum number of retry attempts for failed Integration Hub actions.', editable:true },
  { name:'com.snc.integration.retry_interval', category:'Integration Hub', type:'integer', default_value:'60', description:'Wait time in seconds between Integration Hub retry attempts.', editable:true },
  { name:'com.glide.hub.flow.max_concurrent', category:'Flow Designer', type:'integer', default_value:'100', description:'Maximum concurrent flow executions allowed.', editable:true },
  { name:'com.snc.integration.connection_timeout', category:'Integration Hub', type:'integer', default_value:'30', description:'Connection timeout in seconds for outbound REST calls.', editable:true },
  { name:'com.snc.integration.read_timeout', category:'Integration Hub', type:'integer', default_value:'60', description:'Read timeout in seconds for outbound REST calls.', editable:true },

  // ── UI / USER EXPERIENCE ─────────────────────────────────
  { name:'glide.ui.theme', category:'UI', type:'string', default_value:'glide-tokyo', description:'Default platform UI theme.', editable:true },
  { name:'glide.ui.list.max_columns', category:'UI', type:'integer', default_value:'10', description:'Maximum number of columns displayed in list views.', editable:true },
  { name:'glide.ui.activity.stream.enabled', category:'UI', type:'boolean', default_value:'true', description:'Enable activity stream on records.', editable:true },
  { name:'glide.ui.form_presence.enabled', category:'UI', type:'boolean', default_value:'true', description:'Show user presence indicators on forms (who else is viewing).', editable:true },
  { name:'css.base.color', category:'UI', type:'string', default_value:'#0068d8', description:'Primary brand color for the platform UI.', editable:true },
  { name:'glide.ui.show_home', category:'UI', type:'boolean', default_value:'true', description:'Show home page/dashboard on login.', editable:true },
  { name:'glide.ui.compact_mode', category:'UI', type:'boolean', default_value:'false', description:'Enable compact/dense list view mode.', editable:true },

  // ── PERFORMANCE / CACHING ────────────────────────────────
  { name:'glide.cache.invalidation.on_update', category:'Performance', type:'boolean', default_value:'true', description:'Invalidate caches on record updates.', editable:true },
  { name:'glide.db.pool.max', category:'Performance', type:'integer', default_value:'50', description:'Maximum database connection pool size.', editable:false },
  { name:'glide.sys.batch.size', category:'Performance', type:'integer', default_value:'200', description:'Batch processing chunk size for background jobs.', editable:true },
  { name:'glide.ui.list.cell.max_length', category:'Performance', type:'integer', default_value:'150', description:'Maximum character length displayed in list view cells.', editable:true },

  // ── MID SERVER / INTEGRATIONS ────────────────────────────
  { name:'mid.server.verify', category:'MID Server', type:'boolean', default_value:'true', description:'Verify MID Server certificate on connection.', editable:true },
  { name:'mid.log.level', category:'MID Server', type:'string', default_value:'warn', description:'MID Server log level (debug, info, warn, error).', editable:true },
  { name:'com.snc.automation.mid.server.heartbeat', category:'MID Server', type:'integer', default_value:'30', description:'MID Server heartbeat interval in seconds.', editable:true },

  // ── VIRTUAL AGENT / NOW ASSIST ────────────────────────────
  { name:'com.glide.cs.enable_agent_chat', category:'Virtual Agent', type:'boolean', default_value:'false', description:'Enable live agent handoff in Virtual Agent conversations.', editable:true },
  { name:'com.glide.cs.default_welcome_message', category:'Virtual Agent', type:'string', default_value:'Hello! How can I help?', description:'Default welcome message for Virtual Agent conversations.', editable:true },
  { name:'com.glide.now_assist.enabled', category:'Now Assist', type:'boolean', default_value:'false', description:'Enable Now Assist generative AI features.', editable:true },

  // ── NOTIFICATIONS ────────────────────────────────────────
  { name:'glide.notification.max_recipients', category:'Notifications', type:'integer', default_value:'100', description:'Maximum number of recipients per notification.', editable:true },
  { name:'glide.notification.digest.enabled', category:'Notifications', type:'boolean', default_value:'true', description:'Enable notification digest/batching.', editable:true },
  { name:'glide.push.enabled', category:'Notifications', type:'boolean', default_value:'false', description:'Enable push notifications to mobile devices.', editable:true },

  // ── SCOPED APPS / DEVELOPMENT ────────────────────────────
  { name:'glide.script.block.sleep', category:'Development', type:'boolean', default_value:'true', description:'Block gs.sleep() calls in server-side scripts to prevent performance issues.', editable:true },
  { name:'glide.script.max_timeout', category:'Development', type:'integer', default_value:'300', description:'Maximum script execution timeout in seconds.', editable:true },
  { name:'glide.js.quick_debug_scripts', category:'Development', type:'boolean', default_value:'false', description:'Enable quick debug mode for Scripts - Background.', editable:true },
  { name:'com.glide.sys.development.mode', category:'Development', type:'boolean', default_value:'false', description:'Enable development mode for the instance.', editable:true },
  { name:'glide.sys.update_set.current', category:'Development', type:'string', default_value:'Default', description:'Current active update set name.', editable:true },

  // ── HR SERVICE DELIVERY ───────────────────────────────────
  { name:'com.snc.hr.auto_assign_agent', category:'HR', type:'boolean', default_value:'false', description:'Automatically assign HR cases based on employee location and department.', editable:true },
  { name:'com.snc.hr.case.default_state', category:'HR', type:'integer', default_value:'1', description:'Default state for new HR cases.', editable:true },

  // ── DISCOVERY ────────────────────────────────────────────
  { name:'com.snc.discovery.max_scanner_threads', category:'Discovery', type:'integer', default_value:'100', description:'Maximum concurrent scanner threads for Discovery.', editable:true },
  { name:'com.snc.discovery.scan_timeout', category:'Discovery', type:'integer', default_value:'300', description:'Discovery scan timeout per device in seconds.', editable:true },

  // ── SERVICE PORTAL ───────────────────────────────────────
  { name:'glide.service_portal.default_url', category:'Service Portal', type:'string', default_value:'/sp', description:'Default URL for the Service Portal.', editable:true },
  { name:'glide.service_portal.show_breadcrumbs', category:'Service Portal', type:'boolean', default_value:'true', description:'Show breadcrumb navigation in Service Portal.', editable:true },

  // ── REPORTING / ANALYTICS ─────────────────────────────────
  { name:'com.glide.report.max_results', category:'Reporting', type:'integer', default_value:'2000', description:'Maximum number of records in report results.', editable:true },
  { name:'com.glide.pa.scheduled_jobs.enabled', category:'Reporting', type:'boolean', default_value:'true', description:'Enable scheduled Performance Analytics jobs.', editable:true },
];

module.exports = SYSTEM_PROPERTIES;
