// AI Code Generator for ServiceNow scripts
// Generates production-ready, commented code for all script types

export const CODE_TYPES = {
  business_rule: {
    label: 'Business Rule',
    icon: '⚡',
    description: 'Server-side automation triggered on record events',
    when_options: ['before', 'after', 'async', 'display'],
    table_required: true,
  },
  script_include: {
    label: 'Script Include',
    icon: '📦',
    description: 'Reusable server-side JavaScript library',
    table_required: false,
  },
  client_script: {
    label: 'Client Script',
    icon: '🖥️',
    description: 'Browser-side form automation',
    when_options: ['onLoad', 'onChange', 'onSubmit', 'onCellEdit'],
    table_required: true,
  },
  scheduled_job: {
    label: 'Scheduled Job',
    icon: '⏰',
    description: 'Runs on a schedule (daily, hourly, etc)',
    table_required: false,
  },
  rest_api: {
    label: 'Scripted REST API',
    icon: '🔌',
    description: 'Custom REST endpoint on ServiceNow',
    table_required: false,
  },
  transform_map: {
    label: 'Transform Map Script',
    icon: '🔄',
    description: 'Data transformation during import',
    table_required: false,
  },
  flow_script: {
    label: 'Flow Designer Script Action',
    icon: '⚙️',
    description: 'Custom script action for Flow Designer',
    table_required: false,
  },
};

export function buildSystemPrompt(codeType, config = {}) {
  const base = `You are a senior ServiceNow architect with 15+ years experience.
Generate PRODUCTION-READY ServiceNow ${CODE_TYPES[codeType]?.label} code.

REQUIREMENTS:
- Include proper error handling (try/catch)
- Add JSDoc comments explaining what the code does
- Follow ServiceNow best practices (setLimit, GlideAggregate for counts, etc)
- Use proper ServiceNow APIs (not browser JS in server scripts)
- Include inline comments for complex logic
- Make it copy-paste ready — no placeholders like YOUR_VALUE

OUTPUT FORMAT: Return ONLY the JavaScript code with comments. No markdown, no explanation outside the code.`;

  const typeSpecific = {
    business_rule: `
Table: ${config.tableName || 'incident'}
When: ${config.when || 'before'}
Operation: ${config.operation || 'insert, update'}
Conditions: ${config.conditions || 'none'}

Structure:
(function executeRule(current, previous) {
  // Your code here
})(current, previous);`,

    script_include: `
Name: ${config.name || 'MyHelper'}
Access: ${config.access || 'public'}

Structure (OOP pattern preferred):
var MyHelper = Class.create();
MyHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
  myMethod: function() { ... },
  type: 'MyHelper'
});`,

    client_script: `
Table: ${config.tableName || 'incident'}
Type: ${config.when || 'onLoad'}
Use g_form, g_user APIs only. No GlideRecord in client scripts.`,

    scheduled_job: `
Generate a complete Scheduled Job script with:
- Error handling
- gs.info() logging
- Batch processing if applicable`,

    rest_api: `
Method: ${config.method || 'GET'}
Path: ${config.path || '/api/x_custom/endpoint'}
Generate complete Scripted REST Resource with request/response handling.`,
  };

  return base + (typeSpecific[codeType] || '');
}
