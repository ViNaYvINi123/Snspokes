import { setSecurityHeaders } from '../../../lib/security';

export default function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.status(200).json({ success: true });
}
