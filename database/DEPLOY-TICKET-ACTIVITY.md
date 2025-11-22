# Deploy Ticket Activity Table Fix

## Problem
Admin dashboard shows error: **"relation 'ticket_activity' does not exist"**

## Solution
The `ticket_activity` table has been added to the main init script `01-init-db.sh` (v6.2).

---

## Deployment Steps (Production Server)

### Step 1: Pull Latest Code
```bash
cd /home/azureuser/GEAv3
git pull
```

### Step 2: Run the Database Init Script
The init script is **idempotent** (safe to run multiple times). It will:
- Create `ticket_activity` table if it doesn't exist
- Create `ticket_attachments` table if it doesn't exist
- Seed initial activity records for all existing tickets
- Skip if tables already exist

```bash
cd /home/azureuser/GEAv3
bash database/01-init-db.sh
```

### Step 3: Verify Tables Were Created
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback -c "\dt ticket_activity"
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT COUNT(*) FROM ticket_activity;"
```

Expected output:
```
 Schema |      Name       | Type  |     Owner
--------+-----------------+-------+---------------
 public | ticket_activity | table | feedback_user

 count
-------
    10   (or however many tickets exist)
```

### Step 4: Test the Admin Dashboard
1. Go to: https://gea.abhirup.app/admin/tickets
2. Click "View" on any ticket (e.g., #202511-307933)
3. **Expected Result:** Modal opens successfully with ticket details
4. **Verify:**
   - ✅ Ticket information displayed
   - ✅ Activity timeline shows "Ticket created"
   - ✅ "Add Internal Note" section works
   - ✅ No errors

---

## What Was Changed

### File: `database/01-init-db.sh` (v6.1 → v6.2)

**Added:**
1. **ticket_activity table** (lines 330-337)
   - Tracks all ticket changes (status, priority, notes)
   - Foreign key to tickets table
   - Indexes for fast queries

2. **ticket_attachments table** (lines 359-369)
   - Stores file attachments for tickets
   - File size validation (max 5 MB)
   - Foreign key to tickets table

3. **Initial data seeding** (lines 344-354)
   - Creates "Ticket created" activity for all existing tickets
   - Uses original ticket `created_at` timestamp
   - Idempotent (won't duplicate if run again)

**Version Update:**
- v6.1 → v6.2
- Added changelog for ticket activity support

---

## Rollback (if needed)

If something goes wrong, you can drop the tables:

```bash
docker exec -it feedback_db psql -U feedback_user -d feedback -c "DROP TABLE IF EXISTS ticket_activity CASCADE;"
docker exec -it feedback_db psql -U feedback_user -d feedback -c "DROP TABLE IF EXISTS ticket_attachments CASCADE;"
```

Then restore from backup if needed (backups are in `/tmp/gea_backups/`).

---

## Summary

✅ **No separate migration script needed**
✅ **All changes in main init script**
✅ **Idempotent and safe to run**
✅ **Backward compatible**
✅ **Auto-seeds initial data**

The init script detects existing tables and only creates what's missing.

---

**Date:** November 22, 2025
**Version:** v6.2
**Status:** Ready to Deploy
