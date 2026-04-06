// AI client — round-robin + fallback across 4 providers
// Rotates starting provider on each call to spread load evenly
// If current provider fails → tries next in rotation

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

const PUTER_URL = 'https://api.puter.com/puterai/openai/v1/chat/completions';
const PUTER_TOKEN = process.env.PUTER_AUTH_TOKEN || '';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

const FREE_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-32b:free',
  'nvidia/llama-3.1-nemotron-70b-instruct:free',
  'deepseek/deepseek-r1-0528:free',
];

// ── Round-robin state ──
let callCount = 0;
let orModelIndex = 0;

// ── Provider functions ──

async function tryOpenRouter(messages, maxTokens, timeout) {
  if (!OPENROUTER_KEY) return null;
  // Round-robin across free models too
  const startIdx = orModelIndex;
  for (let i = 0; i < FREE_MODELS.length; i++) {
    const idx = (startIdx + i) % FREE_MODELS.length;
    const model = FREE_MODELS[idx];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + OPENROUTER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.error) {
        if ([429, 404, 503].includes(data.error.code || res.status)) continue;
        return { success: false, answer: 'AI error: ' + (data.error.message || 'Unknown'), model };
      }
      const answer = data.choices?.[0]?.message?.content;
      if (!answer) continue;
      orModelIndex = (idx + 1) % FREE_MODELS.length; // Next call starts from next model
      return { success: true, answer, model: data.model || model };
    } catch { continue; }
  }
  return null;
}

async function tryPuter(messages, maxTokens, timeout) {
  if (!PUTER_TOKEN) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(PUTER_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + PUTER_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', messages, max_tokens: maxTokens }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content;
    if (!answer) return null;
    return { success: true, answer, model: 'claude-sonnet-4.6 (puter)' };
  } catch { return null; }
}

async function tryGemini(messages, maxTokens, timeout) {
  if (!GEMINI_KEY) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const res = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) return null;
    return { success: true, answer, model: 'gemini-2.0-flash (google)' };
  } catch { return null; }
}

async function tryOllama(messages, maxTokens, timeout) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(OLLAMA_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false, options: { num_predict: maxTokens, temperature: 0.7 } }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const answer = data.message?.content;
    if (!answer) return null;
    return { success: true, answer, model: OLLAMA_MODEL + ' (local)' };
  } catch { return null; }
}

// ── All available providers ──
const PROVIDERS = [
  { name: 'openrouter', fn: tryOpenRouter, configured: () => !!OPENROUTER_KEY },
  { name: 'puter',      fn: tryPuter,      configured: () => !!PUTER_TOKEN },
  { name: 'gemini',     fn: tryGemini,     configured: () => !!GEMINI_KEY },
  { name: 'ollama',     fn: tryOllama,     configured: () => true }, // Always try
];

// ── Main function — round-robin across providers ──
export async function askAI(question, options = {}) {
  const { systemPrompt, history = [], maxTokens = 1500, timeout = 60000 } = options;

  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant. Answer directly. Use markdown: ## headers, **bold**, ```code blocks```, - bullets. Be concise.' },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];

  // Get configured providers only
  const active = PROVIDERS.filter(p => p.configured());
  if (active.length === 0) {
    return { success: false, answer: 'No AI providers configured. Add at least one key to .env.local', model: null };
  }

  // Round-robin: start from a different provider each call
  const startIdx = callCount % active.length;
  callCount++;

  // Try all providers starting from round-robin position
  for (let i = 0; i < active.length; i++) {
    const idx = (startIdx + i) % active.length;
    const provider = active[idx];
    const ollamaTimeout = provider.name === 'ollama' ? Math.min(timeout, 30000) : timeout;
    const result = await provider.fn(messages, maxTokens, ollamaTimeout);
    if (result) return result;
  }

  // All failed
  return {
    success: false,
    answer: `All ${active.length} AI providers failed.\n\n**Configured:** ${active.map(p => p.name).join(', ')}\n\n**Add more providers:**\n- **Puter (Claude):** puter.com → token → PUTER_AUTH_TOKEN\n- **Gemini (1000/day):** aistudio.google.com → GEMINI_API_KEY\n- **Ollama (local):** ollama pull llama3.1:8b`,
    model: null,
  };
}

// ── Stats (for admin panel) ──
export function getAIStats() {
  const active = PROVIDERS.filter(p => p.configured());
  return {
    total_calls: callCount,
    current_provider_index: callCount % Math.max(active.length, 1),
    configured_providers: active.map(p => p.name),
    all_providers: PROVIDERS.map(p => ({ name: p.name, configured: p.configured() })),
    openrouter_model_index: orModelIndex,
    openrouter_models: FREE_MODELS,
  };
}
