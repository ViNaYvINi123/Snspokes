// Admin: Bulk spoke operations — import CSV/JSON, feature/pin, draft/publish
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import logger from '../../../lib/logger';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'POST') {
    try {
      const { action } = req.body;

      // Feature/unfeature spoke
      if (action === 'feature') {
        const { slug, featured } = req.body;
        await query('UPDATE sn_spokes SET is_featured=$1 WHERE slug=$2', [featured, slug]);
        return res.status(200).json({ success: true });
      }

      // Pin spoke to top
      if (action === 'pin') {
        const { slug, pin_order } = req.body;
        await query('UPDATE sn_spokes SET pin_order=$1 WHERE slug=$2', [pin_order || 1, slug]);
        return res.status(200).json({ success: true });
      }

      // Draft/publish spoke
      if (action === 'set_status') {
        const { slug, status } = req.body; // 'draft' | 'published' | 'archived'
        const isActive = status === 'published';
        await query('UPDATE sn_spokes SET is_active=$1, status=$2 WHERE slug=$3', [isActive, status, slug]);
        return res.status(200).json({ success: true });
      }

      // Update SEO for a spoke
      if (action === 'update_seo') {
        const { slug, seo_title, seo_description } = req.body;
        await query('UPDATE sn_spokes SET seo_title=$1, seo_description=$2 WHERE slug=$3', [seo_title, seo_description, slug]);
        return res.status(200).json({ success: true });
      }

      // Bulk import spokes from JSON
      if (action === 'bulk_import') {
        const { spokes } = req.body;
        if (!Array.isArray(spokes) || spokes.length === 0)
          return res.status(400).json({ success: false, error: 'spokes array required' });

        let imported = 0, failed = 0;
        for (const s of spokes.slice(0, 500)) { // max 500 at once
          try {
            await query(`
              INSERT INTO sn_spokes (slug, name, description, category, plugin_id, credential_type, min_version, icon, tags, is_active)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
              ON CONFLICT (slug) DO UPDATE SET
                name=EXCLUDED.name, description=EXCLUDED.description,
                category=EXCLUDED.category, plugin_id=EXCLUDED.plugin_id,
                credential_type=EXCLUDED.credential_type, updated_at=NOW()
            `, [s.slug, s.name, s.description, s.category, s.plugin_id, s.credential_type, s.min_version, s.icon || '🔌', JSON.stringify(s.tags || [])]);
            imported++;
          } catch { failed++; }
        }

        logger.info(`[admin] Bulk import: ${imported} spokes imported, ${failed} failed`);
        await query(`INSERT INTO sn_audit_logs (admin, action, target_type, target_id, details) VALUES ('admin','bulk_import','spokes','batch',$1)`,
          [JSON.stringify({ imported, failed, total: spokes.length })]);

        return res.status(200).json({ success: true, imported, failed });
      }

      return res.status(400).json({ success: false, error: 'Invalid action' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
