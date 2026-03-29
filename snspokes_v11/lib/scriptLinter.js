// ServiceNow Script Linter
// Analyzes scripts for performance issues, anti-patterns, and bugs

export const LINT_RULES = [
  // ── Performance ──
  {
    id: 'no-limit',
    category: 'Performance',
    severity: 'warning',
    message: 'Missing setLimit() — can cause transaction timeouts on large tables',
    fix: 'Add gr.setLimit(100) before gr.query()',
    check: (code) => /new GlideRecord/.test(code) && /while.*\.next\(\)/.test(code) && !/setLimit/.test(code),
  },
  {
    id: 'getrowcount',
    category: 'Performance',
    severity: 'warning',
    message: 'getRowCount() loads all records — use GlideAggregate for counting',
    fix: 'Replace with GlideAggregate and addAggregate("COUNT")',
    check: (code) => /\.getRowCount\(\)/.test(code),
  },
  {
    id: 'update-in-loop',
    category: 'Performance',
    severity: 'error',
    message: 'update() inside while loop — each call is a DB write, use bulk operations',
    fix: 'Consider using GlideRecord.updateMultiple() or batch updates',
    check: (code) => /while.*\.next\(\)[\s\S]*?\.update\(\)/m.test(code),
  },
  {
    id: 'nested-glide',
    category: 'Performance',
    severity: 'warning',
    message: 'Nested GlideRecord queries detected — can cause N+1 query problem',
    fix: 'Use JOIN queries or pre-fetch data outside the loop',
    check: (code) => {
      const matches = code.match(/while.*\.next\(\)/g);
      const innerGR = code.match(/new GlideRecord/g);
      return matches && innerGR && innerGR.length > 1;
    },
  },
  {
    id: 'no-query-called',
    category: 'Bug',
    severity: 'error',
    message: 'GlideRecord declared but gr.query() not called before while loop',
    fix: 'Add gr.query() before while (gr.next())',
    check: (code) => /new GlideRecord/.test(code) && /while.*\.next\(\)/.test(code) && !/\.query\(\)/.test(code),
  },

  // ── Security ──
  {
    id: 'hardcoded-sysid',
    category: 'Security',
    severity: 'warning',
    message: 'Hardcoded sys_id detected — use system properties or reference instead',
    fix: 'Store sys_id in system properties: gs.getProperty("my.sys_id")',
    check: (code) => /['"][0-9a-f]{32}['"]/.test(code),
  },
  {
    id: 'eval-usage',
    category: 'Security',
    severity: 'error',
    message: 'eval() usage detected — security vulnerability, avoid completely',
    fix: 'Refactor to avoid eval(). Use JSON.parse() for JSON or direct function calls',
    check: (code) => /\beval\s*\(/.test(code),
  },
  {
    id: 'no-input-validation',
    category: 'Security',
    severity: 'info',
    message: 'REST API script missing input validation',
    fix: 'Validate request.body parameters before using them',
    check: (code) => /request\.body/.test(code) && !/if.*request\.body/.test(code),
  },

  // ── Best Practices ──
  {
    id: 'gliderecord-in-client',
    category: 'Bug',
    severity: 'error',
    message: 'GlideRecord cannot be used in Client Scripts — server-side API only',
    fix: 'Use GlideAjax to call a Script Include, or use g_form.getValue()',
    check: (code, meta) => meta?.type === 'client_script' && /new GlideRecord/.test(code),
  },
  {
    id: 'no-try-catch-rest',
    category: 'BestPractice',
    severity: 'warning',
    message: 'REST/HTTP call without try/catch — network failures will cause unhandled errors',
    fix: 'Wrap RESTMessageV2 calls in try/catch and handle exceptions',
    check: (code) => /RESTMessageV2|GlideHTTPClient/.test(code) && !/try\s*{/.test(code),
  },
  {
    id: 'gs-log-debug',
    category: 'BestPractice',
    severity: 'info',
    message: 'gs.log() is deprecated — use gs.info(), gs.warn(), or gs.error()',
    fix: 'Replace gs.log() with appropriate gs.info() or gs.debug()',
    check: (code) => /\bgs\.log\s*\(/.test(code),
  },
  {
    id: 'current-without-check',
    category: 'Bug',
    severity: 'warning',
    message: 'Accessing current fields without checking if record is valid',
    fix: 'Check current.isValidRecord() before accessing field values',
    check: (code) => /current\.\w+\.getValue/.test(code) && !/isValidRecord/.test(code) && !/current\.operation/.test(code),
  },
  {
    id: 'no-comments',
    category: 'Quality',
    severity: 'info',
    message: 'No comments found — add JSDoc or inline comments for maintainability',
    fix: 'Add /** */ JSDoc comments at top explaining purpose, inputs, and outputs',
    check: (code) => code.length > 200 && !/\/\/|\/\*/.test(code),
  },
  {
    id: 'synchronous-ajax',
    category: 'Performance',
    severity: 'warning',
    message: 'Synchronous GlideAjax call detected — use callback pattern instead',
    fix: 'GlideAjax should use a callback function as second parameter',
    check: (code) => /new GlideAjax/.test(code) && !/function\s*\(/.test(code.split('GlideAjax')[1]?.substring(0, 100) || ''),
  },
];

export function lintScript(code, meta = {}) {
  if (!code?.trim()) return { issues: [], score: 100, grade: 'A' };

  const issues = LINT_RULES
    .filter(rule => {
      try { return rule.check(code, meta); }
      catch { return false; }
    })
    .map(rule => ({
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      message: rule.message,
      fix: rule.fix,
    }));

  // Score calculation
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  const score = Math.max(0, 100 - (errorCount * 25) - (warnCount * 10) - (infoCount * 3));

  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return { issues, score, grade, summary: { errors: errorCount, warnings: warnCount, info: infoCount } };
}
