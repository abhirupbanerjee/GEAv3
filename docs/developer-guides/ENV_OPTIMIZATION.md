# Environment Configuration Optimization Guide

## Executive Summary

This document details the analysis, cleanup, and optimization of the `.env` configuration file for the Government of Grenada EA Portal. It explains the architectural decisions made to reduce redundancy and clarify the separation between build-time and runtime configuration.

---

## Problem Statement

### Original Issues

1. **Duplicate Variables** - 21 settings existed in BOTH `.env` and database, causing confusion
2. **Build-Time Lock-in** - env.ts generated at Docker build locked values, making database settings ineffective
3. **Inconsistent Source of Truth** - Same settings in multiple places with different values
4. **Dead Code** - Unused variables (COPYRIGHT_YEAR, DMS_URL, GIT_URL) cluttering configuration

### Impact

- Database settings changes ignored by application
- Admin UI misleading (appears to work but changes have no effect)
- Docker rebuilds required for runtime-configurable settings
- Confusion about which configuration source controls each setting

---

## Architectural Analysis

### How env.ts Works

**Development Mode:**
- `frontend/src/config/env.ts` reads from `process.env` at runtime
- Values come from local `.env.local` or `.env` file
- Changes apply immediately (no rebuild needed)

**Production Mode (Docker):**
- `frontend/Dockerfile` generates env.ts at BUILD TIME (lines 61-92)
- Environment variables are hard-coded into the Docker image
- Changes require full Docker rebuild to take effect

### The Build-Time Generation Problem

```bash
# In Dockerfile (lines 61-92)
RUN echo "export const config = {" > src/config/env.ts && \
    echo "  SITE_NAME: '${SITE_NAME}'," >> src/config/env.ts && \
    # ... more variables
```

**Consequence:** All values in env.ts become **static at build time**, making database settings useless.

### Resolution Order

When a setting exists in multiple places, the resolution order is:

1. **Build-time env.ts** (production only) - Highest priority, baked into image
2. **process.env** (development) - Environment variables at runtime
3. **Database settings** - Via `getSetting()` function
4. **Fallback defaults** - Hardcoded in code

**Result:** In production, database settings are **never consulted** if the value exists in env.ts.

---

## Phase 1: Quick Wins (Implemented)

### Task 1.1: Remove Dead Code

**Removed Variables:**
- `DMS_URL` - Completely unused
- `GIT_URL` - Completely unused

**Files Modified:**
- `frontend/Dockerfile` - Removed ARG declarations and env.ts generation
- `docker-compose.yml` - Removed build args
- `frontend/src/config/env.ts` - Removed variable definitions

**Impact:**
- ✅ Reduced .env clutter
- ✅ Cleaner Dockerfile
- ✅ No functional impact (variables were unused)

### Task 1.2: Disable SITE_NAME in UI

**Problem:** SITE_NAME appears editable in Admin UI but changes are ignored

**Solution:** Made field read-only with guidance text

**Files Modified:**
- `frontend/src/app/admin/settings/page.tsx`
  - Added special case in `renderSettingInput()` function
  - Field displays value from `process.env.NEXT_PUBLIC_SITE_NAME`
  - Disabled styling (grey background, cursor-not-allowed)
  - Added blue info box with instructions

**User Experience:**
```
[SITE_NAME Input - Disabled]
Value: Government of Grenada - EA Portal

ℹ️ To change the site name, update the NEXT_PUBLIC_SITE_NAME
   variable in the .env file and rebuild the application using
   docker compose up -d --build
```

### Task 1.3: Prevent SITE_NAME Saves

**Problem:** API still accepts SITE_NAME updates even though they're ignored

**Solution:** Added validation in API route

**Files Modified:**
- `frontend/src/app/api/admin/settings/route.ts`
  - Added `ENV_CONTROLLED_SETTINGS` constant
  - Check in POST handler skips environment-controlled settings
  - Returns error message explaining .env file requirement

**Result:**
```javascript
const ENV_CONTROLLED_SETTINGS = ['SITE_NAME'];

for (const { key, value } of settings) {
  if (ENV_CONTROLLED_SETTINGS.includes(key)) {
    results.push({
      key,
      success: false,
      message: 'SITE_NAME is controlled by the .env file...'
    });
    continue;
  }
  // ... normal update logic
}
```

### Task 1.4: Remove COPYRIGHT_YEAR

**Problem:** COPYRIGHT_YEAR exists in database but is unused (footer uses FOOTER_COPYRIGHT_TEXT)

**Solution:** Created migration and updated init script

**Files Created:**
- `database/scripts/99-remove-copyright-year.sh`
  - Deletes COPYRIGHT_YEAR from system_settings
  - Logs removal in audit log
  - Safe to run multiple times (idempotent)

