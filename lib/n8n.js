// ============================================================
// snspokes — n8n Integration Client
// - Retry with exponential backoff (3 attempts)
// - Circuit breaker (stops calling if n8n is down)
// - Request deduplication via cache
// - Timeout per endpoint
// ============================================================

import axios from 'axios';
import logger from './logger';
import { cacheGet, cacheSet } from './redis';

const N8N_BASE    = process.env.N8N_URL     || 'http://snspokes_n8n:5678';
const N8N_TIMEOUT = parseInt(process.env.N8N_TIMEOUT || '90000');

// ── Circuit Breaker State ──────────────────────────────────
const circuitBreaker = {
  failures:    0,
  lastFailure: null,
  isOpen:      false,
  THRESHOLD:   5,      // Open after 5 consecutive failures
  RESET_MS:    60000,  // Try again after 60 seconds
};

function isCircuitOpen() {
  if (!circuitBreaker.isOpen) return false;
  // Try resetting after timeout
  if (Date.now() - circuitBreaker.lastFailure > circuitBreaker.RESET_MS) {
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    logger.info('[n8n] Circuit breaker reset — trying again');
    return false;
  }
  return true;
}

function recordFailure() {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= circuitBreaker.THRESHOLD) {
    circuitBreaker.isOpen = true;
    logger.error(`[n8n] Circuit breaker OPEN after ${circuitBreaker.failures} failures`);
  }
}

function recordSuccess() {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
}

// ── Retry with exponential backoff ────────────────────────
async function callWithRetry(url, payload, timeout, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(url, payload, {
        timeout,
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.data?.success === false) throw new Error(res.data?.error || 'n8n returned failure');
      recordSuccess();
      return res.data;
    } catch (err) {
      lastError = err;
      // Don't retry on 4xx errors (bad request — won't change)
      if (err.response?.status >= 400 && err.response?.status < 500) break;
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000); // 1s, 2s, 4s, max 8s
        logger.warn(`[n8n] Attempt ${attempt}/${retries} failed for ${url} — retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  recordFailure();
  throw lastError;
}

// ── Main caller ────────────────────────────────────────────
export async function callN8n(webhookPath, payload = {}, timeout = N8N_TIMEOUT) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockN8n } = await import('../mocks/backend.js');
    return mockN8n.callN8n(webhookPath, payload);
  }

  if (isCircuitOpen()) {
    logger.warn(`[n8n] Circuit open — skipping ${webhookPath}`);
    return { success: false, error: 'n8n temporarily unavailable', circuit_open: true };
  }

  const url = `${N8N_BASE}/webhook/${webhookPath}`;
  try {
    const data = await callWithRetry(url, payload, timeout);
    return { success: true, data };
  } catch (err) {
    logger.warn(`[n8n] ${webhookPath} failed after retries: ${err.message}`);
    return { success: false, error: err.message };
  }
}

export function getCircuitBreakerStatus() {
  return {
    is_open:   circuitBreaker.isOpen,
    failures:  circuitBreaker.failures,
    threshold: circuitBreaker.THRESHOLD,
    last_failure: circuitBreaker.lastFailure
      ? new Date(circuitBreaker.lastFailure).toISOString()
      : null,
  };
}

// ── Specific callers ───────────────────────────────────────
export const n8nSearch       = (q)           => callN8n('sn-search-spokes',   { query: q }, 30000);
export const n8nChatbot      = (q, h = [])   => callN8n('sn-chatbot',         { question: q, history: h }, 90000);
export const n8nGenerateCode = (p, t, c = {})=> callN8n('sn-generate-code',   { prompt: p, code_type: t, config: c }, 90000);
export const n8nLintScript   = (s, t, ai)    => callN8n('sn-lint-script',     { script: s, script_type: t, ai_review: ai }, 60000);
export const n8nAnalyzeError = (msg, ctx)    => callN8n('sn-analyze-error',   { error_message: msg, context: ctx }, 60000);
export const n8nOptimizeQuery = (s, t)       => callN8n('sn-optimize-query',  { script: s, table_name: t }, 60000);
export const n8nAiDebug      = (q, ct, cd)   => callN8n('sn-ai-debug',        { question: q, context_type: ct, context_data: cd }, 90000);
export const n8nEnrichSpoke  = (s, n, c, p, cr, mv) =>
  callN8n('sn-enrich-spoke', { slug: s, name: n, category: c, plugin_id: p, credential_type: cr, min_version: mv }, 120000);
