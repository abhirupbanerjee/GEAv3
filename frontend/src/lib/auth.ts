/**
 * GEA Portal - NextAuth Configuration
 *
 * This file configures NextAuth.js for OAuth authentication with
 * database-backed authorization for the GEA Portal.
 *
 * Features:
 * - Google OAuth 2.0 authentication
 * - Microsoft Entra ID (Azure AD) authentication
 * - PostgreSQL-backed user management
 * - Role-based access control (Admin, Staff, Public)
 * - Entity-based data filtering for staff users
 * - JWT session strategy with 2-hour timeout
 *
 * Architecture:
 * - Uses @auth/pg-adapter for database integration
 * - Custom signIn callback checks email whitelist in users table
 * - JWT callback enriches token with role and entity data
 * - Session callback makes enriched data available to client
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { pool } from '@/lib/db';

// ============================================================================
// AUTHORIZATION HELPER FUNCTION
// ============================================================================

/**
 * Checks if a user email is authorized to access the system
 *
 * @param email - User's email from OAuth provider
 * @returns Authorization status with user details
 */
async function isUserAuthorized(email: string): Promise<{
  authorized: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    roleId: number;
    roleCode: string;
    roleType: string;
    entityId: string | null;
    isActive: boolean;
  };
  error?: string;
}> {
  try {
    const result = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.name,
        u.role_id,
        r.role_code,
        r.role_type,
        u.entity_id,
        u.is_active
      FROM users u
      JOIN user_roles r ON u.role_id = r.role_id
      WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return {
        authorized: false,
        error: 'Email not authorized. Please contact your administrator.',
      };
    }

    const user = result.rows[0];

    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.role_id,
        roleCode: user.role_code,
        roleType: user.role_type,
        entityId: user.entity_id,
        isActive: user.is_active,
      },
    };
  } catch (error) {
    console.error('Error checking user authorization:', error);
    return {
      authorized: false,
      error: 'Authorization check failed. Please try again.',
    };
  }
}

// ============================================================================
// NEXTAUTH CONFIGURATION
// ============================================================================

export const authOptions: NextAuthOptions = {
  // OAuth providers configuration
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    }),
  ],

  // Custom pages
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60, // 2 hours
    updateAge: 30 * 60, // Update session every 30 minutes
  },

  // JWT configuration
  jwt: {
    maxAge: 2 * 60 * 60, // 2 hours
  },

  // Callbacks for custom logic
  callbacks: {
    /**
     * SignIn callback - Check if user is authorized
     *
     * This is called after successful OAuth authentication but before
     * creating a session. We check if the user's email exists in our
     * users table and is active.
     */
    async signIn({ user, account, profile }) {
      const email = user.email;
      const name = user.name;
      const image = user.image;

      if (!email) {
        console.error('No email provided by OAuth provider');
        return false;
      }

      // Check if user is authorized
      const authCheck = await isUserAuthorized(email);

      if (!authCheck.authorized) {
        console.log(`Unauthorized sign-in attempt: ${email}`);
        // Redirect to unauthorized page with error message
        return `/auth/unauthorized?error=${encodeURIComponent(authCheck.error || 'not_authorized')}`;
      }

      // Update user's name and image from OAuth provider if they've changed
      try {
        await pool.query(
          `UPDATE users
           SET name = COALESCE($1, name),
               image = COALESCE($2, image),
               last_login = CURRENT_TIMESTAMP,
               email_verified = CURRENT_TIMESTAMP
           WHERE email = $3`,
          [name, image, email]
        );
      } catch (error) {
        console.error('Error updating user profile:', error);
      }

      console.log(`Authorized sign-in: ${email} (${authCheck.user?.roleCode})`);
      return true;
    },

    /**
     * JWT callback - Add custom claims to the token
     *
     * This enriches the JWT token with user role and entity data
     * from our database. This data will be available in the session.
     */
    async jwt({ token, user, account, trigger }) {
      // Initial sign in OR session update (when updateSession() is called)
      const email = user?.email || (token?.email as string | undefined);

      if (email && (user || trigger === 'update')) {
        const authCheck = await isUserAuthorized(email);

        if (authCheck.authorized && authCheck.user) {
          token.id = authCheck.user.id;
          token.roleId = authCheck.user.roleId;
          token.roleCode = authCheck.user.roleCode;
          token.roleType = authCheck.user.roleType;
          token.entityId = authCheck.user.entityId;
          token.isActive = authCheck.user.isActive;
        }
      }

      return token;
    },

    /**
     * Session callback - Add custom claims to the session
     *
     * This makes the enriched JWT data available to the client-side
     * session object via useSession() hook.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roleId = token.roleId as number;
        session.user.roleCode = token.roleCode as string;
        session.user.roleType = token.roleType as string;
        session.user.entityId = token.entityId as string | null;
        session.user.isActive = token.isActive as boolean;
      }

      return session;
    },

    /**
     * Redirect callback - Control post-login redirects
     */
    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;

      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;

      return baseUrl;
    },
  },

  // Events for logging and audit
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email} (provider: ${account?.provider})`);

      // Log sign-in event to audit log
      try {
        await pool.query(
          `INSERT INTO user_audit_log (user_id, action, resource_type, new_value, created_at)
           VALUES (
             (SELECT id FROM users WHERE email = $1),
             'user_signin',
             'authentication',
             $2,
             CURRENT_TIMESTAMP
           )`,
          [
            user.email,
            JSON.stringify({
              provider: account?.provider,
              isNewUser,
            }),
          ]
        );
      } catch (error) {
        console.error('Error logging sign-in event:', error);
      }
    },

    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);

      // Log sign-out event to audit log
      try {
        await pool.query(
          `INSERT INTO user_audit_log (user_id, action, resource_type, created_at)
           VALUES (
             (SELECT id FROM users WHERE email = $1),
             'user_signout',
             'authentication',
             CURRENT_TIMESTAMP
           )`,
          [token?.email]
        );
      } catch (error) {
        console.error('Error logging sign-out event:', error);
      }
    },
  },

  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
};

// ============================================================================
// TYPE AUGMENTATION FOR NEXTAUTH
// ============================================================================

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      roleId: number;
      roleCode: string;
      roleType: string;
      entityId: string | null;
      isActive: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    roleId?: number;
    roleCode?: string;
    roleType?: string;
    entityId?: string | null;
    isActive?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    roleId?: number;
    roleCode?: string;
    roleType?: string;
    entityId?: string | null;
    isActive?: boolean;
  }
}
