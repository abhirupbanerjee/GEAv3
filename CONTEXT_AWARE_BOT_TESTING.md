# Context-Aware AI Bot - Testing Guide

This document provides comprehensive testing scenarios for the context-aware AI bot implementation.

## Overview

The AI bot now receives real-time context updates via `postMessage` whenever:
- User navigates to a different page
- Modal opens or closes
- Edit mode is activated or deactivated
- Tab is switched
- Form progress changes

---

## Browser Console Testing

### 1. Verify postMessage Communication

Open browser DevTools console and run:

```javascript
// Listen for all postMessage events
window.addEventListener('message', (event) => {
  console.log('[TEST] Received message:', {
    origin: event.origin,
    type: event.data?.type,
    context: event.data?.context
  });
});
```

### 2. Inspect Current Context

```javascript
// Access the iframe and check if it received context
const iframe = document.querySelector('iframe[title="Grenada AI Assistant"]');
console.log('Iframe found:', !!iframe);
console.log('Iframe URL:', iframe?.src);
```

### 3. Monitor Context Changes

```javascript
// Track all context updates
let contextHistory = [];
window.addEventListener('message', (event) => {
  if (event.data?.type === 'CONTEXT_UPDATE') {
    contextHistory.push({
      timestamp: new Date().toISOString(),
      changeType: event.data.context.changeType,
      route: event.data.context.route,
      modal: event.data.context.modal?.type,
      edit: event.data.context.edit?.entityType,
      tab: event.data.context.tab?.activeTab,
      form: event.data.context.form?.formName
    });
    console.table(contextHistory);
  }
});
```

---

## Test Scenarios

### Scenario 1: Navigation Tracking

**Steps:**
1. Navigate to `/admin/tickets`
2. Navigate to `/admin/users`
3. Navigate to `/admin/managedata`
4. Navigate to `/feedback`

**Expected Context Updates:**

```json
// Update 1
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/tickets",
    "changeType": "navigation",
    "timestamp": 1234567890,
    "modal": null,
    "edit": null
  }
}

// Update 2
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/users",
    "changeType": "navigation",
    "timestamp": 1234567891
  }
}
```

**Verification:**
- AI bot header should show: `📍 /admin/tickets`, `📍 /admin/users`, etc.
- Console should show `[ChatContext] Sent: navigation`

---

### Scenario 2: Ticket Modal Tracking

**Steps:**
1. Navigate to `/admin/tickets`
2. Click on any ticket row to open details modal
3. Close the modal

**Expected Context Updates:**

```json
// When modal opens
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/tickets",
    "changeType": "modal",
    "modal": {
      "type": "view-ticket",
      "title": "Ticket Details",
      "entityType": "ticket",
      "entityId": "TKT-2025-001",
      "entityName": "Subject of the ticket",
      "data": {
        "status": "Open",
        "priority": "High",
        "category": "Grievance",
        "entity": "Ministry of Finance",
        "service": "Tax Services"
      }
    }
  }
}

// When modal closes
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/tickets",
    "changeType": "modal",
    "modal": null
  }
}
```

**Verification:**
- AI bot header should show: `📋 Ticket Details`
- When closed, header shows: `📍 /admin/tickets`

---

### Scenario 3: User Modal Tracking

**Steps:**
1. Navigate to `/admin/users`
2. Click "Add User" button
3. Close the add user modal
4. Click edit icon on a user
5. Close the edit modal

**Expected Context Updates:**

```json
// Add user modal
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "changeType": "modal",
    "modal": {
      "type": "add-user",
      "title": "Add New User",
      "entityType": "user"
    }
  }
}

// Edit user modal
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "changeType": "modal",
    "modal": {
      "type": "edit-user",
      "title": "Edit User",
      "entityType": "user",
      "entityId": "user-123",
      "entityName": "John Doe",
      "data": {
        "email": "john@example.com",
        "role": "Admin",
        "entity": "Ministry of Finance",
        "status": "Active"
      }
    }
  }
}
```

**Verification:**
- Header shows: `📋 Add New User` or `📋 Edit User`

---

### Scenario 4: Tab Switching (Manage Data)

**Steps:**
1. Navigate to `/admin/managedata`
2. Click "Services" tab
3. Click "QR Codes" tab
4. Click "Entities" tab

**Expected Context Updates:**

```json
// Initial load (Entities tab)
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/managedata",
    "changeType": "tab",
    "tab": {
      "tabGroup": "managedata",
      "activeTab": "entities",
      "availableTabs": ["entities", "services", "qrcodes"]
    }
  }
}

// Services tab
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "changeType": "tab",
    "tab": {
      "tabGroup": "managedata",
      "activeTab": "services",
      "availableTabs": ["entities", "services", "qrcodes"]
    }
  }
}
```

**Verification:**
- Header shows: `📁 entities`, `📁 services`, `📁 qrcodes`

---

### Scenario 5: Feedback Form Progress

**Steps:**
1. Navigate to `/feedback`
2. Select a service
3. Select recipient group
4. Fill in 3 out of 5 ratings
5. Complete all 5 ratings
6. Add comments

**Expected Context Updates:**

```json
// After selecting service
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/feedback",
    "changeType": "form",
    "form": {
      "formName": "service-feedback",
      "completedFields": ["service"],
      "pendingFields": ["recipient_group", "ratings (0/5 completed)"]
    }
  }
}

// After selecting recipient and 3 ratings
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "form": {
      "formName": "service-feedback",
      "completedFields": ["service", "recipient_group"],
      "pendingFields": ["ratings (3/5 completed)"]
    }
  }
}

// After completing all ratings
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "form": {
      "formName": "service-feedback",
      "completedFields": ["service", "recipient_group", "ratings"],
      "pendingFields": []
    }
  }
}
```

