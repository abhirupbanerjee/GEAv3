[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=abhirupbanerjee_GEAv3&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=abhirupbanerjee_GEAv3)

# Grenada EA Portal v3

**Enterprise Architecture Portal for the Government of Grenada**

A modern, full-stack web platform supporting digital transformation initiatives across Ministries, Departments, and Agencies (MDAs). Built with Next.js 14, PostgreSQL, and containerized with Docker for seamless deployment.

---

## 🎯 What's This?

Complete digital portal system with:
- **Service Feedback System** - 5-point rating with auto-grievance creation
- **Native Ticketing System** - Citizen grievances and EA service requests with SLA tracking
- **Admin Portal** - Ticket management, analytics, and master data administration
- **Staff Portal** - Entity-specific access for ministry/department officers
- **AI Chatbot Assistant** - Embedded chatbot (Azure Cloud hosted, can be enabled/disabled)
- **AI Bot Integration** - Centralized bot inventory and iframe-based chat interface
- **OAuth Authentication** - Google & Microsoft sign-in with role-based access control

**Status:** ✅ Production-ready | **Version:** 3.2.0 (Multi-Entity Service Requests + Admin Settings)

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Ubuntu 22.04 LTS | **Ubuntu 24.04 LTS** |
| **Docker** | 27.5.1 | **27.5.1** (Required) |
| **Docker Compose** | v2.20+ | **v2.40+** |
| **RAM** | 4 GB | 8 GB |
| **vCPUs** | 2 | 2-4 |
| **Disk** | 30 GB | **50 GB** (single disk) |
| **Domain** | Required | With Cloudflare DNS |

> **Production Reference:** GoG portal runs on Azure Standard_B2s (4GB RAM, 2 vCPUs, Ubuntu 24.04.3 LTS)

### Tested Production Environment

| Component | Version | Notes |
|-----------|---------|-------|
| **OS** | Ubuntu 24.04.3 LTS | Azure VM (kernel 6.14.0-azure) |
| **Docker** | 27.5.1 | ⚠️ Required - v28+/29+ incompatible with Traefik |
| **Docker Compose** | v2.40+ | Plugin version |
| **Node.js** | 20.x (container) | Alpine-based image |
| **PostgreSQL** | 15.14-alpine | Database container |
| **PgBouncer** | v1.23.1-p3 | Connection pooling (edoburu/pgbouncer) |
| **Redis** | 7.4.4-alpine | Analytics caching |
| **Traefik** | v3.0 | Reverse proxy + SSL |

> **⚠️ Docker Version Requirement:** Use Docker 27.5.1. Docker 28.x and 29.x have API compatibility issues with Traefik v3.x. See [Docker & Traefik Compatibility Guide](docs/DOCKER_TRAEFIK_COMPATIBILITY.md) for details.

### Deploy in 5 Steps

```bash
# 1. Clone repository
git clone https://github.com/abhirupbanerjee/GEAv3.git
cd GEAv3

# 2. Configure environment
cp .env.example .env
nano .env  # Set passwords, domains, and API keys

# 3. Initialize database
docker compose up -d feedback_db

# Option A: Quick setup with production data + synthetic test data
./database/99-consolidated-setup.sh --reload

# Option B: Manual initialization (production - no test data)
./database/01-init-db.sh
./database/scripts/11-load-master-data.sh

# 4. Set up OAuth authentication
./database/04-nextauth-users.sh
ADMIN_EMAIL="admin@gov.gd" ADMIN_NAME="Admin Name" ./database/scripts/05-add-initial-admin.sh

# 5. Deploy application
docker compose up -d
```

**That's it!** Portal will be available at your configured domain with auto-SSL.

---

## 🖥️ New VM Deployment

For setting up a fresh VM (Azure, AWS, or on-premise), see the comprehensive guide:

**[GEAv3 VM Setup Guide](docs/VM_SETUP_GUIDE.md)**

### Quick VM Specs Reference

```
OS:      Ubuntu 24.04 LTS
RAM:     4GB minimum
vCPUs:   2
Disk:    50GB single consolidated disk
Ports:   22 (SSH), 80 (HTTP), 443 (HTTPS)
```

### Capture Current VM Config

Run this on your existing VM to generate specs for replication:

