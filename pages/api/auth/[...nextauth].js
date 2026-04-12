import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';
import logger from '../../../lib/logger';

const PLAN_REFRESH_INTERVAL = 5 * 60;

export const authOptions = {
  providers: [
    // Only add Google if credentials are configured
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId:     process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const r = await query(
            'SELECT * FROM sn_users WHERE email=$1 AND is_active=true',
            [credentials.email.toLowerCase().trim()]
          );
          if (!r.rows[0]) return null;
          if (r.rows[0].is_banned) return null;

          const valid = await bcrypt.compare(credentials.password, r.rows[0].password_hash);
          if (!valid) return null;

          await query('UPDATE sn_users SET last_login=NOW() WHERE id=$1', [r.rows[0].id]);

          return {
            id:        String(r.rows[0].id),
            email:     r.rows[0].email,
            name:      r.rows[0].name,
            plan:      r.rows[0].plan || 'free',
            onboarded: r.rows[0].onboarded || false,
            role:      r.rows[0].role || 'user',
          };
        } catch (err) {
          logger.error(`[auth] Login error: ${err.message}`);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const existing = await query('SELECT * FROM sn_users WHERE email=$1', [user.email]);

          if (existing.rows.length === 0) {
            // New Google user — create account
            const newUser = await query(
              `INSERT INTO sn_users (email, name, provider, provider_id, plan, onboarded, is_active, created_at)
               VALUES ($1,$2,$3,$4,'free',false,true,NOW()) RETURNING *`,
              [user.email, user.name, 'google', account.providerAccountId]
            );
            user.id        = String(newUser.rows[0].id);
            user.plan      = 'free';
            user.onboarded = false;
            user.role      = 'user';
          } else {
            const u = existing.rows[0];
            if (u.is_banned) return false;

            await query('UPDATE sn_users SET last_login=NOW(), name=COALESCE($1,name) WHERE email=$2',
              [user.name, user.email]);
            user.id        = String(u.id);
            user.plan      = u.plan || 'free';
            user.onboarded = u.onboarded || false;
            user.role      = u.role || 'user';
          }
        } catch (err) {
          logger.error(`[auth] Google signIn error: ${err.message}`);
          // If provider_id column is missing, try without it
          if (err.message.includes('provider_id')) {
            try {
              await query(`ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS provider_id TEXT`);
              // Retry the insert
              const newUser = await query(
                `INSERT INTO sn_users (email, name, provider, provider_id, plan, onboarded, is_active, created_at)
                 VALUES ($1,$2,$3,$4,'free',false,true,NOW()) RETURNING *`,
                [user.email, user.name, 'google', account.providerAccountId]
              );
              user.id = String(newUser.rows[0].id);
              user.plan = 'free';
              user.onboarded = false;
              user.role = 'user';
            } catch (retryErr) {
              logger.error(`[auth] Google signIn retry failed: ${retryErr.message}`);
              return false;
            }
          } else {
            return false;
          }
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session: sessionUpdate }) {
      // Initial sign in
      if (user) {
        token.id        = user.id;
        token.plan      = user.plan || 'free';
        token.onboarded = user.onboarded || false;
        token.role      = user.role || 'user';
        token.planRefreshed = Math.floor(Date.now() / 1000);
      }

      // Manual session update (plan upgrade, onboarding)
      if (trigger === 'update' && sessionUpdate) {
        if (sessionUpdate.plan !== undefined)      token.plan      = sessionUpdate.plan;
        if (sessionUpdate.onboarded !== undefined)  token.onboarded = sessionUpdate.onboarded;
        token.planRefreshed = Math.floor(Date.now() / 1000);
        return token;
      }

      // Auto-refresh plan from DB every 5 minutes
      const now = Math.floor(Date.now() / 1000);
      if (token.id && (!token.planRefreshed || (now - token.planRefreshed) > PLAN_REFRESH_INTERVAL)) {
        try {
          const r = await query(
            'SELECT plan, onboarded, is_active, role FROM sn_users WHERE id=$1',
            [token.id]
          );
          if (r.rows[0]) {
            if (!r.rows[0].is_active) return { ...token, banned: true };
            token.plan      = r.rows[0].plan || 'free';
            token.onboarded = r.rows[0].onboarded || false;
            token.role      = r.rows[0].role || 'user';
            token.planRefreshed = now;
          }
        } catch (err) {
          logger.warn(`[auth] JWT refresh failed: ${err.message}`);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.banned) return { ...session, error: 'BannedUser' };

      session.user.id        = token.id;
      session.user.plan      = token.plan || 'free';
      session.user.onboarded = token.onboarded || false;
      session.user.role      = token.role || 'user';
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after login
      if (url === baseUrl || url === baseUrl + '/') return baseUrl + '/dashboard';
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + '/dashboard';
    },
  },

  pages:   { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
