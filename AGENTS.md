# GEA Portal v3 - Agent Context

> **Project:** Grenada Enterprise Architecture Portal (GEAv3)
> **Version:** 3.3.0
> **Status:** Production Ready
> **Language:** English (all docs, comments, and code)

---

## Project Overview

This is a full-stack web platform for the Government of Grenada's digital transformation initiatives. It centralizes government service information, collects citizen feedback, manages grievances via a native ticketing system, and provides analytics dashboards for administrators.

**Key capabilities:**
- Public portal (Home, About, Service catalog, Feedback forms)
- Citizen portal (SMS OTP auth, dashboard, feedback history, tickets, grievances)
- Staff portal (entity-specific access for MDA officers)
- Admin portal (ticket management, analytics, documents, master data, settings)
- AI chatbot integration (iframe-based, Azure-hosted)
- External API for bot/integration access (API key auth, PII masking)

---

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.1.6 | App Router, TypeScript |
| UI | React | 18.3.0 | Server Components + Client Components |
| Styling | Tailwind CSS | 4.1.0 | Utility-first |
| Validation | Zod | 4.x | Schema validation |
| Auth (Admin) | NextAuth v4 | 4.24.13 | OAuth (Google, Microsoft), JWT sessions (2hr) |
| Auth (Citizen) | Custom | — | Twilio Verify SMS OTP + password login |
| Database | PostgreSQL | 16.11-alpine | 45+ tables, 44+ indexes |
| DB Driver | node-postgres (pg) | 8.x | Connection pool via PgBouncer |
| Connection Pool | PgBouncer | v1.25.1 | Transaction pool mode, max 200 clients |
| Cache | Redis | 7.4.4-alpine | Analytics caching, optional (graceful fallback) |
| Email | SendGrid | Latest | Transactional emails |
| Reverse Proxy | Traefik | v3.6.7 | SSL termination, rate limiting |
| Containerization | Docker / Docker Compose | 29.x / v5.0+ | 5 services |
| Node.js | 22.22.0-alpine | — | Frontend runtime |

---

## Project Structure

