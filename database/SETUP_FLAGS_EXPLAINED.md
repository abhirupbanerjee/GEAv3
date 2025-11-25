# Database Setup Flags - Complete Guide

## Summary of Fixes Applied

### ✅ Fixed Path Issues in ALL Scripts
All relative path issues have been fixed in `database/scripts/00-master-init.sh`:
- Lines 87, 98: `01-init-db.sh`, `04-nextauth-users.sh`
- Lines 109, 120: `07-service-request-enhancements.sh`, `09-add-missing-production-tables.sh`

All paths now use `$SCRIPTS_DIR` variable which works regardless of where you run the script from.

---

## What Each Flag Does

### 1. `--fresh` Flag

**Purpose:** Complete database reset and setup from scratch

**What it does:**
1. ✅ **Drops ALL existing tables** (with confirmation prompt)
2. ✅ **Creates mandatory backup** before dropping anything
3. ✅ **Runs 00-master-init.sh** which includes:
   - Schema creation (all tables: feedback, grievances, EA requests, tickets, users)
   - Reference data (priorities, statuses, ticket statuses)
   - NextAuth authentication tables
   - Service request enhancements
   - Production-specific tables (SLA, activities, notes)
   - Indexes and constraints
4. ✅ **Loads production master data from CSV files:**
   - 66 entities (ministries, departments, agencies)
   - 167 services
   - 177 service attachments
5. ✅ **Prompts to create admin user** (interactive)
   - Asks for admin email and name
   - Creates admin user for login access

**What it DOES NOT do:**
- ❌ Does NOT load sample/reference entities (no default 4 entities)
- ❌ Does NOT generate synthetic test data (200 feedback, 50 grievances, etc.)

**When to use:**
- First-time setup on a new server (production or staging)
- Complete database rebuild after major schema changes
- When you want a clean slate with production master data but no test data

**Command:**
```bash
./database/99-consolidated-setup.sh --fresh
```

**Result:**
- Database with all tables, reference data, and production master data (66 entities, 167 services, 177 attachments)
- Admin user created (if you chose yes during setup)
- Ready for production use or testing
- NO synthetic test data

---

### 2. `--reload` Flag

**Purpose:** Complete data refresh (keeps schema, reloads all data)

**What it does:**
1. ✅ **Clears all master and transactional data** (keeps schema)
2. ✅ **Loads production master data** from CSV files:
   - 66 entities (ministries, departments, agencies)
   - 167 services
   - 177 service attachments
3. ✅ **Generates synthetic test data**:
   - 200 service feedback records
   - 50 grievance tickets
   - 20 grievance attachments
   - 30 EA service requests
   - 80 tickets
   - 140 ticket activities
   - 30 ticket attachments
4. ✅ **Verifies data integrity** (foreign keys, counts)

**What it DOES NOT do:**
- ❌ Does NOT recreate schema (uses existing tables)
- ❌ Does NOT create admin users (use `05-add-initial-admin.sh` separately)

**When to use:**
- Testing with fresh data
- After updating CSV master data files
- Development/staging environment refreshes
- When you want realistic test data

**Command:**
```bash
./database/99-consolidated-setup.sh --reload
```

**Result:**
- Database with full master data + synthetic test data
- Analytics dashboard will show data
- Ready for testing

---

### 3. `--verify` Flag

**Purpose:** Check database state without making changes

**What it does:**
1. ✅ **Displays table row counts** (master and transactional)
2. ✅ **Checks foreign key integrity**
3. ✅ **Validates data quality metrics**
4. ✅ **Shows validation status**

**What it DOES NOT do:**
- ❌ Does NOT make any changes to database
- ❌ Does NOT load or generate any data

**When to use:**
- After data loading to verify success
- Before deployment to check data state
- Troubleshooting data issues
- Regular database health checks

**Command:**
```bash
./database/99-consolidated-setup.sh --verify
```

---

### 4. `--load-master` Flag

**Purpose:** Load production master data only (no synthetic data)

**What it does:**
1. ✅ **Loads entity_master** (66 entities)
2. ✅ **Loads service_master** (167 services)
3. ✅ **Loads service_attachments** (177 attachments)
4. ✅ **Validates foreign keys**

**What it DOES NOT do:**
- ❌ Does NOT generate synthetic test data
- ❌ Does NOT clear existing data (unless `--clear` option used)

**When to use:**
- Production environment setup
- When you only want real data, no test data
- After updating CSV master data files

**Command:**
```bash
./database/99-consolidated-setup.sh --load-master
```

---

### 5. `--generate-data` Flag

**Purpose:** Generate synthetic test data only

