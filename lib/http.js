/**
 * Tiny fetch wrapper — replaces axios (saves ~330KB from every admin page bundle)
 * Same API surface: http.get(url), http.post(url, data), http.patch, http.delete
 */

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '');

const req = async (method, url, data, headers = {}) => {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken(), ...headers },
  };
  if (data !== undefined) opts.body = JSON.stringify(data);
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || json.message || `HTTP ${res.status}`);
    err.response = { status: res.status, data: json };
    throw err;
  }
  return { data: json, status: res.status };
};

const http = {
  get:    (url, cfg = {})       => req('GET',    url, undefined, cfg.headers),
  post:   (url, data, cfg = {}) => req('POST',   url, data, cfg.headers),
  put:    (url, data, cfg = {}) => req('PUT',    url, data, cfg.headers),
  patch:  (url, data, cfg = {}) => req('PATCH',  url, data, cfg.headers),
  delete: (url, cfg = {})       => req('DELETE', url, cfg.data, cfg.headers),
  interceptors: { request: { use: () => {} }, response: { use: () => {} } },
};

export default http;
