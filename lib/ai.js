// Direct OpenRouter AI client — fallback when n8n is down
// Zero dependency on n8n — calls OpenRouter API directly

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'openrouter/free';

export async function askAI(question, options = {}) {
  const { systemPrompt, history = [], maxTokens = 1500, timeout = 60000 } = options;

  if (!API_KEY) {
    return { success: false, answer: 'OpenRouter API key not configured. Add OPENROUTER_API_KEY to .env.local', model: null };
  }

  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful AI assistant. Answer the user\'s question directly. Use markdown formatting: ## headers, **bold**, ```code blocks```, - bullets. Be concise but thorough.' },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0.7 }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const data = await res.json();

    if (data.error) {
      return { success: false, answer: 'AI error: ' + (data.error.message || 'Unknown'), model: null };
    }

    const answer = data.choices?.[0]?.message?.content;
    if (!answer) {
      return { success: false, answer: 'AI returned empty response. Try again.', model: data.model };
    }

    return { success: true, answer, model: data.model || MODEL };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, answer: 'AI request timed out. Please try again.', model: null };
    }
    return { success: false, answer: 'AI service error: ' + err.message, model: null };
  }
}
