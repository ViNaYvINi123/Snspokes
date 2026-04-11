/**
 * Complete ServiceNow API Reference Data
 * Sources: developer.servicenow.com (Yokohama release), official docs, community
 * Covers: REST APIs, Server-Side (Scoped + Global), Client-Side, Integration patterns
 */

// ─── REST / INBOUND APIs ──────────────────────────────────────────────────────
const REST_APIS = [
  {
    slug: 'table-api',
    name: 'Table API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/now/table/{tableName}',
    description: 'The primary CRUD API for any ServiceNow table. Supports GET, POST, PUT, PATCH, DELETE. The most commonly used inbound REST API — directly reads/writes records without custom scripting.',
    methods: [
      { method:'GET',    path:'/api/now/table/{table}',          description:'Retrieve multiple records. Supports sysparm_query, sysparm_fields, sysparm_limit, sysparm_offset, sysparm_display_value.' },
      { method:'GET',    path:'/api/now/table/{table}/{sys_id}',  description:'Retrieve a single record by sys_id.' },
      { method:'POST',   path:'/api/now/table/{table}',           description:'Create a new record. Request body is JSON with field/value pairs.' },
      { method:'PUT',    path:'/api/now/table/{table}/{sys_id}',  description:'Replace all fields of a record (full update).' },
      { method:'PATCH',  path:'/api/now/table/{table}/{sys_id}',  description:'Update specific fields of a record (partial update). Preferred over PUT.' },
      { method:'DELETE', path:'/api/now/table/{table}/{sys_id}',  description:'Delete a record permanently.' },
    ],
    params: [
      { name:'sysparm_query',          desc:'Encoded query string. e.g. priority=1^state=2^active=true' },
      { name:'sysparm_fields',         desc:'Comma-separated list of fields to return. Reduces payload size.' },
      { name:'sysparm_limit',          desc:'Maximum number of records to return (default 10000).' },
      { name:'sysparm_offset',         desc:'Starting index for pagination.' },
      { name:'sysparm_display_value',  desc:'Return display values (true), actual values (false), or both (all).' },
      { name:'sysparm_exclude_reference_link', desc:'Exclude reference links from response (true/false).' },
      { name:'sysparm_view',           desc:'Return fields defined in a specific view.' },
      { name:'sysparm_suppress_auto_sys_field', desc:'Suppress auto-populated sys_ fields on insert.' },
    ],
    auth: ['Basic Auth', 'OAuth 2.0', 'API Key (x-sn-apikey header)'],
    roles_required: ['rest_service', 'table-specific read/write roles'],
    code_example: `// GET incidents with high priority
const response = await fetch(
  'https://instance.service-now.com/api/now/table/incident?sysparm_query=priority=1^state!=6&sysparm_fields=number,short_description,assigned_to&sysparm_limit=10',
  { headers: { 'Authorization': 'Basic ' + btoa('user:pass'), 'Accept': 'application/json' } }
);
const data = await response.json();
// data.result = array of records`,
    gotcha: 'Always use PATCH over PUT for updates — PUT clears fields not included in the request body.',
  },
  {
    slug: 'aggregate-api',
    name: 'Aggregate API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/now/stats/{tableName}',
    description: 'Perform aggregate functions (COUNT, SUM, AVG, MIN, MAX) on table data without retrieving individual records. Essential for dashboards and reporting.',
    methods: [
      { method:'GET', path:'/api/now/stats/{table}', description:'Execute aggregate query. Returns grouped counts or calculated values.' },
    ],
    params: [
      { name:'sysparm_query',      desc:'Filter condition for records to aggregate.' },
      { name:'sysparm_count',      desc:'Set true to return total record count.' },
      { name:'sysparm_sum_fields', desc:'Comma-separated fields to sum.' },
      { name:'sysparm_avg_fields', desc:'Comma-separated fields to average.' },
      { name:'sysparm_min_fields', desc:'Fields to find minimum value.' },
      { name:'sysparm_max_fields', desc:'Fields to find maximum value.' },
      { name:'sysparm_group_by',   desc:'Field to group results by (like SQL GROUP BY).' },
      { name:'sysparm_order_by',   desc:'Field to sort grouped results.' },
    ],
    auth: ['Basic Auth', 'OAuth 2.0'],
    code_example: `// Count incidents by priority
GET /api/now/stats/incident?sysparm_query=active=true&sysparm_count=true&sysparm_group_by=priority
// Returns: {"result":{"stats":{"count":"42"}}}`,
    gotcha: 'Use sysparm_group_by for breakdown reports. Not all fields are aggregatable (e.g., journal fields).',
  },
  {
    slug: 'attachment-api',
    name: 'Attachment API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/now/attachment',
    description: 'Upload, download, and manage file attachments on ServiceNow records. Supports binary uploads with metadata.',
    methods: [
      { method:'GET',    path:'/api/now/attachment',                  description:'List attachments. Filter by table_name and table_sys_id.' },
      { method:'GET',    path:'/api/now/attachment/{sys_id}',         description:'Get attachment metadata.' },
      { method:'GET',    path:'/api/now/attachment/{sys_id}/file',    description:'Download the actual file binary.' },
      { method:'POST',   path:'/api/now/attachment/file',             description:'Upload a file. Set Content-Type to file MIME type. Pass table_name and table_sys_id as query params.' },
      { method:'DELETE', path:'/api/now/attachment/{sys_id}',         description:'Delete an attachment.' },
    ],
    params: [
      { name:'table_name',     desc:'Target table name (e.g., incident).' },
      { name:'table_sys_id',   desc:'sys_id of the record to attach to.' },
      { name:'file_name',      desc:'Name for the uploaded file.' },
      { name:'Content-Type',   desc:'MIME type of the file (application/pdf, image/png, etc.).' },
    ],
    auth: ['Basic Auth', 'OAuth 2.0'],
    code_example: `// Upload PDF to incident
POST /api/now/attachment/file?table_name=incident&table_sys_id=abc123&file_name=report.pdf
Content-Type: application/pdf
[binary file content]`,
    gotcha: 'Max file size is 25MB by default (glide.sys.attachment.max_size property). Use multipart only for text; send binary directly for files.',
  },
  {
    slug: 'import-set-api',
    name: 'Import Set API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/now/import/{stagingTable}',
    description: 'Write data to an Import Set staging table and optionally trigger a Transform Map. Use instead of Table API when you need validation, deduplication, or data transformation before the record hits the target table.',
    methods: [
      { method:'POST', path:'/api/now/import/{staging_table}',           description:'Insert a record into a staging table and optionally trigger transform.' },
      { method:'POST', path:'/api/now/import/{staging_table}/insertMultiple', description:'Bulk insert multiple records.' },
    ],
    params: [],
    auth: ['Basic Auth', 'OAuth 2.0'],
    code_example: `// Insert into staging and auto-transform
POST /api/now/import/u_import_incidents
{"u_short_description": "Login failure", "u_caller_email": "user@company.com"}
// Transform Map runs automatically if configured`,
    gotcha: 'The staging table must extend sys_import_set_row. Transform maps handle dedup logic — use coalesce fields to prevent duplicates.',
  },
  {
    slug: 'scripted-rest-api',
    name: 'Scripted REST API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/{namespace}/{api_id}/{resource}',
    description: 'Build fully custom REST endpoints with server-side JavaScript. Use when Table API is insufficient — complex business logic, multi-table operations, custom validation, or non-standard response shapes.',
    methods: [
      { method:'ANY', path:'/api/{scope_namespace}/{api_id}/{resource}', description:'Fully custom. You define the path, methods, and script handler.' },
    ],
    params: [],
    auth: ['Basic Auth', 'OAuth 2.0', 'API Key', 'Custom'],
    code_example: `// Script inside Scripted REST API Resource (GET handler)
(function process(request, response) {
  var priority = request.queryParams.priority;
  var gr = new GlideRecord('incident');
  gr.addQuery('priority', priority);
  gr.query();
  var results = [];
  while (gr.next()) {
    results.push({ number: gr.number.toString(), desc: gr.short_description.toString() });
  }
  response.setBody({ result: results });
  response.setStatus(200);
})(request, response);`,
    gotcha: 'Namespace is your app scope prefix (e.g., x_acme_myapp). Always validate input — scripted REST receives raw HTTP data.',
  },
  {
    slug: 'cmdb-api',
    name: 'CMDB Instance API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/now/cmdb/instance',
    description: 'Create and update CMDB Configuration Items using the Identification & Reconciliation Engine. Prevents duplicate CIs and respects authoritative data sources.',
    methods: [
      { method:'POST', path:'/api/now/cmdb/instance/{class}',           description:'Create or update a CI using IRE (identification rules respected).' },
      { method:'GET',  path:'/api/now/cmdb/instance/{class}/{sys_id}',  description:'Retrieve a CI and its attributes.' },
    ],
    params: [
      { name:'source', desc:'Data source name for reconciliation. Determines which data wins on conflicts.' },
    ],
    auth: ['Basic Auth', 'OAuth 2.0'],
    code_example: `// Create server CI using IRE
POST /api/now/cmdb/instance/cmdb_ci_server
{ "source": "ServiceNow", "items": [{ "values": { "name": "PROD-WEB-01", "ip_address": "10.0.0.1" } }] }`,
    gotcha: 'Always set the source field. Without it, the IRE may create duplicates. Use the payload model exactly as specified — the items array is required.',
  },
  {
    slug: 'now-table-batch-api',
    name: 'Batch API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/now/v1/batch',
    description: 'Execute multiple REST API calls in a single HTTP request. Reduces network round-trips — critical for performance-sensitive integrations.',
    methods: [
      { method:'POST', path:'/api/now/v1/batch', description:'Send array of REST requests. Returns array of responses.' },
    ],
    params: [],
    auth: ['Basic Auth', 'OAuth 2.0'],
    code_example: `POST /api/now/v1/batch
{
  "batch_request_id": "req1",
  "rest_requests": [
    { "id": "1", "method": "GET", "url": "/api/now/table/incident?sysparm_limit=5", "headers": [] },
    { "id": "2", "method": "GET", "url": "/api/now/table/problem?sysparm_limit=3", "headers": [] }
  ]
}`,
    gotcha: 'Max 500 requests per batch. Responses may fail individually — check each response status code.',
  },
  {
    slug: 'flow-api',
    name: 'Flow Designer REST API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/sn_fd/flow',
    description: 'Trigger and manage Flow Designer flows, subflows, and actions via REST. Allows external systems to start ServiceNow automation.',
    methods: [
      { method:'POST', path:'/api/sn_fd/flow/{flow_api_name}/run',     description:'Trigger a flow by its API name. Pass input variables in request body.' },
      { method:'POST', path:'/api/sn_fd/subflow/{name}/run',           description:'Run a subflow.' },
      { method:'GET',  path:'/api/sn_fd/flow/{context_id}',            description:'Get execution context and output variables.' },
    ],
    params: [],
    auth: ['Basic Auth', 'OAuth 2.0'],
    code_example: `POST /api/sn_fd/flow/global/sn_notify_flow/run
{ "inputs": { "record_sys_id": "abc123", "table_name": "incident" } }`,
    gotcha: 'The flow must be published and have external trigger enabled. Flow API name is set in the flow properties.',
  },
  {
    slug: 'service-catalog-api',
    name: 'Service Catalog API',
    category: 'REST API',
    scope: 'both',
    base_path: '/api/sn_sc/servicecatalog',
    description: 'Browse service catalog, get item details, and submit catalog requests programmatically.',
    methods: [
      { method:'GET',  path:'/api/sn_sc/servicecatalog/items',           description:'List all catalog items.' },
      { method:'GET',  path:'/api/sn_sc/servicecatalog/items/{id}',      description:'Get catalog item details including variables.' },
      { method:'POST', path:'/api/sn_sc/servicecatalog/items/{id}/order_now', description:'Submit a catalog request.' },
      { method:'GET',  path:'/api/sn_sc/servicecatalog/cart',            description:'Get current cart contents.' },
    ],
    params: [
      { name:'sysparm_quantity', desc:'Quantity to order.' },
      { name:'variables',        desc:'Map of variable name → value for the catalog item.' },
    ],
    auth: ['Basic Auth', 'OAuth 2.0'],
    code_example: `POST /api/sn_sc/servicecatalog/items/{item_sys_id}/order_now
{ "variables": { "short_description": "Need laptop", "justification": "New hire" }, "sysparm_quantity": "1" }`,
    gotcha: 'Variable names are internal names (not labels). Find them in the catalog item Variable definitions table.',
  },
];

