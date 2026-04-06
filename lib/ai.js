// AI client — multi-provider fallback chain
// 1. OpenRouter free (5 models)
// 2. Puter API (Claude Sonnet 4.6 — free, unlimited)
// 3. Ollama (local, unlimited)

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

const PUTER_URL = 'https://api.puter.com/puterai/openai/v1/chat/completions';
const PUTER_TOKEN = process.env.PUTER_AUTH_TOKEN || '';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

const FREE_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-32b:free',
  'nvidia/llama-3.1-nemotron-70b-instruct:free',
  'deepseek/deepseek-r1-0528:free',
];

// 1. Try OpenRouter free models
async function tryOpenRouter(messages, maxTokens, timeout) {
  if (!OPENROUTER_KEY) return null;
  for (const model of FREE_MODELS) {
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
      return { success: true, answer, model: data.model || model };
    } catch { continue; }
  }
  return null;
}

// 2. Try Puter API (Claude Sonnet — free, unlimited)
async function tryPuter(messages, maxTokens, timeout) {
  if (!PUTER_TOKEN) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(PUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + PUTER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        messages,
        max_tokens: maxTokens,
      }),
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

// 3. Try local Ollama
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

// Main function — tries all providers in order
export async function askAI(question, options = {}) {
  const { systemPrompt, history = [], maxTokens = 1500, timeout = 60000 } = options;

  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant. Answer directly. Use markdown: ## headers, **bold**, ```code blocks```, - bullets. Be concise.' },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];

  // 1. OpenRouter (free, 50 req/day)
  const or = await tryOpenRouter(messages, maxTokens, timeout);
  if (or) return or;

  // 2. Puter (Claude Sonnet 4.6 — free, unlimited)
  const puter = await tryPuter(messages, maxTokens, timeout);
  if (puter) return puter;

  // 3. Ollama (local, unlimited)
  const ollama = await tryOllama(messages, maxTokens, Math.min(timeout, 30000));
  if (ollama) return ollama;

  // All failed
  return {
    success: false,
    answer: 'All AI providers temporarily unavailable.\n\n**Setup options (pick any):**\n- **Puter (recommended):** Get free token at puter.com/dashboard → add PUTER_AUTH_TOKEN to .env.local\n- **OpenRouter:** Wait for daily reset (50 free/day)\n- **Ollama:** `curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3.1:8b`',
    model: null,
  };
}