**Files Modified:**
- `database/scripts/16-create-system-settings.sh`
  - Commented out COPYRIGHT_YEAR line with explanation
  - Prevents setting from being recreated in new installations

**Impact:**
- ✅ Cleaner settings UI
- ✅ No confused admins about copyright year
- ✅ Single source of truth (FOOTER_COPYRIGHT_TEXT)

### Task 1.5: Documentation

**Documents Created:**

1. **ADMIN_GUIDE.md** - Administrator-facing guide
   - How to change site name
   - Environment vs runtime settings
   - Troubleshooting common issues
   - Best practices

2. **ENV_OPTIMIZATION.md** - This document
   - Technical architecture explanation
   - Phase-by-phase implementation details
   - Future optimization recommendations

3. **README.md Updates** - Project documentation
   - Configuration section added
   - Links to admin guide
   - Quick reference for environment variables

---

## Variable Classification

### ✅ Keep in .env (Build-Time / Security)

These variables **must** remain in `.env`:

| Variable | Reason |
|----------|--------|
| `NODE_ENV` | Build-time decision (production vs development) |
| `NEXT_PUBLIC_FRONTEND_URL` | Build-time embed in client code |
| `NEXT_PUBLIC_SITE_NAME` | Metadata generation at build time |
| `NEXT_PUBLIC_SITE_SHORT_NAME` | Used in multiple components at build time |
| `SENDGRID_API_KEY` | Security - secret credential |
| `ADMIN_PASSWORD` | Security - secret credential |
| `ADMIN_SESSION_SECRET` | Security - secret credential |
| `NEXTAUTH_SECRET` | Security - secret credential |
| `GOOGLE_CLIENT_SECRET` | Security - OAuth secret |
| `MICROSOFT_CLIENT_SECRET` | Security - OAuth secret |
| `EXTERNAL_API_KEY` | Security - API secret |
| `FEEDBACK_DB_HOST` | Infrastructure configuration |
| `FEEDBACK_DB_PORT` | Infrastructure configuration |
| `FEEDBACK_DB_NAME` | Infrastructure configuration |
| `FEEDBACK_DB_USER` | Infrastructure configuration |
| `FEEDBACK_DB_PASSWORD` | Security - database credential |
| `TRAEFIK_DOMAIN` | Infrastructure configuration |
| `LETS_ENCRYPT_EMAIL` | Infrastructure configuration |

### ⚠️ Already in Database (Runtime-Configurable)

These are correctly implemented as database settings:

| Setting Key | Category | Usage |
|-------------|----------|-------|
| `FOOTER_COPYRIGHT_TEXT` | CONTENT | Footer copyright notice |
| `WELCOME_BANNER_TITLE` | CONTENT | Homepage banner |
| `ABOUT_HEADING` | CONTENT | About section heading |
| `SESSION_DURATION_HOURS` | SYSTEM | Admin session timeout |
| `BACKUP_SCHEDULE_TYPE` | SYSTEM | Backup frequency |
| `BACKUP_RETENTION_DAYS` | SYSTEM | Backup retention policy |

### 🔄 Could Be Migrated (Future Optimization)

These variables could potentially move to database for runtime configuration:

| .env Variable | Current Issue | Migration Complexity |
|---------------|---------------|---------------------|
| `SENDGRID_FROM_EMAIL` | In env.ts, could be runtime | LOW |
| `SENDGRID_FROM_NAME` | In env.ts, could be runtime | LOW |
| `SERVICE_ADMIN_EMAIL` | Partially in DB already | MEDIUM |
| `ABOUT_CONTACT_EMAIL` | Partially in DB already | MEDIUM |
| `MAX_FILE_SIZE` | In env.ts, could be runtime | LOW |
| `MAX_TOTAL_UPLOAD_SIZE` | In env.ts, could be runtime | LOW |
| `ALLOWED_FILE_TYPES` | In env.ts, could be runtime | MEDIUM |
| `EA_SERVICE_RATE_LIMIT` | In env.ts, could be runtime | LOW |
| `GRIEVANCE_RATE_LIMIT` | In env.ts, could be runtime | LOW |
| `FEEDBACK_RATE_LIMIT` | In .env only, could be in DB | LOW |

---

## Phase 2: Medium Priority (Not Yet Implemented)

### Overview

Phase 2 focuses on migrating runtime-configurable settings from `.env` to database, eliminating the need for Docker rebuilds when adjusting operational parameters.

**Estimated Effort:** 7 hours
**Risk Level:** LOW-MEDIUM
**Prerequisites:** Phase 1 complete

### 2.1: Add New Database Settings Categories

**Goal:** Create organized categories for runtime settings

