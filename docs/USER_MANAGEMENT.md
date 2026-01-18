# User Management Guide

## Overview

The GEA Portal implements a Role-Based Access Control (RBAC) system with three distinct user roles. Access control is enforced at multiple layers: database constraints, API authorization, and UI component visibility.

**Key Principles:**
- **Authentication**: OAuth-based (Google/Microsoft) via NextAuth
- **Authorization**: Role-based with entity-scoped data filtering
- **Whitelist Model**: Only pre-authorized emails can access the system
- **No Self-Registration**: Admins must add users to the database

---

## User Roles

### 1. DTA Administrator (`admin_dta`)

**Role Type:** `admin`
**Full System Access Across All Entities**

#### Capabilities

| Feature | Access Level | Details |
|---------|--------------|---------|
| **User Management** | ✅ Full CRUD | Create, edit, activate/deactivate all users |
| **Master Data** | ✅ Full CRUD | Manage entities, services, departments, QR codes |
| **Analytics Dashboard** | ✅ System-wide | View data across ALL entities with optional filtering |
| **Service Requests** | ✅ All Entities | Create/view/manage requests for any entity |
| **Tickets** | ✅ All Entities | Manage tickets across all MDAs |
| **AI Bot Management** | ✅ Full Access | Configure AI bot integrations and inventory |
| **Feedback** | ✅ All Entities | View feedback across all entities |
| **Reports** | ✅ System-wide | Generate reports for any entity |
| **Entity Assignment** | Optional | Not required (can be NULL or set to AGY-005) |
| **Data Scope** | Unlimited | See everything across the entire system |

#### UI Access

**Available Pages:**
- `/admin/home` - Admin dashboard
- `/admin/users` - User management
- `/admin/analytics` - System-wide analytics
- `/admin/tickets` - All tickets
- `/admin/service-requests` - All service requests
- `/admin/settings` - System settings (ADMIN ONLY)
- `/admin/ai-inventory` - AI bot management (via Settings > AI Bots)
- `/admin/managedata/*` - Master data management

**Code Reference:**
```typescript
// frontend/src/lib/entity-filter.ts:20-22
// Admin users see all entities
if (session.user.roleType === 'admin') return null;
```

---

### 2. MDA Staff Officer (`staff_mda`)

**Role Type:** `staff`
**Entity-Scoped Access - Limited to Assigned Ministry/Department/Agency**

#### Capabilities

| Feature | Access Level | Details |
|---------|--------------|---------|
| **User Management** | 🟡 Limited | Can view entity users and add new staff users for their entity only |
| **Master Data** | 🟡 View Only | Can view but filtered to their entity |
| **Analytics Dashboard** | 🟡 Entity-Only | Only see data for their assigned MDA |
| **Service Requests** | 🟡 Entity-Only | Can only create/view requests for their MDA |
| **Tickets** | 🟡 Entity-Only | Only tickets assigned to their MDA |
| **AI Bot Management** | ❌ No Access | Cannot access AI bot management |
| **Feedback** | 🟡 Entity-Only | Only feedback for their entity |
| **Reports** | 🟡 Entity-Only | Only reports for their entity |
| **Entity Assignment** | ✅ Required | MUST have entity_id assigned in database |
| **Data Scope** | Restricted | Only data for their assigned entity |

#### User Management for Staff

Staff users have limited user management capabilities:

| Capability | Allowed |
|------------|---------|
| View users from own entity | ✅ Yes |
| Add new staff users for own entity | ✅ Yes |
| Edit existing users | ❌ No |
| Change user status (activate/deactivate) | ❌ No |
| Create admin users | ❌ No |

**API Behavior for Staff:**
```typescript
// GET /api/admin/users - Returns only users from staff's entity
// POST /api/admin/users - Forces entity_id to staff's entity, rejects admin role
```

#### UI Access

**Available Pages:**
- `/admin/staff/home` - Staff dashboard (shown instead of Admin Home in menu)
- `/admin/analytics` - Entity-scoped analytics
- `/admin/users` - Entity-scoped user list (view and add staff only)
- `/admin/tickets` - Entity-scoped tickets
- `/admin/service-requests` - Entity-scoped service requests
- `/admin/managedata/*` - View-only, entity-scoped master data

**Hidden/Blocked Pages:**
- `/admin/home` - Admin dashboard (hidden from menu, staff sees Staff Home instead)
- `/admin/settings` - System settings (hidden from menu, admin-only)
- `/admin/ai-inventory` - AI bot management (hidden from menu, admin-only)

