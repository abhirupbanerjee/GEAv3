# NextAuth - Quick Reference Card

---

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Add admin user
cd /home/ab/Projects/gogeaportal/v3
ADMIN_EMAIL="you@example.com" ADMIN_NAME="Your Name" ./database/05-add-initial-admin.sh

# 2. Generate secret
openssl rand -base64 32

# 3. Configure .env.local
cd frontend
cp .env.example .env.local
# Edit: NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# 4. Start dev server
npm run dev

# 5. Visit http://localhost:3000/admin
```

---

## 📋 Database Commands

```bash
# Run migration
./database/04-nextauth-users.sh

# Add admin user
ADMIN_EMAIL="user@gov.gd" ADMIN_NAME="John Doe" ./database/05-add-initial-admin.sh

# Check users
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT email, name, is_active FROM users;"

# Check roles
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT * FROM user_roles;"

# View user audit log
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT * FROM user_audit_log ORDER BY created_at DESC LIMIT 10;"
```

---

## 🔑 Environment Variables

```bash
# Required
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from google console>
GOOGLE_CLIENT_SECRET=<from google console>

# Database (already in docker-compose.yml)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=feedback
DB_USER=feedback_user
DB_PASSWORD=<your password>
```

---

## 🌐 Google OAuth Setup

1. https://console.cloud.google.com/
2. Create project or select existing
3. "APIs & Services" → "Credentials"
4. "Create Credentials" → "OAuth client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://gea.abhirup.app/api/auth/callback/google`
7. Copy Client ID and Secret to `.env.local`

---

## 🛣️ Routes & Pages

| Route | Purpose | Access |
|-------|---------|--------|
| `/auth/signin` | Sign-in page | Public |
| `/auth/unauthorized` | Access denied | Public |
| `/admin` | Admin dashboard | Admin only |
| `/admin/users` | User management | Admin only |
| `/staff` | Staff portal | Staff only |
| `/api/auth/[...nextauth]` | NextAuth handler | Public |
| `/api/admin/*` | Admin APIs | Admin only |
| `/api/staff/*` | Staff APIs | Staff only |

---

## 🔐 User Roles

| Role Code | Role Name | Type | Access Level |
|-----------|-----------|------|--------------|
| `admin_dta` | DTA Administrator | admin | Full system access |
| `staff_mda` | MDA Staff Officer | staff | Entity-specific |
| `public_user` | Public User | public | Limited (future) |

---

## 📡 API Endpoints

### Admin APIs (Admin only)
```
GET    /api/admin/users          # List all users
POST   /api/admin/users          # Add new user
PATCH  /api/admin/users/[id]     # Update user
DELETE /api/admin/users/[id]     # Deactivate user
GET    /api/admin/roles          # List roles
GET    /api/admin/entities       # List entities
```

### Staff APIs (Staff only - Coming in Phase 2)
```
GET    /api/staff/tickets        # List entity tickets
GET    /api/staff/analytics      # Entity analytics
GET    /api/staff/entity         # Entity details
PATCH  /api/staff/entity         # Update entity
```

---

## 🐛 Common Issues

### "Cannot connect to database"
```bash
docker ps | grep feedback_db
docker-compose up -d
```

### "Unauthorized - not in database"
```bash
# Check if your email exists
docker exec feedback_db psql -U feedback_user -d feedback \
  -c "SELECT email, is_active FROM users WHERE email='you@example.com';"

# If not, add yourself
ADMIN_EMAIL="you@example.com" ./database/05-add-initial-admin.sh
```

### "Invalid client" from Google
- Check `GOOGLE_CLIENT_ID` in `.env.local`
- Verify redirect URI in Google Console matches exactly
- Restart dev server: `npm run dev`

### NextAuth database errors
```bash
# Verify tables exist
docker exec feedback_db psql -U feedback_user -d feedback \
  -c "\dt" | grep -E "(users|accounts|sessions)"

# If missing, re-run migration
./database/04-nextauth-users.sh
```

---

## 💻 Code Snippets

### Get Session in Page Component
```typescript
'use client';
import { useSession } from 'next-auth/react';

export default function MyPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Welcome, {session.user.name}!</div>;
}
```

### Get Session in API Route
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use session.user.roleType, session.user.entityId, etc.
  return NextResponse.json({ user: session.user });
}
```

### Filter by Entity (Staff APIs)
```typescript
const session = await getServerSession(authOptions);

if (session.user.roleType !== 'staff') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

const tickets = await pool.query(
  'SELECT * FROM tickets WHERE entity_id = $1',
  [session.user.entityId]
);
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/auth.ts` | NextAuth configuration |
| `frontend/src/middleware.ts` | Route protection |
| `frontend/src/app/api/auth/[...nextauth]/route.ts` | NextAuth handler |
| `frontend/.env.local` | Environment variables |
| `database/04-nextauth-users.sh` | Migration script |
| `database/05-add-initial-admin.sh` | Add admin user |

---

## 🧪 Testing Checklist

**Authentication:**
- [ ] Visit `/admin` → Redirect to signin
- [ ] Sign in with authorized email → Success
- [ ] Sign in with unauthorized email → Error page
- [ ] Session expires after 2 hours

**User Management:**
- [ ] View users at `/admin/users`
- [ ] Add new user
- [ ] Toggle user status
- [ ] Search users

**Authorization:**
- [ ] Admin can access `/admin/users`
- [ ] Staff cannot access `/admin/users`
- [ ] Non-authenticated redirected to signin

---

## 📚 Documentation

- **Setup Guide:** `NEXTAUTH_SETUP_GUIDE.md` (detailed)
- **Summary:** `IMPLEMENTATION_SUMMARY.md` (overview)
- **This File:** `NEXTAUTH_QUICK_REFERENCE.md` (quick commands)
- **NextAuth Docs:** https://next-auth.js.org/

---

## 🎯 Session Object Structure

```typescript
session.user = {
  id: "uuid",
  email: "user@gov.gd",
  name: "John Doe",
  image: "https://...",
  roleId: 1,
  roleCode: "admin_dta",
  roleType: "admin",  // or "staff" or "public"
  entityId: "DTA-001",  // or null for admin
  isActive: true
}
```

---

**Last Updated:** November 22, 2025
**Status:** Ready for configuration and testing
