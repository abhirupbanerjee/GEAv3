# AI Bot Integration Guide

**GEA Portal v3 - AI Chatbot Assistant**

**Version:** 2.0
**Last Updated:** January 2026
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Admin Settings](#admin-settings)
5. [Bot Inventory Management](#bot-inventory-management)
6. [External API for Bot Data Access](#external-api-for-bot-data-access)
7. [Future Roadmap](#future-roadmap)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The GEA Portal integrates an AI-powered chatbot that provides assistance to users. The chatbot is embedded as an iframe and can be enabled or disabled through Admin Settings.

### Current Implementation

| Feature | Status |
|---------|--------|
| Embedded iframe chatbot | Active |
| Enable/Disable toggle | Available in Admin Settings |
| State tracking (page context) | Not implemented |
| Real-time UI context | Not implemented |
| External API data access | Available |

### Hosting

| Environment | Location | Notes |
|-------------|----------|-------|
| **Current** | Azure Cloud | Microsoft Azure hosting |
| **Future** | GoG Data Center | Migration planned when subscriptions available |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GEA Portal (Next.js)                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  ChatBot.tsx Component                                         │ │
│  │  • Checks CHATBOT_ENABLED setting                              │ │
│  │  • Renders iframe if enabled                                   │ │
│  │  • Displays chatbot URL from settings                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           │ iframe embed
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    AI Chatbot (Azure Cloud)                          │
│  • Standalone chatbot application                                    │
│  • No state tracking from portal                                     │
│  • Can access portal data via External API (if configured)           │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `frontend/src/components/ChatBot.tsx` | ChatBot iframe component |
| `frontend/src/app/layout.tsx` | ChatBot placement |
| `frontend/public/config/bots-config.json` | Bot inventory configuration |

---

## Configuration

### Environment Variables

```bash
# .env
NEXT_PUBLIC_CHATBOT_URL=https://your-chatbot.azurewebsites.net
NEXT_PUBLIC_SITE_URL=https://gea.your-domain.com
```

### Database Settings

The chatbot is controlled via system settings in the `system_settings` table:

| Setting Key | Type | Description |
|-------------|------|-------------|
| `CHATBOT_ENABLED` | boolean | Enable/disable the chatbot globally |
| `CHATBOT_URL` | url | URL of the chatbot application |

---

## Admin Settings

### Enabling/Disabling the Chatbot

1. Navigate to **Admin Portal** → **Settings**
2. Go to the **Integrations** tab
3. Find the **Chatbot** section
4. Toggle **Enable Chatbot** on or off
5. Click **Save Changes**

### Configuring the Chatbot URL

1. In the **Integrations** tab → **Chatbot** section
2. Enter the chatbot URL in the **Chatbot URL** field
3. Click **Save Changes**
4. Use the **Open Chatbot** button to test the configuration

### When to Disable

Consider disabling the chatbot if:
- The Azure subscription is inactive
- Migration to GoG DC is in progress
- Performance issues are observed
- Maintenance is required

---

## Bot Inventory Management

### Accessing the Inventory

Navigate to: `/admin/ai-inventory` (Admin role required)

The inventory provides an overview of all configured AI bots and their status.

### Bot Configuration File

Edit `frontend/public/config/bots-config.json`:

```json
{
  "bots": [
    {
      "id": "gea-assistant",
      "name": "GEA AI Assistant",
      "url": "https://your-chatbot.azurewebsites.net",
      "description": "AI assistant for GEA Portal users",
      "status": "active",
      "deployment": "cloud",
      "audience": "all",
      "modality": "text",
      "category": "General Assistance",
      "icon": "🤖",
      "features": [
        "Answer questions about government services",
        "Guide users through portal features",
        "Provide service information"
      ]
    }
  ]
}
```

### Bot Configuration Fields

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `id` | Yes | string | Unique identifier (lowercase, hyphens) |
| `name` | Yes | string | Display name |
| `url` | Yes | url | Full URL to bot interface |
| `description` | Yes | string | Brief description |
| `status` | Yes | `active`, `planned`, `deprecated` | Current status |
| `deployment` | No | `cloud`, `on-premise`, `hybrid` | Deployment type |
| `audience` | No | `admin`, `staff`, `public`, `all` | Target users |
| `modality` | No | `text`, `voice`, `multimodal` | Interaction mode |
| `category` | No | string | Category name |
| `icon` | No | string | Emoji icon |
| `features` | No | array | List of feature descriptions |

---

## External API for Bot Data Access

The chatbot can access GEA Portal data programmatically using the External API.

### Overview

| Method | Use Case | Authentication |
|--------|----------|----------------|
| **External API** | Dashboard data (feedback, tickets, entities) | API Key |

### External API Endpoint

```
GET /api/external/dashboard
```

**Authentication:** API Key via `X-API-Key` header

**Available Data Sections:**
- `feedback` - Service feedback statistics
- `tickets` - Ticket dashboard statistics
- `leaderboard` - Service performance rankings
- `requests` - EA service request statistics
- `entities` - Entity master data
- `services` - Service master data

### Bot Integration Example

```python
import requests

# Configuration
API_KEY = "your-api-key"
PORTAL_URL = "https://gea.your-domain.com"

def get_portal_data(sections=None, entity_id=None):
    """Fetch data from GEA Portal External API."""
    headers = {"X-API-Key": API_KEY}
    params = {}

    if sections:
        params["include"] = ",".join(sections)
    if entity_id:
        params["entity_id"] = entity_id

    response = requests.get(
        f"{PORTAL_URL}/api/external/dashboard",
        headers=headers,
        params=params
    )
    return response.json()

# Get all dashboard data
data = get_portal_data()

# Get specific sections
stats = get_portal_data(sections=["feedback", "tickets"])

# Filter by entity
entity_data = get_portal_data(entity_id="AGY-001")
```

### Documentation Reference

For complete External API documentation, see:
- [API_REFERENCE.md - External API Section](API_REFERENCE.md#external-api-botintegration-access)

---

## Future Roadmap

### Migration to GoG Data Center

The chatbot is currently hosted on Azure Cloud. Migration to the Government of Grenada Data Center is planned when:

1. Required Azure subscriptions are provisioned for GoG DC
2. Infrastructure is ready to host the chatbot application
3. Network connectivity is established

**Migration Steps (Future):**
1. Deploy chatbot application to GoG DC infrastructure
2. Update DNS/routing to point to new location
3. Update `CHATBOT_URL` in Admin Settings
4. Verify functionality
5. Decommission Azure deployment

### Potential Enhancements

| Feature | Status | Notes |
|---------|--------|-------|
| State tracking (page context) | Not planned | Current chatbot doesn't support this |
| Real-time UI context | Not planned | Would require chatbot modifications |
| Voice interaction | Not planned | Future consideration |
| Multi-language support | Possible | Depends on chatbot capabilities |

---

## Troubleshooting

### Chatbot Not Appearing

**Check:**
1. Chatbot is enabled in Admin Settings → Integrations → Chatbot
2. `CHATBOT_URL` is configured correctly
3. Azure deployment is running and accessible

**Solution:**
```bash
# Test chatbot URL directly
curl -I https://your-chatbot.azurewebsites.net

# Check if URL returns 200 OK
```

### Chatbot Shows Error or Blank

**Check:**
1. Browser console for errors (F12 → Console)
2. Network tab for failed requests
3. CORS configuration on chatbot server

**Common Issues:**
- Mixed content (HTTP chatbot on HTTPS portal)
- CORS blocking iframe
- Azure app not running

### Chatbot Not Responding

**Check:**
1. Azure subscription status
2. App Service health in Azure Portal
3. Chatbot application logs

**Solution:**
- Restart the Azure App Service
- Check Azure subscription billing status
- Contact Azure support if persistent

### Disabling Chatbot Temporarily

If issues persist:
1. Go to Admin Settings → Integrations → Chatbot
2. Toggle **Enable Chatbot** to OFF
3. Click **Save Changes**
4. Chatbot will no longer appear for users

---

## Security Considerations

### iframe Security

The chatbot is embedded via iframe. Security measures:

- **X-Frame-Options:** Portal should allow embedding from configured chatbot URL
- **Content Security Policy:** Chatbot URL should be in allowed frame-src
- **HTTPS:** Both portal and chatbot should use HTTPS

### Data Access

When using External API:
- API key should be stored securely on chatbot server
- Use HTTPS for all API calls
- Limit data access to necessary sections only

### Data Sent to Chatbot

| Allowed | Not Allowed |
|---------|-------------|
| Public service information | User passwords |
| Ticket numbers (user has access) | API keys |
| Entity names (public info) | Session tokens |
| Status/priority info | Personal data without consent |

---

**Document Version:** 2.0
**Last Updated:** January 2026
**Maintained By:** GEA Portal Development Team
