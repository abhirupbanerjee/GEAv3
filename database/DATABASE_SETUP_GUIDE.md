# GEA Portal v3 - Complete Database Setup Guide

**Document Version:** 10.0 **Last Updated:** November 24, 2025
**Database:** PostgreSQL 15.15
**Schema Version:** Production-Aligned v10.0
**Total Tables:** 30
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Database Overview](#database-overview)
3. [Setup Methods](#setup-methods)
4. [Table Reference](#table-reference)
5. [Data Loading](#data-loading)
6. [Verification & Testing](#verification--testing)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## 🚀 Quick Start

### Recommended: Use Consolidated Setup

```bash
# Fresh setup with DTA operational data
./database/99-consolidated-setup.sh --fresh --load-dta --create-admin

# Or incremental update
./database/99-consolidated-setup.sh --update --verify
```

### Traditional: Use Master Init

```bash
# Run master initialization
./database/00-master-init.sh

# Create admin user
ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh

# Load operational data
./database/06-load-dta-seed-data.sh
```

---

## 📊 Database Overview

### Statistics

| Metric | Count |
|--------|-------|
| **Total Tables** | 30 |
| **Reference Data** | 5 |
| **Auth & Users** | 8 |
| **Feedback & Grievances** | 4 |
| **EA Service Requests** | 3 |
| **Tickets & Activity** | 7 |
| **Security** | 3 |
| **Foreign Keys** | 30+ |
| **Indexes** | 60+ |
| **Extensions** | 1 (uuid-ossp) |

### Connection Details

```bash
Container: feedback_db
Host: localhost (or Azure VM IP)
Port: 5432
Database: feedback
User: feedback_user
Password: [Set in .env]
```

### Environment Variables

```env
FEEDBACK_DB_HOST=feedback_db
FEEDBACK_DB_PORT=5432
FEEDBACK_DB_NAME=feedback
FEEDBACK_DB_USER=feedback_user
FEEDBACK_DB_PASSWORD=<secure_password>
```

---

## 🛠️ Setup Methods

### Method 1: Consolidated Setup (Recommended) ⭐

**File:** `99-consolidated-setup.sh`

**Features:**
- ✅ All-in-one command
- ✅ Automatic backups
- ✅ Safety confirmations
- ✅ Built-in verification
- ✅ Flexible options

**Usage:**

```bash
# Fresh database setup
./database/99-consolidated-setup.sh \
    --fresh \
    --load-dta \
    --create-admin \
    --verify

# Incremental update (safe for existing databases)
./database/99-consolidated-setup.sh \
    --update \
    --verify

# Just verify current state
./database/99-consolidated-setup.sh --verify

# Help
./database/99-consolidated-setup.sh --help
```

**Options:**
- `--fresh` - Complete fresh setup (drops existing tables)
- `--update` - Incremental safe update
- `--verify` - Comprehensive verification report
- `--load-basic` - Load basic reference data only
- `--load-test` - Load general test data
- `--load-dta` - Load DTA operational data (recommended)
- `--create-admin` - Create admin user
- `--backup` - Create backup only
- `--compare` - Compare with current state

---

### Method 2: Master Init (Traditional)

**File:** `00-master-init.sh`

**Execution Flow:**
```
00-master-init.sh
├── Step 1: Verify database connection
├── Step 2: Detect existing schema & backup
├── Step 3: Run core schema (01-init-db.sh)
├── Step 4: Run NextAuth migration (04-nextauth-users.sh)
├── Step 5: Add service enhancements (07-service-request-enhancements.sh)
├── Step 6: Add production tables (09-add-missing-production-tables.sh)
├── Step 7: Update file extensions
└── Step 8: Verification
```

**Usage:**

```bash
# Run master init
./database/00-master-init.sh

# Then load data separately
./database/06-load-dta-seed-data.sh

# Create admin user
ADMIN_EMAIL="admin@example.com" \
ADMIN_NAME="Admin User" \
./database/05-add-initial-admin.sh
```

---

### Method 3: Individual Scripts (Advanced)

**For fine-grained control:**

```bash
# 1. Core schema
./database/01-init-db.sh

# 2. Auth tables
./database/04-nextauth-users.sh

# 3. Service request comments
./database/07-service-request-enhancements.sh

# 4. Production-specific tables
./database/09-add-missing-production-tables.sh

# 5. Load data
./database/06-load-dta-seed-data.sh

# 6. Create admin
./database/05-add-initial-admin.sh

# 7. Verify
./database/03-verify-analytics.sh
```

---

## 📚 Table Reference

### Complete Table List (30 Tables)

#### 1. Reference Data (5 tables)

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `entity_master` | unique_entity_id | Government entities (ministries, departments, agencies) |
| `service_master` | service_id | Government services (regular + EA services) |
| `service_attachments` | service_attachment_id | Document requirements for services |
| `priority_levels` | priority_id | Priority definitions for tickets |
| `grievance_status` | status_id | Status options for grievances |

#### 2. Auth & Users (8 tables)

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `users` | id (UUID) | User accounts with roles |
| `user_roles` | role_id | Role definitions (admin_dta, staff_mda, public_user) |
| `accounts` | id (UUID) | OAuth provider data (Google, Microsoft) |
| `sessions` | id (UUID) | Active user sessions |
| `verification_tokens` | (identifier, token) | Email verification tokens |
| `entity_user_assignments` | assignment_id | User-entity mapping (many-to-many) |
| `user_permissions` | permission_id | Fine-grained permissions |
| `user_audit_log` | log_id | Activity audit trail |

#### 3. Feedback & Grievances (4 tables)

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `service_feedback` | feedback_id | Citizen feedback submissions |
| `grievance_tickets` | grievance_id | Formal grievance tickets |
| `grievance_attachments` | attachment_id | Supporting documents for grievances |
| `qr_codes` | qr_code_id | QR code generation for marketing |

#### 4. EA Service Requests (3 tables)

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `ea_service_requests` | request_id | EA service requests |
| `ea_service_request_attachments` | attachment_id | Required document uploads |
| `ea_service_request_comments` | comment_id | Comments and notes on requests |

#### 5. Tickets & Activity (7 tables)

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `tickets` | ticket_id | Support tickets |
| `ticket_status` | status_id | Status options for tickets |
| `ticket_categories` | category_id | Ticket categories |
| `ticket_attachments` | attachment_id | Ticket file uploads |
| `ticket_activity` | activity_id | Activity log (6 columns - actively used) |
| `ticket_notes` | note_id | Internal staff notes |
| `sla_breaches` | breach_id | SLA breach tracking |

#### 6. Security (3 tables)

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `submission_rate_limit` | ip_hash | Rate limiting tracking |
| `submission_attempts` | attempt_id | Submission audit trail |
| `captcha_challenges` | challenge_id | CAPTCHA tracking |

---

## 📥 Data Loading

### Basic Reference Data

**Automatically loaded by setup scripts:**
- ✅ 4 Entities (Immigration, Revenue, Civil Registry, DTA)
- ✅ 14 Services (7 regular + 7 EA services)
- ✅ 27 Service attachments (document requirements)
- ✅ 4 Priority levels
- ✅ 4 Grievance statuses
- ✅ 4 Ticket statuses
- ✅ 3 User roles

### Option 1: DTA Operational Data (Recommended)

**Script:** `06-load-dta-seed-data.sh`

**Loads:**
- 4 staff user accounts (one per ministry)
- 7 realistic EA service requests
- Request attachments with sample files
- Comments and status history
- Ready for immediate testing

**Usage:**
```bash
./database/06-load-dta-seed-data.sh
```

**Test accounts created:**
- `immigration.staff@gov.gd` (DEPT-001)
- `revenue.staff@gov.gd` (DEPT-002)
- `registry.staff@gov.gd` (DEPT-004)
- `dta.staff@gov.gd` (AGY-002)

### Option 2: General Test Data

**Script:** `02-load-seed-data.sh`

**Loads:**
- 50 service feedback submissions
- Auto-generated grievance tickets
- 10 citizen-submitted grievances
- 7 EA service requests
- Sample attachments

**Usage:**
```bash
./database/02-load-seed-data.sh
```

---

## ✅ Verification & Testing

### Quick Verification

```bash
# Check table count
docker exec -i feedback_db psql -U feedback_user -d feedback -c "
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Expected: 30 tables
```

### Comprehensive Verification

```bash
# Use consolidated tool
./database/99-consolidated-setup.sh --verify

# Or use dedicated verification script
./database/03-verify-analytics.sh
```

### Manual Verification Queries

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check reference data loaded
SELECT 'Entities' as category, COUNT(*) FROM entity_master
UNION ALL SELECT 'Services', COUNT(*) FROM service_master
UNION ALL SELECT 'Service Attachments', COUNT(*) FROM service_attachments
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'User Roles', COUNT(*) FROM user_roles;

-- Check indexes
SELECT
    tablename,
    COUNT(*) as indexes
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

---

## 🔧 Troubleshooting

### Container Not Running

```bash
# Check container status
docker ps -a | grep feedback_db

# Start container
docker-compose up -d feedback_db

# Check logs
docker logs feedback_db --tail 50
```

### Connection Refused

```bash
# Check database is ready
docker exec feedback_db pg_isready -U feedback_user

# Wait for healthcheck
docker-compose ps feedback_db
```

### Permission Errors

```bash
# Check database permissions
docker exec feedback_db psql -U feedback_user -d feedback -c "\du"

# Grant permissions if needed
docker exec feedback_db psql -U postgres -d feedback -c "
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO feedback_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO feedback_user;
"
```

### Missing Tables After Setup

```bash
# Re-run master init (idempotent)
./database/00-master-init.sh

# Or use consolidated setup
./database/99-consolidated-setup.sh --update --verify
```

### Backup Before Changes

```bash
# Create manual backup
docker exec feedback_db pg_dump -U feedback_user feedback > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use consolidated tool (automatic backup)
./database/99-consolidated-setup.sh --backup
```

### Restore from Backup

```bash
# Restore from backup file
docker exec -i feedback_db psql -U feedback_user -d feedback < backup_file.sql
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Database container running and healthy
- [ ] Environment variables set correctly
- [ ] Backup of existing data created
- [ ] Admin email configured
- [ ] OAuth credentials ready (Google, Microsoft)

### Fresh Production Setup

```bash
# 1. Start database
docker-compose up -d feedback_db

# 2. Wait for ready
docker-compose ps feedback_db

# 3. Run consolidated setup
./database/99-consolidated-setup.sh \
    --fresh \
    --load-basic \
    --create-admin \
    --verify

# 4. Configure OAuth in frontend/.env
# Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.

# 5. Test admin login
# Navigate to /auth/signin
```

### Update Existing Production

```bash
# 1. Create backup (automatic)
./database/99-consolidated-setup.sh --backup

# 2. Run incremental update
./database/99-consolidated-setup.sh --update

# 3. Verify
./database/99-consolidated-setup.sh --verify

# 4. Test application
# Check all features still work
```

### Post-Deployment Verification

```bash
# 1. Check table count
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Expected: 30 tables

# 2. Check admin user exists
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT email, name, r.role_name
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE r.role_code = 'admin_dta';"

# 3. Test OAuth login
# Navigate to /auth/signin and test login

# 4. Check application features
# Test creating EA request, grievance, ticket
```

---

## 📖 Additional Resources

### Related Documentation

- **API Reference:** [docs/API_REFERENCE.md](../docs/API_REFERENCE.md)
- **Solution Architecture:** [docs/SOLUTION_ARCHITECTURE.md](../docs/SOLUTION_ARCHITECTURE.md)
- **Database Technical Ref:** [docs/DATABASE_REFERENCE.md](../docs/DATABASE_REFERENCE.md)

### Script Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `99-consolidated-setup.sh` | All-in-one setup | **Recommended for all setups** |
| `00-master-init.sh` | Traditional orchestrator | Alternative to consolidated |
| `01-init-db.sh` | Core schema | Called by master scripts |
| `02-load-seed-data.sh` | General test data | Development/testing |
| `03-verify-analytics.sh` | Verification queries | Manual verification |
| `04-nextauth-users.sh` | Auth tables | Called by master scripts |
| `05-add-initial-admin.sh` | Admin user creation | After setup or standalone |
| `06-load-dta-seed-data.sh` | DTA operational data | **Recommended for realistic data** |
| `07-service-request-enhancements.sh` | Comments table | Called by master scripts |
| `09-add-missing-production-tables.sh` | SLA & ticket_notes | Called by master scripts |

### Key Features

✅ **Idempotent** - Safe to run multiple times
✅ **Incremental** - Can update existing databases
✅ **Verified** - Matches production 100%
✅ **Documented** - Comprehensive guides
✅ **Flexible** - Multiple setup options
✅ **Safe** - Automatic backups before changes

---

## 🔐 Security Notes

### OAuth Configuration

After database setup, configure OAuth in `frontend/.env.local`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
NEXTAUTH_SECRET=your_random_secret_key_min_32_chars
NEXTAUTH_URL=http://localhost:3000
```

### Admin User Security

- Admin user requires OAuth sign-in (Google or Microsoft)
- Email must match configured admin email exactly
- No password-based login
- Full system access (use carefully)

### Database Security

- Use strong password for `feedback_user`
- Restrict database port (5432) access
- Enable SSL for production
- Regular backups (automated recommended)
- Audit logs enabled (`user_audit_log` table)

---

## 📞 Support & Maintenance

### Regular Maintenance

**Weekly:**
- Run verification: `./database/99-consolidated-setup.sh --verify`
- Check for errors in logs
- Review audit logs

**Monthly:**
- Create full backup
- Review user accounts and permissions
- Check database size and performance

### Getting Help

1. Check [Troubleshooting](#troubleshooting) section
2. Review script logs for errors
3. Run verification to see current state
4. Check Docker container logs

### Backup Strategy

**Automated:**
- Consolidated script creates backups before changes
- Backups saved to `/tmp/gea_backups/`
- Timestamped filenames

**Manual:**
```bash
# Create backup
docker exec feedback_db pg_dump -U feedback_user feedback > manual_backup.sql

# Restore
docker exec -i feedback_db psql -U feedback_user -d feedback < manual_backup.sql
```

---

**Document Status:** ✅ Production Ready
**Last Verified:** November 24, 2025
**Schema Version:** 10.0 (Production-Aligned)
**Total Tables:** 30

---

*This is the official comprehensive database setup guide. For quick reference, see inline script help: `./database/99-consolidated-setup.sh --help`*
