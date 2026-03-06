# GEA Portal — Production & Pre-Production Setup Guide

**Last Updated:** March 6, 2026

---

## Table of Contents

1. [Environment Overview](#1-environment-overview)
2. [Complete Hardcoded Domain Inventory](#2-complete-hardcoded-domain-inventory)
3. [Step-by-Step: Switch to Pre-Production](#3-step-by-step-switch-to-pre-production)
4. [Step-by-Step: Switch to Production](#4-step-by-step-switch-to-production)
5. [.env Configuration Reference](#5-env-configuration-reference)
6. [Build & Deploy Commands](#6-build--deploy-commands)
7. [Verification Checklist](#7-verification-checklist)

---

## 1. Environment Overview

| | Production | Pre-Production |
|---|---|---|
| **Domain** | `gea.gov.gd` | `gea.abhirup.app` |
| **Purpose** | Live government portal | Testing, bug fixing, staging |
| **Server** | Azure VM (prod) | Azure VM (preprod) |
| **Codebase** | Same `main` branch | Same `main` branch |
| **.env file** | `.env` on prod server | `.env` on preprod server |

### How it works

- The same codebase runs on both servers
- Each server has its own `.env` file with environment-specific values
- **Build-time variables** (`NEXT_PUBLIC_*`) are embedded into the Docker image during `docker compose build` — changing them requires a rebuild
- **Runtime variables** (DB, OAuth, sessions) are read when the container starts — changing them only requires a restart
- **Hardcoded values** in static files (API specs, source fallbacks) must be manually edited when switching environments

---

## 2. Complete Hardcoded Domain Inventory

Every file containing hardcoded domain references that need to change between environments.

### Category A: Static API Specification Files (8 files)

These are publicly served files used by external chatbots and API integrations.

| # | File | Line | Current Value |
|---|------|------|---------------|
| 1 | `frontend/public/bot-api-functions.json` | 215 | `"api_base_url": "https://gea.gov.gd/api/external"` |
| 2 | `frontend/public/bot-api-tools-openai.json` | 143 | `"base_url": "https://gea.gov.gd/api/external"` |
| 3 | `frontend/public/openapi.yaml` | 19 | `email: admin@dta.gov.gd` |
| 4 | `frontend/public/openapi.yaml` | 22 | `- url: https://gea.gov.gd` |
| 5 | `frontend/public/api/dashboard.yaml` | 8 | `- url: https://gea.gov.gd` |
| 6 | `frontend/public/api/feedback.yaml` | 8 | `- url: https://gea.gov.gd` |
| 7 | `frontend/public/api/grievances.yaml` | 8 | `- url: https://gea.gov.gd` |
| 8 | `frontend/public/api/tickets.yaml` | 8 | `- url: https://gea.gov.gd` |
| 9 | `frontend/public/api/service-requirements.yaml` | 8 | `- url: https://gea.gov.gd` |

**Rebuild required**: Yes — these are copied into the Docker image at build time.

### Category B: Source Code Fallback Values (3 files)

These use environment variables at build/runtime but have hardcoded fallbacks.

| # | File | Line | Current Value |
|---|------|------|---------------|
| 10 | `frontend/src/config/env-client.ts` | 12 | `process.env.NEXT_PUBLIC_FRONTEND_URL \|\| 'https://gea.gov.gd'` |
| 11 | `frontend/src/config/env-client.ts` | 21 | `'https://gea.gov.gd/feedback/qr'` |
| 12 | `frontend/src/config/env-client.ts` | 28 | `process.env.NEXT_PUBLIC_BASE_DOMAIN \|\| 'gov.gd'` |
| 13 | `frontend/src/config/env-client.ts` | 31 | `process.env.NEXT_PUBLIC_SUPPORT_EMAIL \|\| 'support@gov.gd'` |
| 14 | `frontend/src/config/env.ts` | 36 | `process.env.NEXT_PUBLIC_GOG_URL \|\| 'https://www.gov.gd'` |
| 15 | `frontend/src/config/env.ts` | 41 | `process.env.SUPPORT_EMAIL \|\| 'support@gov.gd'` |
| 16 | `frontend/src/app/auth/unauthorized/page.tsx` | 102, 105 | `mailto:admin@dta.gov.gd` |
| 17 | `frontend/src/app/auth/unauthorized/page.tsx` | 168, 171 | `mailto:admin@dta.gov.gd` |

**Rebuild required**: Yes — compiled into the Next.js bundle.

> **Note on fallbacks (items 10-15):** These only take effect when the corresponding environment variable is **not set**. In Docker deployments, the `.env` file always provides these values, so the fallbacks are never used. They primarily affect local `npm run dev` development. You may choose to leave them as `gov.gd` for convenience.

### Category C: Infrastructure (1 file)

| # | File | Line | Current Value |
|---|------|------|---------------|
| 18 | `traefik.yml` | 25 | `email: admin@gov.gd` |

**Rebuild required**: No — Traefik reads this file at container start. Restart Traefik after editing.

### Category D: .env-Driven (No File Edits Needed)

These values are already controlled by `.env` variables. No hardcoded changes needed — just set the correct values in `.env`:

| Variable | Prod Value | Preprod Value | Used By |
|----------|-----------|---------------|---------|
| `FRONTEND_DOMAIN` | `gea.gov.gd` | `gea.abhirup.app` | Traefik routing (docker-compose labels) |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://gea.gov.gd` | `https://gea.abhirup.app` | Build-time: client URLs, QR codes, emails |
| `NEXT_PUBLIC_BASE_DOMAIN` | `gov.gd` | `abhirup.app` | Build-time: base domain |
| `NEXTAUTH_URL` | `https://gea.gov.gd` | `https://gea.abhirup.app` | Runtime: OAuth redirect URLs |
| `API_BASE_URL` | `https://gea.gov.gd` | `https://gea.abhirup.app` | Build-time: server-side API URL |
| `NEXT_PUBLIC_API_BASE_URL` | `https://gea.gov.gd` | `https://gea.abhirup.app` | Build-time: client API URL |
| `LETS_ENCRYPT_EMAIL` | `admin@gov.gd` | `mailabhirupbanerjee@gmail.com` | Traefik: SSL cert notifications |
| `DMS_URL` | `https://dms.gea.gov.gd` | `https://dms.gea.abhirup.app` | Build-time: DMS link |
| `GIT_URL` | `https://git.gea.gov.gd` | `https://git.gea.abhirup.app` | Build-time: Git link |
| `SUPPORT_EMAIL` | `support@gov.gd` | `support@abhirup.app` | Build-time: email templates |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@gov.gd` | `support@abhirup.app` | Build-time: client fallback |

---

## 3. Step-by-Step: Switch to Pre-Production

Follow these steps **in order** when deploying to `gea.abhirup.app`.

### Step 3.1: Update `.env` file

On the **preprod server**, ensure `.env` has preprod domain values. See the complete table in [Section 5](#5-env-configuration-reference).

Key values to verify:
```bash
FRONTEND_DOMAIN=gea.abhirup.app
NEXT_PUBLIC_FRONTEND_URL=https://gea.abhirup.app
NEXT_PUBLIC_BASE_DOMAIN=abhirup.app
NEXTAUTH_URL=https://gea.abhirup.app
API_BASE_URL=https://gea.abhirup.app
NEXT_PUBLIC_API_BASE_URL=https://gea.abhirup.app
LETS_ENCRYPT_EMAIL=mailabhirupbanerjee@gmail.com
SUPPORT_EMAIL=support@abhirup.app
NEXT_PUBLIC_SUPPORT_EMAIL=support@abhirup.app
```

### Step 3.2: Update Static API Spec Files

Edit each file, replacing `gea.gov.gd` with `gea.abhirup.app`:

**File 1:** `frontend/public/bot-api-functions.json` — line 215
```
FROM: "api_base_url": "https://gea.gov.gd/api/external"
  TO: "api_base_url": "https://gea.abhirup.app/api/external"
```

**File 2:** `frontend/public/bot-api-tools-openai.json` — line 143
```
FROM: "base_url": "https://gea.gov.gd/api/external"
  TO: "base_url": "https://gea.abhirup.app/api/external"
```

**File 3:** `frontend/public/openapi.yaml` — lines 19 and 22
```
Line 19 FROM: email: admin@dta.gov.gd
       TO: email: admin@dta.abhirup.app

Line 22 FROM: - url: https://gea.gov.gd
          TO: - url: https://gea.abhirup.app
```

**Files 4-8:** `frontend/public/api/*.yaml` — line 8 in each
```
FROM: - url: https://gea.gov.gd
  TO: - url: https://gea.abhirup.app
```

Files to edit:
- `frontend/public/api/dashboard.yaml`
- `frontend/public/api/feedback.yaml`
- `frontend/public/api/grievances.yaml`
- `frontend/public/api/tickets.yaml`
- `frontend/public/api/service-requirements.yaml`

**Quick command** (run from project root):
```bash
# Replace in all static API spec files at once
find frontend/public -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" \) \
  -exec sed -i 's|gea\.gov\.gd|gea.abhirup.app|g' {} +

# Replace contact email in openapi.yaml
sed -i 's|admin@dta\.gov\.gd|admin@dta.abhirup.app|g' frontend/public/openapi.yaml
```

### Step 3.3: Update Source Code Fallbacks (Optional)

> These fallbacks are only used when env vars are missing. In Docker deployments they are never triggered. You may skip this step if your `.env` is correctly configured.

**File:** `frontend/src/config/env-client.ts`
```
Line 12 FROM: || 'https://gea.gov.gd'
          TO: || 'https://gea.abhirup.app'

Line 21 FROM: : 'https://gea.gov.gd/feedback/qr'
          TO: : 'https://gea.abhirup.app/feedback/qr'

Line 28 FROM: || 'gov.gd'
          TO: || 'abhirup.app'

Line 31 FROM: || 'support@gov.gd'
          TO: || 'support@abhirup.app'
```

**File:** `frontend/src/config/env.ts`
```
Line 36 FROM: || 'https://www.gov.gd'
          TO: || 'https://www.gov.gd'       (keep as-is, this is GoG main site)

Line 41 FROM: || 'support@gov.gd'
          TO: || 'support@abhirup.app'
```

**File:** `frontend/src/app/auth/unauthorized/page.tsx`
```
Lines 102, 105, 168, 171:
FROM: admin@dta.gov.gd
  TO: admin@dta.abhirup.app
```

### Step 3.4: Update Traefik Config

**File:** `traefik.yml` — line 25
```
FROM: email: admin@gov.gd
  TO: email: mailabhirupbanerjee@gmail.com
```

### Step 3.5: Rebuild and Deploy

See [Section 6](#6-build--deploy-commands) for commands.

### Step 3.6: Verify

See [Section 7](#7-verification-checklist).

---

## 4. Step-by-Step: Switch to Production

Follow these steps **in order** when deploying to `gea.gov.gd`.

### Step 4.1: Update `.env` file

On the **prod server**, ensure `.env` has production domain values:
```bash
FRONTEND_DOMAIN=gea.gov.gd
NEXT_PUBLIC_FRONTEND_URL=https://gea.gov.gd
NEXT_PUBLIC_BASE_DOMAIN=gov.gd
NEXTAUTH_URL=https://gea.gov.gd
API_BASE_URL=https://gea.gov.gd
NEXT_PUBLIC_API_BASE_URL=https://gea.gov.gd
LETS_ENCRYPT_EMAIL=admin@gov.gd
SUPPORT_EMAIL=support@gov.gd
NEXT_PUBLIC_SUPPORT_EMAIL=support@gov.gd
```

### Step 4.2: Update Static API Spec Files

Replace `gea.abhirup.app` back to `gea.gov.gd`:

**Quick command** (run from project root):
```bash
# Replace in all static API spec files at once
find frontend/public -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" \) \
  -exec sed -i 's|gea\.abhirup\.app|gea.gov.gd|g' {} +

# Replace contact email in openapi.yaml
sed -i 's|admin@dta\.abhirup\.app|admin@dta.gov.gd|g' frontend/public/openapi.yaml
```

Or manually edit each file — see [Section 3.2](#step-32-update-static-api-spec-files) and reverse the changes.

### Step 4.3: Update Source Code Fallbacks (Optional)

Reverse the changes from Section 3.3, or skip if `.env` is correctly configured.

### Step 4.4: Update Traefik Config

**File:** `traefik.yml` — line 25
```
FROM: email: mailabhirupbanerjee@gmail.com
  TO: email: admin@gov.gd
```

### Step 4.5: Rebuild and Deploy

See [Section 6](#6-build--deploy-commands) for commands.

### Step 4.6: Verify

See [Section 7](#7-verification-checklist).

---

## 5. .env Configuration Reference

### Domain-Related Variables (Change Between Environments)

| Variable | Prod (`gea.gov.gd`) | Preprod (`gea.abhirup.app`) | Type |
|----------|---------------------|------------------------------|------|
| `FRONTEND_DOMAIN` | `gea.gov.gd` | `gea.abhirup.app` | Runtime |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://gea.gov.gd` | `https://gea.abhirup.app` | **Build-time** |
| `NEXT_PUBLIC_BASE_DOMAIN` | `gov.gd` | `abhirup.app` | **Build-time** |
| `NEXT_PUBLIC_API_BASE_URL` | `https://gea.gov.gd` | `https://gea.abhirup.app` | **Build-time** |
| `API_BASE_URL` | `https://gea.gov.gd` | `https://gea.abhirup.app` | **Build-time** |
| `NEXTAUTH_URL` | `https://gea.gov.gd` | `https://gea.abhirup.app` | Runtime |
| `DMS_URL` | `https://dms.gea.gov.gd` | `https://dms.gea.abhirup.app` | **Build-time** |
| `GIT_URL` | `https://git.gea.gov.gd` | `https://git.gea.abhirup.app` | **Build-time** |
| `LETS_ENCRYPT_EMAIL` | `admin@gov.gd` | `mailabhirupbanerjee@gmail.com` | Runtime |
| `SUPPORT_EMAIL` | `support@gov.gd` | `support@abhirup.app` | **Build-time** |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@gov.gd` | `support@abhirup.app` | **Build-time** |

### Variables That Differ Per Server (Secrets)

These have different values per server but are unrelated to the domain:

| Variable | Notes |
|----------|-------|
| `FEEDBACK_DB_PASSWORD` | Unique per server |
| `NEXTAUTH_SECRET` | Unique per server |
| `ADMIN_PASSWORD` | Unique per server |
| `ADMIN_SESSION_SECRET` | Unique per server |
| `GOOGLE_CLIENT_ID` | Different OAuth app per domain |
| `GOOGLE_CLIENT_SECRET` | Different OAuth app per domain |
| `MICROSOFT_CLIENT_ID` | Different OAuth app per domain (if used) |
| `MICROSOFT_CLIENT_SECRET` | Different OAuth app per domain (if used) |
| `MICROSOFT_TENANT_ID` | Different OAuth app per domain (if used) |
| `EXTERNAL_API_KEY` | Unique per server |
| `IP_SALT` | Unique per server |
| `SENDGRID_API_KEY` | Can be shared or separate |
| `TRAEFIK_DASHBOARD_PASSWORD` | Unique per server |

### Variables That Stay the Same

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Same for both |
| `FEEDBACK_DB_HOST` | `feedback_db` | Docker internal |
| `FEEDBACK_DB_PORT` | `5432` | Docker internal |
| `FEEDBACK_DB_NAME` | `feedback` | Same schema |
| `FEEDBACK_DB_USER` | `feedback_user` | Same schema |
| `REDIS_HOST` | `redis` | Docker internal |
| `REDIS_PORT` | `6379` | Docker internal |
| `GOG_URL` | `https://www.gov.gd/` | Government site |
| `ESERVICES_URL` | `https://eservice.gov.gd/` | Government site |
| `CONSTITUTION_URL` | `https://grenadaparliament.gd/ova_doc/` | Government site |
| `NEXT_PUBLIC_SITE_NAME` | `Government of Grenada - EA Portal` | Same branding |
| `NEXT_PUBLIC_SITE_SHORT_NAME` | `GoG` | Same branding |
| `MAX_FILE_SIZE` | `10097152` | Same limits |
| `MAX_TOTAL_UPLOAD_SIZE` | `50242880` | Same limits |
| `ALLOWED_FILE_TYPES` | `pdf,jpg,jpeg,png,doc,docx,xlsx,xls` | Same types |
| `EA_SERVICE_RATE_LIMIT` | `10` | Same limits |
| `GRIEVANCE_RATE_LIMIT` | `60` | Same limits |
| `FEEDBACK_RATE_LIMIT` | `60` | Same limits |

### Build-Time vs Runtime

| Type | What happens | When to use |
|------|-------------|-------------|
| **Build-time** (`NEXT_PUBLIC_*` and Dockerfile `ARG`) | Embedded into the Docker image during `docker compose build`. Changing requires a full rebuild. | Domain URLs, site name, email config |
| **Runtime** (docker-compose `environment`) | Read when the container starts. Changing only requires `docker compose restart frontend`. | DB passwords, OAuth secrets, session keys |

> **Important:** If you change any **build-time** variable, you MUST run `docker compose build --no-cache frontend` for the change to take effect.

---

## 6. Build & Deploy Commands

### Full Rebuild (Required when changing build-time variables or static files)

```bash
cd ~/GEAv3

# Stop running containers
docker compose down

# Rebuild frontend image (--no-cache ensures build args are re-read)
docker compose build --no-cache frontend

# Start all containers
docker compose up -d
```

### Runtime-Only Restart (When only runtime variables changed)

```bash
cd ~/GEAv3

# Restart frontend only
docker compose restart frontend
```

### Traefik Restart (When traefik.yml changed)

```bash
cd ~/GEAv3

docker compose restart traefik
```

### OAuth Configuration Reminder

Each environment needs its own OAuth redirect URIs registered:

**Google OAuth** ([console.cloud.google.com](https://console.cloud.google.com)):
```
Production:    https://gea.gov.gd/api/auth/callback/google
Pre-production: https://gea.abhirup.app/api/auth/callback/google
```

**Microsoft OAuth** ([portal.azure.com](https://portal.azure.com)):
```
Production:    https://gea.gov.gd/api/auth/callback/microsoft-entra-id
Pre-production: https://gea.abhirup.app/api/auth/callback/microsoft-entra-id
```

You can add both redirect URIs to the same OAuth app, or use separate apps per environment.

---

## 7. Verification Checklist

Run these checks after deploying to either environment.

### Container Health

```bash
# All 5 containers should show "Up"
docker compose ps

# Expected:
# traefik      Up
# feedback_db  Up (healthy)
# redis        Up (healthy)
# pgbouncer    Up (healthy)
# frontend     Up
```

### Domain & SSL

```bash
# Replace ${DOMAIN} with gea.gov.gd or gea.abhirup.app

# HTTP redirect to HTTPS
curl -sI http://${DOMAIN} | head -5
# Expected: 301 Moved Permanently → https://

# HTTPS response
curl -sI https://${DOMAIN} | head -5
# Expected: 200 OK

# SSL certificate check
echo | openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} 2>/dev/null \
  | openssl x509 -noout -subject -dates
# Expected: Subject with correct domain, valid dates
```

### Static Files Have Correct Domain

```bash
# Check bot-api spec
docker compose exec frontend cat /app/public/bot-api-functions.json | grep api_base_url
# Expected: https://${DOMAIN}/api/external

# Check openapi spec
docker compose exec frontend cat /app/public/openapi.yaml | head -25
# Expected: url: https://${DOMAIN}
```

### API Health

```bash
# Health endpoint
curl -s https://${DOMAIN}/api/health | head -5

# External API (if EXTERNAL_API_KEY is set)
curl -sI https://${DOMAIN}/api/external/dashboard \
  -H "X-API-Key: your-api-key" | head -5
```

### OAuth Login

1. Navigate to `https://${DOMAIN}/auth/signin`
2. Click "Continue with Google"
3. Verify redirect URL shows correct domain in Google consent screen
4. Complete sign-in
5. Verify you land on `/admin/home`

### Quick Checklist

- [ ] All 5 containers running and healthy
- [ ] HTTPS working with valid certificate
- [ ] Homepage loads correctly
- [ ] Static API specs show correct domain
- [ ] OAuth sign-in works (Google)
- [ ] OAuth sign-in works (Microsoft, if configured)
- [ ] Admin portal accessible at `/admin`
- [ ] Citizen login works (if enabled)
- [ ] Email notifications send (if SendGrid configured)
- [ ] External API responds (if configured)

---

## Appendix: File Quick Reference

All files that need attention when switching environments:

| Priority | File | What to Change | Rebuild? |
|----------|------|----------------|----------|
| Required | `.env` | Domain variables (see Section 5) | Build-time vars: yes |
| Required | `frontend/public/bot-api-functions.json:215` | `api_base_url` domain | Yes |
| Required | `frontend/public/bot-api-tools-openai.json:143` | `base_url` domain | Yes |
| Required | `frontend/public/openapi.yaml:19,22` | email + server URL | Yes |
| Required | `frontend/public/api/dashboard.yaml:8` | server URL | Yes |
| Required | `frontend/public/api/feedback.yaml:8` | server URL | Yes |
| Required | `frontend/public/api/grievances.yaml:8` | server URL | Yes |
| Required | `frontend/public/api/tickets.yaml:8` | server URL | Yes |
| Required | `frontend/public/api/service-requirements.yaml:8` | server URL | Yes |
| Required | `traefik.yml:25` | Let's Encrypt email | Restart traefik |
| Optional | `frontend/src/config/env-client.ts:12,21,28,31` | Fallback values | Yes |
| Optional | `frontend/src/config/env.ts:41` | Support email fallback | Yes |
| Optional | `frontend/src/app/auth/unauthorized/page.tsx:102,105,168,171` | Contact email | Yes |
