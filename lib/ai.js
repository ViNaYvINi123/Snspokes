// Direct OpenRouter AI client — with model rotation
// Tries multiple free models to avoid rate limits

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY || '';

// Multiple free models — if one is rate-limited, try next
const FREE_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-32b:free',
  'nvidia/llama-3.1-nemotron-70b-instruct:free',
  'deepseek/deepseek-r1-0528:free',
];

export async function askAI(question, options = {}) {
  const { systemPrompt, history = [], maxTokens = 1500, timeout = 60000 } = options;

  if (!API_KEY) {
    return { success: false, answer: 'OPENROUTER_API_KEY not set in .env.local', model: null };
  }

  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant. Answer directly. Use markdown: ## headers, **bold**, ```code blocks```, - bullets. Be concise.' },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];

  // Try each model until one works
  for (const model of FREE_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json();

      // Rate limited or model unavailable — try next model
      if (data.error) {
        const code = data.error.code || res.status;
        if (code === 429 || code === 404 || code === 503) continue;
        // Other error — return it
        return { success: false, answer: 'AI error: ' + (data.error.message || 'Unknown'), model };
      }

      const answer = data.choices?.[0]?.message?.content;
      if (!answer) continue; // Empty response — try next

      return { success: true, answer, model: data.model || model };
    } catch (err) {
      if (err.name === 'AbortError') continue; // Timeout — try next
      continue; // Any error — try next
    }
  }

  // All models failed
  return { success: false, answer: 'All AI models are currently rate-limited. Free tier allows 50 requests/day. Please try again later or add $1 credit at openrouter.ai/credits for 1000 requests/day.', model: null };
}