**New Categories:**
1. **Email Configuration**
   - SENDGRID_FROM_EMAIL
   - SENDGRID_FROM_NAME
   - SERVICE_ADMIN_EMAIL
   - ABOUT_CONTACT_EMAIL

2. **File Upload Limits**
   - MAX_FILE_SIZE
   - MAX_TOTAL_UPLOAD_SIZE
   - ALLOWED_FILE_TYPES

3. **Rate Limiting**
   - EA_SERVICE_RATE_LIMIT
   - GRIEVANCE_RATE_LIMIT
   - FEEDBACK_RATE_LIMIT

4. **External URLs**
   - GOG_URL
   - ESERVICES_URL
   - CONSTITUTION_URL
   - CHATBOT_URL

**Implementation:**
- Create database migration script
- Add settings to `system_settings` table
- Create Settings UI sections
- Update `lib/settings.ts` with new getters

### 2.2: Remove env.ts Build-Time Generation

**Goal:** Stop baking values into Docker image

**Current Behavior:**
```bash
# In Dockerfile
RUN echo "export const config = {" > src/config/env.ts && \
    echo "  SENDGRID_FROM_EMAIL: '${SENDGRID_FROM_EMAIL}'," >> ...
```

**New Behavior:**
```typescript
// In env.ts
export const config = {
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ||
                       await getSetting('SENDGRID_FROM_EMAIL') ||
                       'noreply@example.com',
}
```

**Challenges:**
- Cannot use `await` in module-level code
- Need to handle both client and server components
- Must maintain backward compatibility during transition

**Recommended Approach:**
- Keep process.env fallbacks for development
- Use `getSetting()` in server components
- Use context/state for client components

### 2.3: Update Code to Read from Database

**Goal:** Change all references from `config.VARIABLE` to database lookups

**Pattern:**
```typescript
// OLD
import { config } from '@/config/env'
const email = config.SENDGRID_FROM_EMAIL

// NEW
import { getSetting } from '@/lib/settings'
const email = await getSetting('SENDGRID_FROM_EMAIL', process.env.SENDGRID_FROM_EMAIL)
```

**Files Requiring Updates:** 13 files identified in Phase 1 analysis
- API routes (server-side)
- Server components
- Utility functions

**Client Components:**
- Cannot directly use `getSetting()` (async database query)
- Must use API endpoints or server-side props
- Update to fetch from `/api/settings/public`

---

## Phase 3: Future Enhancements (Optional)

### Overview

Phase 3 represents longer-term architectural improvements that would require significant refactoring.

**Estimated Effort:** 2+ days
**Risk Level:** HIGH
**Status:** Future consideration

### 3.1: Dynamic Metadata Generation

**Goal:** Allow site name changes without Docker rebuild

**Challenge:** Next.js `generateMetadata()` runs at build time for performance

**Current:**
```typescript
export async function generateMetadata() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'EA Portal'
  return { title: siteName }
}
```

**Potential Solutions:**

**Option A: Client-Side Title Update**
```typescript
// In layout.tsx
useEffect(() => {
  const fetchSiteName = async () => {
    const name = await fetch('/api/settings/public/SITE_NAME')
    document.title = name
  }
  fetchSiteName()
}, [])
```
❌ SEO impact - crawlers see old title
❌ Flash of old title before update
✅ No rebuild needed

**Option B: Edge Runtime with Database**
```typescript
export const runtime = 'edge'
export async function generateMetadata() {
  const siteName = await getSetting('SITE_NAME')
  return { title: siteName }
}
```
⚠️ Requires edge-compatible database client
⚠️ Potential performance impact
✅ Proper SEO
✅ No rebuild needed

**Recommendation:** Keep current approach (env-controlled) unless frequent site name changes are required.

### 3.2: Centralized Configuration Service

**Goal:** Single source of truth for all configuration

**Vision:**
- GraphQL or REST API for all settings
- Real-time updates via WebSockets
- Configuration versioning and rollback
- Multi-environment support

**Benefits:**
- No more env.ts confusion
- True runtime configuration
- Audit trail for all changes
- Easy configuration replication across environments

**Challenges:**
- Major architectural change
- Migration complexity
- Testing overhead
- Performance considerations

---

## Migration Guide

### For Administrators

**After Phase 1 Implementation:**

1. **To change site name:**
   ```bash
   # Edit .env file
   nano .env
   # Update: NEXT_PUBLIC_SITE_NAME=New Name

   # Rebuild
   docker compose down
   docker compose up -d --build
   ```

2. **Variables to remove from .env:**
   - `DMS_URL` (removed)
   - `GIT_URL` (removed)
   - `COPYRIGHT_YEAR` (if present)
   - `NEXT_PUBLIC_COPYRIGHT_YEAR` (if present)

