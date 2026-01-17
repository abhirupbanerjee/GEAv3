# Database Backup & Safety Features

## Overview

The consolidated setup script now includes comprehensive safety features to protect your data during destructive operations.

---

## Safety Features Summary

### ✅ **1. Mandatory Backup Before Fresh Setup**
- Backup is **required** before `--fresh` operations
- If backup fails, the script **aborts** the operation
- No destructive actions are taken without a successful backup

### ✅ **2. Automatic Recovery on Failure**
- If fresh setup fails, you're offered to restore from safety backup
- One-command restoration to previous state
- Manual restore option if automatic recovery is declined

### ✅ **3. Pre-Restore Safety Backup**
- Before any restore, current database is backed up
- Allows recovery if restore doesn't work as expected
- Named with `_pre_restore` suffix for easy identification

### ✅ **4. Multiple Confirmation Steps**
- User must explicitly confirm destructive operations
- Two-step confirmation for fresh setup and restore
- Can cancel at any point

---

## Detailed Behavior

### Fresh Setup (`--fresh`)

#### **Scenario 1: Normal Fresh Setup (Success)**

```bash
./database/99-consolidated-setup.sh --fresh
```

**Flow:**
```
1. Check existing tables (31 tables found)
2. ⚠️  Warn user about DROP operation
3. ❓ Ask: "Continue? (yes/NO)"
4. ✓ User confirms: "yes"
5. ℹ️  Creating mandatory backup...
6. ✓ Backup created: /tmp/gea_backups/feedback_backup_20251125_143000_consolidated.sql (176K)
7. ℹ️  Running master initialization...
8. ✓ Fresh database setup completed!
```

**Result:** ✅ Database recreated, old data backed up

---

#### **Scenario 2: Backup Fails Before Fresh Setup**

```bash
./database/99-consolidated-setup.sh --fresh
```

**Flow:**
```
1. Check existing tables (31 tables found)
2. ⚠️  Warn user about DROP operation
3. ❓ Ask: "Continue? (yes/NO)"
4. ✓ User confirms: "yes"
5. ℹ️  Creating mandatory backup...
6. ✗ Backup creation FAILED! Cannot proceed with destructive operation.
7. ✗ Fix the backup issue before running --fresh
8. Script exits (NO DATA LOST)
```

**Result:** ✅ **Script stops, database unchanged**

**Common causes:**
- No disk space in `/tmp/`
- Database container not responding
- Permission issues

**Fix:**
```bash
# Check disk space
df -h /tmp

# Check container
docker ps | grep feedback_db

# Try backup alone to debug
./database/99-consolidated-setup.sh --backup
```

---

#### **Scenario 3: Fresh Setup Fails (with Automatic Recovery)**

```bash
./database/99-consolidated-setup.sh --fresh
```

**Flow:**
```
1. ✓ Backup created: feedback_backup_20251125_143000_consolidated.sql
2. ℹ️  Running master initialization...
3. ✗ Fresh database setup FAILED!
4. ⚠️  A safety backup was created before the operation
5. ❓ Do you want to restore from safety backup? (yes/no)
6. ✓ User types: "yes"
7. ℹ️  Restoring from safety backup...
8. ✓ Database restored from safety backup
9. ℹ️  Your database is back to the state before fresh setup was attempted
```

**Result:** ✅ **Database restored to pre-fresh state automatically**

---

#### **Scenario 4: Fresh Setup Fails (Manual Recovery)**

```bash
./database/99-consolidated-setup.sh --fresh
```

**Flow:**
```
1. ✓ Backup created: feedback_backup_20251125_143000_consolidated.sql
2. ℹ️  Running master initialization...
3. ✗ Fresh database setup FAILED!
4. ⚠️  A safety backup was created before the operation
5. ❓ Do you want to restore from safety backup? (yes/no)
6. ✗ User types: "no"
7. ℹ️  Database left in current state
8. ℹ️  To restore manually, run:
      ./database/99-consolidated-setup.sh --restore
      Then select: feedback_backup_20251125_143000_consolidated.sql
```

