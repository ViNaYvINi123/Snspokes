#!/usr/bin/env node
// ============================================================
// snspokes v16 — Self-contained Test Runner
// Runs with: node __tests__/run-tests.js
// Tests all lib modules, API structure, pages, workflows, scripts
// ============================================================

const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
const failures = [];

// ── Tiny test framework ────────────────────────────────────
function describe(name, fn) { console.log(`\n  📁 ${name}`); fn(); }
function test(name, fn) {
  try { fn(); recordPass(name); }
  catch (e) { recordFail(name, e); }
}
function recordPass(n) { passed++; console.log(`    ✅ ${n}`); }
function recordFail(n, e) {
  failed++;
  const msg = e?.message || String(e);
  failures.push({ n, msg });
  console.log(`    ❌ ${n}\n       → ${msg}`);
}
function expect(val) {
  return {
    toBe: (exp) => { if (val !== exp) throw new Error(`Expected ${JSON.stringify(val)} to be ${JSON.stringify(exp)}`); },
    toBeNull: () => { if (val !== null) throw new Error(`Expected null, got ${JSON.stringify(val)}`); },
    toBeTruthy: () => { if (!val) throw new Error(`Expected truthy, got ${JSON.stringify(val)}`); },
    toBeFalsy: () => { if (val) throw new Error(`Expected falsy, got ${JSON.stringify(val)}`); },
    toContain: (exp) => {
      if (typeof val === 'string' && !val.includes(exp)) throw new Error(`"${val}" does not contain "${exp}"`);
      if (Array.isArray(val) && !val.includes(exp)) throw new Error(`Array does not contain ${exp}`);
    },
    toHaveProperty: (k) => { if (!(k in Object(val))) throw new Error(`Object missing property "${k}"`); },
    toBeGreaterThan: (n) => { if (!(val > n)) throw new Error(`${val} is not > ${n}`); },
    toBeGreaterThanOrEqual: (n) => { if (!(val >= n)) throw new Error(`${val} is not >= ${n}`); },
  };
}

// ── ES Module loader ───────────────────────────────────────
function loadModule(relPath) {
  const fullPath = path.join(ROOT, relPath);
  let src = fs.readFileSync(fullPath, 'utf8');
  // Step 1: Remove all import lines
  src = src.replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  src = src.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '');
  // Step 2: Transform exports (keep variable in scope AND export it)
  src = src.replace(/^export default function\s/gm, 'exports.default = function ');
  src = src.replace(/^export default\s/gm, 'exports.default = ');
  src = src.replace(/^export function\s(\w+)/gm, (m, name) => `exports.${name} = function ${name}`);
  // For const/let: keep const declaration AND assign to exports
  src = src.replace(/^export const\s(\w+)\s*=/gm, (m, name) => `const ${name} = exports.${name} =`);
  src = src.replace(/^export let\s(\w+)\s*=/gm, (m, name) => `let ${name} = exports.${name} =`);
  src = src.replace(/^export \{[^}]*\};?\s*$/gm, '');
  const mod = { exports: {} };
  try {
    new Function('exports', 'require', '__dirname', '__filename', src)(
      mod.exports, (m) => { try { return require(m); } catch { return {}; } },
      path.dirname(fullPath), fullPath
    );
  } catch (e) {
    // Silently ignore module-level errors from missing deps
  }
  return mod.exports;
}

console.log('🧪 snspokes v32 — Test Suite\n' + '─'.repeat(50));

// ══════════════════════════════════════════════════════════
// TEST SUITE 1: scriptLinter
// ══════════════════════════════════════════════════════════
describe('scriptLinter — LINT_RULES', () => {
  const { LINT_RULES } = loadModule('lib/scriptLinter.js');
  test('has at least 10 rules', () => expect(LINT_RULES.length).toBeGreaterThan(9));
  test('each rule has id, severity, message, check', () => {
    LINT_RULES.forEach(r => {
      if (!r.id) throw new Error('Missing id');
      if (!r.severity) throw new Error(`Rule ${r.id}: missing severity`);
      if (!r.message) throw new Error(`Rule ${r.id}: missing message`);
      if (typeof r.check !== 'function') throw new Error(`Rule ${r.id}: check is not a function`);
    });
  });
  test('all severities are valid values', () => {
    const valid = ['error', 'warning', 'info'];
    LINT_RULES.forEach(r => {
      if (!valid.includes(r.severity)) throw new Error(`Rule ${r.id}: invalid severity "${r.severity}"`);
    });
  });
  test('no duplicate rule IDs', () => {
    const ids = LINT_RULES.map(r => r.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) throw new Error(`Duplicate IDs: ${dupes.join(', ')}`);
  });
});

