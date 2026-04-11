/**
 * snspokes AI — Lean, reliable, zero-cost
 *
 * Removed: OpenRouter (rate-limited, unreliable free tier)
 *          Puter (unstable, not production-grade)
 *
 * Kept / Added:
 *   Gemini 2.0 Flash  — Google free tier: 15 req/min, 1M tokens/day
 *                        get key: aistudio.google.com → "Get API Key" → free
 *   Groq              — LLaMA 3.3 70B free: 14,400 req/day, fastest inference
 *                        get key: console.groq.com → "Create API Key" → free
 *   Ollama            — Self-hosted on your Hetzner server, zero API cost
 *                        setup: ollama pull llama3.1:8b
 *
 * Strategy: Gemini first (best quality), Groq second (fast fallback),
 *           Ollama third (always available if running)
 *
 * Zero required env vars — if none set, search still works via DB only.
 * AI answers are an enhancement, not a dependency.
 */

const GEMINI_URL   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_KEY   = process.env.GEMINI_API_KEY || '';

const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_KEY     = process.env.GROQ_API_KEY || '';
const GROQ_MODEL   = 'llama-3.3-70b-versatile'; // best free Groq model

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

// ── Gemini 2.0 Flash ─────────────────────────────────────────────────────────
// Free: 15 requests/min, 1,000,000 tokens/day
// Get key at: aistudio.google.com → "Get API Key" (completely free, no card)
async function tryGemini(messages, maxTokens, timeout) {
  if (!GEMINI_KEY) return null;
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const contents  = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.5 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) return null;
    return { success: true, answer: answer.trim(), model: 'gemini-2.0-flash' };
  } catch { return null; }
}

// ── Groq — LLaMA 3.3 70B ─────────────────────────────────────────────────────
// Free: 14,400 req/day, 6,000 tokens/min — fastest inference available
// Get key at: console.groq.com → "API Keys" → "Create API Key" (free)
async function tryGroq(messages, maxTokens, timeout) {
  if (!GROQ_KEY) return null;
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages,
        max_tokens:  maxTokens,
        temperature: 0.5,
        stream:      false,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content;
    if (!answer) return null;
    return { success: true, answer: answer.trim(), model: `groq/${GROQ_MODEL}` };
  } catch { return null; }
}

// ── Ollama — self-hosted on your server ──────────────────────────────────────
// Zero API cost — runs on YOUR Hetzner server
// Setup: docker exec -it snspokes_ollama ollama pull llama3.1:8b
// Or add Ollama as a Docker service (see docker-compose)
async function tryOllama(messages, maxTokens, timeout) {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:   OLLAMA_MODEL,
        messages,
        stream:  false,
        options: { num_predict: maxTokens, temperature: 0.5 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const answer = data.message?.content;
    if (!answer) return null;
    return { success: true, answer: answer.trim(), model: `${OLLAMA_MODEL} (local)` };
  } catch { return null; }
}

// ── Provider chain ────────────────────────────────────────────────────────────
const PROVIDERS = [
  { name: 'gemini', fn: tryGemini, configured: () => !!GEMINI_KEY },
  { name: 'groq',   fn: tryGroq,   configured: () => !!GROQ_KEY   },
  { name: 'ollama', fn: tryOllama, configured: () => true },          // always try
];

let callCount = 0;

export async function askAI(question, options = {}) {
  const {
    systemPrompt,
    history    = [],
    maxTokens  = 800,
    timeout    = 20000,
  } = options;

  const messages = [
    {
      role:    'system',
      content: systemPrompt ||
        'You are a ServiceNow expert. Answer directly. Use markdown for code blocks. Be concise.',
    },
    ...history.slice(-4),
    { role: 'user', content: question },
  ];

  const active = PROVIDERS.filter(p => p.configured());
  if (active.length === 0) {
    return { success: false, answer: null, model: null };
  }

  // Try providers in order (Gemini → Groq → Ollama)
  for (const provider of active) {
    const t = provider.name === 'ollama' ? Math.min(timeout, 25000) : timeout;
    const result = await provider.fn(messages, maxTokens, t);
    if (result?.success && result.answer) {
      callCount++;
      return result;
    }
  }

  return { success: false, answer: null, model: null };
}

export function getAIStats() {
  return {
    total_calls:          callCount,
    configured_providers: PROVIDERS.filter(p => p.configured()).map(p => p.name),
    providers: PROVIDERS.map(p => ({
      name:       p.name,
      configured: p.configured(),
      free_tier:  p.name === 'gemini' ? '15 rpm / 1M tokens/day'
                : p.name === 'groq'   ? '14,400 req/day'
                : 'self-hosted',
    })),
  };
}