// ─── SERVER-SIDE APIs (Scoped unless noted) ───────────────────────────────────
const SERVER_APIS = [
  // ── CORE DATABASE ────────────────────────────────────────────────────────
  {
    slug: 'gliderecord',
    name: 'GlideRecord',
    category: 'Database',
    scope: 'both',
    global_var: 'GlideRecord',
    description: 'The primary server-side API for all database operations. Queries, inserts, updates, and deletes records from any table. Available in all server-side contexts: Business Rules, Script Includes, Scheduled Jobs, Flow Designer scripts.',
    methods: [
      { name:'new GlideRecord(table)',        desc:'Constructor. Creates a GlideRecord object for the specified table.' },
      { name:'query()',                       desc:'Execute the query. Fetches all matching records into a cursor.' },
      { name:'get(fieldOrSysId, value?)',     desc:'Retrieve a single record. If one arg = sys_id lookup. If two args = field/value lookup.' },
      { name:'next()',                        desc:'Advance the cursor to the next record. Returns true while records remain.' },
      { name:'insert()',                      desc:'Insert the current record into the database. Returns new sys_id.' },
      { name:'update()',                      desc:'Save changes to the current record. Returns sys_id.' },
      { name:'deleteRecord()',               desc:'Delete the current record.' },
      { name:'deleteMultiple()',             desc:'Delete all records matching the current query. No loop needed.' },
      { name:'addQuery(field, operator?, value)', desc:'Add a WHERE condition. Operator is optional (defaults to =). AND logic between multiple addQuery calls.' },
      { name:'addOrCondition(field, op?, val)',   desc:'Add OR condition to the previous addQuery.' },
      { name:'addEncodedQuery(str)',         desc:'Add a pre-built encoded query string.' },
      { name:'setLimit(n)',                  desc:'Limit the number of records returned.' },
      { name:'orderBy(field)',               desc:'Sort ascending by field.' },
      { name:'orderByDesc(field)',           desc:'Sort descending by field.' },
      { name:'getValue(field)',              desc:'Get the internal value of a field (sys_id for references).' },
      { name:'getDisplayValue(field)',       desc:'Get the display value of a field (name for references).' },
      { name:'setValue(field, value)',       desc:'Set a field value.' },
      { name:'isValidRecord()',             desc:'Returns true if the GlideRecord object contains a valid database record.' },
      { name:'hasNext()',                   desc:'Returns true if there are more records to iterate.' },
      { name:'getRowCount()',               desc:'Returns the number of records returned by the query.' },
      { name:'setWorkflow(false)',          desc:'Disable business rules on this operation.' },
      { name:'autoSysFields(false)',        desc:'Disable auto-population of sys_ fields (sys_updated_by, etc.).' },
      { name:'initialize()',                desc:'Clear all field values to defaults (used before insert).' },
      { name:'changes()',                   desc:'Returns true if any field has changed.' },
      { name:'getElement(field)',           desc:'Get a GlideElement object for a field (for advanced element operations).' },
    ],
    code_example: `// Query with conditions
var gr = new GlideRecord('incident');
gr.addQuery('priority', '1');
gr.addQuery('state', '!=', '6'); // NOT closed
gr.orderBy('sys_created_on');
gr.setLimit(100);
gr.query();
while (gr.next()) {
  gs.log(gr.number + ' — ' + gr.short_description);
}

// Create a record
var gr2 = new GlideRecord('incident');
gr2.initialize();
gr2.setValue('short_description', 'Test incident');
gr2.setValue('priority', '2');
var newSysId = gr2.insert();`,
    scoped_differences: 'In scoped apps, GlideRecord cannot access tables outside the scope without cross-scope access configured. Use table._scope prefix for cross-scope access.',
    gotcha: 'Never use gr.field = value syntax in scoped scripts — always use gr.setValue(). getRowCount() executes a second query — avoid in loops.',
  },
  {
    slug: 'glidesystem',
    name: 'GlideSystem (gs)',
    category: 'System',
    scope: 'both',
    global_var: 'gs',
    description: 'Global system utilities API. Provides logging, user information, date/time operations, system properties, event queuing, and session management. Automatically available as the gs variable in all server-side scripts.',
    methods: [
      { name:'gs.log(msg, source?)',          desc:'Write to system log (syslog table). Higher performance impact than gs.info().' },
      { name:'gs.info(msg, ...params)',        desc:'Log info message. Supports {0} parameter substitution.' },
      { name:'gs.warn(msg, ...params)',        desc:'Log warning message.' },
      { name:'gs.error(msg, ...params)',       desc:'Log error message.' },
      { name:'gs.debug(msg, ...params)',       desc:'Log debug message. Only visible when debug logging enabled.' },
      { name:'gs.print(msg)',                  desc:'Write to system log. Use gs.info() instead — gs.print not available in scoped apps.' },
      { name:'gs.addErrorMessage(msg)',        desc:'Display red error message at top of form. Use in Business Rules.' },
      { name:'gs.addInfoMessage(msg)',         desc:'Display black info message at top of form.' },
      { name:'gs.getUserID()',                 desc:'Return sys_id of current user.' },
      { name:'gs.getUserName()',               desc:'Return username (login name) of current user.' },
      { name:'gs.getUser()',                   desc:'Return GlideUser object for current user.' },
      { name:'gs.hasRole(role)',               desc:'Return true if current user has specified role.' },
      { name:'gs.hasRoleInGroup(role, groupId)', desc:'Check role within a specific group.' },
      { name:'gs.getProperty(name, default?)', desc:'Get system property value by name. Returns default if not found.' },
      { name:'gs.setProperty(name, value)',    desc:'Set a system property value.' },
      { name:'gs.getSession()',                desc:'Return current GlideSession object.' },
      { name:'gs.getSessionID()',              desc:'Return session ID string.' },
      { name:'gs.nowDateTime()',               desc:'Return current date/time as string in instance timezone.' },
      { name:'gs.now()',                       desc:'Return current date as string (YYYY-MM-DD).' },
      { name:'gs.nil(value)',                  desc:'Return true if value is null, undefined, or empty string.' },
      { name:'gs.eventQueue(name, record, p1?, p2?)', desc:'Fire a ServiceNow event. Use in Business Rules.' },
      { name:'gs.isInteractive()',             desc:'True if a user is driving the session (false for background jobs).' },
      { name:'gs.isLoggedIn()',               desc:'True if current session has an authenticated user.' },
      { name:'gs.getCurrentScopeName()',      desc:'Return name of current application scope.' },
      { name:'gs.getDisplayColumn(table)',     desc:'Return the display field name for a table.' },
      { name:'gs.tableExists(table)',          desc:'Return true if table exists in the instance.' },
    ],
    scoped_differences: 'gs.print() not available in scoped apps. Use gs.info(). gs.nowDateTime() not available in scoped — use new GlideDateTime().',
    gotcha: 'gs.getProperty() returns a string — always compare to string values. Use gs.nil() for null checks instead of == null.',
    code_example: `// Typical Business Rule pattern
if (current.operation() === 'insert') {
  gs.eventQueue('incident.created', current, gs.getUserID(), gs.getUserName());
  if (!gs.hasRole('itil')) {
    gs.addErrorMessage('You do not have permission to create incidents.');
    current.setAbortAction(true);
  }
}`,
  },
  {
    slug: 'glideaggregate',
    name: 'GlideAggregate',
    category: 'Database',
    scope: 'both',
    global_var: 'GlideAggregate',
    description: 'Server-side aggregation API. Executes COUNT, SUM, AVG, MIN, MAX operations directly in SQL — far more efficient than looping with GlideRecord for reporting queries.',
    methods: [
      { name:'new GlideAggregate(table)',         desc:'Constructor.' },
      { name:'addAggregate(func, field)',          desc:'Add aggregate function: COUNT, SUM, AVG, MIN, MAX.' },
      { name:'getAggregate(func, field)',          desc:'Get the result of a specific aggregate after query().' },
      { name:'groupBy(field)',                     desc:'Group results by field value (SQL GROUP BY).' },
      { name:'addQuery(field, op?, value)',        desc:'Filter records before aggregation.' },
      { name:'addEncodedQuery(str)',               desc:'Add encoded query filter.' },
      { name:'query()',                            desc:'Execute the aggregation query.' },
      { name:'next()',                             desc:'Iterate grouped results.' },
    ],
    code_example: `var ga = new GlideAggregate('incident');
ga.addAggregate('COUNT');
ga.addAggregate('COUNT', 'priority'); // per group
ga.groupBy('priority');
ga.addQuery('active', 'true');
ga.query();
while (ga.next()) {
  gs.info('Priority ' + ga.priority + ': ' + ga.getAggregate('COUNT', 'priority'));
}`,
    gotcha: 'Use GlideAggregate instead of GlideRecord + counter for any count/sum operation. Much faster.',
  },
  {
    slug: 'glidequery',
    name: 'GlideQuery',
    category: 'Database',
    scope: 'both',
    global_var: 'GlideQuery',
    description: 'Modern fluent query API introduced in New York. Alternative to GlideRecord with chainable methods, null safety, and functional patterns. Preferred for new scoped app development.',
    methods: [
      { name:'new GlideQuery(table)',              desc:'Constructor.' },
      { name:'.where(field, op?, value)',          desc:'Add WHERE condition (chainable).' },
      { name:'.whereNull(field)',                  desc:'Add IS NULL condition.' },
      { name:'.whereNotNull(field)',               desc:'Add IS NOT NULL condition.' },
      { name:'.select(field1, field2, ...)',       desc:'Specify fields to retrieve (returns Stream).' },
      { name:'.selectOne(field1, ...)',            desc:'Get a single record as Optional.' },
      { name:'.insert(obj)',                       desc:'Insert a record. Returns Optional of new record.' },
      { name:'.update(obj)',                       desc:'Update matching records.' },
      { name:'.delete()',                          desc:'Delete matching records.' },
      { name:'.limit(n)',                          desc:'Limit results.' },
      { name:'.orderBy(field)',                    desc:'Order ascending.' },
      { name:'.orderByDesc(field)',                desc:'Order descending.' },
    ],
    code_example: `// GlideQuery — modern approach
var incidents = new GlideQuery('incident')
  .where('priority', '1')
  .where('active', true)
  .orderByDesc('sys_created_on')
  .limit(10)
  .select('number', 'short_description')
  .toArray(10); // convert Stream to Array

// Optional pattern for single record
var result = new GlideQuery('incident')
  .where('number', 'INC0010001')
  .selectOne('number', 'short_description');

if (result.isPresent()) {
  gs.info(result.get().number);
}`,
    gotcha: 'GlideQuery returns Stream objects — call .toArray() or .forEach() to materialize. Not available before New York release.',
  },

  // ── DATE/TIME ─────────────────────────────────────────────────────────────
  {
    slug: 'glidedatetime',
    name: 'GlideDateTime',
    category: 'Date/Time',
    scope: 'both',
    global_var: 'GlideDateTime',
    description: 'Date and time manipulation API. Handles timezone conversion, date arithmetic, formatting, and comparison. Essential for SLA calculations and scheduled jobs.',
    methods: [
      { name:'new GlideDateTime()',              desc:'Create current date/time.' },
      { name:'new GlideDateTime("2024-01-15 10:00:00")', desc:'Parse from string.' },
      { name:'.addDays(n)',                      desc:'Add n days.' },
      { name:'.addSeconds(n)',                   desc:'Add n seconds.' },
      { name:'.addMonths(n)',                    desc:'Add n months.' },
      { name:'.getValue()',                      desc:'Get internal UTC string value.' },
      { name:'.getDisplayValue()',               desc:'Get formatted string in user locale.' },
      { name:'.getDate()',                       desc:'Get GlideDate component.' },
      { name:'.getTime()',                       desc:'Get GlideTime component.' },
      { name:'.before(other)',                   desc:'True if this is before the other GlideDateTime.' },
      { name:'.after(other)',                    desc:'True if this is after the other GlideDateTime.' },
      { name:'.subtract(gdt)',                   desc:'Subtract another GlideDateTime; returns GlideDuration.' },
    ],
    code_example: `var now = new GlideDateTime();
var due = new GlideDateTime();
due.addDays(5);
gs.info('Due: ' + due.getDisplayValue());

// Date arithmetic
var created = current.sys_created_on.getGlideObject();
var diff = GlideDateTime.subtract(created, new GlideDateTime());
gs.info('Age in hours: ' + diff.getRoundedDayPart());`,
    gotcha: 'GlideDateTime stores values in UTC internally. Always use getDisplayValue() for user-facing output.',
  },
  {
    slug: 'glideduration',
    name: 'GlideDuration',
    category: 'Date/Time',
    scope: 'both',
    global_var: 'GlideDuration',
    description: 'Represents a span of time. Used for SLA calculations, work schedules, and comparing time spans.',
    methods: [
      { name:'new GlideDuration(ms)',            desc:'Create from milliseconds.' },
      { name:'new GlideDuration("1 12:00:00")',  desc:'Create from "d HH:mm:ss" string format.' },
      { name:'.getDurationSeconds()',            desc:'Get total seconds.' },
      { name:'.getDayPart()',                    desc:'Get days component.' },
      { name:'.getDisplayValue()',               desc:'Human-readable duration.' },
    ],
    code_example: `var dur = new GlideDuration('2 08:30:00'); // 2 days 8.5 hours
gs.info(dur.getDurationSeconds() / 3600 + ' hours');`,
    gotcha: '',
  },

  // ── ELEMENT / FIELD ───────────────────────────────────────────────────────
  {
    slug: 'glideelement',
    name: 'GlideElement',
    category: 'Field Operations',
    scope: 'both',
    global_var: 'current.fieldName (auto)',
    description: 'Represents a single field on a GlideRecord. Accessed as current.field_name or gr.field_name. Provides methods for value access, change detection, and field metadata.',
    methods: [
      { name:'.getValue()',                      desc:'Get internal value (sys_id for references).' },
      { name:'.getDisplayValue()',               desc:'Get display value (name for references).' },
      { name:'.setValue(value)',                 desc:'Set field value.' },
      { name:'.changes()',                       desc:'True if field was changed in this operation.' },
      { name:'.changesFrom(value)',              desc:'True if field changed FROM the specified value.' },
      { name:'.changesTo(value)',                desc:'True if field changed TO the specified value.' },
      { name:'.nil()',                           desc:'True if field is empty/null.' },
      { name:'.getReferenceTable()',             desc:'Get the table name a reference field points to.' },
      { name:'.getRefRecord()',                  desc:'Get the referenced GlideRecord object.' },
      { name:'.getLabel()',                      desc:'Get the field label.' },
      { name:'.getED()',                         desc:'Get GlideElementDescriptor for field metadata.' },
    ],
    code_example: `// In Business Rule (on incident table)
if (current.priority.changes()) {
  gs.info('Priority changed from: ' + current.priority.changesFrom('1'));
}
if (!current.assigned_to.nil()) {
  var assignee = current.assigned_to.getRefRecord();
  gs.info('Assignee email: ' + assignee.email);
}`,
    gotcha: 'Never compare current.field == null — use current.field.nil(). The field object is never null, even if the value is.',
  },

  // ── EMAIL ─────────────────────────────────────────────────────────────────
  {
    slug: 'glideemailoutbound',
    name: 'GlideEmailOutbound',
    category: 'Email',
    scope: 'both',
    global_var: 'email (in mail scripts)',
    description: 'Send outbound emails programmatically. Available in Script Includes, Business Rules, and Mail Scripts.',
    methods: [
      { name:'.setSubject(str)',       desc:'Set email subject.' },
      { name:'.setBody(html)',         desc:'Set HTML email body.' },
      { name:'.addAddress("to", addr)',desc:'Add To recipient.' },
      { name:'.addAddress("cc", addr)',desc:'Add CC recipient.' },
      { name:'.addAddress("from", addr)',desc:'Set From address.' },
      { name:'.setReplyTo(addr)',      desc:'Set Reply-To address.' },
      { name:'.save()',                desc:'Queue the email for sending.' },
    ],
    code_example: `var email = new GlideEmailOutbound();
email.setSubject('Incident ' + current.number + ' Created');
email.addAddress('to', 'admin@company.com');
email.setBody('<h3>New Incident</h3><p>' + current.short_description + '</p>');
email.save();`,
    gotcha: 'email.save() queues, not sends immediately. Use the global email object inside mail scripts — GlideEmailOutbound for manual sends.',
  },

  // ── ATTACHMENTS ───────────────────────────────────────────────────────────
  {
    slug: 'glidesysattachment',
    name: 'GlideSysAttachment',
    category: 'Attachments',
    scope: 'both',
    global_var: 'GlideSysAttachment',
    description: 'Server-side API to read, write, and delete file attachments on records.',
    methods: [
      { name:'new GlideSysAttachment()',                    desc:'Constructor.' },
      { name:'.write(gr, fileName, contentType, content)',  desc:'Attach a string or binary content to a record.' },
      { name:'.writeContentStream(gr, fileName, type, stream)', desc:'Attach using an InputStream (for large files).' },
      { name:'.getContent(gr)',                             desc:'Get attachment content as string.' },
      { name:'.getContentBase64(gr)',                       desc:'Get content as base64 string.' },
      { name:'.getContentStream(sys_id)',                  desc:'Get InputStream for attachment.' },
      { name:'.deleteAttachment(sys_id)',                  desc:'Delete an attachment by sys_id.' },
    ],
    code_example: `var sa = new GlideSysAttachment();
var content = sa.getContent(current); // current = sys_attachment record
gs.info('File content: ' + content.substring(0, 100));

// Attach a file to an incident
var gr = new GlideRecord('incident');
gr.get('abc123sys_id');
sa.write(gr, 'report.txt', 'text/plain', 'Report content here...');`,
    gotcha: 'getContent() limited to 5MB. Use getContentStream() for large files.',
  },

  // ── OAUTH ─────────────────────────────────────────────────────────────────
  {
    slug: 'glideoauthclient',
    name: 'GlideOAuthClient',
    category: 'Authentication',
    scope: 'both',
    global_var: 'GlideOAuthClient',
    description: 'Manage OAuth 2.0 access and refresh tokens for outbound integrations. Use when making authenticated REST calls to external systems.',
    methods: [
      { name:'new GlideOAuthClient()',                     desc:'Constructor.' },
      { name:'.requestToken(providerName, grantRequest)',  desc:'Request a new token from the OAuth provider.' },
      { name:'.revokeToken(providerName, accessToken, refreshToken, request)', desc:'Revoke an access token.' },
    ],
    code_example: `var oAuthClient = new GlideOAuthClient();
var request = new GlideOAuthClientRequest();
request.setGrantType('password');
request.setUserName('user');
request.setPassword('pass');
var token = oAuthClient.requestToken('MyOAuthProvider', request);
if (token.getErrorCode() === '') {
  var accessToken = token.getToken().getAccessToken();
}`,
    gotcha: 'Store OAuth profiles in Connection & Credential Aliases. Do NOT hardcode tokens — use the OAuthClient to retrieve them dynamically.',
  },

  // ── REST MESSAGE ──────────────────────────────────────────────────────────
  {
    slug: 'restmessagev2',
    name: 'RESTMessageV2',
    category: 'Outbound REST',
    scope: 'both',
    global_var: 'RESTMessageV2',
    description: 'Make outbound REST calls from server-side scripts. Supports GET, POST, PUT, PATCH, DELETE. Can reference REST Message configurations or be fully ad-hoc.',
    methods: [
      { name:'new RESTMessageV2(name?, method?)',      desc:'Constructor. Optionally reference a REST Message record.' },
      { name:'.setEndpoint(url)',                      desc:'Set the endpoint URL.' },
      { name:'.setHttpMethod(method)',                 desc:'Set HTTP method: GET, POST, PUT, PATCH, DELETE.' },
      { name:'.setRequestHeader(name, value)',         desc:'Add request header.' },
      { name:'.setRequestBody(json)',                  desc:'Set JSON request body.' },
      { name:'.execute()',                             desc:'Execute synchronously. Returns RESTResponseV2.' },
      { name:'.executeAsync()',                        desc:'Execute asynchronously.' },
      { name:'.setBasicAuth(user, pass)',              desc:'Set Basic Authentication.' },
      { name:'.setQueryParameter(name, value)',        desc:'Add URL query parameter.' },
    ],
    code_example: `var rm = new RESTMessageV2();
rm.setEndpoint('https://api.example.com/users');
rm.setHttpMethod('POST');
rm.setRequestHeader('Content-Type', 'application/json');
rm.setRequestHeader('Authorization', 'Bearer ' + token);
rm.setRequestBody(JSON.stringify({ name: 'John', email: 'j@example.com' }));

var response = rm.execute();
var status = response.getStatusCode();
var body = response.getBody();
var result = JSON.parse(body);`,
    gotcha: 'Always check response.getStatusCode() before parsing body. Use executeAsync() for non-blocking calls in Business Rules.',
  },

  // ── SCOPED SPECIFIC ───────────────────────────────────────────────────────
  {
    slug: 'scopedcachemanager',
    name: 'ScopedCacheManager',
    category: 'Performance',
    scope: 'scoped_only',
    global_var: 'ScopedCacheManager',
    description: 'Cache data within a scoped application. Avoids repeated database queries for relatively static data. Scoped equivalent of system-level caching.',
    methods: [
      { name:'ScopedCacheManager.get(cacheName, key)',       desc:'Get a cached value.' },
      { name:'ScopedCacheManager.put(cacheName, key, value)', desc:'Store a value.' },
      { name:'ScopedCacheManager.remove(cacheName, key)',    desc:'Remove a cached entry.' },
      { name:'ScopedCacheManager.flush(cacheName)',          desc:'Invalidate entire cache.' },
    ],
    code_example: `var cache = ScopedCacheManager;
var cached = cache.get('myCache', 'configKey');
if (!cached) {
  var gr = new GlideRecord('u_config');
  gr.get('name', 'configKey');
  cached = gr.getValue('value');
  cache.put('myCache', 'configKey', cached);
}`,
    gotcha: 'Cache is per-node in a cluster. Do not cache user-specific data — cache is shared across all users. Available in scoped apps only.',
  },

  // ── WORKFLOW / FLOW ───────────────────────────────────────────────────────
  {
    slug: 'flowapi',
    name: 'FlowAPI (sn_fd)',
    category: 'Automation',
    scope: 'both',
    global_var: 'sn_fd.FlowAPI',
    description: 'Start flows, subflows, and actions from server-side scripts. The modern way to trigger automation programmatically.',
    methods: [
      { name:'sn_fd.FlowAPI.startFlow(name, inputs, runAs?)', desc:'Start a flow by sys_name. Returns context object.' },
      { name:'sn_fd.FlowAPI.startSubflow(name, inputs)',      desc:'Start a subflow.' },
      { name:'sn_fd.FlowAPI.startAction(name, inputs)',       desc:'Run a single Flow Designer action.' },
      { name:'sn_fd.FlowAPI.executeAction(name, inputs)',     desc:'Execute action synchronously (blocking).' },
    ],
    code_example: `// Trigger flow from Business Rule
var inputs = {};
inputs['current'] = current; // pass current record
inputs['table_name'] = 'incident';

sn_fd.FlowAPI.startFlow('global/notify_manager_flow', inputs, gs.getUserID());`,
    gotcha: 'Flow names must match the internal API name, not the display name. Scoped flows use scope_prefix/flow_name format.',
  },
];

