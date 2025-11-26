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
- **Context-Aware AI Assistant** - Real-time UI state tracking with intelligent, context-aware help
- **AI Bot Integration** - Centralized bot inventory and iframe-based chat interface
- **OAuth Authentication** - Google & Microsoft sign-in with role-based access control

**Status:** ✅ Production-ready | **Version:** 3.0 (Phase 2b + Context-Aware AI)

---

## 🚀 Quick Start

### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Docker 24.x+ & Docker Compose 2.x+
- Domain with DNS access
- 4GB RAM minimum (8GB recommended)
- PostgreSQL 15 (included in Docker setup)

### Deploy in 5 Steps

```bash
# 1. Clone repository
git clone https://github.com/abhirupbanerjee/GEAv3.git
cd GEAv3

# 2. Configure environment
cp .env.example .env
nano .env  # Set passwords, domains, and API keys

# 3. Initialize database
docker-compose up -d feedback_db

# Option A: Quick setup with production data + synthetic test data
./database/99-consolidated-setup.sh --reload

# Option B: Manual initialization (production - no test data)
./database/01-init-db.sh
./database/scripts/11-load-master-data.sh

# 4. Set up OAuth authentication
./database/04-nextauth-users.sh
ADMIN_EMAIL="admin@gov.gd" ADMIN_NAME="Admin Name" ./database/05-add-initial-admin.sh

# 5. Deploy application
docker-compose up -d
```

**That's it!** Portal will be available at your configured domain with auto-SSL.

---

## 📋 Architecture

### System Components

