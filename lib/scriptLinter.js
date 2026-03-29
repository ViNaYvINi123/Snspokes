// ServiceNow Script Linter
// Rule IDs are stable and referenced in tests — do not rename them

export const LINT_RULES = [
  {
    id: 'no-limit',
    category: 'Performance',
    severity: 'warning',
    message: 'Missing setLimit() — can timeout on large tables',
    fix: 'Add gr.setLimit(100) before gr.query()',
    check: (code) =>
      /new GlideRecord/.test(code) &&
      /while\s*\(.*\.next\(\)\)/.test(code) &&
      !/\.setLimit\s*\(/.test(code),
  },
  {
    id: 'update-in-loop',
    category: 'Performance',
    severity: 'error',
    message: 'update() inside while loop — very slow on large datasets',
    fix: 'Use GlideRecord.updateMultiple() for bulk updates or batch outside the loop',
    check: (code) => /while\s*\(.*\.next\(\)\)[\s\S]*?\.update\s*\(\)/m.test(code),
  },
  {
    id: 'getrowcount',
    category: 'Performance',
    severity: 'warning',
    message: 'getRowCount() loads all records into memory — use GlideAggregate instead',
    fix: 'Replace with GlideAggregate and addAggregate("COUNT")',
    check: (code) => /\.getRowCount\s*\(\)/.test(code),
  },
  {
    id: 'no-query',
    category: 'Bug',
    severity: 'error',
    message: 'GlideRecord loop without gr.query() — will never execute',
    fix: 'Add gr.query() before while (gr.next())',
    check: (code) =>
      /new GlideRecord/.test(code) &&
      /while\s*\(.*\.next\(\)\)/.test(code) &&
      !/\.query\s*\(/.test(code),
  },
  {
    id: 'hardcoded-sysid',
    category: 'Security',
    severity: 'warning',
    message: 'Hardcoded sys_id detected — use system property instead',
    fix: 'Store the sys_id in a system property: gs.getProperty("my.record.sysid")',
    check: (code) => /['"`][0-9a-f]{32}['"`]/.test(code),
  },
  {
    id: 'eval',
    category: 'Security',
    severity: 'error',
    message: 'eval() is a security vulnerability and must not be used',
    fix: 'Refactor to avoid eval(). Use JSON.parse() for JSON, or direct function calls',
    check: (code) => /\beval\s*\(/.test(code),
  },
  {
    id: 'gr-in-client',
    category: 'Bug',
    severity: 'error',
    message: 'GlideRecord cannot be used in Client Scripts — it only works server-side',
    fix: 'Use GlideAjax to call a Script Include from the client side instead',
    check: (code, meta) =>
      (meta?.type === 'client_script' || meta?.type === 'client') &&
      /new GlideRecord/.test(code),
  },
  {
    id: 'no-try-catch',
    category: 'BestPractice',
    severity: 'warning',
    message: 'REST call without try/catch — network failures will crash the script',
    fix: 'Wrap RESTMessageV2 calls in try { } catch(e) { gs.error(e); }',
    check: (code) =>
      /RESTMessageV2|GlideHTTPClient/.test(code) &&
      !/try\s*\{/.test(code),
  },
  {
    id: 'gs-log',
    category: 'BestPractice',
    severity: 'info',
    message: 'gs.log() is deprecated in modern ServiceNow versions',
    fix: 'Use gs.info(), gs.warn(), or gs.error() instead',
    check: (code) => /\bgs\.log\s*\(/.test(code),
  },
  {
    id: 'no-comments',
    category: 'Quality',
    severity: 'info',
    message: 'No comments found — code may be hard to maintain',
    fix: 'Add JSDoc header and inline comments explaining the business logic',
    check: (code) =>
      code.trim().length > 200 &&
      !/\/\/|\/\*/.test(code),
  },
  {
    id: 'current-update-br',
    category: 'Bug',
    severity: 'warning',
    message: 'Calling current.update() inside a Business Rule can cause infinite loops',
    fix: 'Remove current.update() — the platform saves current automatically after BR execution',
    check: (code, meta) =>
      (meta?.type === 'business_rule') &&
      /current\.update\s*\(/.test(code),
  },
  {
    id: 'synchronous-ajax',
    category: 'Performance',
    severity: 'warning',
    message: 'Synchronous GlideAjax call detected — blocks the UI thread',
    fix: 'Always use asynchronous GlideAjax with a callback function',
    check: (code) =>
      /GlideAjax/.test(code) &&
      /getXMLWait\s*\(/.test(code),
  },
];

export function lintScript(code, meta = {}) {
  if (!code || typeof code !== 'string') {
    return { issues: [], score: 100, grade: 'A', summary: { errors: 0, warnings: 0, info: 0 } };
  }

  const issues = [];
  for (const rule of LINT_RULES) {
    try {
      if (rule.check(code, meta)) {
        issues.push({
          id: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          fix: rule.fix,
        });
      }
    } catch {}
  }

  const errors   = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const info     = issues.filter(i => i.severity === 'info').length;

  const score = Math.max(0, 100 - (errors * 25) - (warnings * 10) - (info * 3));
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return {
    issues,
    score,
    grade,
    summary: { errors, warnings, info, total: issues.length },
  };
}
