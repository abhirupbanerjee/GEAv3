# Azure VM Master Data Loading Troubleshooting Guide

## Problem
CSV master data loading shows "0 entities, 0 services, 0 attachments" on Azure VM, but works locally.

## Root Cause Analysis

### Why It Works Locally But Fails on Azure

The most common reasons:

1. **CSV files are empty or missing data** on Azure VM
   - Files may have only headers (1 line each)
   - Files weren't properly deployed/copied to Azure

2. **Database already has data**
   - ON CONFLICT DO NOTHING prevents re-inserting
   - Scripts report SUCCESS but insert 0 rows

3. **Line ending issues** (CRLF vs LF)
   - Files transferred from Windows have wrong line endings
   - PostgreSQL COPY command fails silently

4. **File path differences**
   - Local: `/home/ab/Projects/gogeaportal/v3/`
   - Azure: `/home/azureuser/GEAv3/`

## Quick Diagnostic Steps

### Step 1: Check If CSV Files Have Data

```bash
cd ~/GEAv3/database
./quick-csv-check.sh
```

**Expected Output:**
```
✓ entity-master.txt:
  Size: 4716 bytes
  Lines: 67              ← Should be > 1 (not just header)
  Header: unique_entity_id,entity_name,...
  First data row: MIN-001,"Ministry of..."
```

**If you see:**
- Lines: 1 → **FILES ARE EMPTY!** (only headers)
- Size: < 500 bytes → **FILES MISSING DATA!**

### Step 2: Check Current Database State

```bash
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT
    (SELECT COUNT(*) FROM entity_master) as entities,
    (SELECT COUNT(*) FROM service_master) as services,
    (SELECT COUNT(*) FROM service_attachments) as attachments;
"
```

### Step 3: Run Full Diagnostic

```bash
cd ~/GEAv3/database
./diagnose-azure-csv.sh
```

This will show:
- ✓ File existence and sizes
- ✓ Line endings (CRLF vs LF)
- ✓ File encoding
- ✓ CSV headers
- ✓ Docker container access
- ✓ PostgreSQL COPY command test

## Solutions

### Solution 1: CSV Files Are Empty

**Problem:** Files exist but have no data rows.

**Fix:**
```bash
# On Azure VM, check if master-data/cleaned/ directory has data
cd ~/GEAv3/database
ls -lh master-data/cleaned/

# If files are empty, you need to:
# 1. Copy files from local machine, OR
# 2. Re-generate them from source data
```

**To copy from local to Azure:**
```bash
# On your local machine:
cd /path/to/local/GEAv3
scp -r database/master-data/cleaned/* azureuser@your-azure-ip:~/GEAv3/database/master-data/cleaned/
```

### Solution 2: Line Ending Issues

**Problem:** Files have Windows line endings (CRLF).

**Fix:**
```bash
# Install dos2unix if not available
sudo apt-get install dos2unix

# Convert all CSV files
cd ~/GEAv3/database/master-data/cleaned
dos2unix *.txt

# Verify
file *.txt  # Should show "ASCII text" not "CRLF"
```

### Solution 3: Database Already Has Data

**Problem:** Previous load succeeded, re-running fails due to ON CONFLICT.

**Fix:**
```bash
# Clear and reload
cd ~/GEAv3/database
./99-consolidated-setup.sh --reload

# The --reload flag should:
# 1. Clear all data
# 2. Load master data
# 3. Generate synthetic data
# 4. Verify everything
```

### Solution 4: Permission Issues

**Problem:** Docker can't read files due to permissions.

**Fix:**
```bash
cd ~/GEAv3/database/master-data/cleaned
chmod 644 *.txt
ls -la  # Should show -rw-r--r--
```

## Testing the Fix

After applying fixes, test with:

```bash
cd ~/GEAv3/database

# Method 1: Full reload
./99-consolidated-setup.sh --reload

# Method 2: Load master data only
./scripts/11-load-master-data.sh --clear

# Method 3: Manual verification
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT 'entities' as table_name, COUNT(*) FROM entity_master
UNION ALL
SELECT 'services', COUNT(*) FROM service_master
UNION ALL
SELECT 'attachments', COUNT(*) FROM service_attachments;
"
```

**Expected Output:**
```
  table_name  | count
--------------+-------
 entities     |    66
 services     |   167
 attachments  |   177
```

## Common Errors and Fixes

### Error: "0 entities loaded"

**Cause:** CSV file is empty or has only headers

**Fix:** Check CSV content with `./quick-csv-check.sh`

### Error: "INSERT 0 0" in logs

**Cause:** ON CONFLICT DO NOTHING - data already exists

**Fix:** Clear data first: `./scripts/10-clear-all-data.sh --yes`

### Error: No error message, just 0 rows

**Cause:** Error suppression was hiding the real error (NOW FIXED)

**Fix:** With updated scripts, you'll see actual PostgreSQL errors

## Verification

After successful load, check analytics dashboard:

```bash
# Check if application can see the data
curl http://localhost:3000/api/analytics/summary
```

Should return JSON with actual counts, not zeros.

## Files Modified to Show Errors

These files have been updated to show PostgreSQL errors instead of hiding them:

- `database/lib/csv-loader.sh` - Lines 30, 59, 88
  - Changed: `> /dev/null 2>&1`
  - To: Capture and display error output

## Need More Help?

Run the diagnostic script and share output:

```bash
cd ~/GEAv3/database
./diagnose-azure-csv.sh > /tmp/diagnostic-report.txt 2>&1
cat /tmp/diagnostic-report.txt
```

The diagnostic will identify the exact issue.