**Code Reference:**
```typescript
// frontend/src/lib/entity-filter.ts:24-25
// Staff users only see their assigned entity
return session.user.entityId || null;
```

**Enforcement Example:**
```typescript
// frontend/src/app/api/admin/service-requests/route.ts:143-148
// Staff users can only create requests for their entity
if (session.user.roleType === 'staff' && entity_id !== session.user.entityId) {
  return NextResponse.json(
    { error: 'Forbidden - You can only create requests for your assigned entity' },
    { status: 403 }
  );
}
```

---

### 3. Public User (`public_user`)

**Role Type:** `public`
**Limited Public Access - Reserved for Future Use**

#### Current Status

⚠️ **Not Currently Implemented**

This role is reserved for future citizen portal functionality where members of the public can:
- Submit service requests
- Track their requests
- Provide feedback
- View public information

**Code Reference:**
```sql
-- database/scripts/04-nextauth-users.sh:89
INSERT INTO user_roles (role_code, role_name, role_type, description) VALUES
('public_user', 'Public User', 'public', 'Limited public access - Future use for citizen portal');
```

---

## Database Schema

### User Roles Table

**Table:** `user_roles`
**Script:** `database/scripts/04-nextauth-users.sh:73-81`

```sql
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('admin', 'staff', 'public')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Default Roles:**

| role_id | role_code | role_name | role_type | description |
|---------|-----------|-----------|-----------|-------------|
| 1 | admin_dta | DTA Administrator | admin | Full system access - Digital Transformation Agency administrators |
| 2 | staff_mda | MDA Staff Officer | staff | Entity-specific access - Ministry/Department/Agency officers |
| 3 | public_user | Public User | public | Limited public access - Future use for citizen portal |

**Constraints:**
- `role_code` must be unique
- `role_type` must be one of: 'admin', 'staff', 'public'

---

### Users Table

**Table:** `users`
**Script:** `database/scripts/04-nextauth-users.sh:108-124`

```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    email_verified TIMESTAMP,
    role_id INTEGER NOT NULL REFERENCES user_roles(role_id),
    entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    is_active BOOLEAN DEFAULT true,
    provider VARCHAR(50),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_entity ON users(entity_id);
CREATE INDEX idx_users_active ON users(is_active);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key, auto-generated |
| `email` | VARCHAR(255) | No | User email, must be unique |
| `name` | VARCHAR(255) | Yes | Display name from OAuth provider |
| `image` | TEXT | Yes | Profile image URL from OAuth |
| `email_verified` | TIMESTAMP | Yes | Email verification timestamp |
| `role_id` | INTEGER | No | Foreign key to user_roles table |
| `entity_id` | VARCHAR(50) | Yes | Foreign key to entity_master, required for staff |
| `is_active` | BOOLEAN | Yes | Master switch to enable/disable user (default: true) |
| `provider` | VARCHAR(50) | Yes | OAuth provider (google, microsoft) |
| `last_login` | TIMESTAMP | Yes | Last successful login timestamp |
| `created_at` | TIMESTAMP | Yes | User creation timestamp |
| `updated_at` | TIMESTAMP | Yes | Last update timestamp |
| `created_by` | VARCHAR(255) | Yes | Email of admin who created user |
| `updated_by` | VARCHAR(255) | Yes | Email of admin who last updated user |

**Foreign Key Constraints:**
- `role_id` → `user_roles(role_id)`
- `entity_id` → `entity_master(unique_entity_id)`

---

### Supporting Tables

#### Accounts Table (NextAuth OAuth)

**Table:** `accounts`
**Script:** `database/scripts/04-nextauth-users.sh:130-147`

```sql
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type VARCHAR(50),
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_account_id)
);
```

**Purpose:** Stores OAuth tokens and provider-specific account information.

---

#### Sessions Table

**Table:** `sessions`
**Script:** `database/scripts/04-nextauth-users.sh:153-160`

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Stores active user sessions for NextAuth.

---

#### User Audit Log

**Table:** `user_audit_log`
**Script:** `database/scripts/04-nextauth-users.sh:166-178`

