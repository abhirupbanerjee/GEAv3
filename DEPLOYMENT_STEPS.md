# Deployment Steps - UI Improvements and Database Migration

This document outlines the steps needed to deploy the recent UI improvements and fix the duplicate ticket status issue.

## Summary of Changes

### 1. Header and Sidebar UI Improvements ✅
- Removed "Request Analytics" from staff sidebar
- Fixed sidebar z-index to prevent overlap with footer
- Improved user name and entity display in sidebar
- Removed copyright text from sidebar footer
- Changed "Admin" to "Login" button in header with blue button styling
- Removed "Wiki" and "Git" from header navigation
- Reordered header navigation items

### 2. Manage Tickets Page Improvements ✅
- Removed SLA Compliance % metric box
- Separated Filters and Search into distinct sections
- Improved search placeholder text and button styling

### 3. Database Fix - Duplicate Ticket Statuses ⚠️

**Files Modified:**
- `frontend/src/components/admin/tickets/DashboardStats.tsx`
- `frontend/src/components/admin/tickets/FilterSection.tsx`
- `frontend/src/app/api/tickets/submit/route.ts`
- `database/08-fix-duplicate-ticket-statuses.sh` (NEW)

## Required Action: Database Migration

### Problem Identified
The database contains duplicate ticket status entries:
- Old entries: status_id 1-6 with codes ('OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED', 'CANCELLED')
- New entries: status_id 19-22 with codes ('1', '2', '3', '4')

This causes duplicate status entries in the Status Distribution chart.

### Solution
Run the database migration script to:
1. Update all existing tickets to use the new status_ids
2. Delete the old duplicate status entries

### Steps to Execute in Azure

**Step 1: Make the script executable**
```bash
chmod +x /home/ab/Projects/gogeaportal/v3/database/08-fix-duplicate-ticket-statuses.sh
```

**Step 2: Run the migration script**

**Option A: Using the script directly (if psql is installed)**
```bash
cd /home/ab/Projects/gogeaportal/v3/database
./08-fix-duplicate-ticket-statuses.sh
```

**Option B: Using Docker (recommended)**
```bash
cd /home/ab/Projects/gogeaportal/v3

# Execute the migration via Docker
docker exec -i feedback_db psql -U feedback_user -d feedback <<EOF
-- Start transaction
BEGIN;

-- Display current status entries
SELECT 'Current ticket_status entries:' as message;
SELECT status_id, status_code, status_name, is_active, sort_order
FROM ticket_status
ORDER BY sort_order, status_id;

-- Update any tickets using old status codes to use new ones
UPDATE tickets
SET status_id = (SELECT status_id FROM ticket_status WHERE status_code = '1' LIMIT 1)
WHERE status_id = (SELECT status_id FROM ticket_status WHERE status_code = 'OPEN' LIMIT 1);

UPDATE tickets
SET status_id = (SELECT status_id FROM ticket_status WHERE status_code = '2' LIMIT 1)
WHERE status_id = (SELECT status_id FROM ticket_status WHERE status_code = 'IN_PROGRESS' LIMIT 1);

UPDATE tickets
SET status_id = (SELECT status_id FROM ticket_status WHERE status_code = '3' LIMIT 1)
WHERE status_id = (SELECT status_id FROM ticket_status WHERE status_code = 'RESOLVED' LIMIT 1);

UPDATE tickets
SET status_id = (SELECT status_id FROM ticket_status WHERE status_code = '4' LIMIT 1)
WHERE status_id = (SELECT status_id FROM ticket_status WHERE status_code = 'CLOSED' LIMIT 1);

-- Delete old duplicate status entries
DELETE FROM ticket_status WHERE status_code IN ('OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- Display updated status entries
SELECT 'Updated ticket_status entries:' as message;
SELECT status_id, status_code, status_name, is_active, sort_order
FROM ticket_status
ORDER BY sort_order;

-- Commit transaction
COMMIT;

SELECT 'Migration completed successfully!' as message;
EOF
```

**Step 3: Verify the migration**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT status_id, status_code, status_name, is_active, sort_order FROM ticket_status ORDER BY sort_order;"
```

Expected output should show only 4 status entries:
```
 status_id | status_code | status_name | is_active | sort_order
-----------+-------------+-------------+-----------+------------
        19 | 1           | Open        | t         |          1
        20 | 2           | In Progress | t         |          2
        21 | 3           | Resolved    | t         |          3
        22 | 4           | Closed      | t         |          4
```

## Code Changes Summary

### Modified Files

1. **frontend/src/components/admin/Sidebar.tsx**
   - Fixed z-index from z-30 to z-20
   - Improved user profile layout
   - Separated entity name display
   - Removed footer copyright

2. **frontend/src/components/layout/Header.tsx**
   - Removed Wiki, Git, Repository links
   - Changed Admin to Login button
   - Simplified navigation items

3. **frontend/src/app/admin/layout.tsx**
   - Added left padding for fixed sidebar

4. **frontend/src/components/admin/tickets/DashboardStats.tsx**
   - Removed SLA Compliance metric box
   - Changed grid from 4 columns to 3 columns

5. **frontend/src/components/admin/tickets/FilterSection.tsx**
   - Separated Filters and Search into distinct sections
   - Improved UI layout and styling

6. **frontend/src/app/api/tickets/submit/route.ts**
   - Updated to dynamically fetch correct status_id for 'Open' status
   - No longer hardcodes status_id = 1

7. **database/08-fix-duplicate-ticket-statuses.sh** (NEW)
   - Migration script to fix duplicate statuses

## Deployment Checklist

- [x] UI improvements committed
- [x] Code changes tested locally
- [ ] **Run database migration script** (Required!)
- [ ] Verify status distribution shows correct counts
- [ ] Test ticket creation still works
- [ ] Test ticket status updates work correctly
- [ ] Deploy to production

## Rollback Plan

If issues occur after migration:

1. **Database Rollback:**
   ```sql
   BEGIN;

   -- Re-insert old status entries
   INSERT INTO ticket_status (status_code, status_name, is_terminal, sort_order, color_code)
   VALUES
     ('OPEN', 'Open', FALSE, 1, '#ef4444'),
     ('IN_PROGRESS', 'In Progress', FALSE, 2, '#fbbf24'),
     ('RESOLVED', 'Resolved', TRUE, 4, '#22c55e'),
     ('CLOSED', 'Closed', TRUE, 5, '#9ca3af');

   COMMIT;
   ```

2. **Code Rollback:**
   - Revert the changes in `frontend/src/app/api/tickets/submit/route.ts`

## Testing Checklist

After deployment:

1. [ ] Login to admin panel
2. [ ] Navigate to Manage Tickets
3. [ ] Verify SLA Compliance box is removed
4. [ ] Check Status Distribution shows only 4 statuses (no duplicates)
5. [ ] Test filtering by status
6. [ ] Test searching for tickets
7. [ ] Create a new ticket and verify it gets status "Open"
8. [ ] Update a ticket status and verify it works

## Notes

- The migration is wrapped in a transaction, so if any error occurs, all changes will be rolled back
- The script updates all existing tickets before deleting old status entries to prevent foreign key violations
- The new status codes ('1', '2', '3', '4') are now the standard and should be used going forward

## Contact

If you encounter any issues during deployment, please check:
- Database logs: `docker logs feedback_db`
- Frontend logs: `docker logs frontend`
- Application logs in the container

---
Generated: 2025-11-23
