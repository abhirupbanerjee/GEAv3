# Sidebar User Profile Debug Instructions

## Issue

The sidebar is not showing the user's full name "Abhirup Banerjee" and entity name "Immigration Department", even though the data exists in the database.

## Changes Made

Added debug logging to the Sidebar component to help identify the issue.

## Debug Steps

### 1. Check Browser Console Logs

After reloading the page, open the browser console (F12) and look for these log messages:

```
[Sidebar] Session data: { name: "...", email: "...", roleType: "...", entityId: "..." }
[Sidebar] Fetching entity for ID: DEPT-001
[Sidebar] Entity data received: { success: true, entity: {...} }
```

### 2. Possible Issues and Solutions

#### Issue A: Session Data Not Loading

**Log will show:**
```
[Sidebar] Session data: { name: undefined, email: undefined, roleType: undefined, entityId: undefined }
```

**Solution:**
- Check if NextAuth session is working
- Verify the user is properly authenticated
- Check `/api/auth/session` endpoint

#### Issue B: Entity ID Not in Session

**Log will show:**
```
[Sidebar] No entity ID in session: { name: "...", email: "...", roleType: "staff", entityId: null }
```

**Solution:**
- The session token doesn't have `entityId`
- Need to check `frontend/src/lib/auth.ts` JWT callback
- Verify the `session` callback is adding `entityId` to session

#### Issue C: Entity API Failing

**Log will show:**
```
[Sidebar] Failed to fetch entity: 403 Forbidden
```
or
```
[Sidebar] Failed to fetch entity: 404 Not Found
```

**Solution:**
- Check API endpoint `/api/admin/entities/[id]/route.ts`
- Verify user has permission to access their entity
- Check database has entity with ID 'DEPT-001'

#### Issue D: Entity Name Not in Response

**Log will show:**
```
[Sidebar] Entity data received: { success: true, entity: { entity_id: "DEPT-001", ... } }
```
but `entity_name` is missing

**Solution:**
- Check API response structure in `/api/admin/entities/[id]/route.ts`
- Ensure the query returns `entity_name` field
- Verify the field mapping is correct

### 3. Check What's Currently Happening

Run this in browser console while on the Manage Tickets page:

```javascript
// Check if session is loaded
console.log('Session:', window.next?.router?.query)

// Check if the sidebar component is mounted
const sidebar = document.querySelector('[class*="sidebar"]')
console.log('Sidebar found:', sidebar ? 'Yes' : 'No')

// Check if user profile section exists
const userProfile = document.querySelector('[class*="text-sm font-semibold text-gray-900"]')
console.log('User profile element:', userProfile)
console.log('User name text:', userProfile?.textContent)
```

### 4. Visual Inspection

Look at the sidebar in the screenshots:
- ✅ Sidebar is visible on the left
- ✅ Navigation menu items are showing (Dashboard, Feedback Analytics, etc.)
- ✅ Logout button is visible
- ❌ User profile section (name + email + badge) is NOT visible

**This suggests the user profile section is either:**
1. Not rendering (session data issue)
2. Scrolled out of view (CSS overflow issue)
3. Hidden by CSS (z-index or display property issue)

### 5. Check if User Profile Section is in DOM

Run in browser console:

```javascript
// Check if the user name element exists in DOM
const userName = document.querySelector('.text-sm.font-semibold.text-gray-900.break-words')
console.log('User name element:', userName)
console.log('User name visible:', userName ? getComputedStyle(userName).display : 'NOT FOUND')
console.log('User name content:', userName?.textContent)

// Check if the entity name element exists
const entityNameEl = document.querySelector('.text-xs.text-gray-600')
console.log('Entity name element:', entityNameEl)
console.log('Entity name content:', entityNameEl?.textContent)
```

### 6. Check Sidebar Scroll Position

The sidebar might have the user profile section scrolled out of view. Run:

```javascript
const sidebarNav = document.querySelector('nav.overflow-y-auto')
if (sidebarNav) {
  console.log('Sidebar scroll position:', sidebarNav.scrollTop)
  console.log('Sidebar scroll height:', sidebarNav.scrollHeight)
  console.log('Sidebar client height:', sidebarNav.clientHeight)

  // Scroll to top to see user profile
  sidebarNav.scrollTop = 0
}
```

## Expected Console Output (When Working)

```
[Sidebar] Session data: {
  name: "Abhirup Banerjee",
  email: "abhirupbanerjee@outlook.com",
  roleType: "staff",
  entityId: "DEPT-001"
}
[Sidebar] Fetching entity for ID: DEPT-001
[Sidebar] Entity data received: {
  success: true,
  entity: {
    entity_id: "DEPT-001",
    entity_name: "Immigration Department",
    entity_type: "department",
    ...
  }
}
```

## Quick Fix Options

### Option 1: Verify Session is Properly Set

Check if the session callback in `frontend/src/lib/auth.ts` is working:

```typescript
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.roleId = token.roleId as number;
    session.user.roleCode = token.roleCode as string;
    session.user.roleType = token.roleType as string;
    session.user.entityId = token.entityId as string | null;  // ← Make sure this is here
    session.user.isActive = token.isActive as boolean;
  }

  console.log('[Auth] Session callback:', session);  // Add this line
  return session;
}
```

### Option 2: Fallback Display

If entity fetch is failing, show entity ID instead:

```tsx
{entityName ? (
  <span className="text-xs text-gray-600 pl-1">
    {entityName}
  </span>
) : session?.user?.entityId ? (
  <span className="text-xs text-gray-500 pl-1">
    {session.user.entityId} (Loading...)
  </span>
) : null}
```

### Option 3: Remove flex-shrink-0 from Header

The header might be collapsed. Try removing or changing:

```tsx
// Current:
<div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">

// Try:
<div className="p-4 border-b border-gray-200 bg-white">
```

## Testing Checklist

After making changes:

- [ ] Check browser console for debug logs
- [ ] Verify user name "Abhirup Banerjee" is visible in sidebar
- [ ] Verify entity name "Immigration Department" is visible below "Staff" badge
- [ ] Verify email "abhirupbanerjee@outlook.com" is visible
- [ ] Verify the "Staff" badge is visible with green styling
- [ ] Test with admin user (should show "Administrator" badge, no entity)
- [ ] Test sidebar scrolling doesn't hide user profile

## Cleanup

Once the issue is identified and fixed, **remove the debug console.log statements** to keep the console clean in production.

---

Generated: 2025-11-23
