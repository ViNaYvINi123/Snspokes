import { getServerSession } from 'next-auth';
import { createApiKey, getUserApiKeys, revokeApiKey } from '../../../lib/apiKeys';
import { getUserPlan } from '../../../lib/plans';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'secret');
    const userRes = await query('SELECT id, email, plan FROM sn_users WHERE id=$1', [decoded.id]);
    if (!userRes.rows.length) return res.status(401).json({ error: 'User not found' });
    const user = userRes.rows[0];

    if (req.method === 'GET') {
      const keys = await getUserApiKeys(user.id);
      const plan = await getUserPlan(user.id);
      return res.status(200).json({ success: true, keys, max_keys: plan.api_keys, plan: plan.plan });
    }

    if (req.method === 'POST') {
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Key name required' });
      const plan = await getUserPlan(user.id);
      if (!plan.api_keys || plan.api_keys === 0) {
        return res.status(403).json({ error: 'API keys require Pro plan', upgrade_url: '/pricing' });
      }
      const existing = await getUserApiKeys(user.id);
      if (existing.length >= plan.api_keys) {
        return res.status(403).json({ error: `Limit reached (${plan.api_keys} keys on ${plan.plan})` });
      }
      const result = await createApiKey(user.id, name);
      return res.status(201).json({ success: true, ...result });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await revokeApiKey(user.id, id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
