# 📚 Grenada EA Portal v3 - Complete Documentation Index

**Repository:** https://github.com/abhirupbanerjee/GEAv3.git
**Version:** 3.3.0 (Public Helpdesk Toggle + Admin Settings)
**Last Updated:** February 22, 2026
**Status:** ✅ Production Ready

---

## 🎯 Start Here

**New to this project?**
1. Read this index (10 min) - Overview and setup
2. Review [solution/SOLUTION_ARCHITECTURE.md](solution/SOLUTION_ARCHITECTURE.md) (20 min) - **Complete system overview**
3. Review [solution/DATABASE_REFERENCE.md](solution/DATABASE_REFERENCE.md) (30 min) - Database architecture
4. Review [solution/API_REFERENCE.md](solution/API_REFERENCE.md) (30 min) - API endpoints
5. Review [solution/AUTHENTICATION.md](solution/AUTHENTICATION.md) (25 min) - OAuth setup & commands
6. Check [../.env.example](../.env.example) - Environment configuration

**Quick reference?**
→ [solution/SOLUTION_ARCHITECTURE.md](solution/SOLUTION_ARCHITECTURE.md) for system overview
→ [solution/AUTHENTICATION.md](solution/AUTHENTICATION.md) has quick commands section at the end
→ See sections below for deployment and troubleshooting

---

## 🌟 Key Features

