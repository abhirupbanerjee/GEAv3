# Docker Environment Variable Build Process

## Overview

This guide explains how environment variables flow from `.env` files to the frontend application in both local development and production Docker builds. Understanding this process is critical when adding new environment variables to avoid build failures.

## Table of Contents

1. [Two Different Approaches](#two-different-approaches)
2. [Local Development Flow](#local-development-flow)
3. [Docker Production Build Flow](#docker-production-build-flow)
4. [Complete Flow Diagram](#complete-flow-diagram)
5. [Adding New Environment Variables](#adding-new-environment-variables)
6. [Real-World Example](#real-world-example)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Two Different Approaches

### Local Development (npm run dev)
- Uses the **version-controlled** `frontend/src/config/env.ts` file
- Reads values from `process.env.NEXT_PUBLIC_*` at runtime
- Changes to `env.ts` take effect immediately
- `.env` file is loaded by Next.js automatically

### Production Docker Build (docker compose build)
- **REGENERATES** `env.ts` file completely during build
- Uses Dockerfile ARG values from docker-compose.yml
- **OVERWRITES** the version-controlled `env.ts` file
- Generated `env.ts` is baked into the Docker image
- Changes to version-controlled `env.ts` are **IGNORED**

---

## Local Development Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOCAL DEVELOPMENT                          │
└─────────────────────────────────────────────────────────────────┘

   .env file                    Next.js Runtime              Application
   ┌──────────┐                 ┌──────────────┐            ┌──────────┐
   │ NEXT_    │   Auto-loaded   │ process.env  │   Reads    │  React   │
   │ PUBLIC_  │ ───────────────>│ .NEXT_PUBLIC │ ────────>  │Components│
   │ VAR=val  │    by Next.js   │    _VAR      │   from     │          │
   └──────────┘                 └──────────────┘  env.ts    └──────────┘
                                        │
                                        │ Referenced by
                                        ▼
                                ┌──────────────┐
                                │ src/config/  │
                                │   env.ts     │ (version-controlled file)
                                │              │
                                │ export const │
                                │ config = {   │
                                │   VAR: process│
                                │     .env.VAR │
                                │ }            │
                                └──────────────┘
```

### Example: Local Development

**File: `.env`**
```bash
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME="Digital Transformation Agency"
```

**File: `frontend/src/config/env.ts`** (version-controlled)
```typescript
export const config = {
  SERVICE_REQUEST_ENTITY_ID: process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID || 'AGY-005',
  SERVICE_REQUEST_ENTITY_NAME: process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME || 'Digital Transformation Agency',
}
```

**Usage in Components:**
```typescript
import { config } from '@/config/env';

const MyComponent = () => {
  const entityId = config.SERVICE_REQUEST_ENTITY_ID; // 'AGY-005'
  const entityName = config.SERVICE_REQUEST_ENTITY_NAME; // 'Digital Transformation Agency'
  // ...
}
```

---

## Docker Production Build Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOCKER PRODUCTION BUILD                                 │
└─────────────────────────────────────────────────────────────────────────────┘

.env file              docker-compose.yml        Dockerfile              Generated env.ts
┌──────────┐           ┌────────────────┐        ┌────────────┐          ┌──────────────┐
│ NEXT_    │  Passed   │ build:         │ Passed │ ARG NEXT_  │  Echo    │ export const │
│ PUBLIC_  │  as env   │   args:        │   as   │   PUBLIC_  │ commands │ config = {   │
│ VAR=val  │ ───────>  │ - VAR=${VAR}   │  ARG   │   VAR      │ ──────>  │   VAR: 'val' │
└──────────┘  variable └────────────────┘        │            │  create  │ }            │
                                                  │ RUN echo   │  file    └──────────────┘
                                                  │ "VAR:'$VAR"│               │
                                                  │ >>env.ts   │               │
                                                  └────────────┘               │
                                                                               │
                                                       OVERWRITES              ▼
                                                                    ┌──────────────────┐
                                                                    │ Version-controlled│
                                                                    │ env.ts (IGNORED) │
                                                                    └──────────────────┘
```

### Step-by-Step Docker Build Process

#### Step 1: `.env` File
Located at project root: `/home/ab/Projects/gogeaportal/v3/.env`

```bash
# Service Request Configuration
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME="Digital Transformation Agency"
```

#### Step 2: `docker-compose.yml` Build Args
Located at: `/home/ab/Projects/gogeaportal/v3/docker-compose.yml`

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        # Passes .env values to Docker build process
        - NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID:-AGY-005}
        - NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME=${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME:-"Digital Transformation Agency"}
```

**Syntax Explanation:**
- `${VAR:-default}` - Use `.env` value if set, otherwise use `default`
- The value from `.env` is passed to Dockerfile as a build argument

#### Step 3: Dockerfile ARG Declaration
Located at: `/home/ab/Projects/gogeaportal/v3/frontend/Dockerfile`

```dockerfile
# Line 42-43
ARG NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005
ARG NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME="Digital Transformation Agency"
```

**Purpose:**
- Declares the build argument
- Provides a default fallback value
- Makes the value available to subsequent RUN commands

#### Step 4: Dockerfile env.ts Generation
Located at: `/home/ab/Projects/gogeaportal/v3/frontend/Dockerfile` (lines 61-92)

```dockerfile
# Generate env.ts from build arguments
RUN echo "// Auto-generated during Docker build" > src/config/env.ts && \
    echo "export const config = {" >> src/config/env.ts && \
    echo "  DMS_URL: '${DMS_URL}'," >> src/config/env.ts && \
    echo "  GIT_URL: '${GIT_URL}'," >> src/config/env.ts && \
    # ... other variables ...
    echo "  SERVICE_REQUEST_ENTITY_ID: '${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID}'," >> src/config/env.ts && \
    echo "  SERVICE_REQUEST_ENTITY_NAME: '${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME}'," >> src/config/env.ts && \
    echo "  API_BASE_URL: '${API_BASE_URL}'," >> src/config/env.ts && \
    echo "  appUrl: '${NEXT_PUBLIC_FRONTEND_URL}'," >> src/config/env.ts && \
    echo "};" >> src/config/env.ts && \
    echo "export type Config = typeof config;" >> src/config/env.ts

# Verify generation
RUN cat src/config/env.ts && echo "✅ env.ts generated successfully"
```

**What Happens:**
1. `>` overwrites the file (first echo)
2. `>>` appends to the file (subsequent echoes)
3. Shell variable substitution `${VAR}` replaces with ARG value
4. Creates a complete TypeScript file with hardcoded values
5. Version-controlled `env.ts` is completely replaced

#### Step 5: Generated env.ts Output

The Docker build creates this file at `frontend/src/config/env.ts`:

```typescript
// Auto-generated during Docker build
export const config = {
  DMS_URL: 'https://example.com/dms',
  GIT_URL: 'https://github.com/example/repo',
  // ... other config ...
  SERVICE_REQUEST_ENTITY_ID: 'AGY-005',
  SERVICE_REQUEST_ENTITY_NAME: 'Digital Transformation Agency',
  API_BASE_URL: 'https://api.example.com',
  appUrl: 'https://portal.example.com',
};
export type Config = typeof config;
```

**Key Differences from Version-Controlled env.ts:**
- No `process.env` references
- Values are hardcoded strings
- Completely static (no runtime environment variable access)
- Baked into the Docker image

---

## Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ADDING A NEW ENVIRONMENT VARIABLE                          │
└──────────────────────────────────────────────────────────────────────────────┘

Step 1: Add to .env
━━━━━━━━━━━━━━━━━━━
.env
├─> NEXT_PUBLIC_NEW_VARIABLE=value
│
│
Step 2: Add to docker-compose.yml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
├─> docker-compose.yml
│   └─> build:
│       └─> args:
│           └─> - NEXT_PUBLIC_NEW_VARIABLE=${NEXT_PUBLIC_NEW_VARIABLE:-default}
│
│
Step 3: Add ARG to Dockerfile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
├─> frontend/Dockerfile
│   └─> ARG NEXT_PUBLIC_NEW_VARIABLE=default
│
│
Step 4: Add to env.ts generation in Dockerfile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
├─> frontend/Dockerfile (env.ts generation section)
│   └─> echo "  NEW_VARIABLE: '${NEXT_PUBLIC_NEW_VARIABLE}'," >> src/config/env.ts && \
│
│
Step 5: Add to version-controlled env.ts (for local dev)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
└─> frontend/src/config/env.ts
    └─> export const config = {
        └─> NEW_VARIABLE: process.env.NEXT_PUBLIC_NEW_VARIABLE || 'default',

┌──────────────────────────────────────────────────────────────────────────────┐
│                              RESULT                                           │
└──────────────────────────────────────────────────────────────────────────────┘

Local Development:                   Production Docker Build:
├─> Uses version-controlled env.ts   ├─> Uses generated env.ts
├─> Reads from process.env           ├─> Hardcoded values from ARG
└─> .env auto-loaded by Next.js      └─> No runtime env access needed
```

---

## Adding New Environment Variables

### Complete Checklist

When adding a new environment variable, you must update **5 locations**:

#### ✅ Location 1: `.env` File
**File:** `/home/ab/Projects/gogeaportal/v3/.env`

```bash
# Add your new variable
NEXT_PUBLIC_NEW_VARIABLE=my_value
```

#### ✅ Location 2: docker-compose.yml Build Args
**File:** `/home/ab/Projects/gogeaportal/v3/docker-compose.yml`

```yaml
services:
  frontend:
    build:
      args:
        # Add your new variable with fallback
        - NEXT_PUBLIC_NEW_VARIABLE=${NEXT_PUBLIC_NEW_VARIABLE:-default_value}
```

#### ✅ Location 3: Dockerfile ARG Declaration
**File:** `/home/ab/Projects/gogeaportal/v3/frontend/Dockerfile`

```dockerfile
# Add after other ARG declarations (around line 42)
ARG NEXT_PUBLIC_NEW_VARIABLE=default_value
```

#### ✅ Location 4: Dockerfile env.ts Generation
**File:** `/home/ab/Projects/gogeaportal/v3/frontend/Dockerfile`

```dockerfile
# Add to the env.ts generation section (around line 87)
# IMPORTANT: Must be BEFORE the closing }; and export type lines
echo "  NEW_VARIABLE: '${NEXT_PUBLIC_NEW_VARIABLE}'," >> src/config/env.ts && \
```

**⚠️ Critical Notes:**
- Must include the trailing `&& \` for shell command continuation
- Must be before the `echo "}"` line
- Use single quotes around `${VAR}` in the echo statement
- Include the comma after the value

#### ✅ Location 5: Version-Controlled env.ts
**File:** `/home/ab/Projects/gogeaportal/v3/frontend/src/config/env.ts`

```typescript
export const config = {
  // Add your new variable with process.env reference and fallback
  NEW_VARIABLE: process.env.NEXT_PUBLIC_NEW_VARIABLE || 'default_value',

  // ... other config
}
```

### Verification Steps

After making changes:

1. **Local Development Test:**
   ```bash
   cd frontend
   npm run dev
   # Verify no TypeScript errors
   # Check that config.NEW_VARIABLE is accessible
   ```

2. **Docker Build Test:**
   ```bash
   docker compose build frontend
   # Look for: "✅ env.ts generated successfully"
   # Verify your variable appears in the output
   ```

3. **Check Generated env.ts:**
   ```bash
   docker compose build frontend 2>&1 | grep -A 50 "env.ts generated successfully"
   # Should show your new variable with its value
   ```

4. **TypeScript Compilation:**
   ```bash
   docker compose build frontend
   # Should complete without TypeScript errors
   # Look for: "Compiled successfully"
   ```

---

## Real-World Example

### Problem: Adding SERVICE_REQUEST_ENTITY_NAME

**Context:** We needed to add `NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME` to the configuration to display the default entity name in the admin users page.

**Initial State:**
- ✅ Local `env.ts` had the variable
- ✅ `.env` had the variable
- ❌ Dockerfile ARG missing
- ❌ Dockerfile env.ts generation missing
- ❌ docker-compose.yml build arg missing

**Build Error:**
```
Type error: Property 'SERVICE_REQUEST_ENTITY_NAME' does not exist on type '{
  DMS_URL: string;
  GIT_URL: string;
  ...
  SERVICE_REQUEST_ENTITY_ID: string;  // This existed
  // SERVICE_REQUEST_ENTITY_NAME missing!
}'
```

**Why It Failed:**
1. Docker regenerated `env.ts` during build
2. The generated `env.ts` didn't include `SERVICE_REQUEST_ENTITY_NAME`
3. TypeScript code referenced `config.SERVICE_REQUEST_ENTITY_NAME`
4. TypeScript compiler found the type mismatch → build failed

### Solution: 5-Location Update

#### Change 1: .env (Already Existed)
```bash
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME="Digital Transformation Agency"
```

#### Change 2: docker-compose.yml (Line 131 - ADDED)
```yaml
# Service Request Configuration
- NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID:-AGY-005}
- NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME=${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME:-"Digital Transformation Agency"}
```

#### Change 3: Dockerfile ARG (Line 43 - ADDED)
```dockerfile
ARG NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005
ARG NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME="Digital Transformation Agency"
```

#### Change 4: Dockerfile env.ts Generation (Line 87 - ADDED)
```dockerfile
echo "  SERVICE_REQUEST_ENTITY_ID: '${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID}'," >> src/config/env.ts && \
echo "  SERVICE_REQUEST_ENTITY_NAME: '${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME}'," >> src/config/env.ts && \
echo "  API_BASE_URL: '${API_BASE_URL}'," >> src/config/env.ts && \
```

#### Change 5: Version-Controlled env.ts (Line 33 - ADDED)
```typescript
// Service Request Configuration
SERVICE_REQUEST_ENTITY_ID: process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID || 'AGY-005',
SERVICE_REQUEST_ENTITY_NAME: process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME || 'Digital Transformation Agency',
```

### Result: Build Success ✅

**Generated env.ts (Docker Build Output):**
```typescript
// Auto-generated during Docker build
export const config = {
  // ... other config ...
  SERVICE_REQUEST_ENTITY_ID: 'AGY-005',
  SERVICE_REQUEST_ENTITY_NAME: 'Digital Transformation Agency',
  API_BASE_URL: 'https://api.example.com',
  appUrl: 'https://portal.example.com',
};
export type Config = typeof config;
```

**TypeScript Compilation:** ✅ Passed
**Local Development:** ✅ Working
**Production Build:** ✅ Working

---

## Troubleshooting

### Issue 1: TypeScript Error - Property Does Not Exist

**Symptom:**
```
Type error: Property 'MY_VAR' does not exist on type '{ ... }'
```

**Diagnosis:**
- Variable exists in version-controlled `env.ts`
- Variable NOT in Dockerfile env.ts generation
- Docker build regenerates `env.ts` without your variable
- TypeScript sees the missing property

**Solution:**
Add the variable to Dockerfile env.ts generation (see Location 4 above)

---

### Issue 2: Variable is Undefined in Production

**Symptom:**
- Works locally (`npm run dev`)
- Undefined in Docker container

**Diagnosis:**
Check the flow:

```bash
# 1. Is it in .env?
cat .env | grep MY_VAR

# 2. Is it in docker-compose.yml?
cat docker-compose.yml | grep MY_VAR

# 3. Is it in Dockerfile ARG?
cat frontend/Dockerfile | grep "ARG.*MY_VAR"

# 4. Is it in env.ts generation?
cat frontend/Dockerfile | grep "MY_VAR.*>>"
```

**Solution:**
Missing from one of the 5 locations (see checklist above)

---

### Issue 3: Build Fails with "Unexpected Token"

**Symptom:**
```
RUN echo "  MY_VAR: '${MY_VAR}'," >> src/config/env.ts
       ^^^^^^
Unexpected token
```

**Diagnosis:**
- Missing `&& \` at end of previous line
- Shell command chain broken

**Solution:**
Ensure every echo line except the last has `&& \` at the end:

```dockerfile
echo "  VAR1: '${VAR1}'," >> src/config/env.ts && \
echo "  VAR2: '${VAR2}'," >> src/config/env.ts && \
echo "  VAR3: '${VAR3}'," >> src/config/env.ts    # Last line - no && \
```

---

### Issue 4: Variable Shows as Literal "${VAR}"

**Symptom:**
Generated `env.ts` contains:
```typescript
MY_VAR: '${MY_VAR}',  // Literal string instead of value
```

**Diagnosis:**
- ARG not declared in Dockerfile
- Shell variable substitution failed

**Solution:**
Add ARG declaration before using the variable:
```dockerfile
ARG MY_VAR=default
```

---

### Issue 5: Changes to env.ts Not Appearing in Production

**Symptom:**
- Updated version-controlled `env.ts`
- Changes don't appear in Docker build

**Diagnosis:**
- Docker regenerates `env.ts` - your changes are overwritten
- This is **expected behavior**

**Solution:**
Don't modify version-controlled `env.ts` for production changes. Instead:
1. Update `.env` file
2. Update Dockerfile ARG value
3. Update Dockerfile env.ts generation
4. Rebuild Docker image

---

## Best Practices

### 1. Always Use NEXT_PUBLIC_ Prefix for Frontend Variables

**Why:**
- Next.js only exposes `NEXT_PUBLIC_*` variables to the browser
- Non-prefixed variables are server-side only
- Consistent naming prevents confusion

**Example:**
```bash
# ✅ Good - Available in frontend
NEXT_PUBLIC_API_URL=https://api.example.com

# ❌ Bad - Not available in browser
API_URL=https://api.example.com
```

---

### 2. Provide Sensible Fallback Values

**Why:**
- Prevents undefined values if `.env` is missing
- Self-documenting defaults
- Fresh VM setups work immediately

**Example:**
```typescript
// ✅ Good - Has fallback
SERVICE_REQUEST_ENTITY_ID: process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID || 'AGY-005',

// ❌ Bad - Could be undefined
SERVICE_REQUEST_ENTITY_ID: process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID,
```

---

### 3. Keep Defaults in Sync Across All 5 Locations

**Why:**
- Prevents configuration drift
- Ensures consistent behavior
- Easier maintenance

**Locations to Match:**
1. `.env` file: `NEXT_PUBLIC_MY_VAR=value`
2. docker-compose.yml: `${NEXT_PUBLIC_MY_VAR:-value}`
3. Dockerfile ARG: `ARG NEXT_PUBLIC_MY_VAR=value`
4. Dockerfile echo: `'${NEXT_PUBLIC_MY_VAR}'`
5. env.ts: `process.env.NEXT_PUBLIC_MY_VAR || 'value'`

---

### 4. Document Your Environment Variables

**Example .env Template:**
```bash
# ============================================
# SERVICE REQUEST CONFIGURATION
# ============================================

# Entity ID that receives service requests and serves as default for admin users
# Default: AGY-005 (Digital Transformation Agency)
#
# OPTIONAL: Both values have hardcoded fallbacks
# Only set these if you need to change which entity is the default
#
# The entity ID must match an entity in the entity_master table
# The entity name is used as a fallback if the database is unavailable
#
# Examples:
#   AGY-002 (Royal Grenada Police Force)
#   MIN-001 (Ministry of Finance)
#
# If not set:
#   - ID defaults to AGY-005 (hardcoded fallback in env.ts)
#   - Name defaults to "Digital Transformation Agency"
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME="Digital Transformation Agency"
```

---

### 5. Verify Generated env.ts After Docker Build

**Command:**
```bash
docker compose build frontend 2>&1 | grep -A 50 "env.ts generated successfully"
```

**What to Check:**
- ✅ All expected variables present
- ✅ Values are correct (not `${VAR}` literals)
- ✅ Proper TypeScript syntax
- ✅ No missing commas or quotes

---

### 6. Test Both Local and Docker Builds

**Local Test:**
```bash
cd frontend
npm run dev
# Verify application works
```

**Docker Test:**
```bash
docker compose build frontend
docker compose up frontend
# Verify application works in container
```

---

### 7. Use Environment-Specific .env Files

**Structure:**
```
.env                  # Development (gitignored)
.env.example          # Template (version controlled)
.env.production       # Production values (gitignored)
```

**Example .env.example:**
```bash
# Copy this to .env and fill in your values

# Service Request Configuration
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME="Digital Transformation Agency"

# Add more variables...
```

---

## Summary

### Key Takeaways

1. **Two Separate Systems:**
   - Local: Uses version-controlled `env.ts` + `process.env`
   - Docker: Regenerates `env.ts` with hardcoded values from ARGs

2. **5 Locations to Update:**
   - `.env` file
   - docker-compose.yml build args
   - Dockerfile ARG declaration
   - Dockerfile env.ts generation
   - Version-controlled env.ts

3. **Docker Build Overwrites env.ts:**
   - Version-controlled file is replaced during build
   - Changes to version-controlled file don't affect production
   - Must update Dockerfile to change production config

4. **Verification is Critical:**
   - Always check generated env.ts output
   - Test both local and Docker builds
   - Look for TypeScript compilation errors

### Quick Reference

**Adding a new variable named `MY_NEW_VAR` with value `my_value`:**

```bash
# 1. .env
NEXT_PUBLIC_MY_NEW_VAR=my_value

# 2. docker-compose.yml
- NEXT_PUBLIC_MY_NEW_VAR=${NEXT_PUBLIC_MY_NEW_VAR:-my_value}

# 3. Dockerfile ARG
ARG NEXT_PUBLIC_MY_NEW_VAR=my_value

# 4. Dockerfile echo
echo "  MY_NEW_VAR: '${NEXT_PUBLIC_MY_NEW_VAR}'," >> src/config/env.ts && \

# 5. env.ts
MY_NEW_VAR: process.env.NEXT_PUBLIC_MY_NEW_VAR || 'my_value',
```

**Verify:**
```bash
docker compose build frontend 2>&1 | grep -A 50 "env.ts generated successfully"
```

---

## Additional Resources

- [Next.js Environment Variables Documentation](https://nextjs.org/docs/basic-features/environment-variables)
- [Docker ARG vs ENV](https://docs.docker.com/engine/reference/builder/#understand-how-arg-and-from-interact)
- [Docker Compose Build Args](https://docs.docker.com/compose/compose-file/build/#args)

---

**Last Updated:** 2026-01-20
**Related Issue:** Fix for duplicate DTA entries requiring `SERVICE_REQUEST_ENTITY_NAME`
**Related Files:**
- `/home/ab/Projects/gogeaportal/v3/.env`
- `/home/ab/Projects/gogeaportal/v3/docker-compose.yml`
- `/home/ab/Projects/gogeaportal/v3/frontend/Dockerfile`
- `/home/ab/Projects/gogeaportal/v3/frontend/src/config/env.ts`
