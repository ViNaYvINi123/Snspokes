// ============================================================
// snspokes — Backend Mock
// Set MOCK_MODE=true in .env.local to use this instead of real DB
// Perfect for local dev without PostgreSQL/Redis/n8n
// Usage: MOCK_MODE=true npm run dev
// ============================================================

import {
  MOCK_USERS, MOCK_SPOKES, MOCK_PAYMENTS, MOCK_SEARCHES,
  MOCK_CODE_GENERATIONS, MOCK_SAVED_QUERIES, MOCK_BOOKMARKS,
  MOCK_ERRORS, MOCK_SUBMISSIONS, MOCK_PROPERTIES, MOCK_HEALTH_SNAPSHOTS,
  MOCK_NOTIFICATIONS, MOCK_REFERRALS, MOCK_ERROR_ENCYCLOPEDIA,
  MOCK_FLAGS, MOCK_API_KEYS, MOCK_WEBHOOKS, MOCK_ANNOUNCEMENTS,
  MOCK_COMMAND_CENTER,
} from './data.js';

// In-memory store (resets on server restart)
const store = {
  users:        [...MOCK_USERS],
  spokes:       [...MOCK_SPOKES],
  payments:     [...MOCK_PAYMENTS],
  searches:     [...MOCK_SEARCHES],
  codeGens:     [...MOCK_CODE_GENERATIONS],
  savedQueries: [...MOCK_SAVED_QUERIES],
  bookmarks:    [...MOCK_BOOKMARKS],
  errors:       [...MOCK_ERRORS],
  submissions:  [...MOCK_SUBMISSIONS],
  properties:   [...MOCK_PROPERTIES],
  snapshots:    [...MOCK_HEALTH_SNAPSHOTS],
  notifications:[...MOCK_NOTIFICATIONS],
  referrals:    [...MOCK_REFERRALS],
  errorEncyc:   [...MOCK_ERROR_ENCYCLOPEDIA],
  flags:        [...MOCK_FLAGS],
  apiKeys:      [...MOCK_API_KEYS],
  webhooks:     [...MOCK_WEBHOOKS],
  announcements:[...MOCK_ANNOUNCEMENTS],
  auditLogs:    [],
  lintResults:  [],
  nextId:       { users: 9, spokes: 13, payments: 7 },
};

