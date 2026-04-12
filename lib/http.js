/**
 * Tiny fetch wrapper — replaces axios (saves ~330KB from every admin page bundle)
 * Supports: get/post/put/patch/delete, params (query string), headers, data
 */

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '');

const buildUrl = (url, params) => {
  if (!params || typeof params !== 'object' || Object.keys(params).length === 0) return url;
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  ).toString();
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
};

const req = async (method, url, data, cfg = {}) => {
  const finalUrl = buildUrl(url, cfg.params);
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': getToken(),
      ...(cfg.headers || {}),
    },
  };
  if (data !== undefined && data !== null) opts.body = JSON.stringify(data);
  const res = await fetch(finalUrl, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || json.message || `HTTP ${res.status}`);
    err.response = { status: res.status, data: json };
    throw err;
  }
  return { data: json, status: res.status };
};

const http = {
  get:    (url, cfg = {})       => req('GET',    url, undefined, cfg),
  post:   (url, data, cfg = {}) => req('POST',   url, data, cfg),
  put:    (url, data, cfg = {}) => req('PUT',    url, data, cfg),
  patch:  (url, data, cfg = {}) => req('PATCH',  url, data, cfg),
  delete: (url, cfg = {})       => req('DELETE', url, cfg.data, cfg),
  interceptors: { request: { use: () => {} }, response: { use: () => {} } },
};

export default http;