// ─── CLIENT-SIDE APIs ─────────────────────────────────────────────────────────
const CLIENT_APIS = [
  {
    slug: 'glideform',
    name: 'GlideForm (g_form)',
    category: 'Form',
    scope: 'client_only',
    global_var: 'g_form',
    description: 'The primary client-side API for interacting with the current form. Controls field values, visibility, read-only states, messages, and form submission. Available in Client Scripts, UI Policies, UI Actions (client-side), and Catalog Client Scripts.',
    methods: [
      { name:'g_form.getValue(field)',               desc:'Get the current value of a field.' },
      { name:'g_form.setValue(field, value)',         desc:'Set a field value. For reference fields: setValue(field, sysId, displayValue).' },
      { name:'g_form.getDisplayValue(field)',         desc:'Get the display value of a field (reference label, not sys_id).' },
      { name:'g_form.setVisible(field, bool)',        desc:'Show or hide a field.' },
      { name:'g_form.setReadOnly(field, bool)',       desc:'Make a field read-only or editable.' },
      { name:'g_form.setMandatory(field, bool)',      desc:'Make a field required or optional.' },
      { name:'g_form.addErrorMessage(field, msg)',    desc:'Show validation error below a specific field.' },
      { name:'g_form.clearMessages()',                desc:'Remove all form-level messages.' },
      { name:'g_form.showFieldMsg(field, msg, type)', desc:'Show message below field. type: info, warning, error.' },
      { name:'g_form.hideFieldMsg(field)',            desc:'Remove field-level message.' },
      { name:'g_form.addInfoMessage(msg)',            desc:'Show blue info message at top of form.' },
      { name:'g_form.addErrorMessage(msg)',           desc:'Show red error message at top of form.' },
      { name:'g_form.getControl(field)',              desc:'Get the DOM input element for a field.' },
      { name:'g_form.getElement(field)',              desc:'Get the field container element.' },
      { name:'g_form.submit(verb?)',                  desc:'Submit the form. verb = UI Action name (e.g., "Save").' },
      { name:'g_form.save()',                         desc:'Save the form without navigating away (update).' },
      { name:'g_form.getTableName()',                 desc:'Get the current table name.' },
      { name:'g_form.getUniqueValue()',               desc:'Get the sys_id of the current record.' },
      { name:'g_form.getSections()',                  desc:'Get array of section names.' },
      { name:'g_form.setSectionDisplay(section, bool)', desc:'Show/hide a form section.' },
      { name:'g_form.isNewRecord()',                  desc:'True if this is an unsaved new record.' },
      { name:'g_form.hasField(field)',                desc:'True if field exists on the form.' },
      { name:'g_form.setLabelOf(field, label)',       desc:'Change field label at runtime.' },
    ],
    code_example: `// onChange Client Script
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return; // don't run on page load
  
  if (newValue === '1') { // Critical priority
    g_form.setMandatory('assignment_group', true);
    g_form.showFieldMsg('assignment_group', 'Required for critical incidents', 'warning');
  } else {
    g_form.setMandatory('assignment_group', false);
    g_form.hideFieldMsg('assignment_group');
  }
}`,
    gotcha: 'g_form is only available in client-side scripts. Cannot be used in Business Rules or Script Includes. For reference fields, setValue requires both the sys_id and display value: g_form.setValue("field", sysId, "Display Name").',
  },
  {
    slug: 'glideuser-client',
    name: 'GlideUser (g_user)',
    category: 'User',
    scope: 'client_only',
    global_var: 'g_user',
    description: 'Client-side user information API. Provides cached user data without requiring a GlideRecord query — much faster than server-side lookups from client scripts.',
    methods: [
      { name:'g_user.userName',         desc:'Username (login name) of current user. Property, not method.' },
      { name:'g_user.userID',           desc:'sys_id of current user. Property.' },
      { name:'g_user.firstName',        desc:'First name. Property.' },
      { name:'g_user.lastName',         desc:'Last name. Property.' },
      { name:'g_user.getFullName()',     desc:'Return full display name.' },
      { name:'g_user.hasRole(role)',     desc:'True if user has the specified role.' },
      { name:'g_user.hasRoleExactly(role)', desc:'True if user has role directly assigned (not inherited).' },
      { name:'g_user.hasRoleFromList(roles)', desc:'True if user has any role in comma-separated list.' },
      { name:'g_user.getClientData(key)', desc:'Get client data set by server via putClientData().' },
    ],
    code_example: `// Hide field for non-admins
function onLoad() {
  if (!g_user.hasRole('admin')) {
    g_form.setVisible('internal_notes', false);
  }
  // Access user info
  var userId = g_user.userID;
  var name = g_user.getFullName();
}`,
    gotcha: 'g_user.hasRole() checks session roles only — not real-time DB. Use when page loaded. Use GlideAjax with server-side check for real-time role validation.',
  },
  {
    slug: 'glideajax',
    name: 'GlideAjax',
    category: 'Client-Server Communication',
    scope: 'client_only',
    global_var: 'GlideAjax',
    description: 'Execute server-side Script Include methods from client scripts without a full page reload. The bridge between client and server scripting. Returns data asynchronously.',
    methods: [
      { name:'new GlideAjax(scriptIncludeName)',  desc:'Constructor. Must match a Script Include with client_callable=true.' },
      { name:'.addParam("sysparm_name", method)', desc:'Set which method to call on the Script Include.' },
      { name:'.addParam(name, value)',             desc:'Add parameters to pass to the server method.' },
      { name:'.getXML(callback)',                  desc:'Execute asynchronously. Callback receives XMLDocument.' },
      { name:'.getXMLWait()',                      desc:'Execute synchronously (BLOCKS UI — use sparingly).' },
      { name:'.getAnswer()',                       desc:'Inside callback — get the return value from server.' },
    ],
    code_example: `// Client Script calls server-side Script Include
function onChange(control, oldValue, newValue, isLoading) {
  var ga = new GlideAjax('IncidentUtils'); // Script Include name
  ga.addParam('sysparm_name', 'getAssignmentGroup'); // method name
  ga.addParam('sysparm_category', newValue); // parameter
  ga.getXML(function(response) {
    var answer = response.responseXML.documentElement.getAttribute('answer');
    g_form.setValue('assignment_group', answer);
  });
}

// Script Include (server-side):
var IncidentUtils = Class.create();
IncidentUtils.prototype = Object.extendsObject(AbstractAjaxProcessor, {
  getAssignmentGroup: function() {
    var cat = this.getParameter('sysparm_category');
    // ... lookup logic ...
    return groupSysId;
  }
});`,
    gotcha: 'Script Include MUST have Client Callable = true. Never use getXMLWait() — it blocks the browser. Always use async getXML() with a callback.',
  },
  {
    slug: 'glidelist',
    name: 'GlideList2 (g_list)',
    category: 'List',
    scope: 'client_only',
    global_var: 'g_list',
    description: 'Client-side API for interacting with list views. Add filters, refresh lists, and get selected records.',
    methods: [
      { name:'g_list.get(listID)',              desc:'Get GlideList2 object for a list.' },
      { name:'.addFilter(query)',               desc:'Add filter to list.' },
      { name:'.setFilterAndRefresh(query)',     desc:'Apply filter and reload list.' },
      { name:'.refresh()',                      desc:'Reload the list.' },
      { name:'.getChecked()',                   desc:'Get comma-separated sys_ids of checked rows.' },
    ],
    code_example: `// In a UI Action on a list
var list = g_list.get(gel('sys_ids'));
list.setFilterAndRefresh('active=true^priority=1');`,
    gotcha: 'g_list is only available in List context (list client scripts, list UI actions). Not available on forms.',
  },
  {
    slug: 'glidedialogwindow',
    name: 'GlideDialogWindow',
    category: 'UI',
    scope: 'client_only',
    global_var: 'GlideDialogWindow',
    description: 'Open modal dialog windows in the ServiceNow UI. Used to display forms, messages, or custom content as overlays.',
    methods: [
      { name:'new GlideDialogWindow(url)',    desc:'Create dialog from a URL or $returnValue for modals.' },
      { name:'.setTitle(title)',             desc:'Set dialog title.' },
      { name:'.setWidth(pixels)',            desc:'Set dialog width.' },
      { name:'.setHeight(pixels)',           desc:'Set dialog height.' },
      { name:'.render()',                    desc:'Display the dialog.' },
      { name:'.destroy()',                   desc:'Close and remove dialog.' },
      { name:'GlideDialog.get(name)',        desc:'Get an existing dialog.' },
    ],
    code_example: `// Open a custom UI page as modal
var dialog = new GlideDialogWindow('confirm_action');
dialog.setTitle('Confirm Action');
dialog.setWidth(400);
dialog.setHeight(200);
dialog.render();`,
    gotcha: 'Dialogs are deprecated in the Next Experience UI (Agent Workspace). Use modals/popovers in Next Experience instead.',
  },
  {
    slug: 'sputil',
    name: 'spUtil (Service Portal)',
    category: 'Service Portal',
    scope: 'service_portal',
    global_var: 'spUtil',
    description: 'Utility methods available in Service Portal widgets. Provides navigation, alerts, and data fetching functions.',
    methods: [
      { name:'spUtil.addInfoMessage(msg)',        desc:'Show info notification in portal.' },
      { name:'spUtil.addErrorMessage(msg)',       desc:'Show error notification.' },
      { name:'spUtil.get(widget, options)',        desc:'Embed a widget inside another widget.' },
      { name:'spUtil.navigate(url)',              desc:'Navigate to URL in portal.' },
      { name:'spUtil.recordWatch(scope, table, query, cb)', desc:'Watch for record changes in real time.' },
    ],
    code_example: `// In Service Portal Widget Client Script
function($scope, spUtil) {
  spUtil.addInfoMessage('Form submitted successfully!');
  spUtil.navigate('/sp?id=ticket&table=incident&sys_id=' + sysId);
}`,
    gotcha: 'spUtil is Angular-injected — must be declared as a dependency in the widget Client Script function signature.',
  },
];

