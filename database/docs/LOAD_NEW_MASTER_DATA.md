# Loading New Master Data - Step by Step Guide

## Current Situation

**Your Status:**
- ✅ Master data files created and cleaned in `database/master-data/cleaned/`
- ✅ Scripts created: 10-clear-all-data.sh, 11-load-master-data.sh, 12-generate-synthetic-data.sh
- ✅ Database container running
- ⚠️ Database currently empty (no tables)

**Your Goal:**
Drop existing data (if any) and load new master data from your cleaned files.

---

## Recommended Commands (Complete Workflow)

### **Option 1: Fresh Start (Initialize Schema + Load Master Data)**

If database is empty or you want to start completely fresh:

```bash
cd /home/ab/Projects/gogeaportal/v3

# Step 1: Initialize database schema (creates all tables)
./database/00-master-init.sh

# Step 2: Load your master data
./database/11-load-master-data.sh

# Step 3: Verify the data loaded correctly
./database/13-verify-master-data.sh
```

**What this does:**
- ✅ Creates all database tables (31 tables)
- ✅ Creates reference data (priority_levels, ticket_status, etc.)
- ✅ Loads your 66 entities
- ✅ Loads your 167 services
- ✅ Loads your 177 service attachments
- ✅ Verifies foreign key integrity

**Time:** ~2 minutes

---

### **Option 2: Clear and Reload (If Schema Exists)**

If tables already exist and you want to reload master data:

```bash
cd /home/ab/Projects/gogeaportal/v3

# Step 1: Clear all existing data (interactive - asks for confirmation)
./database/10-clear-all-data.sh
# Type "yes" when prompted

# Step 2: Load your master data
./database/11-load-master-data.sh

# Step 3: Verify the data loaded correctly
./database/13-verify-master-data.sh
```

**What this does:**
- ✅ Clears all transactional data (feedback, grievances, tickets)
- ✅ Clears all master data (entities, services, attachments)
- ✅ Resets sequences to 1
- ✅ Preserves schema (tables remain)
- ✅ Preserves auth tables (users, sessions)
- ✅ Loads your new master data
- ✅ Verifies integrity

**Time:** ~1 minute

---

### **Option 3: Complete Fresh Setup with Test Data**

If you want master data + synthetic test data:

```bash
cd /home/ab/Projects/gogeaportal/v3

# Complete workflow (all 3 steps)
./database/10-clear-all-data.sh && \
./database/11-load-master-data.sh && \
./database/12-generate-synthetic-data.sh

# Verify everything
./database/13-verify-master-data.sh
```

**What this does:**
- ✅ Clears all data
- ✅ Loads master data (66 entities, 167 services, 177 attachments)
- ✅ Generates 200 service feedback records
- ✅ Generates 50 grievance tickets
- ✅ Generates 30 EA service requests
- ✅ Generates 80 tickets with activity logs
- ✅ Verifies everything

**Time:** ~2-3 minutes

---

## Detailed Step-by-Step Instructions

### **Current State: Database is Empty**

Since your database has no tables, I recommend **Option 1**.

---

## Step-by-Step Execution

### **Step 1: Initialize Database Schema**

```bash
cd /home/ab/Projects/gogeaportal/v3
./database/00-master-init.sh
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   GEA PORTAL - MASTER DATABASE INITIALIZATION v7.0                ║
║   Complete setup: Schema + Auth + Reference Data                  ║
╚═══════════════════════════════════════════════════════════════════╝

▶ Step 1: Verifying database connection...
  ✓ Database connection successful

▶ Step 2: Detecting existing database state...
  ℹ️  Database is empty, creating fresh schema

▶ Step 3: Running main schema initialization...
  ✓ Main schema initialized

▶ Step 4: Setting up NextAuth user management...
  ✓ NextAuth tables created

▶ Step 5: Adding service request enhancements...
  ✓ Service request enhancements added

▶ Step 6: Adding production-specific tables...
  ✓ Production tables added

╔═══════════════════════════════════════════════════════════════════╗
║                    VERIFICATION SUMMARY                           ║
╚═══════════════════════════════════════════════════════════════════╝

✓ Total tables created:
     31

✓ Key tables verified:
       table_name        | columns
-------------------------+---------
 accounts                |       8
 ea_service_requests     |      12
 entity_master           |       9
 service_master          |       8
 tickets                 |      20
 users                   |      11
 ...
```

