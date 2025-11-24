# Authentication & Authorization Guide

**GEA Portal v3 - Complete OAuth Authentication System**

**Last Updated:** November 24, 2025
**Status:** ✅ Production Ready
**Authentication:** NextAuth v4 with OAuth (Google & Microsoft)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [OAuth Setup](#oauth-setup)
6. [Configuration](#configuration)
7. [User Management](#user-management)
8. [API Integration](#api-integration)
9. [Database Commands](#database-commands)
10. [Docker Commands](#docker-commands)
11. [Troubleshooting](#troubleshooting)
12. [Security](#security)
13. [Quick Reference](#quick-reference)

---

## Overview

### What's Implemented

The GEA Portal uses **NextAuth v4** for authentication with OAuth providers, providing:

✅ **OAuth-Only Authentication** - Google & Microsoft sign-in (no passwords stored)
✅ **Role-Based Access Control** - Admin, Staff, and Public user roles
✅ **Entity-Based Filtering** - Staff users see only their entity's data
✅ **Database-Backed Authorization** - Email whitelist in PostgreSQL
✅ **Session Management** - JWT tokens with 2-hour expiration
✅ **Audit Logging** - All sign-ins and changes tracked
✅ **Admin User Management** - Full CRUD UI at `/admin/users`

### User Roles

| Role Code | Role Name | Type | Access Level |
|-----------|-----------|------|--------------|
| `admin_dta` | DTA Administrator | admin | Full system access |
| `staff_mda` | MDA Staff Officer | staff | Entity-specific data only |
| `public_user` | Public User | public | Limited access (future) |

### Protected Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/auth/signin` | Public | Custom sign-in page |
| `/auth/unauthorized` | Public | Access denied page |
| `/api/auth/[...nextauth]` | Public | NextAuth endpoints |
| `/admin` | Admin only | Admin dashboard |
| `/admin/users` | Admin only | User management |
| `/staff` | Staff only | Staff portal |
| `/api/admin/*` | Admin only | Admin APIs |

---

## Quick Start

### 5-Minute Setup

```bash
# 1. Run database migration
cd /home/ab/Projects/gogeaportal/v3
./database/04-nextauth-users.sh

# 2. Add your admin user
ADMIN_EMAIL="you@example.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh

# 3. Generate NextAuth secret
openssl rand -base64 32

# 4. Configure .env (add generated secret and OAuth credentials)
nano .env

# 5. Start or restart application
docker-compose up -d --build frontend

# 6. Test sign-in
# Visit: https://gea.your-domain.com/admin
```

### Required Environment Variables

```bash
# NextAuth
NEXTAUTH_URL=https://gea.your-domain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Google OAuth
GOOGLE_CLIENT_ID=<from-google-console>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<from-google-console>

# Database
DB_HOST=feedback_db
DB_PORT=5432
DB_NAME=feedback
DB_USER=feedback_user
DB_PASSWORD=<your-secure-password>
```

### Optional: Microsoft OAuth

```bash
MICROSOFT_CLIENT_ID=<from-azure-portal>
MICROSOFT_CLIENT_SECRET=<from-azure-portal>
MICROSOFT_TENANT_ID=common
```

---

## Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User visits protected route (e.g., /admin)              │
│     ↓                                                        │
│  2. Middleware checks session (middleware.ts)               │
│     ↓                                                        │
│  3. No session → Redirect to /auth/signin                   │
│     ↓                                                        │
│  4. User clicks "Continue with Google/Microsoft"            │
│     ↓                                                        │
│  5. OAuth flow → User consents → Callback                   │
│     ↓                                                        │
│  6. NextAuth checks email in users table                    │
│     ↓                                                        │
│  7a. Authorized → Create session with role & entity         │
│  7b. Unauthorized → Redirect to /auth/unauthorized          │
│     ↓                                                        │
│  8. Redirect back to original destination                   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **NextAuth v4** - Authentication library
- **PostgreSQL Adapter** - Database session storage
- **JWT Strategy** - Stateless session tokens
- **OAuth Providers** - Google, Microsoft (extensible)

### File Structure

```
frontend/src/
├── lib/
│   └── auth.ts                          # NextAuth configuration
├── middleware.ts                         # Route protection
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts   # NextAuth API handler
│   │   └── admin/
│   │       ├── users/route.ts           # User management CRUD
│   │       ├── roles/route.ts           # List roles
│   │       └── entities/route.ts        # List entities
│   ├── auth/
│   │   ├── signin/page.tsx              # Custom sign-in page
│   │   └── unauthorized/page.tsx        # Access denied page
│   └── admin/
│       ├── layout.tsx                   # SessionProvider wrapper
│       └── users/page.tsx               # User management UI
```

---

## Database Schema

### Tables Created (8 tables)

The authentication system adds 8 new tables to the `feedback` database:

#### 1. **users** - Central authentication table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    email_verified TIMESTAMP,
    role_id INTEGER REFERENCES user_roles(role_id),
    entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `email` - Must match OAuth provider email
- `role_id` - Foreign key to user_roles
- `entity_id` - For staff users, links to their ministry/department
- `is_active` - Toggle to revoke access instantly

#### 2. **user_roles** - Role definitions
```sql
CREATE TABLE user_roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20) NOT NULL,  -- 'admin', 'staff', 'public'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Pre-loaded Roles:**
- `admin_dta` (Admin) - Full system access
- `staff_mda` (Staff) - Entity-specific access
- `public_user` (Public) - Limited access

#### 3. **accounts** - OAuth provider data (NextAuth)
Stores OAuth tokens and provider information.

#### 4. **sessions** - Active sessions (NextAuth)
Tracks active user sessions with expiration.

#### 5. **verification_tokens** - Email verification (NextAuth)
For email-based authentication (if enabled).

#### 6. **entity_user_assignments** - Many-to-many mapping
Allows users to be assigned to multiple entities (future use).

#### 7. **user_permissions** - Fine-grained permissions
For granular access control (future use).

#### 8. **user_audit_log** - Activity tracking
```sql
CREATE TABLE user_audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,  -- 'login', 'logout', 'user_created', etc.
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Migration

Run these scripts to set up authentication:

```bash
# 1. Initialize database (if not already done)
./database/01-init-db.sh

# 2. Create authentication tables
./database/04-nextauth-users.sh

# 3. Add your first admin user
ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh
```

---

## OAuth Setup

### Google OAuth Configuration

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Name: "GEA Portal" (or your preference)

#### Step 2: Enable APIs

1. Navigate to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

#### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "GEA Portal - Production"

#### Step 4: Configure Authorized Redirect URIs

Add these exact URIs:

**Development:**
```
http://localhost:3000/api/auth/callback/google
```

**Production:**
```
https://gea.your-domain.com/api/auth/callback/google
```

**Important:** URIs must match exactly (case-sensitive, no trailing slashes)

#### Step 5: Copy Credentials

1. Copy the "Client ID" (format: `xxxxx.apps.googleusercontent.com`)
2. Copy the "Client Secret"
3. Store securely - you'll add these to `.env`

---

### Microsoft OAuth Configuration (Optional)

#### Step 1: Register Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "App Registrations"
3. Click "New registration"

#### Step 2: Configure App

- **Name:** "GEA Portal"
- **Supported account types:** "Accounts in any organizational directory and personal Microsoft accounts"
- **Redirect URI:**
  - Platform: Web
  - URI: `https://gea.your-domain.com/api/auth/callback/azure-ad`

#### Step 3: Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Description: "GEA Portal Production"
4. Expires: 24 months (recommended)
5. Copy the secret value immediately (won't be shown again)

#### Step 4: Copy IDs

From the "Overview" page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

#### Step 5: API Permissions

1. Go to "API permissions"
2. Ensure these are granted:
   - `User.Read` (delegated)
   - `email` (OpenID Connect)
   - `profile` (OpenID Connect)

---

## Configuration

### Environment Variables

Create or update `.env` file in project root:

```bash
# === NextAuth Configuration ===
NEXTAUTH_URL=https://gea.your-domain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# === Google OAuth ===
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# === Microsoft OAuth (Optional) ===
MICROSOFT_CLIENT_ID=your-app-id-here
MICROSOFT_CLIENT_SECRET=your-secret-value-here
MICROSOFT_TENANT_ID=common  # or your specific tenant ID

# === Database Configuration ===
DB_HOST=feedback_db
DB_PORT=5432
DB_NAME=feedback
DB_USER=feedback_user
DB_PASSWORD=your-secure-password-here
```

### Generate Secure Secret

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

**Never commit `.env` to version control!**

### OAuth Redirect URIs Reference

#### Google OAuth Console
```
Development: http://localhost:3000/api/auth/callback/google
Production:  https://gea.your-domain.com/api/auth/callback/google
```

#### Microsoft Azure Portal
```
Production: https://gea.your-domain.com/api/auth/callback/azure-ad
```

**Important:** URIs must match exactly (case-sensitive, no trailing slashes)

---

## User Management

### Adding Users via Script

```bash
# Add admin user
ADMIN_EMAIL="admin@your-domain.com" ADMIN_NAME="Admin User" ./database/05-add-initial-admin.sh

# Add staff user (requires entity_id)
docker exec -it feedback_db psql -U feedback_user -d feedback << EOF
INSERT INTO users (email, name, role_id, entity_id, is_active)
VALUES (
  'staff@ministry.gd',
  'Ministry Staff',
  (SELECT role_id FROM user_roles WHERE role_code = 'staff_mda'),
  'MIN-001',
  TRUE
);
EOF
```

### Managing Users via Admin UI

1. **Navigate to User Management:**
   ```
   https://gea.your-domain.com/admin/users
   ```

2. **Add New User:**
   - Click "Add User" button
   - Enter email (must match their OAuth account)
   - Enter full name
   - Select role (Admin or Staff)
   - If Staff: Select entity from dropdown
   - Click "Add User"

3. **Activate/Deactivate Users:**
   - Click the status badge next to user's name
   - Toggles between Active (green) and Inactive (red)
   - Inactive users cannot sign in

4. **View User Activity:**
   - Last login timestamp shown in table
   - Full audit log in database: `user_audit_log`

### User Management API

**List Users:**
```bash
GET /api/admin/users
Authorization: Session cookie

Response:
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "user@gov.gd",
      "name": "User Name",
      "role_code": "admin_dta",
      "role_name": "DTA Administrator",
      "role_type": "admin",
      "entity_id": null,
      "entity_name": null,
      "is_active": true,
      "last_login": "2025-11-24T10:00:00Z"
    }
  ]
}
```

**Add User:**
```bash
POST /api/admin/users
Content-Type: application/json

{
  "email": "newuser@gov.gd",
  "name": "New User",
  "role_id": 1,
  "entity_id": "MIN-001"  // Optional, for staff users
}
```

**Update User:**
```bash
PATCH /api/admin/users/[user-id]
Content-Type: application/json

{
  "is_active": false
}
```

---

## API Integration

### Using Authentication in API Routes

```typescript
// frontend/src/app/api/example/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user is admin
  if (session.user.roleType !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  // Proceed with request
  return NextResponse.json({
    message: 'Success',
    user: session.user
  });
}
```

### Entity-Based Data Filtering (Staff Users)

```typescript
// Example: Staff can only see their entity's tickets
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let query = 'SELECT * FROM tickets WHERE 1=1';
  const params: any[] = [];

  // Staff users: filter by entity
  if (session.user.roleType === 'staff') {
    if (!session.user.entityId) {
      return NextResponse.json({ error: 'No entity assigned' }, { status: 403 });
    }
    query += ' AND entity_id = $1';
    params.push(session.user.entityId);
  }
  // Admin users: see all tickets (no filter)

  const result = await pool.query(query, params);

  return NextResponse.json({
    success: true,
    tickets: result.rows
  });
}
```

### Using Authentication in Client Components

```typescript
'use client';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function MyComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <button onClick={() => signIn()}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      <p>Signed in as {session.user.email}</p>
      <p>Role: {session.user.roleType}</p>
      {session.user.entityId && (
        <p>Entity: {session.user.entityId}</p>
      )}
      <button onClick={() => signOut()}>
        Sign Out
      </button>
    </div>
  );
}
```

---

## Database Commands

### User Management Commands

```bash
# List all users
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT u.email, u.name, r.role_name, u.is_active, u.last_login
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
ORDER BY u.created_at DESC;"

# Add admin user
ADMIN_EMAIL="admin@your-domain.com" ADMIN_NAME="Admin Name" ./database/05-add-initial-admin.sh

# Add staff user
docker exec -it feedback_db psql -U feedback_user -d feedback << EOF
INSERT INTO users (email, name, role_id, entity_id, is_active)
VALUES (
  'staff@ministry.gd',
  'Staff Name',
  (SELECT role_id FROM user_roles WHERE role_code = 'staff_mda'),
  'MIN-001',
  TRUE
);
EOF

# Activate user
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE users SET is_active=TRUE WHERE email='user@example.com';"

# Deactivate user
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE users SET is_active=FALSE WHERE email='user@example.com';"

# Check if user exists
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT email, name, is_active FROM users WHERE email='user@example.com';"
```

### Roles Commands

```bash
# List all roles
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT role_code, role_name, role_type FROM user_roles;"

# Count users by role
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT r.role_name, COUNT(u.id) as user_count
FROM user_roles r
LEFT JOIN users u ON r.role_id = u.role_id
GROUP BY r.role_name;"
```

### Audit Logs Commands

```bash
# View recent sign-ins
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT u.email, al.action, al.created_at, al.ip_address
FROM user_audit_log al
JOIN users u ON al.user_id = u.id
WHERE al.action = 'login'
ORDER BY al.created_at DESC
LIMIT 10;"

# Count sign-ins by user
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT u.email, COUNT(*) as login_count, MAX(al.created_at) as last_login
FROM user_audit_log al
JOIN users u ON al.user_id = u.id
WHERE al.action = 'login'
GROUP BY u.email
ORDER BY login_count DESC;"

# View all user activities
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT u.email, al.action, al.created_at
FROM user_audit_log al
JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 20;"
```

### Verification Commands

```bash
# Check auth tables exist
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'user_roles', 'accounts', 'sessions')
ORDER BY table_name;"

# Count records in auth tables
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL SELECT 'user_audit_log', COUNT(*) FROM user_audit_log;"
```

---

## Docker Commands

```bash
# Rebuild frontend with new auth config
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Restart frontend
docker-compose restart frontend

# View frontend logs
docker-compose logs -f frontend

# Check environment variables in container
docker exec frontend env | grep -E "NEXTAUTH|GOOGLE|MICROSOFT|DB_"

# Access frontend shell
docker exec -it frontend sh
```

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Symptoms:**
- Authentication fails with database connection error
- NextAuth adapter errors in logs

**Solution:**
```bash
# 1. Check database is running
docker-compose ps feedback_db

# 2. Test connection
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT 1"

# 3. Verify tables exist
docker exec -it feedback_db psql -U feedback_user -d feedback -c "\dt" | grep users

# 4. If tables missing, run migration
./database/04-nextauth-users.sh
```

---

### Issue: "User not authorized"

**Symptoms:**
- OAuth succeeds but redirects to `/auth/unauthorized`
- User email not found or inactive

**Solution:**
```bash
# 1. Check if email exists in database
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT email, is_active FROM users WHERE email='user@example.com';"

# 2. If not found, add user
ADMIN_EMAIL="user@example.com" ADMIN_NAME="User Name" ./database/05-add-initial-admin.sh

# 3. If found but inactive, activate
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE users SET is_active=TRUE WHERE email='user@example.com';"
```

---

### Issue: "Invalid client" from Google

**Possible Causes:**
- Wrong Client ID or Secret
- Redirect URI mismatch
- Using wrong Google project

**Solution:**
```bash
# 1. Verify credentials in .env
cat .env | grep GOOGLE

# 2. Check redirect URI in Google Console matches exactly:
# https://gea.your-domain.com/api/auth/callback/google

# 3. Restart application
docker-compose restart frontend

# 4. Clear browser cache/cookies
```

---

### Issue: "Invalid client" from Microsoft

**Possible Causes:**
- Wrong Client ID, Secret, or Tenant ID
- Redirect URI not configured
- Client secret expired

**Solution:**
```bash
# 1. Verify all credentials
cat .env | grep MICROSOFT

# 2. Check redirect URI in Azure Portal matches exactly:
# https://gea.your-domain.com/api/auth/callback/azure-ad

# 3. Verify client secret hasn't expired (Azure Portal)

# 4. Restart application
docker-compose restart frontend
```

---

### Issue: Environment variables not loading

**Symptoms:**
- `undefined` errors for GOOGLE_CLIENT_ID, etc.
- OAuth providers not appearing

**Solution:**
```bash
# 1. Check .env file exists
ls -la .env

# 2. For Docker deployment, rebuild
docker-compose build frontend
docker-compose up -d frontend

# 3. Verify variables in container
docker exec frontend env | grep NEXTAUTH

# 4. Check for syntax errors in .env
cat .env
```

---

### Issue: OAuth redirect loops

**Cause:** Redirect URI mismatch or session issues

**Solution:**
1. Verify `NEXTAUTH_URL` matches your actual domain
2. Clear browser cookies
3. Check browser console for errors
4. Verify OAuth redirect URIs in provider consoles

---

### Issue: Session expires too quickly

**Cause:** Default 2-hour session timeout

**Solution:** Adjust in `lib/auth.ts`:
```typescript
session: {
  strategy: 'jwt',
  maxAge: 8 * 60 * 60, // Change to 8 hours
},
```

---

## Security

### Best Practices

#### 1. OAuth Credentials
- ✅ Never commit `.env` to version control
- ✅ Use strong, unique secrets for `NEXTAUTH_SECRET`
- ✅ Rotate OAuth secrets periodically
- ✅ Restrict OAuth redirect URIs to exact production URLs

#### 2. User Access Control
- ✅ Review user list regularly
- ✅ Deactivate users immediately when they leave
- ✅ Use principle of least privilege (assign Staff role when possible)
- ✅ Monitor audit logs for suspicious activity

#### 3. Session Management
- ✅ 2-hour session timeout (default)
- ✅ JWT tokens signed with `NEXTAUTH_SECRET`
- ✅ httpOnly cookies (prevents XSS)
- ✅ sameSite: 'strict' (prevents CSRF)

#### 4. Database Security
- ✅ No passwords stored (OAuth only)
- ✅ Email addresses are unique identifiers
- ✅ All queries parameterized (SQL injection prevention)
- ✅ Audit logging for accountability

#### 5. API Security
- ✅ Session validation on every protected route
- ✅ Role-based authorization checks
- ✅ Entity-based data filtering for staff
- ✅ No sensitive data in JWT payload (only user ID and roles)

### Security Checklist

Before going to production:

- [ ] `NEXTAUTH_SECRET` is strong (32+ chars, random)
- [ ] Google OAuth redirect URI matches production URL exactly
- [ ] Microsoft OAuth redirect URI matches production URL exactly
- [ ] `.env` file is in `.gitignore`
- [ ] OAuth secrets are stored securely (not in code)
- [ ] Database password is strong (not default)
- [ ] At least one admin user exists in database
- [ ] Test sign-in flow with both Google and Microsoft
- [ ] Test unauthorized access handling
- [ ] Verify inactive users cannot sign in
- [ ] Review user audit logs

---

## Quick Reference

### Session Object Structure

```typescript
session = {
  user: {
    id: "uuid",                        // User UUID
    email: "user@gov.gd",              // OAuth email
    name: "User Name",                 // Display name
    image: "https://...",              // OAuth profile picture
    roleId: 1,                         // Role ID
    roleCode: "admin_dta",             // Role code
    roleType: "admin",                 // admin | staff | public
    entityId: "MIN-001" | null,        // Entity ID (null for admin)
    isActive: true                     // Active status
  },
  expires: "2025-11-24T12:00:00Z"      // Session expiration
}
```

### Quick Code Snippets

**Check Session in API Route:**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check role
  if (session.user.roleType !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Use session data
  console.log(session.user.email, session.user.roleCode);
}
```

**Use Session in Client Component:**
```typescript
'use client';
import { useSession } from 'next-auth/react';

export default function MyComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Hello, {session.user.name}!</div>;
}
```

**Filter Data by Entity (Staff):**
```typescript
let query = 'SELECT * FROM tickets';
const params: any[] = [];

if (session.user.roleType === 'staff') {
  query += ' WHERE entity_id = $1';
  params.push(session.user.entityId);
}

const result = await pool.query(query, params);
```

### Common Tasks Checklists

#### Setting Up Authentication

- [ ] Run database migration (`04-nextauth-users.sh`)
- [ ] Add initial admin user (`05-add-initial-admin.sh`)
- [ ] Generate `NEXTAUTH_SECRET`
- [ ] Set up Google OAuth in Cloud Console
- [ ] (Optional) Set up Microsoft OAuth in Azure Portal
- [ ] Configure `.env` with all credentials
- [ ] Restart application
- [ ] Test sign-in with authorized email
- [ ] Test sign-in with unauthorized email (should fail)
- [ ] Verify audit logs are working

#### Adding a New User

- [ ] Obtain user's email (must match their OAuth account)
- [ ] Decide on role (Admin or Staff)
- [ ] If Staff, determine which entity they belong to
- [ ] Add via Admin UI (`/admin/users`) OR via database script
- [ ] Verify user can sign in
- [ ] Check user appears in audit log after sign-in

#### Troubleshooting Failed Sign-In

- [ ] Check user exists in database
- [ ] Verify user is active (`is_active = TRUE`)
- [ ] Confirm email matches exactly (case-sensitive)
- [ ] Check OAuth credentials in `.env`
- [ ] Verify redirect URIs in provider consoles
- [ ] Review frontend logs for errors
- [ ] Test database connection

---

## See Also

### Related Documentation

- **[API Reference](API_REFERENCE.md)** - User management API endpoints
- **[Database Reference](DATABASE_REFERENCE.md)** - Authentication table schemas
- **[Complete Documentation Index](index.md)** - Overview of all documentation

### External Resources

- **[NextAuth Documentation](https://next-auth.js.org/)** - Official NextAuth docs
- **[Google OAuth Setup](https://console.cloud.google.com/)** - Google Cloud Console
- **[Microsoft OAuth Setup](https://portal.azure.com/)** - Azure Portal

---

**Document Version:** 2.0
**Last Updated:** November 24, 2025
**Maintained By:** GEA Portal Development Team