// ─── SCRIPTING CONTEXTS ───────────────────────────────────────────────────────
const SCRIPTING_CONTEXTS = [
  {
    slug: 'business-rule',
    name: 'Business Rule',
    type: 'Server-Side',
    scope: 'both',
    when_runs: 'Before/After/Async database operations on a table. Triggers on Insert, Update, Delete, Query.',
    available_vars: [
      { var:'current',  desc:'Current GlideRecord being acted on. Writable in Before rules.' },
      { var:'previous', desc:'GlideRecord snapshot before changes. Read-only. Available on update/delete.' },
      { var:'gs',       desc:'GlideSystem — logging, user info, system operations.' },
    ],
    types: [
      { type:'Before', desc:'Runs before record saves to DB. Can modify current, abort action.' },
      { type:'After',  desc:'Runs after record saves. current has new sys_id on insert.' },
      { type:'Async',  desc:'Runs in background after save. Does not block user. Use for slow operations.' },
      { type:'Display',desc:'Runs when record is loaded for display. Can set g_scratchpad values for client scripts.' },
    ],
    best_practices: [
      'Use Async for email sending, slow integrations, reporting updates.',
      'Keep Before rules fast — they block the user save.',
      'Check current.operation() to run only on insert or update.',
      'Use current.setAbortAction(true) to prevent save with error message.',
    ],
    code_example: `// Before Business Rule — validate priority escalation
if (current.operation() === 'update' &&
    current.priority.changesTo('1') &&
    !gs.hasRole('itil_manager')) {
  gs.addErrorMessage('Only ITIL Managers can escalate to Critical priority.');
  current.setAbortAction(true);
}`,
    gotcha: 'Never use GlideRecord queries in Display Business Rules — they execute on every form open. Display rules are for g_scratchpad only.',
  },
  {
    slug: 'script-include',
    name: 'Script Include',
    type: 'Server-Side',
    scope: 'both',
    when_runs: 'Called from other server scripts (Business Rules, REST APIs, Workflows) or client scripts (via GlideAjax for client-callable ones).',
    available_vars: [
      { var:'gs',    desc:'GlideSystem' },
      { var:'Class.create()', desc:'Create a class using ServiceNow OOP pattern.' },
    ],
    types: [
      { type:'Standard',       desc:'Server-side only. Called from other scripts.' },
      { type:'Client Callable', desc:'Can be called via GlideAjax from client scripts. Must extend AbstractAjaxProcessor.' },
    ],
    best_practices: [
      'Script Includes are the ServiceNow equivalent of libraries. Put reusable logic here.',
      'Name clearly: IncidentUtils, UserProvisioner, etc.',
      'Client-callable includes must extend AbstractAjaxProcessor and set Client Callable = true.',
    ],
    code_example: `// Standard Script Include
var MyUtils = Class.create();
MyUtils.prototype = {
  initialize: function() {},
  getActiveIncidents: function(assigneeId) {
    var gr = new GlideRecord('incident');
    gr.addQuery('assigned_to', assigneeId);
    gr.addQuery('active', true);
    gr.query();
    return gr.getRowCount();
  },
  type: 'MyUtils'
};`,
    gotcha: 'Script Includes are NOT auto-loaded. They are loaded on-demand. Declare the type property with the class name for proper instantiation.',
  },
  {
    slug: 'client-script',
    name: 'Client Script',
    type: 'Client-Side',
    scope: 'both',
    when_runs: 'Runs in the browser when the form loads or a field changes.',
    available_vars: [
      { var:'g_form',  desc:'GlideForm — form manipulation.' },
      { var:'g_user',  desc:'GlideUser — current user info.' },
      { var:'GlideAjax', desc:'For server calls.' },
    ],
    types: [
      { type:'onLoad',    desc:'Runs when form loads. Use for initial UI setup.' },
      { type:'onChange',  desc:'Runs when a specific field value changes. Receives: control, oldValue, newValue, isLoading.' },
      { type:'onSubmit',  desc:'Runs when form is submitted. Return false to cancel submission.' },
      { type:'onCellEdit', desc:'Runs in list editing when a cell is changed.' },
    ],
    best_practices: [
      'Always check isLoading in onChange — it fires on page load with empty oldValue.',
      'Avoid GlideRecord queries in client scripts — use GlideAjax instead.',
      'Use UI Policies for simple show/hide/mandatory — they are faster than Client Scripts.',
    ],
    code_example: `// onLoad — set up form based on user role
function onLoad() {
  if (!g_user.hasRole('itil')) {
    g_form.setReadOnly('priority', true);
    g_form.setReadOnly('impact', true);
  }
  if (g_form.getValue('state') === '6') { // Closed
    g_form.setReadOnly(true); // read-only entire form
  }
}`,
    gotcha: 'Client Scripts run for ALL users who open the form. Scope client scripts tightly. Heavy scripts slow down every form open.',
  },
  {
    slug: 'ui-policy',
    name: 'UI Policy',
    type: 'Client-Side',
    scope: 'both',
    when_runs: 'Runs declaratively in the browser — no JavaScript required for basic field show/hide/mandatory.',
    available_vars: [],
    types: [
      { type:'UI Policy', desc:'Declarative: set field visibility, mandatory, read-only based on conditions.' },
      { type:'UI Policy Action (Script)', desc:'Advanced JS in the Execute If True/False scripts. g_form available.' },
    ],
    best_practices: [
      'Use UI Policies over Client Scripts for simple field visibility/mandatory — they are faster and declaratively managed.',
      'Set Inherit to true so child records respect the policy.',
      'Run scripts = true only when declarative options are insufficient.',
    ],
    code_example: `// UI Policy with script for advanced logic
// Execute if True script:
function onCondition() {
  g_form.setDisplay('workaround', true);
  g_form.showFieldMsg('priority', 'This incident has been escalated', 'info');
}`,
    gotcha: 'UI Policies fire after Client Scripts. If both modify the same field, UI Policy wins. Cannot use GlideAjax in UI Policy scripts.',
  },
  {
    slug: 'scheduled-job',
    name: 'Scheduled Script Execution',
    type: 'Server-Side',
    scope: 'both',
    when_runs: 'Runs on a schedule (cron-like). Used for maintenance, report generation, daily processing.',
    available_vars: [
      { var:'gs',          desc:'GlideSystem — full access.' },
      { var:'GlideRecord', desc:'Full DB access.' },
    ],
    types: [
      { type:'Scheduled Script', desc:'Custom JavaScript on a schedule.' },
      { type:'Data Collection',  desc:'Performance Analytics data collection.' },
    ],
    best_practices: [
      'Use gs.isInteractive() = false to confirm background context.',
      'Keep scheduled jobs idempotent — safe to run multiple times.',
      'Log start/end times for monitoring.',
      'Use Async Business Rules instead for record-triggered processing.',
    ],
    code_example: `// Scheduled job — close old resolved incidents
var gr = new GlideRecord('incident');
gr.addQuery('state', '5'); // Resolved
gr.addQuery('resolved_at', '<', gs.daysAgo(30));
gr.query();
var count = 0;
while (gr.next()) {
  gr.setValue('state', '6'); // Closed
  gr.setWorkflow(false); // Skip business rules
  gr.update();
  count++;
}
gs.info('Auto-closed ' + count + ' incidents');`,
    gotcha: 'Scheduled jobs run as the admin user by default. Set Run As to specify a service account. Add error handling — uncaught exceptions kill the job silently.',
  },
  {
    slug: 'fix-script',
    name: 'Fix Script',
    type: 'Server-Side',
    scope: 'both',
    when_runs: 'One-time execution during instance upgrades or migrations. Shipped with Update Sets.',
    available_vars: [{ var:'gs', desc:'GlideSystem.' }],
    types: [{ type:'Fix Script', desc:'Run-once administrative scripts packaged with updates.' }],
    best_practices: [
      'Mark scripts as Run Once = true.',
      'Test in dev before running in production.',
      'Log success/failure clearly.',
    ],
    code_example: `// Fix Script — migrate field values
var gr = new GlideRecord('incident');
gr.addQuery('u_old_category', '!=', '');
gr.query();
while (gr.next()) {
  gr.setValue('u_new_category', mapCategory(gr.u_old_category.toString()));
  gr.update();
}
gs.info('Migration complete');`,
    gotcha: 'Fix Scripts cannot be rolled back. Test thoroughly in a lower environment first.',
  },
  {
    slug: 'acl',
    name: 'Access Control Rule (ACL)',
    type: 'Server-Side',
    scope: 'both',
    when_runs: 'Evaluated on every record access, field read/write, or REST API call. Controls who can see/edit data.',
    available_vars: [
      { var:'current',   desc:'Record being accessed.' },
      { var:'gs',        desc:'GlideSystem.' },
      { var:'answer',    desc:'Boolean — set to true to grant access, false to deny.' },
    ],
    types: [
      { type:'record (read)',   desc:'Can user read the record at all?' },
      { type:'record (write)',  desc:'Can user modify the record?' },
      { type:'record (create)', desc:'Can user create new records?' },
      { type:'record (delete)', desc:'Can user delete records?' },
      { type:'field (read)',    desc:'Can user see this specific field?' },
      { type:'field (write)',   desc:'Can user edit this specific field?' },
    ],
    code_example: `// ACL Script — only show salary to HR or the employee themselves
answer = gs.hasRole('hr_admin') || 
         gs.getUserID() === current.user.toString();`,
    gotcha: 'ACLs stack — a user needs ALL applicable ACLs to pass. The most restrictive wins. Condition field is evaluated first (cheap), Script runs only if Condition passes (expensive).',
  },
  {
    slug: 'flow-designer-script',
    name: 'Flow Designer Script Step',
    type: 'Server-Side',
    scope: 'scoped_only',
    when_runs: 'Inside a Flow Designer flow or action as a Script step.',
    available_vars: [
      { var:'inputs',  desc:'Object containing input variables passed to the script step.' },
      { var:'outputs', desc:'Object to set output variables returned from the step.' },
      { var:'gs',      desc:'GlideSystem.' },
    ],
    code_example: `// Flow Designer Script step
(function execute(inputs, outputs) {
  var incidentId = inputs.incident_sys_id;
  var gr = new GlideRecord('incident');
  if (gr.get(incidentId)) {
    outputs.incident_number = gr.number.toString();
    outputs.priority = gr.priority.toString();
  }
})(inputs, outputs);`,
    gotcha: 'Always declare input/output variable types in the Action designer before using them in scripts. Undeclared outputs are not available to subsequent flow steps.',
  },
];

