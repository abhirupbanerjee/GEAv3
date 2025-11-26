# User Session Context Enhancement

**Date:** November 26, 2025
**Status:** ✅ Complete
**Version:** 1.1

---

## Overview

Enhanced the context-aware AI bot to include **current user session information** in all context updates sent to the AI assistant. The bot now knows:

- **Who the user is** (name, email, ID)
- **What role they have** (admin, staff, or public/citizen)
- **What entity they belong to** (for staff users)
- **Whether they're authenticated**

This enables the AI bot to provide **personalized, role-aware responses** tailored to the user's permissions and context.

---

## What Changed

### Files Modified

1. **`frontend/src/types/chat-context.ts`**
   - Added `UserSessionContext` interface
   - Added `user` field to `PageContext`

2. **`frontend/src/providers/ChatContextProvider.tsx`**
   - Integrated with NextAuth's `useSession()` hook
   - Added `getUserContext()` helper to convert session to context
   - User context now included in all postMessage updates
   - Tracks session changes and updates context automatically

3. **Documentation Files Updated:**
   - `CONTEXT_BOT_QUICK_REFERENCE.md`
   - `CONTEXT_AWARE_BOT_IMPLEMENTATION.md`
   - `docs/AI_BOT_PORTAL_INTEGRATION.md`

---

## User Session Context Structure

```typescript
interface UserSessionContext {
  id: string | number;        // User ID or 'guest'
  name?: string;              // Full name (if authenticated)
  email?: string;             // Email address (if authenticated)
  role: 'admin' | 'staff' | 'public';  // User role
  roleName?: string;          // Display name of role
  entity?: {                  // Entity for staff users
    id: number;
    name: string;
  };
  isAuthenticated: boolean;   // Authentication status
}
```

### Example: Authenticated Staff User

```json
{
  "id": "staff-42",
  "name": "Jane Smith",
  "email": "jane@finance.gov.gd",
  "role": "staff",
  "roleName": "Staff",
  "entity": {
    "id": 5,
    "name": "Ministry of Finance"
  },
  "isAuthenticated": true
}
```

### Example: Unauthenticated Public User

```json
{
  "id": "guest",
  "role": "public",
  "isAuthenticated": false
}
```

### Example: Admin User

```json
{
  "id": "admin-7",
  "name": "John Administrator",
  "email": "admin@gov.gd",
  "role": "admin",
  "roleName": "Admin",
  "isAuthenticated": true
}
```

---

## How It Works

### 1. Session Integration

The `ChatContextProvider` uses NextAuth's `useSession()` hook to access the current user session:

```typescript
const { data: session, status } = useSession();

const getUserContext = useCallback((): UserSessionContext | null => {
  if (status === 'loading') return null;

  if (!session?.user) {
    // Unauthenticated user
    return {
      id: 'guest',
      role: 'public',
      isAuthenticated: false,
    };
  }

  // Authenticated user - extract from session
  const user = session.user as any;
  return {
    id: user.id || user.email || 'unknown',
    name: user.name || undefined,
    email: user.email || undefined,
    role: user.role_name?.toLowerCase() === 'admin' ? 'admin'
          : user.role_name?.toLowerCase() === 'staff' ? 'staff'
          : 'public',
    roleName: user.role_name || undefined,
    entity: user.entity_id && user.entity_name ? {
      id: user.entity_id,
      name: user.entity_name,
    } : undefined,
    isAuthenticated: true,
  };
}, [session, status]);
```

### 2. Automatic Updates

User context is automatically updated when:

- **Session changes** (login, logout, role change)
- **Page navigation** (user context is preserved across routes)
- **Any context update** (user info is included in all postMessage updates)

### 3. postMessage Format

Every `CONTEXT_UPDATE` message now includes user information:

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/tickets",
    "timestamp": 1732659456789,
    "changeType": "modal",

    "user": {
      "id": "staff-42",
      "name": "Jane Smith",
      "email": "jane@finance.gov.gd",
      "role": "staff",
      "roleName": "Staff",
      "entity": {
        "id": 5,
        "name": "Ministry of Finance"
      },
      "isAuthenticated": true
    },

    "modal": {
      "type": "view-ticket",
      "title": "Ticket Details",
      "entityType": "ticket",
      "entityId": "TKT-2025-001"
    }
  }
}
```

---

## Dual-Context System

The AI bot now receives **two complementary types of audience information**:

### 1. Static Page Context (from API)

```json
{
  "route": "/admin/tickets",
  "audience": "staff",  // Who this page is FOR
  "permissions": {
    "staff": "Can view tickets for their assigned entity",
    "admin": "Can view and manage all tickets"
  }
}
```

### 2. Dynamic User Context (from postMessage)

```json
{
  "route": "/admin/tickets",
  "user": {
    "role": "admin",  // Who is ACTUALLY using it
    "name": "John Administrator"
  }
}
```

### Combined Intelligence

The AI bot can now:

1. **Understand page design**: "This page is designed for staff users"
2. **Know actual user**: "But the current user is an admin"
3. **Provide tailored help**: "As an admin, you can view ALL tickets, not just those for your entity"

---

## Use Cases

### Use Case 1: Role-Specific Help

**Scenario:** Staff user asks "Why can't I see all tickets?"

**AI Response:**
```
Hi Jane! As a staff member at the Ministry of Finance, you can only
view tickets assigned to your entity. This is by design to ensure data
privacy. Only administrators can view tickets across all entities.
```

The bot knows:
- User is "Jane Smith"
- Role is "staff"
- Entity is "Ministry of Finance"
- Page permissions: staff users have limited view

### Use Case 2: Personalized Greetings

**Scenario:** User opens chat

**AI Response:**
```
Hello Jane! I can help you with the Ticket Management Dashboard.
I see you're currently viewing ticket TKT-2025-001. What would you
like to know?
```

The bot knows:
- User's name: "Jane Smith"
- Current route: "/admin/tickets"
- Current modal: "view-ticket"
- Ticket ID: "TKT-2025-001"

### Use Case 3: Permission-Aware Guidance

**Scenario:** Admin user asks "How do I edit a user?"

**AI Response:**
```
As an administrator, you have full access to edit users. Here's how:
1. Click the edit icon next to any user
2. Modify the fields you need
3. Click Save

