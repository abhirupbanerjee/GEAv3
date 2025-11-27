# AI Bots Management Guide

**GEA Portal v3 - AI Bot Inventory and Integration**

**Version:** 1.0
**Last Updated:** November 27, 2025
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [AI Bot Inventory](#ai-bot-inventory)
3. [Adding a New Bot](#adding-a-new-bot)
4. [Bot Configuration](#bot-configuration)
5. [Context-Aware Integration](#context-aware-integration)
6. [ChatBot Component](#chatbot-component)
7. [Admin Interface](#admin-interface)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The GEA Portal includes a centralized AI bot management system that allows administrators to:

- **Manage bot inventory** - Track all AI assistants in one place
- **Configure bot settings** - Control deployment, audience, and status
- **Integrate context-aware chat** - Provide intelligent assistance with real-time UI awareness
- **Monitor bot status** - View active, planned, and deprecated bots

---

## AI Bot Inventory

### Accessing the Inventory

Navigate to: `/admin/ai-inventory`

**Access Requirements:**
- Admin role authentication required
- Staff users cannot access this page

### Inventory Features

- **Bot Cards** - Visual display of all registered bots
- **Status Indicators** - Active, Planned, Deprecated
- **Quick Actions** - Launch bot, view details
- **Filtering** - Filter by category, status, audience
- **Search** - Find bots by name or description

---

## Adding a New Bot

### Step 1: Edit Configuration File

The bot inventory is stored in a JSON configuration file:

**File:** `frontend/public/config/bots-config.json`

### Step 2: Add Bot Entry

Add a new object to the `bots` array:

```json
{
  "bots": [
    {
      "id": "unique-bot-id",
      "name": "Bot Display Name",
      "url": "https://your-bot-url.com",
      "description": "Brief description of what this bot does",
      "status": "active",
      "deployment": "cloud",
      "audience": "staff",
      "modality": "text",
      "category": "Customer Service",
      "icon": "🤖",
      "features": [
        "Feature 1",
        "Feature 2",
        "Feature 3"
      ]
    }
  ]
}
```

### Step 3: Rebuild and Deploy

```bash
# Rebuild frontend
docker compose build frontend

# Restart service
docker compose up -d frontend
```

---

## Bot Configuration

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier (lowercase, hyphens) | `"grenada-assistant"` |
| `name` | string | Display name | `"Grenada AI Assistant"` |
| `url` | string | Full URL to bot interface | `"https://bot.example.com"` |
| `description` | string | Brief description | `"Helps citizens with..."` |
| `status` | enum | Current status | `"active"`, `"planned"`, `"deprecated"` |

### Optional Fields

| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `deployment` | enum | Where bot is hosted | `"cloud"`, `"on-premise"`, `"hybrid"` |
| `audience` | enum | Target users | `"admin"`, `"staff"`, `"public"`, `"all"` |
| `modality` | enum | Interaction type | `"text"`, `"voice"`, `"multimodal"` |
| `category` | string | Bot category | `"Customer Service"`, `"Technical Support"` |
| `icon` | string | Emoji icon | `"🤖"`, `"💬"`, `"🎯"` |
| `features` | array | List of capabilities | `["Feature 1", "Feature 2"]` |

### Status Values

| Status | Description | Display |
|--------|-------------|---------|
| `active` | Bot is live and operational | Green badge |
| `planned` | Bot is under development | Yellow badge |
| `deprecated` | Bot is being phased out | Red badge |

### Example Configuration

```json
{
  "bots": [
    {
      "id": "grenada-assistant",
      "name": "Grenada AI Assistant",
      "url": "https://grenada-bot.vercel.app",
      "description": "Context-aware AI assistant that provides intelligent help based on what users are currently viewing in the portal",
      "status": "active",
      "deployment": "cloud",
      "audience": "all",
      "modality": "text",
      "category": "General Assistance",
      "icon": "🇬🇩",
      "features": [
        "Context-aware responses",
        "Page-specific guidance",
        "Form assistance",
        "Ticket help"
      ]
    },
    {
      "id": "feedback-analyzer",
      "name": "Feedback Analysis Bot",
      "url": "https://feedback-bot.example.com",
      "description": "Analyzes citizen feedback and generates insights",
      "status": "planned",
      "deployment": "cloud",
      "audience": "admin",
      "modality": "text",
      "category": "Analytics",
      "icon": "📊",
      "features": [
        "Sentiment analysis",
        "Trend detection",
        "Report generation"
      ]
    }
  ]
}
```

---

## Context-Aware Integration

### How Context Works

The portal sends real-time context updates to AI bots via `postMessage`:

1. **User navigates** to a page → Context update sent
2. **User opens modal** (e.g., ticket details) → Context update sent
3. **User switches tab** → Context update sent
4. **User fills form** → Progress updates sent

### Context Data Structure

```typescript
{
  type: "CONTEXT_UPDATE",
  context: {
    route: "/admin/tickets",
    timestamp: 1705312456789,
    changeType: "modal",

    user: {
      id: "user-123",
      name: "John Doe",
      role: "staff",
      entity: { id: 5, name: "Ministry of Finance" }
    },

    modal: {
      type: "view-ticket",
      entityType: "ticket",
      entityId: "TKT-2025-001",
      entityName: "Passport Issue",
      data: { status: "Open", priority: "High" }
    },

    tab: {
      tabGroup: "managedata",
      activeTab: "services",
      availableTabs: ["entities", "services", "qrcodes"]
    },

    form: {
      formName: "service-feedback",
      completedFields: ["service", "recipient"],
      pendingFields: ["ratings"]
    }
  }
}
```

### Integration Documentation

For detailed integration instructions, see:
- [AI Bot Portal Integration Guide](AI_BOT_PORTAL_INTEGRATION.md)
- [Context Bot Quick Reference](CONTEXT_BOT_QUICK_REFERENCE.md)
- [Context Bot Testing Guide](CONTEXT_AWARE_BOT_TESTING.md)

---

## ChatBot Component

### Overview

The ChatBot component (`frontend/src/components/ChatBot.tsx`) renders the AI assistant as an iframe overlay.

### Features

- **Floating button** - Opens/closes chat interface
- **Resizable window** - Users can resize the chat window
- **Context display** - Shows current context in header
- **Minimize/maximize** - Collapse to button or expand
- **Mobile responsive** - Full-screen on mobile devices

### Configuration

The ChatBot URL is configured via environment variable:

```bash
# .env
NEXT_PUBLIC_CHATBOT_URL=https://your-bot-url.vercel.app
```

### Component Usage

The ChatBot is automatically included in the root layout:

```typescript
// frontend/src/app/layout.tsx
import ChatBot from '@/components/ChatBot'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ChatContextProvider>
          <Header />
          {children}
          <Footer />
          <ChatBot />  {/* AI Assistant */}
        </ChatContextProvider>
      </body>
    </html>
  )
}
```

### Customization

To customize the ChatBot appearance, edit:
- `frontend/src/components/ChatBot.tsx` - Component logic
- Tailwind classes within the component - Styling

---

## Admin Interface

### AI Inventory Page

**Location:** `/admin/ai-inventory`

**Features:**
- Grid view of all registered bots
- Status badges (Active, Planned, Deprecated)
- Launch buttons for active bots
- Category filtering
- Search functionality

### Bot Card Display

Each bot is displayed as a card showing:
- Bot icon and name
- Status badge
- Description
- Deployment type
- Audience type
- Feature list
- Launch button (if active)

### Admin Actions

| Action | Description |
|--------|-------------|
| **Launch** | Opens bot in new tab |
| **View Details** | Shows full bot configuration |
| **Filter** | Filter by category or status |
| **Search** | Find bots by name |

---

## Troubleshooting

### Bot Not Appearing in Inventory

**Check:**
1. Verify `bots-config.json` syntax is valid JSON
2. Ensure bot entry has all required fields
3. Rebuild frontend: `docker compose build frontend`
4. Clear browser cache

**Test JSON validity:**
```bash
cat frontend/public/config/bots-config.json | jq .
```

### ChatBot Not Loading

**Check:**
1. Verify `NEXT_PUBLIC_CHATBOT_URL` in `.env`
2. Check bot URL is accessible
3. View browser console for errors
4. Verify CORS settings on bot server

**Debug:**
```bash
# Check environment variable
docker exec frontend env | grep CHATBOT

# Test bot URL
curl -I https://your-bot-url.vercel.app
```

### Context Not Being Sent

**Check:**
1. ChatBot is open (context only sent when open)
2. `ChatContextProvider` wraps the app
3. Page components call context methods
4. Browser console shows `[ChatContext] Sent:` messages

**Debug in browser:**
```javascript
// Listen for context updates
window.addEventListener('message', (e) => {
  if (e.data?.type === 'CONTEXT_UPDATE') {
    console.log('Context:', e.data.context);
  }
});
```

### Bot Not Receiving Context

**Check:**
1. Bot listens for `message` events
2. Origin validation matches portal URL
3. Message type is `CONTEXT_UPDATE`

**Bot-side listener:**
```javascript
window.addEventListener('message', (event) => {
  // Validate origin
  if (event.origin !== 'https://gea.your-domain.com') return;

  // Process context
  if (event.data?.type === 'CONTEXT_UPDATE') {
    console.log('Received context:', event.data.context);
  }
});
```

---

## Best Practices

### Bot Development

1. **Validate context** - Always check origin of postMessage
2. **Handle missing data** - Context fields may be null
3. **Cache static context** - Fetch page context once per route
4. **Log context updates** - Help with debugging

### Bot Deployment

1. **Use HTTPS** - Required for iframe embedding
2. **Configure CORS** - Allow portal domain
3. **Test thoroughly** - Verify context integration
4. **Monitor errors** - Track failed context updates

### Bot Management

1. **Keep inventory updated** - Remove deprecated bots
2. **Document features** - Clear descriptions for users
3. **Categorize properly** - Help users find relevant bots
4. **Set correct audience** - Restrict admin-only bots

---

## API Reference

### Page Context API

**Endpoint:** `GET /api/content/page-context`

**Parameters:**
- `route` (required) - Page route

**Example:**
```bash
curl "https://gea.your-domain.com/api/content/page-context?route=/admin/tickets"
```

**Response:**
```json
{
  "route": "/admin/tickets",
  "title": "Ticket Management Dashboard",
  "purpose": "View and manage support tickets",
  "audience": "staff",
  "features": ["Ticket list", "Filters", "SLA tracking"],
  "steps": ["Review statistics", "Use filters", "Click to view"]
}
```

### Status Endpoint

**Endpoint:** `GET /api/content/page-context/status`

**Example:**
```bash
curl "https://gea.your-domain.com/api/content/page-context/status"
```

**Response:**
```json
{
  "totalPages": 22,
  "documented": 22,
  "coverage": "100%"
}
```

---

## See Also

- [AI Bot Portal Integration](AI_BOT_PORTAL_INTEGRATION.md) - Detailed integration guide
- [Context Bot Quick Reference](CONTEXT_BOT_QUICK_REFERENCE.md) - API quick reference
- [Context Bot Testing Guide](CONTEXT_AWARE_BOT_TESTING.md) - Testing scenarios
- [UI Modification Guide](developer-guides/UI_MODIFICATION_GUIDE.md) - Adding new bots to inventory

---

**Document Version:** 1.0
**Last Updated:** November 27, 2025
**Maintained By:** GEA Portal Development Team
