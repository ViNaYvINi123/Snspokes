import logger from '../../../lib/logger';
import { setSecurityHeaders } from '../../../lib/security';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/db';
import { sendWelcomeEmail } from '../../../lib/email';
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
  setSecurityHeaders(res);
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Login required' });
  const uid = session.user.id;

  if (req.method === 'GET') {
    // Get or create referral code
    let r = await query('SELECT * FROM sn_referrals WHERE referrer_id=$1', [uid]);
    if (r.rows.length === 0) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      r = await query('INSERT INTO sn_referrals (referrer_id, code) VALUES ($1,$2) RETURNING *', [uid, code]);
    }
    const ref = r.rows[0];
    const stats = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE converted=true) as converted FROM sn_referral_uses WHERE referral_id=$1', [ref.id]);
    return res.status(200).json({
      success: true,
      code: ref.code,
      referral_url: `${process.env.NEXTAUTH_URL}/register?ref=${ref.code}`,
      stats: { total: parseInt(stats.rows[0].total), converted: parseInt(stats.rows[0].converted) },
      months_earned: ref.months_earned || 0,
    });
  }

  if (req.method === 'POST' && req.body.action === 'apply') {
    // Apply referral code at signup (called from register API)
    const { code, new_user_id } = req.body;
    const ref = await query('SELECT * FROM sn_referrals WHERE code=$1', [code.toUpperCase()]);
    if (!ref.rows[0]) return res.status(404).json({ error: 'Invalid referral code' });
    await query('INSERT INTO sn_referral_uses (referral_id, referred_user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ref.rows[0].id, new_user_id]);
    return res.status(200).json({ success: true, referrer_id: ref.rows[0].referrer_id });
  }

  if (req.method === 'POST' && req.body.action === 'convert') {
    // Called when referred user upgrades to Pro
    const { referred_user_id } = req.body;
    const use = await query('UPDATE sn_referral_uses SET converted=true WHERE referred_user_id=$1 AND converted=false RETURNING *', [referred_user_id]);
    if (use.rows[0]) {
      const ref = await query('SELECT * FROM sn_referrals WHERE id=$1', [use.rows[0].referral_id]);
      if (ref.rows[0]) {
        // Give referrer 1 free month
        await query('UPDATE sn_referrals SET months_earned=months_earned+1 WHERE id=$1', [ref.rows[0].id]);
        await query('UPDATE sn_users SET plan_expires_at=COALESCE(plan_expires_at,NOW()) + INTERVAL \'1 month\' WHERE id=$1', [ref.rows[0].referrer_id]);
      }
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
  } catch (err) {
    logger.error(`[handler] ${err.message}`);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
