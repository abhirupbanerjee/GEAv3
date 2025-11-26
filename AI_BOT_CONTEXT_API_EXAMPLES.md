# AI Bot Context API - JSON Examples

**Date:** November 26, 2025
**Purpose:** Example JSON outputs sent to the AI chatbot via postMessage

---

## Overview

The GEA Portal sends context information to the AI chatbot using the `postMessage` API. This allows the bot to understand what the user is currently viewing or doing in the portal.

**Communication Flow:**
```
Portal (Parent Window) → postMessage → AI Bot (iframe)
```

**Message Format:**
```typescript
{
  type: 'CONTEXT_UPDATE',
  context: { /* context object */ }
}
```

---

## 1. Page Context API (`/api/content/page-context`)

This API provides static page metadata extracted from JSDoc comments.

### Example Request

```bash
GET /api/content/page-context?route=/admin/analytics
```

### Example Response

```json
{
  "route": "/admin/analytics",
  "title": "Analytics Dashboard",
  "purpose": "Comprehensive analytics dashboard showing feedback statistics, service request metrics, ticket performance, and service leaderboards",
  "audience": "staff",
  "features": [
    "Feedback analytics: Total submissions, average satisfaction ratings, grievance counts, service trust scores",
    "Service request statistics: Total requests, status breakdown, completion rates, recent activity",
    "Ticket metrics: Total tickets, overdue count, SLA compliance, average resolution time",
    "Service performance leaderboard: Top 5 and bottom 5 performing services",
    "Entity filter for admin users (multi-select dropdown)",
    "Refresh button to reload latest data",
    "Rating distribution charts and trend analysis"
  ],
  "steps": [
    "Review the summary cards at the top for quick KPIs",
    "Admin users can filter by one or more entities using the entity filter",
    "Scroll through sections: Citizen Feedback, Service Requests, Support Tickets, Service Leaderboard",
    "Check the leaderboard to identify top-performing and attention-needed services",
    "Use the Refresh button to get latest data"
  ],
  "tips": [
    "MDA staff see data for their entity only (auto-filtered)",
    "DTA administrators can filter by multiple entities or view all",
    "Color coding: Green (good performance), Yellow (average), Red (needs attention)",
    "Leaderboard shows services needing attention based on grievance rates",
    "SLA compliance percentage shows on-time ticket resolution rate"
  ],
  "relatedPages": [
    {
      "route": "/admin/service-requests",
      "description": "Detailed service request management"
    },
    {
      "route": "/admin/service-requests/analytics",
      "description": "In-depth service request analytics"
    },
    {
      "route": "/admin/tickets",
      "description": "Ticket management dashboard"
    },
    {
      "route": "/admin/home",
      "description": "Return to admin home"
    }
  ],
  "permissions": [
    {
      "role": "staff",
      "access": "View analytics for their assigned entity only"
    },
    {
      "role": "admin",
      "access": "View analytics across all entities with filtering capability"
    }
  ],
  "troubleshooting": [
    {
      "issue": "Data not loading",
      "solution": "Check network connection and try refresh button"
    },
    {
      "issue": "Can't see other entities",
      "solution": "Staff users only see their entity - this is by design"
    },
    {
      "issue": "Leaderboard shows no data",
      "solution": "Ensure services have received feedback - new systems may have limited data"
    }
  ]
}
```

---

## 2. Dynamic Context Updates (via postMessage)

These are real-time updates sent when the user interacts with the portal.

### 2.1 Basic Page Visit (No Interaction)

When user just navigates to a page:

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "page": {
      "route": "/admin/analytics",
      "title": "Analytics Dashboard",
      "timestamp": "2025-11-26T18:35:42.123Z"
    },
    "modal": null,
    "edit": null,
    "tab": null,
    "form": null
  }
}
```

---

### 2.2 Viewing a Ticket (Modal Open)

When user clicks to view ticket details:

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "page": {
      "route": "/admin/tickets",
      "title": "Ticket Management Dashboard",
      "timestamp": "2025-11-26T18:36:15.456Z"
    },
    "modal": {
      "type": "view-ticket",
      "title": "Ticket Details",
      "entityType": "ticket",
      "entityId": "TKT-2025-001234",
      "entityName": "Issue with passport renewal service",
      "data": {
        "ticketNumber": "TKT-2025-001234",
        "subject": "Issue with passport renewal service",
        "status": "Open",
        "priority": "High",
        "category": "grievance",
        "submittedBy": "john.doe@example.com",
        "assignedTo": "Ministry of Foreign Affairs",
        "createdAt": "2025-11-25T14:30:00Z",
        "dueDate": "2025-11-27T14:30:00Z",
        "isOverdue": false,
        "description": "The passport renewal form is not accepting my documents."
      }
    },
    "edit": null,
    "tab": null,
    "form": null
  }
}
```

