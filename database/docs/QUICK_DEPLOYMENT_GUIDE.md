# Quick Azure VM Deployment Guide

## TL;DR - One Command Setup

```bash
ssh azureuser@20.163.156.219 'cd ~/GEAv3 && git pull && cd database && ./99-consolidated-setup.sh --fresh'
```

---

## Step-by-Step (If You Prefer)

### 1. Connect to Azure VM
```bash
ssh azureuser@20.163.156.219
```

### 2. Update Code
```bash
cd ~/GEAv3
git pull origin main
```

### 3. Run Fresh Setup
```bash
cd database
./99-consolidated-setup.sh --fresh
```

**When prompted:**
- Confirm backup: `yes`
- Confirm fresh setup: `yes`
- Enter admin email: `your@email.com`
- Enter admin name: `Your Name`
- Generate synthetic data: `yes`

---

## What Gets Fixed Automatically

✅ All 8 authentication tables created (was only 3 before)
✅ Schema auto-migrated (contact columns added)
✅ 66 entities loaded (was 0 before)
✅ Admin user created and verified (was failing before)
✅ Synthetic data generated

---

## Expected Output Snippets

### Authentication Tables
```
✓ user_roles table created with default roles
✓ users table created with indexes
✓ accounts table created
✓ sessions table created
✓ verification_tokens table created
✓ entity_user_assignments table created
✓ user_permissions table created
✓ user_audit_log table created
```

### Schema Migration (Automatic)
```
▶ Step 2.5: Verifying entity_master schema...
⚠ Schema migration required: Adding contact columns to entity_master
✓ Added contact_email column
✓ Added contact_phone column
✓ Schema migration completed successfully
```

### Master Data
```
✓ Entity master loaded (66 entities)
✓ Service master loaded (167 services)
✓ Service attachments loaded (177 attachments)
```

### Admin User
```
╔═══════════════════════════════════════════════════════════════════╗
║     ✓ ADMIN USER CREATED SUCCESSFULLY                            ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Verification (After Setup)

```bash
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public') as tables,
    (SELECT COUNT(*) FROM entity_master) as entities,
    (SELECT COUNT(*) FROM users) as users;
"
```

**Expected:**
```
 tables | entities | users
--------+----------+-------
     35 |       66 |     1
```

---

## If Something Goes Wrong

### Restore from Backup
```bash
cd ~/GEAv3/database
./99-consolidated-setup.sh --restore
```

### Check Logs
```bash
# Container running?
docker ps | grep feedback_db

# Database accessible?
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT version();"

# Recent backups?
ls -lh ~/GEAv3/database/backups/
```

---

## Time Estimate

- Fresh setup: **5-8 minutes**
- Includes backup, schema migration, data loading, and verification

---

## Changes Made (For Reference)

1. **04-nextauth-users.sh v2.0** - Fixed HEREDOC failures in auth table creation
2. **05-add-initial-admin.sh v2.0** - Fixed HEREDOC failures in user creation
3. **11-load-master-data.sh v2.1** - Added automatic schema migration

All integrated into `99-consolidated-setup.sh` - no extra steps needed!

---

**Last Updated:** January 2026
**Status:** ✅ Ready for Production
**Tested:** ✅ All fixes verified locally
