// ServiceNow Code Generator — type definitions and system prompts

export const CODE_TYPES = {
  business_rule: {
    label: 'Business Rule',
    description: 'Server-side logic that runs when records are inserted, updated, or deleted',
    icon: '⚙️',
  },
  script_include: {
    label: 'Script Include',
    description: 'Reusable server-side JavaScript library callable from other scripts',
    icon: '📦',
  },
  client_script: {
    label: 'Client Script',
    description: 'Browser-side script that runs on form load, submit, or field change',
    icon: '🖥️',
  },
  scheduled_job: {
    label: 'Scheduled Job',
    description: 'Automated task that runs on a schedule (e.g. nightly cleanup)',
    icon: '⏰',
  },
  rest_api: {
    label: 'Scripted REST API',
    description: 'Custom REST endpoint built on the ServiceNow platform',
    icon: '🔌',
  },
  transform_map: {
    label: 'Transform Map Script',
    description: 'Data transformation logic used during import set processing',
    icon: '🔄',
  },
  flow_script: {
    label: 'Flow Designer Script Action',
    description: 'Reusable script action for use inside Flow Designer flows',
    icon: '🔀',
  },
};

const BASE_PROMPT = `You are a senior ServiceNow architect with 15+ years of experience.
Generate PRODUCTION-READY code following all ServiceNow best practices:
- Always include proper error handling (try/catch)
- Add JSDoc comments explaining purpose and parameters
- Use setLimit() before GlideRecord queries
- Never use eval(), synchronous GlideAjax, or current.update() in Business Rules
- Add inline comments for complex logic
- Make it copy-paste ready with no placeholders
Return ONLY the JavaScript code with comments. No markdown backticks, no explanation outside the code.`;

export function buildSystemPrompt(codeType, config = {}) {
  const type = CODE_TYPES[codeType];
  if (!type) {
    return `${BASE_PROMPT}\nGenerate a ServiceNow script that is production-ready and well-commented.`;
  }

  const contextMap = {
    business_rule: `
Table: ${config.tableName || 'incident'}
Trigger: ${config.when || 'before'} insert/update
Wrap code in: (function executeRule(current, previous) { /* YOUR CODE */ })(current, previous);
Important: Do NOT call current.update() — the platform saves automatically.`,

    script_include: `
Access: ${config.access || 'public'}
Use Class.create() OOP pattern with initialize() method.
Example structure: var MyClass = Class.create(); MyClass.prototype = { initialize: function() {}, myMethod: function() {}, type: 'MyClass' };`,

    client_script: `
Table: ${config.tableName || 'incident'}
Type: ${config.when || 'onLoad'}
IMPORTANT: Client scripts run in the BROWSER. Only use client-side APIs:
- g_form (form API), g_user (user info), g_list (list API)
- GlideAjax for server calls (async with callback)
- NEVER use GlideRecord, gs, or any server-side APIs`,

    scheduled_job: `
Use gs.info() for logging — visible in system logs.
Always add try/catch blocks.
Use setLimit() and batch processing for large datasets.
Structure: (function() { /* YOUR CODE */ })();`,

    rest_api: `
HTTP Method: ${config.method || 'GET'}
Endpoint path: ${config.path || '/api/x_custom/my_endpoint'}
Use request.body, request.queryParams for input.
Use response.setBody(), response.setStatus() for output.
Always validate input and return proper HTTP status codes.`,

    transform_map: `
Available variables: source (import row), target (destination record), map (transform map), log, error
Use source.fieldName to read, target.setValue() to write.
Return true to continue, false to skip the row.`,

    flow_script: `
Input parameters come from: inputs.parameter_name
Set output with: outputs.result_name = value
Use try/catch and log errors with gs.error().`,
  };

  const context = contextMap[codeType] || '';
  return `${BASE_PROMPT}\n\nCode type: ${type.label}\n${context}`;
}
