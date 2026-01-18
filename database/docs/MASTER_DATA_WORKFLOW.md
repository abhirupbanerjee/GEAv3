# GEA Portal v3 - Master Data Management Workflow

**Version:** 1.0
**Date:** November 25, 2025
**Purpose:** Complete workflow for managing master data and generating synthetic test data

---

## Overview

This workflow provides a complete solution for:
1. **Cleaning** master data files (remove blank lines, standardize formats)
2. **Clearing** existing database data (master + transactional)
3. **Loading** cleaned master data into the database
4. **Generating** realistic synthetic transactional data
5. **Verifying** data integrity and quality

---

## Master Data Files

### Source Files (Raw Data)
Located in: `database/master-data/`

| File | Records | Description |
|------|---------|-------------|
| `entity-master.txt` | 66 entities | Government ministries, departments, agencies |
| `service-master.txt` | 167 services | Government services across all entities |
| `service-attachments.txt` | 177 attachments | Required documents for services |

### Cleaned Files (Production Ready)
Located in: `database/master-data/cleaned/`

**Cleaning applied:**
- ✓ Removed all blank lines
- ✓ Standardized booleans to uppercase `TRUE`/`FALSE`
- ✓ Preserved CSV headers
- ✓ No data modifications (only formatting)

| File | Records | Status |
|------|---------|--------|
| `entity-master.txt` | 66 entities | ✓ Clean |
| `service-master.txt` | 167 services | ✓ Clean |
| `service-attachments.txt` | 177 attachments | ✓ Clean |

---

## Database Schema Alignment

