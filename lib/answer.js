/**
 * snspokes Answer Engine
 *
 * Builds structured answers from data already in the database.
 * No AI. No API call. No latency. No cost. No hallucination.
 *
 * When a search finds a match, this takes the raw DB row and
 * formats it into a rich, readable answer — exactly like the
 * data already contains.
 *
 * AI is only called as a LAST RESORT when:
 *   - No DB match found at all
 *   - Query is a specific error message not in common_errors
 */

// ── Build answer from a Spoke row ────────────────────────────────────────────
export function answerFromSpoke(spoke, userQuery) {
  const q       = (userQuery || '').toLowerCase();
  const actions = parseJSON(spoke.actions,       []);
  const steps   = parseJSON(spoke.setup_steps,   []);
  const errors  = parseJSON(spoke.common_errors, []);

  // Decide what to lead with based on the query
  const wantsSetup  = /setup|install|configure|connect|how to|get started|enable/.test(q);
  const wantsError  = /error|fail|invalid|denied|not found|exception/.test(q);
  const wantsActions= /action|what can|feature|do with/.test(q);

  const sections = [];

  // ── Overview ──
  sections.push({
    type:    'overview',
    content: spoke.ai_description || spoke.official_description || spoke.description,
  });

  // ── Personal tip ──
  if (spoke.personal_tip) {
    sections.push({ type: 'tip', content: spoke.personal_tip });
  }

  // ── Lead with what was asked ──
  if (wantsError && errors.length > 0) {
    sections.push({ type: 'errors', items: errors });
    if (steps.length > 0) sections.push({ type: 'setup', items: steps });
  } else if (wantsSetup && steps.length > 0) {
    sections.push({ type: 'setup', items: steps });
    if (errors.length > 0) sections.push({ type: 'errors', items: errors });
  } else if (wantsActions && actions.length > 0) {
    sections.push({ type: 'actions', items: actions });
    if (steps.length > 0) sections.push({ type: 'setup', items: steps });
  } else {
    // Default: setup first, then actions, then errors
    if (steps.length > 0)   sections.push({ type: 'setup',   items: steps });
    if (actions.length > 0) sections.push({ type: 'actions', items: actions });
    if (errors.length > 0)  sections.push({ type: 'errors',  items: errors });
  }

  // ── Code example ──
  if (spoke.code_example) {
    sections.push({ type: 'code', content: spoke.code_example });
  }

  // ── Meta ──
  sections.push({
    type: 'meta',
    plugin_id:       spoke.plugin_id,
    credential_type: spoke.credential_type,
    tier:            spoke.tier,
    min_version:     spoke.min_version,
  });

  return {
    source:   'database',
    type:     'spoke',
    slug:     spoke.slug,
    name:     spoke.name,
    icon:     spoke.icon,
    category: spoke.category,
    sections,
  };
}

// ── Build answer from an API Reference row ───────────────────────────────────
export function answerFromAPI(api, userQuery) {
  const q       = (userQuery || '').toLowerCase();
  const methods = parseJSON(api.methods,         []);
  const params  = parseJSON(api.params,          []);
  const avars   = parseJSON(api.available_vars,  []);
  const best    = parseJSON(api.best_practices,  []);
  const types   = parseJSON(api.types,           []);
  const auth    = parseJSON(api.auth,            []);

  // Filter methods if query mentions a specific method name
  const words = q.split(/\s+/);
  const relevantMethods = methods.filter(m => {
    const name = (m.name || m.path || '').toLowerCase();
    return words.some(w => w.length > 3 && name.includes(w));
  });
  const displayMethods = relevantMethods.length > 0 ? relevantMethods : methods.slice(0, 8);

  const sections = [];

  sections.push({ type: 'overview', content: api.description });

  if (api.gotcha) {
    sections.push({ type: 'gotcha', content: api.gotcha });
  }

  if (api.scoped_differences) {
    sections.push({ type: 'scope', content: api.scoped_differences });
  }

  if (displayMethods.length > 0) {
    sections.push({ type: 'methods', items: displayMethods, total: methods.length });
  }

  if (params.length > 0) {
    sections.push({ type: 'params', items: params });
  }

  if (avars.length > 0) {
    sections.push({ type: 'vars', items: avars });
  }

  if (types.length > 0) {
    sections.push({ type: 'types', items: types });
  }

  if (best.length > 0) {
    sections.push({ type: 'best_practices', items: best });
  }

  if (auth.length > 0) {
    sections.push({ type: 'auth', items: auth });
  }

  if (api.code_example) {
    sections.push({ type: 'code', content: api.code_example });
  }

  return {
    source:     'database',
    type:       'api',
    slug:       api.slug,
    name:       api.name,
    api_type:   api.api_type,
    scope:      api.scope,
    global_var: api.global_var,
    base_path:  api.base_path,
    category:   api.category,
    sections,
  };
}

// ── Build answer from a Script Context row ───────────────────────────────────
export function answerFromContext(ctx, userQuery) {
  const avars = parseJSON(ctx.available_vars, []);
  const best  = parseJSON(ctx.best_practices, []);
  const types = parseJSON(ctx.types,          []);

  const sections = [];
  sections.push({ type: 'overview',  content: ctx.description  });
  sections.push({ type: 'when',      content: ctx.when_runs     });
  if (avars.length > 0)  sections.push({ type: 'vars',           items: avars });
  if (types.length > 0)  sections.push({ type: 'types',          items: types });
  if (best.length  > 0)  sections.push({ type: 'best_practices', items: best  });
  if (ctx.code_example)  sections.push({ type: 'code',           content: ctx.code_example });
  if (ctx.gotcha)        sections.push({ type: 'gotcha',         content: ctx.gotcha       });

  return {
    source: 'database',
    type:   'context',
    slug:   ctx.slug,
    name:   ctx.name,
    sections,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (Array.isArray(val) || typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}
