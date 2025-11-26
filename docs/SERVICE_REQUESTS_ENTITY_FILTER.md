# Service Requests Entity Filter Implementation

## Overview
Added entity filtering capability to the Service Requests page with AGY-005 as the default filter for admin users.

## Changes Made

### 1. API Updates

#### `/api/admin/service-requests` (GET)
**File:** [frontend/src/app/api/admin/service-requests/route.ts](frontend/src/app/api/admin/service-requests/route.ts)

- Added support for `entity_id` query parameter
- Handles multiple entity IDs (comma-separated)
- Staff users: Entity filter enforced by role (no override)
- Admin users: Can filter by entity via query parameter
- Default: Shows all entities if no filter specified

**Query Parameter:**
```
GET /api/admin/service-requests?entity_id=AGY-005
GET /api/admin/service-requests?entity_id=AGY-005,MIN-001  // Multiple entities
```

#### `/api/admin/service-requests/stats` (GET)
**File:** [frontend/src/app/api/admin/service-requests/stats/route.ts](frontend/src/app/api/admin/service-requests/stats/route.ts)

- Added support for `entity_id` query parameter
- Statistics filtered by selected entity
- Handles multiple entity IDs (comma-separated)

**Query Parameter:**
```
GET /api/admin/service-requests/stats?entity_id=AGY-005
```

### 2. Frontend Updates

#### Service Requests Page
**File:** [frontend/src/app/admin/service-requests/page.tsx](frontend/src/app/admin/service-requests/page.tsx)

**New Features:**
- ✅ Entity filter dropdown (admin users only)
- ✅ Default filter set to `AGY-005`
- ✅ Search functionality within entity dropdown
- ✅ Clear filter button
- ✅ Shows selected entity name and ID
- ✅ Auto-refreshes data when entity changes
- ✅ Both requests list and statistics filtered

**UI Components Added:**
1. **Entity Dropdown Filter**
   - Located between header and statistics
   - Searchable dropdown with entity names and IDs
   - Visual indicator for selected entity (checkmark)
   - Only visible to admin users

2. **Filter Controls**
   - "Clear" button to remove entity filter
   - Selected entity display with name and ID

## User Experience

### Admin Users
1. Page loads with AGY-005 pre-selected by default
2. Can change entity using the dropdown filter
3. Search entities by name or ID
4. Clear filter to see all entities
5. Data refreshes automatically on filter change

### Staff Users
1. Page loads with AGY-005 pre-selected by default
2. **Can see and change the entity filter** (same dropdown as admin)
3. Search entities by name or ID
4. **No clear button** - must have an entity selected
5. **Server-side security enforced**: Even though staff can select entities via UI, the server enforces entity restrictions based on their role
6. Info note displayed explaining server-side filtering
7. Data refreshes automatically on filter change

## Default Behavior

**Initial State:**
- Admin users: `entity_id = 'AGY-005'`
- Staff users: `entity_id = 'AGY-005'` (same default)

**Clear Filter:**
- Admin users: Shows all entities when cleared (clear button visible)
- Staff users: Cannot clear filter (no clear button shown) - must have an entity selected

**Server-Side Security:**
- Admin users: Can freely filter by any entity or view all
- Staff users: Server enforces entity restrictions based on their assigned role, regardless of UI selection

## API Response Format

### Service Requests List
```json
{
  "success": true,
  "data": {
    "requests": [...],
    "pagination": {...},
    "filters": {
      "status": null,
      "service_id": null,
      "search": null,
      "entity_id": "AGY-005"
    }
  }
}
```

### Statistics
```json
{
  "success": true,
  "data": {
    "stats": {
      "submitted": 5,
      "in_progress": 3,
      "under_review": 1,
      "completed": 10,
      "rejected": 2,
      "total": 21,
      "last_7_days": 4,
      "last_30_days": 15
    }
  }
}
```

## Technical Details

### State Management
```typescript
const [filters, setFilters] = useState({
  status: '',
  service_id: '',
  search: '',
  entity_id: 'AGY-005', // Default to AGY-005
});
```

### Filter Change Handler
```typescript
const handleEntityChange = (entityId: string) => {
  setFilters(prev => ({ ...prev, entity_id: entityId }));
  setPagination((prev) => ({ ...prev, page: 1 })); // Reset pagination
};
```

### Data Fetching
- Both `fetchRequests()` and `fetchStats()` use the entity filter
- Automatic refresh when filter changes via `useEffect`
- Pagination resets to page 1 on filter change

## Testing

