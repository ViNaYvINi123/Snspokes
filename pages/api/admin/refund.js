// Admin: Manual refund processing
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import { invalidatePlanCache } from '../../../lib/plans';
import logger from '../../../lib/logger';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'POST') {
    try {
      const { payment_id, user_id, reason, amount } = req.body;
      if (!payment_id || !user_id) return res.status(400).json({ success: false, error: 'payment_id and user_id required' });

      // Process refund via Razorpay
      let razorpayRefund = null;
      try {
        razorpayRefund = await razorpay.payments.refund(payment_id, {
          amount: amount ? parseInt(amount) * 100 : undefined, // partial refund support
          notes: { reason: reason || 'Admin refund', refunded_by: 'admin' },
        });
      } catch (err) {
        logger.warn(`[admin/refund] Razorpay refund failed: ${err.message} — recording manual refund`);
      }

      // Update DB
      await query(
        "UPDATE sn_payments SET status='refunded', refund_reason=$1 WHERE payment_id=$2",
        [reason || 'Admin refund', payment_id]
      );

      // Downgrade user to free
      await query("UPDATE sn_users SET plan='free' WHERE id=$1", [user_id]);
      await invalidatePlanCache(user_id);

      // Audit log
      await query(`INSERT INTO sn_audit_logs (admin, action, target_type, target_id, details) VALUES ('admin','refund','payment',$1,$2)`,
        [payment_id, JSON.stringify({ user_id, reason, razorpay_refund_id: razorpayRefund?.id })]);

      logger.info(`[admin] Refund processed for payment ${payment_id}, user ${user_id}`);
      return res.status(200).json({ success: true, refund_id: razorpayRefund?.id });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
