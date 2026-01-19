# Authentication & Authorization Guide

**GEA Portal v3 - Dual Authentication System**
- **Admin/Staff:** OAuth (Google & Microsoft)
- **Citizens:** Twilio SMS OTP Verification

**Last Updated:** January 19, 2026
**Status:** ✅ Production Ready
**Authentication:**
- **Admin/Staff:** NextAuth v4 with OAuth (Google & Microsoft)
- **Citizens:** Twilio SMS OTP + Password Authentication

---

## 📋 Table of Contents

### Admin/Staff Authentication (OAuth)
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [OAuth Setup](#oauth-setup)
6. [Configuration](#configuration)
7. [User Management](#user-management)
8. [API Integration](#api-integration)

### Citizen Authentication (Twilio SMS OTP)
9. [Citizen Authentication Overview](#citizen-authentication-overview)
10. [Twilio SMS OTP Setup](#twilio-sms-otp-setup)
11. [Citizen Authentication Flow](#citizen-authentication-flow)
12. [Citizen Database Schema](#citizen-database-schema)
13. [Phone Number Validation](#phone-number-validation)
14. [Citizen API Endpoints](#citizen-api-endpoints)
15. [Citizen Configuration](#citizen-configuration)

### Operations & Maintenance
16. [Database Commands](#database-commands)
17. [Docker Commands](#docker-commands)
18. [Troubleshooting](#troubleshooting)
19. [Security](#security)
20. [Quick Reference](#quick-reference)

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
| `/admin/users` | Admin & Staff | User management (staff: view/add for own entity only) |
| `/admin/settings` | Admin only | System settings |
| `/admin/ai-inventory` | Admin only | AI bot management |
| `/staff` | Staff only | Staff portal |
| `/api/admin/*` | Admin/Staff | Admin APIs (with role-based restrictions) |

---

## Quick Start

### 5-Minute Setup

```bash
# 1. Run database migration
cd /home/ab/Projects/gogeaportal/v3
./database/04-nextauth-users.sh

# 2. Add your admin user
ADMIN_EMAIL="your-email@gov.gd" ADMIN_NAME="Your Name" ./database/scripts/05-add-initial-admin.sh

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
ADMIN_EMAIL="your-email@gov.gd" ADMIN_NAME="Your Name" ./database/scripts/05-add-initial-admin.sh
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

> **Note:** Azure Portal UI may change over time. These steps are accurate as of late 2025. Look for similar options if the exact navigation differs.

#### Step 1: Register Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Search for "App registrations" in the top search bar (or navigate to Azure Active Directory → App registrations)
3. Click "New registration"

#### Step 2: Configure App

- **Name:** "GEA Portal"
- **Supported account types:** "Accounts in any organizational directory and personal Microsoft accounts" (for broad access) or select your specific tenant type
- **Redirect URI:**
  - Platform: Web
  - URI: `https://gea.your-domain.com/api/auth/callback/azure-ad`

#### Step 3: Create Client Secret

1. In your app registration, go to "Certificates & secrets" in the left sidebar
2. Under "Client secrets", click "New client secret"
3. Description: "GEA Portal Production"
4. Expires: 24 months (recommended - set a reminder to rotate before expiry)
5. **Important:** Copy the secret **Value** immediately (won't be shown again after leaving this page)

#### Step 4: Copy IDs

From the app registration "Overview" page, copy:
- **Application (client) ID** - This goes in `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** - This goes in `MICROSOFT_TENANT_ID` (use `common` for multi-tenant)

#### Step 5: API Permissions

1. Go to "API permissions" in the left sidebar
2. Click "Add a permission" → "Microsoft Graph" → "Delegated permissions"
3. Ensure these permissions are added:
   - `User.Read` (delegated) - Usually added by default
   - `email` (under OpenID permissions)
   - `profile` (under OpenID permissions)
4. If you have admin access, click "Grant admin consent for [Your Tenant]"

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

## Citizen Authentication Overview

The GEA Portal implements a **dual authentication system**:
- **Admin/Staff** use OAuth (Google/Microsoft) for secure enterprise access
- **Citizens** use SMS OTP verification for passwordless mobile-first authentication

### Citizen Authentication Features

✅ **SMS OTP Verification** - Twilio Verify for secure one-time passwords
✅ **Phone-Based Authentication** - No email required, mobile-first approach
✅ **Region Validation** - Configurable allowed countries (Grenada + Caribbean by default)
✅ **Passwordless Login** - Optional: OTP-only OR OTP + password for returning users
✅ **Device Trust** - "Remember this device" for 30-day trusted sessions
✅ **Session Management** - Configurable session duration (default: 24 hours)
✅ **Account Blocking** - Admin can block/unblock citizen accounts
✅ **Audit Logging** - Login attempts, OTP requests, and account activity tracked

### Citizen vs Admin/Staff Authentication

| Feature | Admin/Staff (OAuth) | Citizens (Twilio OTP) |
|---------|---------------------|----------------------|
| **Auth Method** | Google/Microsoft OAuth | SMS OTP → Optional Password |
| **Database** | `users` table | `citizens` table |
| **Identifier** | Email address | Phone number (E.164) |
| **Session Storage** | NextAuth sessions | `citizen_sessions` table |
| **Access Level** | Full admin portal | Citizen-facing features only |
| **Typical Use** | Government staff | General public |

---

## Twilio SMS OTP Setup

### Prerequisites

1. **Twilio Account** (free or paid)
2. **Twilio Verify Service** configured
3. **Phone number** for sending SMS (provided by Twilio)

### Step 1: Create Twilio Account

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for an account
3. Complete phone verification

### Step 2: Create Verify Service

1. Navigate to **Verify** → **Services** in Twilio Console
2. Click **Create new Service**
3. **Service Name:** "GEA Portal OTP"
4. **Code Length:** 6 digits (default)
5. **Code Expiry:** 10 minutes (recommended)
6. Click **Create**

### Step 3: Get Credentials

From Twilio Console, copy these values:

```bash
# Account SID (starts with AC...)
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Auth Token (from Account Dashboard → API credentials)
Auth Token: your_auth_token_here

# Verify Service SID (from Verify → Services)
Verify Service SID: VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Configure Environment Variables

Add to your `.env` file:

```bash
# === Twilio Verify SMS OTP ===
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Enable Citizen Login in Admin Settings

1. Navigate to **Admin Portal** → **Settings** → **Citizen Login**
2. Toggle "Enable Citizen Login" to **ON**
3. Configure settings:
   - **Allowed Countries:** Select Grenada + other allowed regions
   - **OTP Expiry Minutes:** 10 (default)
   - **Session Duration Hours:** 24 (default)
   - **Max Failed Attempts:** 5 (default)
4. Click **Test SMS** to verify Twilio is working
5. Click **Save Changes**

### Pricing (As of 2026)

- **Twilio Verify:** $0.05 per verification (including SMS)
- **Free Trial:** $15 credit for testing
- **Estimated Monthly Cost:**
  - 1,000 OTP verifications = ~$50/month
  - 5,000 OTP verifications = ~$250/month

---

## Citizen Authentication Flow

### Registration Flow (New User)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Citizen visits /citizen/login                           │
│     ↓                                                        │
│  2. Enter phone number (+14731234567)                       │
│     ↓                                                        │
│  3. POST /api/citizen/auth/send-otp                         │
│     → Validates phone against allowed regions               │
│     → Sends 6-digit OTP via Twilio Verify                   │
│     ↓                                                        │
│  4. Enter OTP code received via SMS                         │
│     ↓                                                        │
│  5. POST /api/citizen/auth/verify-otp                       │
│     → Verifies OTP with Twilio                              │
│     → Creates citizen record in database                    │
│     → Returns requiresRegistration: true                    │
│     ↓                                                        │
│  6. Complete registration form (name, email, password)      │
│     ↓                                                        │
│  7. POST /api/citizen/auth/complete-registration            │
│     → Hashes password (bcrypt)                              │
│     → Marks registration_complete = true                    │
│     → Creates session                                        │
│     ↓                                                        │
│  8. Redirected to citizen dashboard                         │
└─────────────────────────────────────────────────────────────┘
```

### Login Flow (Returning User)

**Option 1: OTP-Only Login** (Passwordless)
```
┌─────────────────────────────────────────────────────────────┐
│  1. Enter phone number                                       │
│     ↓                                                        │
│  2. Click "Send Code"                                        │
│     → POST /api/citizen/auth/send-otp                       │
│     ↓                                                        │
│  3. Enter OTP code from SMS                                  │
│     ↓                                                        │
│  4. POST /api/citizen/auth/verify-otp                       │
│     → Finds existing citizen by phone                       │
│     → Registration already complete → Creates session       │
│     ↓                                                        │
│  5. Logged in → Citizen dashboard                           │
└─────────────────────────────────────────────────────────────┘
```

**Option 2: Password Login** (Faster for returning users)
```
┌─────────────────────────────────────────────────────────────┐
│  1. Enter phone + password                                   │
│     ↓                                                        │
│  2. POST /api/citizen/auth/login                            │
│     → Verifies bcrypt password                              │
│     → Creates session                                        │
│     ↓                                                        │
│  3. Logged in → Citizen dashboard                           │
└─────────────────────────────────────────────────────────────┘
```

### Device Trust ("Remember This Device")

When enabled:
- Creates a long-lived device token (30 days)
- Stored in `citizen_trusted_devices` table
- Next login on trusted device: Skip OTP, fast password-only login
- Revocable via account settings

---

## Citizen Database Schema

### Tables Created (5 tables)

#### 1. **citizens** - Phone-based user accounts
```sql
CREATE TABLE citizens (
    citizen_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,           -- E.164 format (+14731234567)
    phone_verified BOOLEAN DEFAULT false,
    name VARCHAR(100),
    email VARCHAR(255),
    password_hash VARCHAR(255),                  -- bcrypt hash (optional)
    registration_complete BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,              -- Admin can block accounts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

**Key Fields:**
- `phone` - E.164 format (+country + number, e.g., +14731234567)
- `phone_verified` - Set to `true` after OTP verification
- `registration_complete` - `false` until name/email/password provided
- `is_active` - Admin can set to `false` to block account

#### 2. **citizen_otp** - SMS verification codes
```sql
CREATE TABLE citizen_otp (
    otp_id SERIAL PRIMARY KEY,
    citizen_id UUID REFERENCES citizens(citizen_id),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'login',          -- login | register | reset_password
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,                   -- Max 3 attempts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> **Note:** With Twilio Verify, OTPs are managed by Twilio (not stored in this table). This table is for custom OTP implementations or fallback.

#### 3. **citizen_sessions** - Active sessions
```sql
CREATE TABLE citizen_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES citizens(citizen_id),
    token VARCHAR(255) UNIQUE NOT NULL,           -- Secure random token
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Session Duration:** Configurable via admin settings (default: 24 hours)

#### 4. **citizen_trusted_devices** - Device trust tokens
```sql
CREATE TABLE citizen_trusted_devices (
    device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES citizens(citizen_id),
    device_token VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(100),                     -- e.g., "iPhone 14"
    device_fingerprint VARCHAR(255),               -- Browser/device hash
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,                -- 30 days default
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. **citizen_account_blocks** - Account blocking/suspensions
```sql
CREATE TABLE citizen_account_blocks (
    block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES citizens(citizen_id),
    blocked_by UUID REFERENCES users(id),         -- Admin who blocked
    reason TEXT,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unblocked_at TIMESTAMP,
    unblocked_by UUID REFERENCES users(id)
);
```

---

## Phone Number Validation

### E.164 Format

All phone numbers must be in **E.164 international format**:
- Starts with `+`
- Country code + national number
- No spaces, dashes, or parentheses

**Examples:**
- ✅ `+14731234567` (Grenada)
- ✅ `+442071234567` (UK)
- ✅ `+15551234567` (USA)
- ❌ `473-123-4567` (not E.164)
- ❌ `1-473-123-4567` (not E.164)
- ❌ `(473) 123-4567` (not E.164)

### Allowed Regions Configuration

Configurable via Admin Settings → Citizen Login:

**Default Allowed Regions:**
- **Grenada** (+1-473) - Primary
- **Caribbean Islands:** Antigua, Barbados, Dominica, Jamaica, St. Lucia, Trinidad, etc.
- **Extended:** USA, UK, Canada (optional)

**Custom Country Codes:**
Admins can add custom country codes not in the predefined list:
```
+852  (Hong Kong)
+971  (UAE)
+65   (Singapore)
```

### Validation Logic

```typescript
// Phone number validation flow
1. Normalize: Remove non-digits, add '+' prefix
2. E.164 Check: Must match pattern ^\+[1-9]\d{6,14}$
3. Region Check: Must start with allowed country code
4. Special Cases:
   - +1 numbers: Distinguish Caribbean vs USA/Canada by area code
   - Caribbean area codes: 268, 246, 473, 758, etc.
   - Canadian area codes: 416, 604, 778, etc.
```

### Supported Regions Reference

| Region | Country Code | Example |
|--------|--------------|---------|
| Grenada | +1-473 | +14731234567 |
| Antigua & Barbuda | +1-268 | +12681234567 |
| Barbados | +1-246 | +12461234567 |
| Jamaica | +1-876, +1-658 | +18761234567 |
| Trinidad & Tobago | +1-868 | +18681234567 |
| St. Lucia | +1-758 | +17581234567 |
| Guyana | +592 | +5921234567 |
| United Kingdom | +44 | +442071234567 |
| United States | +1 | +15551234567 |
| Canada | +1 | +14161234567 |

---

## Citizen API Endpoints

### 1. Send OTP

**Endpoint:** `POST /api/citizen/auth/send-otp`

**Request:**
```json
{
  "phone": "+14731234567"
}
```

**Response (New User):**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "isNewUser": true,
  "phone": "+14731234567",
  "expiresIn": 600
}
```

**Response (Existing User):**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "isNewUser": false,
  "phone": "+14731234567",
  "expiresIn": 600
}
```

**Errors:**
- `400` - Invalid phone number or not from allowed region
- `403` - Citizen login is disabled
- `500` - Twilio service error

---

### 2. Verify OTP

**Endpoint:** `POST /api/citizen/auth/verify-otp`

**Request:**
```json
{
  "phone": "+14731234567",
  "code": "123456",
  "rememberDevice": true
}
```

**Response (New User - Registration Required):**
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "requiresRegistration": true,
  "citizenId": "uuid-here",
  "phone": "+14731234567"
}
```

**Response (Existing User - Login Successful):**
```json
{
  "success": true,
  "message": "Login successful",
  "requiresRegistration": false,
  "citizen": {
    "citizenId": "uuid-here",
    "phone": "+14731234567",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "session": {
    "sessionId": "uuid-here",
    "expiresAt": "2026-01-20T12:00:00Z"
  }
}
```

**Errors:**
- `400` - Invalid OTP code
- `401` - OTP expired or incorrect
- `403` - Max attempts exceeded

---

### 3. Password Login

**Endpoint:** `POST /api/citizen/auth/login`

**Request:**
```json
{
  "phone": "+14731234567",
  "password": "SecurePassword123!",
  "rememberDevice": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "citizen": {
    "citizenId": "uuid-here",
    "phone": "+14731234567",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "session": {
    "sessionId": "uuid-here",
    "expiresAt": "2026-01-20T12:00:00Z"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account blocked
- `404` - Account not found

---

## Citizen Configuration

### Admin Settings UI

Navigate to `/admin/settings` → **Citizen Login** tab:

#### Basic Settings
- **Enable Citizen Login:** Toggle ON/OFF
- **Require Registration:** Force name/email/password (vs OTP-only)
- **Allow Password Login:** Enable password-based login for returning users

#### OTP Settings
- **OTP Expiry Minutes:** How long OTP codes are valid (default: 10)
- **Max OTP Attempts:** Maximum verification attempts before requesting new code (default: 3)
- **Resend Cooldown Seconds:** Minimum time between OTP requests (default: 60)

#### Session Settings
- **Session Duration Hours:** How long sessions last (default: 24)
- **Device Trust Duration Days:** How long "remember device" tokens last (default: 30)
- **Max Sessions Per User:** Maximum concurrent sessions (default: 5)

#### Security Settings
- **Allowed Countries:** Select regions from predefined list
- **Custom Country Codes:** Add additional country codes (e.g., +852, +971)
- **Max Failed Login Attempts:** Lockout threshold (default: 5)
- **Account Lockout Minutes:** How long accounts are locked after max attempts (default: 30)

#### Twilio Configuration
- **Twilio Account SID:** AC... (from environment variables)
- **Twilio Auth Token:** Configured (masked)
- **Twilio Verify Service SID:** VA... (from environment variables)
- **Test SMS:** Send test OTP to verify configuration

### Environment Variables

```bash
# === Twilio Verify SMS OTP ===
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# === Citizen Login Settings (optional - defaults used if not set) ===
CITIZEN_LOGIN_ENABLED=true
CITIZEN_OTP_EXPIRY_MINUTES=10
CITIZEN_SESSION_HOURS=24
CITIZEN_DEVICE_TRUST_DAYS=30
CITIZEN_MAX_FAILED_ATTEMPTS=5
```

### Database Settings

Settings are stored in `system_settings` table with category `citizen_login`:

```sql
-- View citizen login settings
SELECT setting_key, setting_value, data_type, description
FROM system_settings
WHERE category = 'citizen_login'
ORDER BY setting_key;
```

**Key Settings:**
- `citizen_login_enabled` (boolean) - Master toggle
- `citizen_allowed_countries` (json) - Array of allowed region codes
- `citizen_custom_country_codes` (json) - Custom +codes
- `citizen_otp_expiry_minutes` (number) - OTP validity duration
- `citizen_session_hours` (number) - Session duration

---

## Database Commands

### Admin/Staff User Management Commands

```bash
# List all admin/staff users
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

### Citizen Management Commands

```bash
# List all citizens
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT citizen_id, phone, name, email, phone_verified, registration_complete, is_active, last_login
FROM citizens
ORDER BY created_at DESC
LIMIT 20;"

# Find citizen by phone
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT citizen_id, phone, name, email, is_active, registration_complete
FROM citizens
WHERE phone = '+14731234567';"

# Count citizens by status
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT
    COUNT(*) FILTER (WHERE registration_complete = true) as registered,
    COUNT(*) FILTER (WHERE registration_complete = false) as pending_registration,
    COUNT(*) FILTER (WHERE is_active = false) as blocked,
    COUNT(*) as total
FROM citizens;"

# View recent citizen logins
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT c.phone, c.name, c.last_login
FROM citizens c
WHERE c.last_login IS NOT NULL
ORDER BY c.last_login DESC
LIMIT 10;"

# View active citizen sessions
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT cs.session_id, c.phone, c.name, cs.ip_address, cs.expires_at, cs.created_at
FROM citizen_sessions cs
JOIN citizens c ON cs.citizen_id = c.citizen_id
WHERE cs.expires_at > NOW()
ORDER BY cs.created_at DESC;"

# Block citizen account
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE citizens
SET is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE phone = '+14731234567';"

# Unblock citizen account
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE citizens
SET is_active = true, updated_at = CURRENT_TIMESTAMP
WHERE phone = '+14731234567';"

# Delete citizen (with all related data)
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
DELETE FROM citizens WHERE phone = '+14731234567';"

# View citizen trusted devices
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT ctd.device_id, c.phone, ctd.device_name, ctd.last_used_at, ctd.expires_at
FROM citizen_trusted_devices ctd
JOIN citizens c ON ctd.citizen_id = c.citizen_id
WHERE ctd.expires_at > NOW()
ORDER BY ctd.last_used_at DESC;"
```

### Verification Commands

```bash
# Check auth tables exist (both admin and citizen)
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'users', 'user_roles', 'accounts', 'sessions',
  'citizens', 'citizen_sessions', 'citizen_trusted_devices'
)
ORDER BY table_name;"

# Count records in all auth tables
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT 'Admin/Staff Users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'OAuth Accounts', COUNT(*) FROM accounts
UNION ALL SELECT 'Admin Sessions', COUNT(*) FROM sessions
UNION ALL SELECT 'Citizens', COUNT(*) FROM citizens
UNION ALL SELECT 'Citizen Sessions', COUNT(*) FROM citizen_sessions
UNION ALL SELECT 'Trusted Devices', COUNT(*) FROM citizen_trusted_devices
UNION ALL SELECT 'User Audit Log', COUNT(*) FROM user_audit_log;"
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

### Issue: Twilio OTP not sending

**Symptoms:**
- "Failed to send verification code" error
- SMS not received
- Twilio errors in logs

**Solution:**
```bash
# 1. Verify Twilio credentials in .env
cat .env | grep TWILIO

# 2. Test Twilio configuration via admin UI
# Navigate to /admin/settings → Citizen Login → Test SMS

# 3. Check Twilio console for error logs
# https://console.twilio.com/us1/monitor/logs/errors

# 4. Verify phone number format
# Must be E.164: +country code + number
# Example: +14731234567 (not 473-123-4567)

# 5. Check Twilio Verify service status
# https://console.twilio.com/us1/develop/verify/services

# 6. Restart frontend container
docker compose restart frontend
```

**Common Twilio Errors:**
- `21211` - Invalid phone number format
- `21614` - Not a valid mobile number (landline provided)
- `60203` - Too many attempts (rate limited by Twilio)
- `60212` - Too many requests from IP (rate limiting)

---

### Issue: "Phone number not from allowed region"

**Symptoms:**
- Valid phone number rejected
- Caribbean numbers failing validation

**Solution:**
```bash
# 1. Check allowed countries in admin settings
# /admin/settings → Citizen Login → Allowed Countries

# 2. Verify phone number format
# Must be E.164 with + prefix

# 3. Add custom country code if needed
# /admin/settings → Citizen Login → Custom Country Codes
# Example: +971 for UAE

# 4. Check phone validation logic
docker exec frontend cat /app/src/lib/twilio.ts | grep -A 20 "validatePhone"
```

---

### Issue: Citizen account blocked/login failing

**Symptoms:**
- Login returns "account_blocked" error
- Valid credentials rejected

**Solution:**
```bash
# 1. Check if account is blocked
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT is_active, phone, name FROM citizens WHERE phone = '+14731234567';"

# 2. Unblock account
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
UPDATE citizens SET is_active = true WHERE phone = '+14731234567';"

# 3. Check for account blocks
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT cb.*, c.phone, c.name
FROM citizen_account_blocks cb
JOIN citizens c ON cb.citizen_id = c.citizen_id
WHERE cb.unblocked_at IS NULL;"
```

---

### Issue: OTP expired or invalid

**Symptoms:**
- "Verification code has expired" error
- Valid code rejected

**Solution:**
- Twilio Verify OTPs expire after 10 minutes (configurable in Twilio)
- Users must enter code within expiry window
- Request a new code if expired
- Check OTP expiry setting in Admin Settings → Citizen Login

---

## Security

### Admin/Staff Authentication Security

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

---

### Citizen Authentication Security

#### 1. Twilio SMS Security
- ✅ Twilio Verify handles OTP generation and expiry
- ✅ OTPs are 6 digits, expire after 10 minutes
- ✅ Rate limiting: Max 3 verification attempts per code
- ✅ Twilio credentials stored in environment variables (never in code)
- ✅ SMS delivery confirmation tracked

#### 2. Phone Number Security
- ✅ E.164 format validation (international standard)
- ✅ Region-based validation (configurable allowed countries)
- ✅ Phone numbers are unique identifiers (one account per phone)
- ✅ Phone verification required before account activation
- ✅ Normalized and stored consistently

#### 3. Password Security
- ✅ bcrypt hashing with salt (cost factor: 10)
- ✅ Minimum 8 characters, complexity not enforced (user choice)
- ✅ Never stored in plain text
- ✅ Password is optional (OTP-only login supported)
- ✅ Failed login attempts tracked and limited

#### 4. Session Security
- ✅ Secure random tokens (256-bit)
- ✅ httpOnly cookies (prevents XSS)
- ✅ sameSite: 'strict' (prevents CSRF)
- ✅ Configurable session duration (default: 24 hours)
- ✅ IP address and user agent logging
- ✅ Concurrent session limits (default: 5 per user)

#### 5. Device Trust Security
- ✅ Separate long-lived tokens for trusted devices
- ✅ 30-day expiry (configurable)
- ✅ Device fingerprinting to prevent token theft
- ✅ User can revoke trust at any time
- ✅ Automatic cleanup of expired device tokens

#### 6. Account Protection
- ✅ Admin can block/unblock accounts instantly
- ✅ Block reason tracked for audit
- ✅ Max failed login attempts (default: 5)
- ✅ Account lockout after max attempts (default: 30 minutes)
- ✅ All login attempts logged with IP and timestamp

#### 7. Rate Limiting
- ✅ OTP resend cooldown (default: 60 seconds)
- ✅ Max OTP requests per hour (Twilio Verify enforced)
- ✅ Failed login attempt tracking
- ✅ IP-based rate limiting on auth endpoints

---

### Combined Security Checklist

#### Admin/Staff Authentication
- [ ] `NEXTAUTH_SECRET` is strong (32+ chars, random)
- [ ] Google OAuth redirect URI matches production URL exactly
- [ ] Microsoft OAuth redirect URI matches production URL exactly (if enabled)
- [ ] `.env` file is in `.gitignore`
- [ ] OAuth secrets are stored securely (not in code)
- [ ] Database password is strong (not default)
- [ ] At least one admin user exists in database
- [ ] Test sign-in flow with both Google and Microsoft
- [ ] Test unauthorized access handling
- [ ] Verify inactive users cannot sign in
- [ ] Review user audit logs

#### Citizen Authentication (if enabled)
- [ ] Twilio credentials configured correctly in `.env`
- [ ] Twilio Verify service created and active
- [ ] Test SMS delivery to Grenada numbers (+1-473)
- [ ] Configure allowed countries in Admin Settings
- [ ] Test OTP flow: send → receive → verify
- [ ] Test invalid OTP rejection
- [ ] Test OTP expiry (10 minutes)
- [ ] Verify rate limiting works (resend cooldown)
- [ ] Test password login (if enabled)
- [ ] Test account blocking/unblocking
- [ ] Configure session duration appropriately
- [ ] Test device trust functionality (if enabled)
- [ ] Review citizen login audit logs
- [ ] Verify phone number validation (E.164 format)
- [ ] Test with different phone number regions

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

**Document Version:** 3.0
**Last Updated:** January 19, 2026
**Maintained By:** GEA Portal Development Team

**Change Log:**
- v3.0 (Jan 19, 2026): **Major update** - Added comprehensive Twilio SMS OTP citizen authentication documentation. Includes: setup guide, authentication flows, database schema (5 tables), phone validation (E.164 + regional), API endpoints, configuration, security best practices, troubleshooting, and database commands
- v2.1 (Jan 17, 2026): Updated admin/staff OAuth authentication
- v2.0: Initial OAuth authentication documentation
