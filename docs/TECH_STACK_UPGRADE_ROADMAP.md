# Tech Stack Upgrade Roadmap 2026

## Document Overview
This roadmap outlines the strategic plan for upgrading key technologies in the GoGeaPortal v3 project. Each major upgrade has been analyzed for breaking changes, migration complexity, and optimal timing.

**Last Updated:** 2026-01-16
**Status:** In Progress (Docker/Traefik upgrade completed)
**Risk Level:** High (Multiple major version upgrades)

---

## ✅ Resolved Infrastructure Issues

### Docker-Traefik API Compatibility (RESOLVED)

**Priority:** ✅ Resolved
**Status:** ✅ Fixed - January 16, 2026
**Resolution:** Upgraded Traefik v3.0 → v3.6.7, then Docker 27.5.1 → 29.1.5

#### Issue Description (Historical)
- **Problem:** Traefik container using Docker API v1.24, but Docker daemon requires v1.44+
- **Error:** `client version 1.24 is too old. Minimum supported API version is 1.44`
- **Root Cause:** Docker 29 enforced minimum API v1.44; Traefik v3.0 used API v1.24

#### Resolution Applied
- [x] Upgraded Traefik v3.0 → v3.6.7 (includes Docker API auto-negotiation)
- [x] Upgraded Docker 27.5.1 → 29.1.5 (after Traefik upgrade)
- [x] Verified all containers running correctly
- [x] Documented upgrade procedure for other systems

#### Current Production Status
| Component | Version | Status |
|-----------|---------|--------|
| Docker | 29.1.5 | ✅ Latest supported |
| Traefik | v3.6.7 | ✅ With API auto-negotiation |

#### EOL Information
| Component | Version | Support Status |
|-----------|---------|----------------|
| Docker 29.x | Current | ✅ Actively supported |
| Docker 28.x | EOL | ❌ EOL since Nov 2025 |
| Docker 27.x | EOL | ❌ EOL since early 2025 |
| Traefik v3.6 | Current | ✅ Latest minor, actively supported |

---

## ✅ Phase 1: Immediate Updates (Q1 2026) - COMPLETED

### Safe Package Updates (COMPLETED January 16, 2026)
**Timeline:** January 2026
**Risk Level:** 🟢 Low
**Status:** ✅ Completed

#### Packages Updated
| Package | Before | After | Status |
|---------|--------|-------|--------|
| @types/node | 20.19.25 | 20.19.30 | ✅ |
| @types/react | 18.3.26 | 18.3.27 | ✅ |
| @types/pg | 8.15.6 | 8.16.0 | ✅ |
| next | 14.2.33 | 14.2.35 | ✅ |
| tailwindcss | 3.4.18 | 3.4.19 | ✅ |
| autoprefixer | 10.4.21 | 10.4.23 | ✅ |
| swr | 2.3.6 | 2.3.8 | ✅ |
| zod | 4.1.12 | 4.3.5 | ✅ |
| pg | 8.16.3 | 8.17.1 | ✅ |

#### Verification
- [x] TypeScript compilation: No errors
- [x] Build: Successful
- [x] All tests passing

#### Execution Steps
1. Create feature branch: `git checkout -b chore/safe-package-updates-q1-2026`
2. Run updates: `cd frontend && npm update [packages]`
3. Run build: `npm run build`
4. Test locally: `npm run dev`
5. Run TypeScript check: `npx tsc --noEmit`
6. Visual regression testing (manual)
7. Create PR with changes
8. Deploy to staging
9. Smoke test all features
10. Deploy to production

#### Success Criteria
- [ ] All packages updated successfully
- [ ] Build completes without errors
- [ ] TypeScript compilation passes
- [ ] No visual regressions
- [ ] All features functional in staging
- [ ] Production deployment successful

---

## 📅 Phase 2: PostgreSQL Upgrade (Q2 2026) - NEXT

### PostgreSQL 15.14 → 16.11 Migration
**Timeline:** Q2 2026 (when ready)
**Risk Level:** 🟢 Low (for this project)
**Estimated Effort:** 2-4 hours
**Target Image:** `postgres:16-alpine` (currently 16.11-alpine3.23)

#### Risk Assessment for GEA Portal