**AI Bot Can Now Answer:**
- "What is the status of this ticket?" → "Open"
- "When is it due?" → "November 27, 2025 at 2:30 PM"
- "Is it overdue?" → "No, it's not overdue yet"
- "What should I do next?" → Suggests updating status or adding internal notes

---

### 2.3 Editing a User (Edit Mode)

When admin clicks "Edit" on a user:

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "page": {
      "route": "/admin/users",
      "title": "User Management",
      "timestamp": "2025-11-26T18:37:22.789Z"
    },
    "modal": {
      "type": "edit-user",
      "title": "Edit User",
      "entityType": "user",
      "entityId": "user-12345",
      "entityName": "Jane Smith",
      "data": {
        "userId": "user-12345",
        "email": "jane.smith@gov.gd",
        "name": "Jane Smith",
        "role": "staff_mda",
        "roleType": "staff",
        "entity": "Ministry of Health",
        "entityId": "HEALTH-001",
        "isActive": true,
        "createdAt": "2025-01-15T10:00:00Z",
        "lastLogin": "2025-11-26T08:15:00Z"
      }
    },
    "edit": {
      "isEditing": true,
      "entityType": "user",
      "entityId": "user-12345",
      "entityName": "Jane Smith"
    },
    "tab": null,
    "form": null
  }
}
```

**AI Bot Can Now Answer:**
- "What entity is this user assigned to?" → "Ministry of Health"
- "What role does this user have?" → "Staff (MDA)"
- "Is this user active?" → "Yes, this user is active"
- "Can I change the entity?" → Explains how to update entity assignment

---

### 2.4 Switching Tabs (Manage Data Page)

When user clicks on the "Services" tab:

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "page": {
      "route": "/admin/managedata",
      "title": "Master Data Management",
      "timestamp": "2025-11-26T18:38:45.012Z"
    },
    "modal": null,
    "edit": null,
    "tab": {
      "activeTab": "services",
      "availableTabs": ["entities", "services", "qrcodes"]
    },
    "form": null
  }
}
```

**AI Bot Can Now Answer:**
- "What tab am I on?" → "You're viewing the Services tab"
- "How do I add a new service?" → Provides steps specific to services tab
- "What other tabs are available?" → Lists entities, services, and QR codes

---

### 2.5 Filling Out Feedback Form (Form Progress)

When user is partially through the feedback form:

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "page": {
      "route": "/feedback",
      "title": "Service Feedback Form",
      "timestamp": "2025-11-26T18:40:10.345Z"
    },
    "modal": null,
    "edit": null,
    "tab": null,
    "form": {
      "formType": "service-feedback",
      "currentStep": 2,
      "totalSteps": 3,
      "completedFields": ["entity", "service", "q1_ease", "q2_clarity"],
      "pendingFields": ["q3_timeliness", "q4_trust", "q5_overall_satisfaction"],
      "data": {
        "entity": "Ministry of Health",
        "service": "Medical Certificate Issuance",
        "q1_ease": 4,
        "q2_clarity": 5
      }
    }
  }
}
```

**AI Bot Can Now Answer:**
- "What step am I on?" → "You're on step 2 of 3"
- "What service am I rating?" → "Medical Certificate Issuance"
- "What have I filled out so far?" → Lists completed fields
- "What do I need to complete?" → Lists pending fields

---

### 2.6 Viewing Service Request Details

When admin views a specific service request:

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "page": {
      "route": "/admin/service-requests/SR-2025-00789",
      "title": "Service Request Details",
      "timestamp": "2025-11-26T18:42:33.678Z"
    },
    "modal": null,
    "edit": null,
    "tab": null,
    "form": null,
    "serviceRequest": {
      "requestId": "SR-2025-00789",
      "requestNumber": "SR-2025-00789",
      "title": "New database server for passport system",
      "description": "Need additional database capacity for the new passport processing system",
      "status": "in_progress",
      "priority": "high",
      "category": "infrastructure",
      "submittedBy": "admin@gov.gd",
      "assignedTo": "DTA Infrastructure Team",
      "entity": "Ministry of Foreign Affairs",
      "service": "Passport Services",
      "createdAt": "2025-11-20T09:00:00Z",
      "updatedAt": "2025-11-25T15:30:00Z",
      "targetDate": "2025-12-15T00:00:00Z",
      "estimatedCost": "$15,000",
      "approvalStatus": "approved",
      "progress": 45
    }
  }
}
```