### Entity Master Schema
```sql
entity_master (
    unique_entity_id VARCHAR(50) PRIMARY KEY,  -- e.g., MIN-001, DEP-009, AGY-002
    entity_name VARCHAR(255) NOT NULL UNIQUE,
    entity_type VARCHAR(50) NOT NULL,          -- ministry, department, agency
    parent_entity_id VARCHAR(50),              -- FK to entity_master (nullable)
    contact_email VARCHAR(100),                -- Nullable ✓
    contact_phone VARCHAR(20),                 -- Nullable ✓
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

**CSV Format:** `unique_entity_id,entity_name,entity_type,parent_entity_id,contact_email,contact_phone,is_active`

### Service Master Schema
```sql
service_master (
    service_id VARCHAR(50) PRIMARY KEY,        -- e.g., SVC-IMM-001, SVC-TAX-001
    service_name VARCHAR(255) NOT NULL UNIQUE,
    entity_id VARCHAR(50) NOT NULL,            -- FK to entity_master
    service_category VARCHAR(100),             -- Nullable ✓
    service_description TEXT,                  -- Nullable ✓
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

**CSV Format:** `service_id,service_name,entity_id,service_category,service_description,is_active`

**Categories (33 unique):**
- `immigration_passports_and_travel`
- `taxation_duties_and_revenue`
- `health_services_and_clinics`
- `education_exams_and_assessment`
- `social_protection_and_family_support`
- `enterprise_architecture_services`
- *(see verification script for full list)*

### Service Attachments Schema
```sql
service_attachments (
    service_attachment_id SERIAL PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL,           -- FK to service_master
    filename VARCHAR(255) NOT NULL,
    file_extension VARCHAR(50),                -- Nullable, supports comma-separated
    is_mandatory BOOLEAN DEFAULT FALSE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    UNIQUE(service_id, filename)
)
```

**CSV Format:** `service_id,filename,file_extension,is_mandatory,description,sort_order,is_active`

**Note:** 9 services have NO attachments (intentional - payment/online-only services):
- SVC-CUS-003, SVC-ELC-002, SVC-SOC-002, SVC-SOC-003
- SVC-TAX-002, SVC-TAX-003, SVC-TAX-006, SVC-TAX-007, SVC-WAT-002

---

## Complete Workflow

### Step 1: Clear All Data
**Script:** `10-clear-all-data.sh`

**What it does:**
- Clears ALL transactional data (feedback, grievances, tickets, EA requests)
- Clears ALL master data (entities, services, attachments)
- Resets all sequences to 1
- **Preserves:** Authentication tables (users, sessions, roles)
- **Preserves:** Reference tables (priority_levels, ticket_status, etc.)

**Safety features:**
- Shows current data counts before clearing
- Requires interactive confirmation ("yes" to proceed)
- Cannot be run accidentally

**Usage:**
```bash
./database/10-clear-all-data.sh
```

**Expected output:**
```
Current data counts → User confirms → Data cleared → Sequences reset → Verification
```

---

### Step 2: Load Master Data
**Script:** `11-load-master-data.sh`

**What it does:**
- Loads 66 entities from `cleaned/entity-master.txt`
- Loads 167 services from `cleaned/service-master.txt`
- Loads 177 service attachments from `cleaned/service-attachments.txt`
- Validates foreign key integrity
- Reports loading statistics

**Features:**
- Uses PostgreSQL `\COPY` command (fast bulk loading)
- Temporary staging tables for type conversion
- `ON CONFLICT DO NOTHING` (idempotent, won't create duplicates)
- Converts empty strings to NULL for nullable fields
- Boolean string conversion (`'TRUE'` → `TRUE`)

**Usage:**
```bash
./database/11-load-master-data.sh
```

**Expected results:**
- ✓ 66 entities loaded
- ✓ 167 services loaded
- ✓ 177 service attachments loaded
- ✓ 0 orphaned records
- ✓ Foreign key integrity validated

---

### Step 3: Generate Synthetic Data
**Script:** `12-generate-synthetic-data.sh`

**What it generates:**
- **200 Service Feedback records**
  - Distributed across all 167 services
  - Rating distribution: 60% positive (4-5 stars), 25% neutral (3 stars), 15% negative (1-2 stars)
  - Channels: 60% web, 20% QR, 15% mobile, 5% kiosk
  - Recipient groups: citizen, business, government, tourist, student, other
  - Date range: Last 90 days

- **50 Grievance Tickets**
  - 20 auto-created from low-rated feedback (rating ≤ 2)
  - 30 manual citizen submissions
  - Varied statuses: Submitted, Under Review, In Progress, Resolved, Closed
  - Priority levels based on issue severity

- **20 Grievance Attachments**
  - Attached to 40% of grievances
  - File types: PDF, JPEG, PNG
  - File sizes: 100KB - 600KB
  - Realistic upload timestamps

- **30 EA Service Requests**
  - Status distribution: 20% Draft, 40% Submitted, 30% In Progress, 10% Completed
  - All from government departments
  - Priority distribution: 10% Urgent, 20% High, 50% Medium, 20% Low
  - Date range: Last 90 days

- **EA Request Attachments**
  - Generated based on `service_attachments` requirements
  - All mandatory documents attached
  - 50% of optional documents attached
  - Realistic file sizes (50KB - 500KB)

- **80 Unified Tickets**
  - Sources: 30% direct, 30% feedback-derived, 40% grievance-derived
  - Categories: Technical Issue, Service Request, Feedback/Complaint, Access/Permission
  - All tickets have SLA targets based on priority
  - Varied statuses across workflow

- **Ticket Activity Logs**
  - Every ticket has "created" activity
  - Status change activities for progressed tickets
  - Internal notes for resolved/closed tickets
  - Realistic timestamps

- **30 Ticket Attachments**
  - Attached to ~40% of tickets
  - File types: PDF (60%), JPEG (20%), PNG (20%)
  - Uploaded by citizens and staff

**Usage:**
```bash
./database/12-generate-synthetic-data.sh
```

**Expected results:**
- ✓ 200 service feedback records
- ✓ 50 grievance tickets (20 auto + 30 manual)
- ✓ 20 grievance attachments
- ✓ 30 EA service requests
- ✓ EA attachments (based on requirements)
- ✓ 80 tickets
- ✓ 200+ ticket activity logs
- ✓ 30 ticket attachments

---

### Step 4: Verify Data Integrity
**Script:** `13-verify-master-data.sh`

**What it checks:**

**Section 1: Table Row Counts**
- Validates expected row counts for all tables
- Checks active vs inactive records

**Section 2: Foreign Key Integrity**
- Orphaned services (entity_id not in entity_master)
- Orphaned attachments (service_id not in service_master)
- Invalid parent references in entity hierarchy
- Service feedback → services/entities
- Grievance tickets → services/entities
- EA requests → services/entities
- Tickets → services/entities/categories/priorities/statuses

**Section 3: Data Quality Metrics**
- Entity hierarchy structure (ministry → department → agency)
- Service category distribution
- Attachment requirements analysis
- Recipient group distribution
- Channel usage patterns

**Section 4: Referential Integrity Deep Checks**
- Auto-grievance source tracking
- EA request attachment completeness
- Ticket activity coverage (every ticket should have activities)

**Section 5: Performance Analytics**
- Rating distribution
- Top/bottom rated services
- Grievance status pipeline
- Ticket status pipeline
- Priority distribution

**Section 6: Temporal Validation**
- Date ranges (should be within last 90 days)
- Data freshness metrics (30/60/90 day buckets)

**Section 7: File Storage Validation**
- Total storage by attachment type
- Average/max file sizes
- File size constraint validation (≤ 5MB)

**Section 8: Final Summary**
- Overall PASS/FAIL status
- Comprehensive validation report

**Usage:**
```bash
./database/13-verify-master-data.sh
```

**Expected output:**
- ✓ All integrity checks PASS
- ✓ No orphaned records
- ✓ All constraints satisfied
- ✓ Realistic data distributions

---

## Complete Workflow Example

### Fresh Database Setup (From Scratch)

```bash
# 1. Initialize database schema (if not already done)
./database/00-master-init.sh

# 2. Clear any existing data
./database/10-clear-all-data.sh
# Type "yes" when prompted

# 3. Load cleaned master data
./database/11-load-master-data.sh

# 4. Generate synthetic test data
./database/12-generate-synthetic-data.sh

# 5. Verify everything
./database/13-verify-master-data.sh
```

**Total time:** ~2-3 minutes

---

### Updating Master Data Only

```bash
# 1. Clear only master data (keeps transactions)
docker exec feedback_db psql -U feedback_user -d feedback << 'EOF'
TRUNCATE TABLE service_attachments CASCADE;
TRUNCATE TABLE service_master CASCADE;
TRUNCATE TABLE entity_master CASCADE;
EOF

# 2. Load new master data
./database/11-load-master-data.sh

# 3. Verify
./database/13-verify-master-data.sh
```

---

## Data Integrity Validations

### ✓ Validated Constraints

1. **Foreign Key Integrity**
   - ✓ All services reference valid entities
   - ✓ All service attachments reference valid services
   - ✓ All feedback references valid services and entities
   - ✓ All grievances reference valid services and entities
   - ✓ All tickets reference valid services, entities, categories, priorities, statuses

2. **Data Quality**
   - ✓ No blank lines in CSV files
   - ✓ Boolean values standardized
   - ✓ Empty strings converted to NULL for nullable fields
   - ✓ Unique constraints enforced (entity names, service names)
   - ✓ File sizes within 5MB limit

3. **Business Logic**
   - ✓ Auto-grievances linked to source feedback
   - ✓ Grievance source_feedback_id only populated for auto-created grievances
   - ✓ EA requests have required attachments when status is Submitted/Completed
   - ✓ Every ticket has at least one activity log entry
   - ✓ Resolved tickets have resolved_at timestamps

4. **Temporal Consistency**
   - ✓ created_at ≤ updated_at
   - ✓ submitted_at ≥ created_at (for EA requests)
   - ✓ resolved_at ≥ created_at (for tickets)
   - ✓ All dates within realistic range (last 90 days)

---

## Common Issues & Solutions

### Issue: "Cannot connect to database"
**Solution:**
```bash
# Start database container
docker-compose up -d feedback_db

# Wait for health check
sleep 5

# Retry script
```

### Issue: "Master tables contain data"
**Solution:**
```bash
# Run clear script first
./database/10-clear-all-data.sh

# Then load master data
./database/11-load-master-data.sh
```

### Issue: "Foreign key violation"
**Solution:**
- Verify entity_master loaded before service_master
- Check that all entity_id values in services exist in entities
- Run verification script to identify specific orphaned records

### Issue: "Duplicate key violation"
**Solution:**
- Scripts use `ON CONFLICT DO NOTHING` (idempotent)
- If you need to update existing data, clear first
- Or manually delete specific records before re-loading

---

## Script Details

### 10-clear-all-data.sh

**Clears:**
- ✓ service_feedback
- ✓ grievance_tickets, grievance_attachments
- ✓ ea_service_requests, ea_service_request_attachments, ea_service_request_comments
- ✓ tickets, ticket_activity, ticket_attachments
- ✓ sla_breaches, ticket_notes
- ✓ qr_codes
- ✓ submission_rate_limit, submission_attempts, captcha_challenges
- ✓ service_attachments
- ✓ service_master
- ✓ entity_master

**Preserves:**
- ✓ users, accounts, sessions, user_roles
- ✓ priority_levels, ticket_status, ticket_categories, grievance_status
- ✓ entity_user_assignments, user_permissions, user_audit_log

**Sequences Reset:**
- All auto-increment sequences reset to 1
- Ensures clean numbering for new data

---

### 11-load-master-data.sh

**Load Order (Important):**
1. **entity_master** (no dependencies)
2. **service_master** (depends on entity_master)
3. **service_attachments** (depends on service_master)

**Features:**
- Temporary staging tables for CSV import
- Type conversion (string → boolean)
- NULL handling for empty fields
- Duplicate prevention (ON CONFLICT)
- Post-load validation

**Validation Checks:**
- Orphaned services check
- Orphaned attachments check
- Invalid parent entity references

---

### 12-generate-synthetic-data.sh

**Generation Strategy:**

**Service Feedback (200 records):**
- Random service selection (weighted distribution)
- Realistic rating distribution (skewed positive)
- Varied recipient groups
- Multiple channels
- Comments based on rating
- 40% include contact info
- Date range: Last 90 days

**Grievance Tickets (50 records):**
- **Part A (20 records):** Auto-created from low-rated feedback
  - Source: feedback records with rating ≤ 2
  - Links via source_feedback_id
  - Priority: High or Medium

- **Part B (30 records):** Manual citizen submissions
  - 15 realistic grievance subjects
  - Varied requester categories
  - Random service selection
  - No source_feedback_id

**EA Service Requests (30 records):**
- Status distribution: Draft (20%), Submitted (40%), In Progress (30%), Completed (10%)
- Requester departments from real government entities
- Priority levels assigned
- Submitted_at populated for non-draft
- Completed_at populated for completed status

**Ticket Activity Logs:**
- "created" activity for every ticket
- "status_change" for progressed tickets
- "internal_note" for resolved/closed tickets
- Realistic performer attribution

**File Attachments:**
- Minimal PDF header bytes (valid but tiny files)
- Realistic file sizes
- Proper MIME types
- Upload timestamps aligned with parent records

---

### 13-verify-master-data.sh

**8 Validation Sections:**

1. **Table Row Counts** - Verify expected volumes
2. **Foreign Key Integrity** - No orphaned records
3. **Data Quality Metrics** - Distribution analysis
4. **Referential Integrity** - Deep relationship checks
5. **Temporal Validation** - Date range checks
6. **Performance Analytics** - Business intelligence
7. **File Storage** - Storage and constraint validation
8. **Final Summary** - Overall PASS/FAIL report

**Output:**
- Comprehensive validation report
- Color-coded status indicators (✓ PASS, ✗ FAIL, ⚠ WARNING)
- Statistical summaries
- Quick access commands

---

## Master Data Statistics

### Entity Master (66 entities)
- **16 Ministries** (MIN-001 to MIN-016)
- **33 Departments** (DEP-001 to DEP-033)
- **17 Agencies/Regulators** (AGY-001 to AGY-020, some gaps)

**Entity Types:**
- ministry: 16
- department: 33
- agency: 15
- regulator: 2

**Hierarchy:**
- Top-level entities: 16 (ministries)
- Child entities: 50 (departments and agencies with parent_entity_id)

### Service Master (167 services)
- **33 unique service categories**
- **158 services with attachment requirements** (95%)
- **9 services without attachments** (5% - payment/online services)

**Top Categories by Service Count:**
1. taxation_duties_and_revenue (14 services)
2. social_protection_and_family_support (13 services)
3. health_services_and_clinics (12 services)
4. education (11 services across 3 subcategories)
5. land_use_planning_and_building_control (8 services)

### Service Attachments (177 definitions)
- **Mandatory documents:** ~65%
- **Optional documents:** ~35%
- **Average attachments per service:** 1.1
- **Services with most requirements:**
  - Medical facility licensing (4 documents)
  - Building permits (2-3 documents)
  - Financial licensing (3 documents)

---

## Synthetic Data Characteristics

### Realistic Distributions

**Service Feedback:**
- 5 stars: ~35%
- 4 stars: ~30%
- 3 stars: ~20%
- 2 stars: ~10%
- 1 star: ~5%

**Channels:**
- Web: ~60%
- QR: ~20%
- Mobile: ~15%
- Kiosk: ~5%

**Recipient Groups:**
- Citizen: ~50%
- Business: ~20%
- Government: ~15%
- Tourist: ~10%
- Student: ~5%

**Grievance Status:**
- Submitted: ~30%
- Under Review: ~25%
- In Progress: ~25%
- Resolved: ~15%
- Closed: ~5%

**Ticket Status:**
- New: ~20%
- Assigned: ~15%
- In Progress: ~30%
- Pending Customer: ~10%
- Resolved: ~20%
- Closed: ~5%

**EA Request Status:**
- Draft: ~20%
- Submitted: ~40%
- In Progress: ~30%
- Completed: ~10%

---

## Troubleshooting

### Verification Failures

**If foreign key checks FAIL:**
```bash
# Identify orphaned records
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT s.service_id, s.entity_id
FROM service_master s
LEFT JOIN entity_master e ON s.entity_id = e.unique_entity_id
WHERE e.unique_entity_id IS NULL;
EOF

# Solution: Fix master data files or reload entities first
```

**If attachment completeness fails:**
```bash
# Check which EA requests are missing required docs
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    ea.request_number,
    ea.status,
    COUNT(DISTINCT sa.service_attachment_id) AS required,
    COUNT(DISTINCT att.id) AS uploaded
FROM ea_service_requests ea
JOIN service_attachments sa ON ea.service_id = sa.service_id AND sa.is_mandatory = TRUE
LEFT JOIN ea_service_request_attachments att ON ea.id = att.request_id
WHERE ea.status IN ('Submitted', 'Completed')
GROUP BY ea.id, ea.request_number, ea.status
HAVING COUNT(DISTINCT att.id) < COUNT(DISTINCT sa.service_attachment_id);
EOF
```

**If date ranges are wrong:**
```bash
# Check actual date ranges
docker exec -it feedback_db psql -U feedback_user -d feedback << 'EOF'
SELECT
    'service_feedback' AS table_name,
    MIN(created_at)::DATE AS min_date,
    MAX(created_at)::DATE AS max_date,
    CURRENT_DATE - MIN(created_at)::DATE AS days_old
FROM service_feedback;
EOF

# Should show dates within last ~90 days
```

---

## Quick Reference

### View Master Data
```bash
# Entities
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT unique_entity_id, entity_name, entity_type FROM entity_master ORDER BY unique_entity_id;"

# Services
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT service_id, service_name, entity_id FROM service_master ORDER BY service_id;"

# Attachments by service
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT service_id, filename, is_mandatory FROM service_attachments WHERE service_id='SVC-IMM-001';"
```

### View Synthetic Data
```bash
# Recent feedback
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT id, service_id, rating, channel, created_at FROM service_feedback ORDER BY created_at DESC LIMIT 10;"

# Grievances
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT grievance_number, grievance_type, subject, status FROM grievance_tickets LIMIT 10;"

# EA Requests
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT request_number, status, requester_department FROM ea_service_requests LIMIT 10;"

# Tickets
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT ticket_number, subject, status_id FROM tickets LIMIT 10;"
```

---

## Files Created

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `master-data/cleaned/entity-master.txt` | Cleaned entities | 67 | ✓ Ready |
| `master-data/cleaned/service-master.txt` | Cleaned services | 168 | ✓ Ready |
| `master-data/cleaned/service-attachments.txt` | Cleaned attachments | 178 | ✓ Ready |
| `10-clear-all-data.sh` | Clear database | 180 | ✓ Executable |
| `11-load-master-data.sh` | Load master data | 268 | ✓ Executable |
| `12-generate-synthetic-data.sh` | Generate test data | 400+ | ✓ Executable |
| `13-verify-master-data.sh` | Verify integrity | 380+ | ✓ Executable |

---

## Next Steps

After running the complete workflow:

1. **View Analytics Dashboard**
   ```
   http://localhost:3000/analytics
   ```

2. **Test Public Forms**
   - Feedback: `http://localhost:3000/feedback`
   - Grievance: `http://localhost:3000/submit-grievance`
   - Ticket Check: `http://localhost:3000/check-status`

3. **Access Admin Portal**
   ```
   http://localhost:3000/admin
   ```
   - View all feedback, grievances, tickets
   - Manage EA service requests
   - Review analytics and reports

4. **Add Admin User** (if not already done)
   ```bash
   ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh
   ```

---

## Maintenance

### Regular Updates

**Update master data:**
1. Edit source files in `database/master-data/`
2. Re-run cleaning (automated in scripts)
3. Clear and reload master data
4. Regenerate synthetic data if needed

**Add new entities/services:**
1. Add to appropriate master data file
2. Run `./database/11-load-master-data.sh` (idempotent)
3. Verify with `./database/13-verify-master-data.sh`

**Reset for testing:**
```bash
# Quick reset (clears all data, reloads master, generates synthetic)
./database/10-clear-all-data.sh && \
./database/11-load-master-data.sh && \
./database/12-generate-synthetic-data.sh
```

---

## Technical Notes

### CSV Import Method
Uses PostgreSQL `\COPY` command:
- Fast bulk loading
- Server-side processing
- Direct file-to-table transfer
- Automatic CSV parsing

### Type Conversions
- String `'TRUE'` → Boolean `TRUE`
- Empty string `''` → `NULL`
- Numeric strings → INTEGER
- Quoted fields preserved

### Performance
- Entity loading: ~1 second (66 records)
- Service loading: ~2 seconds (167 records)
- Attachment loading: ~2 seconds (177 records)
- Synthetic data: ~5-10 seconds (600+ records)
- Total workflow: ~2-3 minutes

### Idempotency
All scripts are idempotent (safe to run multiple times):
- `ON CONFLICT DO NOTHING` prevents duplicates
- `CREATE TABLE IF NOT EXISTS` prevents schema errors
- `TRUNCATE` used instead of `DELETE` for performance

---

**Document Version:** 1.2
**Last Updated:** January 2026
**Maintained By:** GEA Portal Development Team