```sql
CREATE TABLE IF NOT EXISTS user_audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Tracks all user actions for security and compliance.

**Logged Actions:**
- `user_signin` - OAuth login
- `user_signout` - User logout
- `user_created` - New user added
- `user_updated` - User details modified
- `user_deleted` - User deactivated

---

## API Endpoints

### User Management API

**Base Path:** `/api/admin/users`

#### GET `/api/admin/users`

**Description:** List all users (admin sees all, staff sees entity-filtered)

**Authorization:** Admin or Staff (`roleType === 'admin'` or `roleType === 'staff'`)

**Query Parameters:**
- `search` (optional) - Search by email or name
- `roleId` (optional) - Filter by role ID
- `entityId` (optional) - Filter by entity ID
- `isActive` (optional) - Filter by active status

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "roleId": 1,
      "roleCode": "admin_dta",
      "roleName": "DTA Administrator",
      "roleType": "admin",
      "entityId": "AGY-005",
      "entityName": "Digital Transformation Agency",
      "isActive": true,
      "lastLogin": "2025-01-14T12:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - No valid session
- `403 Forbidden` - Not an admin or staff user

**Code Reference:** `frontend/src/app/api/admin/users/route.ts:19-85`

---

#### POST `/api/admin/users`

**Description:** Create a new user (admin only)

**Authorization:** Admin only (`roleType === 'admin'`)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "roleCode": "staff_mda",
  "entity_id": "MIN-001",
  "is_active": true
}
```

**Validation Rules:**
- `email` - Required, must be valid email format
- `name` - Required
- `roleCode` - Required, must be valid role code
- `entity_id` - Required for staff users, optional for admin users
- Auto-assigns `AGY-005` for `admin_dta` role if not specified

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "New User",
    "roleId": 2,
    "entityId": "MIN-001",
    "isActive": true
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields or invalid data
- `401 Unauthorized` - No valid session
- `403 Forbidden` - Not an admin user
- `409 Conflict` - Email already exists

**Special Logic:**
```typescript
// Auto-assign entity for DTA administrators
let finalEntityId = entity_id;
if (roleCode === 'admin_dta' && !entity_id) {
  finalEntityId = 'AGY-005'; // Digital Transformation Agency
}

// Validate entity requirement for staff
if (roleType === 'staff' && !finalEntityId) {
  return NextResponse.json(
    { error: 'entity_id is required for staff users' },
    { status: 400 }
  );
}
```

**Code Reference:** `frontend/src/app/api/admin/users/route.ts:97-242`

---

#### PATCH `/api/admin/users/[id]`

**Description:** Update user details (admin only)

**Authorization:** Admin only (`roleType === 'admin'`)

**Request Body:**
```json
{
  "name": "Updated Name",
  "roleCode": "admin_dta",
  "entity_id": "AGY-005",
  "is_active": false
}
```

**Response:**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Updated Name",
    "roleId": 1,
    "entityId": "AGY-005",
    "isActive": false
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - No valid session
- `403 Forbidden` - Not an admin user
- `404 Not Found` - User not found

**Code Reference:** `frontend/src/app/api/admin/users/[id]/route.ts`

---

#### DELETE `/api/admin/users/[id]`

**Description:** Deactivate a user (soft delete, admin only)

**Authorization:** Admin only (`roleType === 'admin'`)

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

**Note:** This is a soft delete - sets `is_active = false` rather than removing the record.

**Error Responses:**
- `401 Unauthorized` - No valid session
- `403 Forbidden` - Not an admin user
- `404 Not Found` - User not found

---

### Role Management API

#### GET `/api/admin/roles`

**Description:** List all available roles (admin only)

**Authorization:** Admin only (`roleType === 'admin'`)

**Response:**
```json
{
  "roles": [
    {
      "roleId": 1,
      "roleCode": "admin_dta",
      "roleName": "DTA Administrator",
      "roleType": "admin",
      "description": "Full system access - Digital Transformation Agency administrators"
    },
    {
      "roleId": 2,
      "roleCode": "staff_mda",
      "roleName": "MDA Staff Officer",
      "roleType": "staff",
      "description": "Entity-specific access - Ministry/Department/Agency officers"
    }
  ]
}
```

**Code Reference:** `frontend/src/app/api/admin/roles/route.ts`

---

### Entity-Filtered APIs

These APIs automatically apply entity filtering based on user role:

#### Service Requests API

**Endpoints:**
- `GET /api/admin/service-requests` - List service requests
- `POST /api/admin/service-requests` - Create service request
- `GET /api/admin/service-requests/analytics` - Service request analytics

