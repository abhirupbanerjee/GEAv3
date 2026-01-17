# GEA Portal v3 - Database Architecture Reference

**Document Version:** 10.3
**Last Updated:** January 16, 2026
**Database:** PostgreSQL 16.11-alpine (upgraded from 15.14)
**Connection Pool:** PgBouncer v1.23.1-p3
**Cache:** Redis 7.4.4-alpine
**Schema Version:** Production-Aligned v10.1 (31 tables)

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Database Setup](#database-setup)
3. [Schema Overview](#schema-overview)
4. [Table Specifications](#table-specifications)
5. [Relationships & Foreign Keys](#relationships--foreign-keys)
6. [Indexes](#indexes)
7. [Views](#views)
8. [Triggers](#triggers)
9. [Data Management](#data-management)

---

## Quick Reference

### Database Statistics

| Metric | Count |
|--------|-------|
| **Tables** | 30 |
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

**Application connects via PgBouncer (recommended):**
```bash
Host: pgbouncer (Docker)
Port: 5432
Database: feedback
User: feedback_user
Password: [Set in FEEDBACK_DB_PASSWORD env var]
Pool Mode: transaction
Max Clients: 200
```

**Direct database access (for admin/debugging):**
```bash
Host: feedback_db (Docker) / localhost (local)
Port: 5432
Database: feedback
User: feedback_user
Password: [Set in FEEDBACK_DB_PASSWORD env var]
```

**Redis Cache:**
```bash
Host: redis (Docker)
Port: 6379
Max Memory: 256MB
Eviction Policy: allkeys-lru
```

### Environment Variables

```env
# Database (via PgBouncer)
FEEDBACK_DB_HOST=pgbouncer
FEEDBACK_DB_PORT=5432
FEEDBACK_DB_NAME=feedback
FEEDBACK_DB_USER=feedback_user
FEEDBACK_DB_PASSWORD=<your_password>

# Redis Cache
REDIS_HOST=redis
REDIS_PORT=6379
```

---

## Database Setup

### 1. Initial Setup (Docker)

**Start the database container:**

```bash
# Start database service
docker-compose up -d feedback_db

# Wait for database to be ready (health check)
docker-compose ps feedback_db
```

**Run initialization script:**

```bash
# Copy script to container
docker cp database/01-init-db.sh feedback_db:/tmp/

# Execute initialization (creates all tables, reference data)
docker exec -it feedback_db /bin/bash /tmp/01-init-db.sh
```

**Expected output:**
- ✓ Database connection successful
- ✓ Created 15 tables (including ticket_activity and ticket_attachments)
- ✓ Created 44+ indexes
- ✓ Inserted reference data (entities, services, statuses, etc.)
- ✓ Seeded initial activity records for existing tickets
- ✓ Verification checks passed

### 1b. Authentication Setup (Required for Admin Access)

**Run authentication migration:**

```bash
# Create authentication tables (8 new tables)
./database/04-nextauth-users.sh

# Add initial admin user
ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh
```

**Expected output:**
- ✓ Created 8 authentication tables (users, user_roles, accounts, sessions, etc.)
- ✓ Created user management indexes
- ✓ Inserted 3 default roles (admin, staff, public)
- ✓ Admin user added successfully

### 2. Load Test/Seed Data (Optional)

```bash
# Copy seed data script
docker cp database/02-load-seed-data.sh feedback_db:/tmp/

# Execute seed data generation
docker exec -it feedback_db /bin/bash /tmp/02-load-seed-data.sh
```

**Seed data includes:**
- 50 service feedback records (varied ratings)
- Auto-generated grievance tickets from low ratings
- 10 citizen-submitted grievances
- 7 EA service requests
- Sample attachments

### 3. Verify Setup

```bash
# Run verification script
docker cp database/03-verify-analytics.sh feedback_db:/tmp/
docker exec -it feedback_db /bin/bash /tmp/03-verify-analytics.sh
```

**Or verify manually:**

```bash
# Connect to database
docker exec -it feedback_db psql -U feedback_user -d feedback

# Check tables
\dt

# Check row counts
SELECT
    schemaname,
    tablename,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = tablename) AS columns,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 4. Clear Data (Fresh Start)

**Option A: Clear transactional data only (keep master data)**

```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
-- Clear transactional tables
TRUNCATE TABLE service_feedback CASCADE;
TRUNCATE TABLE grievance_tickets CASCADE;
TRUNCATE TABLE grievance_attachments CASCADE;
TRUNCATE TABLE ea_service_requests CASCADE;
TRUNCATE TABLE ea_service_request_attachments CASCADE;
TRUNCATE TABLE tickets CASCADE;
TRUNCATE TABLE ticket_activity CASCADE;
TRUNCATE TABLE ticket_attachments CASCADE;
TRUNCATE TABLE submission_rate_limit CASCADE;
TRUNCATE TABLE submission_attempts CASCADE;

-- Reset sequences
ALTER SEQUENCE service_feedback_id_seq RESTART WITH 1;
ALTER SEQUENCE grievance_tickets_id_seq RESTART WITH 1;
ALTER SEQUENCE grievance_attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE ea_service_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE ea_service_request_attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE tickets_id_seq RESTART WITH 1;
ALTER SEQUENCE ticket_activity_activity_id_seq RESTART WITH 1;
ALTER SEQUENCE ticket_attachments_attachment_id_seq RESTART WITH 1;

SELECT 'Data cleared. Master data (entities, services, statuses) preserved.' AS status;
EOF
```

**Option B: Full database reset**

```bash
# Stop application
docker-compose stop frontend

# Drop and recreate database
docker exec -it feedback_db psql -U feedback_user -d postgres << 'EOF'
DROP DATABASE IF EXISTS feedback;
CREATE DATABASE feedback OWNER feedback_user;
EOF

# Re-run initialization
docker exec -it feedback_db /bin/bash /tmp/01-init-db.sh

# Restart application
docker-compose start frontend
```

**Option C: Using Docker volume reset**

```bash
# WARNING: This deletes ALL database data
docker-compose down
docker volume rm gogeaportal_v3_feedback_db_data
docker-compose up -d feedback_db

# Wait for health check, then initialize
docker exec -it feedback_db /bin/bash /tmp/01-init-db.sh
```

### 5. Backup & Restore

**Create backup:**

```bash
# Full backup (schema + data)
docker exec feedback_db pg_dump -U feedback_user feedback > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only
docker exec feedback_db pg_dump -U feedback_user --schema-only feedback > schema_$(date +%Y%m%d).sql

# Data only
docker exec feedback_db pg_dump -U feedback_user --data-only feedback > data_$(date +%Y%m%d).sql
```

**Restore backup:**

```bash
# Full restore
docker exec -i feedback_db psql -U feedback_user feedback < backup_20251120_123456.sql

# Schema only restore (to new database)
docker exec -i feedback_db psql -U feedback_user -d postgres -c "CREATE DATABASE feedback_restore"
docker exec -i feedback_db psql -U feedback_user feedback_restore < schema_20251120.sql
```

---

## Schema Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      MASTER DATA LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  entity_master  │  service_master  │  priority_levels           │
│  ticket_status  │  ticket_categories  │  grievance_status       │
│  service_attachments (EA document requirements)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TRANSACTIONAL DATA LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌───────────────────┐    ┌─────────────┐   │
│  │   FEEDBACK   │    │    GRIEVANCES     │    │   TICKETS   │   │
│  │              │    │                   │    │             │   │
│  │ service_     │───▶│ grievance_tickets │    │   tickets   │   │
│  │ feedback     │    │ (auto + manual)   │    │      │      │   │
│  │              │    │        │          │    │      ▼      │   │
│  │              │    │        ▼          │    │ ticket_     │   │
│  │              │    │ grievance_        │    │ activity    │   │
│  │              │    │ attachments       │    │      │      │   │
│  │              │    │                   │    │      ▼      │   │
│  │              │    │                   │    │ ticket_     │   │
│  │              │    │                   │    │ attachments │   │
│  └──────────────┘    └───────────────────┘    └─────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              EA SERVICE REQUESTS                         │   │
│  │                                                          │   │
│  │  ea_service_requests ──▶ ea_service_request_attachments  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SECURITY & AUDIT LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  submission_rate_limit  │  submission_attempts                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            AUTHENTICATION & USER MANAGEMENT LAYER               │
├─────────────────────────────────────────────────────────────────┤
│  users (central auth) ──▶ user_roles                            │
│    │                      │                                      │
│    ├──▶ accounts (OAuth) │                                      │
│    ├──▶ sessions         │                                      │
│    ├──▶ entity_user_assignments ──▶ entity_master              │
│    ├──▶ user_permissions (future)                               │
│    └──▶ user_audit_log                                          │
│                                                                 │
│  verification_tokens (email verification)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

**Flow 1: Public Service Feedback**
```
Citizen → service_feedback (rating ≤2.5) → grievance_tickets (auto-created) → tickets
```

**Flow 2: Direct Citizen Grievance**
```
Citizen → grievance_tickets (manual) → grievance_attachments (optional) → tickets
```

**Flow 3: EA Service Request (Admin Portal)**
```
Admin → ea_service_requests → ea_service_request_attachments (based on service_attachments)
```

---

## Table Specifications

### 1. entity_master

**Purpose:** Government entities (Ministries, Departments, Agencies)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| unique_entity_id | VARCHAR(50) | PRIMARY KEY | Format: MIN-001, DEPT-001, AGY-001 |
| entity_name | VARCHAR(255) | NOT NULL, UNIQUE | Full entity name |
| entity_type | VARCHAR(50) | NOT NULL | ministry, department, agency, statutory_body |
| parent_entity_id | VARCHAR(50) | FK → entity_master | Hierarchy support |
| contact_email | VARCHAR(255) | | Primary contact |
| contact_phone | VARCHAR(50) | | Contact number |
| description | TEXT | | Entity description |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| is_service_provider | BOOLEAN | DEFAULT FALSE | Can receive service requests from other entities |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- PRIMARY KEY on `unique_entity_id`
- UNIQUE INDEX on `entity_name`
- INDEX on `entity_type`
- INDEX on `parent_entity_id`
- INDEX on `is_active`
- PARTIAL INDEX on `is_service_provider` WHERE TRUE

**Sample Data:**
```sql
-- 4 entities pre-loaded
MIN-001 | Ministry of Digital Transformation
DEPT-001 | Department of e-Government
AGY-001 | Digital Transformation Agency
STAT-001 | Grenada Airports Authority
```

**Commands:**
```bash
# View all entities
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT unique_entity_id, entity_name, entity_type FROM entity_master ORDER BY unique_entity_id;"

# Add new entity
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, contact_email, is_active)
VALUES ('DEPT-002', 'Department of Immigration', 'department', 'MIN-001', 'immigration@gov.gd', TRUE);
EOF
```

---

### 2. service_master

**Purpose:** Services offered by entities

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| unique_service_id | VARCHAR(50) | PRIMARY KEY | Format: SVC-IMM-001, SVC-TAX-001 |
| service_name | VARCHAR(255) | NOT NULL, UNIQUE | Service name |
| entity_id | VARCHAR(50) | FK → entity_master, NOT NULL | Owning entity |
| category | VARCHAR(100) | | Immigration, Tax, Customs, etc. |
| description | TEXT | | Service description |
| service_type | VARCHAR(50) | DEFAULT 'public' | public, ea_only |
| sla_hours | INTEGER | DEFAULT 48 | SLA target in hours |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- PRIMARY KEY on `unique_service_id`
- UNIQUE INDEX on `service_name`
- INDEX on `entity_id` (FK)
- INDEX on `category`
- INDEX on `service_type`
- INDEX on `is_active`

**Sample Data:**
```sql
-- 14 services pre-loaded (7 public + 7 EA)
SVC-IMM-001 | Work Permit Application | Immigration
SVC-TAX-001 | Property Tax Payment | Tax & Revenue
SVC-CUS-001 | Customs Clearance | Customs
-- ... 11 more services
```

**Commands:**
```bash
# List all services with entity names
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT s.unique_service_id, s.service_name, s.category, s.service_type, e.entity_name
FROM service_master s
JOIN entity_master e ON s.entity_id = e.unique_entity_id
WHERE s.is_active = TRUE
ORDER BY s.category, s.service_name;
EOF

# List EA-only services
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT unique_service_id, service_name FROM service_master WHERE service_type = 'ea_only';"
```

---

### 3. priority_levels

**Purpose:** Priority definitions for tickets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| priority_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| priority_name | VARCHAR(50) | NOT NULL, UNIQUE | Urgent, High, Medium, Low |
| priority_order | INTEGER | NOT NULL, UNIQUE | Sort order (1-4) |
| response_time_hours | INTEGER | | Target response time |
| resolution_time_hours | INTEGER | | Target resolution time |
| description | TEXT | | Priority description |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- PRIMARY KEY on `priority_id`
- UNIQUE INDEX on `priority_name`
- UNIQUE INDEX on `priority_order`

**Pre-loaded Data:**
```sql
-- 4 priorities
Urgent  | Order: 1 | Response: 4h  | Resolution: 24h
High    | Order: 2 | Response: 8h  | Resolution: 48h
Medium  | Order: 3 | Response: 24h | Resolution: 120h
Low     | Order: 4 | Response: 48h | Resolution: 240h
```

---

### 4. ticket_status

**Purpose:** Ticket workflow states

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| status_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| status_name | VARCHAR(50) | NOT NULL, UNIQUE | New, In Progress, Resolved, etc. |
| status_order | INTEGER | NOT NULL | Workflow order |
| is_active_status | BOOLEAN | DEFAULT TRUE | Counts as open/active |
| is_final_status | BOOLEAN | DEFAULT FALSE | Terminal state |
| description | TEXT | | Status description |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- PRIMARY KEY on `status_id`
- UNIQUE INDEX on `status_name`
- INDEX on `is_active_status`

**Pre-loaded Data:**
```sql
-- 6 statuses
New                | Order: 1 | Active: TRUE  | Final: FALSE
Assigned           | Order: 2 | Active: TRUE  | Final: FALSE
In Progress        | Order: 3 | Active: TRUE  | Final: FALSE
Pending Customer   | Order: 4 | Active: TRUE  | Final: FALSE
Resolved           | Order: 5 | Active: FALSE | Final: TRUE
Closed             | Order: 6 | Active: FALSE | Final: TRUE
```

---

### 5. ticket_categories

**Purpose:** Ticket categorization

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| category_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| category_name | VARCHAR(100) | NOT NULL, UNIQUE | Category name |
| category_code | VARCHAR(20) | UNIQUE | Short code |
| description | TEXT | | Category description |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- PRIMARY KEY on `category_id`
- UNIQUE INDEX on `category_name`
- UNIQUE INDEX on `category_code`

**Pre-loaded Data:**
```sql
-- 5 categories
Technical Issue    | Code: TECH
Service Request    | Code: SERVICE
Feedback/Complaint | Code: FEEDBACK
Access/Permission  | Code: ACCESS
Other              | Code: OTHER
```

---

### 6. grievance_status

**Purpose:** Grievance workflow states

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| status_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| status_name | VARCHAR(50) | NOT NULL, UNIQUE | Submitted, Under Review, etc. |
| status_order | INTEGER | NOT NULL | Workflow order |
| is_active_status | BOOLEAN | DEFAULT TRUE | Counts as open |
| is_final_status | BOOLEAN | DEFAULT FALSE | Terminal state |
| description | TEXT | | Status description |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Pre-loaded Data:**
```sql
-- 5 statuses
Submitted       | Order: 1 | Active: TRUE  | Final: FALSE
Under Review    | Order: 2 | Active: TRUE  | Final: FALSE
In Progress     | Order: 3 | Active: TRUE  | Final: FALSE
Resolved        | Order: 4 | Active: FALSE | Final: TRUE
Closed          | Order: 5 | Active: FALSE | Final: TRUE
```

---

### 7. service_attachments

**Purpose:** Required document definitions for EA services

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| attachment_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| service_id | VARCHAR(50) | FK → service_master, NOT NULL | Associated service |
| attachment_name | VARCHAR(255) | NOT NULL | Document name |
| is_mandatory | BOOLEAN | DEFAULT TRUE | Required flag |
| description | TEXT | | Document description |
| file_format | VARCHAR(100) | | Accepted formats (PDF, JPEG) |
| max_file_size_mb | INTEGER | DEFAULT 5 | Size limit |
| display_order | INTEGER | | Display sequence |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- PRIMARY KEY on `attachment_id`
- INDEX on `service_id` (FK)
- INDEX on `is_mandatory`

**Pre-loaded Data:**
```sql
-- 27 document requirements for 7 EA services
-- Example for Work Permit (SVC-IMM-001):
Valid Passport Copy          | Mandatory | PDF/JPEG | 5MB
Job Offer Letter             | Mandatory | PDF      | 5MB
Police Clearance Certificate | Mandatory | PDF      | 5MB
Medical Certificate          | Optional  | PDF      | 5MB
```

**Commands:**
```bash
# List required documents for a service
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT sa.attachment_name, sa.is_mandatory, sa.file_format, sa.max_file_size_mb, s.service_name
FROM service_attachments sa
JOIN service_master s ON sa.service_id = s.unique_service_id
WHERE sa.service_id = 'SVC-IMM-001'
ORDER BY sa.display_order;
EOF
```

---

### 8. service_feedback

**Purpose:** Citizen feedback with 5-point rating system

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| service_id | VARCHAR(50) | FK → service_master, NOT NULL | Rated service |
| entity_id | VARCHAR(50) | FK → entity_master, NOT NULL | Service entity |
| rating | INTEGER | NOT NULL, CHECK (1-5) | Star rating |
| qr_code | VARCHAR(50) | FK → qr_codes | QR code used (if any) |
| channel | VARCHAR(50) | DEFAULT 'web' | web, qr, mobile, kiosk |
| recipient_group | VARCHAR(50) | NOT NULL | citizen, business, government, tourist, student, other |
| comments | TEXT | | Optional feedback text |
| contact_name | VARCHAR(255) | | Optional contact |
| contact_email | VARCHAR(255) | | Optional email |
| contact_phone | VARCHAR(50) | | Optional phone |
| ip_hash | VARCHAR(64) | | SHA256 hashed IP (privacy) |
| created_at | TIMESTAMP | DEFAULT NOW() | Submission time |
| is_grievance | BOOLEAN | DEFAULT FALSE | Auto-grievance flag |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `service_id` (FK)
- INDEX on `entity_id` (FK)
- INDEX on `qr_code` (FK)
- INDEX on `rating`
- INDEX on `channel`
- INDEX on `recipient_group`
- INDEX on `created_at DESC` (time-series)
- INDEX on `is_grievance`

**Triggers:**
- Auto-creates `grievance_tickets` when rating ≤ 2.5 (via application logic)
- Sends email notification to service admin
- Sends DTA alert if rating ≤ 2

**Commands:**
```bash
# View recent feedback
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    f.id,
    s.service_name,
    f.rating,
    f.channel,
    f.recipient_group,
    LEFT(f.comments, 50) AS comment_preview,
    f.created_at
FROM service_feedback f
JOIN service_master s ON f.service_id = s.unique_service_id
ORDER BY f.created_at DESC
LIMIT 10;
EOF

# Rating statistics
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    s.service_name,
    COUNT(*) AS total_feedback,
    AVG(f.rating)::NUMERIC(3,2) AS avg_rating,
    COUNT(CASE WHEN f.rating <= 2 THEN 1 END) AS low_ratings,
    COUNT(CASE WHEN f.is_grievance THEN 1 END) AS auto_grievances
FROM service_feedback f
JOIN service_master s ON f.service_id = s.unique_service_id
GROUP BY s.service_name
ORDER BY total_feedback DESC;
EOF
```

---

### 9. qr_codes

**Purpose:** QR code deployment tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| qr_code | VARCHAR(50) | PRIMARY KEY | Unique QR identifier |
| service_id | VARCHAR(50) | FK → service_master, NOT NULL | Linked service |
| entity_id | VARCHAR(50) | FK → entity_master, NOT NULL | Service entity |
| location | VARCHAR(255) | | Physical location |
| deployment_date | DATE | | Deployment date |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| scan_count | INTEGER | DEFAULT 0 | Total scans |
| last_scanned_at | TIMESTAMP | | Last scan time |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- PRIMARY KEY on `qr_code`
- INDEX on `service_id` (FK)
- INDEX on `entity_id` (FK)
- INDEX on `is_active`

**Sample Data:**
```sql
-- Example QR codes
QR-DTA-001 | Immigration Counter | Maurice Bishop Airport
QR-DTA-002 | Tax Office Front Desk | St. George's
```

**Commands:**
```bash
# QR code analytics
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    q.qr_code,
    s.service_name,
    q.location,
    q.scan_count,
    q.last_scanned_at,
    COUNT(f.id) AS feedback_count
FROM qr_codes q
JOIN service_master s ON q.service_id = s.unique_service_id
LEFT JOIN service_feedback f ON q.qr_code = f.qr_code
WHERE q.is_active = TRUE
GROUP BY q.qr_code, s.service_name, q.location, q.scan_count, q.last_scanned_at
ORDER BY q.scan_count DESC;
EOF
```

---

### 10. grievance_tickets

**Purpose:** Both auto-created and citizen-submitted grievances

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| grievance_number | VARCHAR(50) | UNIQUE, NOT NULL | Format: GRV-YYYYMMDD-XXXX |
| service_id | VARCHAR(50) | FK → service_master, NOT NULL | Service involved |
| entity_id | VARCHAR(50) | FK → entity_master, NOT NULL | Entity responsible |
| grievance_type | VARCHAR(50) | NOT NULL | service_complaint, auto_created_from_feedback |
| source_feedback_id | INTEGER | FK → service_feedback | Source feedback (if auto) |
| requester_category | VARCHAR(50) | NOT NULL | citizen, business, government, etc. |
| subject | VARCHAR(500) | NOT NULL | Grievance subject |
| description | TEXT | NOT NULL | Detailed description |
| contact_name | VARCHAR(255) | NOT NULL | Submitter name |
| contact_email | VARCHAR(255) | NOT NULL | Contact email |
| contact_phone | VARCHAR(50) | | Contact phone |
| status | INTEGER | FK → grievance_status, DEFAULT 1 | Current status |
| priority | INTEGER | FK → priority_levels | Priority level |
| assigned_to | VARCHAR(255) | | Assigned officer |
| ip_hash | VARCHAR(64) | | SHA256 hashed IP |
| created_at | TIMESTAMP | DEFAULT NOW() | Submission time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |
| resolved_at | TIMESTAMP | | Resolution time |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `grievance_number`
- INDEX on `service_id` (FK)
- INDEX on `entity_id` (FK)
- INDEX on `source_feedback_id` (FK)
- INDEX on `status` (FK)
- INDEX on `priority` (FK)
- INDEX on `grievance_type`
- INDEX on `requester_category`
- INDEX on `created_at DESC`

**Auto-Generation Logic:**
- Triggered when `service_feedback.rating ≤ 2.5`
- `grievance_type = 'auto_created_from_feedback'`
- `source_feedback_id` links to originating feedback
- Priority based on rating (≤2 = High, 2.5 = Medium)

**Commands:**
```bash
# View grievances
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    g.grievance_number,
    s.service_name,
    g.grievance_type,
    g.subject,
    gs.status_name,
    p.priority_name,
    g.created_at
FROM grievance_tickets g
JOIN service_master s ON g.service_id = s.unique_service_id
JOIN grievance_status gs ON g.status = gs.status_id
LEFT JOIN priority_levels p ON g.priority = p.priority_id
ORDER BY g.created_at DESC
LIMIT 10;
EOF

# Auto vs manual grievances
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    grievance_type,
    COUNT(*) AS count,
    COUNT(CASE WHEN status IN (SELECT status_id FROM grievance_status WHERE is_active_status = TRUE) THEN 1 END) AS open,
    COUNT(CASE WHEN status IN (SELECT status_id FROM grievance_status WHERE is_final_status = TRUE) THEN 1 END) AS closed
FROM grievance_tickets
GROUP BY grievance_type;
EOF
```

---

### 11. grievance_attachments

**Purpose:** File attachments for grievances

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| grievance_id | INTEGER | FK → grievance_tickets, NOT NULL, ON DELETE CASCADE | Parent grievance |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_type | VARCHAR(100) | NOT NULL | MIME type |
| file_size | INTEGER | NOT NULL, CHECK (≤5MB) | Size in bytes |
| file_data | BYTEA | NOT NULL | Binary file data |
| uploaded_at | TIMESTAMP | DEFAULT NOW() | Upload time |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `grievance_id` (FK)
- INDEX on `uploaded_at DESC`

**Constraints:**
- Maximum file size: 5MB (5,242,880 bytes)
- Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX, XLS, XLSX

**Commands:**
```bash
# List attachments (metadata only)
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    g.grievance_number,
    ga.file_name,
    ga.file_type,
    pg_size_pretty(ga.file_size::bigint) AS file_size,
    ga.uploaded_at
FROM grievance_attachments ga
JOIN grievance_tickets g ON ga.grievance_id = g.id
ORDER BY ga.uploaded_at DESC
LIMIT 10;
EOF

# Storage usage
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    COUNT(*) AS total_files,
    pg_size_pretty(SUM(file_size)::bigint) AS total_storage,
    AVG(file_size)::INTEGER AS avg_file_size_bytes,
    MAX(file_size) AS max_file_size_bytes
FROM grievance_attachments;
EOF
```

---

### 12. ea_service_requests

**Purpose:** EA service requests from admin portal

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| request_number | VARCHAR(50) | UNIQUE, NOT NULL | Format: EA-YYYYMMDD-XXXX |
| service_id | VARCHAR(50) | FK → service_master, NOT NULL | Requested service |
| entity_id | VARCHAR(50) | FK → entity_master, NOT NULL | Service entity |
| requester_name | VARCHAR(255) | NOT NULL | Requester name |
| requester_email | VARCHAR(255) | NOT NULL | Contact email |
| requester_phone | VARCHAR(50) | | Contact phone |
| requester_department | VARCHAR(255) | | Department name |
| priority | INTEGER | FK → priority_levels | Request priority |
| status | VARCHAR(50) | DEFAULT 'Draft' | Draft, Submitted, In Progress, Completed, Cancelled |
| description | TEXT | | Request description |
| notes | TEXT | | Internal notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |
| submitted_at | TIMESTAMP | | Submission time |
| completed_at | TIMESTAMP | | Completion time |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `request_number`
- INDEX on `service_id` (FK)
- INDEX on `entity_id` (FK)
- INDEX on `priority` (FK)
- INDEX on `status`
- INDEX on `created_at DESC`

**Workflow:**
1. Admin creates request in "Draft" status
2. Attaches required documents (based on `service_attachments`)
3. Submits request (status → "Submitted")
4. Workflow: Submitted → In Progress → Completed

**Commands:**
```bash
# View EA requests
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    ea.request_number,
    s.service_name,
    ea.requester_name,
    ea.requester_department,
    ea.status,
    p.priority_name,
    ea.created_at,
    COUNT(att.id) AS attachment_count
FROM ea_service_requests ea
JOIN service_master s ON ea.service_id = s.unique_service_id
LEFT JOIN priority_levels p ON ea.priority = p.priority_id
LEFT JOIN ea_service_request_attachments att ON ea.id = att.request_id
GROUP BY ea.id, s.service_name, p.priority_name
ORDER BY ea.created_at DESC
LIMIT 10;
EOF

# Status pipeline
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    status,
    COUNT(*) AS count,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) AS last_7_days
FROM ea_service_requests
GROUP BY status
ORDER BY status;
EOF
```

---

### 13. ea_service_request_attachments

**Purpose:** File attachments for EA service requests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| request_id | INTEGER | FK → ea_service_requests, NOT NULL, ON DELETE CASCADE | Parent request |
| attachment_definition_id | INTEGER | FK → service_attachments | Document type |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_type | VARCHAR(100) | NOT NULL | MIME type |
| file_size | INTEGER | NOT NULL, CHECK (≤5MB) | Size in bytes |
| file_data | BYTEA | NOT NULL | Binary file data |
| uploaded_at | TIMESTAMP | DEFAULT NOW() | Upload time |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `request_id` (FK)
- INDEX on `attachment_definition_id` (FK)
- INDEX on `uploaded_at DESC`

**Validation:**
- File size ≤ 5MB
- File type matches allowed formats from `service_attachments`
- Mandatory attachments enforced before submission

**Commands:**
```bash
# Check document completeness for a request
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    ea.request_number,
    s.service_name,
    sa.attachment_name,
    sa.is_mandatory,
    CASE
        WHEN att.id IS NOT NULL THEN 'Uploaded'
        WHEN sa.is_mandatory THEN 'MISSING (Required)'
        ELSE 'Not Uploaded (Optional)'
    END AS upload_status
FROM ea_service_requests ea
JOIN service_master s ON ea.service_id = s.unique_service_id
LEFT JOIN service_attachments sa ON s.unique_service_id = sa.service_id
LEFT JOIN ea_service_request_attachments att ON ea.id = att.request_id AND sa.attachment_id = att.attachment_definition_id
WHERE ea.request_number = 'EA-20251120-0001'
ORDER BY sa.display_order;
EOF
```

---

### 14. tickets

**Purpose:** Unified ticketing system (replacing osTicket)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ticket_number | VARCHAR(50) | UNIQUE, NOT NULL | Format: YYYYMM-XXXXXX |
| service_id | VARCHAR(50) | FK → service_master, NOT NULL | Service involved |
| entity_id | VARCHAR(50) | FK → entity_master, NOT NULL | Responsible entity |
| category_id | INTEGER | FK → ticket_categories | Ticket category |
| priority_id | INTEGER | FK → priority_levels | Priority level |
| status_id | INTEGER | FK → ticket_status, DEFAULT 1 | Current status |
| requester_category | VARCHAR(50) | NOT NULL | citizen, business, government, etc. |
| subject | VARCHAR(500) | NOT NULL | Ticket subject |
| description | TEXT | NOT NULL | Detailed description |
| contact_name | VARCHAR(255) | NOT NULL | Submitter name |
| contact_email | VARCHAR(255) | NOT NULL | Contact email |
| contact_phone | VARCHAR(50) | | Contact phone |
| ip_hash | VARCHAR(64) | | SHA256 hashed IP |
| sla_target | TIMESTAMP | | SLA deadline |
| source_type | VARCHAR(50) | | feedback, grievance, direct |
| source_id | INTEGER | | Source record ID |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |
| resolved_at | TIMESTAMP | | Resolution time |
| closed_at | TIMESTAMP | | Closure time |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `ticket_number`
- INDEX on `service_id` (FK)
- INDEX on `entity_id` (FK)
- INDEX on `category_id` (FK)
- INDEX on `priority_id` (FK)
- INDEX on `status_id` (FK)
- INDEX on `requester_category`
- INDEX on `source_type`
- INDEX on `created_at DESC`
- INDEX on `sla_target`

**SLA Calculation:**
- Based on `priority_id` → `priority_levels.resolution_time_hours`
- `sla_target = created_at + resolution_time_hours`

**Commands:**
```bash
# View tickets with SLA status
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    t.ticket_number,
    s.service_name,
    ts.status_name,
    p.priority_name,
    t.sla_target,
    CASE
        WHEN t.sla_target < NOW() AND ts.is_active_status THEN 'Overdue'
        WHEN ts.is_active_status THEN 'On Time'
        ELSE 'Closed'
    END AS sla_status,
    t.created_at
FROM tickets t
JOIN service_master s ON t.service_id = s.unique_service_id
JOIN ticket_status ts ON t.status_id = ts.status_id
LEFT JOIN priority_levels p ON t.priority_id = p.priority_id
ORDER BY t.created_at DESC
LIMIT 10;
EOF

# SLA compliance metrics
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    p.priority_name,
    COUNT(*) AS total_tickets,
    COUNT(CASE WHEN ts.is_final_status AND t.resolved_at <= t.sla_target THEN 1 END) AS met_sla,
    COUNT(CASE WHEN ts.is_final_status AND t.resolved_at > t.sla_target THEN 1 END) AS breached_sla,
    COUNT(CASE WHEN ts.is_active_status AND t.sla_target < NOW() THEN 1 END) AS currently_overdue
FROM tickets t
JOIN ticket_status ts ON t.status_id = ts.status_id
LEFT JOIN priority_levels p ON t.priority_id = p.priority_id
GROUP BY p.priority_name, p.priority_order
ORDER BY p.priority_order;
EOF
```

---

### 15. ticket_activity

**Purpose:** Activity log for ticket timeline and audit trail

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| activity_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ticket_id | INTEGER | FK → tickets(ticket_id), NOT NULL, ON DELETE CASCADE | Parent ticket |
| activity_type | VARCHAR(100) | NOT NULL | created, status_change, priority_change, internal_note |
| performed_by | VARCHAR(255) | | Username or 'system' |
| description | TEXT | | Human-readable activity description |
| created_at | TIMESTAMP | DEFAULT NOW() | Activity timestamp |

**Indexes:**
- PRIMARY KEY on `activity_id`
- INDEX on `ticket_id` (FK) - Fast lookup by ticket
- INDEX on `created_at DESC` - Time-series queries

**Activity Types:**
- `created` - Ticket was created
- `status_change` - Status was updated (e.g., "Status changed from New to In Progress")
- `priority_change` - Priority was modified
- `internal_note` - Admin comment (private, shown as "Resolution Comment" on resolved/closed tickets in public view)

**Privacy Controls:**
- **Public View** (citizens checking ticket status):
  - Open/In-Progress tickets: `internal_note` activities are excluded
  - Resolved/Closed tickets: Last `internal_note` is displayed as "Resolution Comment"
- **Admin View**: All activities visible including all internal notes

**Auto-Seeding:**
- When a ticket is created, a "created" activity is automatically logged
- Script `01-init-db.sh` seeds initial "Ticket created" activities for existing tickets

**Commands:**
```bash
# View activity timeline for a ticket
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    ta.activity_id,
    t.ticket_number,
    ta.activity_type,
    ta.performed_by,
    ta.description,
    ta.created_at
FROM ticket_activity ta
JOIN tickets t ON ta.ticket_id = t.ticket_id
WHERE t.ticket_number = '202511-000123'
ORDER BY ta.created_at DESC;
EOF

# Activity statistics by type
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    activity_type,
    COUNT(*) AS total_count,
    COUNT(DISTINCT ticket_id) AS tickets_affected,
    MAX(created_at) AS last_activity
FROM ticket_activity
GROUP BY activity_type
ORDER BY total_count DESC;
EOF

# Find tickets with recent activity
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    t.ticket_number,
    t.subject,
    ts.status_name,
    ta.activity_type,
    ta.description,
    ta.created_at
FROM ticket_activity ta
JOIN tickets t ON ta.ticket_id = t.ticket_id
JOIN ticket_status ts ON t.status_id = ts.status_id
WHERE ta.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ta.created_at DESC
LIMIT 20;
EOF
```

---

### 16. ticket_attachments

**Purpose:** File attachments for tickets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| attachment_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ticket_id | INTEGER | FK → tickets(ticket_id), NOT NULL, ON DELETE CASCADE | Parent ticket |
| filename | VARCHAR(255) | NOT NULL | Original filename |
| mimetype | VARCHAR(100) | NOT NULL | MIME type (application/pdf, image/jpeg, etc.) |
| file_content | BYTEA | NOT NULL | Binary file data |
| file_size | INTEGER | NOT NULL, CHECK (>0 AND ≤5MB) | Size in bytes |
| uploaded_by | VARCHAR(255) | DEFAULT 'system' | Uploader username |
| created_at | TIMESTAMP | DEFAULT NOW() | Upload timestamp |

**Indexes:**
- PRIMARY KEY on `attachment_id`
- INDEX on `ticket_id` (FK)
- INDEX on `created_at DESC`

**Constraints:**
- Maximum file size: 5MB (5,242,880 bytes)
- Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX, XLS, XLSX

**File Size Validation:**
```sql
CONSTRAINT check_ticket_file_size CHECK (file_size > 0 AND file_size <= 5242880)
```

**Commands:**
```bash
# List attachments for a ticket (metadata only)
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    t.ticket_number,
    ta.filename,
    ta.mimetype,
    pg_size_pretty(ta.file_size::bigint) AS file_size,
    ta.uploaded_by,
    ta.created_at
FROM ticket_attachments ta
JOIN tickets t ON ta.ticket_id = t.ticket_id
WHERE t.ticket_number = '202511-000123'
ORDER BY ta.created_at;
EOF

# Storage usage by ticket attachments
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    COUNT(*) AS total_files,
    pg_size_pretty(SUM(file_size)::bigint) AS total_storage,
    pg_size_pretty(AVG(file_size)::bigint) AS avg_file_size,
    pg_size_pretty(MAX(file_size)::bigint) AS max_file_size
FROM ticket_attachments;
EOF

# Find tickets with attachments
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    t.ticket_number,
    t.subject,
    COUNT(ta.attachment_id) AS attachment_count,
    pg_size_pretty(SUM(ta.file_size)::bigint) AS total_size
FROM tickets t
JOIN ticket_attachments ta ON t.ticket_id = ta.ticket_id
GROUP BY t.ticket_id, t.ticket_number, t.subject
ORDER BY COUNT(ta.attachment_id) DESC;
EOF
```

---

### 17. sla_breaches

**Purpose:** SLA breach tracking for tickets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| breach_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ticket_id | INTEGER | FK → tickets(ticket_id), NOT NULL | Parent ticket |
| breach_type | VARCHAR(20) | | response, resolution |
| target_time | TIMESTAMP | NOT NULL | SLA target deadline |
| actual_time | TIMESTAMP | | When action was actually completed |
| breach_duration_hours | NUMERIC(10,2) | | Hours overdue (target - actual) |
| is_active | BOOLEAN | DEFAULT TRUE | Currently breaching (for open tickets) |
| detected_at | TIMESTAMP | DEFAULT NOW() | When breach was detected |

**Indexes:**
- PRIMARY KEY on `breach_id`
- INDEX on `ticket_id` (FK)
- INDEX on `breach_type`
- INDEX on `is_active`

**Breach Types:**
- `response` - Failed to respond within SLA response time
- `resolution` - Failed to resolve within SLA resolution time

**Commands:**
```bash
# View active SLA breaches
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    t.ticket_number,
    s.service_name,
    sb.breach_type,
    sb.target_time,
    sb.breach_duration_hours,
    p.priority_name
FROM sla_breaches sb
JOIN tickets t ON sb.ticket_id = t.ticket_id
JOIN service_master s ON t.service_id = s.unique_service_id
LEFT JOIN priority_levels p ON t.priority_id = p.priority_id
WHERE sb.is_active = TRUE
ORDER BY sb.breach_duration_hours DESC;
EOF

# SLA breach statistics by priority
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    p.priority_name,
    sb.breach_type,
    COUNT(*) AS total_breaches,
    AVG(sb.breach_duration_hours)::NUMERIC(10,2) AS avg_breach_hours,
    MAX(sb.breach_duration_hours)::NUMERIC(10,2) AS max_breach_hours
FROM sla_breaches sb
JOIN tickets t ON sb.ticket_id = t.ticket_id
LEFT JOIN priority_levels p ON t.priority_id = p.priority_id
GROUP BY p.priority_name, sb.breach_type
ORDER BY p.priority_name, sb.breach_type;
EOF
```

---

### 18. ticket_notes

**Purpose:** Internal notes for tickets (staff-only, private comments)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| note_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ticket_id | INTEGER | FK → tickets(ticket_id), NOT NULL, ON DELETE CASCADE | Parent ticket |
| note_text | TEXT | NOT NULL | Note content |
| is_public | BOOLEAN | DEFAULT FALSE | Visible to ticket submitter |
| created_by | VARCHAR(255) | DEFAULT 'system' | Staff username |
| created_at | TIMESTAMP | DEFAULT NOW() | Note timestamp |

**Indexes:**
- PRIMARY KEY on `note_id`
- INDEX on `ticket_id` (FK)
- INDEX on `created_at DESC`
- INDEX on `created_by`

**Key Features:**
- `is_public = FALSE` - Internal staff notes (default)
- `is_public = TRUE` - Visible to citizen checking ticket status
- Used for collaboration between staff members
- Audit trail of ticket discussions

**Commands:**
```bash
# View notes for a ticket
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    t.ticket_number,
    tn.note_text,
    tn.is_public,
    tn.created_by,
    tn.created_at
FROM ticket_notes tn
JOIN tickets t ON tn.ticket_id = t.ticket_id
WHERE t.ticket_number = '202511-000123'
ORDER BY tn.created_at DESC;
EOF

# Add internal note
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
INSERT INTO ticket_notes (ticket_id, note_text, is_public, created_by)
VALUES (
    (SELECT ticket_id FROM tickets WHERE ticket_number = '202511-000123'),
    'Escalated to senior staff for review',
    FALSE,
    'admin@gov.gd'
);
EOF
```

---

### 19. submission_rate_limit

**Purpose:** Rate limiting enforcement

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| ip_hash | VARCHAR(64) | PRIMARY KEY | SHA256 hashed IP |
| submission_type | VARCHAR(50) | NOT NULL | feedback, grievance, ticket |
| submission_count | INTEGER | DEFAULT 0 | Count in window |
| window_start | TIMESTAMP | DEFAULT NOW() | Window start time |
| last_submission | TIMESTAMP | DEFAULT NOW() | Last submission |

**Rate Limits (Configurable):**
- Feedback: 5 submissions per hour
- Grievance: 3 submissions per hour
- Ticket: 5 submissions per hour

---

### 20. submission_attempts

**Purpose:** Audit trail for all submissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| ip_hash | VARCHAR(64) | NOT NULL | SHA256 hashed IP |
| submission_type | VARCHAR(50) | NOT NULL | feedback, grievance, ticket |
| success | BOOLEAN | NOT NULL | Submission success |
| failure_reason | TEXT | | Error message if failed |
| created_at | TIMESTAMP | DEFAULT NOW() | Attempt time |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `ip_hash`
- INDEX on `submission_type`
- INDEX on `created_at DESC`

---

### 21. captcha_challenges

**Purpose:** CAPTCHA verification tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| challenge_token | VARCHAR(255) | UNIQUE, NOT NULL | CAPTCHA token |
| ip_hash | VARCHAR(64) | NOT NULL | SHA256 hashed IP |
| verified | BOOLEAN | DEFAULT FALSE | Verification status |
| created_at | TIMESTAMP | DEFAULT NOW() | Challenge time |
| verified_at | TIMESTAMP | | Verification time |

**CAPTCHA Trigger Logic:**
- Triggered after 3 failed submissions
- Or when rate limit is approaching (80% of limit)

---

## Authentication & User Management Tables

### 22. users

**Purpose:** Central authentication and user management table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email (OAuth) |
| name | VARCHAR(255) | | Display name |
| image | TEXT | | Profile picture URL (from OAuth) |
| email_verified | TIMESTAMP | | Email verification timestamp |
| role_id | INTEGER | FK → user_roles | User role |
| entity_id | VARCHAR(50) | FK → entity_master | Assigned entity (for staff) |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| last_login | TIMESTAMP | | Last sign-in timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`
- INDEX on `role_id` (FK)
- INDEX on `entity_id` (FK)
- INDEX on `is_active`

**Key Features:**
- Email must match OAuth account for sign-in
- `is_active = FALSE` immediately revokes access
- Staff users must have `entity_id` assigned

**Commands:**
```bash
# List all users
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT u.email, u.name, r.role_name, u.entity_id, u.is_active, u.last_login
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
ORDER BY u.created_at DESC;
EOF

# Add user
ADMIN_EMAIL="user@gov.gd" ADMIN_NAME="User Name" ./database/05-add-initial-admin.sh

# Activate/deactivate user
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE users SET is_active=TRUE WHERE email='user@gov.gd';"
```

---

### 23. user_roles

**Purpose:** Role definitions for access control

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| role_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| role_code | VARCHAR(50) | UNIQUE, NOT NULL | Code identifier |
| role_name | VARCHAR(100) | NOT NULL | Display name |
| role_type | VARCHAR(20) | NOT NULL | admin, staff, public |
| description | TEXT | | Role description |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Pre-loaded Roles:**
```
1 | admin_dta  | DTA Administrator  | admin  | Full system access
2 | staff_mda  | MDA Staff Officer  | staff  | Entity-specific access
3 | public_user| Public User        | public | Limited access (future)
```

---

### 24. accounts

**Purpose:** OAuth provider data (NextAuth managed)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Account ID |
| user_id | UUID | FK → users(id), ON DELETE CASCADE | User reference |
| type | VARCHAR(255) | NOT NULL | oauth |
| provider | VARCHAR(255) | NOT NULL | google, azure-ad |
| provider_account_id | TEXT | NOT NULL | OAuth provider user ID |
| refresh_token | TEXT | | OAuth refresh token |
| access_token | TEXT | | OAuth access token |
| expires_at | INTEGER | | Token expiration |
| token_type | VARCHAR(255) | | Bearer |
| scope | TEXT | | OAuth scopes |
| id_token | TEXT | | ID token |
| session_state | TEXT | | Session state |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `(provider, provider_account_id)`
- INDEX on `user_id` (FK)

---

### 25. sessions

**Purpose:** Active user sessions (NextAuth managed)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Session ID |
| session_token | VARCHAR(255) | UNIQUE, NOT NULL | Session token |
| user_id | UUID | FK → users(id), ON DELETE CASCADE | User reference |
| expires | TIMESTAMP | NOT NULL | Session expiration |

**Session Timeout:** 2 hours (configurable in NextAuth)

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `session_token`
- INDEX on `user_id` (FK)

---

### 26. verification_tokens

**Purpose:** Email verification tokens (NextAuth)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| identifier | VARCHAR(255) | NOT NULL | Email address |
| token | VARCHAR(255) | UNIQUE, NOT NULL | Verification token |
| expires | TIMESTAMP | NOT NULL | Token expiration |

**Primary Key:** Composite `(identifier, token)`

---

### 27. entity_user_assignments

**Purpose:** Many-to-many user-entity mapping (future use)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| assignment_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| user_id | UUID | FK → users(id), NOT NULL | User reference |
| entity_id | VARCHAR(50) | FK → entity_master, NOT NULL | Entity reference |
| assigned_at | TIMESTAMP | DEFAULT NOW() | Assignment date |
| assigned_by | VARCHAR(255) | | Admin who assigned |

**Future Use:** Allows users to access multiple entities

---

### 28. user_permissions

**Purpose:** Fine-grained permissions (future use)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| permission_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| user_id | UUID | FK → users(id), NOT NULL | User reference |
| permission_code | VARCHAR(100) | NOT NULL | Permission identifier |
| resource_type | VARCHAR(50) | | tickets, analytics, etc. |
| granted_at | TIMESTAMP | DEFAULT NOW() | Grant date |

**Future Use:** Granular access control beyond roles

---

### 29. user_audit_log

**Purpose:** User activity audit trail

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| log_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| user_id | UUID | FK → users(id) | User reference |
| action | VARCHAR(100) | NOT NULL | login, logout, user_created, user_updated |
| details | JSONB | | Action details (JSON) |
| ip_address | INET | | User IP address |
| user_agent | TEXT | | Browser/client info |
| created_at | TIMESTAMP | DEFAULT NOW() | Action timestamp |

**Indexes:**
- PRIMARY KEY on `log_id`
- INDEX on `user_id` (FK)
- INDEX on `action`
- INDEX on `created_at DESC`

**Common Actions:**
- `login` - User signed in via OAuth
- `logout` - User signed out
- `user_created` - New user added by admin
- `user_updated` - User details changed
- `user_deactivated` - User access revoked

**Commands:**
```bash
# View recent sign-ins
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT u.email, al.action, al.created_at, al.ip_address
FROM user_audit_log al
JOIN users u ON al.user_id = u.id
WHERE al.action = 'login'
ORDER BY al.created_at DESC
LIMIT 10;
EOF

# Count actions by user
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT u.email, COUNT(*) as activity_count, MAX(al.created_at) as last_activity
FROM user_audit_log al
JOIN users u ON al.user_id = u.id
GROUP BY u.email
ORDER BY activity_count DESC;
EOF
```

---

## Relationships & Foreign Keys

### Entity-Service Hierarchy
```
entity_master (parent_entity_id) → entity_master (unique_entity_id)
service_master (entity_id) → entity_master (unique_entity_id)
```

### Service Feedback Flow
```
service_feedback (service_id) → service_master (unique_service_id)
service_feedback (entity_id) → entity_master (unique_entity_id)
service_feedback (qr_code) → qr_codes (qr_code)
```

### Grievance Flow
```
grievance_tickets (service_id) → service_master (unique_service_id)
grievance_tickets (entity_id) → entity_master (unique_entity_id)
grievance_tickets (source_feedback_id) → service_feedback (id)
grievance_tickets (status) → grievance_status (status_id)
grievance_tickets (priority) → priority_levels (priority_id)
grievance_attachments (grievance_id) → grievance_tickets (id) [ON DELETE CASCADE]
```

### EA Service Request Flow
```
ea_service_requests (service_id) → service_master (unique_service_id)
ea_service_requests (entity_id) → entity_master (unique_entity_id)
ea_service_requests (priority) → priority_levels (priority_id)
ea_service_request_attachments (request_id) → ea_service_requests (id) [ON DELETE CASCADE]
ea_service_request_attachments (attachment_definition_id) → service_attachments (attachment_id)
```

### Ticket Flow
```
tickets (service_id) → service_master (unique_service_id)
tickets (entity_id) → entity_master (unique_entity_id)
tickets (category_id) → ticket_categories (category_id)
tickets (priority_id) → priority_levels (priority_id)
tickets (status_id) → ticket_status (status_id)
ticket_activity (ticket_id) → tickets (ticket_id) [ON DELETE CASCADE]
ticket_attachments (ticket_id) → tickets (ticket_id) [ON DELETE CASCADE]
ticket_notes (ticket_id) → tickets (ticket_id) [ON DELETE CASCADE]
sla_breaches (ticket_id) → tickets (ticket_id)
```

### Authentication Flow
```
users (role_id) → user_roles (role_id)
users (entity_id) → entity_master (unique_entity_id)
accounts (user_id) → users (id) [ON DELETE CASCADE]
sessions (user_id) → users (id) [ON DELETE CASCADE]
entity_user_assignments (user_id) → users (id)
entity_user_assignments (entity_id) → entity_master (unique_entity_id)
user_permissions (user_id) → users (id)
user_audit_log (user_id) → users (id)
```

### Foreign Key Commands

**List all foreign keys:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
ORDER BY tc.table_name;
EOF
```

---

## Indexes

### Index Naming Convention
```
idx_<table>_<column(s)>
pk_<table>  (Primary Key)
uk_<table>_<column>  (Unique Key)
```

### Index Categories

**1. Primary Key Indexes (Auto-created)**
- All tables have PK indexes on ID columns

**2. Foreign Key Indexes**
```sql
-- Performance for JOIN operations
CREATE INDEX idx_service_master_entity_id ON service_master(entity_id);
CREATE INDEX idx_service_feedback_service_id ON service_feedback(service_id);
CREATE INDEX idx_grievance_tickets_service_id ON grievance_tickets(service_id);
-- ... (15+ FK indexes)
```

**3. Time-Series Indexes**
```sql
-- Efficient date range queries
CREATE INDEX idx_service_feedback_created_at ON service_feedback(created_at DESC);
CREATE INDEX idx_grievance_tickets_created_at ON grievance_tickets(created_at DESC);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
```

**4. Filter/Search Indexes**
```sql
-- Common WHERE clause columns
CREATE INDEX idx_service_master_is_active ON service_master(is_active);
CREATE INDEX idx_service_feedback_rating ON service_feedback(rating);
CREATE INDEX idx_tickets_status_id ON tickets(status_id);
```

**5. Composite Indexes (Future Optimization)**
```sql
-- Example: Frequently queried together
CREATE INDEX idx_tickets_status_priority ON tickets(status_id, priority_id);
CREATE INDEX idx_service_feedback_service_rating ON service_feedback(service_id, rating);
```

### Index Maintenance Commands

**View index usage:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
EOF
```

**Identify unused indexes:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
EOF
```

**Rebuild bloated indexes:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
REINDEX TABLE service_feedback;
REINDEX TABLE grievance_tickets;
REINDEX TABLE tickets;
EOF
```

---

## Views

### No views currently implemented

**Recommended views for future implementation:**

**1. Active Tickets Overview**
```sql
CREATE OR REPLACE VIEW v_active_tickets AS
SELECT
    t.ticket_number,
    s.service_name,
    e.entity_name,
    ts.status_name,
    p.priority_name,
    t.subject,
    t.created_at,
    t.sla_target,
    CASE
        WHEN t.sla_target < NOW() THEN 'Overdue'
        ELSE 'On Time'
    END AS sla_status
FROM tickets t
JOIN service_master s ON t.service_id = s.unique_service_id
JOIN entity_master e ON t.entity_id = e.unique_entity_id
JOIN ticket_status ts ON t.status_id = ts.status_id
LEFT JOIN priority_levels p ON t.priority_id = p.priority_id
WHERE ts.is_active_status = TRUE;
```

**2. Service Performance Dashboard**
```sql
CREATE OR REPLACE VIEW v_service_performance AS
SELECT
    s.unique_service_id,
    s.service_name,
    e.entity_name,
    COUNT(DISTINCT f.id) AS total_feedback,
    AVG(f.rating)::NUMERIC(3,2) AS avg_rating,
    COUNT(DISTINCT g.id) AS total_grievances,
    COUNT(DISTINCT t.id) AS total_tickets
FROM service_master s
JOIN entity_master e ON s.entity_id = e.unique_entity_id
LEFT JOIN service_feedback f ON s.unique_service_id = f.service_id
LEFT JOIN grievance_tickets g ON s.unique_service_id = g.service_id
LEFT JOIN tickets t ON s.unique_service_id = t.service_id
WHERE s.is_active = TRUE
GROUP BY s.unique_service_id, s.service_name, e.entity_name;
```

**3. EA Request Status Pipeline**
```sql
CREATE OR REPLACE VIEW v_ea_request_pipeline AS
SELECT
    ea.request_number,
    s.service_name,
    ea.requester_department,
    ea.status,
    p.priority_name,
    COUNT(att.id) AS attachment_count,
    (SELECT COUNT(*) FROM service_attachments WHERE service_id = ea.service_id AND is_mandatory = TRUE) AS required_attachments,
    ea.created_at,
    ea.submitted_at
FROM ea_service_requests ea
JOIN service_master s ON ea.service_id = s.unique_service_id
LEFT JOIN priority_levels p ON ea.priority = p.priority_id
LEFT JOIN ea_service_request_attachments att ON ea.id = att.request_id
GROUP BY ea.id, s.service_name, p.priority_name;
```

---

## Triggers

### No triggers currently implemented

**Recommended triggers for future implementation:**

**1. Auto-update timestamps**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at column
CREATE TRIGGER trg_entity_master_updated_at
BEFORE UPDATE ON entity_master
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_service_master_updated_at
BEFORE UPDATE ON service_master
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ... repeat for other tables
```

**2. Auto-set resolved_at when status changes**
```sql
CREATE OR REPLACE FUNCTION set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_id != OLD.status_id THEN
        IF (SELECT is_final_status FROM ticket_status WHERE status_id = NEW.status_id) THEN
            NEW.resolved_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_resolved_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION set_resolved_at();
```

**3. Audit log trigger (future)**
```sql
-- Create audit table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to critical tables
CREATE TRIGGER trg_tickets_audit
AFTER UPDATE OR DELETE ON tickets
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## Data Management

### Reference Data Management

**Add new entity:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
INSERT INTO entity_master (
    unique_entity_id,
    entity_name,
    entity_type,
    parent_entity_id,
    contact_email,
    is_active
) VALUES (
    'DEPT-003',
    'Department of Customs',
    'department',
    'MIN-001',
    'customs@gov.gd',
    TRUE
);
EOF
```

**Add new service:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
INSERT INTO service_master (
    unique_service_id,
    service_name,
    entity_id,
    category,
    description,
    service_type,
    sla_hours,
    is_active
) VALUES (
    'SVC-CUS-002',
    'Import Duty Calculation',
    'DEPT-003',
    'Customs',
    'Calculate import duties for goods',
    'public',
    24,
    TRUE
);
EOF
```

**Deactivate service (soft delete):**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
UPDATE service_master SET is_active = FALSE WHERE unique_service_id = 'SVC-OLD-001';
EOF
```

### Data Cleanup

**Archive old closed tickets (example: older than 1 year):**
```bash
# Create archive table (one-time)
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
CREATE TABLE IF NOT EXISTS tickets_archive (LIKE tickets INCLUDING ALL);
EOF

# Archive tickets
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
WITH archived AS (
    DELETE FROM tickets
    WHERE status_id IN (SELECT status_id FROM ticket_status WHERE is_final_status = TRUE)
    AND closed_at < NOW() - INTERVAL '1 year'
    RETURNING *
)
INSERT INTO tickets_archive SELECT * FROM archived;
EOF
```

**Delete old submission attempts (older than 90 days):**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
DELETE FROM submission_attempts WHERE created_at < NOW() - INTERVAL '90 days';
EOF
```

**Delete expired CAPTCHA challenges:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
DELETE FROM captcha_challenges WHERE created_at < NOW() - INTERVAL '1 hour' AND verified = FALSE;
EOF
```

### Database Health Checks

**Table sizes:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
```

**Connection statistics:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    datname AS database,
    numbackends AS active_connections,
    xact_commit AS transactions_committed,
    xact_rollback AS transactions_rolled_back,
    blks_read AS disk_blocks_read,
    blks_hit AS cache_blocks_hit,
    tup_returned AS rows_returned,
    tup_fetched AS rows_fetched,
    tup_inserted AS rows_inserted,
    tup_updated AS rows_updated,
    tup_deleted AS rows_deleted
FROM pg_stat_database
WHERE datname = 'feedback';
EOF
```

**Vacuum and analyze (routine maintenance):**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
VACUUM ANALYZE service_feedback;
VACUUM ANALYZE grievance_tickets;
VACUUM ANALYZE tickets;
VACUUM ANALYZE ea_service_requests;
EOF
```

---

## Quick Command Reference

### Daily Operations

```bash
# Connect to database
docker exec -it feedback_db psql -U feedback_user -d feedback

# View all tables
docker exec -it feedback_db psql -U feedback_user -d feedback -c "\dt"

# Count records in all tables
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    'service_feedback' AS table_name, COUNT(*) FROM service_feedback
UNION ALL SELECT 'grievance_tickets', COUNT(*) FROM grievance_tickets
UNION ALL SELECT 'tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'ticket_activity', COUNT(*) FROM ticket_activity
UNION ALL SELECT 'ticket_attachments', COUNT(*) FROM ticket_attachments
UNION ALL SELECT 'ea_service_requests', COUNT(*) FROM ea_service_requests;
EOF

# Export data to CSV
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
COPY (SELECT * FROM service_feedback ORDER BY created_at DESC LIMIT 100)
TO '/tmp/feedback_export.csv' WITH CSV HEADER;
EOF

# Backup database
docker exec feedback_db pg_dump -U feedback_user feedback > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i feedback_db psql -U feedback_user feedback < backup_20251120.sql
```

---

## Appendix

### PostgreSQL Extensions Used

**1. uuid-ossp**
- Provides UUID generation functions
- Used for generating unique user identifiers in authentication system
- Required for `users.id` UUID field with `DEFAULT gen_random_uuid()`

**Note:** Previously used extensions (pgcrypto, pg_trgm) have been removed in favor of application-level implementations:
- IP hashing now done in application layer (SHA256)
- Text search using PostgreSQL's built-in full-text search capabilities

### Character Encoding

- Database encoding: UTF-8
- Collation: en_US.UTF-8
- Supports international characters in names, descriptions

### Time Zones

- All timestamps stored in UTC
- Application layer handles timezone conversion
- Grenada timezone: Atlantic/Grenada (AST, UTC-4)

---

## See Also

### Related Documentation

- **[API Reference](API_REFERENCE.md)** - All API endpoints with examples
- **[Authentication Guide](AUTHENTICATION.md)** - Complete OAuth setup, user management, and quick commands
- **[Complete Documentation Index](index.md)** - Overview of all documentation

### Database Management

- **Backup Strategy:** Regular `pg_dump` backups recommended (see Backup & Restore section)
- **Monitoring:** Track table sizes, index usage, and connection statistics
- **Maintenance:** Run `VACUUM ANALYZE` regularly on high-traffic tables

### External Resources

- **[PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)** - Official PostgreSQL docs
- **[PostgreSQL 16 Release Notes](https://www.postgresql.org/docs/16/release-16.html)** - What's new in PG16
- **[PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)** - Optimization guide
- **[pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)** - Query performance analysis

---

## New Tables (January 2026)

### 30. backup_audit_log

**Purpose:** Audit trail for all database backup and restore operations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| audit_id | SERIAL | PRIMARY KEY | Auto-increment ID |
| action | VARCHAR(20) | NOT NULL, CHECK | create, download, restore, delete, scheduled |
| filename | VARCHAR(255) | NOT NULL | Backup filename |
| performed_by | VARCHAR(255) | NOT NULL | User email or 'system' |
| ip_address | VARCHAR(45) | | Client IP address |
| user_agent | TEXT | | Browser/client info |
| details | JSONB | | Additional action details |
| safety_backup_filename | VARCHAR(255) | | Safety backup created before restore |
| tables_restored | INTEGER | | Number of tables restored |
| rows_restored | INTEGER | | Number of rows restored |
| file_size | BIGINT | | Backup file size in bytes |
| duration_ms | INTEGER | | Operation duration in milliseconds |
| status | VARCHAR(20) | DEFAULT 'success' | success, failed, in_progress |
| error_message | TEXT | | Error details if failed |
| created_at | TIMESTAMP | DEFAULT NOW() | Action timestamp |

**Indexes:**
- PRIMARY KEY on `audit_id`
- INDEX on `action`
- INDEX on `performed_by`
- INDEX on `created_at DESC`

**Action Types:**
- `create` - Manual backup created
- `scheduled` - Automatic scheduled backup
- `download` - Backup file downloaded
- `restore` - Database restored from backup
- `delete` - Backup file deleted

**Commands:**
```bash
# View recent backup operations
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT action, filename, performed_by, status, duration_ms, created_at
FROM backup_audit_log
ORDER BY created_at DESC
LIMIT 20;
EOF

# Check restore history
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT filename, performed_by, tables_restored, duration_ms, status, created_at
FROM backup_audit_log
WHERE action = 'restore'
ORDER BY created_at DESC;
EOF
```

---

**Document Version:** 10.3
**Last Updated:** January 16, 2026
**Schema Version:** Production-Aligned v10.1 (31 tables)
**Maintained By:** GEA Portal Development Team