| Component | Technology | Purpose | URL Example |
|-----------|-----------|---------|-------------|
| **Frontend** | Next.js 14 (App Router) | Main portal & admin UI | gea.domain.com |
| **Database** | PostgreSQL 15 | Data storage & user management | Internal:5432 |
| **Reverse Proxy** | Traefik v3.0 | SSL termination & routing | - |
| **Authentication** | NextAuth v4 | OAuth (Google/Microsoft) | /api/auth/* |

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
- Nginx (static file serving in production)

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
│       ├── API_REFERENCE.md               # All API endpoints
│       ├── DATABASE_REFERENCE.md          # Database schema & setup
│       ├── AUTHENTICATION.md              # OAuth setup & configuration
│       ├── ai-bots-management.md          # AI bot inventory management
│       └── AI_BOT_PORTAL_INTEGRATION.md   # Context-aware AI bot integration guide
│
├── 🗄️ Database
│   └── database/
│       ├── README.md                      # Complete DBA guide
│       ├── 99-consolidated-setup.sh       # Main orchestrator (--reload, --verify, etc.)
│       ├── config.sh                      # Shared configuration
│       ├── 01-init-db.sh                  # Main database initialization
│       ├── 04-nextauth-users.sh           # Authentication tables setup
│       ├── 05-add-initial-admin.sh        # Add first admin user
│       ├── scripts/                       # Database management scripts
│       │   ├── 10-clear-all-data.sh       # Clear all data
│       │   ├── 11-load-master-data.sh     # Load production master data
│       │   ├── 12-generate-synthetic-data.sh  # Generate test data
│       │   └── 13-verify-master-data.sh   # Comprehensive data verification
│       ├── lib/                           # Shared functions
│       ├── sql/                           # SQL templates
│       └── master-data/                   # Production data files
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
        ├── nginx.conf                     # Web server configuration
        ├── package.json                   # Dependencies
        ├── next.config.js                 # Next.js configuration
        ├── tailwind.config.js             # Tailwind CSS config
        ├── tsconfig.json                  # TypeScript config
        │
        ├── public/
        │   ├── images/                    # Static images
        │   └── config/
        │       └── bots-config.json       # AI bot inventory
        │
        └── src/
            ├── app/
            │   ├── api/                   # API Routes (35+ endpoints)
            │   │   ├── auth/              # NextAuth endpoints
            │   │   ├── content/           # Page context API (for AI bot)
            │   │   ├── feedback/          # Service feedback APIs
            │   │   ├── tickets/           # Public ticket APIs
            │   │   ├── helpdesk/          # Ticket lookup APIs
            │   │   ├── admin/             # Admin management APIs
            │   │   └── managedata/        # Master data CRUD
            │   │
            │   ├── layout.tsx             # Root layout (with ChatContextProvider)
            │   ├── page.tsx               # Home page
            │   ├── about/                 # About page
            │   ├── auth/                  # Sign-in & error pages
            │   ├── admin/                 # Admin portal (protected)
            │   ├── staff/                 # Staff portal (entity-specific)
            │   ├── helpdesk/              # Public ticket lookup
            │   └── feedback/              # Feedback forms
            │
            ├── components/                # React components
            │   ├── ChatBot.tsx            # AI bot iframe with context tracking
            │   ├── layout/                # Header, Footer, Navigation
            │   ├── home/                  # Homepage components
            │   └── admin/                 # Admin UI components
            │
            ├── providers/                 # React Context providers
            │   └── ChatContextProvider.tsx # AI bot context management
            │
            ├── hooks/                     # Custom React hooks
            │   └── useChatContext.ts      # Hook for AI bot context
            │
            ├── types/                     # TypeScript type definitions
            │   └── chat-context.ts        # AI bot context types
            │
            ├── lib/                       # Utilities & configurations
            │   ├── auth.ts                # NextAuth configuration
            │   ├── db.ts                  # Database connection pool
            │   ├── db/                    # Database helpers
            │   ├── schemas/               # Zod validation schemas
            │   ├── utils/                 # Helper functions
            │   └── admin-auth.ts          # Authorization helpers
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

Copy `.env.example` to `.env` and configure:

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

# === File Uploads ===
MAX_FILE_SIZE=5242880
MAX_TOTAL_UPLOAD_SIZE=26214400
```

### Generate Secure Passwords

```bash
# Database password
openssl rand -base64 32

# NextAuth secret
openssl rand -base64 32
```

---

## 🔧 Management

### Essential Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f frontend
docker-compose logs -f feedback_db

# Restart a service
docker-compose restart frontend

# Check service status
docker-compose ps

# Update and rebuild
docker-compose build --no-cache frontend
docker-compose up -d
```

### Database Management

**For complete database management guide, see:** [database/README.md](database/README.md)

```bash
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
docker exec feedback_db pg_dump -U feedback_user feedback > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i feedback_db psql -U feedback_user feedback < backup_20251124.sql

# View comprehensive data report
./database/scripts/13-verify-master-data.sh
```

### User Management

```bash
# Add admin user
ADMIN_EMAIL="user@gov.gd" ADMIN_NAME="User Name" ./database/05-add-initial-admin.sh

# List users
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT email, name, role_code, is_active FROM users
JOIN user_roles ON users.role_id = user_roles.role_id;"

# Deactivate user
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE users SET is_active=false WHERE email='user@example.com';"
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
- **Rate Limiting:** IP-based submission throttling (5 per hour)
- **File Validation:** Type and size checks on uploads (5MB max)
- **SQL Injection Prevention:** Parameterized queries throughout

### SSL/HTTPS
- Automatic certificate issuance via Let's Encrypt
- Auto-renewal (certificates refresh before expiry)
- HTTP → HTTPS redirect enabled
- Modern TLS configuration via Traefik

### Firewall Configuration

```bash
# Allow only necessary ports
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
- PostgreSQL 15 database (23 tables, 44+ indexes)
- Public portal pages (Home, About)

### Service Feedback & Analytics ✅
- 5-point rating system for government services
- QR code integration for physical locations
- Multi-channel feedback (web, QR, mobile)
- Real-time analytics dashboard
- Auto-grievance creation for low ratings (≤2.5)

### Ticketing & Grievance Management ✅
- Citizen grievance submission with attachments
- EA service request management
- Native ticketing system with SLA tracking
- Ticket activity timeline with resolution tracking
- IP-based rate limiting protection
- Email notifications via SendGrid integration
- Master data management (entities, services, QR codes)
- Admin ticket management dashboard

### Authentication & Authorization ✅
- NextAuth v4 with OAuth providers (Google, Microsoft)
- Role-based access control (Admin, Staff, Public)
- Entity-based data filtering for staff users
- Admin user management UI
- Session management with JWT (2-hour expiration)
- Audit logging system
- Email whitelist authorization

### AI Integration ✅
- **Context-Aware AI Assistant** - Real-time UI state tracking
- **Dual-Channel Context System:**
  - Static page metadata (build-time generation from JSDoc)
  - Dynamic UI state (real-time postMessage updates)
- **Intelligent Context Tracking:**
  - Modal awareness (knows what ticket/user you're viewing)
  - Tab switching detection (tracks active tab)
  - Form progress monitoring (tracks completion status)
  - Edit mode tracking (knows what you're editing)
- **Page Context API** - `/api/content/page-context` endpoint
- **Type-Safe Implementation** - Full TypeScript coverage
- Centralized AI bot inventory and management
- Iframe-based chat interface with postMessage communication

---

## 🤖 Context-Aware AI Assistant

The portal features an intelligent AI assistant that understands exactly what users are doing in real-time.

### How It Works

**Dual-Channel Context System:**

1. **Static Page Context (Build-Time)**
   ```typescript
   /**
    * @pageContext
    * @title Ticket Management Dashboard
    * @purpose View and manage support tickets
    * @steps
    *   - Review statistics
    *   - Use filters
    *   - Click ticket to view details
    */
   ```
   - Extracted from `@pageContext` JSDoc tags
   - Generated at build time into JSON
   - Served via `/api/content/page-context` endpoint

2. **Dynamic UI Context (Real-Time)**
   ```typescript
   // When user opens ticket modal
   openModal('view-ticket', {
     entityId: 'TKT-2025-001',
     entityName: 'Passport Issue',
     data: { status: 'Open', priority: 'High' }
   });
   // AI bot receives update via postMessage
   ```

### What the AI Knows

- ✅ **Current page** - Route, title, purpose, features
- ✅ **Active modal** - Type, entity details, data
- ✅ **Edit state** - What entity is being edited
- ✅ **Active tab** - Which tab in tabbed interfaces
- ✅ **Form progress** - Completed/pending fields

### Integration Points

Pages integrated with context tracking:
- `/admin/tickets` - Modal tracking for ticket details
- `/admin/users` - Modal tracking for user add/edit
- `/admin/managedata` - Tab switching (entities/services/QR codes)
- `/feedback` - Form progress tracking (service selection, ratings)

### Example AI Interaction

**User Context:**
- Viewing ticket TKT-2025-001
- Status: Open, Priority: High
- Subject: Passport Issue

**User asks:** "What should I do next?"

**AI Response:**
> Based on the ticket you're viewing (TKT-2025-001: Passport Issue), here's what you should do next:
> 1. **Update status** - Change from Open to In Progress
> 2. **Check SLA** - High priority tickets need response within 24 hours
> 3. **Add notes** - Document your actions (internal notes only)

### For Developers

**Using Context in Components:**
```typescript
import { useChatContext } from '@/hooks/useChatContext';