**Result:** Database left as-is, user can restore manually later

---

### Restore Operation (`--restore`)

#### **Scenario 1: Normal Restore (Success)**

```bash
./database/99-consolidated-setup.sh --restore
```

**Flow:**
```
1. ℹ️  Available backups (most recent first):
     1) 2025-11-25 14:30:00  [176K]
     2) 2025-11-25 12:00:00  [164K]
2. ❓ Select backup number (1-2) or 'q' to quit: 1
3. ❓ Are you sure? This will OVERWRITE current data! (yes/no): yes
4. ℹ️  Creating safety backup of current database before restore...
5. ✓ Safety backup created: feedback_backup_20251125_144500_pre_restore.sql
6. ℹ️  Restoring database from backup...
7. ✓ Database restored successfully!
8. ℹ️  Your previous database was backed up to:
      /tmp/gea_backups/feedback_backup_20251125_144500_pre_restore.sql
```

**Result:** ✅ **Database restored, previous state backed up**

---

#### **Scenario 2: Restore Fails (with Automatic Recovery)**

```bash
./database/99-consolidated-setup.sh --restore
```

**Flow:**
```
1. ✓ Safety backup created: feedback_backup_20251125_144500_pre_restore.sql
2. ℹ️  Restoring database from backup...
3. ✗ Failed to restore database!
4. ℹ️  Attempting to restore from safety backup...
5. ✓ Restored from safety backup
```

**Result:** ✅ **Automatic recovery to pre-restore state**

---

### Regular Backup (`--backup`)

#### **Scenario 1: Backup Success**

```bash
./database/99-consolidated-setup.sh --backup
```

**Flow:**
```
1. ℹ️  Creating backup...
2. ✓ Backup created: /tmp/gea_backups/feedback_backup_20251125_143000_consolidated.sql (176K)
```

**Result:** ✅ **Backup created successfully**

---

#### **Scenario 2: Backup Fails (Optional Backup)**

```bash
./database/99-consolidated-setup.sh --backup
```

**Flow:**
```
1. ℹ️  Creating backup...
2. ⚠️  Backup creation had issues, but continuing...
```

**Result:** ⚠️ **Backup failed, but script continues** (non-critical for standalone --backup)

---

## Backup Types

### 1. **Regular Backup** (`_consolidated`)
```
feedback_backup_20251125_143000_consolidated.sql
```
- Created with `--backup` flag
- Created automatically before `--fresh` (mandatory)
- Optional for other operations

### 2. **Pre-Restore Safety Backup** (`_pre_restore`)
```
feedback_backup_20251125_144500_pre_restore.sql
```
- Created automatically before every restore
- Allows rollback if restore fails
- Automatically used for recovery if restore fails

### 3. **Master Init Backup** (`_master_init`)
```
feedback_backup_20251125_120000_master_init.sql
```
- Created by `00-master-init.sh` during initialization
- Automatic safety backup during schema updates

---

## Safety Matrix

| Operation | Backup Created? | Mandatory? | Auto-Recovery? |
|-----------|----------------|------------|----------------|
| `--fresh` | ✅ Yes | ✅ Yes | ✅ Yes (on failure) |
| `--update` | ❌ No | ❌ No | ❌ No |
| `--restore` | ✅ Yes (pre-restore) | ✅ Yes | ✅ Yes (on failure) |
| `--backup` | ✅ Yes | ✅ Yes* | ❌ N/A |
| `--load-*` | ❌ No | ❌ No | ❌ No |

*Mandatory for the backup operation itself, but non-fatal

---

## Configuration

### Backup Location

**Default:** `/tmp/gea_backups/`

**Change location:**
```bash
export BACKUP_DIR="/home/azureuser/database_backups"
./database/99-consolidated-setup.sh --fresh
```

