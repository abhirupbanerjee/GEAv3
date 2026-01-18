# GEA Portal - Database Management Guide for DBAs

> **Version:** 9.2
> **Last Updated:** January 2026
> **For:** Database Administrators, DevOps, System Administrators

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Command Reference](#command-reference)
3. [Documentation Guide](#documentation-guide)
4. [Data Management Workflows](#data-management-workflows)
5. [Backup & Restore Operations](#backup--restore-operations)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### First Time Setup

```bash
cd /home/ab/Projects/gogeaportal/v3

# Start database container
docker-compose up -d feedback_db

# Option 1: Complete fresh setup with master data
./database/99-consolidated-setup.sh --fresh --load-master --generate-data

# Option 2: Use reload for quick data reset
./database/99-consolidated-setup.sh --reload
```

### Daily Operations

```bash
# Quick data reload (most common)
./database/99-consolidated-setup.sh --reload

# Backup before changes
./database/99-consolidated-setup.sh --backup

# Verify database health
./database/99-consolidated-setup.sh --verify
```

---

## 📖 Command Reference

### Main Orchestrator: `99-consolidated-setup.sh`

#### Schema & Setup Commands

| Command | Description | Use When |
|---------|-------------|----------|
| `--fresh` | Drop and recreate entire database | Schema changes, major updates |
| `--update` | Incremental schema updates | Minor schema updates |

#### Data Management Commands (NEW v9.0)

| Command | Description | Auto-Confirm | Duration |
|---------|-------------|--------------|----------|
| `--reload` | Complete workflow: clear → load → generate → verify | ✅ Yes | ~2-3 min |
| `--clear-data` | Clear all master and transactional data | ✅ Yes | ~10 sec |
| `--load-master` | Load production master data (66 entities, 167 services) | ✅ Yes | ~30 sec |
| `--generate-data` | Generate synthetic test data (360+ records) | ✅ Yes | ~1 min |

#### Backup & Verification

| Command | Description | Output Location |
|---------|-------------|-----------------|
| `--backup` | Create database backup | `/tmp/gea_backups/` |
| `--restore` | Interactive restore menu | N/A |
| `--verify` | Comprehensive health check | Terminal |
| `--compare` | Compare with production | Terminal |

#### Other Commands

| Command | Description |
|---------|-------------|
| `--create-admin` | Create admin user interactively |
| `--load-basic` | Load basic reference data |
| `--load-test` | Load legacy test data (50 items) |
| `--load-dta` | Load DTA operational data |
| `--help` | Show complete help |

---

## 📚 Documentation Guide

### Core Documentation (in `docs/` folder)

| Document | When to Use | Key Sections |
|----------|-------------|--------------|
| **[DATABASE_SETUP_GUIDE.md](docs/DATABASE_SETUP_GUIDE.md)** | Initial setup, schema deployment | Prerequisites, Installation, Configuration |
| **[MASTER_DATA_WORKFLOW.md](docs/MASTER_DATA_WORKFLOW.md)** | Adding/updating master data | Data format, Validation, Loading process |
| **[BACKUP_SAFETY_FEATURES.md](docs/BACKUP_SAFETY_FEATURES.md)** | Understanding backup/recovery | Scenarios, Recovery workflows, Safety guarantees |
| **[RESTORE_BACKUP_GUIDE.md](docs/RESTORE_BACKUP_GUIDE.md)** | Restoring from backups | Interactive restore, Manual restore, Troubleshooting |
| **[QUICK_START_MASTER_DATA.md](docs/QUICK_START_MASTER_DATA.md)** | Quick reference for data reload | TL;DR commands, Common questions |
| **[DATABASE_REFERENCE.md](docs/DATABASE_REFERENCE.md)** | Schema reference, queries | Table schemas, Relationships, Example queries |

### When to Read What

#### **🆕 New DBA Onboarding**
1. Read [DATABASE_SETUP_GUIDE.md](docs/DATABASE_SETUP_GUIDE.md) first
2. Review [QUICK_START_MASTER_DATA.md](docs/QUICK_START_MASTER_DATA.md)
3. Familiarize with [DATABASE_REFERENCE.md](docs/DATABASE_REFERENCE.md)

#### **🔄 Regular Operations**
- Quick reference: [QUICK_START_MASTER_DATA.md](docs/QUICK_START_MASTER_DATA.md)
- Data updates: [MASTER_DATA_WORKFLOW.md](docs/MASTER_DATA_WORKFLOW.md)

#### **💾 Backup/Restore Operations**
- Planning: [BACKUP_SAFETY_FEATURES.md](docs/BACKUP_SAFETY_FEATURES.md)
- Execution: [RESTORE_BACKUP_GUIDE.md](docs/RESTORE_BACKUP_GUIDE.md)

#### **🔍 Troubleshooting**
- Check [BACKUP_SAFETY_FEATURES.md](docs/BACKUP_SAFETY_FEATURES.md) → "Troubleshooting" section
- Check [RESTORE_BACKUP_GUIDE.md](docs/RESTORE_BACKUP_GUIDE.md) → "Troubleshooting" section

---

## 🗂️ Data Management Workflows

### Workflow 1: Fresh Data Load (First Time)

**Use Case:** Setting up a new environment, clean state

```bash
# Step 1: Initialize schema
./database/99-consolidated-setup.sh --fresh

# Step 2: Load your master data + generate test data
./database/99-consolidated-setup.sh --load-master --generate-data

# Step 3: Verify
./database/99-consolidated-setup.sh --verify
```

**What You Get:**
- Clean database schema (35 tables)
- Your production master data (66 entities, 167 services, 177 attachments)
- Synthetic test data (200 feedback, 50 grievances, 80 tickets)

---

### Workflow 2: Quick Data Reload (Most Common)

**Use Case:** Testing, daily development, demo environment reset

```bash
# One command does everything!
./database/99-consolidated-setup.sh --reload
```

**What It Does:**
1. ✅ Clears all master and transactional data
2. ✅ Loads fresh master data (auto-clears default sample data)
3. ✅ Generates new synthetic test data
4. ✅ Runs comprehensive verification

**Duration:** ~2-3 minutes

---

### Workflow 3: Update Master Data Only

**Use Case:** New entities/services added, master data changes

```bash
# Option A: Clear existing data first (recommended)
./database/99-consolidated-setup.sh --clear-data --load-master

# Option B: Keep existing, add new (handles duplicates)
./database/99-consolidated-setup.sh --load-master
```

**Master Data Location:**
- Source files: `database/master-data/`
- Cleaned files: `database/master-data/cleaned/`

---

### Workflow 4: Add Master Data (Bulk Upload)

#### Step 1: Prepare Your Data Files

Create CSV files in `database/master-data/` folder:

**entity-master.txt** (7 columns):
```csv
unique_entity_id,entity_name,entity_type,parent_entity_id,contact_email,contact_phone,is_active
MIN-017,Ministry of New Affairs,ministry,,,,TRUE
```

**service-master.txt** (6 columns):
```csv
service_id,service_name,entity_id,service_category,service_description,is_active
SVC-NEW-001,New Service,MIN-017,administrative_services,Description here,TRUE
```

**service-attachments.txt** (7 columns):
```csv
service_id,filename,file_extension,is_mandatory,description,sort_order,is_active
SVC-NEW-001,ID Card,.pdf,TRUE,National ID card copy,1,TRUE
```

#### Step 2: Clean Your Data

```bash
cd database/master-data

# Remove blank lines and standardize booleans
awk 'NF > 0' entity-master.txt | sed 's/True/TRUE/g; s/False/FALSE/g' > cleaned/entity-master.txt
awk 'NF > 0' service-master.txt | sed 's/True/TRUE/g; s/False/FALSE/g' > cleaned/service-master.txt
awk 'NF > 0' service-attachments.txt | sed 's/True/TRUE/g; s/False/FALSE/g' > cleaned/service-attachments.txt
```

**Important CSV Format Rules:**
- ✅ Empty fields: Use empty string between commas (e.g., `,,`)
- ✅ Multiple empty fields: `ministry,,,,TRUE` (parent_entity_id, contact_email, contact_phone all empty)
- ✅ With parent: `department,DEPT-001,,,TRUE` (entity has parent, empty contacts)
- ✅ Quoted fields: Use double quotes for names with commas: `"Ministry of Finance, Trade & Development"`
- ❌ Don't skip commas for empty fields

#### Step 3: Load the Data

```bash
cd /home/ab/Projects/gogeaportal/v3

# Option 1: Replace all existing master data
./database/99-consolidated-setup.sh --clear-data --load-master

# Option 2: Add to existing (handles duplicates with ON CONFLICT)
./database/99-consolidated-setup.sh --load-master
```

#### Step 4: Verify

```bash
./database/99-consolidated-setup.sh --verify

# Or check specific counts
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT 'Entities' AS table_name, COUNT(*) FROM entity_master
UNION ALL SELECT 'Services', COUNT(*) FROM service_master
UNION ALL SELECT 'Attachments', COUNT(*) FROM service_attachments;
"
```

---

### Workflow 5: Incremental Master Data Updates

**Use Case:** Add new entities/services without clearing existing data

```bash
# 1. Add new rows to your CSV files in database/master-data/

# 2. Clean the files
cd database/master-data
awk 'NF > 0' entity-master.txt > cleaned/entity-master.txt
# (repeat for other files)

# 3. Load without clearing (ON CONFLICT DO NOTHING handles duplicates)
cd /home/ab/Projects/gogeaportal/v3
./database/scripts/11-load-master-data.sh --skip

# 4. Verify new data
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT entity_name, entity_type FROM entity_master
ORDER BY created_at DESC LIMIT 10;
"
```

---

## 💾 Backup & Restore Operations

### Create Backup

```bash
# Manual backup
./database/99-consolidated-setup.sh --backup

# Backup with custom location
export BACKUP_DIR="/home/azureuser/backups"
./database/99-consolidated-setup.sh --backup
```

**Output:**
```
✓ Backup created: /tmp/gea_backups/feedback_backup_20251125_143000_consolidated.sql (176K)
```

---

### Restore from Backup (Interactive)

```bash
./database/99-consolidated-setup.sh --restore
```

**Interactive Menu:**
```
ℹ Available backups (most recent first):

  1) 2025-11-25 14:30:00  [176K]  (feedback_backup_20251125_143000_consolidated.sql)
  2) 2025-11-25 12:00:00  [164K]  (feedback_backup_20251125_120000_consolidated.sql)
  3) 2025-11-24 18:45:22  [158K]  (feedback_backup_20251124_184522_pre_restore.sql)

Select backup number to restore (1-3) or 'q' to quit: 1

Are you sure you want to restore this backup? This will OVERWRITE current data! (yes/no): yes

ℹ Creating safety backup of current database before restore...
✓ Safety backup created: feedback_backup_20251125_150000_pre_restore.sql
✓ Database restored successfully!
```

**Safety Features:**
- ✅ Creates pre-restore safety backup automatically
- ✅ Can rollback if restore fails
- ✅ Two-step confirmation required

---

### Backup Types

| Type | Naming Pattern | Created By | Purpose |
|------|----------------|------------|---------|
| **Consolidated** | `feedback_backup_YYYYMMDD_HHMMSS_consolidated.sql` | `--backup` flag or `--fresh` | Regular backups |
| **Pre-Restore** | `feedback_backup_YYYYMMDD_HHMMSS_pre_restore.sql` | `--restore` operation | Safety before restore |
| **Master Init** | `feedback_backup_YYYYMMDD_HHMMSS_master_init.sql` | Schema initialization | Schema change backup |

---

### Backup Location

**Default:** `/tmp/gea_backups/`

**⚠️ Warning:** Files in `/tmp/` may be deleted on system reboot.

**For Production - Set Permanent Location:**

```bash
# Option 1: Environment variable
export BACKUP_DIR="/home/azureuser/gea_backups"
./database/99-consolidated-setup.sh --backup

# Option 2: Edit config.sh permanently
vi database/config.sh
# Change: export BACKUP_DIR="${BACKUP_DIR:-/your/path/here}"
```

**Backup Schedule (Recommended):**

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * cd /home/ab/Projects/gogeaportal/v3 && ./database/99-consolidated-setup.sh --backup

# Keep last 7 days, delete older
0 3 * * * find /tmp/gea_backups/ -name "feedback_backup_*_consolidated.sql" -mtime +7 -delete
```

---

### Manual Restore (Without Script)

```bash
# 1. List available backups
ls -lht /tmp/gea_backups/

# 2. Drop and recreate database
docker exec -i feedback_db psql -U feedback_user -d postgres << 'EOF'
DROP DATABASE IF EXISTS feedback;
CREATE DATABASE feedback OWNER feedback_user;
EOF

# 3. Restore from specific backup
docker exec -i feedback_db psql -U feedback_user -d feedback < /tmp/gea_backups/feedback_backup_20251125_143000_consolidated.sql

# 4. Verify
docker exec -it feedback_db psql -U feedback_user -d feedback -c "\dt"
```

---

### Automated Backup Before Destructive Operations

**Built-in Safety:**

| Operation | Automatic Backup | Mandatory? | Recovery |
|-----------|------------------|------------|----------|
| `--fresh` | ✅ Yes | ✅ Yes (aborts if fails) | ✅ Auto-offered on failure |
| `--restore` | ✅ Yes (pre-restore) | ✅ Yes | ✅ Auto-rollback on failure |
| `--update` | ❌ No | ❌ No | ℹ️ Manual backup recommended |
| `--reload` | ❌ No (uses --clear-data) | ❌ No | ℹ️ Fast operation, no backup |

**Best Practice:**

```bash
# Always backup before major changes
./database/99-consolidated-setup.sh --backup
# Then make your changes
./database/99-consolidated-setup.sh --update
```

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"

```bash
# Check container status
docker ps | grep feedback_db

# If not running, start it
docker-compose up -d feedback_db

# Wait for readiness
sleep 5

# Retry operation
```

---

### Issue: "Backup creation FAILED"

**Common Causes:**

1. **No disk space:**
```bash
df -h /tmp
# If full, clean up or change BACKUP_DIR
```

2. **Container not responding:**
```bash
docker logs feedback_db --tail 50
docker-compose restart feedback_db
```

---

### Issue: "Missing file: entity-master.txt"

```bash
# Check file location
ls -la database/master-data/cleaned/

# Files should exist:
# - entity-master.txt
# - service-master.txt
# - service-attachments.txt

# If missing, check original files
ls -la database/master-data/
```

---

### Issue: CSV Load Errors

**Error:** `missing data for column "is_active"`

**Cause:** Incorrect number of commas in CSV

**Fix:**
```bash
# Count fields in your CSV
head -2 database/master-data/entity-master.txt

# Should have 7 columns:
# unique_entity_id,entity_name,entity_type,parent_entity_id,contact_email,contact_phone,is_active

# Example correct formats:
# Empty contacts: MIN-001,"Name",ministry,,,,TRUE  (4 commas after "ministry")
# With parent:    DEPT-001,"Name",department,MIN-001,,,TRUE  (3 commas after parent ID)
```

---

### Issue: Default Sample Data Keeps Loading

**Solution:** The new scripts auto-detect and clear default sample data (4 entities, 14 services).

```bash
# This now happens automatically:
./database/99-consolidated-setup.sh --load-master

# Output shows:
# ℹ Detected default sample data - auto-clearing...
# ✓ Default sample data cleared
```

---

## 🎯 Common Admin Tasks

### Daily Health Check

```bash
./database/99-consolidated-setup.sh --verify
```

### Weekly Backup

```bash
./database/99-consolidated-setup.sh --backup

# Copy to safe location
cp /tmp/gea_backups/feedback_backup_$(date +%Y%m%d)*.sql ~/weekly_backups/
```

### Monthly Cleanup

```bash
# Remove old backups (keep last 30 days)
find /tmp/gea_backups/ -name "*.sql" -mtime +30 -delete

# Archive important backups
tar -czf gea_backups_$(date +%Y%m).tar.gz /tmp/gea_backups/*.sql
mv gea_backups_*.tar.gz ~/archives/
```

### Performance Check

```bash
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup AS rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"
```

---

## 📞 Support & Resources

### Quick Links

- **GitHub Issues:** https://github.com/your-repo/issues
- **Team Slack:** #database-support
- **Documentation:** `database/docs/`

### Emergency Contacts

- **DBA Lead:** [contact@example.com]
- **DevOps:** [devops@example.com]
- **On-Call:** [oncall@example.com]

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 9.2 | 2026-01-17 | Updated table count to 35; Verified against production (sla_breaches, ticket_notes) |
| 9.1 | 2026-01-17 | Added system tables (ai_bots, system_settings, etc.) |
| 9.0 | 2025-11-25 | Added --reload, --clear-data, --load-master flags; Reorganized directory structure; Auto-detect default sample data |
| 8.0 | 2025-11-24 | Added --restore with interactive menu; Mandatory backups for --fresh |
| 7.0 | 2025-11-20 | Initial consolidated script |

---

**Last Updated:** January 2026
**Maintained By:** GEA Portal Development Team
**Script Version:** 99-consolidated-setup.sh v9.2