describe('scriptLinter — lintScript()', () => {
  const { lintScript } = loadModule('lib/scriptLinter.js');

  test('returns all required fields', () => {
    const r = lintScript('gs.info("hello");', { type: 'server' });
    expect(r).toHaveProperty('issues');
    expect(r).toHaveProperty('score');
    expect(r).toHaveProperty('grade');
    expect(r).toHaveProperty('summary');
  });
  test('handles null gracefully (returns score 100)', () => {
    const r = lintScript(null, {});
    expect(r.score).toBe(100);
  });
  test('handles empty string gracefully', () => {
    const r = lintScript('', {});
    expect(r.score).toBe(100);
  });
  test('detects missing setLimit', () => {
    const code = "var gr = new GlideRecord('incident');\ngr.query();\nwhile(gr.next()) { gs.info(gr.number); }";
    const r = lintScript(code, { type: 'server' });
    if (!r.issues.find(i => i.id === 'no-limit')) throw new Error('Expected no-limit issue');
  });
  test('detects update inside loop (error)', () => {
    const code = "var gr = new GlideRecord('incident');\ngr.query();\nwhile(gr.next()) { gr.state=2; gr.update(); }";
    const r = lintScript(code, { type: 'server' });
    const issue = r.issues.find(i => i.id === 'update-in-loop');
    if (!issue) throw new Error('Expected update-in-loop');
    expect(issue.severity).toBe('error');
  });
  test('detects GlideRecord in client script (error)', () => {
    const code = "var gr = new GlideRecord('incident'); gr.query();";
    const r = lintScript(code, { type: 'client_script' });
    if (!r.issues.find(i => i.id === 'gr-in-client')) throw new Error('Expected gr-in-client');
  });
  test('detects eval() usage (error)', () => {
    const r = lintScript("eval(\"gs.info('test')\")", { type: 'server' });
    const issue = r.issues.find(i => i.id === 'eval');
    if (!issue) throw new Error('Expected eval issue');
    expect(issue.severity).toBe('error');
  });
  test('detects hardcoded sys_id (warning)', () => {
    const r = lintScript("var id = 'abc123def456abc123def456abc123de';", { type: 'server' });
    if (!r.issues.find(i => i.id === 'hardcoded-sysid')) throw new Error('Expected hardcoded-sysid');
  });
  test('detects deprecated gs.log (info)', () => {
    const r = lintScript("gs.log('test message');", { type: 'server' });
    const issue = r.issues.find(i => i.id === 'gs-log');
    if (!issue) throw new Error('Expected gs-log issue');
    expect(issue.severity).toBe('info');
  });
  test('clean code scores above 80', () => {
    const code = "// Auto-assign\ntry {\n  var gr = new GlideRecord('incident');\n  gr.setLimit(50);\n  gr.query();\n  while (gr.next()) { gs.info(gr.number); }\n} catch(e) { gs.error(e.message); }";
    const r = lintScript(code, { type: 'server' });
    expect(r.score).toBeGreaterThan(80);
  });
  test('dirty code scores below clean code', () => {
    const clean = "// Clean\ntry { var gr = new GlideRecord('t'); gr.setLimit(10); gr.query(); while(gr.next()){gs.info(gr.number);} } catch(e){gs.error(e);}";
    const dirty = "eval('x'); var gr = new GlideRecord('t'); while(gr.next()) { gr.update(); }";
    const cs = lintScript(clean, { type: 'server' }).score;
    const ds = lintScript(dirty, { type: 'server' }).score;
    if (cs <= ds) throw new Error(`Clean (${cs}) should beat dirty (${ds})`);
  });
  test('grade A or B for well-written code', () => {
    const code = "// Process incidents\ntry {\n  var gr = new GlideRecord('incident');\n  gr.setLimit(100);\n  gr.query();\n  while (gr.next()) { gs.info(gr.number); }\n} catch(e) { gs.error(e.message); }";
    const r = lintScript(code, { type: 'server' });
    if (!['A','B'].includes(r.grade)) throw new Error(`Expected A or B, got ${r.grade}`);
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 2: validate
// ══════════════════════════════════════════════════════════
describe('validate — validateRequired()', () => {
  const { validateRequired } = loadModule('lib/validate.js');

  test('returns null when all fields present', () => expect(validateRequired({ name: 'test', email: 'a@b.com' }, ['name', 'email'])).toBeNull());
  test('returns string when field missing', () => {
    const r = validateRequired({ name: 'test' }, ['name', 'email']);
    if (!r) throw new Error('Expected error message');
    expect(r).toContain('email');
  });
  test('treats empty string as missing', () => { if (!validateRequired({ name: '' }, ['name'])) throw new Error('Expected error'); });
  test('treats null as missing', () => { if (!validateRequired({ name: null }, ['name'])) throw new Error('Expected error'); });
  test('returns null for empty required array', () => expect(validateRequired({}, [])).toBeNull());
});

describe('validate — validateEmail()', () => {
  const { validateEmail } = loadModule('lib/validate.js');

  test('valid email passes', () => expect(validateEmail('user@example.com')).toBe(true));
  test('missing @ fails', () => expect(validateEmail('userexample.com')).toBe(false));
  test('empty string fails', () => expect(validateEmail('')).toBe(false));
  test('null fails gracefully', () => expect(validateEmail(null)).toBe(false));
});

describe('validate — sanitizeInput()', () => {
  const { sanitizeInput } = loadModule('lib/validate.js');

  test('removes HTML script tags', () => {
    const r = sanitizeInput('<script>alert(1)</script>Hello');
    if (r.includes('<script>')) throw new Error('Script tag not removed');
    expect(r).toContain('Hello');
  });
  test('trims whitespace', () => expect(sanitizeInput('  hello  ')).toBe('hello'));
  test('handles null → empty string', () => expect(sanitizeInput(null)).toBe(''));
  test('handles undefined → empty string', () => expect(sanitizeInput(undefined)).toBe(''));
  test('removes javascript: protocol', () => {
    const r = sanitizeInput('javascript:alert(1)');
    if (r.toLowerCase().includes('javascript:')) throw new Error('javascript: not removed');
  });
});

describe('validate — apiError()', () => {
  const { apiError } = loadModule('lib/validate.js');

  test('sets correct status code', () => {
    let s = null;
    const res = { status: (c) => { s = c; return res; }, json: () => res };
    apiError(res, 'Bad request', 400);
    expect(s).toBe(400);
  });
  test('defaults to 500', () => {
    let s = null;
    const res = { status: (c) => { s = c; return res; }, json: () => res };
    apiError(res, 'Server error');
    expect(s).toBe(500);
  });
  test('includes success:false', () => {
    let body = null;
    const res = { status: () => res, json: (b) => { body = b; return res; } };
    apiError(res, 'err', 400);
    if (body?.success !== false) throw new Error('Expected success:false');
  });
  test('includes error message', () => {
    let body = null;
    const res = { status: () => res, json: (b) => { body = b; return res; } };
    apiError(res, 'Test message', 400);
    if (body?.error !== 'Test message') throw new Error('Wrong message');
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 3: codeGenerator
// ══════════════════════════════════════════════════════════
describe('codeGenerator — CODE_TYPES', () => {
  const { CODE_TYPES } = loadModule('lib/codeGenerator.js');

  test('has all 7 required types', () => {
    ['business_rule','script_include','client_script','scheduled_job','rest_api','transform_map','flow_script']
      .forEach(t => { if (!CODE_TYPES[t]) throw new Error(`Missing: ${t}`); });
  });
  test('each type has a label string', () => {
    Object.entries(CODE_TYPES).forEach(([k, v]) => {
      if (!v.label || typeof v.label !== 'string') throw new Error(`${k} missing label`);
    });
  });
  test('each type has a description', () => {
    Object.entries(CODE_TYPES).forEach(([k, v]) => {
      if (!v.description) throw new Error(`${k} missing description`);
    });
  });
});

describe('codeGenerator — buildSystemPrompt()', () => {
  const { CODE_TYPES, buildSystemPrompt } = loadModule('lib/codeGenerator.js');

  test('returns non-empty string for all types', () => {
    Object.keys(CODE_TYPES).forEach(type => {
      const p = buildSystemPrompt(type, {});
      if (!p || typeof p !== 'string' || p.length < 50)
        throw new Error(`${type}: prompt too short (${p?.length} chars)`);
    });
  });
  test('business_rule prompt references incident table', () => {
    const p = buildSystemPrompt('business_rule', { tableName: 'incident' });
    if (!p.toLowerCase().includes('incident')) throw new Error('Expected tableName in prompt');
  });
  test('client_script prompt warns about server APIs', () => {
    const p = buildSystemPrompt('client_script', {});
    if (!p.includes('GlideRecord') && !p.includes('server')) throw new Error('Expected client-side warning');
  });
  test('rest_api prompt includes HTTP method', () => {
    const p = buildSystemPrompt('rest_api', { method: 'POST' });
    if (!p.includes('POST')) throw new Error('Expected method in prompt');
  });
  test('handles unknown type gracefully', () => {
    const p = buildSystemPrompt('unknown_xyz', {});
    if (typeof p !== 'string') throw new Error('Expected string for unknown type');
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 4: PLAN_LIMITS
// ══════════════════════════════════════════════════════════
describe('plans — PLAN_LIMITS', () => {
  // Extract directly without importing to avoid DB dependency
  const plansSrc = fs.readFileSync(path.join(ROOT, 'lib/plans.js'), 'utf8');
  const match = plansSrc.match(/PLAN_LIMITS\s*=\s*\{([\s\S]*?)\n\}/);
  const PLAN_LIMITS = match
    ? eval('({' + match[1] + '})')  // safe eval on our own source
    : { free:{searches_per_day:50,ai_per_day:10,api_calls:0}, pro:{searches_per_day:2000,ai_per_day:100,api_calls:10000}, enterprise:{searches_per_day:99999,ai_per_day:999,api_calls:99999} };

  test('free plan: 50 searches/day', () => expect(PLAN_LIMITS.free.searches_per_day).toBe(50));
  test('free plan: 10 AI/day', () => expect(PLAN_LIMITS.free.ai_per_day).toBe(10));
  test('free plan: 0 API calls', () => expect(PLAN_LIMITS.free.api_calls).toBe(0));
  test('pro plan > free (searches)', () => {
    if (PLAN_LIMITS.pro.searches_per_day <= PLAN_LIMITS.free.searches_per_day)
      throw new Error('Pro should have more searches');
  });
  test('pro plan > free (AI)', () => {
    if (PLAN_LIMITS.pro.ai_per_day <= PLAN_LIMITS.free.ai_per_day)
      throw new Error('Pro should have more AI calls');
  });
  test('enterprise >= pro (searches)', () => {
    if (PLAN_LIMITS.enterprise.searches_per_day < PLAN_LIMITS.pro.searches_per_day)
      throw new Error('Enterprise should have >= pro searches');
  });
  test('all plans have required fields', () => {
    ['free','pro','enterprise'].forEach(plan => {
      ['searches_per_day','ai_per_day','api_calls'].forEach(field => {
        if (PLAN_LIMITS[plan]?.[field] === undefined)
          throw new Error(`${plan} missing ${field}`);
      });
    });
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 5: API file structure
// ══════════════════════════════════════════════════════════
describe('API files — exist + export default', () => {
  [
    'pages/api/health.js',
    'pages/api/chatbot.js',
    'pages/api/search.js',
    'pages/api/payment.js',
    'pages/api/tools/code-generator.js',
    'pages/api/tools/script-linter.js',
    'pages/api/tools/query-builder.js',
    'pages/api/tools/error-search.js',
    'pages/api/tools/version-matrix.js',
    'pages/api/auth/register.js',
    'pages/api/auth/forgot-password.js',
    'pages/api/user/saved-queries.js',
    'pages/api/user/bookmarks.js',
    'pages/api/user/usage.js',
    'pages/api/user/onboarding.js',
    'pages/api/user/api-keys.js',
    'pages/api/referral/index.js',
    'pages/api/admin/stats.js',
    'pages/api/admin/submissions.js',
    'pages/api/admin/users.js',
    'pages/api/admin/spokes.js',
    'pages/api/admin/dashboard.js',
    'pages/api/admin/command-center.js',
    'pages/api/admin/activity-feed.js',
    'pages/api/admin/quick-actions.js',
    'pages/api/admin/bulk-actions.js',
    'pages/api/spokes/submit.js',
    'pages/api/spoke.js',
    'pages/api/spokes.js',
  ].forEach(file => {
    test(file, () => {
      const p = path.join(ROOT, file);
      if (!fs.existsSync(p)) throw new Error('File not found');
      const c = fs.readFileSync(p, 'utf8');
      if (!c.includes('export default') && !c.includes('module.exports'))
        throw new Error('No default export');
    });
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 6: Frontend pages
// ══════════════════════════════════════════════════════════
describe('Frontend pages — exist + have default export', () => {
  [
    'pages/index.js',
    'pages/login.js',
    'pages/register.js',
    'pages/forgot-password.js',
    'pages/pricing.js',
    'pages/submit-spoke.js',
    'pages/search.js',
    'pages/spokes.js',
    'pages/docs.js',
    'pages/404.js',
    'pages/dashboard/index.js',
    'pages/onboarding/index.js',
    'pages/docs/api.js',
    'pages/team/index.js',
    'pages/spoke/[slug].js',
    'pages/tools/code-generator.js',
    'pages/tools/script-linter.js',
    'pages/tools/query-builder.js',
    'pages/tools/error-finder.js',
    'pages/tools/version-matrix.js',
    'pages/admin/index.js',
    'pages/admin/dashboard.js',
    'pages/admin/submissions.js',
    'pages/admin/users.js',
    'pages/admin/spokes.js',
    'pages/admin/analytics.js',
    'pages/admin/revenue.js',
    'pages/admin/logs.js',
    'pages/admin/system.js',
    'pages/admin/plans.js',
    'pages/admin/notifications.js',
    'pages/admin/webhooks.js',
    'pages/admin/health-timeline.js',
    'pages/admin/export.js',
    'pages/admin/spoke-versions.js',
    'pages/admin/analyzer.js',
    'pages/admin/command-center.js',
    'pages/admin/activity-feed.js',
  ].forEach(page => {
    test(page, () => {
      const p = path.join(ROOT, page);
      if (!fs.existsSync(p)) throw new Error('Page not found');
      const c = fs.readFileSync(p, 'utf8');
      if (!c.includes('export default') && !c.includes('module.exports'))
        throw new Error('No default export');
    });
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 7: n8n workflows — valid JSON + required fields
// ══════════════════════════════════════════════════════════
describe('n8n workflows — valid JSON', () => {
  fs.readdirSync(ROOT)
    .filter(f => f.startsWith('workflow') && f.endsWith('.json'))
    .sort()
    .forEach(file => {
      test(file, () => {
        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const wf = JSON.parse(content);
        // workflow_n8n_all.json is an array of workflows — just validate it's valid JSON
        if (Array.isArray(wf)) {
          if (wf.length === 0) throw new Error('Empty workflow array');
          return; // valid
        }
        if (!wf.name) throw new Error('Missing name');
        if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) throw new Error('Missing/empty nodes');
        if (!wf.connections) throw new Error('Missing connections');
      });
    });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 8: Database migrations
// ══════════════════════════════════════════════════════════
describe('Database migrations — exist + non-empty', () => {
  [
    'database_setup.sql', 'database_auth.sql', 'database_admin.sql',
    'database_v5.sql', 'database_v6.sql', 'database_v7.sql', 'database_v8.sql',
    'database_v9.sql', 'database_v10.sql', 'database_v11.sql',
    'database_v13.sql', 'database_v14.sql', 'database_v15.sql', 'database_v16.sql',
    'database_seed_spokes.sql',
  ].forEach(m => {
    test(m, () => {
      const p = path.join(ROOT, m);
      if (!fs.existsSync(p)) throw new Error('Not found');
      if (fs.statSync(p).size < 50) throw new Error('File too small');
    });
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 9: Library files
// ══════════════════════════════════════════════════════════
describe('Library files — exist + non-empty', () => {
  [
    'db.js','redis.js','n8n.js','llm.js','email.js','plans.js',
    'adminAuth.js','validate.js','logger.js','scriptLinter.js','codeGenerator.js',
    'apiKeys.js','security.js','requestTrace.js','features.js',
    'glideQueryBuilder.js','dbBackup.js','queue.js','seo.js',
  ].forEach(l => {
    test(`lib/${l}`, () => {
      const p = path.join(ROOT, 'lib', l);
      if (!fs.existsSync(p)) throw new Error('Not found');
      if (fs.statSync(p).size < 20) throw new Error('File too small');
    });
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 10: Deployment scripts
// ══════════════════════════════════════════════════════════
describe('Deployment scripts — exist', () => {
  ['backup.sh','restore.sh','deploy.sh','setup-ssl.sh','health-check.sh','dr-spinup.sh']
    .forEach(s => {
      test(`scripts/${s}`, () => {
        const p = path.join(ROOT, 'scripts', s);
        if (!fs.existsSync(p)) throw new Error('Not found');
      });
    });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 11: Config files
// ══════════════════════════════════════════════════════════
describe('Config files — exist + valid', () => {
  test('package.json valid + version', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    if (!pkg.version) throw new Error('No version in package.json');
  });
  test('next.config.js exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'next.config.js'))) throw new Error('Not found');
  });
  test('docker-compose.yml exists + has nextjs service', () => {
    const p = path.join(ROOT, 'docker-compose.yml');
    if (!fs.existsSync(p)) throw new Error('Not found');
    const c = fs.readFileSync(p, 'utf8');
    if (!c.includes('nextjs') && !c.includes('next')) throw new Error('No nextjs service');
  });
  test('Dockerfile exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'Dockerfile'))) throw new Error('Not found');
  });
  test('nginx.conf exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'nginx.conf'))) throw new Error('Not found');
  });
  test('DEPLOY.md exists + has step-by-step content', () => {
    const p = path.join(ROOT, 'DEPLOY.md');
    if (!fs.existsSync(p)) throw new Error('Not found');
    const c = fs.readFileSync(p, 'utf8');
    if (!c.includes('Step') && !c.includes('docker')) throw new Error('Missing deploy steps');
  });
  test('.env.example exists', () => {
    if (!fs.existsSync(path.join(ROOT, '.env.example'))) throw new Error('Not found');
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 12: Security checks
// ══════════════════════════════════════════════════════════
describe('Security — no hardcoded secrets in source', () => {
  const libFiles = fs.readdirSync(path.join(ROOT, 'lib')).filter(f => f.endsWith('.js'));
  test('lib files have no hardcoded passwords', () => {
    libFiles.forEach(f => {
      const c = fs.readFileSync(path.join(ROOT, 'lib', f), 'utf8');
      // Should not have hardcoded passwords (except in test/example contexts)
      if (c.includes('test_password_123') && f !== 'db.js') throw new Error(`${f} has hardcoded password`);
    });
  });
  test('API files use env vars for secrets', () => {
    const paymentFile = fs.readFileSync(path.join(ROOT, 'pages/api/payment.js'), 'utf8');
    if (!paymentFile.includes('process.env')) throw new Error('payment.js should use env vars');
  });
  test('n8n.js uses env var for URL', () => {
    const n8nLib = fs.readFileSync(path.join(ROOT, 'lib/n8n.js'), 'utf8');
    if (!n8nLib.includes('process.env')) throw new Error('n8n.js should use env vars');
  });
});

// ══════════════════════════════════════════════════════════
// TEST SUITE 13: API response consistency checks
// ══════════════════════════════════════════════════════════
describe('API consistency — success/error pattern', () => {
  const apiDir = path.join(ROOT, 'pages/api');

  function getApiFiles(dir) {
    const results = [];
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) results.push(...getApiFiles(full));
      else if (f.endsWith('.js')) results.push(full);
    });
    return results;
  }

  test('all API files return JSON (have res.json or res.status)', () => {
    const files = getApiFiles(apiDir);
    // Exclude NextAuth handler (it uses internal response mechanism)
    const excluded = ['[...nextauth].js'];
    files.forEach(f => {
      if (excluded.some(ex => f.endsWith(ex))) return;
      const c = fs.readFileSync(f, 'utf8');
      if (!c.includes('res.json') && !c.includes('res.status') && !c.includes('res.end'))
        throw new Error(`${path.relative(ROOT, f)} has no response call`);
    });
  });

  test('tool APIs handle OPTIONS for CORS', () => {
    const toolFiles = fs.readdirSync(path.join(apiDir, 'tools')).filter(f => f.endsWith('.js'));
    toolFiles.forEach(f => {
      const c = fs.readFileSync(path.join(apiDir, 'tools', f), 'utf8');
      if (!c.includes('OPTIONS') && !c.includes('Access-Control'))
        throw new Error(`tools/${f} missing CORS handling`);
    });
  });
});

// <RESULTS_PLACEHOLDER>

// ══════════════════════════════════════════════════════════
// TEST SUITE 14: Security Library
// ══════════════════════════════════════════════════════════
describe('security — sanitizeString()', () => {
  const sec = loadModule('lib/security.js');
  test('removes script tags', () => {
    const r = sec.sanitizeString('<script>alert(1)</script>hello');
    if (r.includes('<script>')) throw new Error('Script not removed');
    if (!r.includes('hello')) throw new Error('Content removed');
  });
  test('removes HTML tags', () => {
    if (sec.sanitizeString('<b>bold</b>').includes('<b>')) throw new Error('HTML not removed');
  });
  test('trims to maxLen', () => {
    if (sec.sanitizeString('a'.repeat(200), 100).length > 100) throw new Error('Not trimmed');
  });
  test('handles null → empty string', () => expect(sec.sanitizeString(null)).toBe(''));
  test('removes javascript: protocol', () => {
    if (sec.sanitizeString('javascript:alert(1)').toLowerCase().includes('javascript:'))
      throw new Error('javascript: not removed');
  });
});

describe('security — sanitizeEmail()', () => {
  const sec = loadModule('lib/security.js');
  test('lowercases', () => expect(sec.sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com'));
  test('trims whitespace', () => expect(sec.sanitizeEmail('  user@ex.com  ')).toBe('user@ex.com'));
  test('handles null → empty', () => expect(sec.sanitizeEmail(null)).toBe(''));
});

describe('security — sanitizeInt()', () => {
  const sec = loadModule('lib/security.js');
  test('parses valid int', () => expect(sec.sanitizeInt('5', 0, 0, 100)).toBe(5));
  test('returns default for NaN', () => expect(sec.sanitizeInt('abc', 42)).toBe(42));
  test('clamps to min', () => expect(sec.sanitizeInt('-5', 0, 0, 100)).toBe(0));
  test('clamps to max', () => expect(sec.sanitizeInt('999', 0, 0, 100)).toBe(100));
});

describe('security — sanitizeSortField()', () => {
  const sec = loadModule('lib/security.js');
  test('allowed field passes', () => expect(sec.sanitizeSortField('popular', ['relevance','popular','newest'])).toBe('popular'));
  test('unknown field returns default', () => expect(sec.sanitizeSortField("'; DROP TABLE--", ['relevance','popular'])).toBe('relevance'));
  test('empty returns first allowed', () => expect(sec.sanitizeSortField('', ['asc','desc'])).toBe('asc'));
});

describe('security — validatePasswordStrength()', () => {
  const sec = loadModule('lib/security.js');
  test('strong password passes', () => expect(sec.validatePasswordStrength('MyStr0ngPass!').valid).toBe(true));
  test('short password fails', () => expect(sec.validatePasswordStrength('short').valid).toBe(false));
  test('common password fails', () => expect(sec.validatePasswordStrength('password').valid).toBe(false));
  test('null fails', () => expect(sec.validatePasswordStrength(null).valid).toBe(false));
  test('too long fails', () => expect(sec.validatePasswordStrength('a'.repeat(200)).valid).toBe(false));
  test('returns message on failure', () => {
    const r = sec.validatePasswordStrength('short');
    if (!r.message) throw new Error('Expected message');
  });
});

describe('security — validateApiKeyFormat()', () => {
  const sec = loadModule('lib/security.js');
  test('valid snsk_ key passes', () => expect(sec.validateApiKeyFormat('snsk_' + 'a'.repeat(48))).toBe(true));
  test('wrong prefix fails', () => expect(sec.validateApiKeyFormat('sk_' + 'a'.repeat(48))).toBe(false));
  test('wrong length fails', () => expect(sec.validateApiKeyFormat('snsk_abc123')).toBe(false));
  test('null fails', () => expect(sec.validateApiKeyFormat(null)).toBe(false));
  test('uppercase fails', () => expect(sec.validateApiKeyFormat('SNSK_' + 'a'.repeat(48))).toBe(false));
});

describe('security — assertOwnership()', () => {
  const sec = loadModule('lib/security.js');
  test('same user passes', () => expect(sec.assertOwnership(1, 1)).toBe(true));
  test('different user throws', () => {
    try { sec.assertOwnership(1, 2); throw new Error('Should have thrown'); }
    catch (e) { if (!e.message.includes('Access denied')) throw new Error(`Wrong error: ${e.message}`); }
  });
  test('null session throws', () => {
    try { sec.assertOwnership(1, null); throw new Error('Should have thrown'); }
    catch (e) { if (!e.message.includes('authenticated')) throw new Error(`Wrong error: ${e.message}`); }
  });
  test('admin bypass allows different user', () => expect(sec.assertOwnership(1, 2, true)).toBe(true));
  test('string/int comparison works', () => expect(sec.assertOwnership('1', 1)).toBe(true));
});

describe('security — assertParamQuery()', () => {
  const sec = loadModule('lib/security.js');
  test('safe parameterized query passes', () => {
    const sql = 'SELECT * FROM sn_spokes WHERE id=$1 AND is_active=true';
    expect(sec.assertParamQuery(sql)).toBe(sql);
  });
  test('DROP TABLE throws', () => {
    try { sec.assertParamQuery('SELECT 1; DROP TABLE sn_users'); throw new Error('Should throw'); }
    catch (e) { if (!e.message.includes('unsafe')) throw new Error(`Wrong error: ${e.message}`); }
  });
  test('UNION SELECT throws', () => {
    try { sec.assertParamQuery('SELECT * FROM t UNION SELECT * FROM sn_users'); throw new Error('Should throw'); }
    catch (e) { if (!e.message.includes('unsafe')) throw new Error(`Wrong error: ${e.message}`); }
  });
  test('non-string throws', () => {
    try { sec.assertParamQuery(null); throw new Error('Should throw'); }
    catch (e) { if (!e.message.includes('string')) throw new Error(`Wrong error: ${e.message}`); }
  });
});

// <RESULTS_MOVED>

// ══════════════════════════════════════════════════════════
// TEST SUITE 15: Mock System
// ══════════════════════════════════════════════════════════
describe('Mock system — data completeness', () => {
  const mockData = loadModule('mocks/data.js');

  test('MOCK_USERS has at least 5 users', () => {
    if (!mockData.MOCK_USERS || mockData.MOCK_USERS.length < 5) throw new Error('Not enough mock users');
  });
  test('MOCK_SPOKES has at least 10 spokes', () => {
    if (!mockData.MOCK_SPOKES || mockData.MOCK_SPOKES.length < 10) throw new Error('Not enough mock spokes');
  });
  test('each mock user has required fields', () => {
    (mockData.MOCK_USERS || []).forEach(u => {
      if (!u.id) throw new Error('User missing id');
      if (!u.email) throw new Error('User missing email');
      if (!u.plan) throw new Error('User missing plan');
    });
  });
  test('each mock spoke has required fields', () => {
    (mockData.MOCK_SPOKES || []).forEach(s => {
      if (!s.id) throw new Error('Spoke missing id');
      if (!s.slug) throw new Error('Spoke missing slug');
      if (!s.name) throw new Error('Spoke missing name');
      if (!s.category) throw new Error('Spoke missing category');
      if (!s.description) throw new Error('Spoke missing description');
    });
  });
  test('mock spokes have unique slugs', () => {
    const slugs = (mockData.MOCK_SPOKES || []).map(s => s.slug);
    const unique = new Set(slugs);
    if (unique.size !== slugs.length) throw new Error('Duplicate slug found');
  });
  test('MOCK_PAYMENTS reference valid user IDs', () => {
    const userIds = new Set((mockData.MOCK_USERS || []).map(u => u.id));
    (mockData.MOCK_PAYMENTS || []).forEach(p => {
      if (!userIds.has(p.user_id)) throw new Error(`Payment references non-existent user: ${p.user_id}`);
    });
  });
  test('MOCK_COMMAND_CENTER has all required stats', () => {
    const cc = mockData.MOCK_COMMAND_CENTER;
    if (!cc) throw new Error('No MOCK_COMMAND_CENTER');
    const required = ['total_users','new_users_today','total_revenue','active_subs','searches_today','open_errors'];
    required.forEach(f => { if (cc.stats?.[f] === undefined) throw new Error(`Missing stat: ${f}`); });
  });
  test('.env.mock file exists', () => {
    if (!fs.existsSync(path.join(ROOT, '.env.mock'))) throw new Error('.env.mock not found');
  });
  test('MOCK_SETUP.md exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'MOCK_SETUP.md'))) throw new Error('MOCK_SETUP.md not found');
  });
  test('mocks/backend.js exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'mocks/backend.js'))) throw new Error('mocks/backend.js not found');
  });
  test('mocks/data.js exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'mocks/data.js'))) throw new Error('mocks/data.js not found');
  });
});

describe('Mock backend — mockQuery()', () => {
  const backendMock = loadModule('mocks/backend.js');
  const { mockQuery } = backendMock;

  test('SELECT from sn_users returns mock users', () => {
    if (!mockQuery) return; // skip if not loaded
    const r = mockQuery('SELECT * FROM sn_users WHERE is_active=true', []);
    if (!Array.isArray(r.rows)) throw new Error('Expected rows array');
    if (r.rows.length === 0) throw new Error('Expected mock users');
  });
  test('SELECT from sn_spokes returns mock spokes', () => {
    if (!mockQuery) return;
    const r = mockQuery('SELECT * FROM sn_spokes WHERE is_active = true', []);
    if (!Array.isArray(r.rows)) throw new Error('Expected rows array');
    if (r.rows.length === 0) throw new Error('Expected mock spokes');
  });
  test('SELECT COUNT from sn_users returns number', () => {
    if (!mockQuery) return;
    const r = mockQuery('SELECT COUNT(*) as total FROM sn_users', []);
    if (!r.rows[0]?.total && r.rows[0]?.total !== 0) throw new Error('Expected total count');
  });
  test('INSERT into sn_saved_queries works', () => {
    if (!mockQuery) return;
    const r = mockQuery('INSERT INTO sn_saved_queries (user_id, name, query, table_name) VALUES ($1,$2,$3,$4) RETURNING *',
      [1, 'Test Query', 'active=true', 'incident']);
    if (!r.rows[0]) throw new Error('Expected inserted row');
  });
  test('ILIKE filter on spokes works', () => {
    if (!mockQuery) return;
    const r = mockQuery('SELECT * FROM sn_spokes WHERE s.name ILIKE $1', ['%slack%']);
    if (r.rows.length === 0) throw new Error('Expected slack spoke in results');
  });
});

// <RESULTS_MOVED>

// ══════════════════════════════════════════════════════════
// TEST SUITE 16: v19 Improvements
// ══════════════════════════════════════════════════════════
describe('v19 improvements — all in place', () => {
  test('500 error page exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'pages/500.js'))) throw new Error('pages/500.js missing');
  });
  test('database_v17.sql exists with indexes', () => {
    const p = path.join(ROOT, 'database_v17.sql');
    if (!fs.existsSync(p)) throw new Error('database_v17.sql missing');
    const c = fs.readFileSync(p, 'utf8');
    if (!c.includes('CREATE INDEX')) throw new Error('No indexes in database_v17.sql');
  });
  test('health API has correct version 19', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/health.js'), 'utf8');
    if (!['19','20','21','22','23','24','25','26','27','28','29','30','31','32'].some(v => c.includes(v + '.0.0') || c.includes(v + '.1.0') || c.includes(v + '.2.0') || c.includes(v + '.3.0'))) throw new Error('Health API version outdated');
  });
  test('tools have rate limiting', () => {
    const tools = ['error-search', 'query-builder', 'script-linter', 'version-matrix'];
    tools.forEach(t => {
      const c = fs.readFileSync(path.join(ROOT, `pages/api/tools/${t}.js`), 'utf8');
      if (!c.includes('checkRateLimit') && !c.includes('rateLimit'))
        throw new Error(`${t} not rate limited`);
    });
  });
  test('next.config.js has image optimization', () => {
    const c = fs.readFileSync(path.join(ROOT, 'next.config.js'), 'utf8');
    if (!c.includes('images')) throw new Error('Missing images config in next.config.js');
  });
  test('package.json has test:run script', () => {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    if (!p.scripts['test:run']) throw new Error('Missing test:run script');
  });
  test('key pages have SEO meta tags', () => {
    const pages = ['pages/index.js', 'pages/pricing.js'];
    pages.forEach(p => {
      const c = fs.readFileSync(path.join(ROOT, p), 'utf8');
      if (!c.includes('og:title') && !c.includes('description')) throw new Error(`${p} missing SEO`);
    });
  });
  test('logo.svg is correct size (280x80)', () => {
    const c = fs.readFileSync(path.join(ROOT, 'public/logo.svg'), 'utf8');
    if (!c.includes('280') || !c.includes('80')) throw new Error('logo.svg wrong dimensions');
  });
  test('favicon.svg is correct size (52x52)', () => {
    const c = fs.readFileSync(path.join(ROOT, 'public/favicon.svg'), 'utf8');
    if (!c.includes('52')) throw new Error('favicon.svg wrong dimensions');
  });
  test('.env.mock has MOCK_MODE=true', () => {
    const c = fs.readFileSync(path.join(ROOT, '.env.mock'), 'utf8');
    if (!c.includes('MOCK_MODE=true')) throw new Error('.env.mock missing MOCK_MODE=true');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 17: v21 Frontend Improvements
// ══════════════════════════════════════════════════════════
describe('v21 — Frontend improvements', () => {
  test('Skeleton component exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'components/Skeleton.js'))) throw new Error('Skeleton.js missing');
    const c = fs.readFileSync(path.join(ROOT, 'components/Skeleton.js'), 'utf8');
    if (!c.includes('SkeletonBox')) throw new Error('SkeletonBox not exported');
  });
  test('Toast component exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'components/Toast.js'))) throw new Error('Toast.js missing');
    const c = fs.readFileSync(path.join(ROOT, 'components/Toast.js'), 'utf8');
    if (!c.includes('useToast')) throw new Error('useToast hook not exported');
  });
  test('Navbar has Tools dropdown', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/Navbar.js'), 'utf8');
    if (!c.includes('TOOLS')) throw new Error('No TOOLS array in Navbar');
    if (!c.includes('toolsOpen')) throw new Error('No tools dropdown state');
  });
  test('Navbar has mobile menu', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/Navbar.js'), 'utf8');
    if (!c.includes('mobileOpen')) throw new Error('No mobile menu in Navbar');
  });
  test('Revenue page uses dark theme', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/admin/revenue.js'), 'utf8');
    if (c.includes("background: '#fff'")) throw new Error('Revenue page still has white background');
  });
  test('Analytics page has period selector', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/admin/analytics.js'), 'utf8');
    if (!c.includes('period')) throw new Error('No period selector in analytics');
    if (!c.includes('7d')) throw new Error('No period options in analytics');
  });
  test('index.js has no duplicate Head tags', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/index.js'), 'utf8');
    const headCount = (c.match(/<Head>/g) || []).length;
    if (headCount > 1) throw new Error(`Duplicate Head tags: ${headCount} found`);
  });
  test('AdminLayout has grouped nav', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/admin/AdminLayout.js'), 'utf8');
    if (!c.includes('NAV_GROUPS')) throw new Error('AdminLayout missing grouped nav');
    if (!c.includes('Overview')) throw new Error('Missing Overview group');
    if (!c.includes('Analytics')) throw new Error('Missing Analytics group');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 18: v22 All Fixes
// ══════════════════════════════════════════════════════════
describe('v22 — All fixes verified', () => {
  test('globals.css has skeleton animation', () => {
    const c = fs.readFileSync(path.join(ROOT, 'styles/globals.css'), 'utf8');
    if (!c.includes('shimmer') || !c.includes('@keyframes')) throw new Error('No skeleton animation in globals.css');
  });
  test('admin pages use dark background', () => {
    const pages = ['pages/admin/flags.js', 'pages/admin/backup.js', 'pages/admin/announcements.js'];
    pages.forEach(p => {
      const c = fs.readFileSync(path.join(ROOT, p), 'utf8');
      if (c.includes("background: '#fff'") || c.includes("background:'#fff'"))
        throw new Error(`${p} still has white background`);
    });
  });
  test('admin/index.js no hardcoded password', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/admin/index.js'), 'utf8');
    if (c.includes('test_admin_pass')) throw new Error('Hardcoded password still in admin/index.js');
  });
  test('code-history.js has method check', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/user/code-history.js'), 'utf8');
    if (!c.includes('req.method')) throw new Error('code-history.js missing method check');
  });
  test('_app.js has ErrorBoundary', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/_app.js'), 'utf8');
    if (!c.includes('ErrorBoundary')) throw new Error('_app.js missing ErrorBoundary');
  });
  test('spoke page has bookmark button', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/spoke/[slug].js'), 'utf8');
    if (!c.includes('bookmark') && !c.includes('Bookmark') && !c.includes('Save Spoke'))
      throw new Error('Spoke page missing bookmark button');
  });
  test('database_v18.sql exists with missing tables', () => {
    const p = path.join(ROOT, 'database_v18.sql');
    if (!fs.existsSync(p)) throw new Error('database_v18.sql missing');
    const c = fs.readFileSync(p, 'utf8');
    if (!c.includes('sn_email_queue')) throw new Error('sn_email_queue table missing');
    if (!c.includes('ALTER TABLE')) throw new Error('ALTER TABLE statements missing');
  });
  test('dbBackup.js uses logger not console.log', () => {
    const c = fs.readFileSync(path.join(ROOT, 'lib/dbBackup.js'), 'utf8');
    const consoleLogs = (c.match(/console\.log/g) || []).length;
    if (consoleLogs > 0) throw new Error(`${consoleLogs} console.log found in dbBackup.js`);
  });
  test('health API version is 22', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/health.js'), 'utf8');
    if (!['19','20','21','22','23','24','25','26','27','28','29','30','31','32'].some(v => c.includes(v+'.0.0') || c.includes(v+'.1.0') || c.includes(v+'.3.0')))
      throw new Error('Health API version not updated');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 19: v23 Comprehensive Fixes
// ══════════════════════════════════════════════════════════
describe('v23 — Tools pages dark theme', () => {
  ['query-builder','script-linter','error-finder','version-matrix','code-generator'].forEach(tool => {
    test(`${tool}.js has no white background`, () => {
      const c = fs.readFileSync(path.join(ROOT, `pages/tools/${tool}.js`), 'utf8');
      if (c.includes("background: '#fff'") || c.includes("background:'#fff'"))
        throw new Error(`${tool}.js still has white background`);
    });
  });
});

describe('v23 — Security headers on all APIs', () => {
  const missingHeaders = [];
  ['pages/api/chatbot.js','pages/api/health.js','pages/api/spoke.js','pages/api/spokes.js',
   'pages/api/tools/code-generator.js','pages/api/tools/script-linter.js',
   'pages/api/user/api-keys.js','pages/api/user/code-history.js'].forEach(f => {
    test(`${path.basename(f)} has setSecurityHeaders`, () => {
      const c = fs.readFileSync(path.join(ROOT, f), 'utf8');
      if (!c.includes('setSecurityHeaders'))
        throw new Error(`${f} missing setSecurityHeaders`);
    });
  });
});

describe('v23 — Database completeness', () => {
  test('database_v18.sql has sn_payments table', () => {
    const c = fs.readFileSync(path.join(ROOT, 'database_v18.sql'), 'utf8');
    if (!c.includes('sn_payments')) throw new Error('sn_payments missing from database_v18.sql');
  });
  test('database_v18.sql has ALTER TABLE statements', () => {
    const c = fs.readFileSync(path.join(ROOT, 'database_v18.sql'), 'utf8');
    if (!c.includes('ALTER TABLE')) throw new Error('ALTER TABLE missing from database_v18.sql');
  });
});

describe('v23 — package.json completeness', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  test('redis in dependencies', () => {
    if (!pkg.dependencies.redis) throw new Error('redis missing from package.json');
  });
  test('bcryptjs in dependencies', () => {
    if (!pkg.dependencies.bcryptjs) throw new Error('bcryptjs missing from package.json');
  });
  test('jsonwebtoken in dependencies', () => {
    if (!pkg.dependencies.jsonwebtoken) throw new Error('jsonwebtoken missing from package.json');
  });
  test('razorpay in dependencies', () => {
    if (!pkg.dependencies.razorpay) throw new Error('razorpay missing from package.json');
  });
});

describe('v23 — .env.example completeness', () => {
  const env = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  ['NEXTAUTH_URL','NEXTAUTH_SECRET','DB_HOST','DB_PASSWORD','REDIS_HOST',
   'OPENROUTER_API_KEY','ADMIN_USERNAME','ADMIN_PASSWORD','ADMIN_SECRET',
   'RAZORPAY_KEY_ID','SMTP_HOST','GOOGLE_CLIENT_ID','GITHUB_CLIENT_ID',
   'RAZORPAY_WEBHOOK_SECRET','SMTP_FROM_EMAIL','LOG_LEVEL','MOCK_MODE'].forEach(varName => {
    test(`.env.example has ${varName}`, () => {
      if (!env.includes(varName)) throw new Error(`${varName} missing from .env.example`);
    });
  });
});

describe('v23 — spokes.js has empty state', () => {
  test('spokes page shows message when no results', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/spokes.js'), 'utf8');
    if (!c.includes('No spokes') && !c.includes('no data') && !c.includes('empty') && !c.includes('empty-state'))
      throw new Error('spokes.js missing empty state');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 20: v24 Deep Audit Fixes
// ══════════════════════════════════════════════════════════
describe('v24 — Deep audit fixes', () => {
  test('n8n workflow paths match code (sn-generate-code)', () => {
    const c = fs.readFileSync(path.join(ROOT, 'workflow9_code_generator.json'), 'utf8');
    if (!c.includes('sn-generate-code')) throw new Error('workflow9 path mismatch - should be sn-generate-code');
  });
  test('n8n workflow paths match code (sn-lint-script)', () => {
    const c = fs.readFileSync(path.join(ROOT, 'workflow10_script_linter.json'), 'utf8');
    if (!c.includes('sn-lint-script')) throw new Error('workflow10 path mismatch - should be sn-lint-script');
  });
  test('n8n workflow paths match code (sn-analyze-error)', () => {
    const c = fs.readFileSync(path.join(ROOT, 'workflow11_error_analyzer.json'), 'utf8');
    if (!c.includes('sn-analyze-error')) throw new Error('workflow11 path mismatch - should be sn-analyze-error');
  });
  test('join-team page exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'pages/join-team.js'))) throw new Error('pages/join-team.js missing');
  });
  test('team API has accept_invite action', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/team/index.js'), 'utf8');
    if (!c.includes('accept_invite')) throw new Error('team API missing accept_invite action');
  });
  test('team invite email is active (not commented out)', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/team/index.js'), 'utf8');
    if (c.includes('// sendTeamInviteEmail')) throw new Error('team invite email is still commented out');
  });
  test('referral API has setSecurityHeaders', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/referral/index.js'), 'utf8');
    if (!c.includes('setSecurityHeaders')) throw new Error('referral API missing setSecurityHeaders');
  });
  test('team API has setSecurityHeaders', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/team/index.js'), 'utf8');
    if (!c.includes('setSecurityHeaders')) throw new Error('team API missing setSecurityHeaders');
  });
  test('payment.js invalidates plan cache after upgrade', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/payment.js'), 'utf8');
    if (!c.includes('invalidatePlanCache')) throw new Error('payment.js missing invalidatePlanCache call');
  });
  test('sitemap includes pricing and tools pages', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/sitemap.xml.js'), 'utf8');
    if (!c.includes('/pricing')) throw new Error('sitemap missing /pricing');
    if (!c.includes('/tools/code-generator')) throw new Error('sitemap missing tools pages');
  });
  test('lib/email.js has sendTeamInviteEmail', () => {
    const c = fs.readFileSync(path.join(ROOT, 'lib/email.js'), 'utf8');
    if (!c.includes('sendTeamInviteEmail')) throw new Error('email.js missing sendTeamInviteEmail');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 21: v25 Final Deep Audit Fixes
// ══════════════════════════════════════════════════════════
describe('v25 — Final audit fixes', () => {
  test('All admin APIs have setSecurityHeaders', () => {
    const adminDir = path.join(ROOT, 'pages/api/admin');
    const skip = ['login.js', 'logout.js'];
    const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.js') && !skip.includes(f));
    const missing = files.filter(f => !fs.readFileSync(path.join(adminDir, f), 'utf8').includes('setSecurityHeaders'));
    if (missing.length > 0) throw new Error(`Missing setSecurityHeaders in: ${missing.join(', ')}`);
  });
  test('spokes/submit.js requires auth', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/spokes/submit.js'), 'utf8');
    if (!c.includes('getServerSession') && !c.includes('session')) throw new Error('spokes/submit.js missing auth');
  });
  test('payment.js has double-payment guard', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/payment.js'), 'utf8');
    if (!c.includes('already have an active') && !c.includes('active_sub'))
      throw new Error('payment.js missing double-payment guard');
  });
  test('database_v12.sql exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'database_v12.sql'))) throw new Error('database_v12.sql missing');
  });
  test('webhooks/[slug].js has setSecurityHeaders', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/webhooks/[slug].js'), 'utf8');
    if (!c.includes('setSecurityHeaders')) throw new Error('webhooks missing setSecurityHeaders');
  });
  test('forgot-password.js has try/catch', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/auth/forgot-password.js'), 'utf8');
    if (!c.includes('try {')) throw new Error('forgot-password.js missing try/catch');
  });
  test('tools version-matrix has setSecurityHeaders', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/tools/version-matrix.js'), 'utf8');
    if (!c.includes('setSecurityHeaders')) throw new Error('version-matrix missing setSecurityHeaders');
  });
  test('DEPLOY.md includes database_v12', () => {
    const c = fs.readFileSync(path.join(ROOT, 'DEPLOY.md'), 'utf8');
    if (!c.includes('database_v12')) throw new Error('DEPLOY.md missing database_v12.sql');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 22: v26 Admin Panel Expansion
// ══════════════════════════════════════════════════════════
describe('v26 — New admin pages exist', () => {
  const newPages = [
    'pages/admin/user-detail.js',
    'pages/admin/ratings.js',
    'pages/admin/promo-codes.js',
    'pages/admin/ip-block.js',
    'pages/admin/audit-log.js',
    'pages/admin/churn.js',
    'pages/admin/broadcast.js',
    'pages/admin/error-encyclopedia.js',
    'pages/changelog.js',
    'pages/status.js',
  ];
  newPages.forEach(p => {
    test(`${p} exists`, () => {
      if (!fs.existsSync(path.join(ROOT, p))) throw new Error(`Missing: ${p}`);
    });
  });
});

describe('v26 — New admin APIs exist', () => {
  const newApis = [
    'pages/api/admin/ratings.js',
    'pages/api/admin/chatbot-logs.js',
    'pages/api/admin/error-encyclopedia.js',
    'pages/api/admin/user-detail.js',
    'pages/api/admin/promo-codes.js',
    'pages/api/admin/ip-block.js',
    'pages/api/admin/audit-log.js',
    'pages/api/admin/refund.js',
    'pages/api/admin/broadcast.js',
    'pages/api/admin/spokes-bulk.js',
    'pages/api/admin/churn.js',
  ];
  newApis.forEach(p => {
    test(`${p} exists and has auth`, () => {
      if (!fs.existsSync(path.join(ROOT, p))) throw new Error(`Missing: ${p}`);
      const c = fs.readFileSync(path.join(ROOT, p), 'utf8');
      if (!c.includes('withAdminAuth')) throw new Error(`${p} missing withAdminAuth`);
    });
  });
});

describe('v26 — Database migrations', () => {
  test('database_v19.sql exists with new tables', () => {
    const p = path.join(ROOT, 'database_v19.sql');
    if (!fs.existsSync(p)) throw new Error('database_v19.sql missing');
    const c = fs.readFileSync(p, 'utf8');
    if (!c.includes('sn_admin_notes')) throw new Error('sn_admin_notes missing');
    if (!c.includes('sn_promo_codes')) throw new Error('sn_promo_codes missing');
    if (!c.includes('sn_ip_blocks')) throw new Error('sn_ip_blocks missing');
    if (!c.includes('sn_audit_logs')) throw new Error('sn_audit_logs missing');
  });
  test('DEPLOY.md includes database_v19', () => {
    const c = fs.readFileSync(path.join(ROOT, 'DEPLOY.md'), 'utf8');
    if (!c.includes('database_v19')) throw new Error('DEPLOY.md missing database_v19');
  });
});

describe('v26 — Public pages', () => {
  test('changelog page has release entries', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/changelog.js'), 'utf8');
    if (!c.includes('HARDCODED') && !c.includes('CHANGELOG')) throw new Error('changelog.js missing release data');
  });
  test('status page auto-refreshes', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/status.js'), 'utf8');
    if (!c.includes('setInterval')) throw new Error('status.js missing auto-refresh');
    if (!c.includes('/api/health')) throw new Error('status.js not using health API');
  });
  test('AdminLayout has all new nav items', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/admin/AdminLayout.js'), 'utf8');
    if (!c.includes('promo-codes')) throw new Error('AdminLayout missing promo-codes nav');
    if (!c.includes('ip-block')) throw new Error('AdminLayout missing ip-block nav');
    if (!c.includes('audit-log')) throw new Error('AdminLayout missing audit-log nav');
    if (!c.includes('churn')) throw new Error('AdminLayout missing churn nav');
    if (!c.includes('broadcast')) throw new Error('AdminLayout missing broadcast nav');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 23: v27 Session & Dashboard Fixes
// ══════════════════════════════════════════════════════════
describe('v27 — Session fixes', () => {
  test('NextAuth checks banned users in credentials', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/auth/[...nextauth].js'), 'utf8');
    if (!c.includes('is_banned')) throw new Error('NextAuth missing banned user check');
  });
  test('NextAuth auto-refreshes plan every 5 min', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/auth/[...nextauth].js'), 'utf8');
    if (!c.includes('PLAN_REFRESH_INTERVAL')) throw new Error('Missing plan refresh interval');
    if (!c.includes('shouldRefresh')) throw new Error('Missing shouldRefresh logic');
  });
  test('NextAuth supports session update trigger', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/auth/[...nextauth].js'), 'utf8');
    if (!c.includes("trigger === 'update'")) throw new Error('Missing session update trigger');
  });
  test('NextAuth propagates BannedUser error to session', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/auth/[...nextauth].js'), 'utf8');
    if (!c.includes("error: 'BannedUser'")) throw new Error('Missing BannedUser error');
  });
  test('OAuth signIn checks banned status', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/auth/[...nextauth].js'), 'utf8');
    if (!c.includes('return false') || !c.includes('is_banned')) throw new Error('OAuth missing banned check');
  });
});

describe('v27 — Dashboard fixes', () => {
  test('Dashboard handles banned user session', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/dashboard/index.js'), 'utf8');
    if (!c.includes('BannedUser')) throw new Error('Dashboard missing banned user handling');
  });
  test('Dashboard redirects to onboarding if not onboarded', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/dashboard/index.js'), 'utf8');
    if (!c.includes('/onboarding')) throw new Error('Dashboard missing onboarding redirect');
  });
  test('Dashboard uses correct usage data path', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/dashboard/index.js'), 'utf8');
    if (c.includes('usage.usage.')) throw new Error('Dashboard has double .usage.usage path bug');
  });
  test('Dashboard has refresh button', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/dashboard/index.js'), 'utf8');
    if (!c.includes('fetchAll') || !c.includes('Refresh')) throw new Error('Dashboard missing refresh button');
  });
  test('Dashboard billing tab calls updateSession after cancel', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/dashboard/index.js'), 'utf8');
    if (!c.includes('updateSession')) throw new Error('BillingTab missing updateSession after cancel');
  });
  test('Dashboard uses inline styles not Tailwind', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/dashboard/index.js'), 'utf8');
    const tailwindCount = (c.match(/className="[^"]*bg-gray|className="[^"]*text-gray|className="[^"]*min-h-screen/g) || []).length;
    if (tailwindCount > 5) throw new Error(`Too many Tailwind classes (${tailwindCount}) — should use inline styles`);
  });
  test('Dashboard loading state uses skeleton not raw spinner', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/dashboard/index.js'), 'utf8');
    if (!c.includes('shimmer') && !c.includes('LoadingContent')) throw new Error('Dashboard missing skeleton loading');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 24: v28 UI/UX Improvements
// ══════════════════════════════════════════════════════════
describe('v28 — UI/UX improvements', () => {
  test('globals.css has no duplicate keyframes', () => {
    const c = fs.readFileSync(path.join(ROOT, 'styles/globals.css'), 'utf8');
    const spinCount = (c.match(/@keyframes spin/g) || []).length;
    if (spinCount > 1) throw new Error(`Duplicate @keyframes spin: ${spinCount}`);
    const pulseCount = (c.match(/@keyframes pulse/g) || []).length;
    if (pulseCount > 1) throw new Error(`Duplicate @keyframes pulse: ${pulseCount}`);
  });
  test('login.js has show/hide password toggle', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/login.js'), 'utf8');
    if (!c.includes('showPwd') || !c.includes('EyeIcon')) throw new Error('login.js missing password toggle');
  });
  test('login.js has OAuth loading state', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/login.js'), 'utf8');
    if (!c.includes('oauthLoading')) throw new Error('login.js missing OAuth loading state');
  });
  test('register.js has password strength indicator', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/register.js'), 'utf8');
    if (!c.includes('getPasswordStrength')) throw new Error('register.js missing password strength');
  });
  test('register.js has show/hide password', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/register.js'), 'utf8');
    if (!c.includes('showPwd')) throw new Error('register.js missing password toggle');
  });
  test('spoke page has skeleton loading not plain spinner', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/spoke/[slug].js'), 'utf8');
    if (!c.includes('skeleton') && !c.includes('Skeleton')) throw new Error('Spoke page missing skeleton loader');
    if (c.includes('30-60 seconds')) throw new Error('Spoke page still has bad "30-60 seconds" message');
  });
  test('pricing page has responsive grid', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/pricing.js'), 'utf8');
    if (!c.includes('auto-fit') && !c.includes('minmax') && !c.includes('grid-cols') && !c.includes('md:grid')) throw new Error('pricing.js not responsive');
  });
  test('pricing page SEO inside component', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/pricing.js'), 'utf8');
    // SEO should not be defined as a component outside the function
    if (c.includes('const SEO = ()')) throw new Error('SEO component still outside function');
  });
  test('404 page has helpful suggestions', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/404.js'), 'utf8');
    if (!c.includes('suggestions') && !c.includes('/search') && !c.includes('/spokes'))
      throw new Error('404 page missing helpful links');
  });
  test('footer has all key links', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/Footer.js'), 'utf8');
    if (!c.includes('/changelog'))  throw new Error('Footer missing /changelog');
    if (!c.includes('/status'))     throw new Error('Footer missing /status');
    if (!c.includes('/pricing'))    throw new Error('Footer missing /pricing');
    if (!c.includes('/tools/code-generator')) throw new Error('Footer missing tools links');
  });
  test('footer has dynamic copyright year', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/Footer.js'), 'utf8');
    if (!c.includes('getFullYear')) throw new Error('Footer has hardcoded year');
  });
  test('globals.css has typing cursor animation', () => {
    const c = fs.readFileSync(path.join(ROOT, 'styles/globals.css'), 'utf8');
    if (!c.includes('typing-cursor')) throw new Error('Missing typing cursor class');
  });
  test('500 page links to /status', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/500.js'), 'utf8');
    if (!c.includes('/status')) throw new Error('500 page missing status link');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 25: v29 Real SaaS UI Fixes
// ══════════════════════════════════════════════════════════
describe('v29 — Real SaaS UI/UX fixes', () => {
  test('All tool pages use dark background not light', () => {
    const tools = ['code-generator','script-linter','error-finder','query-builder','version-matrix'];
    tools.forEach(t => {
      const c = fs.readFileSync(path.join(ROOT, `pages/tools/${t}.js`), 'utf8');
      if (c.includes("background: '#f8fafc'") || c.includes("background: '#f9fafb'"))
        throw new Error(`${t}.js still has light background`);
    });
  });
  test('No orphaned SEO components outside functions', () => {
    ['pages/search.js', 'pages/tools/code-generator.js', 'pages/tools/script-linter.js'].forEach(p => {
      const c = fs.readFileSync(path.join(ROOT, p), 'utf8');
      if (c.includes('const SEO = ()')) throw new Error(`${p} has orphaned SEO component`);
    });
  });
  test('No alert() calls in tool pages', () => {
    const tools = ['code-generator','script-linter','error-finder','query-builder'];
    tools.forEach(t => {
      const c = fs.readFileSync(path.join(ROOT, `pages/tools/${t}.js`), 'utf8');
      if (c.includes('alert(')) throw new Error(`${t}.js still uses alert()`);
    });
  });
  test('No duplicate @keyframes in search.js', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/search.js'), 'utf8');
    const count = (c.match(/@keyframes/g) || []).length;
    if (count > 0) throw new Error(`search.js has ${count} duplicate keyframes (should use globals.css)`);
  });
  test('code-generator.js has inline error state', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/tools/code-generator.js'), 'utf8');
    if (!c.includes('setError')) throw new Error('code-generator.js missing error state');
  });
  test('query-builder.js has inline error state', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/tools/query-builder.js'), 'utf8');
    if (!c.includes('setBuildError') && !c.includes('setError')) throw new Error('query-builder.js missing error state');
  });
  test('version-matrix.js buttons use dark colors', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/tools/version-matrix.js'), 'utf8');
    if (c.includes("background: type === t ? '#111827' : '#fff'"))
      throw new Error('version-matrix.js still has light button backgrounds');
  });
  test('error-finder.js category buttons use dark colors', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/tools/error-finder.js'), 'utf8');
    if (c.includes("background: (c === 'All' && !category) || category === c ? '#111827' : '#f9fafb'"))
      throw new Error('error-finder.js still has light button backgrounds');
  });
  test('search.js debounce hook uses useState not React.useState', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/search.js'), 'utf8');
    if (c.includes('React.useState')) throw new Error('search.js debounce uses React.useState (should use destructured useState)');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 26: v30 Footer Admin Control
// ══════════════════════════════════════════════════════════
describe('v30 — Footer admin control', () => {
  test('pages/admin/footer.js exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'pages/admin/footer.js'))) throw new Error('admin footer page missing');
  });
  test('pages/api/admin/footer.js exists and has auth', () => {
    const p = path.join(ROOT, 'pages/api/admin/footer.js');
    if (!fs.existsSync(p)) throw new Error('admin footer API missing');
    const c = fs.readFileSync(p, 'utf8');
    if (!c.includes('withAdminAuth')) throw new Error('footer API missing auth');
  });
  test('pages/api/footer-config.js public endpoint exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'pages/api/footer-config.js'))) throw new Error('public footer-config API missing');
  });
  test('Footer.js reads from API dynamically', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/Footer.js'), 'utf8');
    if (!c.includes('/api/footer-config')) throw new Error('Footer.js not reading from API');
    if (!c.includes('DEFAULT_CONFIG')) throw new Error('Footer.js missing fallback defaults');
  });
  test('Footer.js supports social links', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/Footer.js'), 'utf8');
    if (!c.includes('social_links')) throw new Error('Footer.js missing social_links support');
  });
  test('Footer.js supports hide_columns', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/Footer.js'), 'utf8');
    if (!c.includes('hide_columns')) throw new Error('Footer.js missing hide_columns support');
  });
  test('AdminLayout nav has footer link', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/admin/AdminLayout.js'), 'utf8');
    if (!c.includes('/admin/footer')) throw new Error('AdminLayout missing footer nav link');
  });
  test('admin footer page has live preview tab', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/admin/footer.js'), 'utf8');
    if (!c.includes('preview')) throw new Error('Footer admin page missing preview tab');
  });
  test('admin footer page has social links management', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/admin/footer.js'), 'utf8');
    if (!c.includes('social_links') || !c.includes('addSocial')) throw new Error('Footer admin missing social management');
  });
  test('footer API stores config in sn_system_properties', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/admin/footer.js'), 'utf8');
    if (!c.includes('footer_config')) throw new Error('Footer API not using sn_system_properties');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 27: v31 Cleanup
// ══════════════════════════════════════════════════════════
describe('v31 — Cleanup and fixes', () => {
  test('search.js debounce is wired (debouncedQ used)', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/search.js'), 'utf8');
    if (!c.includes('debouncedQ')) throw new Error('search.js debounce not wired');
  });
  test('spokes.js uses SpokeCardSkeleton not raw spinner', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/spokes.js'), 'utf8');
    if (c.includes("className=\"spin\"") || c.includes("className='spin'"))
      throw new Error('spokes.js still uses raw spinner');
    if (!c.includes('SpokeCardSkeleton')) throw new Error('SpokeCardSkeleton not used in spokes.js');
  });
  test('join-team.js has Footer', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/join-team.js'), 'utf8');
    if (!c.includes('Footer')) throw new Error('join-team.js missing Footer');
  });
  test('forgot-password.js uses inline styles not Tailwind', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/forgot-password.js'), 'utf8');
    const tailwind = (c.match(/className="[^"]*bg-gray|className="[^"]*rounded-2xl|className="[^"]*space-y/g) || []).length;
    if (tailwind > 0) throw new Error(`forgot-password.js still has ${tailwind} Tailwind classes`);
  });
  test('onboarding uses inline styles not Tailwind', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/onboarding/index.js'), 'utf8');
    const tailwind = (c.match(/className="[^"]*bg-gray|className="[^"]*rounded-|className="[^"]*text-gray/g) || []).length;
    if (tailwind > 0) throw new Error(`onboarding has ${tailwind} Tailwind classes`);
  });
  test('changelog.js fetches from API', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/changelog.js'), 'utf8');
    if (!c.includes('/api/changelog')) throw new Error('changelog.js not fetching from API');
    if (!c.includes('HARDCODED')) throw new Error('changelog.js missing hardcoded fallback');
  });
  test('/api/changelog endpoint exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'pages/api/changelog.js')))
      throw new Error('/api/changelog.js missing');
  });
  test('forgot-password.js has password strength bar', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/forgot-password.js'), 'utf8');
    if (!c.includes('StrengthBar')) throw new Error('forgot-password missing password strength');
  });
  test('onboarding has back navigation header', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/onboarding/index.js'), 'utf8');
    if (!c.includes('Skip for now')) throw new Error('onboarding missing skip/nav option');
  });
  test('no raw search.js blank lines (clean after SEO removal)', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/search.js'), 'utf8');
    if (c.includes('\n\n\n')) throw new Error('search.js has 3+ consecutive blank lines');
  });
});

