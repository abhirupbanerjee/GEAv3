# GEA Portal v3 - Database Setup Scripts

This directory contains all database initialization and data loading scripts for the GEA Portal v3 application.

## 📋 Quick Start

### Complete Fresh Setup (Recommended)

```bash
# Run master initialization script (does everything!)
./database/00-master-init.sh

# Add your admin user
ADMIN_EMAIL=your@email.com ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh

# Load DTA operational seed data
./database/06-load-dta-seed-data.sh

# Optional: Load additional test data for analytics
./database/02-load-seed-data.sh
```

That's it! Your database is fully configured and ready to use.

---

## 📁 Script Inventory

### Core Setup Scripts (Run in Order)

| Script | Purpose | When to Run |
|--------|---------|-------------|
| **00-master-init.sh** | Master initialization - runs all core setup scripts | **First time setup** or complete rebuild |
| **01-init-db.sh** | Core schema creation (all tables, indexes, constraints) | Called by master script |
| **02-load-seed-data.sh** | General test data (feedback, grievances, tickets) | Optional - for analytics testing |
| **03-verify-analytics.sh** | Verify data and run analytics queries | After loading seed data |
| **04-nextauth-users.sh** | NextAuth authentication tables | Called by master script |
| **05-add-initial-admin.sh** | Add admin user for OAuth login | **After master init** |
| **06-load-dta-seed-data.sh** | **DTA-specific operational seed data** | **Recommended for production-like testing** |
| **07-service-request-enhancements.sh** | Comments/notes table for service requests | Called by master script |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| **update-file-extensions.sh** | Update file extensions to allow multiple formats (pdf,docx,doc) |
| **run-nextauth-migration.sh** | Alternative NextAuth setup (use 04-nextauth-users.sh instead) |

---

## 🎯 Common Scenarios

### Scenario 1: Brand New Database

```bash
# One command does it all!
./database/00-master-init.sh

# Then add your admin user
ADMIN_EMAIL=gogdtaservices@gmail.com ./database/05-add-initial-admin.sh

# Load realistic DTA operational data
./database/06-load-dta-seed-data.sh
```

### Scenario 2: Reset Database to Clean State

```bash
# Drop and recreate database (IN DOCKER)
docker exec -it feedback_db psql -U postgres -c "DROP DATABASE IF EXISTS feedback;"
docker exec -it feedback_db psql -U postgres -c "CREATE DATABASE feedback OWNER feedback_user;"

# Run master init
./database/00-master-init.sh

# Reload your preferred seed data
./database/06-load-dta-seed-data.sh
```

### Scenario 3: Add More Test Data

```bash
# Load general test data (50 feedback, grievances, etc.)
./database/02-load-seed-data.sh

# Verify with analytics
./database/03-verify-analytics.sh
```

### Scenario 4: Update File Extensions Only

```bash
# If you need to re-run file extension updates
./database/update-file-extensions.sh
```

---

## 📊 What Gets Created

### Database Tables (35 Total)

#### Core Business Tables
- `entity_master` - Government entities (ministries, departments, agencies)
- `service_master` - Government services
- `service_attachments` - Required documents for each service (27 documents for 7 EA services)

#### Feedback & Grievances
- `service_feedback` - Citizen feedback submissions
- `grievance_tickets` - Formal grievance submissions
- `grievance_attachments` - Supporting documents for grievances

#### EA Service Requests (DTA)
- `ea_service_requests` - EA service requests from ministries
- `ea_service_request_attachments` - Required documents (leadership approvals, architecture docs, etc.)
- `ea_service_request_comments` - Comments, notes, and status change history

#### Support Tickets
- `tickets` - General support tickets
- `ticket_activity` - Ticket activity log
- `ticket_attachments` - Ticket attachments
- `ticket_status` - Status lookup
- `ticket_categories` - Category lookup
- `priority_levels` - Priority lookup

#### Authentication & Authorization (NextAuth)
- `users` - User accounts
- `user_roles` - Role definitions (admin_dta, staff_mda, public_user)
- `accounts` - OAuth account data (Google, Microsoft)
- `sessions` - Active sessions
- `verification_tokens` - Email verification
- `entity_user_assignments` - Many-to-many user<>entity mapping
- `user_permissions` - Fine-grained permissions
- `user_audit_log` - User activity audit trail

#### Security & Rate Limiting
- `submission_rate_limit` - Rate limiting tracking
- `submission_attempts` - Submission audit log
- `captcha_challenges` - CAPTCHA challenge tracking
- `qr_codes` - QR code generation and tracking

### Reference Data Loaded

#### Entities (4)
- `DEPT-001` - Immigration Department
- `DEPT-002` - Inland Revenue Division
- `DEPT-004` - Civil Registry & Deeds
- `AGY-002` - Digital Transformation Agency (DTA)

