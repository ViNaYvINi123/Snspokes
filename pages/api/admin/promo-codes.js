// Admin: Promo codes — discounts, free months, extended trials
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import { invalidatePlanCache } from '../../../lib/plans';
import crypto from 'crypto';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const codes = await query(`
        SELECT p.*, COUNT(u.id) as uses
        FROM sn_promo_codes p
        LEFT JOIN sn_promo_uses u ON u.promo_id = p.id
        GROUP BY p.id ORDER BY p.created_at DESC
      `);
      return res.status(200).json({ success: true, codes: codes.rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action } = req.body;

      // Create promo code
      if (action === 'create') {
        const { code, type, value, max_uses, expires_days, plan_override } = req.body;
        const cleanCode = (code || crypto.randomBytes(4).toString('hex').toUpperCase()).toUpperCase();
        const expiresAt = expires_days ? `NOW() + INTERVAL '${parseInt(expires_days)} days'` : null;
        await query(`
          INSERT INTO sn_promo_codes (code, type, value, max_uses, expires_at, plan_override)
          VALUES ($1,$2,$3,$4,${expiresAt ? "NOW() + ($5 || ' days')::INTERVAL" : 'NULL'},$${expiresAt ? 6 : 5})
        `, expiresAt
          ? [cleanCode, type, parseFloat(value), parseInt(max_uses) || null, expires_days, plan_override || null]
          : [cleanCode, type, parseFloat(value), parseInt(max_uses) || null, plan_override || null]
        );
        return res.status(200).json({ success: true, code: cleanCode });
      }

      // Apply promo to specific user manually
      if (action === 'apply_to_user') {
        const { user_id, code } = req.body;
        const promo = await query("SELECT * FROM sn_promo_codes WHERE code=$1 AND active=true", [code.toUpperCase()]);
        if (!promo.rows[0]) return res.status(400).json({ success: false, error: 'Invalid promo code' });
        const p = promo.rows[0];

        if (p.type === 'free_months') {
          await query(`UPDATE sn_users SET plan_expires_at = COALESCE(plan_expires_at, NOW()) + ($1 || ' months')::INTERVAL WHERE id=$2`, [p.value, user_id]);
        } else if (p.type === 'plan_upgrade') {
          await query('UPDATE sn_users SET plan=$1 WHERE id=$2', [p.plan_override, user_id]);
          await invalidatePlanCache(user_id);
        }
        await query('INSERT INTO sn_promo_uses (promo_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [p.id, user_id]);
        return res.status(200).json({ success: true });
      }

      // Give free months directly
      if (action === 'give_free_months') {
        const { user_id, months } = req.body;
        if (!user_id || !months) return res.status(400).json({ success: false, error: 'user_id and months required' });
        await query(`UPDATE sn_users SET plan_expires_at = COALESCE(plan_expires_at, NOW()) + ($1 || ' months')::INTERVAL WHERE id=$2`, [parseInt(months), user_id]);
        await invalidatePlanCache(user_id);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, error: 'Invalid action' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // DELETE code
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await query('UPDATE sn_promo_codes SET active=false WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