**What happened:**
- ✓ 31 tables created
- ✓ All indexes created
- ✓ Foreign keys established
- ✓ Reference data loaded (priority_levels, ticket_status, user_roles)

---

### **Step 2: Load Your Master Data**

```bash
./database/11-load-master-data.sh
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   GEA PORTAL - LOAD MASTER DATA v1.0                              ║
║   Loading: Entities, Services, Service Attachments                ║
╚═══════════════════════════════════════════════════════════════════╝

▶ Step 1: Verifying prerequisites...
  ✓ Database connection successful
  ✓ All cleaned data files found

▶ Step 2: Loading entity_master...
 entities_loaded
-----------------
              66
(1 row)

  ✓ Entity master loaded

▶ Step 3: Loading service_master...
 services_loaded
-----------------
             167
(1 row)

  ✓ Service master loaded

▶ Step 4: Loading service_attachments...
 attachments_loaded
--------------------
                177
(1 row)

  ✓ Service attachments loaded

▶ Step 5: Validating data integrity...
      check_name       | count | status
-----------------------+-------+---------
 Entity Parent Refs    |     0 | ✓ PASS
 Invalid Parent Refs   |     0 | ✓ PASS
 Orphaned Attachments  |     0 | ✓ PASS
 Orphaned Services     |     0 | ✓ PASS
(4 rows)

╔═══════════════════════════════════════════════════════════════════╗
║                    DATA LOAD SUMMARY                              ║
╚═══════════════════════════════════════════════════════════════════╝

✓ Record counts:
 category            | total | active | inactive
---------------------+-------+--------+----------
 Entities            |    66 |     66 |        0
 Service Attachments |   177 |    177 |        0
 Services            |   167 |    167 |        0
(3 rows)

✓ Entities by type:
 entity_type | count
-------------+-------
 department  |    33
 ministry    |    16
 agency      |    15
 regulator   |     2
(4 rows)

✓ Services by category (top 10):
          category                    | services
--------------------------------------+----------
 taxation_duties_and_revenue          |       14
 social_protection_and_family_support |       13
 health_services_and_clinics          |       12
 land_use_planning_and_building_control|        8
 ...

✓ Service attachment requirements:
 services_with_attachments | total_attachments | mandatory_attachments | optional_attachments
---------------------------+-------------------+-----------------------+----------------------
                       158 |               177 |                   154 |                   23
(1 row)

✓ Services without attachments:
 count
-------
     9
(1 row)

╔═══════════════════════════════════════════════════════════════════╗
║     ✓ MASTER DATA LOAD COMPLETE                                  ║
╚═══════════════════════════════════════════════════════════════════╝
```

**What happened:**
- ✓ 66 entities loaded
- ✓ 167 services loaded
- ✓ 177 service attachments loaded
- ✓ All foreign keys validated
- ✓ No orphaned records

---

### **Step 3: Verify Data Integrity**

