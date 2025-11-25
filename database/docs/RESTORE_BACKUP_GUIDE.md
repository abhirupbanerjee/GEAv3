# Database Backup and Restore Guide

## Overview

The consolidated setup script now includes an interactive restore feature that allows you to:
- View all available backups (sorted by most recent first)
- Select a backup to restore
- Automatically creates a safety backup before restoring
- Provides detailed restore confirmation

---

## Creating a Backup

```bash
./database/99-consolidated-setup.sh --backup
```

**Output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║  GEA PORTAL - CONSOLIDATED DATABASE SETUP v8.0                    ║
╚═══════════════════════════════════════════════════════════════════╝

ℹ Checking prerequisites...
✓ Container 'feedback_db' is running
ℹ Creating backup...
✓ Backup created: /tmp/gea_backups/feedback_backup_20251125_141450_consolidated.sql (176K)
```

**Backups are stored in:** `/tmp/gea_backups/`

---

## Restoring from Backup

### Interactive Restore

```bash
./database/99-consolidated-setup.sh --restore
```

### Example Restore Session

```
╔═══════════════════════════════════════════════════════════════════╗
║  GEA PORTAL - CONSOLIDATED DATABASE SETUP v8.0                    ║
╚═══════════════════════════════════════════════════════════════════╝

ℹ Checking prerequisites...
✓ Container 'feedback_db' is running

╔═══════════════════════════════════════════════════════════════════╗
║ DATABASE RESTORE
╚═══════════════════════════════════════════════════════════════════╝

ℹ Available backups (most recent first):

   1) 2025-11-25 14:14:50  [176K]  (feedback_backup_20251125_141450_consolidated.sql)
   2) 2025-11-25 12:30:15  [164K]  (feedback_backup_20251125_123015_consolidated.sql)
   3) 2025-11-24 18:45:22  [158K]  (feedback_backup_20251124_184522_pre_restore.sql)
   4) 2025-11-24 15:20:10  [142K]  (feedback_backup_20251124_152010_consolidated.sql)
   5) 2025-11-23 10:15:30  [135K]  (feedback_backup_20251123_101530_consolidated.sql)

⚠ WARNING: Restoring will OVERWRITE the current database!

Select backup number to restore (1-5) or 'q' to quit: 1

ℹ Selected backup: feedback_backup_20251125_141450_consolidated.sql

Are you sure you want to restore this backup? This will OVERWRITE current data! (yes/no): yes

ℹ Creating safety backup of current database before restore...
✓ Safety backup created: /tmp/gea_backups/feedback_backup_20251125_142030_pre_restore.sql

ℹ Restoring database from backup...
✓ Database restored successfully!

ℹ Restored database summary:

 tables | users | ea_requests | grievances | feedback
--------+-------+-------------+------------+----------
     31 |     6 |          10 |         29 |       88
(1 row)

✓ Restore complete!

ℹ Your previous database was backed up to:
  /tmp/gea_backups/feedback_backup_20251125_142030_pre_restore.sql
```

---

## Features

### 1. **Sorted by Date (Most Recent First)**
Backups are listed with the newest at the top, making it easy to restore to the most recent state.

### 2. **Formatted Display**
- Backup number (for easy selection)
- Formatted date/time (YYYY-MM-DD HH:MM:SS)
- File size
- Original filename

### 3. **Safety Backup**
Before restoring, the current database is automatically backed up to:
```
/tmp/gea_backups/feedback_backup_YYYYMMDD_HHMMSS_pre_restore.sql
```

This allows you to revert if the restore doesn't work as expected.

### 4. **Two Confirmation Steps**
1. Select the backup number
2. Confirm with "yes" to proceed

This prevents accidental overwrites.

### 5. **Automatic Recovery**
If the restore fails, the script automatically attempts to restore from the safety backup.

### 6. **Cancel Anytime**
- Type `q` or `Q` when selecting to quit
- Type anything other than "yes" at confirmation to cancel

---

## Backup File Naming Convention

Backups follow this naming pattern:
```
feedback_backup_YYYYMMDD_HHMMSS_[type].sql
```

**Types:**
- `consolidated` - Regular backup created with --backup
- `pre_restore` - Safety backup created before restore
- `master_init` - Backup created during master initialization

**Example:**
```
feedback_backup_20251125_141450_consolidated.sql
                └─────────┬────────┘└───┬───┘
                     Date (YYYYMMDD)   Time (HHMMSS)
