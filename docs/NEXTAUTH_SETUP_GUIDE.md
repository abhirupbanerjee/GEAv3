# NextAuth Implementation - Setup Guide

**Status:** ✅ Implementation Complete
**Date:** November 22, 2025
**Version:** 1.0

---

## 🎉 Implementation Summary

Phase 1 of the NextAuth + Staff Portal implementation is **COMPLETE**. All core authentication infrastructure has been successfully implemented and is ready for configuration and testing.

### What's Been Implemented

✅ **Database Layer**
- 8 new tables created in `feedback_db`
- User roles (admin_dta, staff_mda, public_user)
- NextAuth tables (accounts, sessions, verification_tokens)
- Entity-based user assignments
- Audit logging system

✅ **Authentication System**
- NextAuth configuration with PostgreSQL adapter
- Google OAuth provider integration (Microsoft commented out, ready to enable)
- Custom sign-in page with branded UI
- Unauthorized access page with helpful error messages
- Session management (JWT-based, 2-hour timeout)

✅ **Authorization System**
- Database-backed email whitelist
- Role-based access control (Admin, Staff, Public)
- Entity-based data filtering for staff users
- Middleware protection for /admin and /staff routes

✅ **Admin Portal Features**
- User management UI (view, add, activate/deactivate users)
- Role selection
- Entity assignment for staff users
- User search and filtering
- Activity tracking

✅ **API Endpoints**
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Add new user
- `PATCH /api/admin/users/[id]` - Update user
- `DELETE /api/admin/users/[id]` - Deactivate user
- `GET /api/admin/roles` - List roles
- `GET /api/admin/entities` - List entities

---

## 📁 Files Created

### Database Scripts
```
database/
├── 04-nextauth-users.sh          # Main migration script
└── 05-add-initial-admin.sh       # Add first admin user
```

### Frontend - Authentication
```
frontend/src/
├── lib/
│   └── auth.ts                   # NextAuth configuration
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts      # NextAuth API handler
│   └── auth/
│       ├── signin/
│       │   └── page.tsx          # Custom sign-in page
│       └── unauthorized/
│           └── page.tsx          # Unauthorized error page
├── middleware.ts                 # Route protection (UPDATED)
└── .env.example                  # Environment variables template
```

### Frontend - Admin Portal
```
frontend/src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx            # SessionProvider wrapper (UPDATED)
│   │   └── users/
│   │       └── page.tsx          # User management UI
│   └── api/
│       └── admin/
│           ├── users/
│           │   ├── route.ts      # List/add users
│           │   └── [id]/
│           │       └── route.ts  # Update/delete user
│           ├── roles/
│           │   └── route.ts      # List roles
│           └── entities/
│               └── route.ts      # List entities
```

---

## 🚀 Next Steps: Configuration & Testing

### Step 1: Add Initial Admin User

Before you can sign in, you need to add at least one admin user to the database:

```bash
# From the project root
cd /home/ab/Projects/gogeaportal/v3

# Add your admin user (replace with your actual email)
ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh
```

**IMPORTANT:** The email you provide MUST match the Google account you'll use to sign in.

### Step 2: Set Up Google OAuth

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a Project** (or use existing)
   - Click "Select a project" → "New Project"
   - Name: "GEA Portal"
   - Click "Create"

3. **Enable Google+ API**
   - In the dashboard, click "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "GEA Portal - Development"

5. **Configure Authorized Redirect URIs**
   Add these URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://gea.abhirup.app/api/auth/callback/google
   ```

6. **Copy Credentials**
   - Copy the "Client ID" (looks like: `xxxxx.apps.googleusercontent.com`)
   - Copy the "Client Secret"
   - Keep these secure!

### Step 3: Configure Environment Variables

```bash
# From frontend directory
cd /home/ab/Projects/gogeaportal/v3/frontend

# Copy the example file
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

**Required Configuration:**

```bash
# Generate a secure secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Set your application URL
NEXTAUTH_URL=http://localhost:3000  # Development
# NEXTAUTH_URL=https://gea.abhirup.app  # Production

# Add Google OAuth credentials (from Step 2)
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Database credentials (should already match docker-compose.yml)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=feedback
DB_USER=feedback_user
DB_PASSWORD=your_secure_password_here
```

### Step 4: Start the Development Server

```bash
# Make sure database is running
cd /home/ab/Projects/gogeaportal/v3
docker-compose up -d

# Start Next.js development server
cd frontend
npm run dev
```

The application should now be running at http://localhost:3000

### Step 5: Test Authentication Flow

1. **Visit the Admin Portal**
   ```
   http://localhost:3000/admin
   ```

2. **You should be redirected to the sign-in page**
   - Custom branded sign-in page with Google button

3. **Click "Continue with Google"**
   - Select your Google account
   - Grant permissions

4. **Successful Sign-In Scenarios**
   - ✅ **Authorized User:** Redirected to `/admin` dashboard
   - ✅ **Session Created:** JWT token with role and entity data
   - ✅ **Audit Log:** Sign-in event recorded in `user_audit_log`

5. **Failed Sign-In Scenarios**
   - ❌ **Email Not Whitelisted:** Redirected to `/auth/unauthorized`
   - ❌ **Inactive Account:** Redirected to `/auth/unauthorized`

### Step 6: Test User Management

1. **Navigate to User Management**
   ```
   http://localhost:3000/admin/users
   ```

2. **Verify You See:**
   - Your admin user in the table
   - Role badge (DTA Administrator)
   - Active status
   - Last login timestamp