**Permanent change:**
Edit `database/99-consolidated-setup.sh`:
```bash
BACKUP_DIR="/home/azureuser/database_backups"  # Change this line
```

---

## Best Practices

### 1. **Before Production Deployment**
```bash
# Create backup first
./database/99-consolidated-setup.sh --backup

# Copy to safe location
cp /tmp/gea_backups/feedback_backup_$(date +%Y%m%d)*.sql ~/prod_backups/

# Then deploy
./database/99-consolidated-setup.sh --update
```

### 2. **Regular Backup Schedule**
```bash
# Add to crontab
0 2 * * * cd /path/to/project && ./database/99-consolidated-setup.sh --backup
```

### 3. **Keep Multiple Backup Generations**
```bash
# Keep last 7 daily backups
find /tmp/gea_backups/ -name "feedback_backup_*_consolidated.sql" -mtime +7 -delete
```

### 4. **Archive Old Backups**
```bash
# Monthly archive
tar -czf gea_backups_$(date +%Y%m).tar.gz /tmp/gea_backups/*.sql
mv gea_backups_*.tar.gz ~/archives/
```

### 5. **Test Restore Regularly**
```bash
# Test on non-production system
./database/99-consolidated-setup.sh --backup
./database/99-consolidated-setup.sh --restore  # Select latest
./database/99-consolidated-setup.sh --verify   # Verify data
```

---

## Troubleshooting

### Issue: "Backup creation FAILED"

**Symptoms:**
```
✗ Backup creation FAILED! Cannot proceed with destructive operation.
```

**Causes & Solutions:**

1. **No disk space**
   ```bash
   df -h /tmp
   # If full, clean up or change BACKUP_DIR
   ```

2. **Container not responding**
   ```bash
   docker ps | grep feedback_db
   docker logs feedback_db --tail 50
   # Restart if needed: docker-compose restart feedback_db
   ```

3. **Permission issues**
   ```bash
   ls -ld /tmp/gea_backups/
   # Should be writable by your user
   ```

4. **Database connection issues**
   ```bash
   docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT 1"
   ```

---

### Issue: "Failed to restore database"

**Symptoms:**
```
✗ Failed to restore database!
ℹ Attempting to restore from safety backup...
```

**What happens:**
- Script automatically attempts to restore from pre-restore safety backup
- If successful, you're back to where you started
- If that fails too, backup file location is provided for manual recovery

**Manual recovery:**
```bash
# If automatic recovery fails
docker exec -i feedback_db psql -U feedback_user -d postgres << 'EOF'
DROP DATABASE IF EXISTS feedback;
CREATE DATABASE feedback OWNER feedback_user;
EOF

docker exec -i feedback_db psql -U feedback_user -d feedback < /tmp/gea_backups/feedback_backup_YYYYMMDD_HHMMSS_pre_restore.sql
```

---

### Issue: Fresh setup partially completed

**Symptoms:**
- Some tables created, others missing
- Database in inconsistent state

**Solution:**
```bash
# Use safety backup to restore
./database/99-consolidated-setup.sh --restore

# Select the safety backup created before fresh setup
# (look for timestamp just before the failed operation)
```

---

## Command Reference

### Create Backup
```bash
./database/99-consolidated-setup.sh --backup
```

### Fresh Setup (with mandatory backup)
```bash
./database/99-consolidated-setup.sh --fresh
```

### Restore from Backup (with pre-restore safety backup)
```bash
./database/99-consolidated-setup.sh --restore
```

### View Backups (without restoring)
```bash
./database/99-consolidated-setup.sh --restore
# Press 'q' when prompted
```

### Manual Backup Location
```bash
ls -lht /tmp/gea_backups/
```

---

## Safety Guarantees

### ✅ **What's Protected:**

1. **Fresh Setup**
   - ✅ Backup created before any tables are dropped
   - ✅ If backup fails, fresh setup is aborted (data safe)
   - ✅ If fresh setup fails, automatic restore offered
   - ✅ Manual restore option always available