Note: Staff users cannot access this feature.
```

The bot knows:
- User role: "admin"
- Page audience: "admin"
- Can provide admin-specific instructions

### Use Case 4: Public User Support

**Scenario:** Unauthenticated user on feedback page asks for help

**AI Response:**
```
Welcome! You don't need to log in to submit feedback. Here's how:
1. Select the government service you used
2. Choose who you are (citizen, business, etc.)
3. Rate your experience

Your feedback is completely anonymous.
```

The bot knows:
- User is not authenticated
- User role: "public"
- Page is public-facing
- No login required

---

## Benefits

### 1. Personalized Responses
- Uses user's name in greetings
- Tailors language to user's role
- References user's entity when relevant

### 2. Role-Aware Help
- Explains features available to the user's role
- Warns about restricted features
- Provides role-specific instructions

### 3. Permission Context
- Understands what the user CAN do
- Explains what they CANNOT do and why
- Suggests alternatives when applicable

### 4. Enhanced Security
- Never suggests actions beyond user's permissions
- Explains access restrictions clearly
- Maintains awareness of authentication state

### 5. Better UX
- No generic responses
- Context-specific guidance
- Feels like a personalized assistant

---

## Testing

### Manual Testing

1. **Test as Admin:**
   - Login as admin user
   - Open browser console
   - Navigate to `/admin/users`
   - Check postMessage includes: `"role": "admin"`

2. **Test as Staff:**
   - Login as staff user
   - Navigate to `/admin/tickets`
   - Check postMessage includes: `"role": "staff"` and entity info

3. **Test as Public:**
   - Logout or use incognito mode
   - Navigate to `/feedback`
   - Check postMessage includes: `"role": "public", "isAuthenticated": false`

### Browser Console

```javascript
// Listen for context updates
window.addEventListener('message', (e) => {
  if (e.data?.type === 'CONTEXT_UPDATE') {
    console.log('User:', e.data.context.user);
  }
});
```

Expected output for authenticated staff:
```javascript
{
  id: "staff-42",
  name: "Jane Smith",
  email: "jane@finance.gov.gd",
  role: "staff",
  roleName: "Staff",
  entity: { id: 5, name: "Ministry of Finance" },
  isAuthenticated: true
}
```

---

## TypeScript Compilation

✅ **No errors** - All type definitions are valid and correctly integrated.

```bash
cd frontend && npx tsc --noEmit
# Output: No errors
```

---

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/types/chat-context.ts` | TypeScript interface for `UserSessionContext` |
| `frontend/src/providers/ChatContextProvider.tsx` | Session integration and user context logic |
| `CONTEXT_AWARE_BOT_IMPLEMENTATION.md` | Updated with user context examples |
| `CONTEXT_BOT_QUICK_REFERENCE.md` | Updated context message structure |
| `docs/AI_BOT_PORTAL_INTEGRATION.md` | Complete solution document with user context |

---

## Answer to Original Question

**Question:** "Will the bot have the context of the user category (citizen / staff / admin) from page context?"

**Answer:**

Yes! The bot now receives **both**:

1. **Static Page Audience** (from `@pageContext` API):
   - Tells what category of users the page is **designed for**
   - Example: `"audience": "staff"` means the page is for staff users

2. **Dynamic User Role** (from real-time context):
   - Tells the **actual role** of the current logged-in user
   - Example: `"user.role": "admin"` means an admin is using the page
   - Includes full user details: name, email, entity, authentication status

The AI bot can combine both to provide intelligent, personalized responses that understand both the page's design intent AND the user's actual permissions.

**Example:**
- Page says: "This is for staff users"
- User context says: "Current user is an admin"
- AI responds: "As an admin, you have elevated permissions on this staff page..."

---

## Summary

✅ **Enhancement Complete**

- User session context fully integrated
- All context updates include user information
- Supports admin, staff, and public users
- Handles authenticated and unauthenticated states
- TypeScript compilation successful
- Documentation fully updated
- Ready for production deployment

The AI bot is now truly **context-aware** with full understanding of both the page context AND the user's identity, role, and permissions.
