// AI client — tries OpenRouter free models, then local Ollama
// Chain: OpenRouter (5 models) → Ollama (local, unlimited, free)

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

// Free OpenRouter models — rotate to avoid rate limits
const FREE_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-32b:free',
  'nvidia/llama-3.1-nemotron-70b-instruct:free',
  'deepseek/deepseek-r1-0528:free',
];

// Try OpenRouter with model rotation
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
        const code = data.error.code || res.status;
        if (code === 429 || code === 404 || code === 503) continue; // Try next model
        return { success: false, answer: 'AI error: ' + (data.error.message || 'Unknown'), model };
      }

      const answer = data.choices?.[0]?.message?.content;
      if (!answer) continue;

      return { success: true, answer, model: data.model || model };
    } catch {
      continue;
    }
  }
  return null; // All OpenRouter models failed
}

// Try local Ollama (unlimited, free, no rate limits)
async function tryOllama(messages, maxTokens, timeout) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(OLLAMA_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { num_predict: maxTokens, temperature: 0.7 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const data = await res.json();
    const answer = data.message?.content;
    if (!answer) return null;

    return { success: true, answer, model: OLLAMA_MODEL + ' (local)' };
  } catch {
    return null; // Ollama not running
  }
}

// Main function — tries everything in order
export async function askAI(question, options = {}) {
  const { systemPrompt, history = [], maxTokens = 1500, timeout = 60000 } = options;

  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant. Answer directly. Use markdown: ## headers, **bold**, ```code blocks```, - bullets. Be concise.' },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];

  // 1. Try OpenRouter (cloud, free models)
  const orResult = await tryOpenRouter(messages, maxTokens, timeout);
  if (orResult) return orResult;

  // 2. Try Ollama (local, unlimited)
  const ollamaResult = await tryOllama(messages, maxTokens, Math.min(timeout, 30000));
  if (ollamaResult) return ollamaResult;

  // 3. Everything failed
  return {
    success: false,
    answer: 'All AI models are temporarily unavailable.\n\n**OpenRouter:** Free daily limit reached (resets tomorrow)\n**Ollama:** Not running locally\n\n**To fix:**\n- Wait for daily reset, or\n- Add $1 credit at openrouter.ai/credits (unlocks 1000/day), or\n- Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3.1:8b`',
    model: null,
  };
}
