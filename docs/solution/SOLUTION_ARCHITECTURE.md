# GEA Portal v3 - Solution Architecture

**Document Version:** 1.6
**Last Updated:** February 22, 2026
**System Version:** Phase 3.3.0 (Citizen Auth + System Settings + Enhanced Features)
**Status:** ✅ Production Ready
**Infrastructure:** Azure Standard_B2s (4GB RAM, 2 vCPUs, Ubuntu 24.04.3 LTS)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Diagrams](#architecture-diagrams)
4. [Technology Stack](#technology-stack)
5. [Component Architecture](#component-architecture)
6. [Data Architecture](#data-architecture)
7. [Security Architecture](#security-architecture)
8. [Integration Architecture](#integration-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Scalability & Performance](#scalability--performance)
11. [Disaster Recovery](#disaster-recovery)
12. [Future Roadmap](#future-roadmap)

---

## Executive Summary

### What is GEA Portal v3?

The **Government Enterprise Architecture (GEA) Portal v3** is a comprehensive citizen engagement and enterprise governance platform for the Government of Grenada. It provides:

- **Citizen Services:** Public feedback submission and grievance management
- **Ticketing System:** Native help desk with SLA tracking and resolution workflows
- **Admin Portal:** Complete management dashboard for government staff
- **Master Data Management:** Centralized entities, services, and QR code management
- **OAuth Authentication:** Secure Google/Microsoft sign-in with role-based access
- **Analytics Dashboard:** Real-time insights into service performance and citizen satisfaction

### Key Metrics

| Metric | Value |
|--------|-------|
| **Database Tables** | 40+ tables (master data, transactional, auth, settings, audit) |
| **API Endpoints** | 122+ RESTful endpoints |
| **External API Endpoints** | 5 (dashboard, tickets, feedback, grievances, service-requirements) |
| **OAuth Providers** | Google, Microsoft Azure AD |
| **Citizen Authentication** | Twilio SMS OTP (passwordless phone-based) |
| **User Roles** | Admin, Staff, Citizen, Public |
| **Government Entities** | 50+ ministries/departments/agencies |
| **System Settings** | 100+ configurable settings in 9 categories |
| **Rate Limiting** | 30-60 submissions/hour per IP, 100/hour External API |
| **Session Timeout** | 2 hours (JWT admin/staff), 24 hours (citizen) |

### Technology Overview

- **Frontend:** Next.js 16 (React, TypeScript, Tailwind CSS)
- **Backend:** Next.js API Routes (Node.js 22)
- **Database:** PostgreSQL 16.11-alpine
- **Connection Pool:** PgBouncer v1.25.1 (transaction mode)
- **Cache:** Redis 7.4.4-alpine (analytics caching)
- **Authentication:** NextAuth v4 with OAuth (admin/staff) + Twilio Verify SMS OTP (citizens)
- **Settings Encryption:** AES-256-GCM for sensitive values
- **Reverse Proxy:** Traefik v3.6.7 with automatic SSL
- **Email:** SendGrid API
- **SMS:** Twilio Verify API (citizen OTP)
- **Deployment:** Docker Compose

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / PUBLIC ACCESS                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTPS (Port 443)
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TRAEFIK REVERSE PROXY (v3.6.7)                    │
│  • SSL Termination (Let's Encrypt)                                   │
│  • Routing (gea.domain.com → frontend:3000)                         │
│  • Load Balancing                                                    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌──────────────┐  ┌──────────┐
│   OAUTH     │  │   FRONTEND   │  │  STATIC  │
│  PROVIDERS  │  │  (Next.js)   │  │  ASSETS  │
├─────────────┤  ├──────────────┤  └──────────┘
│ • Google    │  │ • React UI   │
│ • Microsoft │  │ • API Routes │
└─────────────┘  │ • SSR/SSG    │
                 │ • Middleware │
                 └───────┬──────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    ▼                    ▼                    ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│    REDIS    │  │  PGBOUNCER   │  │   SENDGRID   │
│   (Cache)   │  │ (Conn Pool)  │  │    EMAIL     │
├─────────────┤  ├──────────────┤  └──────────────┘
│ • Analytics │  │ • Transaction│
│ • 256MB max │  │   mode       │
│ • 5min TTL  │  │ • 200 conns  │
└─────────────┘  └───────┬──────┘
                         │
                         ▼
                 ┌──────────────┐
                 │  POSTGRESQL  │
                 │ 16.11-alpine │
                 ├──────────────┤
                 │ • 45+ Tables │
                 │ • 60+ IDX    │
                 │ • JSONB      │
                 └──────────────┘
```

### Core Use Cases

#### 1. **Citizen Feedback Submission**
```
Citizen → Portal → Rate Limiting Check → Validation → Database → Email Notification
                                          ↓
                                    Auto-Ticket Creation (if rating ≤ 2.5)
```

#### 2. **Grievance/Ticket Management**
```
Citizen/Staff → Submit Ticket → Category Assignment → SLA Tracking → Assignment
                                                           ↓
                                           Staff Updates → Activity Log → Resolution
```

#### 3. **Admin User Management**
```
Admin Login → OAuth (Google/MS) → Email Whitelist Check → Session Creation
                                          ↓
                                   Admin Dashboard → User CRUD → Audit Log
```

#### 4. **Staff Portal Access**
```
Staff Login → OAuth → Entity Assignment Check → Entity-Filtered Data View
                                                          ↓
                                                    Ticket Management
```

#### 5. **Citizen Portal Authentication** (NEW)
```
Citizen → Enter Phone Number → Twilio Verify SMS OTP → Verify Code
                                         ↓
                              Session Creation (24h) → Citizen Dashboard
                                         ↓
                              (Optional) Set Password for faster future login
```

#### 6. **System Settings Management** (NEW)
```
Admin → Settings Portal → 9 Category Tabs → Modify Values → Encryption (if sensitive)
                                                     ↓
                                          Audit Log → Database → Apply Changes
```

---

## Architecture Diagrams

### System Context Diagram (C4 Level 1)

```
                    ┌────────────────────┐
                    │  CITIZEN/PUBLIC    │
                    │   (Web Browser)    │
                    └──────────┬─────────┘
                               │ HTTPS
                               ▼
        ┌──────────────────────────────────────────────┐
        │         GEA PORTAL v3 SYSTEM                 │
        │  (Next.js + PostgreSQL + OAuth)              │
        │                                              │
        │  • Feedback & Grievance Submission           │
        │  • Ticketing & SLA Management                │
        │  • Admin Portal & User Management            │
        │  • Analytics & Reporting                     │
        └──────────┬───────────────────┬───────────────┘
                   │                   │
         ┌─────────▼────────┐    ┌────▼──────────────┐
         │  OAUTH PROVIDERS │    │  EXTERNAL APIS    │
         │  • Google        │    │  • SendGrid Email │
         │  • Microsoft     │    │  • Twilio SMS OTP │
         └──────────────────┘    └───────────────────┘
```

### Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                      DOCKER HOST SERVER                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  TRAEFIK CONTAINER (traefik:v3.6.7)                    │    │
│  │  • Port 80/443 exposed                                  │    │
│  │  • SSL Certificates (Let's Encrypt)                     │    │
│  │  • Dashboard: traefik.gea.domain.com                   │    │
│  └─────────────────────┬──────────────────────────────────┘    │
│                        │                                         │
│  ┌─────────────────────▼──────────────────────────────────┐    │
│  │  FRONTEND CONTAINER (node:22-alpine)                   │    │
│  │  • Next.js 16 App Router                               │    │
│  │  • Port 3000 (internal)                                │    │
│  │  • Environment: Production                             │    │
│  │  • Health Check: /api/health                           │    │
│  └──────────┬─────────────────────────────┬───────────────┘    │
│             │                             │                      │
│  ┌──────────▼──────────┐      ┌──────────▼──────────┐          │
│  │  REDIS (7.4.4-alpine)│      │ PGBOUNCER (v1.25.1) │          │
│  │  • Port 6379         │      │ • Port 5432         │          │
│  │  • Volume: redis_data│      │ • Transaction mode  │          │
│  │  • 256MB max memory  │      │ • 200 max clients   │          │
│  └──────────────────────┘      └──────────┬──────────┘          │
│                                           │                      │
│                           ┌───────────────▼───────────────┐     │
│                           │ DATABASE (postgres:16.11-alpine)│   │
│                           │  • PostgreSQL 16.11-alpine    │     │
│                           │  • Port 5432 (internal)       │     │
│                           │  • Volume: feedback_db_data   │     │
│                           │  • Database: feedback         │     │
│                           └───────────────────────────────┘     │
│                                                                  │
│  NETWORK: geav3_network (bridge)                                │
│  VOLUMES: traefik_acme, feedback_db_data, redis_data, gea_backups│
└─────────────────────────────────────────────────────────────────┘
```

### Component Diagram (C4 Level 3) - Frontend

```
┌───────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 16 FRONTEND                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │               PRESENTATION LAYER                         │     │
│  │                                                          │     │
│  │  ┌──────────────┐                                       │     │
│  │  │ Public Pages │                                       │     │
│  │  │ • /          │                                       │     │
│  │  │ • /feedback  │                                       │     │
│  │  │ • /helpdesk  │                                       │     │
│  │  └──────────────┘                                       │     │
│  │                                                          │     │
│  │  ┌────────────────────────────────────────────────┐    │     │
│  │  │  ADMIN PORTAL (/admin/*)                       │    │     │
│  │  │  Role-Based Unified Portal                     │    │     │
│  │  ├────────────────────────────────────────────────┤    │     │
│  │  │  • /admin (OAuth login page)                   │    │     │
│  │  │                                                │    │     │
│  │  │  ┌─────────────────────────────────────────┐  │    │     │
│  │  │  │ ADMIN ROLE PAGES                        │  │    │     │
│  │  │  │ • /admin/home (dashboard)               │  │    │     │
│  │  │  │ • /admin/users (user management)        │  │    │     │
│  │  │  │ • /admin/ai-inventory (AI bots)         │  │    │     │
│  │  │  └─────────────────────────────────────────┘  │    │     │
│  │  │                                                │    │     │
│  │  │  ┌─────────────────────────────────────────┐  │    │     │
│  │  │  │ STAFF ROLE PAGES                        │  │    │     │
│  │  │  │ • /admin/staff/home (staff dashboard)   │  │    │     │
│  │  │  └─────────────────────────────────────────┘  │    │     │
│  │  │                                                │    │     │
│  │  │  ┌─────────────────────────────────────────┐  │    │     │
│  │  │  │ SHARED PAGES (Entity-Filtered for Staff)│  │    │     │
│  │  │  │ • /admin/tickets                        │  │    │     │
│  │  │  │ • /admin/analytics                      │  │    │     │
│  │  │  │ • /admin/managedata                     │  │    │     │
│  │  │  │ • /admin/service-requests               │  │    │     │
│  │  │  └─────────────────────────────────────────┘  │    │     │
│  │  └────────────────────────────────────────────────┘    │     │
│  └─────────────────────────────────────────────────────────┘     │
│                              │                                     │
│  ┌───────────────────────────▼─────────────────────────────┐     │
│  │               MIDDLEWARE LAYER                           │     │
│  │  • Authentication Check (NextAuth)                       │     │
│  │  • Role-Based Access Control                            │     │
│  │  • Entity Filtering (Staff)                             │     │
│  │  • Route Protection                                      │     │
│  └───────────────────────────┬─────────────────────────────┘     │
│                              │                                     │
│  ┌───────────────────────────▼─────────────────────────────┐     │
│  │                  API ROUTES LAYER                        │     │
│  │  /api/                                                   │     │
│  │  ├── auth/[...nextauth]/  (NextAuth OAuth)              │     │
│  │  ├── feedback/            (Public submissions)          │     │
│  │  ├── tickets/             (Ticket operations)           │     │
│  │  ├── helpdesk/            (Public ticket lookup)        │     │
│  │  ├── admin/               (Admin operations)            │     │
│  │  │   ├── users/           (User management)             │     │
│  │  │   ├── roles/           (Role listing)                │     │
│  │  │   ├── entities/        (Entity listing)              │     │
│  │  │   └── tickets/         (Ticket CRUD)                 │     │
│  │  └── managedata/          (Master data CRUD)            │     │
│  └───────────────────────────┬─────────────────────────────┘     │
│                              │                                     │
│  ┌───────────────────────────▼─────────────────────────────┐     │
│  │              BUSINESS LOGIC LAYER                        │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │     │
│  │  │ Validation   │  │ Rate Limit   │  │ Email        │  │     │
│  │  │ (Zod)        │  │ (IP-based)   │  │ (SendGrid)   │  │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │     │
│  │  │ Auth Logic   │  │ Response     │  │ Audit        │  │     │
│  │  │ (Sessions)   │  │ Formatting   │  │ Logging      │  │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │     │
│  └───────────────────────────┬─────────────────────────────┘     │
│                              │                                     │
│  ┌───────────────────────────▼─────────────────────────────┐     │
│  │              DATA ACCESS LAYER                           │     │
│  │  • Database Connection via PgBouncer (connection pool)   │     │
│  │  • Redis Caching (analytics data, configurable TTL)      │     │
│  │  • Parameterized Queries (SQL Injection Prevention)      │     │
│  │  • Transaction Management                                │     │
│  │  • Centralized pool (lib/db.ts)                          │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Technology

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 16.x | React framework with SSR/SSG |
| **UI Library** | React | 18.x | Component-based UI |
| **Language** | TypeScript | 5.x | Type-safe JavaScript |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Latest | Pre-built accessible components |
| **Forms** | React Hook Form | 7.x | Form validation & handling |
| **State Management** | React Context | Built-in | Global state (sessions) |
| **HTTP Client** | Fetch API | Built-in | API requests |
| **Charts** | Recharts | 2.x | Data visualization |

### Backend Technology

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | 22 | JavaScript runtime |
| **Framework** | Next.js API Routes | 16.x | RESTful API endpoints |
| **Database** | PostgreSQL | 16 | Relational database |
| **DB Driver** | node-postgres (pg) | 8.x | PostgreSQL client |
| **Authentication** | NextAuth.js | 4.x | OAuth authentication |
| **Validation** | Zod | 4.x | Schema validation |
| **Email** | SendGrid API | 7.x | Transactional emails |

### Infrastructure Technology

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Containerization** | Docker | 29.x | Application containers (Docker 27.x EOL) |
| **Orchestration** | Docker Compose | v5.0+ | Multi-container management |
| **Reverse Proxy** | Traefik | v3.6.7 | Load balancing & SSL |
| **Database** | PostgreSQL | 16.11-alpine | Relational database |
| **Connection Pool** | PgBouncer | v1.25.1-p0 | Database connection pooling |
| **Cache** | Redis | 7.4.4-alpine | Analytics caching |
| **SSL** | Let's Encrypt | - | Free SSL certificates |
| **Version Control** | Git | 2.x | Source code management |
| **CI/CD** | GitHub Actions | - | Automated testing (tests, lint, type check on PR) |

### Security Technology

| Category | Technology | Purpose |
|----------|-----------|---------|
| **OAuth Providers** | Google, Microsoft | Admin/staff identity providers |
| **Citizen Authentication** | Twilio Verify SMS OTP | Passwordless phone-based auth |
| **Session Management** | JWT (NextAuth), Custom (Citizen) | Stateless sessions |
| **Password Hashing** | bcrypt | Citizen password encryption (optional) |
| **Settings Encryption** | AES-256-GCM | Encrypts sensitive settings values |
| **IP Hashing** | SHA256 | Privacy protection |
| **HTTPS** | TLS 1.3 | Transport security |

---

## Component Architecture

### 1. Authentication & Authorization Component

**Purpose:** Secure OAuth-based authentication with role-based access control

**Key Features:**
- OAuth 2.0 integration (Google, Microsoft)
- Email whitelist authorization
- JWT session tokens (2-hour expiration)
- Role-based access (Admin, Staff, Public)
- Entity-based data filtering
- Comprehensive audit logging

**Technology:**
- NextAuth v4 (authentication framework)
- PostgreSQL Adapter (session storage)
- JWT Strategy (stateless tokens)

**Database Tables:**
- `users` - Central authentication
- `user_roles` - Role definitions
- `accounts` - OAuth provider data
- `sessions` - Active sessions
- `user_audit_log` - Activity tracking

**API Endpoints:**
- `GET /api/auth/signin` - Sign-in page
- `POST /api/auth/callback/google` - Google OAuth callback
- `POST /api/auth/callback/azure-ad` - Microsoft OAuth callback
- `GET /api/auth/session` - Get current session
- `GET /api/auth/signout` - Sign-out

**Flow:**
```
User → OAuth Provider → Callback → Email Check → Session Creation → Dashboard
                                      ↓ (fail)
                                 Unauthorized Page
```

---

### 2. Feedback & Grievance Component

**Purpose:** Citizen feedback submission with automatic grievance escalation

**Key Features:**
- 5-star rating system
- Multi-file attachments (5MB limit)
- Auto-escalation to tickets (rating ≤ 2.5)
- IP-based rate limiting (30-60/hour)
- Email notifications to service admin
- SHA256 IP hashing (privacy)

**Database Tables:**
- `service_feedback` - Feedback records
- `feedback_attachments` - File storage
- `grievance_tickets` - Escalated grievances (legacy)
- `submission_rate_limit` - Rate limit tracking

**API Endpoints:**
- `POST /api/feedback/submit` - Submit feedback
- `GET /api/public/services` - Service discovery with filtering (entity, life event, category, search)
- `GET /api/public/services/metadata` - Entity-specific metadata for cascading filters
- `GET /api/feedback/search` - Fuzzy search services by name/description
- `GET /api/feedback/popular-services` - Popular services (top rated, most reviewed)

**Validation Rules:**
- Comment: 10-500 characters
- Email: Valid format (optional)
- Phone: E.164 format (optional)
- Files: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX

---

### 3. Native Ticketing Component

**Purpose:** Comprehensive help desk system with SLA tracking

**Key Features:**
- Multi-channel ticket creation (portal, QR code, mobile)
- Priority levels (High, Medium, Low)
- Status workflow (Open → In Progress → On Hold → Resolved → Closed)
- SLA tracking with breach detection
- Activity timeline with comments
- File attachments
- Assignment to staff users
- Category management

**Database Tables:**
- `tickets` - Main ticket records
- `ticket_activity` - Activity timeline
- `ticket_attachments` - File attachments
- `ticket_categories` - Category definitions
- `ticket_status` - Status definitions
- `priority_levels` - Priority definitions
- `sla_definitions` - SLA targets
- `sla_breaches` - SLA tracking

**API Endpoints:**
- `POST /api/tickets/submit` - Create ticket (public)
- `GET /api/tickets/status/:number` - Check status (public)
- `GET /api/helpdesk/ticket/:number` - Ticket details (public)
- `GET /api/admin/tickets` - List tickets (admin)
- `PATCH /api/admin/tickets/:id` - Update ticket (admin)
- `POST /api/admin/tickets/:id/notes` - Add note (admin)
- `POST /api/admin/tickets/:id/close` - Close ticket (admin)

**SLA Rules:**
- High Priority: 24 hours
- Medium Priority: 72 hours
- Low Priority: 168 hours (7 days)

---

### 4. User Management Component

**Purpose:** Admin interface for managing system users and roles

**Key Features:**
- User CRUD operations
- Role assignment (Admin, Staff, Public)
- Entity assignment (for Staff)
- Activate/deactivate users
- Last login tracking
- User search and filtering

**Database Tables:**
- `users` - User accounts
- `user_roles` - Role definitions
- `entity_master` - Government entities
- `user_audit_log` - Activity tracking

**API Endpoints:**
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Add user
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Deactivate user
- `GET /api/admin/roles` - List roles
- `GET /api/admin/entities` - List entities

**Access Control:**
- Only users with `admin` role can access
- Staff users cannot manage users
- Email whitelist required for all users

---

### 5. Master Data Management Component

**Purpose:** Centralized management of entities, services, and QR codes

**Key Features:**
- Entity hierarchy (Ministry → Department → Agency)
- Service catalog management
- QR code generation and tracking
- Data validation and referential integrity
- Bulk operations support

**Database Tables:**
- `entity_master` - Government entities
- `service_master` - Service catalog
- `qr_codes` - QR code tracking

**API Endpoints:**
- `GET /api/managedata/entities` - List entities
- `POST /api/managedata/entities` - Create entity
- `PUT /api/managedata/entities/:id` - Update entity
- `GET /api/managedata/services` - List services
- `POST /api/managedata/services` - Create service
- `PUT /api/managedata/services/:id` - Update service

**Entity Types:**
- Ministry (top-level)
- Department (under Ministry)
- Agency (under Ministry or Department)

---

### 6. Analytics & Reporting Component

**Purpose:** Real-time insights into system usage and performance

**Key Features:**
- Ticket volume trends
- SLA compliance metrics
- Service performance by entity
- User activity tracking
- Rating distribution
- Response time analytics
- Entity-filtered views (for Staff)

**Database Views:**
- Aggregate queries across tables
- Pre-computed metrics (future: materialized views)
- Time-series data

**API Endpoints:**
- `GET /api/admin/analytics/dashboard` - Dashboard stats
- `GET /api/admin/analytics/tickets` - Ticket analytics
- `GET /api/admin/analytics/sla` - SLA metrics
- `GET /api/admin/analytics/feedback` - Feedback trends

---

### 7. Citizen Portal & Authentication Component

**Purpose:** Passwordless phone-based authentication for citizens accessing government services

**Key Features:**
- SMS OTP verification via Twilio Verify API
- Phone number validation (E.164 format with regional filtering)
- Optional password for returning users (faster login)
- Trusted device management (30-day cookies)
- Account security (max OTP attempts, account blocking)
- 24-hour session duration
- Configurable allowed countries (Grenada + Caribbean + custom)

**Technology:**
- Twilio Verify API (SMS OTP delivery)
- bcrypt (optional password hashing)
- Custom session management (separate from NextAuth)
- AES-256-GCM encryption (credentials in settings)

**Database Tables:**
- `citizens` - Citizen accounts (phone, optional password, profile)
- `citizen_sessions` - Active citizen sessions
- `citizen_trusted_devices` - Remembered devices
- `citizen_otp` - OTP verification history
- `citizen_account_blocks` - Security blocks after failed attempts

**API Endpoints:**
- `POST /api/citizen/auth/send-otp` - Send SMS OTP code
- `POST /api/citizen/auth/verify-otp` - Verify OTP and create session
- `POST /api/citizen/auth/login` - Password-based login (if set)
- `POST /api/citizen/auth/complete-registration` - Complete profile setup
- `GET /api/citizen/auth/session` - Get current session
- `POST /api/citizen/auth/logout` - End session

**Settings Configuration:**
- **Enable Citizen Login**: Master toggle
- **Twilio Account SID/Auth Token**: Encrypted credentials
- **Twilio Verify Service SID**: Service configuration
- **Allowed Countries**: Multi-select region filtering
- **OTP Expiry**: 1-15 minutes (default 5)
- **Max OTP Attempts**: 1-10 (default 3)
- **Session Duration**: 1-168 hours (default 24)
- **Device Trust Duration**: 7-90 days (default 30)

**Security Features:**
- Rate limiting on OTP sending
- Account blocking after failed attempts
- Phone number deduplication
- Encrypted credentials storage
- Audit logging of all auth events

**Flow:**
```
Citizen → Enter Phone (+1-473-xxx-xxxx)
    ↓
Twilio Verify API → Send SMS OTP
    ↓
Citizen enters 6-digit code → Verify OTP
    ↓
Create session + Trusted device cookie → Citizen Dashboard
    ↓
(Optional) Set password for faster future login
```

---

### 8. System Settings Management Component

**Purpose:** Centralized configuration management with encryption and audit logging

**Key Features:**
- 100+ configurable settings across 9 categories
- AES-256-GCM encryption for sensitive values (API keys, tokens, secrets)
- Real-time validation before saving
- Audit trail (who, what, when, from which IP)
- Test functionality for integrations (Twilio SMS, SendGrid Email)
- Some settings require application restart
- UI-based management (no code changes needed)

**Technology:**
- AES-256-GCM (Node.js crypto module)
- Per-value encryption with unique IVs
- Base64 encoding for storage
- Encryption key from environment variable

**Database Tables:**
- `system_settings` - All configuration values (key-value pairs with encryption flag)
- `settings_audit_log` - Complete audit trail of changes
- `leadership_contacts` - Dynamic leadership team (About page)

**Settings Categories:**

1. **System** (General, Branding, Contact)
   - Site name, logo/favicon upload, contact emails, session duration

2. **Authentication** (Google OAuth, Microsoft OAuth, Citizen Login)
   - OAuth credentials, Twilio SMS OTP configuration

3. **Integrations** (SendGrid Email, Chatbot)
   - Email API keys, chatbot integration URL

4. **Business Rules** (Rate Limits, Priority Thresholds, File Upload)
   - Feedback/grievance rate limits, priority thresholds, file size limits

5. **Performance** (Redis Caching)
   - Analytics caching toggle, cache TTL (60-600 seconds)

6. **Content** (Footer Links, Leadership Contacts)
   - Government website URLs, dynamic leadership team with photos

7. **User Management** (Admin Allowed Entities)
   - Which entities can have admin users

8. **Service Providers** (Provider Entities)
   - Which entities can receive service requests from others

9. **Database** (Backups, Restore, Schedule)
   - Manual/automated backup configuration, retention policies

**API Endpoints:**
- `GET /api/admin/settings` - Get all settings (with masked sensitive values)
- `PUT /api/admin/settings` - Update settings (encrypts sensitive values)
- `POST /api/admin/settings/test-sms` - Test Twilio SMS configuration
- `POST /api/admin/settings/test-email` - Test SendGrid email configuration
- `GET /api/admin/database/backups` - List database backups
- `POST /api/admin/database/backups` - Create manual backup
- `POST /api/admin/database/backups/:id/restore` - Restore from backup

**Encryption Process:**
```
Sensitive Setting Value → AES-256-GCM Encrypt
    ↓
Generate unique IV → Encrypt → Base64 encode
    ↓
Store: {value: "encrypted_base64", encrypted: true, iv: "base64_iv"}
    ↓
On retrieval: Decrypt with IV → Return plaintext (admin only)
    ↓
In UI: Show as masked "••••••••" until admin requests reveal
```

**Example Settings:**
- `TWILIO_ACCOUNT_SID` (encrypted)
- `SENDGRID_API_KEY` (encrypted)
- `SITE_NAME` (plaintext)
- `ANALYTICS_CACHE_ENABLED` (boolean)
- `FEEDBACK_RATE_LIMIT` (integer, 1-100)

---

## Data Architecture

### Database Schema Overview

**Total Tables:** 40+ (30 original + 5 citizen auth + 3 system settings + 2 additional)
**Total Indexes:** 60+
**Total Foreign Keys:** 25+
**Database Size:** ~80MB (with sample data)

### Table Categories

#### Master Data Tables (7)
- `entity_master` - Government entities
- `service_master` - Service catalog
- `qr_codes` - QR code tracking
- `ticket_categories` - Ticket categories
- `ticket_status` - Status definitions
- `priority_levels` - Priority definitions
- `sla_definitions` - SLA targets

#### Transactional Tables (5)
- `service_feedback` - Feedback submissions
- `feedback_attachments` - Feedback files
- `grievance_tickets` - Legacy grievances
- `tickets` - Native tickets
- `ticket_activity` - Ticket timeline
- `ticket_attachments` - Ticket files

#### Security/Audit Tables (3)
- `submission_rate_limit` - Rate limiting
- `submission_attempts` - Attempt tracking
- `user_audit_log` - User activity

#### Admin/Staff Authentication Tables (8)
- `users` - User accounts
- `user_roles` - Role definitions
- `accounts` - OAuth data
- `sessions` - Active sessions
- `verification_tokens` - Email verification
- `entity_user_assignments` - User-entity mapping
- `user_permissions` - Fine-grained permissions
- `user_audit_log` - Activity tracking

#### Citizen Authentication Tables (5) - NEW
- `citizens` - Citizen accounts (phone, optional password, profile)
- `citizen_sessions` - Active citizen sessions
- `citizen_trusted_devices` - Remembered device cookies
- `citizen_otp` - OTP verification history
- `citizen_account_blocks` - Security blocks after failed auth attempts

#### System Settings Tables (3) - NEW
- `system_settings` - Configuration key-value store (100+ settings)
- `settings_audit_log` - Settings change audit trail
- `leadership_contacts` - Dynamic leadership team (About page)

### Data Flow Patterns

#### Pattern 1: Feedback to Ticket Escalation
```
service_feedback (rating ≤ 2.5)
    ↓
Auto-create record in grievance_tickets (legacy)
    ↓
Auto-create record in tickets (new ticketing system)
    ↓
Create initial activity in ticket_activity
    ↓
Send email notification via SendGrid
```

#### Pattern 2: Staff Entity Filtering
```
Staff user logs in → Session contains entity_id
    ↓
API request → Extract session.user.entityId
    ↓
SQL query → WHERE entity_id = $1 (parameterized)
    ↓
Return only entity-specific data
```

#### Pattern 3: Audit Trail
```
User performs action (login, create ticket, update user)
    ↓
Insert record in user_audit_log
    ↓
Store: user_id, action, details (JSONB), ip_address, timestamp
    ↓
Admin can query audit log for compliance
```

### Database Relationships

**Key Foreign Keys:**
- `service_master.entity_id` → `entity_master.unique_entity_id`
- `tickets.service_id` → `service_master.service_id`
- `tickets.entity_id` → `entity_master.unique_entity_id`
- `tickets.category_id` → `ticket_categories.category_id`
- `tickets.status_id` → `ticket_status.status_id`
- `users.role_id` → `user_roles.role_id`
- `users.entity_id` → `entity_master.unique_entity_id`
- `accounts.user_id` → `users.id` (CASCADE)
- `sessions.user_id` → `users.id` (CASCADE)

### Data Retention Policy

| Data Type | Retention Period | Archive Strategy |
|-----------|------------------|------------------|
| Active Tickets | Indefinite | - |
| Closed Tickets | 7 years | Export to CSV annually |
| Feedback Records | 5 years | Archive to S3 (future) |
| Audit Logs | 3 years | Compress and archive |
| Sessions | 2 hours | Auto-expire |
| Rate Limit Data | 24 hours | Auto-cleanup |

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. User visits /admin
   ↓
2. Middleware checks session cookie
   ↓
3. No valid session → Redirect to /auth/signin
   ↓
4. User clicks "Continue with Google" or "Continue with Microsoft"
   ↓
5. OAuth provider consent screen
   ↓
6. User approves → OAuth callback
   ↓
7. NextAuth receives: email, name, profile picture
   ↓
8. Query: SELECT * FROM users WHERE email = ? AND is_active = TRUE
   ↓
9a. User found → Generate JWT with role & entity
   ↓
   Set httpOnly cookie (2-hour expiration)
   ↓
   Redirect to /admin (original destination)

9b. User NOT found → Redirect to /auth/unauthorized
```

### Authorization Layers

#### Layer 1: Route Protection (Middleware)
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('next-auth.session-token')

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect('/auth/signin')
    }
  }
}
```

#### Layer 2: Role-Based Access Control (API Routes)
```typescript
// API route
const session = await getServerSession(authOptions)

if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

if (session.user.roleType !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

#### Layer 3: Entity-Based Data Filtering (Database Queries)
```typescript
let query = 'SELECT * FROM tickets WHERE 1=1'
const params = []

if (session.user.roleType === 'staff') {
  query += ' AND entity_id = $1'
  params.push(session.user.entityId)
}

const result = await pool.query(query, params)
```

### Security Features

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **OAuth-Only Auth** | NextAuth v4 | No password storage |
| **Email Whitelist** | Database check | Authorized users only |
| **JWT Sessions** | NextAuth JWT | Stateless sessions |
| **httpOnly Cookies** | NextAuth config | Prevent XSS attacks |
| **sameSite: strict** | Cookie settings | Prevent CSRF attacks |
| **Rate Limiting** | IP-based tracking | Prevent abuse |
| **IP Hashing** | SHA256 | Privacy protection |
| **SQL Injection Protection** | Parameterized queries | Database security |
| **XSS Prevention** | React escaping | UI security |
| **File Upload Validation** | Type & size checks | Prevent malicious files |
| **HTTPS Only** | Traefik SSL | Encrypted transport |
| **Audit Logging** | user_audit_log | Activity tracking |

### Security Best Practices

✅ **Implemented:**
- No passwords stored (OAuth only)
- 2-hour session timeout
- IP-based rate limiting
- SHA256 IP hashing
- Parameterized SQL queries
- React automatic XSS prevention
- httpOnly + sameSite cookies
- Let's Encrypt SSL
- Audit logging

🔜 **Planned (Future):**
- Content Security Policy (CSP) headers
- Rate limiting on authentication endpoints
- Multi-factor authentication (MFA)
- Database encryption at rest
- File upload scanning (antivirus)

✅ **Recently Implemented:**
- API key authentication for external integrations (External API)

---

## Integration Architecture

### Current Integrations

#### 1. OAuth Providers

**Google OAuth 2.0:**
- **Purpose:** User authentication
- **Protocol:** OAuth 2.0 with OIDC
- **Scopes:** `openid`, `email`, `profile`
- **Callback:** `/api/auth/callback/google`

**Microsoft Azure AD:**
- **Purpose:** User authentication (optional)
- **Protocol:** OAuth 2.0 with OIDC
- **Scopes:** `openid`, `email`, `profile`, `User.Read`
- **Callback:** `/api/auth/callback/azure-ad`

#### 2. SendGrid Email API

**Purpose:** Transactional email notifications
**API Version:** v3
**Authentication:** API Key

**Email Types:**
- Low rating alerts (rating ≤ 2.5)
- Ticket creation confirmations
- Ticket status updates
- Admin notifications

**Rate Limits:**
- Free tier: 100 emails/day
- Production: 40,000 emails/month (recommended plan)

### Future Integrations (Roadmap)

#### 1. Government Service Bus
- **Purpose:** Inter-ministry data exchange
- **Protocol:** REST API or message queue
- **Use Case:** Ticket routing between ministries

#### 2. National ID System
- **Purpose:** Citizen authentication
- **Protocol:** OAuth 2.0 or SAML
- **Use Case:** Replace Google OAuth for citizens

#### 3. GIS Mapping Service
- **Purpose:** Location-based service delivery
- **Protocol:** REST API (Google Maps or OpenStreetMap)
- **Use Case:** Map service locations

#### 4. Payment Gateway
- **Purpose:** Service fee collection
- **Protocol:** REST API
- **Use Case:** Paid government services

#### 5. SMS Gateway
- **Purpose:** Mobile notifications
- **Protocol:** REST API
- **Use Case:** Ticket status SMS updates

---

## Deployment Architecture

### Docker Compose Stack

```yaml
services:
  traefik:
    image: traefik:v3.6.7
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/traefik.yml:ro
      - traefik_acme:/acme
    networks:
      - geav3_network

  feedback_db:
    image: postgres:16.11-alpine
    environment:
      - POSTGRES_DB=feedback
      - POSTGRES_USER=feedback_user
      - POSTGRES_PASSWORD=${FEEDBACK_DB_PASSWORD}
    volumes:
      - feedback_db_data:/var/lib/postgresql/data
    networks:
      - geav3_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U feedback_user -d feedback"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.4.4-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - geav3_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgbouncer:
    image: edoburu/pgbouncer:v1.25.1-p0
    environment:
      - DATABASE_URL=postgres://${FEEDBACK_DB_USER}:${FEEDBACK_DB_PASSWORD}@feedback_db:5432/${FEEDBACK_DB_NAME}
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=200
      - DEFAULT_POOL_SIZE=20
      - MIN_POOL_SIZE=5
      - RESERVE_POOL_SIZE=5
    depends_on:
      feedback_db:
        condition: service_healthy
    networks:
      - geav3_network
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "localhost", "-p", "5432"]
      interval: 10s
      timeout: 5s
      retries: 5

  frontend:
    build: ./frontend
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=https://gea.domain.com
      - FEEDBACK_DB_HOST=pgbouncer
      - FEEDBACK_DB_PORT=5432
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`gea.domain.com`)"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
    depends_on:
      feedback_db:
        condition: service_healthy
      pgbouncer:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - geav3_network

volumes:
  traefik_acme:
  feedback_db_data:
  redis_data:
  gea_backups:
  documents_data:

networks:
  geav3_network:
    name: geav3_network
    driver: bridge
```

### Environment Configuration

**Production (.env):**
```bash
# Application
NODE_ENV=production
NEXTAUTH_URL=https://gea.your-domain.com
NEXTAUTH_SECRET=<32-char-random-string>

# Database
DB_HOST=feedback_db
DB_PORT=5432
DB_NAME=feedback
DB_USER=feedback_user
DB_PASSWORD=<strong-password>

# OAuth
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
MICROSOFT_CLIENT_ID=<azure-client-id>
MICROSOFT_CLIENT_SECRET=<azure-client-secret>

# Email
SENDGRID_API_KEY=SG.<sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SERVICE_ADMIN_EMAIL=admin@your-domain.com

# SSL
LETS_ENCRYPT_EMAIL=admin@your-domain.com
```

### Deployment Process

**Initial Deployment:**
```bash
# 1. Clone repository
git clone https://github.com/abhirupbanerjee/GEAv3.git
cd GEAv3

# 2. Configure environment
cp .env.example .env
nano .env  # Edit with production values

# 3. Initialize database
./database/01-init-db.sh
./database/04-nextauth-users.sh
ADMIN_EMAIL="admin@your-domain.com" ADMIN_NAME="Admin" ./database/05-add-initial-admin.sh

# 4. Build and start containers
docker-compose build
docker-compose up -d

# 5. Verify deployment
docker-compose ps
docker-compose logs -f frontend
```

**Update Deployment:**
```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild and restart
docker-compose build --no-cache frontend
docker-compose up -d frontend

# 3. Run database migrations (if any)
./database/migrations/YYYYMMDD-description.sh

# 4. Verify
docker-compose logs -f frontend
```

### SSL Certificate Management

**Let's Encrypt (Automatic):**
- Traefik automatically requests SSL certificates
- Auto-renewal 30 days before expiration
- Certificates stored in `./letsencrypt` volume

**Manual Certificate Check:**
```bash
# View certificate expiration
docker exec traefik cat /letsencrypt/acme.json | jq '.letsencrypt.Certificates[0].domain.main'
```

---

## Scalability & Performance

### Current Capacity

| Metric | Current | Bottleneck |
|--------|---------|------------|
| **Concurrent Users** | 30-50 | Database connections |
| **Target Capacity** | 100+ users | Database + memory |
| **Requests/Second** | ~50 | Node.js single thread |
| **Database Size** | 70MB | Disk I/O |
| **Session Storage** | 2 hours × 100 users | Database sessions table |

### Infrastructure Specifications

| Component | Current Spec | Upgrade Path |
|-----------|--------------|--------------|
| **VM** | Standard_D2s_v4 (Azure) | Standard_D2s_v5 / D4s_v4 |
| **RAM** | 8GB | 16GB (for 100+ users) |
| **vCPUs** | 2 | 2 |
| **Storage** | 64GB Premium SSD | 64-128GB Premium SSD |
| **Performance** | Consistent (D-series) | No CPU throttling |

> **Note:** Upgraded from B-series burstable VMs to D-series for consistent performance and better Docker build times

### Performance Optimizations

#### Database Level
- **Indexes:** 44+ indexes on foreign keys and query columns
- **Connection Pooling:** PgBouncer (200 max clients, 20 pool size)
- **Prepared Statements:** All queries use parameterized statements
- **Centralized Pool:** Single connection pool via `lib/db.ts`

#### Application Level
- **Next.js SSG:** Static pages for public content
- **Next.js ISR:** Incremental Static Regeneration for dynamic content
- **Redis Caching:** Analytics data cached (configurable TTL, default 5 min)
- **Cache Invalidation:** Auto-invalidate on admin service request submission
- **Image Optimization:** Next.js automatic image optimization

#### Infrastructure Level
- **CDN:** CloudFront or Cloudflare for static assets (future)
- **Load Balancer:** Multiple frontend containers (future)
- **Database Replication:** PostgreSQL read replicas (future)

### Scaling Strategy

#### Vertical Scaling (Immediate)
```yaml
# Increase container resources
frontend:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 4G
      reservations:
        cpus: '1.0'
        memory: 2G

feedback_db:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 4G
```

#### Horizontal Scaling (Future)
```yaml
# Multiple frontend replicas
frontend:
  deploy:
    replicas: 3
  # Add Redis for shared session storage
  depends_on:
    - redis
```

---

## Disaster Recovery

### Backup Strategy

#### Database Backups

**Automated Daily Backups:**
```bash
# Cron job (daily at 2 AM)
0 2 * * * /usr/local/bin/backup-db.sh

# backup-db.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec feedback_db pg_dump -U feedback_user feedback | gzip > /backups/gea_backup_$DATE.sql.gz
# Keep last 30 days
find /backups -name "gea_backup_*.sql.gz" -mtime +30 -delete
```

**Weekly Full Backups:**
```bash
# Include all data + schemas
0 2 * * 0 /usr/local/bin/backup-full.sh
```

#### Application Backups

**Configuration Backup:**
- `.env` file (encrypted, stored off-server)
- Traefik configuration
- Docker Compose file
- SSL certificates (Let's Encrypt)

### Recovery Procedures

#### Database Recovery
```bash
# 1. Stop application
docker-compose down

# 2. Restore database from backup
gunzip < /backups/gea_backup_20251124.sql.gz | \
  docker exec -i feedback_db psql -U feedback_user feedback

# 3. Restart application
docker-compose up -d

# 4. Verify data integrity
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT COUNT(*) FROM tickets;"
```

#### Complete System Recovery
```bash
# 1. Provision new server
# 2. Install Docker + Docker Compose
# 3. Clone repository
git clone https://github.com/abhirupbanerjee/GEAv3.git
cd GEAv3

# 4. Restore .env configuration
cp /secure-backup/.env .

# 5. Restore database
# (Follow Database Recovery above)

# 6. Restore SSL certificates
cp -r /secure-backup/letsencrypt ./

# 7. Start application
docker-compose up -d
```

### High Availability (Future)

**Recommended Architecture:**
```
┌─────────────┐
│ Load        │
│ Balancer    │ (AWS ALB / HAProxy)
└──────┬──────┘
       │
   ┌───┴───┬───────┬───────┐
   │       │       │       │
   ▼       ▼       ▼       ▼
Frontend Frontend Frontend Frontend
   │       │       │       │
   └───┬───┴───┬───┴───┬───┘
       │       │       │
       ▼       ▼       ▼
   ┌───────────────────────┐
   │ PostgreSQL Cluster    │
   │ (Primary + 2 Replicas)│
   └───────────────────────┘
```

**Target SLA:** 99.9% uptime (8.76 hours downtime/year)

---

## Future Roadmap

### Phase 3: Enhanced Features (Q1 2026)

#### 3a. Public User Portal
- ✅ OAuth registration for citizens
- ✅ Personal dashboard (view my tickets)
- ✅ Notification preferences
- ✅ Saved services

#### 3b. Advanced Analytics
- ✅ Power BI integration
- ✅ Custom report builder
- ✅ Exportable dashboards (PDF, Excel)
- ✅ Predictive analytics (ticket volume forecasting)

#### 3c. Mobile App
- ✅ React Native mobile app
- ✅ Push notifications
- ✅ Offline mode
- ✅ QR code scanner

### Phase 4: AI & Automation (Q3 2026)

#### 4a. AI Chatbot
- ✅ Natural language ticket submission
- ✅ Auto-categorization
- ✅ Suggested responses for staff
- ✅ Sentiment analysis

#### 4b. Workflow Automation
- ✅ Auto-assignment rules
- ✅ Escalation workflows
- ✅ Email templates
- ✅ Scheduled reports

### Phase 5: Integration & Expansion (Q4 2026)

#### 5a. Government Service Bus
- ✅ Inter-ministry ticket routing
- ✅ Shared citizen database
- ✅ Single sign-on across government

#### 5b. Payment Integration
- ✅ Online service fee payment
- ✅ Payment receipt generation
- ✅ Refund processing

#### 5c. GIS Mapping
- ✅ Map view of service locations
- ✅ Location-based service search
- ✅ Geographic analytics

---

## Performance Metrics

### Current System Performance

| Metric | Value | Target |
|--------|-------|--------|
| **Page Load Time (Home)** | 1.2s | <2s |
| **API Response Time (avg)** | 150ms | <300ms |
| **Database Query Time (avg)** | 50ms | <100ms |
| **Concurrent Users (max tested)** | 100 | 500 |
| **Uptime (last 30 days)** | 99.5% | 99.9% |

### Monitoring (Future)

**Tools to implement:**
- **Application Monitoring:** New Relic / DataDog
- **Database Monitoring:** pgAdmin / Grafana + Prometheus
- **Log Aggregation:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime Monitoring:** Pingdom / UptimeRobot
- **Error Tracking:** Sentry

---

**Document Version:** 1.7
**Last Updated:** March 2026
**Maintained By:** GEA Portal Development Team
**System Version:** Phase 3.4.0 (Documents Management + Infrastructure Updates)

**Change Log:**
- v1.7 (Mar 2026): Updated Traefik v3.6 → v3.6.7, added documents_data volume, updated API endpoints (114+ → 122+), updated database tables (40+ → 45), added Documents Management component
- v1.6 (Feb 22, 2026): Updated API endpoints (114+), corrected infrastructure specs (B2s 4GB), added gea_backups volume, updated Tailwind CSS (4.x) and Zod (4.x) versions, updated database indexes (60+)
- v1.5 (Jan 19, 2026): Added Citizen Portal & Authentication Component (Twilio SMS OTP), System Settings Management Component (9 categories, AES-256-GCM encryption), updated database tables (30→40+), added new API endpoints, updated metrics (85+ endpoints, 100+ settings)
- v1.4 (Jan 19, 2026): Added infrastructure specifications, updated capacity metrics
- v1.3 (Jan 2026): Added Redis caching and PgBouncer connection pooling documentation