**AI Bot Can Now Answer:**
- "What is the status of this request?" → "In Progress (45% complete)"
- "When is the target date?" → "December 15, 2025"
- "What's the estimated cost?" → "$15,000"
- "Has it been approved?" → "Yes, it's been approved"

---

### 2.7 Complex Context (Multiple States Active)

User is editing a ticket while on the analytics tab:

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "page": {
      "route": "/admin/analytics",
      "title": "Analytics Dashboard",
      "timestamp": "2025-11-26T18:45:00.123Z"
    },
    "modal": {
      "type": "filter-entities",
      "title": "Filter by Entity",
      "entityType": "filter",
      "data": {
        "selectedEntities": [
          "HEALTH-001",
          "EDUCATION-001",
          "FINANCE-001"
        ],
        "totalEntities": 25,
        "filterApplied": true
      }
    },
    "edit": null,
    "tab": {
      "activeTab": "leaderboard",
      "section": "service-performance"
    },
    "form": null
  }
}
```

**AI Bot Can Now Answer:**
- "What entities am I viewing?" → Lists the 3 selected entities
- "How many entities are filtered?" → "3 out of 25 total entities"
- "What section am I looking at?" → "Service Performance Leaderboard"

---

## 3. Full Context Object Schema

Complete TypeScript interface:

```typescript
interface ChatContext {
  page: {
    route: string              // Current page URL path
    title?: string             // Page title
    timestamp: string          // ISO timestamp
  }

  modal: {
    type: string               // e.g., 'view-ticket', 'edit-user', 'add-entity'
    title?: string             // Modal title
    entityType?: string        // e.g., 'ticket', 'user', 'service'
    entityId?: string          // Unique identifier
    entityName?: string        // Display name
    data?: Record<string, any> // Additional context data
  } | null

  edit: {
    isEditing: boolean
    entityType?: string
    entityId?: string
    entityName?: string
  } | null

  tab: {
    activeTab: string
    availableTabs?: string[]
    section?: string
  } | null

  form: {
    formType: string
    currentStep?: number
    totalSteps?: number
    completedFields?: string[]
    pendingFields?: string[]
    data?: Record<string, any>
  } | null

  // Additional context for specific pages
  [key: string]: any
}
```

---

## 4. How the AI Bot Uses This Data

### Example AI Bot Logic

```javascript
// AI Bot receives message
window.addEventListener('message', (event) => {
  if (event.data.type === 'CONTEXT_UPDATE') {
    const context = event.data.context

    // Update internal state
    updateBotContext(context)

    // Customize responses based on context
    if (context.modal?.type === 'view-ticket') {
      enableTicketCommands()
      suggestTicketActions(context.modal.data)
    }

    if (context.edit?.isEditing) {
      enableEditingHelp()
      warnBeforeNavigation()
    }

    if (context.form?.currentStep) {
      showFormProgressBar(context.form)
      suggestNextStep(context.form)
    }
  }
})
```

### Sample AI Responses

**User asks:** "What should I do next?"

**Without context:**
> "I can help you with various tasks. What would you like to do?"

**With ticket context (modal open):**
> "Based on the ticket you're viewing (TKT-2025-001234):
> 1. Update the status to 'In Progress' if you're working on it
> 2. Add internal notes to document your actions
> 3. Check the SLA deadline (November 27, 2025)
> 4. Assign it to a specific staff member if needed"

---

## 5. Testing the Context API

### Via Browser Console

```javascript
// 1. Check current context in portal
// Open browser console on any portal page
console.log(window.chatContext)

// 2. Check localStorage for chatbot size
console.log(localStorage.getItem('chatbot-size'))

// 3. Simulate context update
window.postMessage({
  type: 'CONTEXT_UPDATE',
  context: {
    page: { route: '/test', timestamp: new Date().toISOString() },
    modal: null,
    edit: null,
    tab: null,
    form: null
  }
}, '*')
```

### Via API Testing

```bash
# Test page context API
curl http://localhost:3000/api/content/page-context?route=/admin/analytics | jq