3. **Check .env file permissions:**
   ```bash
   chmod 600 .env
   ls -la .env
   # Should show: -rw------- (only owner can read/write)
   ```

### For Developers

**After Phase 1 Implementation:**

1. **Never reference DMS_URL or GIT_URL** - they've been removed

2. **To add new environment-controlled setting:**
   - Add to `ENV_CONTROLLED_SETTINGS` array in settings API
   - Add special case in settings page UI
   - Document in ADMIN_GUIDE.md

3. **To move setting from .env to database:**
   - Create database migration
   - Add to `system_settings` table
   - Update all code references to use `getSetting()`
   - Remove from Dockerfile env.ts generation
   - Test thoroughly in development

---

## Testing Checklist

### Phase 1 Testing

- [ ] Verify DMS_URL and GIT_URL removed from all files
- [ ] Verify SITE_NAME field is disabled in Settings UI
- [ ] Verify SITE_NAME shows guidance message
- [ ] Verify attempting to save SITE_NAME returns error
- [ ] Verify COPYRIGHT_YEAR removed from database
- [ ] Verify COPYRIGHT_YEAR not in Settings UI
- [ ] Verify site name changes via .env after rebuild
- [ ] Verify documentation links work

### Phase 2 Testing (Future)

- [ ] Verify rate limits update without rebuild
- [ ] Verify email settings update without rebuild
- [ ] Verify file upload limits update without rebuild
- [ ] Verify all 13 code files use new pattern
- [ ] Verify client components get settings correctly
- [ ] Verify fallbacks work when database unavailable

---

## Performance Impact

### Phase 1

**Build Time:**
- ✅ Slightly faster (2 fewer ARG declarations, 2 fewer echo statements)

**Runtime:**
- ✅ No impact (removed unused code)
- ✅ Settings page load unaffected (one additional conditional check)

### Phase 2 (Estimated)

**Build Time:**
- ✅ Significantly faster (remove entire env.ts generation block)
- ✅ Smaller Docker image (less baked-in configuration)

**Runtime:**
- ⚠️ Slight increase in database queries (cached via getSetting)
- ✅ 5-minute cache on settings reduces impact
- ✅ No rebuild downtime for configuration changes

---

## Security Considerations

### Secrets Management

**Current Approach:**
- All secrets in `.env` file
- File permissions restrict access
- Never committed to version control
- Separate secrets for dev/prod

**Best Practices:**
1. Use strong, randomly generated secrets
2. Rotate secrets periodically
3. Use secret management service in production (e.g., AWS Secrets Manager)
4. Never log secrets
5. Never expose secrets to client code

### Database Settings Security

**Safe to Store in Database:**
- Email display names
- Rate limit values
- File size limits
- Feature toggle flags
- UI text and labels

**Never Store in Database:**
- API keys
- Passwords
- OAuth secrets
- Database credentials
- Encryption keys

---

## Rollback Procedures

### Phase 1 Rollback

**To Restore DMS_URL/GIT_URL:**
1. Revert commits to `frontend/Dockerfile`
2. Revert commits to `docker-compose.yml`
3. Revert commits to `frontend/src/config/env.ts`
4. Rebuild containers

**To Restore COPYRIGHT_YEAR:**
```sql
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
VALUES ('COPYRIGHT_YEAR', '2025', 'string', 'SYSTEM', 'General', 'Copyright Year', 'Year displayed in footer copyright notice', '2025', true, 3);
```

**To Re-enable SITE_NAME Editing:**
- Remove special case in `frontend/src/app/admin/settings/page.tsx`
- Remove validation in `frontend/src/app/api/admin/settings/route.ts`

---

## Maintenance

### Regular Tasks

**Monthly:**
- Review settings audit log
- Check for unused settings
- Verify .env file permissions
- Update documentation if settings change

**Quarterly:**
- Audit all environment variables
- Review security credentials
- Test configuration backup/restore
- Update admin guide with new features

**Annually:**
- Rotate all secrets and credentials
- Review Phase 2/3 implementation feasibility
- Analyze settings usage patterns
- Consider new configuration requirements

---

## References

### Related Documents
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) - Administrator configuration guide
- [README.md](../../README.md) - Project documentation
- [Implementation Plan](/.claude/plans/implementation-plan-with-complexity.md) - Original implementation plan

### External Resources
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Docker Build Arguments](https://docs.docker.com/engine/reference/builder/#arg)
- [Twelve-Factor App - Config](https://12factor.net/config)

---

## Changelog

### 2026-02-20 - v1.0
- Initial document creation
- Phase 1 implementation complete
- Documented architectural analysis
- Added migration guides and testing checklists

---

**Document Version:** 1.0
**Last Updated:** 2026-02-20
**Status:** Phase 1 Complete, Phase 2-3 Future Planning
**Maintained By:** Development Team