**Entity Filtering:**
```typescript
const entityFilter = getEntityFilter(session);
// Admin: entityFilter = null (see all)
// Staff: entityFilter = user's entity_id (see only their entity)

if (entityFilter) {
  whereClauses.push(`r.entity_id = $${paramIndex}`);
  queryParams.push(entityFilter);
}
```

**Staff Validation:**
```typescript
if (session.user.roleType === 'staff' && entity_id !== session.user.entityId) {
  return NextResponse.json(
    { error: 'Forbidden - You can only create requests for your assigned entity' },
    { status: 403 }
  );
}
```

**Code Reference:** `frontend/src/app/api/admin/service-requests/route.ts`

---

#### Tickets API

**Endpoints:**
- `GET /api/admin/tickets/list` - List tickets
- `POST /api/admin/tickets` - Create ticket

**Entity Filtering:**
```typescript
const entityFilter = getEntityFilter(session);

if (entityFilter) {
  query += ` WHERE t.entity_id = $1`;
  queryParams.push(entityFilter);
}
```

**Code Reference:** `frontend/src/app/api/admin/tickets/list/route.ts`

---

## The Special Role of AGY-005 (Digital Transformation Agency)

### Entity Details

**Entity ID:** `AGY-005`
**Entity Name:** Digital Transformation Agency
**Entity Type:** Agency
**Parent Entity:** MIN-017 (Office of Prime Minister)
**Status:** Active

**Master Data Reference:** `database/master-data/entity-master.txt:23`
```csv
AGY-005,"Digital Transformation Agency",agency,MIN-017,,,TRUE
```

---

### Why AGY-005 is Special

#### 1. Auto-Assignment for Admin Users

When creating a user with role `admin_dta`, if no entity is specified, the system automatically assigns `AGY-005`:

```typescript
// frontend/src/app/api/admin/users/route.ts:136-140
// Auto-assign entity for DTA administrators
let finalEntityId = entity_id;
if (roleCode === 'admin_dta' && !entity_id) {
  finalEntityId = 'AGY-005'; // Digital Transformation Agency
}
```

**Rationale:**
- DTA is the government's digital transformation agency
- Admins of the portal naturally belong to DTA
- Provides a default "home" entity for system administrators

---

#### 2. Default Initial Admin Setup

The database initialization script creates the first admin user assigned to AGY-005:

**Script:** `database/scripts/05-add-initial-admin.sh:127-136`

```bash
INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
VALUES (
    '$ADMIN_EMAIL',
    '$ADMIN_NAME',
    (SELECT role_id FROM user_roles WHERE role_code = 'admin_dta'),
    'AGY-005',  -- Digital Transformation Agency
    true,
    'google'
);
```

**Default Values:**
- Email: `gogdtaservices@gmail.com`
- Name: System Administrator
- Role: admin_dta
- Entity: AGY-005

**Customization:**
```bash
# Override defaults with environment variables
ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./database/scripts/05-add-initial-admin.sh
```

---

#### 3. Service Request Destination

Public service requests are routed to AGY-005 by default:

**Environment Configuration:** `.env.example:180-185`
```bash
# Entity ID that receives service requests from public portal
# Default: AGY-005 (Digital Transformation Agency)
NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005
```

**Use Case:**
- Citizens submit service requests via public portal
- Requests need to be routed to a responsible agency
- DTA acts as the central coordination point
- DTA admins can then assign/forward to appropriate MDAs

---

#### 4. Organizational Hierarchy

AGY-005 sits at a strategic position in the government hierarchy:

```
Office of Prime Minister (MIN-017)
└── Digital Transformation Agency (AGY-005)
    └── [System Administrators]
```

**Significance:**
- Reports directly to Prime Minister's Office
- Cross-cutting mandate across all MDAs
- Authority to manage system-wide digital services
- Natural hub for portal administration

---

### AGY-005 and Access Control

**Important Clarification:**

❌ **MYTH:** Being assigned to AGY-005 automatically grants admin privileges
✅ **TRUTH:** Only the **role** (`admin_dta`) grants admin privileges

**Example Scenarios:**

| User | Role | Entity | Access Level |
|------|------|--------|--------------|
| User A | `admin_dta` | `AGY-005` | Full system access (admin) |
| User B | `staff_mda` | `AGY-005` | Only AGY-005 data (staff) |
| User C | `admin_dta` | `MIN-001` | Full system access (admin) |
| User D | `staff_mda` | `MIN-001` | Only MIN-001 data (staff) |

