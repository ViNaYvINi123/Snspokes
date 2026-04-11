/**
 * User activity: saved items, history, recommendations
 * GET  ?action=history&session=xxx   → recent searches
 * GET  ?action=saved&session=xxx     → saved items
 * POST {action:'save', ...}          → save item
 * POST {action:'unsave', ...}        → remove saved
 * POST {action:'track', ...}         → track event
 */
import { query } from '../../lib/db';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  const body   = req.method === 'POST' ? req.body : req.query;
  const action = body.action;
  const session = body.session || body.session_id || '';

  // ── History (recent searches) ─────────────────────────────────────────────
  if (action === 'history') {
    try {
      const r = await query(
        `SELECT DISTINCT ON (query) query, intent, created_at
         FROM sn_user_activity
         WHERE session_id = $1 AND event_type = 'search'
         ORDER BY query, created_at DESC
         LIMIT 10`,
        [session]
      );
      return res.status(200).json({ history: r.rows });
    } catch {
      return res.status(200).json({ history: [] });
    }
  }

  // ── Saved items ───────────────────────────────────────────────────────────
  if (action === 'saved') {
    try {
      const r = await query(
        `SELECT id, entity_type, entity_slug, title, description, metadata, created_at
         FROM sn_saved_items WHERE session_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [session]
      );
      return res.status(200).json({ saved: r.rows });
    } catch {
      return res.status(200).json({ saved: [] });
    }
  }

  // ── Save item ─────────────────────────────────────────────────────────────
  if (action === 'save' && req.method === 'POST') {
    const { entity_type, entity_slug, title, description } = body;
    if (!session || !entity_type || !title) return res.status(400).json({ error: 'Missing fields' });
    try {
      await query(
        `INSERT INTO sn_saved_items (session_id, entity_type, entity_slug, title, description, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (session_id, entity_type, entity_slug) DO NOTHING`,
        [session, entity_type, entity_slug, title, description || '']
      );
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(200).json({ ok: false });
    }
  }

  // ── Unsave ────────────────────────────────────────────────────────────────
  if (action === 'unsave' && req.method === 'POST') {
    const { entity_type, entity_slug } = body;
    try {
      await query(
        `DELETE FROM sn_saved_items WHERE session_id=$1 AND entity_type=$2 AND entity_slug=$3`,
        [session, entity_type, entity_slug]
      );
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(200).json({ ok: false });
    }
  }

  // ── Track event ───────────────────────────────────────────────────────────
  if (action === 'track' && req.method === 'POST') {
    const { event_type, entity_type, entity_slug, query: q, metadata } = body;
    try {
      await query(
        `INSERT INTO sn_user_activity (session_id, event_type, entity_type, entity_slug, query, metadata, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [session, event_type, entity_type || null, entity_slug || null, q || null, JSON.stringify(metadata || {})]
      );
    } catch {}
    return res.status(200).json({ ok: true });
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  if (action === 'recommended') {
    try {
      // Top spokes user hasn't seen but are popular
      const r = await query(
        `SELECT s.name, s.slug, s.icon, s.category, s.description,
                COUNT(a.id) as popularity
         FROM sn_spokes s
         LEFT JOIN sn_user_activity a ON a.entity_slug = s.slug AND a.session_id = $1
         WHERE a.id IS NULL
         GROUP BY s.name, s.slug, s.icon, s.category, s.description
         ORDER BY s.view_count DESC NULLS LAST LIMIT 6`,
        [session]
      );
      return res.status(200).json({ recommended: r.rows });
    } catch {
      return res.status(200).json({ recommended: [] });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
}