```
.
├── .env.example              # Environment template (~63 variables)
├── docker-compose.yml        # Production orchestration (5 services)
├── docker-compose.local.yml  # Local dev: PostgreSQL + Redis only
├── traefik.yml               # Reverse proxy & Let's Encrypt config
├── README.md                 # Human-facing overview
├── AGENTS.md                 # This file
│
├── docs/                     # Comprehensive documentation
│   ├── index.md              # Documentation index
│   ├── setup/                # Installation & VM guides
│   ├── solution/             # Architecture, API, DB, auth references
│   ├── developer-guides/     # API patterns, DB patterns, testing, error handling
│   ├── user-manuals/         # End-user documentation
│   ├── migration/            # Upgrade roadmaps
│   └── infra/                # Infrastructure sizing
│
├── database/                 # Database scripts & master data
│   ├── 99-consolidated-setup.sh   # Main orchestrator
│   ├── config.sh             # Shared shell config
│   ├── scripts/              # Init, seed, migration scripts (numbered 01-99)
│   ├── sql/                  # SQL templates
│   ├── master-data/          # Production CSV data files
│   └── docs/                 # DBA guides
│
└── frontend/                 # Next.js application (monolith)
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json         # strict: false
    ├── next.config.js        # unoptimized images (for static export compat)
    ├── Dockerfile            # Multi-stage build (builder + runner)
    ├── eslint.config.mjs     # ESLint 9 flat config
    ├── vitest.config.ts      # Test config (Vitest + jsdom)
    ├── readme.md             # Frontend-specific notes
    │
    ├── public/               # Static assets, OpenAPI specs, bot configs
    │   ├── images/
    │   ├── api/              # OpenAPI YAML files
    │   ├── openapi.yaml
    │   ├── bot-api-functions.json
    │   ├── bot-api-prompt.md
    │   └── config/
    │
    ├── __tests__/            # Automated tests (Vitest)
    │   ├── setup.ts          # Global mocks (next-auth, db, redis)
    │   ├── lib/              # Unit tests
    │   ├── api/              # API route tests
    │   └── components/       # React component tests
    │
    └── src/
        ├── app/              # Next.js App Router
        │   ├── layout.tsx    # Root layout (dynamic favicon, metadata)
        │   ├── page.tsx      # Home page
        │   ├── globals.css
        │   │
        │   ├── api/          # 134+ API route.ts files
        │   │   ├── auth/[...nextauth]/      # NextAuth endpoints
        │   │   ├── admin/                   # Admin APIs (users, tickets, settings, backups, documents...)
        │   │   ├── citizen/                 # Citizen portal APIs (auth, dashboard, feedback, tickets, grievances)
        │   │   ├── feedback/                # Public feedback APIs
        │   │   ├── tickets/                 # Public ticket APIs
        │   │   ├── helpdesk/                # Public ticket lookup
        │   │   ├── managedata/              # Master data CRUD (entities, services, QR codes, categories, life events...)
        │   │   ├── public/                  # Public data APIs
        │   │   ├── settings/                # Settings APIs
        │   │   ├── external/                # External API (bot/integration access, API key auth)
        │   │   ├── ai-agents/               # AI agent registry & invocation
        │   │   ├── content/                 # Page context for AI bot
        │   │   └── uploads/[...path]/       # File serving
        │   │
        │   ├── admin/          # Admin portal pages
        │   ├── citizen/        # Citizen portal pages
        │   ├── auth/           # Sign-in / unauthorized pages
        │   ├── feedback/       # Feedback form pages
        │   ├── helpdesk/       # Public ticket lookup pages
        │   ├── about/          # About page
        │   └── services/       # Service catalog pages
        │
        ├── components/         # React components
        │   ├── layout/         # Header, Footer, Navigation
        │   ├── admin/          # Admin UI components
        │   ├── citizen/        # Citizen portal components
        │   ├── feedback/       # Feedback components
        │   ├── home/           # Homepage components
        │   ├── common/         # Shared UI components
        │   └── ...
        │
        ├── lib/                # Utilities & backend helpers
        │   ├── auth.ts         # NextAuth configuration
        │   ├── db.ts           # PostgreSQL pool, transactions, health check
        │   ├── redis.ts        # Redis caching helpers
        │   ├── response.ts     # Standardized API response builders & error codes
        │   ├── sendgrid.ts     # Email sending
        │   ├── settings.ts     # Runtime settings from DB
        │   ├── settings-encryption.ts  # AES-256-GCM for sensitive settings
        │   ├── entity-filter.ts        # Staff entity filtering
        │   ├── rate-limit.ts           # IP-based rate limiting
        │   ├── piiMask.ts              # PII masking for external API
        │   ├── citizen-auth.ts         # Citizen auth helpers
        │   ├── twilio.ts               # Twilio SMS OTP
        │   ├── backup.ts               # Backup utilities
        │   ├── backup-scheduler.ts     # Scheduled backup logic
        │   ├── file-validation.ts      # Upload validation
        │   ├── validation.ts           # Common validation helpers
        │   ├── duplicateCheck.ts       # Duplicate detection
        │   ├── role-utils.ts           # Role helper functions
        │   ├── admin-auth.ts           # Admin authorization
        │   ├── apiKeyAuth.ts           # External API key auth
        │   ├── emailTemplates.ts       # SendGrid email templates
        │   ├── ai-agents.ts            # AI agent helpers
        │   └── schemas/                # Zod schemas (if used)
        │
        ├── config/             # Build-time configuration
        │   ├── env.ts          # Generated during Docker build from args
        │   ├── content.ts      # Static content
        │   └── navigation.ts   # Navigation items
        │
        ├── types/              # TypeScript type definitions
        ├── hooks/              # Custom React hooks
        └── providers/          # React Context providers
```

---

## Build & Development Commands

All commands run from the `frontend/` directory unless noted.

