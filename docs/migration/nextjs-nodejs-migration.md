# Next.js, React & Node.js Migration Guide

**GEA Portal v3 - Frontend Runtime Assessment**

**Document Version:** 1.2
**Created:** February 22, 2026
**Updated:** February 22, 2026
**Status:** Next.js Security Patch Applied - React Upgrade Recommended
**Current Next.js:** 16.1.6 ✅ (Updated Feb 22, 2026)
**Current React:** 18.3.0
**Current Node.js:** 22-alpine

---

## Executive Summary

This document provides a comprehensive assessment of the GEA Portal's Next.js, React, and Node.js infrastructure, including version timelines, upgrade paths, and migration strategies.

### Key Findings

| Component | Current Version | Latest Stable | EOL/Status | Assessment |
|-----------|-----------------|---------------|------------|------------|
| **Next.js** | 16.1.6 ✅ | 16.1.6 | ~Oct 2027 | Up to date |
| **React** | 18.3.0 | 19.2.4 | Security only | **Upgrade recommended** |
| **Node.js** | 22-alpine | 24.x | Apr 2027 | Well positioned |

### Recommendation Summary

| Component | Urgency | Action |
|-----------|---------|--------|
| Next.js 16.1.6 | ✅ Done | Security patch applied Feb 22, 2026 |
| React 18.3.0 → 19.x | **Medium** | Recommended upgrade Q1-Q2 2026 |
| Node.js 22 → 24 | Low | Optional upgrade Q4 2026 |

### Security Alerts

**Next.js CVEs (all versions 13.x-16.x):**
- **CVE-2025-55184** (High) - DoS in React Server Components
- **CVE-2025-55183** (Medium) - Source Code Exposure

**React 18 Status:** Security patches only - active development moved to React 19

**Action Required:** ~~Update Next.js to 16.1.6 immediately.~~ ✅ Done. Plan React 19 migration.

---

## Table of Contents