```

---

## Backup Location

**Default location:** `/tmp/gea_backups/`

**Note:** Files in `/tmp/` may be deleted on system reboot. For production backups, consider:

1. **Copy to permanent storage:**
   ```bash
   cp /tmp/gea_backups/*.sql ~/database_backups/
   ```

2. **Set custom backup directory:**
   ```bash
   export BACKUP_DIR="/home/azureuser/gea_backups"
   ./database/99-consolidated-setup.sh --backup
   ```

3. **Archive old backups:**
   ```bash
   tar -czf gea_backups_$(date +%Y%m).tar.gz /tmp/gea_backups/*.sql
   mv gea_backups_*.tar.gz ~/archives/
   ```

---

## Viewing Available Backups

Without running the script:
```bash
ls -lht /tmp/gea_backups/
```

**Output:**
```
total 1.2M
-rw-rw-r-- 1 user user 176K Nov 25 14:14 feedback_backup_20251125_141450_consolidated.sql
-rw-rw-r-- 1 user user 164K Nov 25 12:30 feedback_backup_20251125_123015_consolidated.sql
-rw-rw-r-- 1 user user 158K Nov 24 18:45 feedback_backup_20251124_184522_pre_restore.sql
-rw-rw-r-- 1 user user 142K Nov 24 15:20 feedback_backup_20251124_152010_consolidated.sql
```

---

## Manual Restore (Without Script)

If you need to restore manually:

```bash
# 1. Drop and recreate database
docker exec -i feedback_db psql -U feedback_user -d postgres << 'EOF'
DROP DATABASE IF EXISTS feedback;
CREATE DATABASE feedback OWNER feedback_user;
EOF

# 2. Restore from backup file
docker exec -i feedback_db psql -U feedback_user -d feedback < /tmp/gea_backups/feedback_backup_20251125_141450_consolidated.sql

# 3. Verify
docker exec -i feedback_db psql -U feedback_user -d feedback -c "\dt"
```

---

## Best Practices

### 1. **Regular Backups**
Create backups before major operations:
```bash
# Before fresh setup
./database/99-consolidated-setup.sh --backup

# Then do fresh setup
./database/99-consolidated-setup.sh --fresh --load-dta
```

### 2. **Pre-Production Backup**
Always backup before deploying to production:
```bash
./database/99-consolidated-setup.sh --backup
```

### 3. **Keep Multiple Versions**
Don't delete old backups immediately. Keep at least:
- Last 3 daily backups
- Last 4 weekly backups
- Last 3 monthly backups (for production)

### 4. **Test Restore Process**
Periodically test that your backups can be restored:
```bash
# 1. Create backup
./database/99-consolidated-setup.sh --backup

# 2. Make a change
docker exec -i feedback_db psql -U feedback_user -d feedback -c "INSERT INTO entity_master ..."

# 3. Restore backup
./database/99-consolidated-setup.sh --restore

# 4. Verify change was rolled back
```

### 5. **Document Important Backups**
Rename critical backups for easy identification:
```bash
cp /tmp/gea_backups/feedback_backup_20251125_141450_consolidated.sql \
   /tmp/gea_backups/feedback_backup_BEFORE_MAJOR_UPDATE_v3.0.sql
```

---

## Troubleshooting

### Issue: "No backup files found"
**Solution:**
```bash
# Check backup directory
ls -lh /tmp/gea_backups/

# Create a backup first
./database/99-consolidated-setup.sh --backup
```

### Issue: "Failed to restore database"
The script will automatically attempt to restore from the safety backup.

**Manual recovery:**
```bash
# Find the pre_restore backup
ls -lt /tmp/gea_backups/*pre_restore*

# Manually restore
docker exec -i feedback_db psql -U feedback_user -d postgres << 'EOF'
DROP DATABASE IF EXISTS feedback;
CREATE DATABASE feedback OWNER feedback_user;
EOF

docker exec -i feedback_db psql -U feedback_user -d feedback < /tmp/gea_backups/feedback_backup_YYYYMMDD_HHMMSS_pre_restore.sql
```

### Issue: "Container not running"
**Solution:**
```bash
# Start the database container
docker-compose up -d feedback_db

# Wait for it to be ready
sleep 5

# Retry restore
./database/99-consolidated-setup.sh --restore
```

### Issue: Backup file corrupted
**Symptoms:** Restore fails with SQL errors

**Solution:**
1. Try an older backup
2. Check backup file size (should not be 0 bytes)
3. Verify backup content:
   ```bash
   head -20 /tmp/gea_backups/feedback_backup_20251125_141450_consolidated.sql
   ```
   Should start with PostgreSQL dump header

---

## Workflow Examples

### Development Workflow
```bash
# 1. Backup current state
./database/99-consolidated-setup.sh --backup

# 2. Test new feature
# ... make changes ...

# 3. If something breaks, restore
./database/99-consolidated-setup.sh --restore
# Select most recent backup
```

### Production Deployment Workflow
```bash
# 1. Backup production database
./database/99-consolidated-setup.sh --backup

# 2. Copy backup to safe location
cp /tmp/gea_backups/feedback_backup_$(date +%Y%m%d_*)_consolidated.sql \
   ~/production_backups/pre_deploy_$(date +%Y%m%d).sql

# 3. Deploy updates
./database/99-consolidated-setup.sh --update

# 4. Verify
./database/99-consolidated-setup.sh --verify

# 5. If issues, restore
./database/99-consolidated-setup.sh --restore
```

### Data Recovery Workflow
```bash
# 1. List available backups
./database/99-consolidated-setup.sh --restore
# Press 'q' to just view list

# 2. Restore to specific point in time
./database/99-consolidated-setup.sh --restore
# Select backup by number

# 3. Verify recovered data
./database/99-consolidated-setup.sh --verify
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `--backup` | Create backup only |
| `--restore` | Interactive restore menu |
| `--backup --verify` | Backup and verify |
| `--fresh --backup` | Backup before fresh setup |

**Backup location:** `/tmp/gea_backups/`

**Safety backup:** Created automatically before every restore with `_pre_restore` suffix

---

## Additional Notes

- **Backups are PostgreSQL SQL dumps** (not binary format)
- **Backups include schema + data** (complete database state)
- **Backups are human-readable** (can be inspected with text editor)
- **Backups are portable** (can be restored on different systems)
- **Restore requires database to be dropped** (destructive operation)
- **Safety backup ensures no data loss** (unless both restores fail)

---

**Script Version:** v8.0+
**Last Updated:** November 25, 2025
**Maintained By:** GEA Portal Development Team