```bash
./scripts/capture-vm-config.sh
```

---

## 📋 Architecture

### System Components

| Component | Technology | Purpose | Container |
|-----------|-----------|---------|-----------|
| **Frontend** | Next.js 14 (App Router) | Main portal & admin UI | `frontend` |
| **Database** | PostgreSQL 15.14-alpine | Data storage & user management | `feedback_db` |
| **Connection Pool** | PgBouncer v1.23.1 | Database connection pooling | `pgbouncer` |
| **Cache** | Redis 7.4.4-alpine | Analytics caching | `redis` |
| **Reverse Proxy** | Traefik v3.0 | SSL termination & routing | `traefik` |
| **Authentication** | NextAuth v4 | OAuth (Google/Microsoft) | (in frontend) |

### Production Container Status

```bash
# Expected output from: docker compose ps
NAMES         IMAGE                            STATUS                    PORTS
frontend      geav3-frontend                   Up X minutes              3000/tcp
feedback_db   postgres:15.14-alpine            Up X minutes (healthy)    5432/tcp
pgbouncer     edoburu/pgbouncer:v1.23.1-p3     Up X minutes (healthy)    5432/tcp
redis         redis:7.4.4-alpine               Up X minutes (healthy)    6379/tcp
traefik       traefik:v3.0                     Up X minutes              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Technology Stack

**Frontend:**
- Next.js 14 (TypeScript) with App Router
- React 18 with Server Components
- Tailwind CSS for styling
- Zod for schema validation
- NextAuth for authentication

**Backend:**
- Next.js API Routes (RESTful)
- PostgreSQL 15 database
- node-postgres (pg) driver
- SendGrid for email notifications

**Infrastructure:**
- Docker & Docker Compose
- Traefik v3.0 (reverse proxy & SSL)
- Let's Encrypt (auto-SSL)
- PgBouncer (database connection pooling)
- Redis (analytics caching)

---

## 📁 Project Structure

```
gogeaportal/v3/
│
├── 📄 Documentation
│   ├── README.md                          # This file
│   ├── .env.example                       # Environment template
│   └── docs/
│       ├── index.md                       # Complete documentation index
│       ├── VM_SETUP_GUIDE.md              # New VM deployment guide
│       ├── API_REFERENCE.md               # All API endpoints
│       ├── DATABASE_REFERENCE.md          # Database schema & setup
│       ├── AUTHENTICATION.md              # OAuth setup & configuration
│       └── AI_BOT_INTEGRATION.md          # AI chatbot configuration guide
│
├── 🗄️ Database
│   └── database/
│       ├── README.md                      # Complete DBA guide
│       ├── 99-consolidated-setup.sh       # Main orchestrator (--reload, --verify, etc.)
│       ├── config.sh                      # Shared configuration
│       ├── 01-init-db.sh                  # Main database initialization
│       ├── 04-nextauth-users.sh           # Authentication tables setup
│       ├── scripts/
│       │   ├── 05-add-initial-admin.sh    # Add first admin user
│       │   ├── 10-clear-all-data.sh       # Clear all data
│       │   ├── 11-load-master-data.sh     # Load production master data
│       │   ├── 12-generate-synthetic-data.sh  # Generate test data
│       │   └── 13-verify-master-data.sh   # Comprehensive data verification
│       ├── lib/                           # Shared functions
│       ├── sql/                           # SQL templates
│       └── master-data/                   # Production data files
│
├── 🔧 Scripts
│   └── scripts/
│       └── capture-vm-config.sh           # VM configuration capture utility
│
├── ⚙️ Configuration Files
│   ├── .env.example                       # Environment variables template
│   ├── .env                               # Your config (create from template)
│   ├── docker-compose.yml                 # Service orchestration
│   └── traefik.yml                        # Reverse proxy config
│
└── 🎨 Frontend Application
    └── frontend/
        ├── Dockerfile                     # Multi-stage production build
        ├── package.json                   # Dependencies
        ├── next.config.js                 # Next.js configuration
        ├── tailwind.config.js             # Tailwind CSS config
        ├── tsconfig.json                  # TypeScript config
        │
        ├── public/
        │   ├── images/                    # Static images
        │   ├── api/                       # OpenAPI specifications
        │   │   ├── dashboard.yaml         # Dashboard API spec
        │   │   ├── tickets.yaml           # Tickets API spec
        │   │   ├── feedback.yaml          # Feedback API spec
        │   │   ├── grievances.yaml        # Grievances API spec
        │   │   └── service-requirements.yaml  # Service requirements spec
        │   ├── openapi.yaml               # Combined OpenAPI specification
        │   ├── bot-api-prompt.md          # Bot API integration guide
        │   ├── bot-api-functions.json     # Function calling schemas
        │   ├── bot-api-tools-openai.json  # OpenAI tools format
        │   ├── bot-api-prompts/           # Domain-specific bot prompts
        │   │   ├── dashboard.md
        │   │   ├── feedback.md
        │   │   ├── grievances.md
        │   │   ├── tickets.md
        │   │   └── service-requirements.md
        │   └── config/
        │       └── bots-config.json       # AI bot inventory
        │
        └── src/
            ├── app/
            │   ├── api/                   # API Routes (42+ endpoints)
            │   │   ├── auth/              # NextAuth endpoints
            │   │   ├── content/           # Page context API (for AI bot)
            │   │   ├── feedback/          # Service feedback APIs
            │   │   ├── tickets/           # Public ticket APIs
            │   │   ├── helpdesk/          # Ticket lookup APIs
            │   │   ├── admin/             # Admin management APIs
            │   │   ├── managedata/        # Master data CRUD
            │   │   └── external/          # External API (bot/integration access)
            │   │       ├── dashboard/     # Aggregated statistics
            │   │       ├── tickets/       # Ticket queries with PII masking
            │   │       ├── feedback/      # Feedback record queries
            │   │       ├── grievances/    # Grievance queries
            │   │       └── services/      # Service requirements
            │   │
            │   ├── layout.tsx             # Root layout
            │   ├── page.tsx               # Home page
            │   ├── about/                 # About page
            │   ├── auth/                  # Sign-in & error pages
            │   ├── admin/                 # Admin portal (protected)
            │   ├── staff/                 # Staff portal (entity-specific)
            │   ├── helpdesk/              # Public ticket lookup
            │   └── feedback/              # Feedback forms
            │
            ├── components/                # React components
            │   ├── ChatBot.tsx            # AI chatbot iframe component
            │   ├── layout/                # Header, Footer, Navigation
            │   ├── home/                  # Homepage components
            │   └── admin/                 # Admin UI components
            │
            ├── providers/                 # React Context providers
            │
            ├── hooks/                     # Custom React hooks
            │
            ├── types/                     # TypeScript type definitions
            │
            ├── lib/                       # Utilities & configurations
            │   ├── auth.ts                # NextAuth configuration
            │   ├── db.ts                  # Database connection pool
            │   ├── db/                    # Database helpers
            │   ├── schemas/               # Zod validation schemas
            │   ├── utils/                 # Helper functions
            │   ├── admin-auth.ts          # Authorization helpers
            │   └── piiMask.ts             # PII masking for External API
            │
            ├── config/
            │   ├── env.ts                 # Environment configuration
            │   ├── content.ts             # Static content
            │   └── navigation.ts          # Navigation items
            │
            └── middleware.ts              # Route protection & auth