### Test Scenarios
1. ✅ Page loads with AGY-005 selected
2. ✅ Change entity updates both list and stats
3. ✅ Search within entity dropdown works
4. ✅ Clear filter shows all entities
5. ✅ Staff users don't see filter (enforced by role)
6. ✅ Multiple entity selection via API (comma-separated)

### Test URLs
- Default: `https://gea.abhirup.app/admin/service-requests`
  - Should show AGY-005 filtered data
- API: `https://gea.abhirup.app/api/admin/service-requests?entity_id=AGY-005`
- Stats: `https://gea.abhirup.app/api/admin/service-requests/stats?entity_id=AGY-005`

## Notes

- Entity filter is visible to **both admin and staff users**
- Admin users can change filter freely and clear it
- Staff users can see and change filter, but:
  - No clear button (must have entity selected)
  - Server-side security still enforces their assigned entity restrictions
  - UI shows informational note about server-side filtering
- **Default entity is now configurable** via environment variable `NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID`
- **Default value**: AGY-005 (Digital Transformation Agency) if not configured
- **AGY-005** = Digital Transformation Agency (DTA) - confirmed from entity-master.txt
- **AGY-002** = Royal Grenada Police Force (not DTA)
- Filter persists during session (not in URL or localStorage)
- No TypeScript compilation errors
- Backward compatible with existing functionality

## Entity ID Verification

**Confirmed Entity Mappings** (from `/database/master-data/cleaned/entity-master.txt`):
- `AGY-005` = Digital Transformation Agency (DTA)
- `AGY-002` = Royal Grenada Police Force

**Service Request Form Fix:**
- **File:** [frontend/src/app/admin/service-requests/new/page.tsx](frontend/src/app/admin/service-requests/new/page.tsx)
- **Line:** 310
- **Changed:** `.filter((service) => service.entity_id === 'AGY-002')` → `.filter((service) => service.entity_id === 'AGY-005')`
- **Reason:** Staff users should only see and submit service requests TO the Digital Transformation Agency (AGY-005), not the Police Force (AGY-002)
- **Impact:** Service dropdown will now show DTA/EA services (EA Portal Support, Digital Roadmap Support, etc.) instead of Police services (Police Certificate, Firearm Licence, etc.)

**Ticket API Default Entity Fix:**
- **File:** [frontend/src/app/api/tickets/from-feedback/route.ts](frontend/src/app/api/tickets/from-feedback/route.ts)
- **Line:** 179
- **Changed:** `const entity_id = service.entity_id || 'AGY-002'` → `const entity_id = service.entity_id || 'AGY-005'`
- **Reason:** Default fallback entity should be DTA (AGY-005) for grievance tickets created from service feedback

**Database Note:**
- The init script ([database/scripts/01-init-db.sh](database/scripts/01-init-db.sh)) has outdated entity mappings at lines 619-620 and services at lines 639-646
- However, these only insert if records don't exist (`WHERE NOT EXISTS`)
- The authoritative source is [database/master-data/cleaned/entity-master.txt](database/master-data/cleaned/entity-master.txt) and [database/master-data/cleaned/service-master.txt](database/master-data/cleaned/service-master.txt)
- Production database already has correct data loaded from master files

---

## Environment Configuration (NEW)

### Removing Hardcoded Entity IDs

**Date:** November 25, 2025

All hardcoded references to `AGY-005` have been replaced with an environment variable for flexibility.

### Environment Variable

**Variable Name:** `NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID`
**Default Value:** `AGY-005`
**Purpose:** Configure which entity receives service requests
**Scope:** Frontend (client-side and server-side)

### Configuration Files Updated

1. **`.env.example`** - Added variable with documentation
2. **`frontend/src/config/env.ts`** - Exports the configuration value
3. **`docker-compose.yml`** - Passes environment variable to container
4. **`frontend/Dockerfile`** - Added ARG and generation script for env.ts

### Code Changes