**Key Takeaway:**
- Users A and C have identical access (both admins)
- User B can only see AGY-005 data despite being assigned to DTA
- Role determines privileges, entity determines scope (for staff only)

---

## User Creation Workflows

### Method 1: Initial Admin Setup (First User)

**Script:** `database/scripts/05-add-initial-admin.sh`

```bash
# Create first admin user
./database/scripts/05-add-initial-admin.sh

# Or with custom details
ADMIN_EMAIL="admin@example.com" \
ADMIN_NAME="Admin Name" \
./database/scripts/05-add-initial-admin.sh
```

**What it creates:**
- Email: `gogdtaservices@gmail.com` (or custom)
- Name: System Administrator (or custom)
- Role: `admin_dta`
- Entity: `AGY-005`
- Active: true
- Provider: google

---

### Method 2: Admin UI (Recommended)

**Page:** `/admin/users`

**Steps:**
1. Login as admin user
2. Navigate to `/admin/users`
3. Click "Add User" button
4. Fill in user details:
   - Email (required)
   - Name (required)
   - Role (required)
   - Entity (required for staff, optional for admin)
   - Active status
5. Submit form

**API Call:**
```http
POST /api/admin/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "New User",
  "roleCode": "staff_mda",
  "entity_id": "MIN-001",
  "is_active": true
}
```

---

### Method 3: Direct Database Insert

**Use Case:** Bulk user creation or automated provisioning

```sql
-- Insert new user
INSERT INTO users (
    email,
    name,
    role_id,
    entity_id,
    is_active,
    provider,
    created_by
) VALUES (
    'user@example.com',
    'User Name',
    (SELECT role_id FROM user_roles WHERE role_code = 'staff_mda'),
    'MIN-001',
    true,
    'google',
    'admin@example.com'
);
```

**Important:** Ensure email is added before user attempts to sign in.

---

## Authorization Flow

### 1. User Signs In (OAuth)

```
User clicks "Sign in with Google/Microsoft"
    ↓
OAuth provider authenticates user
    ↓
NextAuth receives OAuth response with email
    ↓
NextAuth checks if email exists in users table
    ↓
If found AND is_active = true → Create session
If not found OR is_active = false → Redirect to /auth/unauthorized
```

**Code Reference:** `frontend/src/lib/auth.ts:52-112`

---

### 2. Session Enrichment

NextAuth enriches the session with role and entity data via the JWT callback:

```typescript
// frontend/src/lib/auth.ts - JWT callback
async jwt({ token, user, account, trigger }) {
  // Refresh on initial sign-in OR when updateSession() is called
  const email = user?.email || token?.email;

  if (email && (user || trigger === 'update')) {
    const authCheck = await isUserAuthorized(email);
    // ... updates token with roleType, entityId, etc.
  }
}
```

**Important:** The `trigger === 'update'` check ensures that when the UI calls `updateSession()` (e.g., when navigating to admin area), the token claims are refreshed from the database. This prevents stale role data from causing menu visibility issues.

**Database Query:**
```sql
SELECT
    u.id, u.email, u.name, u.role_id,
    r.role_code, r.role_type,
    u.entity_id, u.is_active
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE u.email = $1 AND u.is_active = true
```

**Session Object:**
```typescript
session.user = {
    id: "uuid",
    email: "user@example.com",
    name: "User Name",
    roleId: 1,
    roleCode: "admin_dta",
    roleType: "admin",
    entityId: "AGY-005",
    isActive: true
}
```

---

### 3. API Request Authorization

Every protected API endpoint checks the session:

```typescript
// Get session
const session = await getServerSession(authOptions);

// Check authentication
if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Check admin-only access
if (session.user.roleType !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Apply entity filtering for staff
const entityFilter = getEntityFilter(session);
// Admin: entityFilter = null (see all)
// Staff: entityFilter = user's entity_id
```

---

### 4. Data Filtering

For staff users, all queries are automatically filtered:

```typescript
// Build query with entity filter
const entityFilter = getEntityFilter(session);

if (entityFilter) {
    whereClauses.push(`entity_id = $${paramIndex}`);
    queryParams.push(entityFilter);
}
```

**Result:**
- Admins see all records
- Staff see only records for their entity

---

## Security Considerations

### 1. Whitelist-Based Access

- Only emails in `users` table can sign in
- No self-registration available
- Admins must pre-authorize all users

### 2. No Password Storage

- OAuth-only authentication (Google/Microsoft)
- No passwords stored in database
- Reduces security risk

### 3. Role-Based Authorization

