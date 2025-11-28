# AI Bot Integration Guide

**GEA Portal v3 - Context-Aware AI Assistant**

**Version:** 1.0
**Last Updated:** November 28, 2025
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Reference](#quick-reference)
4. [Implementation Guide](#implementation-guide)
5. [Bot Inventory Management](#bot-inventory-management)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The GEA Portal integrates an AI-powered chatbot that provides context-aware assistance. The bot understands:

- **Who the user is** - Role (admin/staff/public), name, entity
- **What page** the user is viewing
- **What action** they're performing (viewing ticket, editing user, etc.)
- **Where they are** in a multi-step process
- **What data** they're working with

### Dual-Context System

| System | Purpose | Update Frequency |
|--------|---------|------------------|
| **Static Page Context** (API) | Pre-built metadata about each page | Build time |
| **Dynamic UI Context** (postMessage) | Real-time UI state + user session | Real-time |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GEA Portal (Next.js)                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ChatContextProvider (React Context)                           │ │
│  │                                                                 │ │
│  │  State Tracking:                                                │ │
│  │  • user (session)  • route  • modal                            │ │
│  │  • edit  • tab  • form                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ChatBot.tsx - Sends postMessage to iframe                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┼───────────────────────────────────────────┘
                           │ postMessage (CONTEXT_UPDATE)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    AI Bot (Vercel - Separate App)                    │
│  • Receives context via postMessage                                  │
│  • Fetches static page context via API                              │
│  • Generates context-aware responses                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/types/chat-context.ts` | TypeScript interfaces |
| `frontend/src/providers/ChatContextProvider.tsx` | React Context provider |
| `frontend/src/hooks/useChatContext.ts` | Hook export |
| `frontend/src/components/ChatBot.tsx` | ChatBot with postMessage |
| `frontend/src/app/layout.tsx` | Provider setup |

---

## Quick Reference

### Import the Hook

```typescript
import { useChatContext } from '@/hooks/useChatContext';
```

### Modal Management

```typescript
const { openModal, closeModal } = useChatContext();

// Open a modal with context
openModal('view-ticket', {
  title: 'Ticket Details',
  entityType: 'ticket',
  entityId: 'TKT-001',
  entityName: 'Display Name',
  data: { status: 'Open', priority: 'High' }
});

// Close the modal
closeModal();
```

### Tab Switching

```typescript
const { switchTab } = useChatContext();

// Switch tab
switchTab('managedata', 'services', ['entities', 'services', 'qrcodes']);
```

### Form Progress

```typescript
const { updateFormProgress, clearForm } = useChatContext();

// Update progress
updateFormProgress('service-feedback', {
  completedFields: ['service', 'recipient'],
  pendingFields: ['ratings (3/5 completed)']
});

// Clear on unmount
useEffect(() => () => clearForm(), []);
```

### Edit Mode

```typescript
const { startEditing, stopEditing } = useChatContext();

startEditing('entity', entityId, {
  entityName: 'Ministry of Finance',
  fields: ['name', 'abbreviation']
});

stopEditing();
```

---

## Implementation Guide

### Context Message Structure

```typescript
{
  type: 'CONTEXT_UPDATE',
  context: {
    route: '/admin/tickets',
    timestamp: 1234567890,
    changeType: 'modal' | 'edit' | 'tab' | 'form' | 'navigation',

    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin' | 'staff' | 'public',
      roleName: 'Staff',
      entity: { id: 5, name: 'Ministry of Finance' },
      isAuthenticated: true
    },

    modal?: {
      type: 'view-ticket',
      title: 'Ticket Details',
      entityType: 'ticket',
      entityId: 'TKT-2025-001',
      entityName: 'Subject',
      data: { status: 'Open', priority: 'High' }
    },

    tab?: {
      tabGroup: 'managedata',
      activeTab: 'services',
      availableTabs: ['entities', 'services', 'qrcodes']
    },

    form?: {
      formName: 'service-feedback',
      completedFields: ['service', 'recipient'],
      pendingFields: ['ratings']
    }
  }
}
```

### Page Integration Examples

**Tickets Page:**
```typescript
const { openModal, closeModal } = useChatContext();

const handleViewTicket = (ticket) => {
  openModal('view-ticket', {
    entityType: 'ticket',
    entityId: ticket.ticket_number,
    entityName: ticket.subject,
    data: { status: ticket.status.name, priority: ticket.priority.name }
  });
};
```

**Manage Data Page (Tabs):**
```typescript
const { switchTab } = useChatContext();

useEffect(() => {
  switchTab('managedata', activeTab, ['entities', 'services', 'qrcodes']);
}, []);

const handleTabChange = (tabId) => {
  setActiveTab(tabId);
  switchTab('managedata', tabId, ['entities', 'services', 'qrcodes']);
};
```

**Feedback Form:**
```typescript
const { updateFormProgress, clearForm } = useChatContext();

useEffect(() => {
  const completed = [];
  const pending = [];

  if (selectedService) completed.push('service');
  else pending.push('service');

  const ratingCount = Object.values(ratings).filter(r => r > 0).length;
  if (ratingCount === 5) completed.push('ratings');
  else pending.push(`ratings (${ratingCount}/5 completed)`);

  updateFormProgress('service-feedback', { completedFields: completed, pendingFields: pending });
}, [selectedService, ratings]);

useEffect(() => () => clearForm(), []);
```

### AI Bot Implementation (Receiving Context)

```typescript
// AI Bot - Context Listener
export function usePortalContext() {
  const [context, setContext] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      // Validate origin
      if (event.origin !== process.env.NEXT_PUBLIC_PORTAL_URL) return;
      if (event.data?.type !== 'CONTEXT_UPDATE') return;

      setContext(event.data.context);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return context;
}
```

### Fetching Static Page Context

```typescript
async function fetchPageContext(route) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/content/page-context?route=${encodeURIComponent(route)}`
  );
  return response.json();
}
```

---

## Bot Inventory Management

### Accessing the Inventory

Navigate to: `/admin/ai-inventory` (Admin role required)

### Adding a New Bot

Edit `frontend/public/config/bots-config.json`:

```json
{
  "bots": [
    {
      "id": "unique-bot-id",
      "name": "Bot Display Name",
      "url": "https://your-bot-url.com",
      "description": "Brief description",
      "status": "active",
      "deployment": "cloud",
      "audience": "all",
      "modality": "text",
      "category": "General Assistance",
      "icon": "🤖",
      "features": ["Feature 1", "Feature 2"]
    }
  ]
}
```

### Bot Configuration Fields

| Field | Required | Values |
|-------|----------|--------|
| `id` | Yes | Unique identifier (lowercase, hyphens) |
| `name` | Yes | Display name |
| `url` | Yes | Full URL to bot interface |
| `description` | Yes | Brief description |
| `status` | Yes | `active`, `planned`, `deprecated` |
| `deployment` | No | `cloud`, `on-premise`, `hybrid` |
| `audience` | No | `admin`, `staff`, `public`, `all` |
| `modality` | No | `text`, `voice`, `multimodal` |
| `category` | No | Category name |
| `icon` | No | Emoji icon |
| `features` | No | Array of feature descriptions |

### ChatBot Environment Configuration

```bash
# .env
NEXT_PUBLIC_CHATBOT_URL=https://your-bot-url.vercel.app
NEXT_PUBLIC_SITE_URL=https://gea.your-domain.com
```

---

## Testing Guide

### Browser Console Testing

```javascript
// Listen for context updates
window.addEventListener('message', (e) => {
  if (e.data?.type === 'CONTEXT_UPDATE') {
    console.log('📨 Context:', e.data.context);
  }
});

// Check iframe exists
const iframe = document.querySelector('iframe[title="Grenada AI Assistant"]');
console.log('Iframe found:', !!iframe);
```

### Test Scenarios

| Scenario | Expected Context |
|----------|------------------|
| Navigate to `/admin/tickets` | `changeType: 'navigation'`, `route: '/admin/tickets'` |
| Click ticket row | `changeType: 'modal'`, `modal.type: 'view-ticket'` |
| Close modal | `changeType: 'modal'`, `modal: null` |
| Switch to Services tab | `changeType: 'tab'`, `tab.activeTab: 'services'` |
| Fill feedback form | `changeType: 'form'`, `form.completedFields: [...]` |

### API Testing

```bash
# Get page context
curl "https://gea.your-domain.com/api/content/page-context?route=/admin/tickets"

# Check coverage
curl "https://gea.your-domain.com/api/content/page-context/status"
```

### Integration Checklist

- [ ] ChatContextProvider wraps app in layout.tsx
- [ ] ChatBot component receives context from provider
- [ ] postMessage sent to iframe with correct origin
- [ ] Console shows `[ChatContext] Sent:` messages
- [ ] Context updates on navigation, modal, tab, form changes

---

## Troubleshooting

### postMessage Not Received

**Check:**
1. Iframe exists: `document.querySelector('iframe[title="Grenada AI Assistant"]')`
2. ChatBot is open (context only sent when visible)
3. `NEXT_PUBLIC_CHATBOT_URL` in environment variables

### Context Not Updating

**Check:**
1. Component uses `useChatContext()` hook
2. Handler functions call context methods
3. Console shows `[ChatContext] Sent:` messages

### Bot Not Receiving Context

**AI Bot must:**
```javascript
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://gea.your-domain.com') return;
  if (event.data?.type === 'CONTEXT_UPDATE') {
    // Process context
  }
});
```

### Bot Not Appearing in Inventory

1. Verify `bots-config.json` is valid JSON
2. Ensure bot entry has all required fields
3. Rebuild frontend: `docker compose build frontend`

---

## Security Considerations

### postMessage Origin Validation

**Portal (sender):**
```typescript
const botOrigin = new URL(config.CHATBOT_URL).origin;
iframe.contentWindow.postMessage(message, botOrigin);
```

**AI Bot (receiver):**
```typescript
if (event.origin !== process.env.NEXT_PUBLIC_PORTAL_URL) {
  return; // Reject untrusted origins
}
```

### Data Sent in Context

- ✅ Ticket numbers (visible to user)
- ✅ Entity names (public information)
- ✅ Status/priority (user has access)
- ❌ Password hashes
- ❌ API keys
- ❌ User tokens

---

## Performance Notes

- **postMessage frequency:** 1-3 messages per user action
- **Static Context API:** Cached 15 minutes, < 30ms response
- **Bundle size impact:** ~10.5 KB (minified + gzipped)
- **localStorage writes:** Only after resize completes

---

**Document Version:** 1.0
**Last Updated:** November 28, 2025
**Maintained By:** GEA Portal Development Team