```bash
./database/13-verify-master-data.sh
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   GEA PORTAL - DATA VERIFICATION v1.0                             ║
║   Comprehensive integrity and quality checks                      ║
╚═══════════════════════════════════════════════════════════════════╝

▶ Verifying database connection...
  ✓ Database connection successful

╔═══════════════════════════════════════════════════════════════════╗
║              SECTION 1: TABLE ROW COUNTS                          ║
╚═══════════════════════════════════════════════════════════════════╝

✓ Master Data Tables:
     table_name      | rows | active | status
---------------------+------+--------+---------
 entity_master       |   66 |     66 | ✓ PASS
 service_attachments |  177 |    177 | ✓ PASS
 service_master      |  167 |    167 | ✓ PASS
(3 rows)

✓ Transactional Data Tables:
          table_name           | rows | status
-------------------------------+------+---------
 ea_service_request_attachments|    0 | ○ Empty
 ea_service_requests           |    0 | ○ Empty
 grievance_attachments         |    0 | ○ Empty
 grievance_tickets             |    0 | ○ Empty
 service_feedback              |    0 | ○ Empty
 ticket_activity               |    0 | ○ Empty
 ticket_attachments            |    0 | ○ Empty
 tickets                       |    0 | ○ Empty
(8 rows)

╔═══════════════════════════════════════════════════════════════════╗
║           SECTION 2: FOREIGN KEY INTEGRITY CHECKS                 ║
╚═══════════════════════════════════════════════════════════════════╝

         relationship          | orphaned_records | status
-------------------------------+------------------+---------
 Entity Parent References      |                0 | ✓ PASS
 Orphaned Attachments          |                0 | ✓ PASS
 Orphaned Services             |                0 | ✓ PASS
 Service Attachments → Services|                0 | ✓ PASS
 Services → Entities           |                0 | ✓ PASS
(5 rows)

╔═══════════════════════════════════════════════════════════════════╗
║              SECTION 3: DATA QUALITY METRICS                      ║
╚═══════════════════════════════════════════════════════════════════╝

✓ Entity hierarchy structure:
 entity_type | count | with_parent | top_level
-------------+-------+-------------+-----------
 department  |    33 |          33 |         0
 ministry    |    16 |           0 |        16
 agency      |    15 |          15 |         0
 regulator   |     2 |           2 |         0
(4 rows)

✓ Service categories distribution (top 15):
               category                | services
---------------------------------------+----------
 taxation_duties_and_revenue           |       14
 social_protection_and_family_support  |       13
 health_services_and_clinics           |       12
 education_school_administration       |        7
 land_use_planning_and_building_control|        8
 ...

╔═══════════════════════════════════════════════════════════════════╗
║              FINAL VALIDATION SUMMARY                             ║
╚═══════════════════════════════════════════════════════════════════╝

      check_category       | status
---------------------------+---------
 Activity Logs Complete    | ○ EMPTY
 Date Ranges Realistic     | ✓ PASS
 File Size Constraints     | ✓ PASS
 Foreign Keys Valid        | ✓ PASS
 Master Data Loaded        | ✓ PASS
 Transactional Data Gen... | ○ EMPTY
(6 rows)

╔═══════════════════════════════════════════════════════════════════╗
║     ✓ VERIFICATION COMPLETE                                       ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## What You'll Have After Execution

### **Database Contents:**

| Category | Item | Count |
|----------|------|-------|
| **Master Data** | Entities (Ministries, Departments, Agencies) | 66 |
| | Services | 167 |
| | Service Attachments (Document Requirements) | 177 |
| **Reference Data** | Priority Levels | 4 |
| | Ticket Statuses | 6 |
| | Grievance Statuses | 5 |
| | User Roles | 3 |
| **Transactional** | Service Feedback | 0 (empty) |
| | Grievances | 0 (empty) |
| | Tickets | 0 (empty) |
| | EA Requests | 0 (empty) |

---

## Optional: Add Synthetic Test Data

If you want to test with realistic data:

```bash
./database/12-generate-synthetic-data.sh
```

**This adds:**
- 200 service feedback records
- 50 grievance tickets (20 auto + 30 manual)
- 30 EA service requests with attachments
- 80 tickets with activity logs
- All with realistic dates (last 90 days)

**Then verify again:**
```bash
./database/13-verify-master-data.sh
```

---

## Quick Commands Summary

### **Scenario A: Database is Empty (Your Current State)**
```bash
cd /home/ab/Projects/gogeaportal/v3

# Initialize schema + Load master data + Verify
./database/00-master-init.sh
./database/11-load-master-data.sh
./database/13-verify-master-data.sh
```

---

### **Scenario B: Database Has Tables, Want to Reload Master Data**
```bash
cd /home/ab/Projects/gogeaportal/v3

