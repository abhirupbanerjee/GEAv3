# Ticket Activity Timeline & Resolution Comments - Deployment Guide

## Features Implemented

### 1. Admin Dashboard Activity Tracking
- **Problem Solved:** Admin dashboard error "relation 'ticket_activity' does not exist"
- **Solution:** Added `ticket_activity` table to track all ticket changes

### 2. Public Ticket Activity Timeline
- **Feature:** Citizens can view activity history on their tickets
- **Privacy:** Internal admin notes are hidden for open/in-progress tickets

### 3. Resolution Comments (New Feature)
- **Feature:** When tickets are resolved/closed, the last admin internal note is shared with citizens
- **Display:** Shown as a highlighted "Resolution Comment" with green styling
- **Purpose:** Provides transparency on why/how the ticket was resolved

---

## Database Schema (v6.2)

The `ticket_activity` table tracks all ticket activities:

```sql
CREATE TABLE ticket_activity (
    activity_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,  -- 'created', 'status_change', 'priority_change', 'internal_note'
    performed_by VARCHAR(255),            -- Username or 'system'
    description TEXT,                      -- Human-readable description
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Activity Types:**
- `created` - Ticket was created
- `status_change` - Status was updated (e.g., Open → In Progress)
- `priority_change` - Priority was modified
- `internal_note` - Admin comment (private until ticket resolved/closed)

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

### Step 4: Rebuild and Restart Frontend
```bash
cd /home/azureuser/GEAv3
docker compose build frontend
docker compose up -d frontend
```

### Step 5: Test the Features

#### A. Test Admin Dashboard
1. Go to: https://gea.abhirup.app/admin/tickets
2. Click "View" on any ticket (e.g., #202511-307933)
3. **Expected Result:** Modal opens successfully with ticket details
4. **Verify:**
   - ✅ Ticket information displayed
   - ✅ Activity timeline shows all activities
   - ✅ "Add Internal Note" section works
   - ✅ Status/priority changes are logged
   - ✅ No errors

#### B. Test Public Ticket View (Open/In-Progress Tickets)
1. Go to: https://gea.abhirup.app/helpdesk/ticket/[ticket-number]
2. View an **open** or **in-progress** ticket
3. **Expected Result:**
   - ✅ Activity timeline is visible
   - ✅ Shows ticket created, status changes, priority changes
   - ✅ Internal notes are **hidden** (not visible to public)

#### C. Test Resolution Comments (Resolved/Closed Tickets)
1. In admin dashboard, add an internal note to a ticket
2. Change ticket status to "Resolved" or "Closed"
3. View the ticket publicly: https://gea.abhirup.app/helpdesk/ticket/[ticket-number]
4. **Expected Result:**
   - ✅ Activity timeline shows all public activities
   - ✅ **Last internal note is displayed** as "Resolution Comment"
   - ✅ Resolution comment has:
     - Green background and border
     - "Resolution Comment" badge
     - ✅ checkmark icon
     - Admin's explanation of resolution

---

## Files Changed

### 1. Database Schema
**File:** `database/01-init-db.sh` (v6.1 → v6.2)

**Added:**
- **ticket_activity table** (lines 330-337)
  - Tracks all ticket changes (status, priority, notes)
  - Foreign key to tickets table
  - Indexes for fast queries (ticket_id, created_at DESC)

- **ticket_attachments table** (lines 359-371)
  - Stores file attachments for tickets
  - File size validation (max 5 MB)
  - Foreign key to tickets table

- **Initial data seeding** (lines 344-354)
  - Creates "Ticket created" activity for all existing tickets
  - Uses original ticket `created_at` timestamp
  - Idempotent (won't duplicate if run again)

### 2. Backend API Updates

**File:** `frontend/src/app/api/helpdesk/ticket/[ticketNumber]/route.ts`

**Changes:**
- Added smart activity filtering based on ticket status
- **For open/in-progress tickets:** Excludes all internal notes
- **For resolved/closed tickets:** Includes last internal note as "resolution_comment"
- Uses UNION query to combine public activities with resolution comment

### 3. Frontend Components

**File:** `frontend/src/app/helpdesk/ticket/[ticketNumber]/page.tsx`

**Changes:**
- Added `TicketActivity` interface
- Imported `ActivityTimeline` component
- Added state management for activities array
- Integrated activity timeline display in public ticket view

**File:** `frontend/src/components/admin/tickets/ActivityTimeline.tsx`

**Changes:**
- Added `resolution_comment` activity type with ✅ icon
- Added special styling for resolution comments (green background, badge)
- Support for `display_type` field (API-driven type override)
- Backwards compatible with existing activity types

### 4. Dependencies

**File:** `frontend/package.json`

**Added:**
- `"swr": "^2.3.6"` - Data fetching and caching library

---

## Architecture Overview

### Activity Visibility Logic

```
┌─────────────────────────────────────────────────────────────┐
│ Ticket Status: OPEN or IN PROGRESS                          │
├─────────────────────────────────────────────────────────────┤
│ Public View Shows:                                          │
│   ✅ Ticket created                                         │
│   ✅ Status changes                                         │
│   ✅ Priority changes                                       │
│   ❌ Internal notes (HIDDEN)                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Ticket Status: RESOLVED or CLOSED                           │
├─────────────────────────────────────────────────────────────┤
│ Public View Shows:                                          │
│   ✅ Ticket created                                         │
│   ✅ Status changes                                         │
│   ✅ Priority changes                                       │
│   ✅ LAST internal note → "Resolution Comment"             │
└─────────────────────────────────────────────────────────────┘
```

### API Response Structure

**Open/In-Progress Tickets:**
```json
{
  "success": true,
  "ticket": { /* ticket details */ },
  "activities": [
    {
      "activity_id": 1,
      "activity_type": "created",
      "display_type": "created",
      "description": "Ticket created",
      "performed_by": "system",
      "created_at": "2025-11-22T10:00:00Z"
    }
    // No internal notes included
  ]
}
```

**Resolved/Closed Tickets:**
```json
{
  "success": true,
  "ticket": { /* ticket details */ },
  "activities": [
    {
      "activity_id": 5,
      "activity_type": "internal_note",
      "display_type": "resolution_comment",  // ← Relabeled for display
      "description": "Issue resolved by restarting the service",
      "performed_by": "admin",
      "created_at": "2025-11-22T15:30:00Z"
    },
    {
      "activity_id": 4,
      "activity_type": "status_change",
      "display_type": "status_change",
      "description": "Status changed to Resolved",
      "performed_by": "admin",
      "created_at": "2025-11-22T15:29:00Z"
    }
    // ... other public activities
  ]
}
```

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
✅ **Smart privacy controls** (internal notes hidden until resolution)
✅ **Transparent resolution process** (citizens see final explanation)

The init script detects existing tables and only creates what's missing.

---

## Best Practices for Admins

### When Resolving/Closing Tickets:

1. **Add a final internal note** explaining:
   - What action was taken
   - Why the ticket is being resolved
   - Any follow-up information for the citizen

2. **Then change status** to "Resolved" or "Closed"

3. **This final note becomes visible** to the citizen as a "Resolution Comment"

**Example Internal Note:**
```
The issue was caused by a temporary service outage on Nov 22.
We have restarted the affected service and confirmed it is
now operational. If you continue to experience issues,
please submit a new ticket.
```

This note will be displayed to the citizen with green highlighting and a "Resolution Comment" badge.

---

**Date:** November 22, 2025
**Version:** v6.2
**Status:** ✅ Deployed and Tested