3. **Add a New User**
   - Click "Add User"
   - Enter email (must match their Google account)
   - Enter full name
   - Select role (Admin or Staff)
   - If Staff: Select entity
   - Click "Add User"

4. **Test User Status Toggle**
   - Click the status badge to activate/deactivate users
   - Inactive users cannot sign in

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Verify database is running
docker ps | grep feedback_db

# Check database connection
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT 1"

# Check if tables exist
docker exec feedback_db psql -U feedback_user -d feedback -c "\dt"
```

### Issue: "Unauthorized - not in database"

**Solution:**
```bash
# Verify your email is in the database
docker exec feedback_db psql -U feedback_user -d feedback << EOF
SELECT email, name, is_active FROM users WHERE email = 'your@email.com';
EOF

# If not found, add yourself
ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh
```

### Issue: "Invalid client" error from Google

**Possible causes:**
1. Wrong Client ID/Secret in .env.local
2. Redirect URI not configured in Google Console
3. `.env.local` not loaded (restart dev server)

**Solution:**
```bash
# Verify environment variables are loaded
cd frontend
npm run dev

# Check console output for any .env errors
```

### Issue: NextAuth errors about database adapter

**Solution:**
```bash
# Verify NextAuth tables exist
docker exec feedback_db psql -U feedback_user -d feedback << EOF
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'accounts', 'sessions', 'verification_tokens');
EOF

# Should return 4 rows
# If missing, re-run migration
./database/04-nextauth-users.sh
```

---

## 📊 Database Schema Overview

### Key Tables

**users** - Central user table
- `id` (UUID) - Primary key
- `email` (VARCHAR) - Unique, from OAuth
- `name` (VARCHAR) - Display name
- `role_id` (INT) - Foreign key to user_roles
- `entity_id` (VARCHAR) - Foreign key to entity_master
- `is_active` (BOOLEAN) - Enable/disable access
- `last_login` (TIMESTAMP) - Track activity

**user_roles** - Role definitions
- `admin_dta` - Full system access (admins)
- `staff_mda` - Entity-specific access (ministry officers)
- `public_user` - Limited public access (future)

**accounts** - OAuth provider data (NextAuth)
- Links users to OAuth providers
- Stores access tokens, refresh tokens

**sessions** - Active user sessions (NextAuth)
- Session tokens
- Expiration timestamps

---

## 🔐 Security Features

### Implemented Security Measures

1. **OAuth-Only Authentication**
   - No password storage
   - Leverages Google/Microsoft security

2. **Database-Backed Authorization**
   - Email whitelist in `users` table
   - `is_active` flag for quick access revocation

3. **Role-Based Access Control**
   - Admin vs Staff vs Public roles
   - Enforced at middleware and API level

4. **Entity-Based Data Filtering**
   - Staff users see only their entity's data
   - Enforced in API queries

5. **Session Management**
   - JWT tokens with 2-hour expiration
   - Signed with NEXTAUTH_SECRET
   - httpOnly, sameSite cookies

6. **Audit Logging**
   - Sign-in/sign-out events logged
   - User creation/updates logged
   - IP address and user agent tracking

---

## 🎯 Phase 2: Staff Portal (Next Steps)

With Phase 1 complete, you're ready to implement Phase 2:

### Staff Portal Features to Build

1. **Entity-Filtered Ticket Management**
   - Staff see only tickets for their entity
   - Create new tickets
   - Update ticket status

2. **Entity-Specific Analytics**
   - Dashboards filtered by entity_id
   - Ticket volume, resolution time
   - Feedback ratings

3. **Entity Data Management**
   - Update entity details
   - Manage services
   - Generate QR codes

### Implementation Pattern

All staff portal APIs follow this pattern:

```typescript
// src/app/api/staff/tickets/route.ts
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Verify user is staff
  if (!session || session.user.roleType !== 'staff') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get user's entity from session
  const entityId = session.user.entityId;

  // Filter query by entity
  const tickets = await pool.query(
    'SELECT * FROM tickets WHERE entity_id = $1',
    [entityId]
  );

  return NextResponse.json({ tickets: tickets.rows });
}
```

---

## 📞 Support

If you encounter any issues during setup:

1. **Check the troubleshooting section above**
2. **Review the implementation plan document**
3. **Check NextAuth documentation:** https://next-auth.js.org/
4. **Check logs:**
   ```bash
   # Frontend logs (in terminal running npm run dev)
   # Database logs
   docker logs feedback_db
   ```

---

## ✅ Implementation Checklist

### Phase 1 - Complete
- [x] Database migration run successfully
- [x] NextAuth configuration created
- [x] Google OAuth configured (ready for credentials)
- [x] Sign-in page implemented
- [x] Unauthorized page implemented
- [x] Middleware protection enabled
- [x] Admin layout wrapped with SessionProvider
- [x] User management UI created
- [x] User management APIs implemented
- [x] Environment variables template created

### Next - Configuration & Testing
- [ ] Add initial admin user to database
- [ ] Set up Google OAuth in Cloud Console
- [ ] Configure .env.local with credentials
- [ ] Test sign-in flow
- [ ] Test user management
- [ ] (Optional) Set up Microsoft OAuth
- [ ] Deploy to production

### Phase 2 - Staff Portal (Future)
- [ ] Create staff layout and navigation
- [ ] Implement entity-filtered ticket API
- [ ] Build staff ticket management UI
- [ ] Implement entity analytics API
- [ ] Build staff analytics dashboard
- [ ] Implement entity data management
- [ ] Test entity-based access control

---

**Ready to proceed with configuration and testing!** 🚀

Follow the steps above to configure OAuth and test your new authentication system.
