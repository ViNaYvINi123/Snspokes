import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ success:false });
  try {
    const [stats, referrers] = await Promise.all([
      query(`SELECT COUNT(DISTINCT referrer_id) as total_referrers, COUNT(*) as total_referred,
              COUNT(*) FILTER(WHERE converted=true) as total_converted,
              COALESCE(SUM(r.months_earned),0) as total_months
             FROM sn_referral_uses ru JOIN sn_referrals r ON r.id=ru.referral_id`),
      query(`SELECT u.name, u.email, r.code, r.months_earned,
              COUNT(ru.id) as total_referred,
              COUNT(ru.id) FILTER(WHERE ru.converted=true) as total_converted
             FROM sn_referrals r
             JOIN sn_users u ON u.id=r.referrer_id
             LEFT JOIN sn_referral_uses ru ON ru.referral_id=r.id
             GROUP BY u.name,u.email,r.code,r.months_earned
             ORDER BY total_referred DESC LIMIT 50`),
    ]);
    return res.status(200).json({ success:true, stats: stats.rows[0]||{}, referrers: referrers.rows });
  } catch(err) { return res.status(500).json({ success:false, error:err.message }); }
}
export default withAdminAuth(handler);
