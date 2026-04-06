// AI client — 4-provider fallback chain
// 1. OpenRouter free (5 models, 50 req/day)
// 2. Puter (Claude Sonnet 4.6 — free, unlimited)
// 3. Google Gemini (1,000 free req/day — VERY generous)
// 4. Ollama (local, unlimited)

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

// 1. OpenRouter free models
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

// 2. Puter (Claude Sonnet 4.6 — free, unlimited)
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

// 3. Google Gemini (1,000 free req/day!)
async function tryGemini(messages, maxTokens, timeout) {
  if (!GEMINI_KEY) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Convert messages to Gemini format
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

// 4. Local Ollama
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

// Main — tries all 4 providers
export async function askAI(question, options = {}) {
  const { systemPrompt, history = [], maxTokens = 1500, timeout = 60000 } = options;

  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant. Answer directly. Use markdown: ## headers, **bold**, ```code blocks```, - bullets. Be concise.' },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];

  // Try each provider in order
  const or = await tryOpenRouter(messages, maxTokens, timeout);
  if (or) return or;

  const puter = await tryPuter(messages, maxTokens, timeout);
  if (puter) return puter;

  const gemini = await tryGemini(messages, maxTokens, timeout);
  if (gemini) return gemini;

  const ollama = await tryOllama(messages, maxTokens, Math.min(timeout, 30000));
  if (ollama) return ollama;

  return {
    success: false,
    answer: 'All AI providers unavailable.\n\n**Free setup options:**\n- **Puter (Claude Sonnet 4.6):** puter.com → get token → add PUTER_AUTH_TOKEN\n- **Google Gemini (1000 req/day):** aistudio.google.com → get key → add GEMINI_API_KEY\n- **Ollama (local):** `curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3.1:8b`',
    model: null,
  };
}
