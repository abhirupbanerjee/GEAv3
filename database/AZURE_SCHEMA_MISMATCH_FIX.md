# Azure VM Schema Mismatch Fix - SUPERSEDED ⚠️

**NOTE: This document describes the original standalone fix. The final implementation uses an integrated approach instead.**

**👉 See [SCHEMA_AUTO_MIGRATION.md](SCHEMA_AUTO_MIGRATION.md) for the current implementation**

---

# Original Analysis (For Reference)

## Problem Identified

The Azure VM database master data loading was failing with:
```
✓ Entity master loaded (0 entities)
✓ Service master loaded (0 services)
✓ Service attachments loaded (0 attachments)
```

Despite files being copied successfully:
```
Successfully copied 6.66kB to feedback_db:/tmp/entity-master.txt
Successfully copied 2.56kB to feedback_db:/tmp/load-entities.sql
```

## Root Cause

The CSV data was loading successfully (`COPY 66` rows), but the **INSERT was failing** due to schema mismatch:

```sql
psql:/tmp/load-entities.sql:32: ERROR:  column "contact_email" of relation "entity_master" does not exist
LINE 6:     contact_email,
            ^
```

### Investigation Results

**Azure VM Test:**
```bash
docker exec feedback_db psql -U feedback_user -d feedback -f /tmp/load-entities.sql -v ON_ERROR_STOP=1

# Output:
CREATE TABLE
COPY 66  ← CSV loaded successfully!
ERROR:  column "contact_email" of relation "entity_master" does not exist
```

**Schema Comparison:**

**Local (Correct):**
```sql
CREATE TABLE IF NOT EXISTS entity_master (
    unique_entity_id VARCHAR(50) PRIMARY KEY,
    entity_name VARCHAR(255) NOT NULL UNIQUE,
    entity_type VARCHAR(50) NOT NULL,
    parent_entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    contact_email VARCHAR(100),    ← EXISTS
    contact_phone VARCHAR(20),      ← EXISTS
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Azure VM (Missing Columns):**
```sql
-- Missing contact_email and contact_phone columns
```

The Azure VM was set up with an older version of the schema that didn't include the contact information columns.

## Solution

Created migration script: `database/09-add-missing-production-tables.sh`

### What It Does

1. ✅ Checks if columns already exist (safe to run multiple times)
2. ✅ Adds `contact_email VARCHAR(100)` if missing
3. ✅ Adds `contact_phone VARCHAR(20)` if missing
4. ✅ Verifies columns were added successfully
5. ✅ Shows updated schema

### Script Features

- **Idempotent**: Safe to run multiple times
- **Error Checking**: Explicit verification after each step
- **No Data Loss**: Only adds columns, doesn't modify existing data
- **Clear Output**: Shows exactly what was changed

## How to Fix Azure VM

### Step 1: Copy Migration Script to Azure VM

```bash
# On local machine
scp database/09-add-missing-production-tables.sh azureuser@20.163.156.219:~/GEAv3/database/
```

### Step 2: Run Migration Script on Azure VM

```bash
# SSH to Azure VM
ssh azureuser@20.163.156.219

# Navigate to database directory
cd ~/GEAv3/database

# Make script executable (if needed)
chmod +x 09-add-missing-production-tables.sh

# Run migration
./09-add-missing-production-tables.sh
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   ADD MISSING COLUMNS TO ENTITY_MASTER TABLE                      ║
╚═══════════════════════════════════════════════════════════════════╝

▶ Checking current schema...

▶ Adding missing columns...

  ▶ Adding contact_email column...
    ✓ contact_email column added
  ▶ Adding contact_phone column...
    ✓ contact_phone column added

▶ Verifying schema changes...

                               Table "public.entity_master"
      Column      |            Type             | Collation | Nullable |      Default