#### Services (14)
**Ministry Services:**
- Passport Application, Passport Renewal (Immigration)
- Business Registration, Tax Filing (Revenue)
- Birth Certificate (Civil Registry)
- eServices Account, Portal Support (DTA)

**EA Services (DTA):**
- `digital-roadmap` - Public Sector Digital Roadmap Support
- `ea-framework-review` - Grenada EA Framework Management
- `maturity-assessment` - Grenada EA Maturity Assessment
- `repository-access` - Grenada EA Repository Access
- `compliance-review` - Grenada EA Compliance Review
- `portfolio-review` - IT Portfolio Review
- `training-capacity` - EA Training & Capacity Development

#### Service Attachments (27 Documents)

**Digital Roadmap (5 docs):**
- Senior leadership approval (PDF) - Mandatory
- Digital vision / strategic plan (PDF,DOCX,DOC) - Mandatory
- Inventory of services and systems (PDF,XLSX,XLS,CSV) - Mandatory
- Organizational structure (PDF) - Optional
- Existing system/vendor contracts (PDF) - Optional

**EA Framework Review (3 docs):**
- Details of domain/method requiring update (PDF,DOCX,DOC) - Mandatory
- Senior Government leadership approval (PDF) - Mandatory
- Supporting EA documents (PDF) - Optional

**Maturity Assessment (3 docs):**
- Budget or funding request to MoF (PDF) - Mandatory
- Description of proposed digital initiative (PDF,DOCX,DOC) - Mandatory
- Architecture or system documentation (PDF) - Optional

**Repository Access (2 docs):**
- Senior leadership approval (PDF) - Mandatory
- Required duration of access (PDF,DOCX,DOC) - Mandatory

**Compliance Review (8 docs):**
- Senior leadership approval (PDF) - Mandatory
- Current state architecture documents (PDF) - Mandatory
- Target state architecture design document (PDF) - Mandatory
- Solution design documents (PDF) - Mandatory
- Vendor contracts / SOWs (PDF) - Optional
- Integration diagrams (PDF) - Optional
- Security documentation (PDF) - Optional
- Data architecture diagrams (PDF) - Optional

**Portfolio Review (3 docs):**
- Senior leadership approval (PDF) - Mandatory
- Baseline inventory of systems and services (PDF,XLSX,XLS,CSV) - Mandatory
- Existing IT contracts and SLAs (PDF) - Optional

**Training & Capacity (3 docs):**
- Senior leadership approval (PDF) - Mandatory
- Intended audience list (PDF,XLSX,XLS,CSV) - Mandatory
- Training topics or customization needs (PDF,DOCX,DOC) - Optional

#### User Roles (3)
- `admin_dta` - DTA Administrator (full system access)
- `staff_mda` - MDA Staff Officer (entity-specific access)
- `public_user` - Public User (future use)

#### Priority Levels (4)
- Urgent, High, Medium, Low (with SLA multipliers and color codes)

#### Status Values
- Grievance: open, process, resolved, closed
- Tickets: Open, In Progress, Resolved, Closed

---

## 🧪 DTA Seed Data (Script 06)

The `06-load-dta-seed-data.sh` script creates realistic operational data:

### Staff Users Created
- `immigration.staff@gov.gd` - Sarah Johnson (DEPT-001)
- `revenue.staff@gov.gd` - Michael Thompson (DEPT-002)
- `registry.staff@gov.gd` - Patricia Williams (DEPT-004)
- `dta.staff@gov.gd` - Robert Martinez (AGY-002)

### EA Service Requests (7 Realistic Scenarios)
1. **REQ-2025-DR-001** - Digital Roadmap (Immigration) - *submitted*
2. **REQ-2025-EA-001** - EA Framework Review (Revenue) - *in process*
3. **REQ-2025-MA-001** - Maturity Assessment (Civil Registry) - *submitted*
4. **REQ-2025-RA-001** - Repository Access (Immigration) - *submitted*
5. **REQ-2025-CR-001** - Compliance Review (Revenue) - *resolved*
6. **REQ-2025-PR-001** - Portfolio Review (DTA) - *submitted*
7. **REQ-2025-TC-001** - Training Program (DTA) - *in process*

### Features
- Realistic requester information
- Multi-status requests (submitted, processing, resolved)
- Sample file attachments with correct MIME types
- Comments and status change history
- Cross-entity scenarios

---

## 🔐 Authentication Setup

After running the database scripts, you need to configure OAuth:

### 1. Add Admin User

```bash
# Default admin (gogdtaservices@gmail.com)
./database/05-add-initial-admin.sh

# Custom admin
ADMIN_EMAIL=your@email.com ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh
```