| Risk Factor | Status | Notes |
|-------------|--------|-------|
| PL/pgSQL Functions | ✅ None | No stored procedures in codebase |
| Cursor Variables | ✅ None | No cursor usage (PG16 breaking change N/A) |
| Custom Extensions | ✅ None | Standard PostgreSQL only |
| SCRAM-SHA-256 Auth | ✅ Compatible | PgBouncer auth unchanged |
| node-postgres (pg) | ✅ Compatible | v8.17.1 supports PG16 |

**Conclusion:** Low risk upgrade - no application code changes required.

#### PostgreSQL 16 New Features (Benefits)
- Improved logical replication performance
- Better query parallelism
- Enhanced JSON/JSONB functions
- Improved VACUUM performance
- New `pg_stat_io` view for I/O statistics

#### Pre-Migration Checklist
- [ ] Create full database backup: `pg_dumpall`
- [ ] Document current data volume size
- [ ] Test migration in local environment first
- [ ] Verify PgBouncer v1.23.1 compatibility with PG16

#### Migration Steps (Docker - Dump/Restore Method)

**Step 1: Backup Current Database**
```bash
# On production server
docker compose exec feedback_db pg_dumpall -U $FEEDBACK_DB_USER > backup_pg15_$(date +%Y%m%d).sql
```

**Step 2: Stop Services**
```bash
docker compose down
```

**Step 3: Update docker-compose.yml**
```yaml
# Change:
image: postgres:15.14-alpine
# To:
image: postgres:16-alpine
```

**Step 4: Remove Old Data Volume & Start Fresh**
```bash
# WARNING: This removes the old database!
docker volume rm v3_feedback_db_data

# Start new PostgreSQL 16 container
docker compose up -d feedback_db

# Wait for healthy status
docker compose ps
```

**Step 5: Restore Backup**
```bash
# Restore the backup
docker compose exec -T feedback_db psql -U $FEEDBACK_DB_USER -d $FEEDBACK_DB_NAME < backup_pg15_$(date +%Y%m%d).sql
```

**Step 6: Start All Services & Verify**
```bash
docker compose up -d
docker compose ps  # All healthy
docker compose logs feedback_db --tail 20  # No errors
```

#### Testing Checklist
- [ ] All database queries execute successfully
- [ ] PgBouncer connection pooling stable
- [ ] Application connectivity verified
- [ ] Performance acceptable
- [ ] Backup/restore procedures validated

#### Rollback Plan
1. Stop all services: `docker compose down`
2. Remove PG16 volume: `docker volume rm v3_feedback_db_data`
3. Revert docker-compose.yml to `postgres:15.14-alpine`
4. Start fresh and restore from backup
5. Verify application functionality

#### Files to Modify
- `docker-compose.yml`: Line 29 - change image tag

---

## 📅 Phase 3: Next.js 16 Migration (Q3 2026)

### Next.js 14 → 16 Migration
**Timeline:** July - September 2026
**Risk Level:** 🔴 High
**Estimated Effort:** 2-3 weeks

#### Pre-Migration Research (June 2026)
- [ ] Monitor Next.js 16 ecosystem stability
- [ ] Check all dependency compatibility with Next.js 16
- [ ] Review community migration experiences
- [ ] Identify project-specific risks
- [ ] Allocate dedicated development time

#### Breaking Change Analysis

##### 1. Async Request APIs (CRITICAL)
- [ ] Audit all usage of `params` in route handlers
- [ ] Audit all usage of `searchParams` in pages
- [ ] Audit all usage of `cookies()` function
- [ ] Audit all usage of `headers()` function
- [ ] Audit all usage of `draftMode()` function
- [ ] Create migration script for async conversions
- [ ] Test each converted endpoint

##### 2. Middleware → Proxy Migration
- [ ] Review current middleware.ts implementation
- [ ] Check for edge runtime dependencies
- [ ] Plan Node.js runtime migration
- [ ] Rename middleware.ts → proxy.ts
- [ ] Rename middleware function → proxy
- [ ] Test routing behavior
- [ ] Verify authentication flows

##### 3. Turbopack Migration
- [ ] Audit custom Webpack configurations
- [ ] Identify Webpack plugins in use
- [ ] Plan Turbopack equivalent configurations
- [ ] Test build with Turbopack
- [ ] Prepare --webpack fallback if needed
- [ ] Benchmark build performance improvements

##### 4. Caching & PPR Updates
- [ ] Review current caching strategy
- [ ] Understand new opt-in caching model
- [ ] Identify pages needing explicit caching
- [ ] Implement Cache Components where needed
- [ ] Test cache invalidation
- [ ] Monitor cache hit rates