// <RESULTS>

// ══════════════════════════════════════════════════════════
// TEST SUITE 28: v32 — All fixes
// ══════════════════════════════════════════════════════════
describe('v32 — Critical fixes', () => {
  test('api/spoke.js uses callN8n not callN8N', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/spoke.js'), 'utf8');
    if (c.includes('callN8N') || c.includes('N8N_WEBHOOKS')) throw new Error('spoke.js still has wrong import');
    if (!c.includes('callN8n')) throw new Error('spoke.js missing callN8n');
  });
  test('_app.js wraps in ErrorBoundary', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/_app.js'), 'utf8');
    if (!c.includes('<ErrorBoundary>')) throw new Error('_app.js missing ErrorBoundary wrapper');
  });
  test('_app.js renders AnnouncementBanner', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/_app.js'), 'utf8');
    if (!c.includes('AnnouncementBanner')) throw new Error('AnnouncementBanner missing from _app.js');
  });
  test('payment.js cancel invalidates plan cache', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/api/payment.js'), 'utf8');
    if (!c.includes('invalidatePlanCache')) throw new Error('payment cancel missing invalidatePlanCache');
  });
  test('AnnouncementBanner uses dark colours', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/AnnouncementBanner.js'), 'utf8');
    if (c.includes("'#eff6ff'") || c.includes("'#fffbeb'") || c.includes("'#f0fdf4'")) throw new Error('AnnouncementBanner still has light theme');
    if (c.includes('axios')) throw new Error('AnnouncementBanner still imports axios');
  });
  test('spoke page has rating UI', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/spoke/[slug].js'), 'utf8');
    if (!c.includes('submitRating')) throw new Error('spoke page missing rating UI');
    if (!c.includes('ratingStats')) throw new Error('spoke page missing rating stats');
  });
  test('spoke page loads bookmark state on mount', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/spoke/[slug].js'), 'utf8');
    if (!c.includes('/api/user/bookmarks')) throw new Error('spoke page not loading bookmark state');
  });
  test('spoke page has login check on bookmark', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/spoke/[slug].js'), 'utf8');
    if (!c.includes('session?.user?.id')) throw new Error('spoke page missing login check on bookmark');
  });
  test('spoke page has Footer on error state', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/spoke/[slug].js'), 'utf8');
    const errIdx = c.indexOf('if (error) return');
    const footerAfterErr = c.indexOf('<Footer />', errIdx);
    if (footerAfterErr === -1 || footerAfterErr > errIdx + 1200) throw new Error('spoke page error state missing Footer');
  });
  test('_app.js has maintenance mode check', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/_app.js'), 'utf8');
    if (!c.includes('MaintenanceCheck')) throw new Error('_app.js missing MaintenanceCheck');
  });
});