**What it does:**
1. ✅ **Generates synthetic transactional data**:
   - Service feedback
   - Grievances
   - Tickets
   - Activities
   - Attachments

**Requires:**
- Master data must already be loaded (entities, services)

**When to use:**
- Development/testing environments
- After loading master data
- When you need test data for analytics

**Command:**
```bash
./database/99-consolidated-setup.sh --generate-data
```

---

## Comparison Matrix

| Feature | --fresh | --reload | --verify | --load-master | --generate-data |
|---------|---------|----------|----------|---------------|-----------------|
| **Drop tables** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Create schema** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Reference data** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Clear data** | ✅ Yes | ✅ Yes | ❌ No | ⚠️ Optional | ❌ No |
| **Load master CSV** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Generate test data** | ❌ No | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **Verify integrity** | ⚠️ Basic | ✅ Yes | ✅ Yes | ⚠️ Basic | ⚠️ Basic |
| **Create admin** | ⚠️ Prompts | ❌ No | ❌ No | ❌ No | ❌ No |

---

## Typical Workflows

### First Time Setup (Development)
```bash
cd /home/azureuser/GEAv3

# 1. Fresh schema + reference data + master data + admin user
./database/99-consolidated-setup.sh --fresh
# (Follow interactive prompts to create admin user)

# 2. Generate synthetic test data for analytics/testing
./database/99-consolidated-setup.sh --generate-data

# 3. Verify everything
./database/99-consolidated-setup.sh --verify
```

### First Time Setup (Production)
```bash
cd /home/azureuser/GEAv3

# 1. Fresh schema + reference data + master data + admin user
./database/99-consolidated-setup.sh --fresh
# (Follow interactive prompts to create admin user)

# 2. Verify everything
./database/99-consolidated-setup.sh --verify

# That's it! Production ready (no test data needed)
```

### Data Refresh (Development)
```bash
# Quick reload with new test data
./database/99-consolidated-setup.sh --reload
```

### After Updating CSV Files
```bash
# Just reload master data
./database/99-consolidated-setup.sh --load-master --clear
```

---

## Admin User Creation

### Interactive Creation (Recommended)

The `--fresh` flag now prompts you to create an admin user interactively during setup. Just answer the prompts when asked.

### Manual Creation (If Needed Later)

If you skipped admin creation during `--fresh`, or need to add more admin users:

```bash
# Create admin user manually
ADMIN_EMAIL="admin@gov.gd" ADMIN_NAME="Admin User" ./database/scripts/05-add-initial-admin.sh

# Or run the authentication setup first (if not done)
./database/scripts/04-nextauth-users.sh
ADMIN_EMAIL="admin@gov.gd" ADMIN_NAME="Admin User" ./database/scripts/05-add-initial-admin.sh
```

---

## Complete Flag Reference

```bash
./database/99-consolidated-setup.sh [FLAGS]

FLAGS:
  --fresh           Drop and recreate all tables + reference data
  --reload          Clear + load master data + generate synthetic data
  --verify          Check database state (read-only)
  --load-master     Load production master data from CSV
  --generate-data   Generate synthetic test data
  --clear-data      Clear all master and transactional data
  --update          Incremental schema updates (deprecated)

You can combine some flags:
  --load-master --generate-data    Load master then generate test data
  --clear-data --load-master       Clear then load master data
```

---

## Troubleshooting

### Issue: "--fresh fails with 'No such file or directory'"
**Fix:** ✅ Already fixed in this update! The path issues have been resolved.

### Issue: "--reload shows 0 records loaded"
**Possible causes:**
1. CSV files are empty (run `./database/quick-csv-check.sh`)
2. Files have wrong line endings (run `dos2unix database/master-data/cleaned/*.txt`)
3. CSV files not committed to git (check `git status database/master-data/`)

**Fix:** With latest updates, errors are now visible. Run with `--reload` to see actual error messages.

### Issue: "Analytics dashboard is empty after --reload"
**Check:**
```bash
./database/99-consolidated-setup.sh --verify
```
Look at the "Transactional Data Generated" status. Should show "✓ PASS" not "⚠ EMPTY".

---

## Files Modified in This Update

1. `database/scripts/00-master-init.sh` - Fixed all 4 relative path issues
2. `database/lib/csv-loader.sh` - Removed error suppression (shows actual errors now)
3. `database/diagnose-azure-csv.sh` - New diagnostic tool
4. `database/quick-csv-check.sh` - Quick CSV file checker
5. `database/AZURE_TROUBLESHOOTING.md` - Troubleshooting guide
6. `database/AZURE_FIX_APPLIED.md` - Fix documentation
7. `README.md` - Updated with new workflow options