```bash
cd frontend

# Development (requires local DB + Redis: docker compose -f docker-compose.local.yml up -d)
npm run dev              # Starts Next.js dev server on :3000

# Build
npm run generate-contexts   # Generates page-contexts.json for AI bot
npm run build               # Production build
npm run start               # Start production server

# Testing
npm test                 # Vitest watch mode
npm run test:run         # Vitest single run (CI)
npm run test:coverage    # Coverage report (v8)

# Linting
npm run lint             # ESLint 9 (eslint src)
npx tsc --noEmit         # TypeScript type check
```

**Production deployment (project root):**
```bash
# Full stack
docker compose up -d --build

# Database only
docker compose up -d feedback_db

# Local development services
docker compose -f docker-compose.local.yml up -d
```

---

## Code Style Guidelines

- **Language:** TypeScript with `strict: false` (see `tsconfig.json`).
- **Imports:** Use `@/` alias for `src/` directory.
- **API routes:** Every `route.ts` must export `dynamic = 'force-dynamic'` for dynamic routes.
- **Database queries:** Always use parameterized queries (`$1`, `$2`, etc.). Never concatenate user input into SQL.
- **Responses:** Use standardized helpers from `@/lib/response` (`respondSuccess`, `respondList`, `respondError`, `respondValidationError`, `respondNotFound`, `respondServerError`).
- **Error handling:** Wrap endpoint logic in `try/catch`. Log errors with `console.error`. Return generic messages to clients (don't expose internals).
- **Auth checks:**
  - Admin endpoints: check `getServerSession(authOptions)`, then verify `session.user.roleType === 'admin'`.
  - Staff endpoints: check `session.user.roleType === 'staff'` and apply entity filtering via `@/lib/entity-filter`.
- **Comments:** JSDoc blocks at top of files describing the endpoint/purpose. Inline comments for business logic.
- **Console logs:** Avoid `console.log` in production code. Use `console.warn` / `console.error` only. ESLint warns on `console.log`.

---

## Testing Strategy

- **Framework:** Vitest with jsdom environment.
- **Component testing:** React Testing Library + `@testing-library/jest-dom`.
- **Mocking:** Global mocks in `__tests__/setup.ts` for `next-auth`, `next-auth/react`, `@/lib/db`, and `ioredis`.
- **Coverage:** v8 provider, reports text/html/lcov.
- **CI/CD:** GitHub Actions (`.github/workflows/test.yml`) runs on push/PR to `main` and `develop`:
  1. `npm run test:run`
  2. `npm run test:coverage`
  3. `npm run lint`
  4. `npx tsc --noEmit`
- **When to add tests:**
  - New API endpoint → add API route test
  - New component → add component test
  - New utility → add unit test
  - Role-based feature → add auth/authorization test
- **Security-critical tests** (never remove): auth 403s, role-based access, entity filtering, path traversal prevention, input validation.

---

## Deployment Architecture

**5 Docker services:**
1. **traefik** — Reverse proxy, SSL (Let's Encrypt), rate limiting for `/api/external/*`
2. **feedback_db** — PostgreSQL 16 primary data store
3. **pgbouncer** — Connection pooling (transaction mode, max 200 clients)
4. **redis** — Analytics cache (256MB max, LRU eviction)
5. **frontend** — Next.js 16 app (port 3000)

**Volumes:**
- `traefik_acme` — SSL certificates
- `feedback_db_data` — PostgreSQL data
- `redis_data` — Cache persistence
- `gea_backups` — Database backups
- `documents_data` — Uploaded documents
- `branding_data` — Branding uploads

**Network:** `geav3_network` (bridge)

---

## Environment & Configuration

**Two-tier config:**
1. **Environment variables** (`.env`) — Infrastructure, security, build-time settings. Requires container rebuild to change.
2. **Database settings** (`system_settings` table) — Runtime configuration changed via Admin UI. Applies immediately.

**Critical env vars:**
- `FRONTEND_DOMAIN`, `NEXT_PUBLIC_FRONTEND_URL`
- `FEEDBACK_DB_PASSWORD`, `FEEDBACK_DB_HOST`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
- `EXTERNAL_API_KEY` — For bot/integration access
- `TWILIO_*` — Citizen SMS OTP (optional, can also be set in Admin UI)

**Build-time injection:** The `frontend/Dockerfile` generates `src/config/env.ts` from Docker build args. This means many config values are baked into the image at build time.

---

## Database Management

**Main script:** `database/99-consolidated-setup.sh`

Common commands:
```bash
./database/99-consolidated-setup.sh --reload      # Clear + load master data + synthetic data + verify
./database/99-consolidated-setup.sh --fresh       # Drop & recreate entire database
./database/99-consolidated-setup.sh --backup      # Create backup
./database/99-consolidated-setup.sh --restore     # Interactive restore
./database/99-consolidated-setup.sh --verify      # Health check
```

**Migration style:** Numbered shell scripts in `database/scripts/` (01-init-db.sh, 04-nextauth-users.sh, 11-load-master-data.sh, etc.). Scripts are idempotent where possible. New schema changes should be added as new numbered scripts.

**Master data:** CSV files in `database/master-data/` (entity-master.txt, service-master.txt, service-attachments.txt). Cleaned versions go to `database/master-data/cleaned/`.

---

## Security Considerations

- **Authentication:** OAuth-only for staff/admin (no passwords stored). Citizen auth uses Twilio Verify SMS OTP or password (bcrypt hashed).
- **Authorization:** Role-based (admin_dta, staff_mda, public). Entity-based filtering for staff.
- **Rate limiting:** IP-based (SHA256 hashed) for feedback, grievances, and EA service requests. Traefik rate limit on external API (100 req/hour).
- **SQL Injection:** All queries use parameterized statements.
- **XSS:** Input sanitization; no raw HTML rendering of user input.
- **File uploads:** Type and size validation. Stored in Docker volume (`documents_data`).
- **PII:** External API masks personal data (names, emails, phones).
- **SSL:** Auto Let's Encrypt via Traefik. HSTS enabled.
- **Secrets:** Never commit `.env`. Use `openssl rand -base64 32` for secrets.

---

## Key Conventions for Agents

1. **Always use `@/` imports** — maps to `frontend/src/`.
2. **Always use parameterized queries** — never interpolate user input into SQL strings.
3. **Use response helpers** — `@/lib/response` for consistent API responses.
4. **Add `dynamic = 'force-dynamic'`** to all API route files.
5. **Check auth at the top** of admin API routes before any DB operations.
6. **Apply entity filtering** for staff users using `@/lib/entity-filter`.
7. **Use transactions** (`withTransaction` from `@/lib/db`) for multi-step DB operations.
8. **Cache expensive queries** with `@/lib/redis` (`withCache`, `invalidateCache`).
9. **Log errors** with `console.error` but return generic messages to clients.
10. **Update tests** when changing API responses, auth rules, or component behavior.
11. **Add new DB scripts** with the next available number in `database/scripts/`.
12. **Run `npx tsc --noEmit` and `npm run lint`** before committing.

---

## Documentation References

| Document | Purpose |
|----------|---------|
| `README.md` | Human overview, quick start, architecture diagram |
| `docs/index.md` | Complete documentation index |
| `docs/solution/SOLUTION_ARCHITECTURE.md` | System architecture |
| `docs/solution/API_REFERENCE.md` | All API endpoints |
| `docs/solution/DATABASE_REFERENCE.md` | Database schema |
| `docs/solution/AUTHENTICATION.md` | OAuth setup & user management |
| `docs/developer-guides/API_DEVELOPMENT_PATTERNS.md` | How to write API routes |
| `docs/developer-guides/DATABASE_QUERY_PATTERNS.md` | DB operations guide |
| `docs/developer-guides/TESTING_GUIDE.md` | Testing procedures |
| `docs/developer-guides/ERROR_HANDLING_PATTERNS.md` | Error handling guide |
| `database/DB_README.md` | DBA guide |

---

*Last updated: June 2026*