```

---

## ⚙️ Configuration

### Required: Environment Variables

The portal requires **~63 environment variables**. Copy `.env.example` to `.env` and configure:

| Category | Variables | Required |
|----------|-----------|----------|
| **Domains** | BASE_DOMAIN, FRONTEND_DOMAIN, etc. | ✅ |
| **Database** | FEEDBACK_DB_* (5 vars) | ✅ |
| **Authentication** | NEXTAUTH_*, GOOGLE_*, MICROSOFT_* | ✅ |
| **Email** | SENDGRID_* (4 vars) | ✅ |
| **Rate Limiting** | EA_SERVICE_RATE_LIMIT, GRIEVANCE_RATE_LIMIT, FEEDBACK_RATE_LIMIT | ✅ |
| **File Uploads** | MAX_FILE_SIZE, MAX_TOTAL_UPLOAD_SIZE, ALLOWED_FILE_TYPES | ✅ |
| **External API** | EXTERNAL_API_KEY | Optional (for bot access) |
| **URLs** | GOG_URL, WIKI_URL, DMS_URL, CHATBOT_URL, etc. | Optional |

```bash
# === Domain Configuration ===
BASE_DOMAIN=your-domain.com
FRONTEND_DOMAIN=gea.your-domain.com

# === SSL Configuration ===
LETS_ENCRYPT_EMAIL=your-email@your-domain.com