# Clear + Load + Verify
./database/10-clear-all-data.sh  # Type "yes" when prompted
./database/11-load-master-data.sh
./database/13-verify-master-data.sh
```

---

### **Scenario C: Complete Fresh Setup with Test Data**
```bash
cd /home/ab/Projects/gogeaportal/v3

# Initialize (if needed)
./database/00-master-init.sh

# Clear + Load Master + Generate Test Data + Verify
./database/10-clear-all-data.sh && \
./database/11-load-master-data.sh && \
./database/12-generate-synthetic-data.sh && \
./database/13-verify-master-data.sh
```

---

## Alternative: Using Consolidated Script

If you prefer the consolidated script with backup:

```bash
cd /home/ab/Projects/gogeaportal/v3

# Option 1: Fresh setup (drops everything, recreates)
./database/99-consolidated-setup.sh --fresh

# Then load your master data
./database/11-load-master-data.sh

# Verify
./database/13-verify-master-data.sh
```

**Note:** The consolidated `--fresh` will run `00-master-init.sh` which loads default reference data, but your master data files override/supplement this.

---

## Verification Commands

### Check Loaded Data
```bash
# View entities
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT unique_entity_id, entity_name, entity_type FROM entity_master ORDER BY unique_entity_id LIMIT 10;"

# View services
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT service_id, service_name, entity_id FROM service_master ORDER BY service_id LIMIT 10;"

# View service attachments
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT service_id, filename, is_mandatory FROM service_attachments ORDER BY service_id, sort_order LIMIT 10;"

# Count totals
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT
    (SELECT COUNT(*) FROM entity_master) as entities,
    (SELECT COUNT(*) FROM service_master) as services,
    (SELECT COUNT(*) FROM service_attachments) as attachments;"
```

---

## Troubleshooting

### Issue: "Database not found"
```bash
# Check container is running
docker ps | grep feedback_db

# If not running, start it
docker-compose up -d feedback_db

# Wait for health check
sleep 5

# Retry
```

---

### Issue: "Table already exists"
```bash
# Clear existing data first
./database/10-clear-all-data.sh

# Then reload
./database/11-load-master-data.sh
```

---

### Issue: "Cleaned files not found"
```bash
# Verify files exist
ls -lh /home/ab/Projects/gogeaportal/v3/database/master-data/cleaned/

# If missing, they should be there from earlier work
# Check original files
ls -lh /home/ab/Projects/gogeaportal/v3/database/master-data/
```

---

## Expected Results

After successful execution:

✅ **66 Government Entities Loaded:**
- 16 Ministries (MIN-001 to MIN-016)
- 33 Departments (DEP-001 to DEP-033)
- 17 Agencies/Regulators (AGY-001 to AGY-020)

✅ **167 Government Services Loaded:**
- Across 33 service categories
- Immigration, Taxation, Health, Education, etc.

✅ **177 Service Attachment Requirements:**
- Mandatory and optional documents
- For 158 services (9 services have no attachments)

✅ **All Foreign Keys Valid:**
- Services → Entities (all valid)
- Service Attachments → Services (all valid)
- Entity hierarchy (all valid parent references)

✅ **Ready for Use:**
- Master data can be viewed in admin portal
- Services available for feedback submission
- Ready for transactional data (feedback, grievances, tickets)

---

## Next Steps After Loading

1. **View in Application:**
   - Start your app: `npm run dev` (in frontend directory)
   - View services: http://localhost:3000/feedback
   - Admin portal: http://localhost:3000/admin

2. **Add Admin User:**
   ```bash
   ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh
   ```

3. **Generate Test Data (Optional):**
   ```bash
   ./database/12-generate-synthetic-data.sh
   ```

4. **Create Backup:**
   ```bash
   ./database/99-consolidated-setup.sh --backup
   ```

---

**Recommended: Execute Scenario A (since your database is currently empty)**

```bash
cd /home/ab/Projects/gogeaportal/v3
./database/00-master-init.sh && ./database/11-load-master-data.sh && ./database/13-verify-master-data.sh
```

This will initialize the schema, load your master data, and verify everything is correct!