- Multiple layers of authorization checks:
  - Middleware (route-level)
  - API handlers (endpoint-level)
  - UI components (UI-level)

### 4. Entity-Based Data Isolation

- Staff users cannot access other entities' data
- Enforced at database query level
- Prevents data leakage

### 5. Audit Logging

- All user actions logged in `user_audit_log`
- Tracks who did what and when
- Includes IP address and user agent

### 6. Soft Deletes

- Users are deactivated, not deleted
- Preserves audit trail
- Can be reactivated if needed

### 7. Session Management

- JWT-based sessions via NextAuth
- Automatic session expiration
- Secure session token storage

---

## Common Operations

### Create Admin User

```typescript
// Via API
POST /api/admin/users
{
  "email": "admin@example.com",
  "name": "Admin User",
  "roleCode": "admin_dta",
  "is_active": true
  // entity_id will auto-assign to AGY-005
}
```

---

### Create Staff User

```typescript
// Via API
POST /api/admin/users
{
  "email": "staff@example.com",
  "name": "Staff User",
  "roleCode": "staff_mda",
  "entity_id": "MIN-001",  // REQUIRED for staff
  "is_active": true
}
```

---

### Deactivate User

```typescript
// Via API
DELETE /api/admin/users/{userId}

// Or via PATCH
PATCH /api/admin/users/{userId}
{
  "is_active": false
}
```

---

### Change User Role

```typescript
// Via API
PATCH /api/admin/users/{userId}
{
  "roleCode": "admin_dta",
  "entity_id": "AGY-005"  // Required if changing to admin_dta
}
```

---

### Reassign User to Different Entity

```typescript
// Via API (staff users only)
PATCH /api/admin/users/{userId}
{
  "entity_id": "MIN-002"
}
```

---

## Troubleshooting

### User Cannot Sign In

**Problem:** User gets "Unauthorized" error

**Checklist:**
1. ✅ Email exists in `users` table
2. ✅ `is_active = true`
3. ✅ OAuth provider matches (google/microsoft)
4. ✅ Email is verified in OAuth provider

**Solution:**
```sql
-- Check user status
SELECT email, is_active, provider FROM users WHERE email = 'user@example.com';

-- Activate user if needed
UPDATE users SET is_active = true WHERE email = 'user@example.com';
```

---

### Staff User Cannot See Data

**Problem:** Staff user logs in but sees no data

**Checklist:**
1. ✅ User has `entity_id` assigned
2. ✅ Entity exists in `entity_master` table
3. ✅ Entity has data

**Solution:**
```sql
-- Check user entity assignment
SELECT email, entity_id FROM users WHERE email = 'staff@example.com';

-- Verify entity exists
SELECT unique_entity_id, entity_name FROM entity_master WHERE unique_entity_id = 'MIN-001';

-- Assign entity if missing
UPDATE users SET entity_id = 'MIN-001' WHERE email = 'staff@example.com';
```

---

### Cannot Create Staff User

**Problem:** API returns "entity_id is required for staff users"

**Solution:**
```typescript
// Must include entity_id for staff users
POST /api/admin/users
{
  "email": "staff@example.com",
  "name": "Staff User",
  "roleCode": "staff_mda",
  "entity_id": "MIN-001",  // ← This is required
  "is_active": true
}
```

---

## Related Documentation

- [Authentication Guide](./AUTHENTICATION.md) - NextAuth setup and OAuth configuration
- [Admin User Manual](./user-manuals/GEA_Portal_Admin_User_Manual.md) - Admin user guide
- [Database Schema](../database/scripts/04-nextauth-users.sh) - Complete database schema
- [Entity Filter Utility](../frontend/src/lib/entity-filter.ts) - Entity filtering implementation

---

## API Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/users` | GET | Admin/Staff | List users (staff: entity-filtered) |
| `/api/admin/users` | POST | Admin/Staff | Create user (staff: own entity + staff roles only) |
| `/api/admin/users/[id]` | PATCH | Admin | Update user |
| `/api/admin/users/[id]` | DELETE | Admin | Deactivate user |
| `/api/admin/roles` | GET | Admin/Staff | List all roles |
| `/api/admin/service-requests` | GET | Admin/Staff | List service requests (entity-filtered) |
| `/api/admin/tickets/list` | GET | Admin/Staff | List tickets (entity-filtered) |

---

**Last Updated:** 2026-01-17
**Version:** 3.2
**Maintainer:** Digital Transformation Agency
