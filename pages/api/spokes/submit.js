import { query } from '../../../lib/db';
import { callN8n } from '../../../lib/n8n';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { sanitizeString, setSecurityHeaders, getClientIp } from '../../../lib/security';
import { checkRateLimit } from '../../../lib/redis';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ success: false, error: 'Login required to submit a spoke' });

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Rate limit: 3 per hour per IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`spoke_submit:${ip}`, 3, 3600);
  if (!rl.allowed) return res.status(429).json({ success: false, error: 'Too many submissions. Try again later.' });

  const { name, plugin_id, description, category, credential_type, min_version, use_cases, store_url, submitter_notes, submitted_by } = req.body || {};

  const cleanName        = sanitizeString(name, 255);
  const cleanPluginId    = sanitizeString(plugin_id, 255);
  const cleanDescription = sanitizeString(description, 2000);
  const cleanCategory    = sanitizeString(category, 100);

  if (!cleanName)                     return res.status(400).json({ success: false, error: 'Name required' });
  if (!cleanPluginId)                 return res.status(400).json({ success: false, error: 'Plugin ID required' });
  if (!cleanCategory)                 return res.status(400).json({ success: false, error: 'Category required' });
  if (cleanDescription.length < 30)  return res.status(400).json({ success: false, error: 'Description too short (min 30 chars)' });
  if (!/^[a-z][a-z0-9_.]{2,100}$/.test(cleanPluginId))
    return res.status(400).json({ success: false, error: 'Invalid Plugin ID format' });

  const cleanStoreUrl = store_url ? sanitizeString(store_url, 500) : null;
  if (cleanStoreUrl && !/^https?:\/\/.+/.test(cleanStoreUrl))
    return res.status(400).json({ success: false, error: 'Invalid store URL' });

  const existing = await query("SELECT id FROM sn_spoke_submissions WHERE plugin_id=$1 AND status='pending'", [cleanPluginId]);
  if (existing.rows.length > 0) return res.status(400).json({ success: false, error: 'Plugin ID already pending review' });

  await query(
    `INSERT INTO sn_spoke_submissions (name, plugin_id, description, category, credential_type, min_version, use_cases, store_url, submitter_notes, submitted_by, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')`,
    [cleanName, cleanPluginId, cleanDescription, cleanCategory, sanitizeString(credential_type,100)||null, sanitizeString(min_version,50)||null, sanitizeString(use_cases,1000)||null, cleanStoreUrl, sanitizeString(submitter_notes,500)||null, sanitizeString(submitted_by,255)||null]
  );
  callN8n('sn-notify-admin', { type: 'spoke_submission', name: cleanName }).catch(() => {});
  return res.status(200).json({ success: true });
}