// ── Mock DB query function ─────────────────────────────────
// Parses SQL patterns and routes to in-memory store
export function mockQuery(sql, params = []) {
  const s = sql.trim().toUpperCase();

  // ── SELECT queries ─────────────────────────────────────
  if (s.startsWith('SELECT')) {

    // Users
    if (sql.includes('sn_users') && !sql.includes('JOIN')) {
      let rows = [...store.users];
      if (params[0] && sql.includes('email=$1')) rows = rows.filter(u => u.email === params[0]);
      if (params[0] && sql.includes('id=$1')) rows = rows.filter(u => u.id === parseInt(params[0]));
      if (sql.includes('is_active=true')) rows = rows.filter(u => u.is_active);
      if (sql.includes('COUNT(*)')) return { rows: [{ total: rows.length, new_this_month: 2, banned: rows.filter(u=>u.is_banned).length }], rowCount: 1 };
      if (sql.includes('plan, COUNT')) {
        const dist = {};
        rows.forEach(u => { dist[u.plan] = (dist[u.plan]||0) + 1; });
        return { rows: Object.entries(dist).map(([plan,count]) => ({plan, count: String(count)})), rowCount: Object.keys(dist).length };
      }
      return { rows: rows.slice(0, parseInt(sql.match(/LIMIT (\d+)/)?.[1]) || 100), rowCount: rows.length };
    }

    // Spokes
    if (sql.includes('sn_spokes') && !sql.includes('JOIN')) {
      let rows = [...store.spokes];
      if (params[0] && sql.includes('slug=$1')) rows = rows.filter(s => s.slug === params[0]);
      if (sql.includes('is_active=true') || sql.includes("is_active = true")) rows = rows.filter(s => s.is_active);
      if (params[0] && sql.includes('ILIKE')) {
        const q = params[0].replace(/%/g, '').toLowerCase();
        rows = rows.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.plugin_id.toLowerCase().includes(q));
      }
      if (sql.includes('COUNT(*)')) return { rows: [{ total: rows.length }], rowCount: 1 };
      const limit = parseInt(sql.match(/LIMIT (\d+)/)?.[1]) || 100;
      const offset = parseInt(sql.match(/OFFSET (\d+)/)?.[1]) || 0;
      return { rows: rows.slice(offset, offset + limit), rowCount: rows.length };
    }

    // Payments
    if (sql.includes('sn_payments')) {
      let rows = [...store.payments];
      if (sql.includes("status='active'")) rows = rows.filter(p => p.status === 'active');
      if (sql.includes('user_id=$1')) rows = rows.filter(p => p.user_id === parseInt(params[0]));
      if (sql.includes('COUNT(*)')) return { rows: [{ total: rows.length, count: rows.length }], rowCount: 1 };
      if (sql.includes('SUM(amount)')) return { rows: [{ total: rows.filter(p=>p.status==='active').reduce((s,p)=>s+p.amount,0) }], rowCount: 1 };
      return { rows, rowCount: rows.length };
    }

    // Search analytics
    if (sql.includes('sn_search_analytics')) {
      let rows = [...store.searches];
      if (sql.includes('COUNT(*)')) return { rows: [{ total: rows.length, today: Math.floor(rows.length/2) }], rowCount: 1 };
      if (sql.includes('GROUP BY query')) {
        const counts = {};
        rows.forEach(r => { counts[r.query] = (counts[r.query]||0) + 1; });
        return { rows: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([query,count])=>({query, count: String(count)})), rowCount: Object.keys(counts).length };
      }
      return { rows: rows.slice(0, 10), rowCount: rows.length };
    }

    // Code generations
    if (sql.includes('sn_code_generations')) {
      let rows = [...store.codeGens];
      if (sql.includes('user_id=$1')) rows = rows.filter(r => r.user_id === parseInt(params[0]));
      if (sql.includes('COUNT(*)')) return { rows: [{ c: rows.length }], rowCount: 1 };
      return { rows, rowCount: rows.length };
    }

    // Saved queries
    if (sql.includes('sn_saved_queries')) {
      let rows = [...store.savedQueries];
      if (sql.includes('user_id=$1')) rows = rows.filter(r => r.user_id === parseInt(params[0]));
      return { rows, rowCount: rows.length };
    }

    // Bookmarks
    if (sql.includes('sn_user_bookmarks')) {
      let rows = [...store.bookmarks];
      if (sql.includes('user_id=$1')) rows = rows.filter(r => r.user_id === parseInt(params[0]));
      if (sql.includes('JOIN')) {
        rows = rows.map(b => {
          const spoke = store.spokes.find(s => s.slug === b.spoke_slug);
          return { ...b, name: spoke?.name, category: spoke?.category, min_version: spoke?.min_version };
        });
      }
      return { rows, rowCount: rows.length };
    }

    // Error logs
    if (sql.includes('sn_error_logs')) {
      let rows = [...store.errors];
      if (sql.includes('resolved=false')) rows = rows.filter(e => !e.resolved);
      if (sql.includes('COUNT(*)')) return { rows: [{ total: rows.length }], rowCount: 1 };
      return { rows: rows.slice(0, 10), rowCount: rows.length };
    }

    // Submissions
    if (sql.includes('sn_spoke_submissions')) {
      let rows = [...store.submissions];
      if (params[0] && sql.includes('status=$1')) rows = rows.filter(r => r.status === params[0]);
      if (params[0] && sql.includes('plugin_id=$1')) rows = rows.filter(r => r.plugin_id === params[0]);
      return { rows, rowCount: rows.length };
    }

    // System properties
    if (sql.includes('sn_system_properties')) {
      let rows = [...store.properties];
      if (params[0] && sql.includes('name=$1')) rows = rows.filter(r => r.name === params[0]);
      return { rows, rowCount: rows.length };
    }

    // Notifications
    if (sql.includes('sn_admin_notifications')) {
      let rows = [...store.notifications];
      return { rows, rowCount: rows.length };
    }

    // Flags
    if (sql.includes('sn_feature_flags')) {
      return { rows: store.flags, rowCount: store.flags.length };
    }

    // API keys
    if (sql.includes('sn_api_keys')) {
      let rows = [...store.apiKeys];
      if (sql.includes('user_id=$1')) rows = rows.filter(r => r.user_id === parseInt(params[0]));
      return { rows, rowCount: rows.length };
    }

    // Webhooks
    if (sql.includes('sn_webhook')) {
      return { rows: store.webhooks, rowCount: store.webhooks.length };
    }

    // Announcements
    if (sql.includes('sn_announcements')) {
      return { rows: store.announcements.filter(a => a.is_active), rowCount: store.announcements.length };
    }

    // Health snapshots
    if (sql.includes('sn_health_snapshots')) {
      return { rows: store.snapshots, rowCount: store.snapshots.length };
    }

    // Error encyclopedia
    if (sql.includes('sn_error_encyclopedia')) {
      let rows = [...store.errorEncyc];
      if (params[0] && (sql.includes('ILIKE') || sql.includes('LIKE'))) {
        const q = params[0].replace(/%/g,'').toLowerCase();
        rows = rows.filter(r => r.error_pattern?.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q));
      }
      return { rows, rowCount: rows.length };
    }

    // pg_size_pretty (DB size)
    if (sql.includes('pg_database_size') || sql.includes('pg_size_pretty')) {
      return { rows: [{ db_size: '24 MB' }], rowCount: 1 };
    }

    // Referrals
    if (sql.includes('sn_referrals')) {
      let rows = [...store.referrals];
      if (params[0] && sql.includes('referrer_id=$1')) rows = rows.filter(r => r.referrer_id === parseInt(params[0]));
      if (params[0] && sql.includes('code=$1')) rows = rows.filter(r => r.code === params[0]);
      return { rows, rowCount: rows.length };
    }

    // Referral uses
    if (sql.includes('sn_referral_uses')) {
      return { rows: [{ total: '2', converted: '1' }], rowCount: 1 };
    }

    // pg_stat_activity (DB connections)
    if (sql.includes('pg_stat_activity')) {
      return { rows: [{ count: '5' }], rowCount: 1 };
    }

    // Fallback
    return { rows: [], rowCount: 0 };
  }

  // ── INSERT queries ─────────────────────────────────────
  if (s.startsWith('INSERT')) {
    const newId = Date.now();
    if (sql.includes('sn_users')) {
      const newUser = { id: newId, name: params[0], email: params[1], password_hash: params[2], plan: params[3] || 'free', is_active: true, onboarded: false, created_at: new Date().toISOString() };
      store.users.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }
    if (sql.includes('sn_saved_queries')) {
      const newQ = { id: newId, user_id: parseInt(params[0]), name: params[1], query: params[2], table_name: params[3], created_at: new Date().toISOString() };
      store.savedQueries.push(newQ);
      return { rows: [newQ], rowCount: 1 };
    }
    if (sql.includes('sn_user_bookmarks')) {
      const newB = { id: newId, user_id: parseInt(params[0]), spoke_slug: params[1], created_at: new Date().toISOString() };
      store.bookmarks.push(newB);
      return { rows: [newB], rowCount: 1 };
    }
    if (sql.includes('sn_code_generations')) {
      const newC = { id: newId, user_id: parseInt(params[0]), code_type: params[1], prompt: params[2], generated: params[3], model: params[4], created_at: new Date().toISOString() };
      store.codeGens.push(newC);
      return { rows: [newC], rowCount: 1 };
    }
    if (sql.includes('sn_spoke_submissions')) {
      const newS = { id: newId, name: params[0], plugin_id: params[1], description: params[2], category: params[3], status: 'pending', created_at: new Date().toISOString() };
      store.submissions.push(newS);
      return { rows: [newS], rowCount: 1 };
    }
    if (sql.includes('sn_password_resets')) {
      return { rows: [{ id: newId }], rowCount: 1 };
    }
    if (sql.includes('sn_search_analytics')) {
      store.searches.push({ id: newId, query: params[0], user_id: params[1], results: parseInt(params[2]), user_ip: params[3], created_at: new Date().toISOString() });
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('sn_audit_logs') || sql.includes('sn_dev_activity') || sql.includes('sn_lint_results') || sql.includes('sn_backup_logs')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [{ id: newId }], rowCount: 1 };
  }

  // ── UPDATE queries ─────────────────────────────────────
  if (s.startsWith('UPDATE')) {
    if (sql.includes('sn_users')) {
      if (sql.includes('plan=$1')) {
        const user = store.users.find(u => u.id === parseInt(params[params.length-1]));
        if (user) user.plan = params[0];
      }
      if (sql.includes('onboarded=true')) {
        const user = store.users.find(u => u.id === parseInt(params[params.length-1]));
        if (user) { user.onboarded = true; user.role = params[1]; user.sn_version = params[2]; }
      }
      if (sql.includes('is_banned=true')) {
        const user = store.users.find(u => u.id === parseInt(params[params.length-1]));
        if (user) { user.is_banned = true; user.ban_reason = params[0]; }
      }
    }
    if (sql.includes('sn_error_logs') && sql.includes('resolved=true')) {
      store.errors.forEach(e => { e.resolved = true; e.resolved_at = new Date().toISOString(); });
    }
    if (sql.includes('sn_spoke_submissions') && sql.includes("status='approved'")) {
      const sub = store.submissions.find(s => s.id === parseInt(params[params.length-1]));
      if (sub) { sub.status = 'approved'; sub.reviewed_at = new Date().toISOString(); }
    }
    if (sql.includes('sn_system_properties')) {
      const prop = store.properties.find(p => p.name === params[1]);
      if (prop) prop.value = params[0];
    }
    if (sql.includes('sn_password_resets')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  }

  // ── DELETE queries ─────────────────────────────────────
  if (s.startsWith('DELETE')) {
    if (sql.includes('sn_saved_queries')) {
      const idx = store.savedQueries.findIndex(q => q.id === parseInt(params[0]) && q.user_id === parseInt(params[1]));
      if (idx !== -1) { store.savedQueries.splice(idx, 1); return { rows: [{ id: params[0] }], rowCount: 1 }; }
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes('sn_user_bookmarks')) {
      const idx = store.bookmarks.findIndex(b => b.id === parseInt(params[0]) && b.user_id === parseInt(params[1]));
      if (idx !== -1) { store.bookmarks.splice(idx, 1); return { rows: [{ id: params[0] }], rowCount: 1 }; }
      return { rows: [], rowCount: 0 };
    }
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

// ── Mock Redis ─────────────────────────────────────────────
const cache = new Map();
export const mockRedis = {
  cacheGet: async (key) => {
    const item = cache.get(key);
    if (!item) return null;
    if (item.expires && Date.now() > item.expires) { cache.delete(key); return null; }
    return item.value;
  },
  cacheSet: async (key, value, ttl = 300) => {
    cache.set(key, { value, expires: Date.now() + ttl * 1000 });
    return true;
  },
  cacheDel: async (key) => { cache.delete(key); return true; },
  checkRateLimit: async (key, limit, window) => ({
    allowed: true,
    remaining: limit - 1,
    resetIn: window,
  }),
  isRedisAvailable: () => false,
};

// ── Mock n8n ───────────────────────────────────────────────
export const mockN8n = {
  callN8n: async (webhook, payload) => ({
    success: true,
    data: { answer: `[Mock n8n response for ${webhook}]`, model: 'mock-model' },
  }),
  n8nChatbot: async (question) => ({
    success: true,
    data: {
      answer: `**Mock Answer:** Great question about "${question}"!\n\nIn ServiceNow, you can use GlideRecord to query tables. Here's a quick example:\n\`\`\`javascript\nvar gr = new GlideRecord('incident');\ngr.addQuery('active', true);\ngr.setLimit(10);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.number);\n}\n\`\`\``,
      model: 'mock-model',
    },
  }),
  n8nGenerateCode: async (prompt, codeType) => ({
    success: true,
    data: {
      code: `// Mock generated ${codeType} code for: ${prompt}\n// This is a mock response. In production, this uses OpenRouter AI.\n\n(function executeRule(current, previous) {\n  try {\n    gs.info('Executing: ${prompt}');\n    // Your logic here\n  } catch(e) {\n    gs.error('Error: ' + e.message);\n  }\n})(current, previous);`,
      model: 'mock-model',
    },
  }),
  n8nLintScript: async (script, scriptType) => ({
    success: true,
    data: {
      issues: script.includes('eval') ? [{ id: 'eval', severity: 'error', message: 'eval() detected', category: 'Security', fix: 'Remove eval()' }] : [],
      score: script.includes('eval') ? 60 : 92,
      grade: script.includes('eval') ? 'C' : 'A',
      summary: { errors: script.includes('eval') ? 1 : 0, warnings: 0, info: 0 },
    },
  }),
  n8nAnalyzeError: async (errorMsg) => ({
    success: true,
    data: {
      title: 'Mock Error Analysis',
      description: `Analysis for: "${errorMsg}"`,
      root_cause: 'This is a mock analysis. Deploy with real DB for actual AI analysis.',
      fix_steps: ['Check your ServiceNow logs', 'Verify the integration configuration', 'Test with a simple flow first'],
      category: 'Script',
      severity: 'medium',
    },
  }),
  n8nAiDebug: async (question) => ({
    success: true,
    data: { answer: `Mock debug answer for: "${question}"\n\nDeploy with real n8n + OpenRouter for actual AI debugging.` },
  }),
};

// ── Mock Email ─────────────────────────────────────────────
export const mockEmail = {
  sendWelcomeEmail: async (email, name) => { console.log(`[Mock Email] Welcome email to ${email} (${name})`); return true; },
  sendPasswordResetEmail: async (email, url) => { console.log(`[Mock Email] Reset email to ${email}: ${url}`); return true; },
  sendPlanUpgradeEmail: async (email, name, plan) => { console.log(`[Mock Email] Upgrade email to ${email}: ${plan}`); return true; },
};

// ── Mock Command Center ────────────────────────────────────
export const getMockCommandCenter = () => ({
  ...MOCK_COMMAND_CENTER,
  timestamp: new Date().toISOString(),
});

// ── Helper: is mock mode enabled? ─────────────────────────
export const isMockMode = () => process.env.MOCK_MODE === 'true';
