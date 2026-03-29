import { withAdminAuth } from '../../../lib/adminAuth';
import { apiError } from '../../../lib/validate';
import fs from 'fs';
import path from 'path';
import { setSecurityHeaders } from '../../../lib/security';

// Path to .env.local on the server
const ENV_PATH = path.join(process.cwd(), '.env.local');

function parseEnv(content) {
  const lines = content.split('\n');
  const vars = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      vars.push({ type: 'comment', raw: line });
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      const isSensitive = /secret|password|key|token|private/i.test(key);
      vars.push({ type: 'var', key, value, raw: line, sensitive: isSensitive });
    }
  }
  return vars;
}

function buildEnv(vars) {
  return vars.map(v => {
    if (v.type === 'comment') return v.raw;
    return `${v.key}=${v.value}`;
  }).join('\n');
}

async function handler(req, res) {
  setSecurityHeaders(res);

  // GET - read env vars
  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(ENV_PATH)) {
        return res.status(200).json({ success: true, vars: [], exists: false });
      }
      const content = fs.readFileSync(ENV_PATH, 'utf8');
      const vars = parseEnv(content);
      // Mask sensitive values
      const safe = vars.map(v => ({
        ...v,
        value: v.sensitive ? '••••••••' : v.value,
        masked: v.sensitive,
      }));
      return res.status(200).json({ success: true, vars: safe, exists: true });
    } catch (err) {
      return apiError(res, 'Failed to read env file', 500, err.message);
    }
  }

  // PUT - update a single env var
  if (req.method === 'PUT') {
    try {
      const { key, value } = req.body;
      if (!key?.trim()) return apiError(res, 'Key required', 400);

      let content = '';
      if (fs.existsSync(ENV_PATH)) {
        content = fs.readFileSync(ENV_PATH, 'utf8');
      }

      const lines = content.split('\n');
      let found = false;
      const updated = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith(`${key}=`) || trimmed === key) {
          found = true;
          return `${key}=${value}`;
        }
        return line;
      });

      if (!found) {
        updated.push(`${key}=${value}`);
      }

      fs.writeFileSync(ENV_PATH, updated.join('\n'), 'utf8');

      // Log audit
      await require('../../../lib/db').query(
        'INSERT INTO sn_audit_logs (actor,action,resource,resource_id,new_value) VALUES ($1,$2,$3,$4,$5)',
        ['admin', 'update_env', 'env_file', key, JSON.stringify({ key, updated: true })]
      ).catch(() => {});

      return res.status(200).json({ success: true, message: `${key} updated. Restart app to apply.` });
    } catch (err) {
      return apiError(res, 'Failed to update env', 500, err.message);
    }
  }

  // POST - add new env var
  if (req.method === 'POST') {
    try {
      const { key, value, comment } = req.body;
      if (!key?.trim()) return apiError(res, 'Key required', 400);

      let content = '';
      if (fs.existsSync(ENV_PATH)) {
        content = fs.readFileSync(ENV_PATH, 'utf8');
      }

      // Check if already exists
      if (content.includes(`${key.trim()}=`)) {
        return apiError(res, 'Key already exists. Use PUT to update.', 409);
      }

      const newLine = comment
        ? `\n# ${comment}\n${key.trim()}=${value || ''}`
        : `\n${key.trim()}=${value || ''}`;

      fs.writeFileSync(ENV_PATH, content + newLine, 'utf8');
      return res.status(201).json({ success: true, message: `${key} added. Restart app to apply.` });
    } catch (err) {
      return apiError(res, 'Failed to add env var', 500, err.message);
    }
  }

  // DELETE - remove env var
  if (req.method === 'DELETE') {
    try {
      const { key } = req.body;
      if (!key?.trim()) return apiError(res, 'Key required', 400);

      if (!fs.existsSync(ENV_PATH)) return apiError(res, '.env.local not found', 404);

      const content = fs.readFileSync(ENV_PATH, 'utf8');
      const lines = content.split('\n').filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith(`${key}=`) && trimmed !== key;
      });

      fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');
      return res.status(200).json({ success: true, message: `${key} removed. Restart app to apply.` });
    } catch (err) {
      return apiError(res, 'Failed to delete env var', 500, err.message);
    }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