### 2. Configure OAuth Providers

Edit `frontend/.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Microsoft OAuth (Azure AD)
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# NextAuth
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=http://localhost:3000
```

### 3. Test Login

1. Start the frontend: `cd frontend && npm run dev`
2. Navigate to: `http://localhost:3000/auth/signin`
3. Sign in with your admin email using Google or Microsoft

---

## 🛡️ File Upload Validation

The database now supports multiple file formats for EA service attachments:

- **Documents**: PDF, DOCX, DOC
- **Spreadsheets**: PDF, XLSX, XLS, CSV
- **Generic**: PDF (always accepted as alternative)

The frontend validates file extensions before upload, and the backend validates again during submission.

---

## 📈 Analytics & Verification

Run analytics after loading seed data:

```bash
./database/03-verify-analytics.sh
```

This will show:
- Data volume by table
- Feedback ratings analysis
- Grievance breakdowns
- Service performance metrics
- Key satisfaction metrics

---

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check if container is running
docker ps | grep feedback_db

# Check database exists
docker exec feedback_db psql -U feedback_user -l

# Connect manually
docker exec -it feedback_db psql -U feedback_user -d feedback
```

### Reset Everything

```bash
# Nuclear option: drop and recreate
docker exec -it feedback_db psql -U postgres << 'EOF'
DROP DATABASE IF EXISTS feedback;
CREATE DATABASE feedback OWNER feedback_user;
GRANT ALL PRIVILEGES ON DATABASE feedback TO feedback_user;
EOF

# Then re-run setup
./database/00-master-init.sh
```

### Check What's Installed

```bash
# List all tables
docker exec feedback_db psql -U feedback_user -d feedback -c "\dt"

# Check specific table
docker exec feedback_db psql -U feedback_user -d feedback -c "\d service_attachments"

# Count records
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT COUNT(*) FROM ea_service_requests;"
```

### View Sample Data

```bash
# EA Service Requests
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT request_number, service_id, status, requester_name, requester_ministry
FROM ea_service_requests
ORDER BY created_at DESC
LIMIT 10;
"

# Service Attachments Requirements
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT service_id, filename, file_extension, is_mandatory
FROM service_attachments
WHERE service_id LIKE '%roadmap%'
ORDER BY sort_order;
"

# Staff Users
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT u.email, u.name, e.entity_name, r.role_name
FROM users u
JOIN entity_master e ON u.entity_id = e.unique_entity_id
JOIN user_roles r ON u.role_id = r.role_id;
"
```

---

## 📝 Migration Notes

### From v2 to v3

If you have an existing v2 database:

1. **Backup first!**
   ```bash
   docker exec feedback_db pg_dump -U feedback_user feedback > backup_v2.sql
   ```

2. **Run master init** (it's idempotent and will migrate existing data)
   ```bash
   ./database/00-master-init.sh
   ```

3. **Verify migration**
   ```bash
   ./database/03-verify-analytics.sh
   ```

### File Extension Updates

If you previously had single-format requirements (e.g., only "docx"), the master init script automatically updates them to multi-format (e.g., "pdf,docx,doc").

---

## ✅ Checklist: Complete Setup

- [ ] Run `00-master-init.sh` successfully
- [ ] Add admin user with `05-add-initial-admin.sh`
- [ ] Load DTA seed data with `06-load-dta-seed-data.sh`
- [ ] Configure OAuth credentials in `.env.local`
- [ ] Test admin login via OAuth
- [ ] Test staff login with sample users
- [ ] Verify EA service request creation
- [ ] Check file upload validation works

---

## 🆘 Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs: `docker logs feedback_db`
3. Check Next.js logs: Frontend console and terminal
4. Review database schema: `\d table_name` in psql

---

## 📜 Change Log

### v7.0 (November 23, 2025)
- **NEW**: Master initialization script (`00-master-init.sh`)
- **NEW**: Comprehensive DTA seed data (`06-load-dta-seed-data.sh`)
- **FIXED**: File extension column expanded to VARCHAR(50)
- **FIXED**: Multi-format file support (pdf,docx,doc and pdf,xlsx,xls,csv)
- **FIXED**: Entity FK references (entity_id → unique_entity_id)
- **IMPROVED**: All scripts are now idempotent
- **IMPROVED**: Better error handling and verification

### v6.2 (November 22, 2025)
- Added ticket_activity and ticket_attachments tables
- Added service request comments table
- PostgreSQL 13 compatibility fixes

### v6.1 (November 22, 2025)
- Initial Phase 2b release
- NextAuth integration
- EA service request tables
- 27 document requirements across 7 EA services

---

**Last Updated**: November 23, 2025
**Database Version**: 7.0
**PostgreSQL**: 13+ compatible
