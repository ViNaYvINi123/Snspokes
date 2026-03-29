import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Create order
    const { plan_id, user_id } = req.body;
    if (!plan_id || !user_id) return res.status(400).json({ error: 'Plan and user required' });

    try {
      const planResult = await query('SELECT * FROM sn_plans WHERE id = $1 AND is_active = true', [plan_id]);
      if (planResult.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
      const plan = planResult.rows[0];

      // Create Razorpay order
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount: Math.round(plan.price * 100), // paise
        currency: 'INR',
        receipt: `order_${user_id}_${Date.now()}`,
      });

      // Save to DB
      const sub = await query(
        'INSERT INTO sn_subscriptions (user_id, plan_id, razorpay_order_id, status, amount, currency, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id',
        [user_id, plan_id, order.id, 'pending', plan.price, 'INR']
      );

      return res.status(200).json({
        success: true,
        order_id: order.id,
        subscription_id: sub.rows[0].id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        plan: plan,
      });
    } catch (err) {
      console.error('Payment create error:', err);
      return res.status(500).json({ error: 'Failed to create payment order' });
    }
  }

  if (req.method === 'PUT') {
    // Verify payment
    const { subscription_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    try {
      const crypto = require('crypto');
      const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSig !== razorpay_signature) {
        await query('UPDATE sn_subscriptions SET status = $1 WHERE id = $2', ['failed', subscription_id]);
        return res.status(400).json({ error: 'Payment verification failed' });
      }

      // Payment verified - activate subscription
      const subResult = await query('SELECT * FROM sn_subscriptions WHERE id = $1', [subscription_id]);
      const sub = subResult.rows[0];
      const planResult = await query('SELECT * FROM sn_plans WHERE id = $1', [sub.plan_id]);
      const plan = planResult.rows[0];

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await query(
        'UPDATE sn_subscriptions SET status=$1, razorpay_payment_id=$2, razorpay_signature=$3, started_at=NOW(), expires_at=$4, updated_at=NOW() WHERE id=$5',
        ['paid', razorpay_payment_id, razorpay_signature, expiresAt, subscription_id]
      );

      await query('UPDATE sn_users SET plan = $1 WHERE id = $2', [plan.slug, sub.user_id]);

      return res.status(200).json({ success: true, message: 'Payment verified and subscription activated!' });
    } catch (err) {
      console.error('Payment verify error:', err);
      return res.status(500).json({ error: 'Payment verification failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
