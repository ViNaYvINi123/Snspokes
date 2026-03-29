// Dynamic API Execution Engine
// Executes external API calls based on connector + endpoint config

import axios from 'axios';
import { query } from './db';
import { decrypt } from './crypto';
import { cacheGet, cacheSet } from './redis';
import logger from './logger';

// Build auth headers from connector config
function buildAuthHeaders(authType, authConfig) {
  const config = authConfig || {};
  switch (authType) {
    case 'api_key':
      const { header_name = 'X-API-Key', api_key } = config;
      return { [header_name]: decrypt(api_key || '') };
    case 'bearer':
      return { Authorization: `Bearer ${decrypt(config.token || '')}` };
    case 'basic':
      const creds = Buffer.from(`${config.username}:${decrypt(config.password || '')}`).toString('base64');
      return { Authorization: `Basic ${creds}` };
    case 'oauth2':
      return { Authorization: `Bearer ${decrypt(config.access_token || '')}` };
    default:
      return {};
  }
}

// Transform response using mapping rules
function transformResponse(data, mappingRules) {
  if (!mappingRules || Object.keys(mappingRules).length === 0) return data;
  try {
    const result = {};
    for (const [targetKey, sourcePath] of Object.entries(mappingRules)) {
      const keys = sourcePath.split('.');
      let value = data;
      for (const key of keys) {
        value = value?.[key];
      }
      result[targetKey] = value;
    }
    return result;
  } catch {
    return data;
  }
}

// Main execution function
export async function executeAPI({
  connectorId,
  endpointId = null,
  method = 'GET',
  path = '/',
  params = {},
  body = null,
  customHeaders = {},
  triggeredBy = 'manual',
}) {
  const startTime = Date.now();
  let connector, endpoint, cacheKey, responseData;

  try {
    // Load connector
    const connRes = await query('SELECT * FROM sn_api_connectors WHERE id=$1 AND is_active=true', [connectorId]);
    if (connRes.rows.length === 0) throw new Error('Connector not found or inactive');
    connector = connRes.rows[0];

    // Load endpoint if provided
    if (endpointId) {
      const epRes = await query('SELECT * FROM sn_api_endpoints WHERE id=$1 AND is_active=true', [endpointId]);
      if (epRes.rows.length > 0) {
        endpoint = epRes.rows[0];
        path = endpoint.path;
        method = endpoint.method;
      }
    }

    // Check cache
    if (endpoint?.cache_ttl > 0) {
      cacheKey = `api_exec:${connectorId}:${endpointId}:${JSON.stringify(params)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return { ...cached, cached: true, duration_ms: 0 };
      }
    }

    // Build request
    const authHeaders = buildAuthHeaders(connector.auth_type, connector.auth_config);
    const defaultHeaders = connector.default_headers || {};
    const fullUrl = connector.base_url.replace(/\/$/, '') + path;

    const requestConfig = {
      method: method.toLowerCase(),
      url: fullUrl,
      timeout: connector.timeout_ms || 10000,
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, ...authHeaders, ...customHeaders },
      params: method === 'GET' ? params : undefined,
      data: method !== 'GET' ? (body || params) : undefined,
      validateStatus: () => true, // Don't throw on 4xx/5xx
    };

    logger.debug(`[APIEngine] ${method} ${fullUrl}`);
    const response = await axios(requestConfig);
    const duration = Date.now() - startTime;

    // Transform response
    let transformed = response.data;
    if (endpoint?.response_map && Object.keys(endpoint.response_map).length > 0) {
      transformed = transformResponse(response.data, endpoint.response_map);
    }

    responseData = {
      success: response.status < 400,
      status_code: response.status,
      data: transformed,
      raw: response.data,
      duration_ms: duration,
      cached: false,
    };

    // Cache if configured
    if (endpoint?.cache_ttl > 0 && response.status < 400 && cacheKey) {
      await cacheSet(cacheKey, responseData, endpoint.cache_ttl);
    }

    // Log execution (async)
    logExecution({
      connector_id: connectorId,
      endpoint_id: endpointId,
      method,
      url: fullUrl,
      status_code: response.status,
      duration_ms: duration,
      request_data: { params, body },
      response_data: { status: response.status, data: response.data },
      triggered_by: triggeredBy,
    }).catch(() => {});

    return responseData;

  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(`[APIEngine] Error: ${err.message}`);

    // Log failed execution
    if (connector) {
      logExecution({
        connector_id: connectorId,
        endpoint_id: endpointId,
        method,
        url: connector ? connector.base_url + path : path,
        status_code: err.response?.status || 0,
        duration_ms: duration,
        request_data: { params, body },
        error_msg: err.message,
        triggered_by: triggeredBy,
      }).catch(() => {});
    }

    return {
      success: false,
      status_code: err.response?.status || 0,
      error: err.message,
      duration_ms: duration,
      cached: false,
    };
  }
}

async function logExecution(data) {
  try {
    await query(
      `INSERT INTO sn_api_exec_logs (connector_id, endpoint_id, method, url, status_code, duration_ms, request_data, response_data, error_msg, triggered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [data.connector_id, data.endpoint_id || null, data.method, data.url, data.status_code,
       data.duration_ms, JSON.stringify(data.request_data), JSON.stringify(data.response_data || {}),
       data.error_msg || null, data.triggered_by]
    );
  } catch {}
}

// Get connector stats
export async function getConnectorStats(connectorId, hours = 24) {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as total_calls,
        AVG(duration_ms)::int as avg_ms,
        MAX(duration_ms) as max_ms,
        COUNT(CASE WHEN status_code >= 400 OR error_msg IS NOT NULL THEN 1 END) as errors,
        COUNT(CASE WHEN status_code < 400 AND error_msg IS NULL THEN 1 END) as success,
        MAX(created_at) as last_called
       FROM sn_api_exec_logs
       WHERE connector_id=$1 AND created_at > NOW() - INTERVAL '${hours} hours'`,
      [connectorId]
    );
    const stats = result.rows[0];
    return {
      ...stats,
      error_rate: stats.total_calls > 0 ? ((stats.errors / stats.total_calls) * 100).toFixed(1) + '%' : '0%',
    };
  } catch {
    return {};
  }
}
