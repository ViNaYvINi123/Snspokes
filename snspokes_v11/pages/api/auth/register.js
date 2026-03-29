import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  try {
    const existing = await query('SELECT id FROM sn_users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Account already exists with this email' });
    const hash = await bcrypt.hash(password, 12);
    const result = await query('INSERT INTO sn_users (name, email, password_hash, provider, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email', [name.trim(), email.toLowerCase(), hash, 'credentials']);
    return res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
}
