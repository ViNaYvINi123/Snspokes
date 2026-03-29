import crypto from 'crypto';
import { cacheGet, cacheSet } from './redis';
import axios from 'axios';

// ── ServiceNow keyword validation ──
const SN_KEYWORDS = [
  'servicenow','snow','spoke','glide','sys_','workflow','flow designer',
  'business rule','client script','script include','ui action','ui policy',
  'integration hub','mid server','discovery','cmdb','itil','itsm',
  'incident','change request','problem','service catalog','portal',
  'acl','role','table','sys_id','gr.','gs.','g_form','scoped app',
  'update set','plugin','store app','application','module',
  'tokyo','utah','vancouver','washington','xanadu','yokohama',
  'oauth','rest api','soap','webhook','transform map',
  'gliderecord','glideajax','glideform','glideuser',
  'now platform','instance','tenant','itsm','itom','hrsd','csm',
];

export function isServiceNowQuery(query) {
  const lower = query.toLowerCase();
  // Allow general tech questions that are likely SN context
  if (lower.length < 3) return false;
  return SN_KEYWORDS.some(kw => lower.includes(kw));
}

export function queryCacheKey(query, prefix = 'search') {
  const hash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
  return `${prefix}:${hash}`;
}

// ── Call Ollama directly via HTTP (most reliable on Hetzner) ──
async function callOllama(messages, model = null) {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://172.19.0.1:11434';
  const ollamaModel = model || process.env.OLLAMA_MODEL || 'llama3.2:3b';

  const response = await axios.post(
    `${ollamaUrl}/api/chat`,
    {
      model: ollamaModel,
      stream: false,
      messages,
      options: { temperature: 0.3, num_predict: 2000 },
    },
    { timeout: 90000, headers: { 'Content-Type': 'application/json' } }
  );

  const content = response.data?.message?.content || '';
  if (!content) throw new Error('Empty response from Ollama');
  return { content, model: ollamaModel };
}

// ── Call OpenRouter (if key available) ──
async function callOpenRouter(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'sk-or-v1-your-key-here' || !apiKey.startsWith('sk-or')) {
    throw new Error('OpenRouter not configured');
  }

  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
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
  return { content, model };
}

// ── Main AI call with caching + fallback ──
export async function callAI({ messages, cacheKey, cacheTTL = 3600 }) {
  // Check cache first
  if (cacheKey) {
    const cached = await cacheGet(cacheKey);
    if (cached) return { content: cached.content, cached: true, model: cached.model };
  }

  let result = null;
  let lastError = null;

  // Try OpenRouter first (if configured)
  try {
    result = await callOpenRouter(messages);
  } catch (err) {
    lastError = err.message;
  }

  // Fallback to Ollama
  if (!result) {
    try {
      result = await callOllama(messages);
    } catch (err) {
      lastError = err.message;
      throw new Error(`All AI providers failed. Last error: ${lastError}`);
    }
  }

  // Cache successful result
  if (cacheKey && result.content) {
    await cacheSet(cacheKey, { content: result.content, model: result.model }, cacheTTL);
  }

  return { ...result, cached: false };
}

// ── Search ──
export async function searchServiceNow(query) {
  const cacheKey = queryCacheKey(query, 'search');

  const messages = [
    {
      role: 'system',
      content: `You are an expert ServiceNow Integration Hub assistant. Answer ONLY ServiceNow-related questions.

Return a JSON object with these exact fields:
{
  "answer": "detailed practical answer",
  "code_example": "working ServiceNow code if applicable, else null",
  "key_points": ["point 1", "point 2", "point 3"],
  "manager_explanation": "simple non-technical explanation",
  "related_topics": ["topic 1", "topic 2"],
  "confidence": 0.9
}

Return ONLY the JSON. No markdown, no preamble.`
    },
    { role: 'user', content: query }
  ];

  const result = await callAI({ messages, cacheKey, cacheTTL: 7200 });

  try {
    const clean = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : clean);
    return { ...parsed, cached: result.cached, model: result.model };
  } catch {
    // Return raw answer if JSON parse fails
    return {
      answer: result.content,
      key_points: [],
      related_topics: [],
      confidence: 0.7,
      cached: result.cached,
      model: result.model,
    };
  }
}

// ── Spoke Generation ──
export async function generateSpoke(slug) {
  const spokeName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const cacheKey = `spoke:gen:${slug}`;

  const messages = [
    {
      role: 'system',
      content: 'You are a ServiceNow Integration Hub expert. Return ONLY valid JSON. No markdown backticks, no explanation.'
    },
    {
      role: 'user',
      content: `Generate a complete ServiceNow Integration Hub spoke reference for: "${spokeName}".

Return ONLY this JSON structure:
{
  "slug": "${slug}",
  "name": "${spokeName}",
  "description": "2 sentence description",
  "official_description": "3 sentence technical description",
  "personal_tip": "practical developer tip",
  "ai_description": "beginner-friendly explanation",
  "icon": "single emoji",
  "plugin_id": "com.glide.hub.spoke.name",
  "category": "Communication",
  "credential_type": "OAuth 2.0",
  "min_version": "Rome",
  "setup_steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
  "actions": [
    {"name": "Action Name", "description": "what it does"}
  ],
  "common_errors": [
    {"error": "error message", "fix": "how to fix it"}
  ],
  "code_example": "// ServiceNow script example\nvar spoke = new sn_ih.Action();",
  "tags": ["tag1", "tag2", "tag3"],
  "related_spokes": ["Related Spoke 1", "Related Spoke 2"]
}`
    }
  ];

  const result = await callAI({ messages, cacheKey, cacheTTL: 86400 });

  try {
    const clean = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    return { ...JSON.parse(match ? match[0] : clean), cached: result.cached, model: result.model };
  } catch (err) {
    throw new Error('Failed to parse AI response for spoke: ' + err.message);
  }
}

// ── Streaming via Ollama ──
export async function streamOllama(messages, onChunk, onDone) {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://172.19.0.1:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  const response = await axios.post(
    `${ollamaUrl}/api/chat`,
    { model, stream: true, messages },
    {
      timeout: 90000,
      responseType: 'stream',
      headers: { 'Content-Type': 'application/json' },
    }
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
