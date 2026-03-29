import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) throw new Error('Email and password required');
        const result = await query('SELECT * FROM sn_users WHERE email = $1', [credentials.email.toLowerCase()]);
        if (result.rows.length === 0) throw new Error('No account found with this email');
        const user = result.rows[0];
        if (!user.password_hash) throw new Error('Please sign in with Google');
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) throw new Error('Incorrect password');
        await query('UPDATE sn_users SET last_login = NOW() WHERE id = $1', [user.id]);
        return { id: user.id, name: user.name, email: user.email, image: user.avatar_url };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const existing = await query('SELECT id FROM sn_users WHERE email = $1', [user.email.toLowerCase()]);
          if (existing.rows.length === 0) {
            await query('INSERT INTO sn_users (name, email, avatar_url, provider, created_at) VALUES ($1, $2, $3, $4, NOW())', [user.name, user.email.toLowerCase(), user.image, 'google']);
          } else {
            await query('UPDATE sn_users SET last_login = NOW() WHERE email = $1', [user.email.toLowerCase()]);
          }
        } catch (e) { console.error('Google signin error:', e); return false; }
      }
      return true;
    },
    async session({ session }) {
      if (session?.user?.email) {
        try {
          const result = await query('SELECT id FROM sn_users WHERE email = $1', [session.user.email.toLowerCase()]);
          if (result.rows.length > 0) session.user.id = result.rows[0].id;
        } catch (e) {}
      }
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET || 'snspokes-secret-key-change-in-production',
};

export default NextAuth(authOptions);