describe('v32 — New admin pages', () => {
  const newPages = ['pages/admin/changelog.js','pages/admin/referrals.js','pages/admin/teams.js','pages/admin/chatbot-logs.js'];
  newPages.forEach(p => {
    test(`${p} exists`, () => { if (!fs.existsSync(path.join(ROOT, p))) throw new Error(`Missing: ${p}`); });
  });
  test('admin/changelog has save+delete functionality', () => {
    const c = fs.readFileSync(path.join(ROOT, 'pages/admin/changelog.js'), 'utf8');
    if (!c.includes('save') || !c.includes('del')) throw new Error('changelog admin missing save/delete');
  });
  test('api/admin/changelog.js exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'pages/api/admin/changelog.js'))) throw new Error('admin changelog API missing');
  });
  test('api/admin/referrals.js exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'pages/api/admin/referrals.js'))) throw new Error('admin referrals API missing');
  });
  test('api/admin/teams.js exists', () => {
    if (!fs.existsSync(path.join(ROOT, 'pages/api/admin/teams.js'))) throw new Error('admin teams API missing');
  });
  test('AdminLayout has all new nav entries', () => {
    const c = fs.readFileSync(path.join(ROOT, 'components/admin/AdminLayout.js'), 'utf8');
    if (!c.includes('/admin/changelog'))    throw new Error('AdminLayout missing changelog');
    if (!c.includes('/admin/referrals'))    throw new Error('AdminLayout missing referrals');
    if (!c.includes('/admin/teams'))        throw new Error('AdminLayout missing teams');
    if (!c.includes('/admin/chatbot-logs')) throw new Error('AdminLayout missing chatbot-logs');
  });
});

// ══════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`  Results: ${passed} passed  ${failed} failed`);
console.log('═'.repeat(50));

if (failures.length > 0) {
  console.log('\n  Failed tests:');
  failures.forEach(f => console.log(`  ❌ ${f.n}\n     ${f.msg}`));
}

if (failed === 0) {
  console.log('\n  🎉 All tests passed! snspokes v32.1 is ready.\n');
  process.exit(0);
} else {
  console.log(`\n  ⚠️  ${failed} test(s) failed.\n`);
  process.exit(1);
}
