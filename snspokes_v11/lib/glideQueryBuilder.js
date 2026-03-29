// GlideRecord Query Builder Engine
// Generates optimized GlideRecord scripts from conditions

const SN_OPERATORS = {
  '=':          { label: 'equals',           encoded: '=' },
  '!=':         { label: 'does not equal',   encoded: '!=' },
  'contains':   { label: 'contains',         encoded: 'CONTAINS' },
  'not_contains':{ label: 'does not contain', encoded: 'DOES NOT CONTAIN' },
  'starts_with':{ label: 'starts with',      encoded: 'STARTSWITH' },
  '>':          { label: 'greater than',     encoded: '>' },
  '>=':         { label: 'greater than or equal', encoded: '>=' },
  '<':          { label: 'less than',        encoded: '<' },
  '<=':         { label: 'less than or equal', encoded: '<=' },
  'IN':         { label: 'is one of',        encoded: 'IN' },
  'NOT IN':     { label: 'is not one of',    encoded: 'NOT IN' },
  'ISEMPTY':    { label: 'is empty',         encoded: 'ISEMPTY' },
  'ISNOTEMPTY': { label: 'is not empty',     encoded: 'ISNOTEMPTY' },
  'BETWEEN':    { label: 'between',          encoded: 'BETWEEN' },
  'DYNAMIC':    { label: 'dynamic (relative)', encoded: 'DYNAMIC' },
};

const PERFORMANCE_TIPS = {
  no_limit: '⚠️ No LIMIT set — can cause timeouts on large tables. Add gr.setLimit().',
  no_index: '⚠️ Querying without indexed fields may be slow. Consider filtering by sys_created_on or state first.',
  select_all: '💡 Use gr.query([fields]) to fetch only needed fields for better performance.',
  large_table: '⚠️ This table can have millions of records. Always use setLimit() and indexed field queries.',
};

const LARGE_TABLES = ['incident', 'change_request', 'sc_task', 'sc_req_item', 'syslog', 'sys_audit', 'sys_email'];
const INDEXED_FIELDS = {
  incident: ['state', 'priority', 'assigned_to', 'assignment_group', 'sys_created_on', 'number'],
  change_request: ['state', 'type', 'assignment_group', 'sys_created_on'],
  sys_user: ['user_name', 'email', 'active'],
  problem: ['state', 'assignment_group'],
};

export function buildScript({ tableName, conditions = [], orderBy, orderDir = 'ASC', limit, useCount = false, useAggregate = false }) {
  const lines = [];
  const warnings = [];
  const encodedParts = [];

  // Validate
  if (!tableName) return { error: 'Table name required' };

  // Check for performance issues
  if (!limit && LARGE_TABLES.includes(tableName)) {
    warnings.push(PERFORMANCE_TIPS.large_table);
  }
  if (!limit) warnings.push(PERFORMANCE_TIPS.no_limit);

  const indexedForTable = INDEXED_FIELDS[tableName] || [];
  const hasIndexedField = conditions.some(c => indexedForTable.includes(c.field));
  if (conditions.length > 0 && !hasIndexedField && indexedForTable.length > 0) {
    warnings.push(PERFORMANCE_TIPS.no_index);
  }

  // Build script
  if (useAggregate) {
    lines.push(`var ga = new GlideAggregate('${tableName}');`);
  } else {
    lines.push(`var gr = new GlideRecord('${tableName}');`);
  }

  // Conditions
  conditions.forEach((c, i) => {
    if (!c.field || !c.operator) return;

    const op = SN_OPERATORS[c.operator];
    const isJoin = c.type === 'join';

    if (c.operator === 'ISEMPTY' || c.operator === 'ISNOTEMPTY') {
      lines.push(`gr.addQuery('${c.field}', '${op.encoded}', '');`);
      encodedParts.push(`${c.field}${op.encoded}`);
    } else if (c.operator === 'IN' || c.operator === 'NOT IN') {
      const vals = Array.isArray(c.value) ? c.value.join(',') : c.value;
      lines.push(`gr.addQuery('${c.field}', '${op.encoded}', '${vals}');`);
      encodedParts.push(`${c.field}${op.encoded}${vals}`);
    } else if (c.logic === 'OR' && i > 0) {
      // OR condition using addOrCondition
      lines.push(`// OR condition`);
      lines.push(`var orQuery = gr.addQuery('${conditions[i-1].field}', '${SN_OPERATORS[conditions[i-1].operator]?.encoded || '='}', '${conditions[i-1].value}');`);
      lines.push(`orQuery.addOrCondition('${c.field}', '${op?.encoded || '='}', '${c.value}');`);
      encodedParts.push(`${c.field}${op?.encoded}${c.value}`);
    } else {
      const val = c.value !== undefined ? `'${c.value}'` : "''";
      lines.push(`gr.addQuery('${c.field}', '${op?.encoded || '='}', ${val});`);
      encodedParts.push(`${c.field}${op?.encoded || '='}${c.value || ''}`);
    }
  });

  // Order
  if (orderBy) {
    if (orderDir === 'DESC') {
      lines.push(`gr.orderByDesc('${orderBy}');`);
    } else {
      lines.push(`gr.orderBy('${orderBy}');`);
    }
  }

  // Limit
  if (limit && parseInt(limit) > 0) {
    lines.push(`gr.setLimit(${parseInt(limit)});`);
  }

  // Query execution
  if (useAggregate) {
    lines.push(`ga.addAggregate('COUNT');`);
    lines.push(`ga.query();`);
    lines.push(`if (ga.next()) {`);
    lines.push(`  var count = ga.getAggregate('COUNT');`);
    lines.push(`  gs.info('Total records: ' + count);`);
    lines.push(`}`);
  } else if (useCount) {
    lines.push(`gr.query();`);
    lines.push(`gs.info('Total matching records: ' + gr.getRowCount());`);
  } else {
    lines.push(`gr.query();`);
    lines.push(`while (gr.next()) {`);
    lines.push(`  // Process each record`);
    lines.push(`  gs.info(gr.getDisplayValue());`);
    lines.push(`}`);
  }

  const encodedQuery = encodedParts.join('^');

  return {
    script: lines.join('\n'),
    encoded_query: encodedQuery,
    warnings,
    line_count: lines.length,
  };
}

export function analyzeScript(script) {
  const issues = [];
  const suggestions = [];

  if (!script) return { issues, suggestions };

  // Check for common issues
  if (script.includes('while (gr.next())') && !script.includes('setLimit')) {
    issues.push({ severity: 'warning', message: 'No setLimit() found — may timeout on large tables' });
  }
  if (script.includes('GlideRecord') && script.includes('while') && script.includes('update()')) {
    issues.push({ severity: 'warning', message: 'Updating inside loop — consider batch update or Business Rule' });
  }
  if ((script.match(/gr\.query\(\)/g) || []).length > 1) {
    issues.push({ severity: 'info', message: 'Multiple gr.query() calls detected — cache results where possible' });
  }
  if (script.includes('getRowCount()') && !script.includes('GlideAggregate')) {
    suggestions.push('Use GlideAggregate for counting — getRowCount() loads all records first');
  }
  if (script.includes("addQuery('sys_id'")) {
    suggestions.push('Use gr.get(sys_id) instead of addQuery for single record by sys_id — it\'s faster');
  }

  return { issues, suggestions, score: Math.max(0, 100 - issues.length * 15) };
}

export { SN_OPERATORS, PERFORMANCE_TIPS };