### Phase 1: Portal Foundation
- ✅ Next.js 16 App Router with TypeScript
- ✅ Tailwind CSS responsive design
- ✅ Docker containerization with Traefik reverse proxy
- ✅ Automated SSL certificates (Let's Encrypt)
- ✅ Public portal pages (Home, About)

### Phase 2: Service Feedback System
- ✅ 5-point rating system for government services
- ✅ QR code integration for physical locations
- ✅ Multi-channel feedback (web, QR, mobile)
- ✅ Analytics dashboard with entity filtering
- ✅ Auto-grievance creation for low ratings (≤2.5)

### Phase 2b: Grievance & Ticketing System
- ✅ PostgreSQL 16 database (33 tables, 44+ indexes)
- ✅ Citizen grievance submission with attachments
- ✅ EA service request management (admin portal)
- ✅ Native ticketing system with SLA tracking
- ✅ Ticket activity timeline with resolution comments
- ✅ Public helpdesk with admin-controlled toggle
- ✅ IP-based rate limiting protection
- ✅ Email notifications (SendGrid)
- ✅ IP hashing for privacy (SHA256)
- ✅ Master data management (entities, services, QR codes)
- ✅ Admin-configurable system settings (~53 settings)
- ✅ Admin ticket management dashboard
- ✅ Comprehensive API (114+ endpoints)
- ✅ External API for bot/integration access (API key auth)
- ✅ OpenAPI specifications for external endpoints
- ✅ PII masking for external data access

### Phase 2c: Authentication & Authorization
- ✅ NextAuth v4 with OAuth providers (Google, Microsoft)
- ✅ Role-based access control (Admin, Staff, Public)
- ✅ Entity-based data filtering for staff users
- ✅ Admin user management UI
- ✅ Session management with JWT (2-hour expiration)
- ✅ Audit logging system
- ✅ Email whitelist authorization

### Security Features
- ✅ OAuth-only authentication (no password storage)
- ✅ IP-based rate limiting (5 submissions/hour)
- ✅ SHA256 IP hashing (no PII storage)
- ✅ File upload validation (5MB limit, type checking)
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS prevention (input sanitization)

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| TypeScript | 5.x | Type-safe development |
| Tailwind CSS | 4.1.0 | Utility-first CSS framework |
| React | 18.3.0 | UI library |
| Zod | 4.x | Schema validation |
| NextAuth | 4.x | OAuth authentication |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 16.x | RESTful API endpoints |
| PostgreSQL | 16-alpine | Primary database |
| PgBouncer | v1.25.1 | Connection pooling |
| node-postgres (pg) | 8.x | Database driver |
| SendGrid | Latest | Email notifications |
| NextAuth | 4.x | Authentication & session management |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 29.x | Containerization (latest supported, Docker 27.x is EOL) |
| Docker Compose | 5.0+ | Multi-container orchestration |
| Traefik | 3.6 | Reverse proxy & SSL (supports Docker 29 API) |
| PgBouncer | 1.23.1 | Database connection pooling |
| Redis | 7.4.4 | Analytics caching |

> **ℹ️ Version Info:** Docker 29.x is the current supported version. Traefik v3.6+ includes automatic Docker API version negotiation.

### Development Tools
| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Git | Version control |

---

## 📁 Project Structure

```
gogeaportal/v3/
│
├── 📄 Root Files
│   ├── README.md                          # Project overview with quick start
│   ├── .env.example                       # Environment variables template
│   ├── docker-compose.yml                 # Service orchestration (5 containers)
│   └── traefik.yml                        # Reverse proxy configuration
│
├── 📚 Documentation (docs/)
│   ├── index.md                           # This file - Complete documentation index
│   ├── setup/                             # Setup & Installation Guides
│   │   ├── VM_SETUP_GUIDE.md              # New VM deployment guide
│   │   ├── FRESH_INSTALLATION_MANUAL.md   # Fresh installation guide
│   │   └── TECH_STACK_UPGRADE_ROADMAP.md  # Technology upgrade roadmap
│   ├── solution/                          # Solution Architecture & References
│   │   ├── SOLUTION_ARCHITECTURE.md       # System architecture overview
│   │   ├── API_REFERENCE.md               # All API endpoints (114+)
│   │   ├── DATABASE_REFERENCE.md          # Database schema (33+ tables)
│   │   ├── AUTHENTICATION.md              # OAuth setup & configuration
│   │   ├── USER_MANAGEMENT.md             # User roles & permissions
│   │   └── EMAIL_NOTIFICATIONS.md         # Email system configuration
│   ├── developer-guides/                  # Developer Guidelines
│   │   ├── UI_MODIFICATION_GUIDE.md       # UI development guide
│   │   ├── API_DEVELOPMENT_PATTERNS.md    # API development patterns
│   │   ├── DATABASE_QUERY_PATTERNS.md     # Database operations guide
│   │   ├── TESTING_GUIDE.md               # Testing procedures
│   │   ├── ERROR_HANDLING_PATTERNS.md     # Error handling guide
│   │   ├── ADMIN_GUIDE.md                 # Administrator guide
│   │   └── z-index-review.md              # Z-index & React Portal patterns
│   ├── user-manuals/                      # User Documentation
│   │   ├── GEA_Portal_Master_User_Manual.md   # Master index
│   │   ├── GEA_Portal_Anonymous_User_Manual.md # Public users
│   │   ├── GEA_Portal_Citizen_User_Manual.md   # Registered citizens
│   │   ├── GEA_Portal_Staff_User_Manual.md     # MDA staff
│   │   └── GEA_Portal_Admin_User_Manual.md     # Administrators
│   ├── migration/                         # Migration & Upgrade Guides
│   │   ├── README.md                      # Migration index
│   │   ├── auth-migration.md              # NextAuth v4 → v5 migration plan
│   │   ├── nextjs-nodejs-migration.md     # Next.js, React & Node.js upgrades
│   │   └── postgresql-pgbouncer-migration.md  # Database upgrades
│   └── infra/                             # Infrastructure Documentation
│       └── infra_sizing_quick_reference.md  # Capacity planning
│
├── 🗄️ Database (database/)
│   ├── DB_README.md                       # Complete DBA guide
│   ├── 99-consolidated-setup.sh           # Main orchestrator (--reload, --verify, etc.)
│   ├── config.sh                          # Shared configuration
│   ├── scripts/
│   │   ├── 00-master-init.sh              # Master initialization script
│   │   ├── 01-init-db.sh                  # Database schema initialization
│   │   ├── 04-nextauth-users.sh           # Authentication tables setup
│   │   ├── 05-add-initial-admin.sh        # Add first admin user
│   │   ├── 10-clear-all-data.sh           # Clear all data
│   │   ├── 11-load-master-data.sh         # Load production master data
│   │   ├── 12-generate-synthetic-data.sh  # Generate test data
│   │   ├── 13-verify-master-data.sh       # Comprehensive data verification
│   │   └── 16-create-system-settings.sh   # System settings initialization
│   ├── lib/                               # Shared shell functions
│   ├── sql/                               # SQL templates
│   └── master-data/                       # Production CSV data files
│
└── 🎨 Frontend Application (frontend/)
    ├── Dockerfile                         # Multi-stage production build
    ├── package.json                       # Dependencies
    ├── next.config.js                     # Next.js configuration
    ├── tailwind.config.js                 # Tailwind CSS config
    ├── tsconfig.json                      # TypeScript config
    │
    ├── public/
    │   ├── images/                        # Static images (logos, icons)
    │   ├── api/                           # OpenAPI specifications
    │   │   ├── dashboard.yaml             # Dashboard API spec
    │   │   ├── tickets.yaml               # Tickets API spec
    │   │   ├── feedback.yaml              # Feedback API spec
    │   │   ├── grievances.yaml            # Grievances API spec
    │   │   └── service-requirements.yaml  # Service requirements spec
    │   ├── openapi.yaml                   # Combined OpenAPI specification
    │   ├── bot-api-prompt.md              # Bot API integration guide
    │   ├── bot-api-functions.json         # Function calling schemas
    │   └── config/
    │       └── bots-config.json           # AI bot inventory
    │
    └── src/
        ├── app/
        │   ├── api/                       # API Routes (114+ endpoints)
        │   │   ├── auth/                  # NextAuth endpoints
        │   │   ├── citizen/               # Citizen portal APIs
        │   │   ├── content/               # Page context API (for AI bot)
        │   │   ├── feedback/              # Service feedback APIs
        │   │   ├── tickets/               # Public ticket APIs
        │   │   ├── helpdesk/              # Ticket lookup APIs
        │   │   ├── admin/                 # Admin management APIs
        │   │   ├── managedata/            # Master data CRUD
        │   │   ├── public/                # Public data APIs
        │   │   ├── settings/              # Settings APIs
        │   │   └── external/              # External API (bot/integration access)
        │   │       ├── dashboard/         # Aggregated statistics
        │   │       ├── tickets/           # Ticket queries with PII masking
        │   │       ├── feedback/          # Feedback record queries
        │   │       ├── grievances/        # Grievance queries
        │   │       └── services/          # Service requirements
        │   │
        │   ├── layout.tsx                 # Root layout
        │   ├── page.tsx                   # Home page
        │   ├── about/                     # About page
        │   ├── auth/                      # Sign-in & error pages
        │   ├── admin/                     # Admin portal (protected)
        │   ├── citizen/                   # Citizen portal (authenticated)
        │   ├── staff/                     # Staff portal (entity-specific)
        │   ├── helpdesk/                  # Public ticket lookup
        │   └── feedback/                  # Feedback forms
        │
        ├── components/                    # React components
        │   ├── ChatBot.tsx                # AI chatbot iframe component
        │   ├── layout/                    # Header, Footer, Navigation
        │   ├── home/                      # Homepage components
        │   ├── feedback/                  # Feedback form components
        │   ├── citizen/                   # Citizen portal components
        │   └── admin/                     # Admin UI components
        │
        ├── providers/                     # React Context providers
        │
        ├── hooks/                         # Custom React hooks
        │
        ├── types/                         # TypeScript type definitions
        │
        ├── lib/                           # Utilities & configurations
        │   ├── auth.ts                    # NextAuth configuration
        │   ├── db.ts                      # Database connection pool
        │   ├── db/                        # Database helpers
        │   ├── schemas/                   # Zod validation schemas
        │   ├── utils/                     # Helper functions
        │   ├── admin-auth.ts              # Authorization helpers
        │   └── piiMask.ts                 # PII masking for External API
        │
        ├── config/
        │   ├── env.ts                     # Environment configuration
        │   ├── content.ts                 # Static content
        │   └── navigation.ts              # Navigation items
        │
        └── middleware.ts                  # Route protection & auth
```

---

## 📖 Documentation Guide

### Essential Documentation
| Document | Purpose | Read Time |
|----------|---------|-----------|
| [index.md](index.md) | This file - Complete overview | 15 min |
| [setup/FRESH_INSTALLATION_MANUAL.md](setup/FRESH_INSTALLATION_MANUAL.md) | **Step-by-step fresh installation guide** (master data only) | 60 min |
| [setup/VM_SETUP_GUIDE.md](setup/VM_SETUP_GUIDE.md) | Complete VM setup from scratch | 45 min |
| [setup/TECH_STACK_UPGRADE_ROADMAP.md](setup/TECH_STACK_UPGRADE_ROADMAP.md) | Technology upgrade roadmap and migration plans | 30 min |
| [solution/SOLUTION_ARCHITECTURE.md](solution/SOLUTION_ARCHITECTURE.md) | **System architecture & component overview** | 20 min |
| [solution/DATABASE_REFERENCE.md](solution/DATABASE_REFERENCE.md) | Database architecture, setup, tables | 30 min |
| [solution/API_REFERENCE.md](solution/API_REFERENCE.md) | All API endpoints with examples | 30 min |
| [solution/AUTHENTICATION.md](solution/AUTHENTICATION.md) | OAuth setup, user management & quick commands | 25 min |
| [solution/USER_MANAGEMENT.md](solution/USER_MANAGEMENT.md) | User roles, permissions, and access control | 20 min |
| [solution/EMAIL_NOTIFICATIONS.md](solution/EMAIL_NOTIFICATIONS.md) | Email notification system configuration | 15 min |
| [solution/AI_BOT_INTEGRATION.md](solution/AI_BOT_INTEGRATION.md) | AI bot context integration, bot inventory, testing | 30 min |
| [solution/DOCKER_VERSION_UPDATE_PLAN.md](solution/DOCKER_VERSION_UPDATE_PLAN.md) | Docker upgrade and migration plan | 20 min |
| [../.env.example](../.env.example) | Environment configuration template | 10 min |
| [../README.md](../README.md) | Project overview | 10 min |

### Developer Guides
| Document | Purpose | Read Time |
|----------|---------|-----------|
| [developer-guides/UI_MODIFICATION_GUIDE.md](developer-guides/UI_MODIFICATION_GUIDE.md) | **Complete UI development guide** - Adding pages, modifying analytics, customizing leaderboards | 45 min |
| [developer-guides/API_DEVELOPMENT_PATTERNS.md](developer-guides/API_DEVELOPMENT_PATTERNS.md) | **API endpoint development** - Creating endpoints, authentication, validation, responses | 30 min |
| [developer-guides/DATABASE_QUERY_PATTERNS.md](developer-guides/DATABASE_QUERY_PATTERNS.md) | **Database operations** - Queries, transactions, performance, error handling | 25 min |
| [developer-guides/TESTING_GUIDE.md](developer-guides/TESTING_GUIDE.md) | **Testing procedures** - Automated tests (Vitest), API testing, auth testing, database verification | 25 min |
| [developer-guides/ERROR_HANDLING_PATTERNS.md](developer-guides/ERROR_HANDLING_PATTERNS.md) | **Error handling** - Error codes, responses, logging best practices | 20 min |

### User Manuals
| Document | Audience | Read Time |
|----------|----------|-----------|
| [user-manuals/GEA_Portal_Master_User_Manual.md](user-manuals/GEA_Portal_Master_User_Manual.md) | **All Users** - Master index and navigation guide | 20 min |
| [user-manuals/GEA_Portal_Anonymous_User_Manual.md](user-manuals/GEA_Portal_Anonymous_User_Manual.md) | Public Users (No Account) | 30 min |
| [user-manuals/GEA_Portal_Citizen_User_Manual.md](user-manuals/GEA_Portal_Citizen_User_Manual.md) | Registered Citizens | 45 min |
| [user-manuals/GEA_Portal_Staff_User_Manual.md](user-manuals/GEA_Portal_Staff_User_Manual.md) | MDA Staff Officers | 45 min |
| [user-manuals/GEA_Portal_Admin_User_Manual.md](user-manuals/GEA_Portal_Admin_User_Manual.md) | DTA Administrators | 60 min |

### Infrastructure Documentation
| Document | Purpose | Read Time |
|----------|---------|-----------|
| [infra/infra_sizing_quick_reference.md](infra/infra_sizing_quick_reference.md) | Infrastructure sizing and capacity planning | 15 min |

### Migration & Upgrade Guides
| Document | Purpose | Read Time |
|----------|---------|-----------|
| [migration/README.md](migration/README.md) | **Migration index** - Overview and current status | 10 min |
| [migration/auth-migration.md](migration/auth-migration.md) | NextAuth v4 → Auth.js v5 migration assessment | 30 min |
| [migration/nextjs-nodejs-migration.md](migration/nextjs-nodejs-migration.md) | Next.js, React & Node.js upgrade paths | 30 min |
| [migration/postgresql-pgbouncer-migration.md](migration/postgresql-pgbouncer-migration.md) | PostgreSQL & PgBouncer upgrade guide | 25 min |

### Reference Documentation
| File | Purpose |
|------|---------|
| [../docker-compose.yml](../docker-compose.yml) | Service orchestration |
| [../traefik.yml](../traefik.yml) | Reverse proxy & SSL config |
| [../frontend/Dockerfile](../frontend/Dockerfile) | Multi-stage build instructions |
| [../database/99-consolidated-setup.sh](../database/99-consolidated-setup.sh) | Main database setup script |

---

## 🚀 First-Time Setup (From GitHub)

### Prerequisites

**Required Software:**
- Git 2.x+
- Docker 29.x (latest supported, Docker 27.x is EOL)
- Docker Compose 5.0+
- Domain with DNS access (or localhost for testing)
- Linux/MacOS (or WSL2 on Windows)

> **ℹ️ Info:** See [VM_SETUP_GUIDE.md](VM_SETUP_GUIDE.md#step-3-install-docker-engine) for Docker installation instructions.

**System Requirements:**
- 4GB RAM minimum (8GB recommended)
- 30GB disk space (50GB recommended)
- Open ports: 80, 443

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/abhirupbanerjee/GEAv3.git
cd GEAv3

# Verify structure
ls -la
# You should see: docker-compose.yml, .env.example, frontend/, database/, docs/
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Generate strong passwords
echo "Database password:"
openssl rand -base64 32

echo "Session secret:"
openssl rand -base64 32

# Edit .env file
nano .env
```

**Required configurations in .env:**

1. **Domains** (replace `your-domain.com`):
   ```env
   BASE_DOMAIN=your-domain.com
   FRONTEND_DOMAIN=gea.your-domain.com
   # ... update all domain entries
   ```

2. **Database credentials:**
   ```env
   FEEDBACK_DB_PASSWORD=<paste-generated-password>
   ```

3. **Admin authentication:**
   ```env
   ADMIN_PASSWORD=<strong-password>
   ADMIN_SESSION_SECRET=<paste-generated-secret>
   ```

4. **SendGrid API key** (get from https://app.sendgrid.com):
   ```env
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_FROM_EMAIL=noreply@your-domain.com
   SERVICE_ADMIN_EMAIL=admin@your-domain.com
   ```

5. **SSL certificate email:**
   ```env
   LETS_ENCRYPT_EMAIL=your-email@your-domain.com
   ```

### Step 3: DNS Configuration

**Point your domain to the server:**

```
# A Records (replace 1.2.3.4 with your server IP)
gea.your-domain.com        → 1.2.3.4
wiki.gea.your-domain.com   → 1.2.3.4
dms.gea.your-domain.com    → 1.2.3.4
```

**Verify DNS:**
```bash
dig +short gea.your-domain.com
# Should return your server IP
```

### Step 4: Build and Run with Docker

```bash
# Build all services
docker-compose build

# Start services in detached mode
docker-compose up -d

# Check service status
docker-compose ps

# Expected output:
# NAME         STATUS          PORTS
# traefik      Up             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# feedback_db  Up (healthy)   5432/tcp
# frontend     Up             3000/tcp
```

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f feedback_db
docker-compose logs -f traefik
```

### Step 5: Initialize Database

```bash
# Copy initialization script to database container
docker cp database/01-init-db.sh feedback_db:/tmp/

# Run initialization (creates all tables, indexes, reference data)
docker exec -it feedback_db /bin/bash /tmp/01-init-db.sh

# Run manually if you have permissions on your VM / local
./01-init-db.sh

```

**Expected output:**
```
✓ Database connection successful
✓ Created 13 tables
✓ Created 40+ indexes
✓ Inserted reference data
✓ Verification checks passed
```

**Verify database:**
```bash
# Connect to database
docker exec -it feedback_db psql -U feedback_user -d feedback

# List tables
\dt

# Check table counts
SELECT
    'entity_master' AS table_name, COUNT(*) FROM entity_master
UNION ALL SELECT 'service_master', COUNT(*) FROM service_master
UNION ALL SELECT 'tickets', COUNT(*) FROM tickets;

# Exit
\q
```

### Step 6: Load Test Data (Optional)

```bash
# Copy seed data script
docker cp database/02-load-seed-data.sh feedback_db:/tmp/

# Generate test data
docker exec -it feedback_db /bin/bash /tmp/02-load-seed-data.sh

# Verify analytics
docker cp database/03-verify-analytics.sh feedback_db:/tmp/
docker exec -it feedback_db /bin/bash /tmp/03-verify-analytics.sh

# Run manually if you have permissions on your VM / local
./02-load-seed-data.sh
./03-verify-analytics.sh

```

### Step 7: Verify Deployment

**1. Check frontend accessibility:**
```bash
curl -I https://gea.your-domain.com
# Should return: HTTP/2 200
```

**2. Test API endpoint:**
```bash
curl https://gea.your-domain.com/api/tickets/categories
# Should return JSON with categories
```

**3. Check SSL certificate:**
```bash
# Should show valid Let's Encrypt certificate
openssl s_client -connect gea.your-domain.com:443 -servername gea.your-domain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

**4. Test admin login:**
```bash
# Navigate to: https://gea.your-domain.com/admin
# Login with ADMIN_PASSWORD from .env
```

**5. Check database connectivity:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT COUNT(*) FROM service_master;"
# Should return count of services
```

### Step 8: Monitor Deployment

```bash
# Check container resource usage
docker stats

# View recent logs
docker-compose logs --tail=100 -f

# Check database health
docker-compose ps feedback_db
# Should show: Up (healthy)
```

---

## 🔧 Common Deployment Errors & Fixes

### Error 1: "Cannot connect to database"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Fix:**
```bash
# Check database container status
docker-compose ps feedback_db

# If not running, check logs
docker-compose logs feedback_db

# Restart database
docker-compose restart feedback_db

# Wait for health check
docker-compose ps feedback_db
# Wait for status: Up (healthy)
```

### Error 2: "Frontend build fails"

**Symptoms:**
```
ERROR: failed to solve: process "/bin/sh -c npm run build" did not complete successfully
```

**Fix:**
```bash
# Check .env file exists and has all required variables
cat .env | grep -E "SENDGRID|FEEDBACK_DB|ADMIN"

# Rebuild without cache
docker-compose build --no-cache frontend

# Check build logs
docker-compose logs frontend
```

### Error 3: "SSL certificate not issued"

**Symptoms:**
```
unable to get local issuer certificate
```

**Fix:**
```bash
# Check Traefik logs
docker-compose logs traefik | grep -i "certificate"

# Verify DNS points to server
dig +short gea.your-domain.com

# Verify ports are open
netstat -tuln | grep -E "80|443"

# Restart Traefik
docker-compose restart traefik

# Check Let's Encrypt rate limits: https://letsencrypt.org/docs/rate-limits/
```

### Error 4: "Database initialization fails"

**Symptoms:**
```
ERROR: relation "entity_master" already exists
```

**Fix:**
```bash
# If first-time setup, drop and recreate database
docker exec -it feedback_db psql -U feedback_user -d postgres << 'EOF'
DROP DATABASE IF EXISTS feedback;
CREATE DATABASE feedback OWNER feedback_user;
\q
EOF

# Re-run initialization
docker exec -it feedback_db /bin/bash /tmp/01-init-db.sh
```

### Error 5: "Port already in use"

**Symptoms:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

**Fix:**
```bash
# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service (example: Apache)
sudo systemctl stop apache2

# Or change Traefik ports in docker-compose.yml:
# ports:
#   - "8080:80"
#   - "8443:443"
```

### Error 6: "Admin login fails"

**Symptoms:**
```
Invalid credentials
```

**Fix:**
```bash
# Verify ADMIN_PASSWORD in .env
grep ADMIN_PASSWORD .env

# Rebuild frontend with new password
docker-compose build frontend
docker-compose up -d frontend

# Clear browser cache and cookies

# Check admin auth logs
docker-compose logs frontend | grep -i "admin"
```

### Error 7: "SendGrid email not sending"

**Symptoms:**
```
Error: Unauthorized
```

**Fix:**
```bash
# Verify SendGrid API key
grep SENDGRID_API_KEY .env

# Test SendGrid API key manually
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer YOUR_SENDGRID_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"personalizations": [{"to": [{"email": "test@example.com"}]}],"from": {"email": "noreply@your-domain.com"},"subject": "Test","content": [{"type": "text/plain","value": "Test"}]}'

# Check SendGrid dashboard: https://app.sendgrid.com/
```


---

## 🛠 Debugging Commands

### Container Debugging

```bash
# Enter frontend container
docker exec -it frontend /bin/sh

# Enter database container
docker exec -it feedback_db /bin/bash

# Check environment variables in container
docker exec frontend env | grep -E "DB|SENDGRID|ADMIN"

# View container filesystem
docker exec frontend ls -la /app

# Check Next.js build output
docker exec frontend ls -la /app/.next
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker exec -it feedback_db psql -U feedback_user -d feedback

# List all tables
\dt

# Describe table structure
\d entity_master

# Check table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND pid <> pg_backend_pid();

# Exit
\q
```

### Network Debugging

```bash
# Check Docker networks
docker network ls

# Inspect network
docker network inspect gogeaportal_v3_geav3_network

# Test connectivity between containers
docker exec frontend ping -c 3 feedback_db

# Check DNS resolution
docker exec frontend nslookup feedback_db
```

### Log Analysis

```bash
# Real-time logs (all services)
docker-compose logs -f

# Search logs for errors
docker-compose logs | grep -i error

# Last 100 lines
docker-compose logs --tail=100

# Logs from specific time
docker-compose logs --since="2025-11-20T10:00:00"

# Export logs to file
docker-compose logs > deployment-logs.txt
```

### Performance Debugging

```bash
# Check resource usage
docker stats

# Check disk usage
docker system df

# Check volume sizes
docker volume ls
docker volume inspect gogeaportal_v3_feedback_db_data

# Clean up unused resources
docker system prune -a
```

---

## 🎯 Quick Reference by Role

### For Project Managers
1. Review [index.md](index.md) (this file) - Complete overview
2. Check [DATABASE_REFERENCE.md](DATABASE_REFERENCE.md) - Database capabilities
3. Review [API_REFERENCE.md](API_REFERENCE.md) - API features
4. Monitor deployment using commands above

### For Developers
1. Clone repository: `git clone https://github.com/abhirupbanerjee/GEAv3.git`
2. Review [API_REFERENCE.md](API_REFERENCE.md) - All endpoints
3. Review [DATABASE_REFERENCE.md](DATABASE_REFERENCE.md) - Database schema
4. Explore source code in `frontend/src/app/api/`
5. Check validation schemas in `frontend/src/lib/schemas/`

### For DevOps/SysAdmin
1. Follow deployment steps above
2. Use debugging commands section
3. Reference [../.env.example](../.env.example) for configuration
4. Monitor using: `docker-compose logs -f`
5. Check health: `docker-compose ps`

### For Database Administrators
1. Review [DATABASE_REFERENCE.md](DATABASE_REFERENCE.md) - Complete reference
2. Initialize database using `./database/99-consolidated-setup.sh --fresh --load-master`
3. Use provided SQL queries for management
4. Backup regularly: `docker exec feedback_db pg_dump -U feedback_user feedback > backup.sql`

---

## 📊 Project Statistics

### Current Implementation (Phase 2b + Authentication + External API)
- **Total API Endpoints:** 114+ (feedback, tickets, helpdesk, admin, citizen, master data, auth, content, external)
- **Public API Endpoints:** 6 (health, categories, helpdesk status)
- **External API Endpoints:** 5 (dashboard, tickets, feedback, grievances, service-requirements)
- **Database Tables:** 30 (master data, transactional, auth, audit)
- **Database Indexes:** 44+
- **Foreign Keys:** 18+
- **Lines of Code:** ~23,000+
- **Docker Services:** 5 (Traefik, PostgreSQL, PgBouncer, Redis, Frontend)
- **Authentication Providers:** 2 (Google, Microsoft) + API Key (External API)
- **OpenAPI Specs:** 6 YAML files for bot/integration access
- **Build Time:** ~3-5 minutes (first build)
- **Deployment Time:** ~10-15 minutes (first deployment)
- **Memory Usage:** ~2GB (all services under load)
- **Disk Usage:** ~3GB (including database with auth tables)

### Test Data (when seeded)
- **Entities:** 4
- **Services:** 14
- **Feedback Records:** 50
- **Grievances:** 60
- **EA Requests:** 7
- **Service Attachments:** 27

---

## 🎓 Learning Resources

### Technology Documentation
- **Next.js 16:** https://nextjs.org/docs
- **PostgreSQL 16:** https://www.postgresql.org/docs/16/
- **NextAuth v4:** https://next-auth.js.org/
- **Docker:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/
- **Traefik v3:** https://doc.traefik.io/traefik/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Zod Validation:** https://zod.dev/
- **SendGrid:** https://docs.sendgrid.com/

### Security Best Practices
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **PostgreSQL Security:** https://www.postgresql.org/docs/15/security.html

---

## 📞 Support & Contact

- **Repository:** https://github.com/abhirupbanerjee/GEAv3.git
- **Issues:** https://github.com/abhirupbanerjee/GEAv3/issues
- **Demo Portal:** https://your-portal-domain.com
- **Email:** contact@your-domain.com

---

## 🏁 Deployment Checklist

**Before deployment, ensure:**
- [ ] Git repository cloned
- [ ] Docker and Docker Compose installed
- [ ] DNS configured pointing to server
- [ ] `.env` file created from `.env.example`
- [ ] All passwords generated and configured
- [ ] SendGrid API key obtained (optional)
- [ ] Ports 80/443 are available
- [ ] Firewall rules configured

**After deployment, verify:**
- [ ] All containers running: `docker-compose ps`
- [ ] Database initialized successfully
- [ ] Frontend accessible via HTTPS
- [ ] SSL certificate issued
- [ ] API endpoints responding
- [ ] Admin login works
- [ ] Email notifications working
- [ ] Database backups configured
- [ ] Monitoring setup (optional)

---

## 📈 Roadmap

### Completed (Phase 2b + Authentication)
- ✅ Service feedback system with 5-point rating
- ✅ Auto-grievance creation for low ratings
- ✅ Citizen grievance submission with attachments
- ✅ EA service request management
- ✅ Native ticketing system with SLA tracking
- ✅ Ticket activity timeline with resolution comments
- ✅ Master data management (entities, services, QR codes)
- ✅ Admin ticket management dashboard
- ✅ Admin portal with OAuth authentication
- ✅ NextAuth integration (Google & Microsoft)
- ✅ User management system with roles
- ✅ Entity-based access control
- ✅ Comprehensive API (35+ endpoints)
- ✅ Rate limiting protection
- ✅ Email notifications via SendGrid
- ✅ Audit logging system
- ✅ AI bot inventory management
- ✅ External API for bot/integration access

### In Progress
- 🔄 Staff portal (entity-specific access for MDAs)
- 🔄 Advanced analytics dashboard with charts

### Future Enhancements (Phase 3)
- [ ] Ticket assignment workflow
- [ ] Multi-level approval for EA requests
- [ ] SMS notifications
- [ ] Mobile app integration
- [ ] Webhooks for third-party integrations
- [ ] Real-time dashboard updates (WebSockets)
- [ ] Advanced reporting (PDF export)
- [ ] Service catalog improvements
- [ ] Public user self-service portal

---

**Last Updated:** February 22, 2026
**Version:** 3.3.0 (Public Helpdesk Toggle + Admin Settings)
**Status:** ✅ Production Ready
**Repository:** https://github.com/abhirupbanerjee/GEAv3.git