#### Migration Execution
- [ ] Create feature branch: `feat/nextjs-16-migration`
- [ ] Run automated codemod: `npx @next/codemod@canary upgrade latest`
- [ ] Review and manually fix codemod changes
- [ ] Update all async request API usage
- [ ] Migrate middleware to proxy
- [ ] Configure Turbopack
- [ ] Implement new caching strategy
- [ ] Update environment variables if needed
- [ ] Run full test suite

#### Testing Strategy
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Build performance benchmarks
- [ ] Load testing
- [ ] Authentication flows verified
- [ ] API routes functional
- [ ] Static generation working
- [ ] Dynamic routes working
- [ ] ISR (Incremental Static Regeneration) working

#### Performance Validation
- [ ] Measure build time improvements (expect 2-3x faster)
- [ ] Measure Fast Refresh performance
- [ ] Monitor bundle size changes
- [ ] Verify Core Web Vitals maintained or improved
- [ ] Check Time to First Byte (TTFB)

---

## 📅 Phase 4: React 19 Migration (Q4 2026)

### React 18 → 19 Migration
**Timeline:** October - December 2026
**Risk Level:** 🔴 High
**Estimated Effort:** 3-4 weeks

#### Pre-Migration (September 2026)
- [ ] Upgrade to React 18.3 first (includes v19 warnings)
- [ ] Fix all deprecation warnings in React 18.3
- [ ] Verify all third-party libraries support React 19
- [ ] Check Next.js compatibility with React 19
- [ ] Review React 19 changelog thoroughly

#### Breaking Change Migration

##### 1. Ref Handling Overhaul
- [ ] Audit all components using forwardRef
- [ ] Identify ref forwarding patterns
- [ ] Convert forwardRef to direct ref props
- [ ] Update TypeScript types for ref props
- [ ] Test all components with refs
- [ ] Update documentation for ref usage

##### 2. PropTypes & defaultProps Removal
- [ ] Search for all PropTypes usage: `grep -r "PropTypes" frontend/src/`
- [ ] Search for all defaultProps: `grep -r "defaultProps" frontend/src/`
- [ ] Convert PropTypes to TypeScript types
- [ ] Replace defaultProps with ES6 default parameters
- [ ] Remove prop-types package dependency
- [ ] Verify type safety maintained

##### 3. String Refs Elimination
- [ ] Search for string refs: `grep -r 'ref="' frontend/src/`
- [ ] Convert to callback refs or createRef
- [ ] Test ref access in all components
- [ ] Update legacy class components if any

##### 4. useEffect & Suspense Updates
- [ ] Review all useEffect cleanup functions
- [ ] Test Suspense boundaries
- [ ] Update error boundaries if needed
- [ ] Verify loading states work correctly
- [ ] Check data fetching patterns

##### 5. React Compiler Considerations
- [ ] Identify manual useMemo usage
- [ ] Identify manual useCallback usage
- [ ] Test with React Compiler
- [ ] Remove redundant manual optimizations
- [ ] Benchmark performance changes

#### Automated Migration
- [ ] Run React 19 codemods: `npx @next/codemod@latest`
- [ ] Review automated changes
- [ ] Fix TypeScript errors
- [ ] Update @types/react to v19 types
- [ ] Update @types/react-dom to v19 types

#### Library Compatibility
- [ ] Verify react-icons compatibility
- [ ] Verify recharts compatibility
- [ ] Verify next-auth compatibility
- [ ] Verify SWR compatibility
- [ ] Update incompatible libraries

#### Testing Phase
- [ ] Run full test suite
- [ ] Manual testing of all features
- [ ] Test authentication flows
- [ ] Test form submissions
- [ ] Test data visualization (recharts)
- [ ] Test error boundaries
- [ ] Test Suspense boundaries
- [ ] Cross-browser testing

---

## 📅 Phase 5: Tailwind CSS 4 Migration (Q1 2027)

### Tailwind CSS 3 → 4 Migration
**Timeline:** January - March 2027
**Risk Level:** 🔴 High
**Estimated Effort:** 2-3 weeks

#### Pre-Migration Preparation
- [ ] Verify Node.js 20+ available
- [ ] Review Tailwind CSS v4 upgrade guide
- [ ] Check browser support requirements (Safari 16.4+, Chrome 111+, Firefox 128+)
- [ ] Verify no CSS preprocessor dependencies (Sass/Less/Stylus)
- [ ] Backup current tailwind.config.js
- [ ] Document custom configurations