# === Database Configuration ===
FEEDBACK_DB_PASSWORD=generate_secure_password_here
FEEDBACK_DB_HOST=feedback_db
FEEDBACK_DB_PORT=5432
FEEDBACK_DB_NAME=feedback
FEEDBACK_DB_USER=feedback_user

# === NextAuth Configuration ===
NEXTAUTH_URL=https://gea.your-domain.com
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# === Google OAuth ===
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# === Microsoft OAuth (Optional) ===
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=common

# === Email Notifications (SendGrid) ===
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SENDGRID_FROM_NAME=GEA Portal
SERVICE_ADMIN_EMAIL=admin@your-domain.com

# === Rate Limiting ===
EA_SERVICE_RATE_LIMIT=3
GRIEVANCE_RATE_LIMIT=3
FEEDBACK_RATE_LIMIT=3

# === File Uploads ===
MAX_FILE_SIZE=5242880
MAX_TOTAL_UPLOAD_SIZE=26214400

# === External API Access (Optional) ===
# Generate with: openssl rand -hex 32
# Leave empty to disable external API access
EXTERNAL_API_KEY=your-64-character-hex-key
```

See [.env.example](.env.example) for the complete list with descriptions.

### Generate Secure Passwords

```bash
# Database password
openssl rand -base64 32

# NextAuth secret
openssl rand -base64 32

# Admin session secret
openssl rand -base64 32
```

---

## 🔧 Management

### Essential Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f frontend
docker compose logs -f feedback_db

# Restart a service
docker compose restart frontend

# Check service status
docker compose ps

# Update and rebuild
docker compose build --no-cache frontend
docker compose up -d
```

### Database Management

**For complete database management guide, see:** [database/README.md](database/README.md)

```bash
# Fresh setup (new VM)
./database/99-consolidated-setup.sh --fresh

# Quick data reload (clear + reload production data + synthetic test data)
./database/99-consolidated-setup.sh --reload

# Verify data integrity
./database/99-consolidated-setup.sh --verify

# Load production master data only
./database/scripts/11-load-master-data.sh

# Generate synthetic test data
./database/scripts/12-generate-synthetic-data.sh

# Clear all data
./database/scripts/10-clear-all-data.sh

# Connect to database
docker exec -it feedback_db psql -U feedback_user -d feedback

# Backup database
./database/99-consolidated-setup.sh --backup
# Or manually:
docker exec feedback_db pg_dump -U feedback_user feedback > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i feedback_db psql -U feedback_user feedback < backup_20251124.sql

# View comprehensive data report
./database/scripts/13-verify-master-data.sh
```

### User Management

```bash
# Add admin user
ADMIN_EMAIL="user@gov.gd" ADMIN_NAME="User Name" ./database/scripts/05-add-initial-admin.sh

# List users
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT email, name, role_code, is_active FROM users
JOIN user_roles ON users.role_id = user_roles.role_id;"

# Deactivate user
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE users SET is_active=false WHERE email='user@example.com';"
```

### Docker Volumes

Production uses 3 active volumes:

