// ============================================================
// snspokes — LLM Client
// - OpenRouter first, Ollama fallback
// - Retry with exponential backoff
// - Response caching
// - Input sanitization (prevent prompt injection)
// - Token estimation to avoid timeouts
// ============================================================

import crypto from 'crypto';
import axios from 'axios';
import { cacheGet, cacheSet } from './redis';
import logger from './logger';

// ── ServiceNow keyword validation ─────────────────────────
const SN_KEYWORDS = [
  'servicenow','snow','spoke','glide','sys_','workflow','flow designer',
  'business rule','client script','script include','integration hub',
  'incident','change request','service catalog','update set','plugin',
  'gliderecord','glideajax','glideform','glideuser','now platform',
  'tokyo','utah','vancouver','washington','xanadu','yokohama',
  'oauth','rest api','soap','webhook','transform map','mid server',
];

export function isServiceNowQuery(q) {
  if (!q || q.length < 3) return false;
  return SN_KEYWORDS.some(kw => q.toLowerCase().includes(kw));
}

export function queryCacheKey(query, prefix = 'llm') {
  const hash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
  return `${prefix}:${hash}`;
}

// Rough token estimator (1 token ≈ 4 chars)
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

// Sanitize input — prevent basic prompt injection
function sanitizePrompt(text, maxLen = 2000) {
  if (!text) return '';
  return text
    .substring(0, maxLen)
    .replace(/ignore previous instructions/gi, '')
    .replace(/you are now/gi, '')
    .replace(/system prompt/gi, '')
    .trim();
}

// ── OpenRouter ─────────────────────────────────────────────
async function callOpenRouter(messages, retries = 2) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-or')) throw new Error('OpenRouter not configured');

  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model, messages, temperature: 0.3, max_tokens: 2000 },
        {
          timeout: 30000,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3001',
            'X-Title': 'snspokes',
          },
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      if (!content) throw new Error('Empty response from OpenRouter');

      // Log token usage if available
      if (response.data?.usage) {
        logger.debug(`[llm] OpenRouter tokens: ${JSON.stringify(response.data.usage)}`);
      }

      return { content, model, provider: 'openrouter' };
    } catch (err) {
      lastError = err;
      // Rate limited — wait before retry
      if (err.response?.status === 429) {
        const retryAfter = parseInt(err.response.headers['retry-after'] || '5') * 1000;
        logger.warn(`[llm] OpenRouter rate limited — waiting ${retryAfter}ms`);
        await new Promise(r => setTimeout(r, retryAfter));
      } else if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

// ── Ollama ─────────────────────────────────────────────────
async function callOllama(messages, retries = 2) {
  const ollamaUrl   = process.env.OLLAMA_URL   || 'http://172.19.0.1:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        `${ollamaUrl}/api/chat`,
        { model: ollamaModel, stream: false, messages, options: { temperature: 0.3, num_predict: 2000 } },
        { timeout: 90000, headers: { 'Content-Type': 'application/json' } }
      );

      const content = response.data?.message?.content || '';
      if (!content) throw new Error('Empty response from Ollama');
      return { content, model: ollamaModel, provider: 'ollama' };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
        logger.warn(`[llm] Ollama attempt ${attempt}/${retries} failed — retrying`);
      }
    }
  }
  throw lastError;
}

// ── Main AI call with caching + fallback ──────────────────
export async function callAI({ messages, cacheKey, cacheTTL = 3600, skipCache = false }) {
  // Check token estimate — avoid sending huge requests
  const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  if (totalTokens > 8000) {
    logger.warn(`[llm] Large request: ~${totalTokens} tokens`);
  }

  // Check cache
  if (cacheKey && !skipCache) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return { ...parsed, cached: true };
      } catch {}
    }
  }

  let result = null;

  // Try OpenRouter first
  try {
    result = await callOpenRouter(messages);
    logger.debug(`[llm] OpenRouter success (${result.model})`);
  } catch (err) {
    logger.warn(`[llm] OpenRouter failed: ${err.message} — falling back to Ollama`);
  }

  // Fallback to Ollama
  if (!result) {
    try {
      result = await callOllama(messages);
      logger.debug(`[llm] Ollama fallback success`);
    } catch (err) {
      logger.error(`[llm] All AI providers failed: ${err.message}`);
      throw new Error('AI service temporarily unavailable. Please try again.');
    }
  }

  // Cache result
  if (cacheKey && result.content) {
    await cacheSet(cacheKey, JSON.stringify({ content: result.content, model: result.model, provider: result.provider }), cacheTTL);
  }

  return { ...result, cached: false };
}

// ── Parse JSON response safely ─────────────────────────────
export function parseAIJson(content, fallback = {}) {
  try {
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : clean);
  } catch {
    return fallback;
  }
}

// ── ServiceNow Search ──────────────────────────────────────
export async function searchServiceNow(query) {
  const sanitizedQuery = sanitizePrompt(query, 500);
  const cacheKey = queryCacheKey(sanitizedQuery, 'snsearch');

  const messages = [
    {
      role: 'system',
      content: `You are an expert ServiceNow Integration Hub assistant. Answer ONLY ServiceNow questions.
Return ONLY this JSON (no markdown):
{"answer":"detailed answer","code_example":"working SN code or null","key_points":["p1","p2"],"manager_explanation":"simple explanation","related_topics":["t1","t2"],"confidence":0.9}`,
    },
    { role: 'user', content: sanitizedQuery },
  ];

  const result = await callAI({ messages, cacheKey, cacheTTL: 7200 });
  const parsed = parseAIJson(result.content, { answer: result.content, key_points: [], related_topics: [], confidence: 0.7 });
  return { ...parsed, cached: result.cached, model: result.model };
}

// ── Spoke Generation ───────────────────────────────────────
export async function generateSpoke(slug) {
  const spokeName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const cacheKey = `spoke:gen:${slug}`;

  const messages = [
    { role: 'system', content: 'You are a ServiceNow expert. Return ONLY valid JSON. No markdown.' },
    {
      role: 'user',
      content: `Generate a ServiceNow Integration Hub spoke reference for: "${spokeName}".
Return ONLY:
{"slug":"${slug}","name":"${spokeName}","description":"2 sentence description","plugin_id":"com.glide.hub.spoke.x","category":"Communication","credential_type":"OAuth 2.0","min_version":"Rome","setup_steps":["step1","step2","step3"],"actions":[{"name":"Action","description":"what it does"}],"common_errors":[{"error":"error msg","fix":"fix"}],"code_example":"// example\\nvar x = 1;","tags":["tag1","tag2"],"related_spokes":["Spoke1"]}`,
    },
  ];

  const result = await callAI({ messages, cacheKey, cacheTTL: 86400 });
  const parsed = parseAIJson(result.content);
  if (!parsed.name) throw new Error('Failed to generate spoke data');
  return { ...parsed, cached: result.cached, model: result.model };
}

// ── Streaming via Ollama ───────────────────────────────────
export async function streamOllama(messages, onChunk, onDone) {
  const ollamaUrl = process.env.OLLAMA_URL   || 'http://172.19.0.1:11434';
  const model     = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  const response = await axios.post(
    `${ollamaUrl}/api/chat`,
    { model, stream: true, messages },
    { timeout: 90000, responseType: 'stream', headers: { 'Content-Type': 'application/json' } }
  );

  let buffer = '';
  return new Promise((resolve, reject) => {
    response.data.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) onChunk(data.message.content);
          if (data.done) { onDone(model); resolve(); }
        } catch {}
      }
    });
    response.data.on('error', reject);
    response.data.on('end', () => { onDone(model); resolve(); });
  });
}