#### Breaking Change Migration

##### 1. CSS-First Configuration
- [ ] Create new CSS file with @theme directive
- [ ] Migrate colors from tailwind.config.js to @theme
- [ ] Migrate spacing configuration
- [ ] Migrate typography configuration
- [ ] Migrate breakpoints
- [ ] Migrate custom utilities
- [ ] Delete tailwind.config.js

##### 2. Import Syntax Update
- [ ] Find all Tailwind imports in CSS files
- [ ] Replace `@tailwind base;` with `@import 'tailwindcss';`
- [ ] Remove `@tailwind components;`
- [ ] Remove `@tailwind utilities;`
- [ ] Test CSS compilation

##### 3. Default Style Adjustments
- [ ] Audit border color usage (gray-200 → currentColor)
- [ ] Audit ring utilities (width 3px → 1px)
- [ ] Audit ring colors (blue-500 → currentColor)
- [ ] Update placeholder text styles (gray-400 → currentColor 50%)
- [ ] Review button cursor styles (pointer → default)

##### 4. Opacity Utility Migration
- [ ] Find all `bg-opacity-*` usage: `grep -r "bg-opacity" frontend/`
- [ ] Find all `text-opacity-*` usage: `grep -r "text-opacity" frontend/`
- [ ] Convert to new color opacity syntax
- [ ] Test visual output matches

##### 5. Arbitrary Values Update
- [ ] Test all arbitrary value usages (square brackets)
- [ ] Fix any breaking arbitrary value syntax
- [ ] Update custom utility patterns

#### Automated Migration
- [ ] Run Tailwind upgrade tool: `npx @tailwindcss/upgrade@next`
- [ ] Review automated changes
- [ ] Fix any migration errors
- [ ] Update package.json dependencies

#### Visual Regression Testing
- [ ] Create baseline screenshots of all pages
- [ ] Compare post-migration screenshots
- [ ] Fix visual discrepancies
- [ ] Test responsive layouts
- [ ] Test dark mode (if applicable)
- [ ] Test component library

#### Performance Validation
- [ ] Measure CSS build time improvements (expect 3-10x)
- [ ] Measure incremental rebuild speed (expect up to 100x)
- [ ] Verify final CSS bundle size
- [ ] Check browser compatibility

---

## 📅 Phase 6: Recharts 3 Migration (TBD)

### Recharts 2 → 3 Migration
**Timeline:** TBD (After React 19 stable)
**Risk Level:** 🟡 Medium
**Estimated Effort:** 1 week

#### Pre-Migration
- [ ] Wait for React 19 compatibility confirmation
- [ ] Review Recharts 3 changelog
- [ ] Identify breaking changes
- [ ] Audit all chart components in project

#### Migration Tasks
- [ ] Update recharts dependency
- [ ] Review breaking changes documentation
- [ ] Update chart component props
- [ ] Update chart data structures if needed
- [ ] Test all chart visualizations
- [ ] Verify responsive behavior
- [ ] Test tooltip interactions
- [ ] Test legend functionality

#### Chart Testing
- [ ] Service request statistics charts
- [ ] Analytics dashboard charts
- [ ] Any custom data visualizations
- [ ] Export functionality
- [ ] Print layouts

---

## 🎯 Success Metrics

### Overall Migration Goals
- [ ] Zero breaking changes in production
- [ ] Maintain or improve application performance
- [ ] No increase in bundle size (target: decrease)
- [ ] Improved developer experience (faster builds)
- [ ] Enhanced type safety
- [ ] Better maintainability

### Performance Targets
- [ ] Build time: 50% reduction (Turbopack + Tailwind 4)
- [ ] Fast Refresh: < 100ms
- [ ] First Contentful Paint: Maintained or improved
- [ ] Time to Interactive: Maintained or improved
- [ ] Lighthouse score: 90+ maintained

### Quality Gates
- [ ] Zero TypeScript errors
- [ ] Zero console warnings in development
- [ ] All tests passing
- [ ] No visual regressions
- [ ] Cross-browser compatibility maintained
- [ ] Accessibility standards maintained (WCAG 2.1 AA)

---

## 🛠️ Tools & Resources