| Volume | Purpose | Typical Size |
|--------|---------|--------------|
| `traefik_acme` | SSL certificates (Let's Encrypt) | ~1 MB |
| `feedback_db_data` | PostgreSQL data | ~70 MB |
| `redis_data` | Redis cache persistence | ~10 MB |

```bash
# Check volume usage
docker system df

# List all volumes
docker volume ls

# Inspect specific volume
docker volume inspect feedback_db_data
```

---

## 🔒 Security

### Authentication & Authorization
- **OAuth-Only:** Google & Microsoft sign-in (no passwords stored)
- **Role-Based Access:** Admin (full access) vs Staff (entity-specific)
- **Email Whitelist:** Database-backed user authorization
- **Session Management:** JWT tokens with 2-hour expiration
- **Audit Logging:** All sign-ins and administrative actions tracked

### Data Protection
- **IP Hashing:** SHA256 hashing for privacy (no PII storage)
- **Rate Limiting:** IP-based submission throttling (configurable per endpoint)
- **File Validation:** Type and size checks on uploads (5MB max per file)
- **SQL Injection Prevention:** Parameterized queries throughout

### SSL/HTTPS
- Automatic certificate issuance via Let's Encrypt
- Auto-renewal (certificates refresh before expiry)
- HTTP → HTTPS redirect enabled
- Modern TLS configuration via Traefik

### Firewall Configuration

**Option A: Azure NSG (Network Security Group)**
- Configure inbound rules in Azure Portal
- Production uses Azure NSG without UFW

**Option B: UFW (recommended for defense-in-depth)**
```bash
# Allow only necessary ports
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp    # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 📊 Features

### Core Infrastructure ✅
- Next.js 14 App Router with TypeScript
- Tailwind CSS responsive design
- Docker containerization with Traefik reverse proxy
- Automated SSL certificates via Let's Encrypt
- PostgreSQL 15 database (30 tables, 44+ indexes)
- Public portal pages (Home, About)

### Service Feedback & Analytics ✅
- 5-point rating system for government services
- QR code integration for physical locations
- Multi-channel feedback (web, QR, mobile)
- Real-time analytics dashboard
- Auto-grievance creation for low ratings (≤2.5)

### Ticketing & Grievance Management ✅
- Citizen grievance submission with attachments
- EA service request management with **multi-entity support**
- **Service Provider Entities** - Configure which entities can receive service requests
- Native ticketing system with SLA tracking
- Ticket activity timeline with resolution tracking
- IP-based rate limiting protection
- Email notifications via SendGrid integration
- Master data management (entities, services, QR codes)
- Admin ticket management dashboard

### Admin Settings ✅
- **6 configuration tabs:** System, Authentication, Integrations, Business Rules, Content, Service Providers
- Branding management (logo, favicon)
- OAuth provider configuration
- SendGrid email integration
- Chatbot enable/disable and URL configuration
- Rate limits and file upload settings
- Leadership contacts management
- Service provider entity management

### Authentication & Authorization ✅
- NextAuth v4 with OAuth providers (Google, Microsoft)
- Role-based access control (Admin, Staff, Public)
- Entity-based data filtering for staff users
- Admin user management UI
- Session management with JWT (2-hour expiration)
- Audit logging system
- Email whitelist authorization

### AI Integration ✅
- **AI Chatbot Assistant** - Embedded iframe chatbot for user assistance
- **Chatbot Hosting:**
  - Current: Azure Cloud (Microsoft Azure)
  - Future: GoG Data Center (when subscriptions available)
- **Admin Configuration:**
  - Enable/disable chatbot via Admin Settings → Integrations
  - Configurable chatbot URL
- **External API Access** - Chatbot can access portal data via API
- Centralized AI bot inventory and management (`/admin/ai-inventory`)
- Iframe-based chat interface

### External API (Bot/Integration Access) ✅ **NEW**
- **API Key Authentication** - Secure access for external systems and AI bots
- **5 External Endpoints:**
  - `GET /api/external/dashboard` - Aggregated statistics (feedback, tickets, entities, services)
  - `GET /api/external/grievances` - Query grievance records with filtering
  - `GET /api/external/tickets` - Query tickets with SLA status and PII masking
  - `GET /api/external/feedback` - Query feedback with ratings and comments
  - `GET /api/external/services/requirements` - Document requirements for services
- **PII Protection** - Automatic masking of personal data (names, emails, phones)
- **OpenAPI Specifications** - YAML specs for all external endpoints
- **Bot Function Calling** - JSON schemas for AI function calling (OpenAI-compatible)
- **Rate Limiting** - 100 requests/hour per API key (Traefik-enforced)
- **Fuzzy Matching** - Search by entity_name or service_name with partial matching

---

## 🤖 AI Chatbot Assistant

The portal features an embedded AI chatbot that provides assistance to users.

### Current Implementation

| Feature | Status |
|---------|--------|
| Embedded iframe chatbot | ✅ Active |
| Enable/Disable toggle | ✅ Admin Settings |
| Azure Cloud hosting | ✅ Current |
| GoG Data Center hosting | 🔜 Future |
| External API data access | ✅ Available |

### Configuration

**Admin Settings → Integrations → Chatbot:**
- Toggle chatbot on/off
- Configure chatbot URL
- Test chatbot connection

### Chatbot Hosting

| Environment | Location | Status |
|-------------|----------|--------|
| **Current** | Azure Cloud | Active |
| **Future** | GoG Data Center | Planned (when subscriptions available) |

### For Developers

The chatbot is embedded as a simple iframe. Configuration is managed via:
- `CHATBOT_ENABLED` - System setting to enable/disable
- `CHATBOT_URL` - URL of the chatbot application

**Complete Documentation:**
- [AI Bot Integration Guide](docs/AI_BOT_INTEGRATION.md) - Configuration, troubleshooting, and bot inventory management

---

## 🔌 External API for Bot/Integration Access

The portal provides a secure External API for AI bots and external systems to access dashboard data programmatically.

### Quick Reference

| User Query | Endpoint |
|------------|----------|
| Totals, summaries, statistics | `GET /api/external/dashboard` |
| Specific grievances/complaints | `GET /api/external/grievances` |
| Support tickets, issues | `GET /api/external/tickets` |
| Citizen feedback, comments | `GET /api/external/feedback` |
| Document requirements | `GET /api/external/services/requirements?service_id=SVC-XXX-NNN` |

### Authentication

```bash
# All requests require API key header
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/dashboard"
```

### Setup

```bash
# 1. Generate API key
openssl rand -hex 32

# 2. Add to .env
EXTERNAL_API_KEY=your-64-character-hex-key

# 3. Restart containers
docker compose up -d
```

### Example Queries

```bash
# Get overall dashboard statistics
curl -H "X-API-Key: $API_KEY" \
  "https://gea.your-domain.com/api/external/dashboard?include=feedback,tickets"

# Query overdue tickets
curl -H "X-API-Key: $API_KEY" \
  "https://gea.your-domain.com/api/external/tickets?overdue=true"

# Get negative feedback with comments
curl -H "X-API-Key: $API_KEY" \
  "https://gea.your-domain.com/api/external/feedback?max_rating=2&has_comment=true"

# Get work permit document requirements
curl -H "X-API-Key: $API_KEY" \
  "https://gea.your-domain.com/api/external/services/requirements?service_id=SVC-LBR-001"
```

### OpenAPI Specifications

API specifications available at:
- `/openapi.yaml` - Combined OpenAPI spec
- `/api/dashboard.yaml` - Dashboard endpoint
- `/api/tickets.yaml` - Tickets endpoint
- `/api/feedback.yaml` - Feedback endpoint
- `/api/grievances.yaml` - Grievances endpoint
- `/api/service-requirements.yaml` - Service requirements endpoint

**Complete Documentation:**
- [API Reference - External API Section](docs/API_REFERENCE.md#external-api-botintegration-access)
- [AI Bot Integration Guide](docs/AI_BOT_INTEGRATION.md#external-api-for-bot-data-access)

---

## 📝 Content Management

### Update Portal Content

Edit configuration files in `frontend/src/config/`:

```typescript
// content.ts - Update homepage content
export const heroContent = {
  title: "Your Title",
  description: "Your description..."
};

// navigation.ts - Update menu items
export const navigationItems: NavItem[] = [
  {
    label: 'About',
    href: '/about',
    type: 'internal'
  },
  // Add more items
];
```

### Rebuild After Changes

```bash
docker compose up -d --build frontend
```

---

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker compose logs frontend
docker compose logs feedback_db

# Verify .env file exists
cat .env

# Check ports aren't in use
netstat -tuln | grep -E '80|443'
```

### SSL certificate issues
```bash
# Check Traefik logs
docker compose logs traefik

# Verify DNS
dig +short gea.your-domain.com

# Force certificate refresh
rm -f traefik_acme/acme.json
docker compose restart traefik
```

### Database connection errors
```bash
# Check database is running
docker compose ps feedback_db

# Test connection
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT 1"

# Restart database
docker compose restart feedback_db
```

### Authentication issues
```bash
# Verify user exists
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT email, is_active FROM users WHERE email='user@example.com';"

# Check OAuth configuration
docker exec frontend env | grep -E "NEXTAUTH|GOOGLE|MICROSOFT"

# View auth logs
docker compose logs frontend | grep -i "nextauth"
```

---

## 📈 Monitoring

### Health Checks

```bash
# Service status
docker compose ps

# Resource usage
docker stats

# Disk usage
du -sh ./
df -h

# Docker disk usage
docker system df

# Database size
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT pg_size_pretty(pg_database_size('feedback')) AS database_size;"
```

### Key Metrics to Watch
- Container health status
- Database disk space (grows with documents/tickets)
- Memory usage (especially during peak hours)
- SSL certificate expiry (auto-renews 30 days before)
- Failed login attempts (check audit logs)

---

## 🆘 Support

### Documentation
- **Complete Guide:** `docs/index.md`
- **VM Setup Guide:** `docs/VM_SETUP_GUIDE.md`
- **API Reference:** `docs/API_REFERENCE.md`
- **Database Schema:** `docs/DATABASE_REFERENCE.md`
- **Authentication Setup:** `docs/AUTHENTICATION.md`

### Contact
- **Repository:** https://github.com/abhirupbanerjee/GEAv3.git
- **Issues:** https://github.com/abhirupbanerjee/GEAv3/issues
- **Production Portal:** https://gea.abhirup.app
- **Email:** mailabhirupbanerjee@gmail.com

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/)
- [Docker Documentation](https://docs.docker.com/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [NextAuth Documentation](https://next-auth.js.org/)

---

## ✅ Pre-Deployment Checklist

Before going live:

**Configuration:**
- [ ] Environment variables configured in `.env` (~62 variables)
- [ ] Strong passwords generated for database
- [ ] NextAuth secret generated (`openssl rand -base64 32`)
- [ ] Admin session secret generated
- [ ] OAuth credentials obtained (Google/Microsoft)
- [ ] SendGrid API key configured

**Infrastructure:**
- [ ] DNS records configured for domain
- [ ] Ports 80 and 443 available
- [ ] Firewall rules configured (Azure NSG or UFW)
- [ ] Docker and Docker Compose installed
- [ ] Sufficient disk space (50GB+ recommended)

**Database:**
- [ ] Database initialized (`99-consolidated-setup.sh --fresh`)
- [ ] Master data loaded (`99-consolidated-setup.sh --reload`)
- [ ] Authentication tables created (`04-nextauth-users.sh`)
- [ ] Admin user added (`scripts/05-add-initial-admin.sh`)
- [ ] Data integrity verified (`99-consolidated-setup.sh --verify`)
- [ ] Backup strategy configured

**Testing:**
- [ ] All containers running: `docker compose ps`
- [ ] Frontend accessible via HTTPS
- [ ] SSL certificate issued successfully
- [ ] OAuth sign-in working (Google/Microsoft)
- [ ] Admin portal accessible
- [ ] Ticket submission working
- [ ] Email notifications sending

---

## 📊 Project Statistics

### Current Implementation
- **Total API Endpoints:** 42+ (public + admin + auth + context + external)
- **External API Endpoints:** 5 (dashboard, tickets, feedback, grievances, service-requirements)
- **Database Tables:** 30 (master data, transactional, auth, audit)
- **Database Indexes:** 44+
- **Foreign Keys:** 18+
- **Environment Variables:** ~63 configurable options (includes EXTERNAL_API_KEY)
- **Lines of Code:** ~23,000+
- **Docker Services:** 5 (Traefik, PostgreSQL, PgBouncer, Redis, Frontend)
- **Docker Volumes:** 3 active (`traefik_acme`, `feedback_db_data`, `redis_data`)
- **Authentication Providers:** 2 (Google, Microsoft) + API Key (External API)
- **AI Integration:** Embedded chatbot (Azure Cloud) + External API for bot data access
- **Admin Settings Tabs:** 7 (System, Authentication, Integrations, Business Rules, Performance, Content, Service Providers)
- **OpenAPI Specs:** 6 YAML files for bot/integration access

### Production Resource Usage

| Resource | Current Usage | Capacity |
|----------|---------------|----------|
| **Memory** | ~1.1 GB | 3.8 GB (26%) |
| **Disk (App)** | ~13 GB | 29 GB (45%) |
| **Docker Images** | ~2.2 GB | - |
| **Database** | ~70 MB | - |

### Performance
- **Build Time:** ~3-5 minutes (first build)
- **Deployment Time:** ~10-15 minutes (first deployment)
- **Memory Usage:** ~1.1GB (typical), ~2GB (under load)
- **Disk Usage:** ~13GB (including database with sample data)

---

## 🎓 Learning Resources

### For Developers
1. Review UI modification guide: `docs/developer-guides/UI_MODIFICATION_GUIDE.md`
2. Review API documentation: `docs/API_REFERENCE.md`
3. Study database schema: `docs/DATABASE_REFERENCE.md`
4. Explore source code in `frontend/src/app/api/`
5. Check validation schemas in `frontend/src/lib/schemas/`

### For DevOps/SysAdmin
1. Follow deployment guide in this README
2. Review VM setup guide: `docs/VM_SETUP_GUIDE.md`
3. Use troubleshooting section for common issues
4. Set up monitoring with `docker stats`
5. Configure automated backups

### For Database Administrators
1. Review complete DBA guide: `database/README.md`
2. Review schema documentation: `docs/DATABASE_REFERENCE.md`
3. Use consolidated setup script: `99-consolidated-setup.sh`
4. Schedule regular backups: `pg_dump` via cron
5. Monitor disk usage and index performance

---

## 📄 License

© 2026 Government of Grenada. All rights reserved.

---

**Last Updated:** January 2026 | **Version:** 3.2.0 | **Status:** ✅ Production Ready

> **Production VM:** GoGEAPortalv3 (Azure Standard_B2s, Ubuntu 24.04.3 LTS, 4GB RAM, 2 vCPUs)

**Note:** This project has been co-developed with AI (Claude) for documentation, code implementation, generation of synthetic data, and test scenarios.

---

## Quick Links

- 📖 [Complete Documentation](docs/index.md)
- 🖥️ [**VM Setup Guide**](docs/VM_SETUP_GUIDE.md) - New VM deployment
- 🏗️ [**Solution Architecture**](docs/SOLUTION_ARCHITECTURE.md) - System overview
- 🔌 [API Reference](docs/API_REFERENCE.md) - All API endpoints including External API
- 🗄️ [Database Schema](docs/DATABASE_REFERENCE.md)
- 🔐 [Authentication Guide](docs/AUTHENTICATION.md)
- 🤖 [**AI Bot Integration**](docs/AI_BOT_INTEGRATION.md) - Chatbot configuration and management
- 🔗 [**External API**](docs/API_REFERENCE.md#external-api-botintegration-access) - Bot/integration data access **NEW**

---

## See Also

### For Architects & Tech Leads
- [Solution Architecture](docs/SOLUTION_ARCHITECTURE.md) - Complete system architecture and design
- [Complete Documentation Index](docs/index.md) - Overview of all features and roadmap

### For Developers
- [UI Modification Guide](docs/developer-guides/UI_MODIFICATION_GUIDE.md) - Complete guide for UI development and customization
- [API Reference](docs/API_REFERENCE.md) - Complete API endpoint documentation
- [External API Guide](docs/API_REFERENCE.md#external-api-botintegration-access) - Bot/integration data access endpoints
- [AI Bot Integration](docs/AI_BOT_INTEGRATION.md) - Chatbot configuration and management
- [Database Reference](docs/DATABASE_REFERENCE.md) - Database schema and SQL commands
- [Authentication Guide](docs/AUTHENTICATION.md) - OAuth setup and user management

### For System Administrators
- [VM Setup Guide](docs/VM_SETUP_GUIDE.md) - New VM deployment and configuration
- [Solution Architecture](docs/SOLUTION_ARCHITECTURE.md) - Deployment and infrastructure architecture
- [Database Administrator Guide](database/README.md) - Complete database management commands
- [Database Reference](docs/DATABASE_REFERENCE.md) - Database schema and setup
- [Authentication Guide](docs/AUTHENTICATION.md) - User management and troubleshooting commands

### For Project Managers
- [Solution Architecture](docs/SOLUTION_ARCHITECTURE.md) - System capabilities and roadmap
- [Complete Documentation Index](docs/index.md) - Overview of all features