**Verification:**
- Context updates as each field is completed

---

## API Endpoint Testing

### Test Page Context API

The existing page context API provides static metadata about pages:

```bash
# Get context for tickets page
curl http://localhost:3000/api/content/page-context?route=/admin/tickets

# Get context for feedback page
curl http://localhost:3000/api/content/page-context?route=/feedback

# Check API status
curl http://localhost:3000/api/content/page-context/status
```

**Expected Response:**

```json
{
  "route": "/admin/tickets",
  "pageContext": {
    "title": "Ticket Management Dashboard",
    "purpose": "View, filter, and manage all support tickets...",
    "audience": "staff",
    "features": [
      "Comprehensive ticket list with search and filtering",
      "Filter by status, priority, category"
    ],
    "steps": [
      "Review statistics cards at the top",
      "Use filters to narrow down tickets"
    ],
    "tips": [
      "Tickets are color-coded by priority",
      "SLA indicators show time remaining"
    ],
    "permissions": {
      "staff": "Can view and manage tickets for their assigned entity",
      "admin": "Can view and manage all tickets"
    }
  }
}
```

---

## Integration Test Checklist

### Core Infrastructure
- [ ] ChatContextProvider wraps entire app in layout.tsx
- [ ] ChatBot component receives context from provider
- [ ] postMessage is sent to iframe with correct origin
- [ ] Iframe loads successfully with context parameter
- [ ] Console shows `[ChatContext] Sent:` messages

### Navigation Tracking
- [ ] Context updates on route change
- [ ] Route is correctly captured in context
- [ ] Previous modal/edit state is cleared on navigation
- [ ] Tab state persists within same section

### Modal Tracking
- [ ] Ticket detail modal opens → context updates
- [ ] Ticket detail modal closes → context updates (modal: null)
- [ ] Add user modal opens → context updates
- [ ] Edit user modal opens → context updates with user details
- [ ] Modal close handlers call `closeModal()`

### Tab Tracking
- [ ] Initial tab context is set on mount
- [ ] Tab switch updates context
- [ ] Available tabs list is included
- [ ] Tab group identifier is correct

### Form Progress Tracking
- [ ] Service selection updates completedFields
- [ ] Recipient group selection updates completedFields
- [ ] Each rating updates progress count
- [ ] Comments field tracked (optional)
- [ ] pendingFields list is accurate
- [ ] Form context cleared on unmount

---

## Troubleshooting

### Issue: postMessage not sent

**Check:**
1. Iframe exists: `document.querySelector('iframe[title="Grenada AI Assistant"]')`
2. ChatBot is open (postMessage only sent when open)
3. Console shows any errors

**Solution:**
- Ensure iframe has loaded (check onLoad handler)
- Verify CHATBOT_URL is configured correctly
- Check origin in postMessage matches bot URL

---

### Issue: Context not updating

**Check:**
1. Component is using `useChatContext()` hook
2. Handler functions call context methods
3. Console shows `[ChatContext] Sent:` messages

**Solution:**
- Verify component is inside ChatContextProvider
- Check for JavaScript errors in console
- Ensure handlers are connected to UI events

---

### Issue: Origin mismatch error

**Check:**
1. CHATBOT_URL environment variable
2. Bot origin vs postMessage target origin

**Solution:**
```typescript
// In ChatContextProvider
const botOrigin = new URL(config.CHATBOT_URL).origin
iframe.contentWindow.postMessage(message, botOrigin)
```

---

## Performance Monitoring

### Track postMessage Frequency

```javascript
let messageCount = 0;
let startTime = Date.now();

window.addEventListener('message', (event) => {
  if (event.data?.type === 'CONTEXT_UPDATE') {
    messageCount++;
    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`Messages: ${messageCount}, Rate: ${(messageCount/elapsed).toFixed(2)}/sec`);
  }
});
```

**Expected:**
- 1-2 messages per user action
- No message loops or excessive updates

---

## Test Matrix

| Page | Feature | Context Type | Status |
|------|---------|--------------|--------|
| /admin/tickets | View ticket modal | modal | ✅ |
| /admin/tickets | Close modal | modal (null) | ✅ |
| /admin/users | Add user modal | modal | ✅ |
| /admin/users | Edit user modal | modal | ✅ |
| /admin/managedata | Tab: Entities | tab | ✅ |
| /admin/managedata | Tab: Services | tab | ✅ |
| /admin/managedata | Tab: QR Codes | tab | ✅ |
| /feedback | Select service | form | ✅ |
| /feedback | Select recipient | form | ✅ |
| /feedback | Fill ratings | form | ✅ |
| /feedback | Add comments | form | ✅ |
| All pages | Navigation | navigation | ✅ |

---

## Next Steps

1. **Test on Production:**
   - Deploy to Azure VM
   - Test with actual AI bot iframe
   - Verify cross-origin postMessage works

2. **Monitor Logs:**
   - Check browser console for errors
   - Monitor postMessage frequency
   - Verify no duplicate messages

3. **AI Bot Integration:**
   - Ensure AI bot listens for `CONTEXT_UPDATE` messages
   - Test AI responses with context awareness
   - Verify context is used in AI prompts

4. **User Acceptance Testing:**
   - Test all scenarios with real users
   - Gather feedback on context accuracy
   - Verify performance impact is minimal

---

## Summary

The context-aware AI bot implementation provides:
- ✅ Real-time navigation tracking
- ✅ Modal state awareness
- ✅ Tab switching detection
- ✅ Form progress monitoring
- ✅ Type-safe implementation
- ✅ No breaking changes to existing code

All context updates are sent via `postMessage` to the AI bot iframe, enabling context-aware responses.