# Test with different routes
curl http://localhost:3000/api/content/page-context?route=/admin/tickets | jq
curl http://localhost:3000/api/content/page-context?route=/feedback | jq
curl http://localhost:3000/api/content/page-context?route=/admin/users | jq
```

---

## 6. Integration Examples

### For AI Bot Developers

**Receiving Context:**

```javascript
// In your AI bot's iframe
window.addEventListener('message', (event) => {
  // Verify origin (security)
  if (event.origin !== 'https://gea.gov.gd') return

  const { type, context } = event.data

  if (type === 'CONTEXT_UPDATE') {
    // Update your bot's understanding
    aiBot.updateContext(context)

    // Log for debugging
    console.log('[AI Bot] Received context:', context)

    // Adjust bot behavior
    if (context.modal) {
      aiBot.setMode('contextual-help')
      aiBot.loadEntityData(context.modal.entityId)
    } else {
      aiBot.setMode('general-help')
    }
  }
})
```

**Requesting Page Context:**

```javascript
// Fetch static page metadata
async function getPageContext(route) {
  const response = await fetch(
    `/api/content/page-context?route=${encodeURIComponent(route)}`
  )
  return await response.json()
}

// Use it
const analyticsContext = await getPageContext('/admin/analytics')
console.log('Features:', analyticsContext.features)
console.log('Tips:', analyticsContext.tips)
```

---

## 7. Real-World Usage Scenarios

### Scenario 1: User Needs Help with a Ticket

**Context Received:**
```json
{
  "modal": {
    "type": "view-ticket",
    "entityId": "TKT-2025-001234",
    "data": { "status": "Open", "priority": "High", "isOverdue": false }
  }
}
```

**User asks:** "How do I close this?"

**AI Response:**
> "To close ticket TKT-2025-001234:
> 1. Click the 'Update Status' button
> 2. Select 'Resolved' from the dropdown
> 3. Add a resolution note explaining what was done
> 4. Click 'Save Changes'
>
> Note: This ticket is marked as High priority and is not yet overdue."

---

### Scenario 2: User is Lost in the Form

**Context Received:**
```json
{
  "form": {
    "currentStep": 2,
    "totalSteps": 3,
    "pendingFields": ["q3_timeliness", "q4_trust", "q5_overall_satisfaction"]
  }
}
```

**User asks:** "I'm stuck, what do I need to fill out?"

**AI Response:**
> "You're on step 2 of 3 in the feedback form. You still need to complete:
> - Q3: Service Timeliness (rate 1-5)
> - Q4: Service Trust (rate 1-5)
> - Q5: Overall Satisfaction (rate 1-5)
>
> After completing these, you'll be able to submit your feedback."

---

### Scenario 3: Entity Filter Assistance

**Context Received:**
```json
{
  "modal": {
    "type": "filter-entities",
    "data": { "selectedEntities": ["HEALTH-001"], "totalEntities": 25 }
  }
}
```

**User asks:** "Why am I only seeing one ministry?"

**AI Response:**
> "You currently have an entity filter applied. You're viewing data for only 1 entity out of 25 total.
>
> To see all entities:
> 1. Click the 'Clear' button in the entity filter
> 2. Or click 'All Entities' to select everything
>
> Currently filtered: Ministry of Health"

---

## 8. Best Practices for AI Bot Integration

1. **Always validate context** - Check that required fields exist before using them
2. **Handle missing context** - Provide generic help when context is unavailable
3. **Respect user privacy** - Don't log sensitive data from context
4. **Update progressively** - Don't overwhelm user with context changes
5. **Provide context-aware suggestions** - Use the data to be proactive
6. **Clear context on page change** - Reset when user navigates away

---

## 9. Future Enhancements

Potential additions to context API:

- **User info:** Role, permissions, entity assignment
- **Analytics data:** Real-time metrics from current view
- **Navigation history:** Recent pages visited
- **Search queries:** What user searched for
- **Clipboard data:** Recently copied text (with permission)
- **Screen size:** Mobile vs desktop detection

---

**Last Updated:** November 26, 2025
**API Version:** 1.0
**Documentation Status:** Complete

For implementation details, see:
- [AI_BOT_PORTAL_INTEGRATION.md](docs/AI_BOT_PORTAL_INTEGRATION.md)
- [CONTEXT_BOT_QUICK_REFERENCE.md](CONTEXT_BOT_QUICK_REFERENCE.md)
