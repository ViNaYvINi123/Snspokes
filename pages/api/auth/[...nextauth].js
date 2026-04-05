import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';
import { sendWelcomeEmail } from '../../../lib/email';
import logger from '../../../lib/logger';

// How often to refresh plan from DB (every 5 min)
const PLAN_REFRESH_INTERVAL = 5 * 60; // seconds

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
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

          // Check if banned
          if (r.rows[0].is_banned) {
            logger.warn(`[auth] Banned user attempted login: ${credentials.email}`);
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, r.rows[0].password_hash);
          if (!valid) return null;

          await query('UPDATE sn_users SET last_login=NOW() WHERE id=$1', [r.rows[0].id]);

          return {
            id:        r.rows[0].id,
            email:     r.rows[0].email,
            name:      r.rows[0].name,
            plan:      r.rows[0].plan,
            onboarded: r.rows[0].onboarded,
            role:      r.rows[0].role,
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
      try {
        if (account?.provider === 'google') {
          const existing = await query('SELECT * FROM sn_users WHERE email=$1', [user.email]);

          if (existing.rows.length === 0) {
            // New OAuth user — create account
            const newUser = await query(
              "INSERT INTO sn_users (email, name, provider, provider_id, plan, onboarded, is_active, created_at) VALUES ($1,$2,$3,$4,'free',false,true,NOW()) RETURNING *",
              [user.email, user.name, account.provider, account.providerAccountId]
            );
            user.id        = newUser.rows[0].id;
            user.plan      = 'free';
            user.onboarded = false;
            user.role      = null;
            sendWelcomeEmail(user.email, user.name).catch(() => {});
          } else {
            const u = existing.rows[0];

            // Block banned users
            if (u.is_banned) {
              logger.warn(`[auth] Banned user OAuth attempt: ${user.email}`);
              return false;
            }

            await query('UPDATE sn_users SET last_login=NOW(), name=$1 WHERE email=$2', [user.name, user.email]);
            user.id        = u.id;
            user.plan      = u.plan;         // Always refresh from DB
            user.onboarded = u.onboarded;
            user.role      = u.role;
          }
        }
      } catch (err) {
        logger.error(`[auth] signIn error: ${err.message}`);
        return false;
      }
      return true;
    },

    async jwt({ token, user, trigger, session: sessionUpdate }) {
      // Initial sign in — set all fields from user
      if (user) {
        token.id            = user.id;
        token.plan          = user.plan;
        token.onboarded     = user.onboarded;
        token.role          = user.role;
        token.planRefreshed = Math.floor(Date.now() / 1000);
      }

      // Manual session update (called after plan upgrade OR onboarding)
      if (trigger === 'update' && sessionUpdate) {
        if (sessionUpdate.plan) token.plan = sessionUpdate.plan;
        if (sessionUpdate.onboarded !== undefined) token.onboarded = sessionUpdate.onboarded;
        token.planRefreshed = Math.floor(Date.now() / 1000);
        return token;
      }

      // Auto-refresh plan from DB every 5 minutes
      const now = Math.floor(Date.now() / 1000);
      const shouldRefresh = !token.planRefreshed || (now - token.planRefreshed) > PLAN_REFRESH_INTERVAL;

      if (token.id && shouldRefresh) {
        try {
          const r = await query(
            'SELECT plan, onboarded, is_active, is_banned, role FROM sn_users WHERE id=$1',
            [token.id]
          );
          if (r.rows[0]) {
            // Force sign out banned users
            if (r.rows[0].is_banned || !r.rows[0].is_active) {
              logger.warn(`[auth] Deactivated/banned user session invalidated: ${token.id}`);
              return { ...token, banned: true };
            }
            token.plan          = r.rows[0].plan;
            token.onboarded     = r.rows[0].onboarded;
            token.role          = r.rows[0].role;
            token.planRefreshed = now;
          }
        } catch (err) {
          logger.warn(`[auth] JWT refresh failed: ${err.message}`);
          // Don't fail — keep existing token
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Pass banned flag to session so client can handle it
      if (token.banned) {
        return { ...session, error: 'BannedUser' };
      }

      session.user.id        = token.id;
      session.user.plan      = token.plan;
      session.user.onboarded = token.onboarded;
      session.user.role      = token.role;
      return session;
    },

    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },

  pages:   { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