function MyComponent() {
  const { openModal, closeModal, switchTab } = useChatContext();

  const handleView = (item) => {
    openModal('view-item', {
      entityType: 'ticket',
      entityId: item.id,
      entityName: item.subject,
      data: { status: item.status }
    });
  };

  return <button onClick={() => handleView(item)}>View</button>;
}
```

**Complete Documentation:**
- [AI Bot Portal Integration Guide](docs/AI_BOT_PORTAL_INTEGRATION.md)
- [Context Bot Quick Reference](CONTEXT_BOT_QUICK_REFERENCE.md)
- [Testing Guide](CONTEXT_AWARE_BOT_TESTING.md)

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
docker-compose up -d --build frontend
```

---

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs frontend
docker-compose logs feedback_db

# Verify .env file exists
cat .env

# Check ports aren't in use
netstat -tuln | grep -E '80|443'
```

### SSL certificate issues
```bash
# Check Traefik logs
docker-compose logs traefik

# Verify DNS
dig +short gea.your-domain.com

# Force certificate refresh
rm -f traefik_acme/acme.json
docker-compose restart traefik
```

### Database connection errors
```bash
# Check database is running
docker-compose ps feedback_db

# Test connection
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT 1"

# Restart database
docker-compose restart feedback_db
```

### Authentication issues
```bash
# Verify user exists
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT email, is_active FROM users WHERE email='user@example.com';"

# Check OAuth configuration
docker exec frontend env | grep -E "NEXTAUTH|GOOGLE|MICROSOFT"

# View auth logs
docker-compose logs frontend | grep -i "nextauth"
```

---

## 📈 Monitoring

### Health Checks

```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Disk usage
du -sh ./
df -h

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
- **API Reference:** `docs/API_REFERENCE.md`
- **Database Schema:** `docs/DATABASE_REFERENCE.md`
- **Authentication Setup:** `docs/AUTHENTICATION_GUIDE.md`

### Contact
- **Repository:** https://github.com/abhirupbanerjee/GEAv3.git
- **Issues:** https://github.com/abhirupbanerjee/GEAv3/issues
- **Demo Portal:** https://your-portal-domain.com
- **Email:** contact@your-domain.com

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
- [ ] Environment variables configured in `.env`
- [ ] Strong passwords generated for database
- [ ] NextAuth secret generated (`openssl rand -base64 32`)
- [ ] OAuth credentials obtained (Google/Microsoft)
- [ ] SendGrid API key configured

**Infrastructure:**
- [ ] DNS records configured for domain
- [ ] Ports 80 and 443 available
- [ ] Firewall rules configured
- [ ] Docker and Docker Compose installed
- [ ] Sufficient disk space (20GB+ recommended)