### Automated Migration Tools
- React codemods: `npx @next/codemod@latest`
- Next.js upgrade tool: `npx @next/codemod@canary upgrade latest`
- Tailwind upgrade tool: `npx @tailwindcss/upgrade@next`
- PostgreSQL: pg_upgrade, pg_dumpall

### Testing Tools
- TypeScript: `npx tsc --noEmit`
- Build test: `npm run build`
- Visual regression: Manual comparison / Screenshot testing
- Performance: Lighthouse, Chrome DevTools

### Monitoring
- [ ] Set up build time tracking
- [ ] Set up bundle size monitoring
- [ ] Set up error tracking for new issues
- [ ] Set up performance monitoring

---

## 📚 Reference Documentation

### Official Guides
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React v19 Release](https://react.dev/blog/2024/12/05/react-19)
- [Next.js 16 Release](https://nextjs.org/blog/next-16)
- [Next.js 16 Migration Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Tailwind CSS 4.0 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [PostgreSQL 16 Release Notes](https://www.postgresql.org/docs/16/release-16.html)

### Community Resources
- [Next.js 16 Real-World Migration](https://michaelpilgram.co.uk/blog/migrating-to-nextjs-16)
- [Tailwind CSS v4 Migration Practical Guide](https://typescript.tv/hands-on/upgrading-to-tailwind-css-v4-a-migration-guide/)
- [React 19 Breaking Changes Community Experiences](https://javascript.plainenglish.io/react-19-just-broke-50-of-my-components-migration-guide-they-didnt-give-you-d0adb91158ef)

---

## 🚧 Risk Mitigation

### General Strategies
- [ ] Always test in development first
- [ ] Create separate feature branches for each migration
- [ ] Maintain rollback capability at each phase
- [ ] Document issues encountered
- [ ] Keep stakeholders informed of progress
- [ ] Schedule migrations during low-traffic periods

### Rollback Procedures
- [ ] Git branches for each migration phase
- [ ] Database backups before PostgreSQL upgrade
- [ ] Docker image versioning
- [ ] Documented rollback steps for each phase

### Communication Plan
- [ ] Create migration status dashboard
- [ ] Weekly status updates to team
- [ ] Post-migration retrospective
- [ ] Documentation updates

---

## 📊 Decision Log

### Why These Specific Versions?
- **React 18:** Stable, widely adopted, production-ready
- **Next.js 14:** Stable App Router, excellent DX, proven in production
- **Tailwind CSS 3:** Mature ecosystem, stable plugins, well-documented
- **PostgreSQL 15:** Reliable, well-tested, meets current needs
- **Node.js 20 LTS:** Long-term support, security updates through 2026

### Why Delay Major Upgrades?
- **React 19:** Released Dec 2024, ecosystem still catching up
- **Next.js 16:** Released Oct 2025, very recent, high-risk changes
- **Tailwind 4:** Complete rewrite, plugin ecosystem immature
- **Combined Risk:** All three together = 6-8 weeks downtime risk

### Strategic Timing
- **Q1 2026:** Safe updates only, no risk
- **Q2 2026:** PostgreSQL (low risk, good ROI)
- **Q3 2026:** Next.js 16 (ecosystem should be stable)
- **Q4 2026:** React 19 (ecosystem maturity expected)
- **Q1 2027:** Tailwind 4 (plugin ecosystem mature)

---

## 📝 Notes

### Current Stable Configuration (Updated January 16, 2026)
```json
{
  "node": "20.19.5",
  "next": "14.2.35",
  "react": "18.3.1",
  "tailwindcss": "3.4.19",
  "typescript": "5.9.3",
  "postgres": "15-alpine",
  "docker": "29.1.5",
  "traefik": "v3.6.7",
  "swr": "2.3.8",
  "zod": "4.3.5",
  "pg": "8.17.1"
}
```

### Post-Migration Target Configuration
```json
{
  "node": "20.x (LTS)",
  "next": "16.x",
  "react": "19.x",
  "tailwindcss": "4.x",
  "typescript": "5.x",
  "postgres": "16-alpine",
  "docker": "29.x (current)",
  "traefik": "v3.6+ (current)"
}
```

---

## ✅ Approval & Sign-off

- [ ] Technical Lead Review
- [ ] Architecture Review
- [ ] Security Review
- [ ] DevOps Review
- [ ] Stakeholder Approval
- [ ] Budget Approval (development time allocation)

---

**Document Status:** 📋 Planning
**Next Review Date:** 2026-02-01
**Owner:** Development Team
**Last Updated:** 2026-01-14
