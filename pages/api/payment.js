import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { query } from '../../lib/db';
import { invalidatePlanCache } from '../../lib/plans';
import { sendPlanUpgradeEmail } from '../../lib/email';
import { verifyRazorpaySignature, verifyRazorpayWebhook, setSecurityHeaders } from '../../lib/security';
import logger from '../../lib/logger';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const PLAN_PRICES = {
  pro:        { amount: 99900,  name: 'snspokes Pro',        period: 'monthly', interval: 1 },
  enterprise: { amount: 499900, name: 'snspokes Enterprise', period: 'monthly', interval: 1 },
};
const ALLOWED_PLANS = ['pro', 'enterprise'];

export default async function handler(req, res) {
  setSecurityHeaders(res);

  // ── Razorpay Webhook ───────────────────────────────────
  if (req.method === 'POST' && req.headers['x-razorpay-signature']) {
    if (!verifyRazorpayWebhook(req.body, req.headers['x-razorpay-signature'])) {
      logger.warn('[security] Invalid Razorpay webhook signature');
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
    const event = req.body?.event;
    if (['subscription.cancelled', 'subscription.completed'].includes(event)) {
      const sub = req.body?.payload?.subscription?.entity;
      if (sub?.notes?.user_id) {
        await query("UPDATE sn_users SET plan='free' WHERE id=$1", [parseInt(sub.notes.user_id)]);
        await query("UPDATE sn_payments SET status='cancelled' WHERE subscription_id=$1", [sub.id]);
      }
    }
    return res.status(200).json({ received: true });
  }

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ success: false, error: 'Authentication required' });
  const uid = session.user.id;

  const { action, plan_id, razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body || {};

  if (action === 'create_subscription') {
    // Whitelist check — prevent privilege escalation
    if (!ALLOWED_PLANS.includes(plan_id)) return res.status(400).json({ success: false, error: 'Invalid plan' });
    try {
      // Prevent double-payment: check if user already has active subscription
      const existing = await query("SELECT id FROM sn_payments WHERE user_id=$1 AND status='active'", [uid]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'You already have an active subscription. Cancel it first to change plans.' });
      }
      const plan = PLAN_PRICES[plan_id];
      const rzPlan = await razorpay.plans.create({ period: plan.period, interval: plan.interval, item: { name: plan.name, amount: plan.amount, currency: 'INR' } });
      const sub = await razorpay.subscriptions.create({ plan_id: rzPlan.id, customer_notify: 1, total_count: 12, notes: { user_id: String(uid), plan: plan_id } });
      await query('INSERT INTO sn_payments (user_id, subscription_id, plan, amount, status, provider) VALUES ($1,$2,$3,$4,$5,$6)',
        [uid, sub.id, plan_id, plan.amount / 100, 'pending', 'razorpay']);
      return res.status(200).json({ success: true, subscription_id: sub.id, checkout_url: sub.short_url, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Payment setup failed' });
    }
  }

  if (action === 'verify') {
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature)
      return res.status(400).json({ success: false, error: 'Missing payment details' });

    // Cryptographic verification — prevents fake payment confirmations
    if (!verifyRazorpaySignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)) {
      logger.warn(`[security] Invalid Razorpay signature from user ${uid}`);
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Get plan from DB — not from request (user can't forge this)
    const r = await query("SELECT plan, user_id FROM sn_payments WHERE subscription_id=$1 AND status='pending'", [razorpay_subscription_id]);
    if (r.rows.length === 0) return res.status(400).json({ success: false, error: 'Payment record not found' });

    // Ownership check
    if (parseInt(r.rows[0].user_id) !== parseInt(uid)) {
      logger.warn(`[security] Payment ownership mismatch: user ${uid}`);
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const plan = r.rows[0].plan;
    if (!ALLOWED_PLANS.includes(plan)) return res.status(400).json({ success: false, error: 'Invalid plan' });

    await query("UPDATE sn_users SET plan=$1 WHERE id=$2", [plan, uid]);
    await invalidatePlanCache(uid); // Clear cached plan so new limits apply immediately
    await query("UPDATE sn_payments SET status='active', payment_id=$1 WHERE subscription_id=$2", [razorpay_payment_id, razorpay_subscription_id]);
    const userR = await query('SELECT email, name FROM sn_users WHERE id=$1', [uid]);
    if (userR.rows[0]) sendPlanUpgradeEmail(userR.rows[0].email, userR.rows[0].name, plan).catch(() => {});
    return res.status(200).json({ success: true, plan });
  }

  if (action === 'cancel') {
    const r = await query("SELECT subscription_id FROM sn_payments WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1", [uid]);
    if (r.rows[0]?.subscription_id) {
      try { await razorpay.subscriptions.cancel(r.rows[0].subscription_id); } catch {}
      await query("UPDATE sn_payments SET status='cancelled' WHERE user_id=$1 AND status='active'", [uid]);
      await query("UPDATE sn_users SET plan='free' WHERE id=$1", [uid]);
      await invalidatePlanCache(uid);
    }
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ success: false, error: 'Unknown action' });
}
export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