**Database:**
- [ ] Database initialized (`01-init-db.sh`)
- [ ] Master data loaded (`scripts/11-load-master-data.sh` or `99-consolidated-setup.sh --reload`)
- [ ] Authentication tables created (`04-nextauth-users.sh`)
- [ ] Admin user added (`05-add-initial-admin.sh`)
- [ ] Data integrity verified (`scripts/13-verify-master-data.sh`)
- [ ] Backup strategy configured

**Testing:**
- [ ] All containers running: `docker-compose ps`
- [ ] Frontend accessible via HTTPS
- [ ] SSL certificate issued successfully
- [ ] OAuth sign-in working (Google/Microsoft)
- [ ] Admin portal accessible
- [ ] Ticket submission working
- [ ] Email notifications sending

---

## 📊 Project Statistics

### Current Implementation
- **Total API Endpoints:** 37+ (public + admin + auth + context)
- **Database Tables:** 23 (master data, transactional, auth, audit)
- **Database Indexes:** 44+
- **Foreign Keys:** 18+
- **Lines of Code:** ~22,000+
- **Docker Services:** 3 (Traefik, PostgreSQL, Frontend)
- **Authentication Providers:** 2 (Google, Microsoft)
- **AI Integration:** Context-aware assistant with real-time tracking
- **Page Context Coverage:** 22 pages, 100% documented

### Performance
- **Build Time:** ~3-5 minutes (first build)
- **Deployment Time:** ~10-15 minutes (first deployment)
- **Memory Usage:** ~2GB (all services under load)
- **Disk Usage:** ~3GB (including database with sample data)

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
2. Use troubleshooting section for common issues
3. Set up monitoring with `docker stats`
4. Configure automated backups

### For Database Administrators
1. Review complete DBA guide: `database/README.md`
2. Review schema documentation: `docs/DATABASE_REFERENCE.md`
3. Use consolidated setup script: `99-consolidated-setup.sh`
4. Schedule regular backups: `pg_dump` via cron
5. Monitor disk usage and index performance

---

## 📄 License

© 2025 Government of Grenada. All rights reserved.

---


**Last Updated:** November 26, 2025 | **Version:** 3.0 | **Status:** ✅ Production Ready

**Note:** This project has been co-developed with AI (Claude) for documentation, code implementation, generation of synthetic data, and test scenarios. The context-aware AI assistant feature was implemented with full AI assistance. 
---

## Quick Links

- 📖 [Complete Documentation](docs/index.md)
- 🏗️ [**Solution Architecture**](docs/SOLUTION_ARCHITECTURE.md) - System overview
- 🔌 [API Reference](docs/API_REFERENCE.md)
- 🗄️ [Database Schema](docs/DATABASE_REFERENCE.md)
- 🔐 [Authentication Guide](docs/AUTHENTICATION.md)
- 🤖 [**AI Bot Integration**](docs/AI_BOT_PORTAL_INTEGRATION.md) - Context-aware assistant guide
- 📋 [AI Bots Management](docs/ai-bots-management.md)
- ⚡ [Context Bot Quick Reference](CONTEXT_BOT_QUICK_REFERENCE.md)
- 🧪 [AI Bot Testing Guide](CONTEXT_AWARE_BOT_TESTING.md)

---

## See Also

### For Architects & Tech Leads
- [Solution Architecture](docs/SOLUTION_ARCHITECTURE.md) - Complete system architecture and design
- [Complete Documentation Index](docs/index.md) - Overview of all features and roadmap

### For Developers
- [UI Modification Guide](docs/developer-guides/UI_MODIFICATION_GUIDE.md) - Complete guide for UI development and customization
- [API Reference](docs/API_REFERENCE.md) - Complete API endpoint documentation
- [AI Bot Integration](docs/AI_BOT_PORTAL_INTEGRATION.md) - Context-aware assistant implementation
- [Context Bot Quick Reference](CONTEXT_BOT_QUICK_REFERENCE.md) - Quick API reference
- [Database Reference](docs/DATABASE_REFERENCE.md) - Database schema and SQL commands
- [Authentication Guide](docs/AUTHENTICATION.md) - OAuth setup and user management

### For System Administrators
- [Solution Architecture](docs/SOLUTION_ARCHITECTURE.md) - Deployment and infrastructure architecture
- [Database Administrator Guide](database/README.md) - Complete database management commands
- [Database Reference](docs/DATABASE_REFERENCE.md) - Database schema and setup
- [Authentication Guide](docs/AUTHENTICATION.md) - User management and troubleshooting commands

### For Project Managers
- [Solution Architecture](docs/SOLUTION_ARCHITECTURE.md) - System capabilities and roadmap
- [Complete Documentation Index](docs/index.md) - Overview of all features