1. [Next.js Version Timeline](#1-nextjs-version-timeline)
2. [Current Next.js Implementation](#2-current-nextjs-implementation)
3. [Next.js Upgrade Assessment](#3-nextjs-upgrade-assessment)
4. [React Version Timeline](#4-react-version-timeline)
5. [Current React Implementation](#5-current-react-implementation)
6. [React Upgrade Assessment (18 → 19)](#6-react-upgrade-assessment-18--19)
7. [Node.js Version Timeline](#7-nodejs-version-timeline)
8. [Current Node.js Implementation](#8-current-nodejs-implementation)
9. [Node.js Upgrade Assessment](#9-nodejs-upgrade-assessment)
10. [Security Considerations](#10-security-considerations)
11. [Migration Strategies](#11-migration-strategies)
12. [Step-by-Step Upgrade Guide](#12-step-by-step-upgrade-guide)
13. [Risk Analysis](#13-risk-analysis)
14. [Decision Matrix](#14-decision-matrix)

---

## 1. Next.js Version Timeline

### Official Support Policy

Next.js follows semantic versioning with major releases approximately twice yearly. Security patches are backported to supported versions.

### Version EOL Schedule

| Version | Released | EOL Date | Latest Patch | Status |
|---------|----------|----------|--------------|--------|
| **16** (LTS) | Oct 2025 | ~Oct 2027 | **16.1.6** | **Active (Current)** |
| 15 (LTS) | Oct 2024 | Oct 2026 | 15.5.12 | Maintenance |
| 14 (LTS) | Oct 2023 | Oct 2025 | 14.2.35 | **EOL** |
| 13 | Oct 2022 | Dec 2024 | 13.5.11 | EOL |
| 12 | Oct 2021 | Nov 2022 | 12.3.7 | EOL |

### Visual Timeline

```
2023      2024      2025      2026      2027      2028
  |         |         |         |         |         |
  v14───────────────────EOL
  Released            Oct 2025
  Oct 2023              │
                        │
            v15─────────────────────────────EOL
            Released                       Oct 2026
            Oct 2024
                        v16 (Current)───────────────────────EOL
                        Released                          ~Oct 2027
                        Oct 2025
                                │
                             TODAY
                           Feb 2026
                                │
  ┌─────────────────────────────┴─────────────────────────────────────────────┐
  │  GEA Portal on Next.js 16.1.2                                             │
  │  • Current: v16.1.2                                                       │
  │  • Latest Patch: v16.1.6 (security fixes)                                 │
  │  • Remaining Support: ~1.5 years (until ~Oct 2027)                        │
  │  • Action: Update to 16.1.6 for CVE patches                               │
  └───────────────────────────────────────────────────────────────────────────┘
```

### Major Version Features

| Version | Key Features |
|---------|--------------|
| **16** | Cache Components, PPR (Partial Pre-Rendering), `use cache`, instant navigation |
| 15 | Turbopack (stable), React 19, async request APIs, stable Node.js middleware |
| 14 | App Router stable, Server Actions, Partial Prerendering (preview) |
| 13 | App Router (beta), React Server Components, Turbopack (alpha) |

### Sources
- [Next.js Blog](https://nextjs.org/blog)
- [endoflife.date/nextjs](https://endoflife.date/nextjs)
- [GitHub Releases](https://github.com/vercel/next.js/releases)

---

## 2. Current Next.js Implementation

### 2.1 Version & Dependencies

**File:** `frontend/package.json`

```json
{
  "dependencies": {
    "next": "^16.1.2",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

| Dependency | Version | Latest | Status |
|------------|---------|--------|--------|
| next | ^16.1.2 | 16.1.6 | **Patch available** |
| react | ^18.3.0 | 19.2.4 | **Major available** |
| react-dom | ^18.3.0 | 19.2.4 | **Major available** |

### 2.2 Next.js Configuration

**File:** `frontend/next.config.js`

```javascript
const nextConfig = {
  images: {
    unoptimized: true  // For Docker/static deployment
  }
}
```

**Configuration Analysis:**
- Minimal configuration (good - uses defaults)
- Image optimization disabled (appropriate for Docker)
- No experimental features enabled
- No deprecated options used

### 2.3 App Router Architecture

**Directory Structure:**
```
frontend/src/app/
├── layout.tsx              # Root layout (Server Component)
├── page.tsx                # Homepage
├── globals.css             # Global styles
├── admin/
│   ├── layout.tsx          # Admin layout (Client - useSession)
│   ├── page.tsx            # Admin dashboard
│   ├── users/
│   ├── tickets/
│   ├── settings/
│   └── ...
├── auth/
│   ├── signin/
│   └── unauthorized/
├── citizen/
│   ├── layout.tsx
│   └── ...
├── api/                    # 114 API routes
│   ├── auth/[...nextauth]/
│   ├── admin/
│   ├── citizen/
│   ├── feedback/
│   └── ...
├── services/
├── feedback/
├── helpdesk/
└── about/
```

### 2.4 Component Patterns

#### Server Components (Default)
```typescript
// app/admin/page.tsx - Server Component
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  // Server-side data fetching
}
```

#### Client Components
```typescript
// components/layout/Header.tsx - Client Component
'use client';

import { useSession } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();
  // Client-side interactivity
}
```

### 2.5 API Routes (114 Total)

**Pattern:** Next.js 13+ Route Handlers

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Handle GET requests
  return NextResponse.json({ users: [] });
}

export async function POST(request: NextRequest) {
  // Handle POST requests
  return NextResponse.json({ success: true });
}
```

**Route Categories:**
| Category | Count | Examples |
|----------|-------|----------|
| Authentication | 8 | `/api/auth/*`, `/api/citizen/auth/*` |
| Admin | 50+ | `/api/admin/users`, `/api/admin/tickets` |
| Citizen | 17 | `/api/citizen/profile`, `/api/citizen/feedback` |
| Public | 15 | `/api/feedback`, `/api/services` |
| Data Management | 14 | `/api/managedata/entities` |
| External | 5 | `/api/external/tickets` |

### 2.6 Middleware (Proxy Pattern)

**File:** `frontend/src/proxy.ts`

```typescript
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

**Note:** Next.js 16 uses `proxy.ts` instead of `middleware.ts` for route protection.

### 2.7 Build Configuration

**Scripts (package.json):**
```json
{
  "scripts": {
    "generate-contexts": "node scripts/generate-page-contexts.js",
    "prebuild": "npm run generate-contexts",
    "dev": "npm run generate-contexts && next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

### 2.8 TypeScript Configuration

**File:** `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": false,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Key Settings:**
- `moduleResolution: "bundler"` - Modern Next.js setting
- `strict: false` - Not fully strict TypeScript
- Path alias `@/*` for clean imports

---

## 3. Next.js Upgrade Assessment

### 3.1 Current Version Analysis (16.1.2)

| Aspect | Status |
|--------|--------|
| Major Version | Latest (16) |
| Patch Level | 16.1.2 (16.1.6 available) |
| Security | **CVE patches needed** |
| Features | All stable features available |

### 3.2 Patch Update: 16.1.2 → 16.1.6

**Changes in 16.1.3 - 16.1.6:**
- Bug fixes for Turbopack
- MDX multibyte crash fixes
- Alpine/musl performance improvements (mimalloc)
- **Security patches for CVE-2025-55184, CVE-2025-55183**

**Upgrade Complexity:** Very Low (10/10)

```bash
# Simple package update
npm install next@16.1.6
```

### 3.3 Future Major Version (Next.js 17)

**Expected:** October 2026

**Anticipated Features:**
- Further Turbopack improvements
- Enhanced caching strategies
- React 19+ deep integration
- Potential breaking changes TBD

**Recommendation:** Plan evaluation when 17.0 is released.

### 3.4 Breaking Changes History

#### v15 → v16 Breaking Changes
| Change | Impact on GEA Portal |
|--------|---------------------|
| `middleware.ts` → `proxy.ts` | Already using proxy.ts |
| Async request APIs | No changes needed |
| React 19 compatibility | React 18 still supported |

#### v14 → v15 Breaking Changes
| Change | Impact on GEA Portal |
|--------|---------------------|
| Turbopack default in dev | No code changes needed |
| Async cookies/headers | Minor API updates |
| Caching behavior changes | Configuration may be needed |

### 3.5 Compatibility Matrix

| Dependency | Next.js 16 | Next.js 17 (Future) |
|------------|------------|---------------------|
| React 18.x | Yes | Likely deprecated |
| React 19.x | Yes | **Required** |
| next-auth 4.x | Yes | May need v5 |
| TypeScript 5.x | Yes | Yes |
| Node.js 22 | Yes | Yes |
| Tailwind CSS 4 | Yes | Yes |

---

## 4. React Version Timeline

### Official Support Policy

React follows semantic versioning. The latest major version receives active development with new features, bug fixes, and security patches. Previous major versions receive **security patches only**.

### Version EOL Schedule

| Version | Released | Active Support | Security Support | Latest Patch | Status |
|---------|----------|----------------|------------------|--------------|--------|
| **19** | Dec 2024 | Ongoing | Yes | **19.2.4** | **Active** |
| **18** | Mar 2022 | Ended Dec 2024 | Yes | 18.3.1 | **Security Only (Current)** |
| 17 | Oct 2020 | Ended Mar 2022 | Yes | 17.0.2 | Legacy |
| 16 | Sep 2017 | Ended Oct 2020 | Yes | 16.14.0 | Legacy |

### Visual Timeline

```
2022      2023      2024      2025      2026      2027
  |         |         |         |         |         |
  v18─────────────────────────────(security only)────────>
  Released            │ Active     Security
  Mar 2022            │ Ended      Patches
                      │ Dec 2024   Only
                      │
                      v19────────────────────────────────>
                      Released   Active Development
                      Dec 2024
                                │
                             TODAY
                           Feb 2026
                                │
  ┌─────────────────────────────┴─────────────────────────────────────────────┐
  │  GEA Portal on React 18.3.0                                               │
  │  • Current: v18.3.0 (final React 18 release)                              │
  │  • Latest: v19.2.4                                                        │
  │  • Status: React 18 receives security patches only                        │
  │  • Action: Plan upgrade to React 19 in Q1-Q2 2026                         │
  └───────────────────────────────────────────────────────────────────────────┘
```

### Major Version Features

| Version | Key Features |
|---------|--------------|
| **19** | Actions API, `use` hook, ref as prop, improved hydration, React Compiler, metadata support |
| 18 | Concurrent rendering, Suspense, useTransition, useDeferredValue, Server Components |
| 17 | No new features (stepping stone), gradual upgrades, new JSX transform |

### Sources
- [React Versions](https://react.dev/versions)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [endoflife.date/react](https://endoflife.date/react)

---

## 5. Current React Implementation

### 5.1 Version & Dependencies

**File:** `frontend/package.json`

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@headlessui/react": "^2.2.9",
    "react-icons": "^5.5.0",
    "recharts": "^2.15.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@testing-library/react": "^16.3.1",
    "@vitejs/plugin-react": "^5.1.2",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^7.0.1"
  }
}
```

### 5.2 React Ecosystem Dependencies

| Package | Version | React 19 Compatible |
|---------|---------|---------------------|
| react | ^18.3.0 | Upgrade needed |
| react-dom | ^18.3.0 | Upgrade needed |
| @headlessui/react | ^2.2.9 | Yes |
| react-icons | ^5.5.0 | Yes |
| recharts | ^2.15.4 | Yes |
| next-auth | ^4.24.13 | Yes |
| swr | ^2.3.6 | Yes |
| @testing-library/react | ^16.3.1 | Yes |

### 5.3 React Patterns Used

#### Server Components
```typescript
// app/page.tsx - React Server Component
export default async function HomePage() {
  const data = await fetchData(); // Server-side
  return <div>{data}</div>;
}
```

#### Client Components with Hooks
```typescript
// components/admin/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    // Side effects
  }, []);

  return <nav>...</nav>;
}
```

#### Custom Hooks
```typescript
// hooks/useTickets.ts
import useSWR from 'swr';

export function useTickets() {
  const { data, error, isLoading } = useSWR('/api/admin/tickets');
  return { tickets: data, error, isLoading };
}
```

### 5.4 React Features Used

| Feature | Used | React 19 Status |
|---------|------|-----------------|
| Functional Components | Yes | Unchanged |
| Hooks (useState, useEffect, etc.) | Yes | Unchanged |
| Context API | Yes | Unchanged |
| Server Components | Yes | Enhanced |
| Suspense | Limited | Enhanced |
| Error Boundaries | No | Unchanged |
| forwardRef | Limited | **Deprecated in 19** |
| PropTypes | No | **Removed in 19** |
| String Refs | No | **Removed in 19** |

---

## 6. React Upgrade Assessment (18 → 19)

### 6.1 Why Upgrade to React 19?

| Benefit | Description |
|---------|-------------|
| **Active Development** | React 18 only receives security patches |
| **Performance** | React Compiler, improved hydration |
| **New Features** | Actions API, `use` hook, simplified refs |
| **Future Compatibility** | Next.js 17 will likely require React 19 |
| **Better DX** | Simplified patterns, less boilerplate |

### 6.2 Breaking Changes in React 19

#### Removed APIs

| Removed API | GEA Portal Impact | Migration |
|-------------|-------------------|-----------|
| `ReactDOM.render` | Not used (using createRoot) | None |
| `ReactDOM.hydrate` | Not used (using hydrateRoot) | None |
| `PropTypes` | Not used (using TypeScript) | None |
| `defaultProps` (functions) | Check components | Use ES6 defaults |
| String refs | Not used | None |
| `forwardRef` | Limited usage | Ref as prop |
| Legacy Context | Not used | None |
| `react-dom/test-utils` | Check tests | Update imports |

#### Changed Behaviors

| Change | Impact | Action |
|--------|--------|--------|
| Strict Mode improvements | Test may show warnings | Fix warnings |
| Error handling changes | Test error boundaries | Update tests |
| ref as prop | Simplifies code | Update forwardRef usage |

### 6.3 GEA Portal Compatibility Analysis

**High Compatibility Expected:**

| Aspect | Status | Notes |
|--------|--------|-------|
| No PropTypes | Good | Using TypeScript |
| No string refs | Good | Using ref callbacks/objects |
| No ReactDOM.render | Good | Using createRoot |
| TypeScript | Good | Update @types packages |
| Server Components | Good | Enhanced in React 19 |
| Client Components | Good | Minor updates may be needed |

**Areas to Check:**

1. **forwardRef usage** - Search for `forwardRef` in codebase
2. **defaultProps on functions** - Search for `defaultProps`
3. **Test utilities** - Update `@testing-library/react` imports
4. **Third-party libraries** - Verify compatibility

### 6.4 Migration Complexity Assessment

| Metric | Score | Reason |
|--------|-------|--------|
| Removed APIs | 9/10 | Not using deprecated APIs |
| Third-party Libs | 8/10 | Most libraries support React 19 |
| Test Updates | 7/10 | Some test utility changes |
| Type Updates | 8/10 | Straightforward type updates |
| **Overall** | **8/10** | Low-Medium complexity |

### 6.5 Recommended Migration Path

```
Phase 1: Preparation (1 day)
├── Audit codebase for deprecated APIs
├── Run: npx codemod react/19/migration-recipe
├── Update @types/react and @types/react-dom
└── Review third-party library compatibility

Phase 2: Upgrade (1-2 days)
├── Update react and react-dom to ^19.0.0
├── Fix any TypeScript errors
├── Update forwardRef patterns (if any)
├── Update test utilities
└── Run full test suite

Phase 3: Testing (1-2 days)
├── Test all pages manually
├── Test Server Components
├── Test Client Components
├── Verify hydration
└── Performance benchmarking

Phase 4: Deploy (1 day)
├── Deploy to staging
├── Full QA
├── Deploy to production
└── Monitor for issues
```

### 6.6 Migration Tools

```bash
# Run React 19 codemods
npx codemod react/19/migration-recipe ./frontend/src

# Update TypeScript types
npx types-react-codemod@latest preset-19 ./frontend/src

# Check for issues
npm run lint
npm run build
npm run test:run
```

---

## 7. Node.js Version Timeline

### Official LTS Policy

Node.js even-numbered versions enter LTS (Long Term Support) with 30 months of total support:
- **Active LTS:** 12 months - Active development
- **Maintenance LTS:** 18 months - Critical fixes only

Odd-numbered versions are "Current" releases with 6 months of support.

### Version EOL Schedule

| Version | Released | Active LTS Ends | Maintenance Ends | Status |
|---------|----------|-----------------|------------------|--------|
| 18 (LTS) | Apr 2022 | Oct 2023 | **Apr 2025** | **EOL** |
| 20 (LTS) | Apr 2023 | Oct 2024 | Apr 2026 | Maintenance |
| **22** (LTS) | Apr 2024 | Oct 2025 | **Apr 2027** | **Active LTS (Current)** |
| 24 (LTS) | May 2025 | Oct 2026 | Apr 2028 | Active LTS |

### Visual Timeline

```
2024      2025      2026      2027      2028      2029
  |         |         |         |         |         |
  v18───────EOL
            Apr 2025
                │
  v20───────────────────────EOL
                           Apr 2026
                              │
  v22 (Current)───────────────────────────EOL
  Active LTS                             Apr 2027
  Apr 2024
                v24───────────────────────────────────EOL
                Active LTS                           Apr 2028
                May 2025
                                │
                             TODAY
                           Feb 2026
                                │
  ┌─────────────────────────────┴─────────────────────────────────────────────┐
  │  GEA Portal on Node.js 22-alpine                                          │
  │  • Current: v22.x (LTS)                                                   │
  │  • Remaining Support: ~14 months (until Apr 2027)                         │
  │  • Recommendation: Consider v24 upgrade in Q4 2026                        │
  └───────────────────────────────────────────────────────────────────────────┘
```

### Sources
- [Node.js Release Schedule](https://nodejs.org/en/about/releases/)
- [endoflife.date/nodejs](https://endoflife.date/nodejs)
- [Node.js Release Working Group](https://github.com/nodejs/Release)

---

## 8. Current Node.js Implementation

### 8.1 Docker Configuration

**File:** `frontend/Dockerfile`

```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build application
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install PostgreSQL client for backups
RUN apk add --no-cache postgresql16-client

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy build artifacts
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

### 8.2 Node.js Specifications

| Attribute | Value |
|-----------|-------|
| Base Image | `node:22-alpine` |
| LTS Codename | "Jod" |
| Architecture | Alpine Linux (musl libc) |
| Package Manager | npm |
| Non-root User | `nextjs` (uid 1001) |

### 8.3 Dependencies Requiring Node.js Features

| Package | Min Node.js | Notes |
|---------|-------------|-------|
| next@16 | 18.17+ | Uses modern APIs |
| @auth/pg-adapter | 18+ | ESM support |
| bcrypt | 18+ | Native bindings |
| pg | 14+ | Database driver |
| redis | 18+ | Modern async APIs |
| zod | 18+ | TypeScript features |

### 8.4 Native Dependencies

**Packages with native bindings:**
- `bcrypt` - Password hashing (C++ bindings)
- `pg` - PostgreSQL driver (optional native)

**Alpine Considerations:**
- Alpine uses `musl` instead of `glibc`
- Some native packages may need rebuilding
- Next.js 16.1.4+ includes `mimalloc` optimization for Alpine

---

## 9. Node.js Upgrade Assessment

### 9.1 Current Version Analysis (Node.js 22)

| Aspect | Status |
|--------|--------|
| LTS Status | Active LTS |
| EOL Date | April 2027 (~14 months) |
| Security | Current patches |
| Performance | Excellent |

### 9.2 Upgrade Path: Node.js 22 → 24

**Node.js 24 Features:**
- Performance improvements
- V8 engine updates
- New JavaScript features (ES2025)
- Continued security updates until Apr 2028

**Breaking Changes (22 → 24):**
| Change | Impact |
|--------|--------|
| V8 engine update | Usually transparent |
| Deprecated APIs removed | Check dependencies |
| Native module rebuilds | May require updates |

### 9.3 Compatibility Assessment

| Dependency | Node 22 | Node 24 |
|------------|---------|---------|
| next@16 | Yes | Yes (expected) |
| react@19 | Yes | Yes |
| next-auth@4 | Yes | Yes |
| bcrypt@6 | Yes | Test required |
| pg@8 | Yes | Yes |
| redis@5 | Yes | Yes |
| TypeScript 5 | Yes | Yes |

### 9.4 Alpine vs Debian Considerations

| Aspect | Alpine (Current) | Debian |
|--------|------------------|--------|
| Image Size | ~180MB | ~350MB |
| Libc | musl | glibc |
| Native Packages | May need rebuild | Better compatibility |
| Performance | Good (with mimalloc) | Standard |
| Security | Minimal attack surface | More packages |

**Recommendation:** Continue with Alpine for smaller images. Monitor for any musl-related issues.

---

## 10. Security Considerations

### 10.1 Next.js Security Advisories

#### CVE-2025-55184 (High Severity)
**Type:** Denial of Service
**Component:** React Server Components
**Affected:** Next.js 13.x, 14.x, 15.x, 16.x
**Fixed:** Latest patch versions
**Action:** Update to Next.js 16.1.6

#### CVE-2025-55183 (Medium Severity)
**Type:** Source Code Exposure
**Component:** React Server Components
**Affected:** Next.js 13.x, 14.x, 15.x, 16.x
**Fixed:** Latest patch versions
**Action:** Update to Next.js 16.1.6

### 10.2 React Security

React 18 continues to receive security patches but no new features or bug fixes.

**React 19 Security Improvements:**
- Improved error handling
- Better hydration mismatch detection
- Enhanced strict mode checks

### 10.3 Node.js Security

Node.js 22 receives regular security updates during Active LTS phase.

**Recent Security Updates:**
- OpenSSL patches
- HTTP parser fixes
- DNS resolution improvements

### 10.4 Dependency Security

**Recommended Tools:**
```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Check outdated packages
npm outdated
```

### 10.5 Security Checklist

- [ ] Update Next.js to 16.1.6 (CVE fixes)
- [ ] Plan React 19 upgrade for continued security support
- [ ] Run `npm audit` monthly
- [ ] Monitor Node.js security releases
- [ ] Keep dependencies updated
- [ ] Review OWASP guidelines for API routes

---

## 11. Migration Strategies

### 11.1 Next.js Patch Update Strategy

**Recommended:** Rolling updates for patch versions

```bash
# 1. Update package.json
npm install next@16.1.6

# 2. Test locally
npm run build
npm run test:run

# 3. Deploy to staging
# 4. Deploy to production
```

**Downtime:** Zero (rolling deployment)

### 11.2 React 19 Migration Strategy

**Recommended Order:**
1. First: Update Next.js to latest patch
2. Then: Upgrade React 18 → 19
3. Finally: Update Node.js (if needed)

```
Phase 1: Audit (Day 1)
├── Search for deprecated APIs
│   ├── grep -r "forwardRef" src/
│   ├── grep -r "defaultProps" src/
│   └── grep -r "PropTypes" src/
├── Run codemods
│   └── npx codemod react/19/migration-recipe
└── Check third-party libs

Phase 2: Upgrade (Days 2-3)
├── npm install react@19 react-dom@19
├── npm install -D @types/react@19 @types/react-dom@19
├── Fix TypeScript errors
├── Update test utilities
└── npm run build && npm run test:run

Phase 3: Test & Deploy (Days 4-5)
├── Manual testing
├── Staging deployment
├── QA verification
└── Production deployment
```

### 11.3 Node.js Upgrade Strategy

**Docker Image Update:**

```dockerfile
# Update Dockerfile
# FROM: node:22-alpine
# TO:   node:24-alpine
```

**Upgrade Procedure:**

```bash
# 1. Create test branch
git checkout -b upgrade/node-24

# 2. Update Dockerfile
sed -i 's/node:22-alpine/node:24-alpine/g' frontend/Dockerfile

# 3. Rebuild and test
docker compose build frontend
docker compose up -d

# 4. Run tests
docker exec frontend npm run test:run

# 5. Check for native module issues
docker logs frontend

# 6. Merge and deploy
```

### 11.4 Zero-Downtime Deployment

**Using Docker Compose:**

```bash
# Build new image
docker compose build frontend

# Rolling update (no downtime)
docker compose up -d --no-deps frontend

# Verify health
docker compose ps
curl -I https://gea.abhirup.app/api/health
```

---

## 12. Step-by-Step Upgrade Guide

### 12.1 Next.js Patch Update (16.1.2 → 16.1.6)

#### Pre-Upgrade Checklist
- [ ] Verify current version: `npm list next`
- [ ] Create backup branch: `git checkout -b backup/pre-nextjs-update`
- [ ] Run current tests: `npm run test:run`

#### Upgrade Steps

```bash
# Step 1: Update Next.js
cd frontend
npm install next@16.1.6

# Step 2: Verify package-lock.json updated
git diff package-lock.json

# Step 3: Run build
npm run build

# Step 4: Run tests
npm run test:run

# Step 5: Start development server and test manually
npm run dev
# Test key pages: /, /admin, /auth/signin, /citizen

# Step 6: Commit changes
git add package.json package-lock.json
git commit -m "chore: update Next.js to 16.1.6 (security patches)"

# Step 7: Deploy
docker compose build frontend
docker compose up -d frontend
```

### 12.2 React Upgrade (18.3.0 → 19.x)

#### Pre-Upgrade Checklist
- [ ] Complete Next.js patch update first
- [ ] Audit for deprecated APIs
- [ ] Check third-party library compatibility
- [ ] Run codemods

#### Upgrade Steps

```bash
# Step 1: Run codemods
cd frontend
npx codemod react/19/migration-recipe ./src

# Step 2: Update TypeScript types
npx types-react-codemod@latest preset-19 ./src

# Step 3: Update packages
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19

# Step 4: Update test utilities (if needed)
# @testing-library/react should work, but check imports

# Step 5: Run build
npm run build

# Step 6: Run tests
npm run test:run

# Step 7: Fix any errors and re-run

# Step 8: Manual testing
npm run dev
# Test all major flows

# Step 9: Commit changes
git add -A
git commit -m "chore: upgrade React 18 to React 19"

# Step 10: Deploy
docker compose build frontend
docker compose up -d frontend
```

#### Common Issues and Fixes

**Issue: forwardRef deprecation warning**
```typescript
// Before (React 18)
const Button = forwardRef((props, ref) => (
  <button ref={ref} {...props} />
));

// After (React 19)
const Button = ({ ref, ...props }) => (
  <button ref={ref} {...props} />
);
```

**Issue: defaultProps on function component**
```typescript
// Before (React 18)
function Button(props) { ... }
Button.defaultProps = { variant: 'primary' };

// After (React 19)
function Button({ variant = 'primary', ...props }) { ... }
```

### 12.3 Node.js Upgrade (22 → 24)

#### Pre-Upgrade Checklist
- [ ] Verify current version: `docker exec frontend node --version`
- [ ] Check dependency compatibility
- [ ] Create backup of Dockerfile

#### Upgrade Steps

```bash
# Step 1: Backup Dockerfile
cp frontend/Dockerfile frontend/Dockerfile.backup

# Step 2: Update Dockerfile (both stages)
# Edit frontend/Dockerfile:
# Change: FROM node:22-alpine AS builder
# To:     FROM node:24-alpine AS builder
# Change: FROM node:22-alpine AS runner
# To:     FROM node:24-alpine AS runner

# Step 3: Rebuild image
docker compose build --no-cache frontend

# Step 4: Start and test
docker compose up -d frontend

# Step 5: Verify Node.js version
docker exec frontend node --version
# Should output: v24.x.x

# Step 6: Run tests
docker exec frontend npm run test:run

# Step 7: Check for native module issues
docker logs frontend --tail 100

# Step 8: Test application manually
curl -I https://gea.abhirup.app/api/health

# Step 9: Monitor for 24 hours
docker logs -f frontend
```

---

## 13. Risk Analysis

### 13.1 Next.js Upgrade Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Build failure | Very Low | Medium | Test locally first |
| Runtime errors | Low | Medium | Staging deployment |
| Performance regression | Very Low | Low | Benchmark before/after |
| API breaking changes | Very Low (patch) | High | Review changelog |

### 13.2 React Upgrade Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Deprecated API usage | Low | Medium | Run codemods first |
| Third-party lib issues | Low | High | Check compatibility |
| Hydration mismatches | Low | Medium | Test Server Components |
| Test failures | Medium | Low | Update test utilities |
| Type errors | Medium | Low | Update @types packages |

### 13.3 Node.js Upgrade Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Native module failure | Medium | High | Test bcrypt, pg |
| Alpine compatibility | Low | Medium | Check musl issues |
| Performance changes | Low | Low | Benchmark |
| Dependency incompatibility | Low | High | Check npm audit |

### 13.4 Current Risk: Not Updating

| Risk | Severity | Description |
|------|----------|-------------|
| **CVE-2025-55184** | High | DoS vulnerability in RSC |
| **CVE-2025-55183** | Medium | Source code exposure |
| React 18 stagnation | Medium | No new features, security only |
| Node.js 22 EOL | Low (14 months) | Support ends Apr 2027 |

---

## 14. Decision Matrix

### 14.1 Next.js Update Decision

| Factor | Weight | Stay 16.1.2 | Update 16.1.6 |
|--------|--------|-------------|---------------|
| Security | **Critical** | CVE vulnerable | **CVE fixed** |
| Stability | High | Proven | Recent patches |
| Features | Low | Current | Same |
| Effort | Low | None | ~30 minutes |

**Recommendation: Update to Next.js 16.1.6 immediately**

### 14.2 React Upgrade Decision

| Factor | Weight | Stay React 18 | Upgrade React 19 |
|--------|--------|---------------|------------------|
| Active Development | High | Security only | **Active** |
| New Features | Medium | None | Actions, use hook |
| Future Compatibility | High | May block Next.js 17 | **Ready** |
| Effort | Medium | None | 3-5 days |
| Risk | High | Low | Low-Medium |

**Recommendation: Upgrade to React 19 in Q1-Q2 2026**

### 14.3 Node.js Upgrade Decision

| Factor | Weight | Stay Node 22 | Upgrade Node 24 |
|--------|--------|--------------|-----------------|
| EOL Timeline | High | Apr 2027 (14 mo) | Apr 2028 (26 mo) |
| Stability | High | Proven stable | Newer, less tested |
| Performance | Medium | Good | Potentially better |
| Effort | Medium | None | 1-2 hours |
| Risk | High | Low | Medium |

**Recommendation: Stay on Node.js 22 until Q4 2026**

### 14.4 Action Plan Summary

| Action | Priority | Timeline | Effort |
|--------|----------|----------|--------|
| **Update Next.js to 16.1.6** | **High** | This week | 30 min |
| **Upgrade React to 19.x** | **Medium** | Q1-Q2 2026 | 3-5 days |
| Monitor Next.js 17 release | Low | Oct 2026 | - |
| Upgrade Node.js to 24 | Low | Q4 2026 | 2 hours |

---

## Appendix A: Quick Reference

### Package Commands

```bash
# Check versions
npm list next react react-dom
docker exec frontend node --version

# Update Next.js
npm install next@16.1.6

# Update React
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19

# Run codemods
npx codemod react/19/migration-recipe ./src
npx types-react-codemod@latest preset-19 ./src

# Security audit
npm audit
npm audit fix

# Outdated packages
npm outdated

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Docker Commands

```bash
# Build frontend
docker compose build frontend

# Build without cache
docker compose build --no-cache frontend

# Rebuild and restart
docker compose up -d --build frontend

# View logs
docker logs frontend --tail 100 -f

# Check versions
docker exec frontend node --version
docker exec frontend npm list next react

# Run tests in container
docker exec frontend npm run test:run

# Access shell
docker exec -it frontend sh
```

### Key Files

| File | Purpose |
|------|---------|
| `frontend/package.json` | Dependencies and scripts |
| `frontend/next.config.js` | Next.js configuration |
| `frontend/tsconfig.json` | TypeScript configuration |
| `frontend/Dockerfile` | Container build |
| `frontend/src/proxy.ts` | Route protection middleware |
| `docker-compose.yml` | Service orchestration |

---

## Appendix B: Compatibility Reference

### Next.js + React Compatibility

| Next.js | React (Min) | React (Recommended) |
|---------|-------------|---------------------|
| 16.x | 18.2.0 | **19.x** |
| 15.x | 18.2.0 | 19.x |
| 14.x | 18.2.0 | 18.x |

### Next.js + Node.js Compatibility

| Next.js | Node.js (Min) | Node.js (Recommended) |
|---------|---------------|----------------------|
| 16.x | 18.17.0 | 20.x / 22.x |
| 15.x | 18.17.0 | 20.x / 22.x |
| 14.x | 18.17.0 | 20.x |

### React + TypeScript Compatibility

| React | @types/react |
|-------|--------------|
| 19.x | @types/react@19 |
| 18.x | @types/react@18 |

### Node.js + npm Compatibility

| Node.js | Bundled npm |
|---------|-------------|
| 24.x | 10.x |
| 22.x | 10.x |
| 20.x | 10.x |
| 18.x | 9.x |

---

## Appendix C: Related Documentation

- [API Development Patterns](./API_DEVELOPMENT_PATTERNS.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Docker Environment Build Process](./DOCKER_ENV_BUILD_PROCESS.md)
- [Authentication Guide](../solution/AUTHENTICATION.md)

## External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Blog](https://nextjs.org/blog)
- [React Documentation](https://react.dev)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Node.js Releases](https://nodejs.org/en/about/releases/)
- [endoflife.date/nextjs](https://endoflife.date/nextjs)
- [endoflife.date/react](https://endoflife.date/react)
- [endoflife.date/nodejs](https://endoflife.date/nodejs)

---

**Document Maintainer:** GEA Portal Development Team
**Last Review Date:** February 22, 2026
**Next Review Date:** August 2026 (or when Next.js 17 releases)

**Change Log:**
- v1.2 (Feb 22, 2026): **Next.js 16.1.6 security patch applied** - CVE-2025-55184, CVE-2025-55183 fixed
- v1.1 (Feb 22, 2026): Added comprehensive React section, upgrade assessment, migration guide
- v1.0 (Feb 22, 2026): Initial assessment document