// ─── SCOPED vs GLOBAL DIFFERENCES ────────────────────────────────────────────
const SCOPE_COMPARISON = [
  {
    topic: 'GlideRecord Cross-Table Access',
    scoped: 'Can only query tables in own scope or tables granted cross-scope access. Other scope tables require ACL setup.',
    global: 'Can query any table without restriction.',
    gotcha: 'Most common source of "GlideRecord returned no results" bugs in scoped apps.',
  },
  {
    topic: 'gs.print()',
    scoped: 'NOT AVAILABLE. Use gs.info(), gs.warn(), gs.error(), gs.debug() instead.',
    global: 'Available.',
    gotcha: 'Scripts silently fail if gs.print() used in scoped context.',
  },
  {
    topic: 'gs.nowDateTime()',
    scoped: 'NOT AVAILABLE. Use new GlideDateTime().getDisplayValue() instead.',
    global: 'Available.',
    gotcha: '',
  },
  {
    topic: 'Global Script Includes',
    scoped: 'Cannot call global Script Includes directly. Must use global.ClassName syntax and global scope must grant access.',
    global: 'Full access to all Script Includes.',
    gotcha: 'Prefix with "global." when calling global Script Includes from scoped: var w = new global.Workflow();',
  },
  {
    topic: 'System Properties (gs.getProperty)',
    scoped: 'Can only read/write properties within own scope namespace (x_scope_app.*).',
    global: 'Can read/write any system property.',
    gotcha: 'Use gs.getProperty() with full scoped property name: gs.getProperty("x_myapp_mycompany.setting")',
  },
  {
    topic: 'Workflow API',
    scoped: 'Use sn_fd.FlowAPI for Flow Designer. Legacy Workflow API limited.',
    global: 'Full Workflow API: new global.Workflow(); w.startFlow(...).',
    gotcha: 'New scoped apps should use Flow Designer exclusively. Legacy workflows discouraged.',
  },
  {
    topic: 'Table Prefix',
    scoped: 'All custom tables prefixed with x_<company>_<scope>_. Cannot create u_ tables.',
    global: 'Custom tables typically use u_ prefix.',
    gotcha: 'This means scoped table names are long. Use aliases in UI for display names.',
  },
  {
    topic: 'Script Include Protection',
    scoped: 'Script Includes are private to scope by default. Must explicitly mark as accessible.',
    global: 'All Script Includes available to all scripts.',
    gotcha: 'Set Script Include to global scope if needed by external scopes.',
  },
];

export {  REST_APIS, SERVER_APIS, CLIENT_APIS, SCRIPTING_CONTEXTS, SCOPE_COMPARISON  };