2. **Restore Operation**
   - ✅ Current database backed up before restore
   - ✅ If restore fails, automatic rollback to current state
   - ✅ Previous state always preserved in pre-restore backup

3. **Backup Operation**
   - ✅ Creates point-in-time snapshot
   - ✅ Stored outside database (filesystem)
   - ✅ Can be copied to remote storage

### ⚠️ **What's NOT Protected:**

1. **Update Operation** (`--update`)
   - ❌ No automatic backup (incremental changes assumed safe)
   - ℹ️  Recommendation: Run `--backup` first manually

2. **Load Data Operations** (`--load-*`)
   - ❌ No automatic backup
   - ℹ️  Data additions, not destructive

3. **Manual SQL Commands**
   - ❌ No protection for direct psql commands
   - ℹ️  Always backup before manual operations

---

## Recovery Time Objectives (RTO)

| Scenario | Recovery Time | Steps |
|----------|---------------|-------|
| Fresh setup fails | ~30 seconds | Automatic restore from safety backup |
| Restore fails | ~30 seconds | Automatic rollback to pre-restore state |
| Manual restore | ~1-2 minutes | Select backup from list, confirm restore |
| Backup corruption | ~2-5 minutes | Select older backup from list |

---

## Example Workflows

### Safe Fresh Setup Workflow
```bash
# 1. Verify current state
./database/99-consolidated-setup.sh --verify

# 2. Create explicit backup
./database/99-consolidated-setup.sh --backup

# 3. Copy backup to safe location (optional)
cp /tmp/gea_backups/feedback_backup_*.sql ~/critical_backups/

# 4. Run fresh setup (creates another backup automatically)
./database/99-consolidated-setup.sh --fresh

# 5. Verify new state
./database/99-consolidated-setup.sh --verify
```

### Disaster Recovery Workflow
```bash
# 1. List available backups
./database/99-consolidated-setup.sh --restore
# Press 'q' to just view

# 2. Select and restore
./database/99-consolidated-setup.sh --restore
# Select appropriate backup
# Confirm with "yes"

# 3. Verify restored data
./database/99-consolidated-setup.sh --verify
```

---

---

## Admin UI Backup Management (January 2026)

In addition to command-line backup operations, administrators can now manage backups directly from the web interface.

### Accessing Backup Management

1. Sign in to the Admin Portal
2. Navigate to **Settings → Database** tab
3. View, create, download, restore, and delete backups

### UI Features

| Feature | Description |
|---------|-------------|
| **Backup List** | View all backups with filename, date, size, type |
| **Create Backup** | One-click manual backup creation |
| **Download** | Download backup files to local computer |
| **Restore** | Restore database with safety confirmation |
| **Delete** | Remove old backup files |
| **Scheduled Backups** | Configure daily/weekly/monthly automatic backups |
| **Retention Policy** | Auto-delete old backups based on age or count |

### Safety Confirmation for Restore

The UI requires typing **"RESTORE DATABASE"** exactly to confirm restore operations, preventing accidental data loss.

### Audit Logging

All backup operations performed through the UI are logged to `backup_audit_log` table:
- Action type (create, download, restore, delete, scheduled)
- User who performed the action
- Timestamp
- IP address
- Duration
- Success/failure status

### Related API Endpoints

```
GET  /api/admin/backups              - List all backups
POST /api/admin/backups              - Create new backup
GET  /api/admin/backups/[filename]   - Get backup info
DELETE /api/admin/backups/[filename] - Delete backup
GET  /api/admin/backups/[filename]/download - Download backup
POST /api/admin/backups/[filename]/restore  - Restore from backup
```

---

**Script Version:** v8.0+
**Safety Features Added:** November 25, 2025
**Admin UI Added:** January 16, 2026
**Maintained By:** GEA Portal Development Team
