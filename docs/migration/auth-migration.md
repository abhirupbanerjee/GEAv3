# NextAuth v4 to Auth.js v5 Migration Guide

**GEA Portal v3 - Authentication Migration Assessment**

**Document Version:** 1.0
**Created:** February 22, 2026
**Status:** Assessment Complete - Migration Optional
**Current Version:** NextAuth v4.24.13
**Target Version:** Auth.js v5.x (next-auth@5)

---

## Executive Summary

This document provides a comprehensive assessment of migrating the GEA Portal's authentication system from **NextAuth v4** to **Auth.js v5**. The migration is **not urgent** as v4 remains stable and supported, but this guide prepares the team for future migration when/if needed.

### Key Findings

| Metric | Value |
|--------|-------|
| **Migration Complexity** | Moderate-High (6/10) |
| **Files Affected** | ~60 files |
| **Estimated Effort** | 12-20 hours |
| **Risk Level** | Medium |
| **Urgency** | Low - v4 is stable |
| **Recommendation** | Delay migration until compelling need arises |

---

## Table of Contents

1. [Version Timeline & Support Status](#1-version-timeline--support-status)
2. [Current Implementation Analysis](#2-current-implementation-analysis)
3. [Breaking Changes Overview](#3-breaking-changes-overview)
4. [Detailed Migration Requirements](#4-detailed-migration-requirements)
5. [Dependency Impact Assessment](#5-dependency-impact-assessment)
6. [Risk Analysis](#6-risk-analysis)
7. [Migration Strategy](#7-migration-strategy)
8. [Step-by-Step Migration Guide](#8-step-by-step-migration-guide)
9. [Rollback Plan](#9-rollback-plan)
10. [Decision Matrix](#10-decision-matrix)

---

## 1. Version Timeline & Support Status

### NextAuth/Auth.js Version History

| Version | Release Date | Status | Next.js Support |
|---------|--------------|--------|-----------------|
| NextAuth v3.x | 2021 | End of Life | Next.js 10-12 |
| NextAuth v4.0 | Jan 2022 | Stable (Maintenance) | Next.js 12-16 |
| NextAuth v4.24.13 | Oct 2024 | **Current (GEA Portal)** | Next.js 12-16 |
| Auth.js v5.0-beta | Dec 2023 | Beta | Next.js 14+ |
| Auth.js v5.0 | Q1 2025 | Stable | Next.js 14+ |

### Support Timeline

```
2022        2023        2024        2025        2026        2027        2028
  |           |           |           |           |           |           |
  v4.0────────────────────v4.24────────────────────────────────────────────>
  Released                Current     │                                    │
                          GEA Portal  │                                    │
                                      │                                    │
                            ┌─────────┴─────────────────────────────────┐  │
                            │    v4 MAINTENANCE MODE                     │  │
                            │    • Security patches: YES                 │  │
                            │    • New features: NO                      │  │
                            │    • Bug fixes: Critical only              │  │
                            │    • Official EOL: Not announced           │  │
                            └───────────────────────────────────────────┘  │
                                                                           │
  v5.0-beta───v5.0-rc──────v5.0─stable─────────────────────────────────────>
                            Released    │
                            Q1 2025     │
                                        │
                              ┌─────────┴─────────────────────────────────┐
                              │    v5 ACTIVE DEVELOPMENT                   │
                              │    • All new features                      │
                              │    • Edge runtime support                  │
                              │    • Improved TypeScript                   │
                              │    • Framework-agnostic core               │
                              └────────────────────────────────────────────┘
```

### v4 Stabilization Period Assessment

**Official Status:** NextAuth v4 is in **maintenance mode** with no announced end-of-life date.

| Support Type | Status | Notes |
|--------------|--------|-------|
| Security Updates | Active | Critical vulnerabilities will be patched |
| Bug Fixes | Limited | Only critical bugs affecting production |
| New Features | None | All development focused on v5 |
| Documentation | Maintained | Still available at next-auth.js.org |
| Community Support | Active | GitHub discussions still monitored |

**Estimated Safe Usage Period:** NextAuth v4 can be safely used through **2027-2028** based on:
- Large existing user base
- No breaking security issues
- Maintenance mode commitment from Auth.js team
- Similar patterns from other major library migrations (e.g., React Router, Redux)

**Recommendation:** No immediate action required. Plan migration for **Q3-Q4 2026** or when:
- A critical security issue is found in v4
- A required feature is only available in v5
- Next.js removes v4 compatibility

---

## 2. Current Implementation Analysis

### 2.1 Technology Stack

| Component | Current | Migration Target |
|-----------|---------|------------------|
| NextAuth | v4.24.13 | v5.x |
| Next.js | v16.1.2 | v16+ (compatible) |
| React | v18.3.0 | v18+ (compatible) |
| PostgreSQL Adapter | @auth/pg-adapter v1.11.1 | Compatible |
| Node.js | v20+ | Compatible |

### 2.2 Authentication Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GEA Portal Authentication                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────┐         ┌─────────────────────┐              │
│  │   ADMIN/STAFF AUTH  │         │   CITIZEN AUTH      │              │
│  │   (NextAuth v4)     │         │   (Custom/Twilio)   │              │
│  │   ═══════════════   │         │   ═══════════════   │              │
│  │   • Google OAuth    │         │   • Phone OTP       │              │
│  │   • Microsoft OAuth │         │   • Password Login  │              │
│  │   • JWT Sessions    │         │   • Device Trust    │              │
│  │   • Role-Based RBAC │         │   • Custom Sessions │              │
│  │                     │         │                     │              │
│  │   MIGRATION TARGET  │         │   NOT AFFECTED      │              │
│  └─────────────────────┘         └─────────────────────┘              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Files Inventory

#### Core Configuration Files

| File | Purpose | Migration Impact |
|------|---------|------------------|
| `frontend/src/lib/auth.ts` | NextAuth configuration (344 lines) | HIGH - Complete rewrite |
| `frontend/src/app/api/auth/[...nextauth]/route.ts` | API route handler | MEDIUM - Simplification |
| `frontend/src/proxy.ts` | Route protection middleware | MEDIUM - API change |
| `frontend/src/components/providers/SessionProvider.tsx` | Session context | LOW - Minor update |

#### Server-Side Session Usage (51+ files)

All files using `getServerSession(authOptions)` pattern:

```
frontend/src/app/api/admin/**/*.ts          (~30 files)
frontend/src/app/api/managedata/**/*.ts     (~10 files)
frontend/src/app/api/feedback/**/*.ts       (~5 files)
frontend/src/app/api/citizen/**/*.ts        (~5 files)
frontend/src/app/admin/page.tsx             (1 file)
```

#### Client-Side Session Usage (23+ files)

All files using `useSession()` hook:

```
frontend/src/components/layout/Header.tsx
frontend/src/components/layout/Footer.tsx
frontend/src/components/layout/UserProfileDropdown.tsx
frontend/src/components/admin/Sidebar.tsx
frontend/src/components/admin/tickets/*.tsx
frontend/src/app/admin/**/*.tsx
frontend/src/providers/ChatContextProvider.tsx
```

### 2.4 Custom Implementations

#### Callbacks (Complex - Require Careful Migration)

| Callback | Complexity | Description |
|----------|------------|-------------|
| `signIn` | HIGH | Database authorization check, user status update |
| `jwt` | MEDIUM | Token enrichment with role, entity, status |
| `session` | MEDIUM | Custom claims propagation to client |
| `redirect` | LOW | URL validation |
| `events.signIn` | MEDIUM | Audit logging to database |
| `events.signOut` | MEDIUM | Audit logging to database |

#### Type Augmentations

```typescript
// Current v4 type augmentation (frontend/src/lib/auth.ts:306-343)
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
```

---

## 3. Breaking Changes Overview

### 3.1 High Impact Changes

| Change | v4 | v5 | Files Affected |
|--------|----|----|----------------|
| Server Session | `getServerSession(authOptions)` | `auth()` | 51+ API routes |
| Config Location | `lib/auth.ts` exports `authOptions` | `auth.ts` at root exports `{ auth, handlers }` | 2 files + all imports |
| Type Name | `NextAuthOptions` | `NextAuthConfig` | 1 file |
| Route Handler | Manual `NextAuth(authOptions)` | `export { handlers }` | 1 file |

### 3.2 Medium Impact Changes

| Change | v4 | v5 | Files Affected |
|--------|----|----|----------------|
| Middleware | `getToken()` from `next-auth/jwt` | `auth` export as middleware | 1 file |
| Env Variables | `NEXTAUTH_*` prefix | `AUTH_*` prefix (auto-detected) | 2-3 env files |
| Cookie Prefix | `next-auth.*` | `authjs.*` | N/A (automatic) |

### 3.3 Low Impact Changes

| Change | v4 | v5 | Files Affected |
|--------|----|----|----------------|
| Client Hooks | `useSession()` | `useSession()` (same) | 0 (compatible) |
| `signIn/signOut` | Same API | Same API | 0 (compatible) |
| SessionProvider | Same API | Same API | 0 (compatible) |

---

## 4. Detailed Migration Requirements

### 4.1 Configuration File Migration

#### Current v4 Structure
```
frontend/
├── src/
│   ├── lib/
│   │   └── auth.ts              # authOptions export
│   └── app/
│       └── api/
│           └── auth/
│               └── [...nextauth]/
│                   └── route.ts  # NextAuth(authOptions)
```

#### Required v5 Structure
```
frontend/
├── auth.ts                       # NEW: Root-level config
├── auth.config.ts                # NEW: Edge-compatible config (optional)
├── src/
│   ├── lib/
│   │   └── auth.ts              # DEPRECATED or re-export
│   └── app/
│       └── api/
│           └── auth/
│               └── [...nextauth]/
│                   └── route.ts  # export { handlers }
```

#### Code Migration Example

**Before (v4):**
```typescript
// frontend/src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account }) { /* ... */ },
    async jwt({ token, user, trigger }) { /* ... */ },
    async session({ session, token }) { /* ... */ },
  },
  // ...
};

// frontend/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**After (v5):**
```typescript
// frontend/auth.ts (ROOT LEVEL)
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  providers: [
    Google,  // Auto-configured from AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ID,
      clientSecret: process.env.AUTH_MICROSOFT_SECRET,
      tenantId: process.env.AUTH_MICROSOFT_TENANT_ID || 'common',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account }) { /* same logic */ },
    async jwt({ token, user, trigger }) { /* same logic */ },
    async session({ session, token }) { /* same logic */ },
  },
  // ...
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

// frontend/src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

### 4.2 API Route Migration

#### Pattern Change (51+ files)

**Before (v4):**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use session.user.roleType, session.user.entityId, etc.
}
```

**After (v5):**
```typescript
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use session.user.roleType, session.user.entityId, etc.
}
```

### 4.3 Middleware/Proxy Migration

**Before (v4):**
```typescript
// frontend/src/proxy.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*'],
};
```

**After (v5):**
```typescript
// frontend/src/proxy.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const proxy = auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*'],
};
```

### 4.4 Environment Variable Migration

| v4 Variable | v5 Variable | Auto-Detection |
|-------------|-------------|----------------|
| `NEXTAUTH_URL` | `AUTH_URL` | Yes (from request headers) |
| `NEXTAUTH_SECRET` | `AUTH_SECRET` | No (required) |
| `GOOGLE_CLIENT_ID` | `AUTH_GOOGLE_ID` | Yes |
| `GOOGLE_CLIENT_SECRET` | `AUTH_GOOGLE_SECRET` | Yes |
| `MICROSOFT_CLIENT_ID` | `AUTH_MICROSOFT_ID` | No |
| `MICROSOFT_CLIENT_SECRET` | `AUTH_MICROSOFT_SECRET` | No |
| `MICROSOFT_TENANT_ID` | `AUTH_MICROSOFT_TENANT_ID` | No |

**Migration Script:**
```bash
#!/bin/bash
# migrate-env-vars.sh

# Backup original
cp .env .env.v4.backup

# Create v5 compatible version
sed -i 's/NEXTAUTH_URL=/AUTH_URL=/g' .env
sed -i 's/NEXTAUTH_SECRET=/AUTH_SECRET=/g' .env
sed -i 's/GOOGLE_CLIENT_ID=/AUTH_GOOGLE_ID=/g' .env
sed -i 's/GOOGLE_CLIENT_SECRET=/AUTH_GOOGLE_SECRET=/g' .env
sed -i 's/MICROSOFT_CLIENT_ID=/AUTH_MICROSOFT_ID=/g' .env
sed -i 's/MICROSOFT_CLIENT_SECRET=/AUTH_MICROSOFT_SECRET=/g' .env
sed -i 's/MICROSOFT_TENANT_ID=/AUTH_MICROSOFT_TENANT_ID=/g' .env

echo "Environment variables migrated. Original backed up to .env.v4.backup"
```

---

## 5. Dependency Impact Assessment

### 5.1 Direct Dependencies

| Package | Current | v5 Compatible | Action Required |
|---------|---------|---------------|-----------------|
| `next-auth` | ^4.24.13 | Replace | `npm install next-auth@5` |
| `@auth/pg-adapter` | ^1.11.1 | Yes | None |
| `next` | ^16.1.2 | Yes (14+ required) | None |
| `react` | ^18.3.0 | Yes | None |

### 5.2 Indirect Dependencies

No breaking changes expected in indirect dependencies.

### 5.3 Provider Changes

| Provider | v4 Import | v5 Import | Breaking |
|----------|-----------|-----------|----------|
| Google | `next-auth/providers/google` | `next-auth/providers/google` | No |
| Azure AD | `next-auth/providers/azure-ad` | `next-auth/providers/microsoft-entra-id` | **Yes - Renamed** |

**Azure AD Migration:**
```typescript
// v4
import AzureADProvider from 'next-auth/providers/azure-ad';

// v5
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
```

---

## 6. Risk Analysis

### 6.1 Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Session invalidation on deploy | High | Medium | Planned maintenance window, user notification |
| OAuth callback URL mismatch | Medium | High | Update provider consoles before deploy |
| Custom callback breakage | Medium | High | Thorough testing in staging |
| Type errors in build | High | Low | Fix during migration |
| API route failures | Low | High | Automated testing, phased rollout |

### 6.2 Session Invalidation Impact

**Critical:** The cookie prefix change from `next-auth.*` to `authjs.*` means:

- **All existing user sessions will be invalidated**
- Every user will need to sign in again after migration
- No session data migration is possible

**Recommended Approach:**
1. Schedule migration during low-traffic period
2. Send advance notification to users
3. Deploy during maintenance window
4. Monitor sign-in rates post-deploy

### 6.3 Rollback Scenarios

| Scenario | Rollback Complexity | Time to Rollback |
|----------|---------------------|------------------|
| Build failure | Easy | < 5 minutes |
| Runtime errors | Medium | < 15 minutes |
| OAuth failures | Medium | < 30 minutes |
| Data corruption | N/A | Not applicable (stateless auth) |

---

## 7. Migration Strategy

### 7.1 Recommended Approach: Phased Migration

```
Phase 1: Preparation (1-2 days)
├── Create feature branch
├── Update dependencies
├── Create new auth config at root
└── Set up v5-compatible environment variables

Phase 2: Core Migration (2-4 hours)
├── Migrate auth.ts configuration
├── Update API route handler
├── Update type declarations
└── Verify build passes

Phase 3: API Routes (4-6 hours)
├── Batch 1: Admin APIs (~15 files)
├── Batch 2: Managedata APIs (~10 files)
├── Batch 3: Remaining APIs (~10 files)
└── Run linting and type checks after each batch

Phase 4: Client & Middleware (1-2 hours)
├── Update proxy.ts
├── Verify SessionProvider
└── Test client components

Phase 5: Testing (4-8 hours)
├── Local testing all flows
├── Staging deployment
├── OAuth provider testing
├── Load testing
└── Security review

Phase 6: Deployment (2-4 hours)
├── Update OAuth redirect URIs in provider consoles
├── Deploy to production during maintenance window
├── Monitor error rates
└── Verify audit logging
```

### 7.2 Alternative: Big Bang Migration

Not recommended due to:
- High risk of extended downtime
- Difficult to isolate issues
- No partial rollback possible

### 7.3 Migration Decision Timeline

```
Now (Feb 2026)          Q3 2026              Q4 2026              2027
     |                      |                    |                   |
     v                      v                    v                   v
  ┌──────┐            ┌──────────┐         ┌─────────┐        ┌─────────┐
  │ASSESS│            │ PREPARE  │         │ MIGRATE │        │ STABLE  │
  │      │            │ IF NEEDED│         │(Optional)│       │  ON v5  │
  └──────┘            └──────────┘         └─────────┘        └─────────┘
     │                      │                    │                   │
     │ Current              │ Review if:         │ Migrate if:       │
     │ assessment           │ • v5 is stable     │ • Compelling need │
     │ complete             │ • Team available   │ • Team ready      │
     │                      │ • No blockers      │ • Low-risk window │
```

---

## 8. Step-by-Step Migration Guide

### Pre-Migration Checklist

- [ ] Create feature branch: `git checkout -b feature/auth-v5-migration`
- [ ] Backup current `.env` file
- [ ] Document current OAuth redirect URIs
- [ ] Notify team of migration plan
- [ ] Schedule maintenance window (if production)

### Step 1: Update Dependencies

```bash
cd frontend

# Remove v4
npm uninstall next-auth

# Install v5
npm install next-auth@5

# Verify installation
npm list next-auth
```

### Step 2: Create Root Auth Configuration

Create `frontend/auth.ts`:

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { pool } from '@/lib/db';
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_SECRET!,
      tenantId: process.env.AUTH_MICROSOFT_TENANT_ID || 'common',
    }),
  ],

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60, // 2 hours
    updateAge: 30 * 60,   // 30 minutes
  },

  callbacks: {
    async signIn({ user, account }) {
      // Copy existing signIn callback logic from src/lib/auth.ts
      // ... (lines 151-187)
    },

    async jwt({ token, user, trigger }) {
      // Copy existing jwt callback logic from src/lib/auth.ts
      // ... (lines 195-213)
    },

    async session({ session, token }) {
      // Copy existing session callback logic from src/lib/auth.ts
      // ... (lines 221-232)
    },

    async redirect({ url, baseUrl }) {
      // Copy existing redirect callback logic
      // ... (lines 237-245)
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      // Copy existing signIn event logic
      // ... (lines 250-275)
    },
    async signOut({ token }) {
      // Copy existing signOut event logic
      // ... (lines 277-295)
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
```

### Step 3: Update Route Handler

Update `frontend/src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

### Step 4: Update Type Declarations

Update type declarations in `frontend/auth.ts` or create `frontend/auth.d.ts`:

```typescript
import { DefaultSession } from 'next-auth';

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
    } & DefaultSession['user'];
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
```

### Step 5: Migrate API Routes (Batch Process)

Use this script to help identify and migrate files:

```bash
#!/bin/bash
# find-getServerSession-usage.sh

echo "Files using getServerSession:"
grep -r "getServerSession" frontend/src/app/api --include="*.ts" -l

echo ""
echo "Total count:"
grep -r "getServerSession" frontend/src/app/api --include="*.ts" -l | wc -l
```

For each file, apply this transformation:

```typescript
// BEFORE
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const session = await getServerSession(authOptions);

// AFTER
import { auth } from '@/auth';

const session = await auth();
```

### Step 6: Update Proxy/Middleware

Update `frontend/src/proxy.ts`:

```typescript
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const proxy = auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', req.url);
    const requestUrl = new URL(req.url);
    const callbackUrl = requestUrl.pathname + requestUrl.search;
    signInUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*'],
};
```

### Step 7: Update Environment Variables

```bash
# .env migration
AUTH_URL=https://gea.abhirup.app  # was NEXTAUTH_URL
AUTH_SECRET=<your-secret>          # was NEXTAUTH_SECRET
AUTH_GOOGLE_ID=<client-id>         # was GOOGLE_CLIENT_ID
AUTH_GOOGLE_SECRET=<secret>        # was GOOGLE_CLIENT_SECRET
AUTH_MICROSOFT_ID=<client-id>      # was MICROSOFT_CLIENT_ID
AUTH_MICROSOFT_SECRET=<secret>     # was MICROSOFT_CLIENT_SECRET
AUTH_MICROSOFT_TENANT_ID=common    # was MICROSOFT_TENANT_ID
```

### Step 8: Update OAuth Provider Consoles

**Google Cloud Console:**
- Navigate to APIs & Services → Credentials
- Update authorized redirect URI to: `https://gea.abhirup.app/api/auth/callback/google`
- (No change needed if URL structure is the same)

**Azure Portal:**
- Navigate to App registrations → Your App → Authentication
- Verify redirect URI: `https://gea.abhirup.app/api/auth/callback/microsoft-entra-id`
- Note: Callback path may change from `/callback/azure-ad` to `/callback/microsoft-entra-id`

### Step 9: Test Migration

```bash
# Build check
npm run build

# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Run tests
npm run test:run

# Start dev server
npm run dev
```

### Step 10: Deploy

1. Deploy to staging environment first
2. Test all OAuth flows
3. Test admin, staff, and API access
4. Verify audit logging
5. Deploy to production during maintenance window

---

## 9. Rollback Plan

### Immediate Rollback (< 5 minutes)

If issues are detected immediately after deployment:

```bash
# Revert to previous deployment
# (Use your deployment platform's rollback feature)

# Or manually:
git checkout main
git revert HEAD
npm run build
npm run deploy
```

### Environment Rollback

```bash
# Restore v4 environment variables
cp .env.v4.backup .env
```

### OAuth Provider Rollback

If callback URLs were changed:
1. Revert redirect URIs in Google Cloud Console
2. Revert redirect URIs in Azure Portal

### Database Considerations

No database rollback needed - authentication is stateless (JWT).

---

## 10. Decision Matrix

### Should You Migrate Now?

| Factor | Weight | v4 (Stay) | v5 (Migrate) |
|--------|--------|-----------|--------------|
| Stability | High | Proven stable | New, potential bugs |
| Features Needed | Medium | All current needs met | Edge runtime, better TS |
| Team Bandwidth | High | No effort needed | 12-20 hours |
| Risk Tolerance | High | Zero risk | Medium risk |
| Future-Proofing | Low | Eventually deprecated | Long-term supported |

### Recommendation Summary

| Scenario | Recommendation |
|----------|----------------|
| No urgent needs, stable production | **Stay on v4** |
| Need edge runtime support | Consider v5 migration |
| Planning major refactor anyway | Include v5 migration |
| Security vulnerability in v4 | Migrate immediately |
| v4 EOL announced | Plan migration within 6 months |

### Final Recommendation

**For GEA Portal: Stay on NextAuth v4 until Q3-Q4 2026**

Reasons:
1. v4 is stable and meeting all requirements
2. No critical features needed from v5
3. Migration effort (12-20 hours) better spent on features
4. v4 will receive security updates through 2027+
5. v5 ecosystem will mature, making future migration easier

---

## Appendix A: Quick Reference

### Import Changes

| v4 Import | v5 Import |
|-----------|-----------|
| `import { getServerSession } from 'next-auth'` | `import { auth } from '@/auth'` |
| `import { authOptions } from '@/lib/auth'` | N/A (not needed) |
| `import { getToken } from 'next-auth/jwt'` | `import { auth } from '@/auth'` |
| `import NextAuth from 'next-auth'` | `import NextAuth from 'next-auth'` |
| `import type { NextAuthOptions }` | `import type { NextAuthConfig }` |

### Session Access Changes

| Context | v4 | v5 |
|---------|----|----|
| Server Component | `await getServerSession(authOptions)` | `await auth()` |
| API Route | `await getServerSession(authOptions)` | `await auth()` |
| Middleware | `await getToken({ req })` | `auth((req) => { req.auth })` |
| Client Component | `useSession()` | `useSession()` |

---

## Appendix B: Related Documentation

- [Authentication & Authorization Guide](../solution/AUTHENTICATION.md) - Current implementation details
- [API Development Patterns](./API_DEVELOPMENT_PATTERNS.md) - API route conventions
- [Error Handling Patterns](./ERROR_HANDLING_PATTERNS.md) - Error handling standards

## External Resources

- [Auth.js Migration Guide](https://authjs.dev/getting-started/migrating-to-v5) - Official migration documentation
- [NextAuth.js v4 Documentation](https://next-auth.js.org/) - Current v4 docs
- [Auth.js GitHub Discussions](https://github.com/nextauthjs/next-auth/discussions/8487) - v5 discussion thread

---

**Document Maintainer:** GEA Portal Development Team
**Last Review Date:** February 22, 2026
**Next Review Date:** August 2026 (or when v4 EOL announced)
