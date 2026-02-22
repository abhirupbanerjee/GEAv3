# Migration & Upgrade Guides

**GEA Portal v3 - Infrastructure Migration Documentation**

**Last Updated:** February 22, 2026
**Status:** All immediate security patches applied

---

## Overview

This directory contains comprehensive migration guides for upgrading GEA Portal v3 infrastructure components. Each document provides version timelines, breaking changes analysis, step-by-step migration guides, and risk assessments.

---

## Current Status

### Security Patches Applied (February 22, 2026)

| Component | Version | CVE Fixed | Status |
|-----------|---------|-----------|--------|
| **Next.js** | 16.1.6 | CVE-2025-55184, CVE-2025-55183 | ✅ Applied |
| **PgBouncer** | v1.25.1-p0 | CVE-2025-12819 | ✅ Applied |

### Upgrade Roadmap

| Component | Current | Target | Timeline | Priority |
|-----------|---------|--------|----------|----------|
| React | 18.3.0 | 19.x | Q1-Q2 2026 | Medium |
| NextAuth | v4.24.13 | v5 (Auth.js) | Q3-Q4 2026 | Low |
| Node.js | 22-alpine | 24.x | Q4 2026 | Low |
| PostgreSQL | 16-alpine | 17/18 | Q4 2026 | Low |

---

## Documentation Index

### 1. [Authentication Migration](auth-migration.md)

**NextAuth v4 → Auth.js v5 Migration Guide**

- Version timeline and EOL schedule
- Current implementation analysis (51+ API routes, 23+ client components)
- Breaking changes and migration requirements
- Step-by-step migration guide
- Risk analysis and decision matrix
- **Recommendation:** Stay on v4 until Q3-Q4 2026

### 2. [Next.js, React & Node.js Migration](nextjs-nodejs-migration.md)

**Frontend Runtime Assessment & Upgrade Paths**

- Next.js 16.x version timeline
- React 18 → 19 upgrade assessment
- Node.js LTS schedule
- Security CVE documentation
- Step-by-step upgrade guides
- **Status:** Next.js 16.1.6 security patch applied

### 3. [PostgreSQL & PgBouncer Migration](postgresql-pgbouncer-migration.md)

**Database Infrastructure Assessment**

- PostgreSQL version timeline (EOL Nov 2028)
- PgBouncer upgrade guide
- Connection pooling configuration
- Backup and restore procedures
- **Status:** PgBouncer v1.25.1-p0 security patch applied

---

## Quick Reference

### Current Production Stack

```
Component           Version         EOL/Status
─────────────────────────────────────────────────
Next.js             16.1.6          ~Oct 2027
React               18.3.0          Security only
Node.js             22-alpine       Apr 2027
PostgreSQL          16-alpine       Nov 2028
PgBouncer           v1.25.1-p0      Up to date
Redis               7.4.4-alpine    ~2028
NextAuth            v4.24.13        Maintained
Traefik             v3.6            Up to date
Docker              29.1.5          Supported
```

### Decision Matrix

| Upgrade | Complexity | Risk | Benefit | Recommended |
|---------|------------|------|---------|-------------|
| React 18 → 19 | Medium | Low | High | Q1-Q2 2026 |
| NextAuth v4 → v5 | High | Medium | Medium | Q3-Q4 2026 |
| Node.js 22 → 24 | Low | Low | Medium | Q4 2026 |
| PostgreSQL 16 → 17 | Medium | Low | Medium | Q4 2026 |

---

## Related Documentation

- **[Tech Stack Upgrade Roadmap](../setup/TECH_STACK_UPGRADE_ROADMAP.md)** - Complete upgrade timeline and execution log
- **[Solution Architecture](../solution/SOLUTION_ARCHITECTURE.md)** - Current system architecture
- **[Database Reference](../solution/DATABASE_REFERENCE.md)** - Database schema and configuration

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| Feb 22, 2026 | 1.0 | Initial migration documentation created |
| Feb 22, 2026 | 1.1 | Security patches applied (Next.js 16.1.6, PgBouncer v1.25.1-p0) |

---

**Document Maintainer:** GEA Portal Development Team
**Next Review Date:** August 2026