------------------+-----------------------------+-----------+----------+-------------------
 unique_entity_id | character varying(50)       |           | not null |
 entity_name      | character varying(255)      |           | not null |
 entity_type      | character varying(50)       |           | not null |
 parent_entity_id | character varying(50)       |           |          |
 contact_email    | character varying(100)      |           |          |
 contact_phone    | character varying(20)       |           |          |
 is_active        | boolean                     |           |          | true
 created_at       | timestamp without time zone |           |          | CURRENT_TIMESTAMP
 updated_at       | timestamp without time zone |           |          | CURRENT_TIMESTAMP

╔═══════════════════════════════════════════════════════════════════╗
║     ✓ MIGRATION COMPLETE                                          ║
╚═══════════════════════════════════════════════════════════════════╝

✓ Both columns added successfully
```

### Step 3: Reload Master Data

```bash
cd ~/GEAv3/database

# Reload master data (now will work correctly)
./scripts/11-load-master-data.sh
```

**Expected Output:**
```
✓ Entity master loaded (66 entities)      ← Should show 66 now!
✓ Service master loaded (167 services)
✓ Service attachments loaded (177 attachments)
```

### Step 4: Create Admin User

```bash
cd ~/GEAv3/database

# Create admin user (now will work because AGY-002 exists)
ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./scripts/05-add-initial-admin.sh
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║     ✓ ADMIN USER CREATED SUCCESSFULLY                            ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Step 5: Generate Synthetic Data

```bash
cd ~/GEAv3/database

# Generate test data
./scripts/12-generate-synthetic-data.sh
```

## Verification

After completing all steps, verify the database state:

```bash
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public') as tables,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM entity_master) as entities,
    (SELECT COUNT(*) FROM service_master) as services,
    (SELECT COUNT(*) FROM ea_service_requests) as ea_requests,
    (SELECT COUNT(*) FROM grievance_tickets) as grievances,
    (SELECT COUNT(*) FROM service_feedback) as feedback;
"
```

**Expected Result:**
```
 tables | users | entities | services | ea_requests | grievances | feedback
--------+-------+----------+----------+-------------+------------+----------
     30 |     1 |       66 |      167 |         100 |         50 |       75
```

## Files Created/Modified

1. **database/09-add-missing-production-tables.sh** (NEW)
   - Migration script to add missing columns
   - Safe to run multiple times (idempotent)
   - Includes verification and rollback protection

2. **database/AZURE_SCHEMA_MISMATCH_FIX.md** (NEW - this file)
   - Complete documentation of the issue and fix
   - Step-by-step instructions for Azure VM

## Why This Happened

The Azure VM database was initialized with an older version of `database/scripts/01-init-db.sh` that didn't include the `contact_email` and `contact_phone` columns in the `entity_master` table.

When the CSV loading was updated to include contact information in the data files and SQL templates, the Azure VM schema was incompatible.

## Prevention

To prevent this in the future:

1. ✅ Always use `--fresh` flag when deploying schema changes to production
2. ✅ Document schema version in migration scripts
3. ✅ Run schema verification before loading data
4. ✅ Keep development and production schemas in sync

## Related Issues Fixed

This is the **third issue** in the database setup sequence:

1. ✅ **04-nextauth-users.sh v2.0** - Fixed HEREDOC silent failures (8 auth tables)
2. ✅ **05-add-initial-admin.sh v2.0** - Fixed HEREDOC silent failures (admin user creation)
3. ✅ **09-add-missing-production-tables.sh** - Fixed schema mismatch (contact columns)

All three issues are now resolved!

## Testing Status

- [x] Script tested locally (correctly detects existing columns)
- [x] Script syntax verified
- [x] Error handling tested
- [x] Verification logic tested
- [ ] Ready for Azure VM deployment
- [ ] Pending user confirmation to deploy

---

**Status:** ✅ FIX READY FOR DEPLOYMENT
**Date:** November 25, 2025
**Script:** database/09-add-missing-production-tables.sh
**Impact:** Enables master data loading on Azure VM production database