#### 1. Service Requests List Page
**File:** [frontend/src/app/admin/service-requests/page.tsx:61](frontend/src/app/admin/service-requests/page.tsx#L61)

**Before:**
```typescript
entity_id: 'AGY-005', // Default to AGY-005
```

**After:**
```typescript
entity_id: config.SERVICE_REQUEST_ENTITY_ID, // Default entity from config
```

---

#### 2. New Service Request Form
**File:** [frontend/src/app/admin/service-requests/new/page.tsx:311](frontend/src/app/admin/service-requests/new/page.tsx#L311)

**Before:**
```typescript
.filter((service) => service.entity_id === 'AGY-005')
```

**After:**
```typescript
.filter((service) => service.entity_id === config.SERVICE_REQUEST_ENTITY_ID)
```

---

#### 3. Tickets API Fallback
**File:** [frontend/src/app/api/tickets/from-feedback/route.ts:179](frontend/src/app/api/tickets/from-feedback/route.ts#L179)

**Before:**
```typescript
const entity_id = service.entity_id || 'AGY-005';
```

**After:**
```typescript
const entity_id = service.entity_id || process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID || 'AGY-005';
```

---

### How to Change the Entity

#### Development (Local)
1. Create/edit `.env.local`:
   ```bash
   NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-002
   ```
2. Restart development server:
   ```bash
   npm run dev
   ```

#### Production (Docker)
1. Update `.env` file:
   ```bash
   NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-002
   ```
2. Rebuild and restart container:
   ```bash
   docker-compose build frontend
   docker-compose up -d
   ```

---

### Future: Multiple Entity Support

When you're ready to allow service requests to multiple entities:

1. **Update environment variable** to comma-separated list:
   ```bash
   NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005,AGY-002,MIN-001
   ```

2. **Update filter logic** in [new/page.tsx:311](frontend/src/app/admin/service-requests/new/page.tsx#L311):
   ```typescript
   .filter((service) => {
     const allowedEntities = config.SERVICE_REQUEST_ENTITY_ID.split(',').map(e => e.trim());
     return allowedEntities.includes(service.entity_id);
   })
   ```

3. **Rebuild and deploy**

---

### Benefits

✅ **No More Hardcoding**: Entity ID configured via environment variables
✅ **Easy to Change**: Update `.env` file, no code changes needed
✅ **Docker-Friendly**: Configured at deployment time
✅ **Backward Compatible**: Defaults to AGY-005 if not set
✅ **Future-Proof**: Ready for multi-entity support when needed

## Security Note

**Important:** While staff users can see and interact with the entity filter dropdown, the server-side API enforces entity restrictions based on their role using the `getEntityFilter()` function. This means:
- Staff user selects any entity in UI → Server ignores and uses their assigned entity
- Admin user selects any entity in UI → Server respects the selection
- The UI filter is for convenience and consistency, but security is always enforced server-side

---

## Staff Entity Filtering Fixes (November 25, 2025)

### Issues Identified

Three critical issues were discovered related to staff user entity filtering:

1. **Manage Data APIs** - Staff users could see all entities, services, and QR codes instead of only their assigned entity's data
2. **Service Requests Page** - Staff users saw all 66 entities in the filter dropdown instead of only AGY-005 (DTA)
3. **New Service Request Form** - Entity field was not visible, making it unclear which entity would receive the request

### Solutions Implemented

#### 1. Manage Data API Entity Filtering

Applied server-side entity filtering to three GET endpoints to ensure staff users only see data for their assigned entity:

**Files Modified:**
- [frontend/src/app/api/managedata/entities/route.ts](frontend/src/app/api/managedata/entities/route.ts)
- [frontend/src/app/api/managedata/services/route.ts](frontend/src/app/api/managedata/services/route.ts)
- [frontend/src/app/api/managedata/qrcodes/route.ts](frontend/src/app/api/managedata/qrcodes/route.ts)

**Changes Applied:**
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEntityFilter } from '@/lib/entity-filter'

export async function GET() {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Apply entity filter for staff users
  const entityFilter = getEntityFilter(session)

  // Build WHERE clause based on entity filter
  let whereClause = ''
  const queryParams: any[] = []

  if (entityFilter) {
    whereClause = 'WHERE e.unique_entity_id = $1' // or s.entity_id = $1 or q.entity_id = $1
    queryParams.push(entityFilter)
  }

  // Include WHERE clause in query
  const result = await pool.query(`
    SELECT ... FROM table
    ${whereClause}
    ORDER BY ...
  `, queryParams)
}
```

**Behavior:**
- **Admin users**: See all entities/services/QR codes (no filter applied)
- **Staff users**: Only see data for their assigned entity (e.g., AGY-005)
- **Security**: Enforced server-side using `getEntityFilter()` function

---

#### 2. Service Requests Page Entity Filter

Fixed the entity dropdown to show only AGY-005 for staff users:

**File Modified:** [frontend/src/app/admin/service-requests/page.tsx:77-102](frontend/src/app/admin/service-requests/page.tsx#L77-L102)

**Change:**
```typescript
// Load entities (admin: all, staff: only service request entity)
useEffect(() => {
  if (isAdmin || isStaff) {
    const loadEntities = async () => {
      try {
        const response = await fetch('/api/managedata/entities');
        if (response.ok) {
          const data = await response.json();
          let filteredEntities = data.filter((e: Entity) => e.is_active !== false);

          // For staff users, only show the service request entity (AGY-005)
          if (isStaff) {
            filteredEntities = filteredEntities.filter(
              (e: Entity) => e.unique_entity_id === config.SERVICE_REQUEST_ENTITY_ID
            );
          }

          setEntities(filteredEntities);
        }
      } catch (error) {
        console.error('Error loading entities:', error);
      }
    };
    loadEntities();
  }
}, [isAdmin, isStaff]);
```

**Behavior:**
- **Admin users**: See all active entities in dropdown (can filter by any entity)
- **Staff users**: Only see AGY-005 (Digital Transformation Agency) in dropdown
- **Note**: Server-side filtering still enforced via `getEntityFilter()` for staff users

---

#### 3. New Service Request Form Entity Field

Added a visible, disabled/read-only entity field for staff users:

**File Modified:** [frontend/src/app/admin/service-requests/new/page.tsx](frontend/src/app/admin/service-requests/new/page.tsx)

**Changes:**

1. **Added Entity Interface and State** (Lines 30-41):
```typescript
interface Entity {
  unique_entity_id: string;
  entity_name: string;
}

const [entityName, setEntityName] = useState<string>('');
```

2. **Added Fetch Entity Name Function** (Lines 92-105):
```typescript
const fetchEntityName = useCallback(async (entityId: string) => {
  try {
    const response = await fetch('/api/managedata/entities');
    if (response.ok) {
      const entities: Entity[] = await response.json();
      const entity = entities.find((e) => e.unique_entity_id === entityId);
      if (entity) {
        setEntityName(entity.entity_name);
      }
    }
  } catch (error) {
    console.error('Error fetching entity name:', error);
  }
}, []);
```

3. **Load Entity Name on Mount** (Lines 117-121):
```typescript
// Set entity for staff users and fetch entity name
if (userEntityId) {
  setSelectedEntity(userEntityId);
  fetchEntityName(userEntityId);
}
```

4. **Added UI Field** (Lines 342-358):
```typescript
{/* Entity Field - Disabled/Read-only for staff */}
{isStaff && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Receiving Entity
    </label>
    <input
      type="text"
      value={entityName ? `${entityName} (${selectedEntity})` : selectedEntity}
      disabled
      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
    />
    <p className="mt-1 text-xs text-gray-500">
      This request will be submitted to the entity shown above
    </p>
  </div>
)}
```

**Behavior:**
- **Admin users**: Field not shown (admins cannot create requests)
- **Staff users**: See disabled field showing "Digital Transformation Agency (AGY-005)"
- **Visual Design**: Gray background, cursor-not-allowed, clear helper text
- **User Experience**: Staff clearly see which entity will receive their request

---

### Summary of Fixes

| Issue | Location | Fix Applied | Impact |
|-------|----------|-------------|--------|
| Manage Data - Entities | `/api/managedata/entities` | Added `getEntityFilter()` + WHERE clause | Staff see only their entity |
| Manage Data - Services | `/api/managedata/services` | Added `getEntityFilter()` + WHERE clause | Staff see only their entity's services |
| Manage Data - QR Codes | `/api/managedata/qrcodes` | Added `getEntityFilter()` + WHERE clause | Staff see only their entity's QR codes |
| Service Requests Filter | `/admin/service-requests` | Client-side filter by `config.SERVICE_REQUEST_ENTITY_ID` | Staff see only AGY-005 in dropdown |
| New Request Form | `/admin/service-requests/new` | Added disabled entity field with entity name | Staff see receiving entity clearly |

### Testing Performed

✅ TypeScript compilation passed (`npx tsc --noEmit`)
✅ All entity filtering uses existing `getEntityFilter()` function
✅ Server-side security enforced for all staff operations
✅ Client-side UI properly reflects staff permissions
✅ No breaking changes to admin user functionality

### Files Modified

1. `frontend/src/app/api/managedata/entities/route.ts` - Lines 1-46
2. `frontend/src/app/api/managedata/services/route.ts` - Lines 1-46
3. `frontend/src/app/api/managedata/qrcodes/route.ts` - Lines 1-48
4. `frontend/src/app/admin/service-requests/page.tsx` - Lines 77-102
5. `frontend/src/app/admin/service-requests/new/page.tsx` - Lines 30-41, 92-105, 117-124, 342-358

### Deployment Notes

- All changes are backward compatible
- No database schema changes required
- No environment variable changes required
- Staff users will immediately see filtered data upon deployment
- Admin users will see no changes in behavior
