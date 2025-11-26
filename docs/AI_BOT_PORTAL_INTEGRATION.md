# AI Bot & Portal Integration - Solution Document

**GEA Portal v3 - Context-Aware AI Assistant**
**Version:** 1.0
**Date:** November 26, 2025
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [How It Works](#how-it-works)
4. [Data Flow](#data-flow)
5. [Key Components](#key-components)
6. [JSON Message Formats](#json-message-formats)
7. [Integration Flows](#integration-flows)
8. [API Endpoints](#api-endpoints)
9. [Configuration](#configuration)
10. [Deployment Guide](#deployment-guide)

---

## Executive Summary

The GEA Portal integrates an AI-powered chatbot that provides context-aware assistance to users. The bot understands:

- **What page** the user is viewing
- **What action** they're performing (viewing ticket, editing user, etc.)
- **Where they are** in a multi-step process
- **What data** they're working with

This is achieved through a **dual-channel approach**:

1. **Static Page Context** - Pre-built metadata about each page
2. **Dynamic UI Context** - Real-time state updates via postMessage

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GEA Portal (Next.js)                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Static Page Context System                                     │ │
│  │  ┌──────────────┐      ┌─────────────┐     ┌─────────────┐    │ │
│  │  │ @pageContext │ ───> │   Script    │ ──> │ JSON Files  │    │ │
│  │  │  JSDoc Tags  │      │  Generator  │     │   /public   │    │ │
│  │  └──────────────┘      └─────────────┘     └─────────────┘    │ │
│  │                                                    │             │ │
│  │                                                    ▼             │ │
│  │                                              ┌──────────┐        │ │
│  │                                              │   API    │        │ │
│  │                                              │ Endpoint │        │ │
│  │                                              └──────────┘        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Dynamic Context System                                         │ │
│  │  ┌──────────────────┐                                           │ │
│  │  │ ChatContextProvider │ (React Context)                        │ │
│  │  │                     │                                         │ │
│  │  │  State Tracking:    │                                         │ │
│  │  │  • route            │                                         │ │
│  │  │  • modal            │                                         │ │
│  │  │  • edit             │                                         │ │
│  │  │  • tab              │                                         │ │
│  │  │  • form             │                                         │ │
│  │  └──────────────────┘                                           │ │
│  │           │                                                       │ │
│  │           ▼                                                       │ │
│  │  ┌──────────────────┐                                           │ │
│  │  │  Page Components  │                                           │ │
│  │  │  Call:            │                                           │ │
│  │  │  • openModal()    │                                           │ │
│  │  │  • closeModal()   │                                           │ │
│  │  │  • switchTab()    │                                           │ │
│  │  │  • updateForm()   │                                           │ │
│  │  └──────────────────┘                                           │ │
│  │           │                                                       │ │
│  │           ▼                                                       │ │
│  │  ┌──────────────────┐                                           │ │
│  │  │  ChatBot.tsx      │                                           │ │
│  │  │  • Receives context                                           │ │
│  │  │  • Sends postMessage                                          │ │
│  │  └──────────────────┘                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                          │                                           │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
                           │ postMessage (CONTEXT_UPDATE)
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    AI Bot (Vercel - Separate App)                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Message Listener                                               │ │
│  │  window.addEventListener('message', handleContextUpdate)        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Context Storage                                                │ │
│  │  • Current route                                                │ │
│  │  • Active modal                                                 │ │
│  │  • Edit state                                                   │ │
│  │  • Tab state                                                    │ │
│  │  • Form progress                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  API Calls                                                      │ │
│  │  GET /api/content/page-context?route={route}                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  AI Prompt Builder                                              │ │
│  │  Combines:                                                      │ │
│  │  • Static page context (from API)                              │ │
│  │  • Dynamic UI context (from postMessage)                       │ │
│  │  • User question                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  AI Model (Claude/GPT)                                          │ │
│  │  Generates context-aware response                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. Static Page Context (Build Time)

**Purpose:** Provide AI with pre-built knowledge about each page

**Process:**
1. Developer adds `@pageContext` JSDoc comments to page files
2. Build script scans all `page.tsx` files
3. Extracts metadata and generates JSON files
4. API endpoint serves this data to AI bot

**Example:**
```typescript
/**
 * @pageContext
 * @title Ticket Management Dashboard
 * @purpose View and manage support tickets
 * @steps
 *   - Review statistics cards
 *   - Use filters to find tickets
 *   - Click ticket to view details
 */
export default function TicketsPage() { ... }
```

### 2. Dynamic Context (Runtime)

**Purpose:** Keep AI updated on real-time user actions

**Process:**
1. User performs action (opens modal, switches tab, etc.)
2. Page component calls context hook method
3. ChatContextProvider updates state
4. ChatBot component sends postMessage to iframe
5. AI bot receives and stores context
6. AI uses context in next response

**Example:**
```typescript
const { openModal } = useChatContext();

// When user clicks "View Ticket"
openModal('view-ticket', {
  entityId: 'TKT-2025-001',
  entityName: 'Passport Issue',
  data: { status: 'Open', priority: 'High' }
});

// AI bot now knows:
// "User is viewing ticket TKT-2025-001 (Passport Issue)"
```

---

## Data Flow

### Flow 1: User Opens Ticket Modal

```
1. User Action
   └─> User clicks on ticket row in table

2. Component Handler
   └─> handleEditTicket(ticketId) called
       └─> Finds ticket data
       └─> Calls openModal('view-ticket', { ... })

3. Context Provider
   └─> Updates modal state
   └─> Triggers re-render
   └─> Calls sendContextToBot()

4. ChatBot Component
   └─> Receives context update via hook
   └─> Finds iframe element
   └─> Constructs postMessage payload
   └─> Sends to iframe with correct origin

5. AI Bot Iframe
   └─> window.addEventListener('message') receives event
   └─> Validates event.origin
   └─> Stores context in state
   └─> Updates UI (shows context in header)

6. User Asks Question
   └─> "What's the priority of this ticket?"

7. AI Response
   └─> Combines:
       • Static context: "Ticket Management Dashboard"
       • Dynamic context: "Viewing ticket TKT-2025-001, Priority: High"
       • User question
   └─> Generates: "This ticket has a High priority..."
```

### Flow 2: User Switches Tab

```
1. User Action
   └─> Clicks "Services" tab in Master Data page

2. Component Handler
   └─> handleTabChange('services') called
   └─> Updates local state: setActiveTab('services')
   └─> Calls switchTab('managedata', 'services', [...])

3. Context Provider
   └─> Updates tab state
   └─> Sends postMessage with tab info

4. AI Bot
   └─> Receives tab update
   └─> Knows user is now on Services tab
   └─> Can provide service-specific help

5. User Asks
   └─> "How do I add a new service?"

6. AI Response
   └─> Knows user is on Services tab
   └─> Provides step-by-step for adding service
```

### Flow 3: User Fills Feedback Form

```
1. Page Load
   └─> useEffect initializes form context
   └─> Sends initial state: all fields pending

2. User Selects Service
   └─> State updated: selectedService = "Tax Services"
   └─> useEffect detects change
   └─> Calls updateFormProgress({ completedFields: ['service'] })

3. User Selects Recipient
   └─> State updated: recipientGroup = "citizen"
   └─> Calls updateFormProgress({ completedFields: ['service', 'recipient'] })

4. User Rates (3/5 ratings)
   └─> State updated: ratings = { q1: 4, q2: 5, q3: 3, q4: 0, q5: 0 }
   └─> Calls updateFormProgress({
       completedFields: ['service', 'recipient'],
       pendingFields: ['ratings (3/5 completed)']
     })

5. User Asks
   └─> "What else do I need to fill?"

6. AI Response
   └─> Knows 3/5 ratings completed
   └─> Responds: "You need to complete 2 more ratings..."
```

---

## Key Components

### 1. Type Definitions
**File:** `frontend/src/types/chat-context.ts`

```typescript
export interface PageContext {
  route: string;                    // "/admin/tickets"
  timestamp: number;                 // 1705312456789
  changeType: 'modal' | 'edit' | 'tab' | 'form' | 'navigation';

  modal?: {
    type: string;                    // "view-ticket"
    title?: string;                  // "Ticket Details"
    entityType?: string;             // "ticket"
    entityId?: string | number;      // "TKT-2025-001"
    entityName?: string;             // "Passport Issue"
    data?: Record<string, any>;      // { status: "Open", priority: "High" }
  };

  edit?: {
    isEditing: boolean;
    entityType: string;
    entityId: string | number;
    entityName?: string;
    fields?: string[];
  };

  tab?: {
    tabGroup: string;                // "managedata"
    activeTab: string;               // "services"
    availableTabs: string[];         // ["entities", "services", "qrcodes"]
  };

  form?: {
    formName: string;                // "service-feedback"
    currentStep?: number;            // 2
    totalSteps?: number;             // 3
    completedFields?: string[];      // ["service", "recipient"]
    pendingFields?: string[];        // ["ratings (3/5 completed)"]
  };
}
```

### 2. Context Provider
**File:** `frontend/src/providers/ChatContextProvider.tsx`

**Key Responsibilities:**
- Maintains current page context state
- Provides helper methods to components
- Sends postMessage to AI bot iframe
- Auto-tracks navigation changes
- Handles provider lifecycle

**Key Methods:**
```typescript
openModal(type, data)      // Track modal open
closeModal()               // Track modal close
startEditing(type, id)     // Track edit mode start
stopEditing()              // Track edit mode end
switchTab(group, tab)      // Track tab change
updateFormProgress(name, data) // Track form progress
clearForm()                // Clear form state
```

### 3. ChatBot Component
**File:** `frontend/src/components/ChatBot.tsx`

**Key Responsibilities:**
- Renders AI bot iframe
- Displays current context in header
- Sends context updates via postMessage
- Handles iframe load events
- Manages open/close state

**Context Display Logic:**
```typescript
if (modal) return "📋 Modal Title"
if (edit) return "✏️ Editing Entity"
if (tab) return "📁 Tab Name"
return "📍 /current/route"
```

### 4. Page Integrations

#### Tickets Page
**File:** `frontend/src/components/admin/tickets/TicketDashboard.tsx`

**Integration:**
```typescript
const { openModal, closeModal } = useChatContext();

const handleEditTicket = (ticketId) => {
  const ticket = tickets.find(t => t.ticket_id === ticketId);
  openModal('view-ticket', {
    entityType: 'ticket',
    entityId: ticket.ticket_number,
    entityName: ticket.subject,
    data: {
      status: ticket.status.name,
      priority: ticket.priority.name,
      category: ticket.category?.name
    }
  });
};
```

#### Users Page
**File:** `frontend/src/app/admin/users/page.tsx`

**Integration:**
```typescript
const { openModal, closeModal } = useChatContext();

// Add user
<button onClick={() => {
  setShowAddModal(true);
  openModal('add-user', { title: 'Add New User' });
}}>Add User</button>

// Edit user
<button onClick={() => {
  openModal('edit-user', {
    entityId: user.id,
    entityName: user.name,
    data: { email: user.email, role: user.role_name }
  });
}}>Edit</button>
```

#### Manage Data Page
**File:** `frontend/src/app/admin/managedata/page.tsx`

**Integration:**
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

#### Feedback Page
**File:** `frontend/src/app/feedback/page.tsx`

**Integration:**
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

---

## JSON Message Formats

### 1. postMessage Format (Portal → AI Bot)

**Message Type:** Dynamic Context Update

```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/tickets",
    "timestamp": 1705312456789,
    "changeType": "modal",
    "modal": {
      "type": "view-ticket",
      "title": "Ticket Details",
      "entityType": "ticket",
      "entityId": "TKT-2025-001",
      "entityName": "Poor service at passport office",
      "data": {
        "status": "Open",
        "priority": "High",
        "category": "Grievance",
        "entity": "Ministry of Finance",
        "service": "Passport Services",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    }
  }
}
```

**All Change Types:**

**Navigation:**
```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/feedback",
    "changeType": "navigation",
    "timestamp": 1705312456789
  }
}
```

**Modal:**
```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/users",
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
    },
    "timestamp": 1705312456790
  }
}
```

**Tab Switch:**
```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/admin/managedata",
    "changeType": "tab",
    "tab": {
      "tabGroup": "managedata",
      "activeTab": "services",
      "availableTabs": ["entities", "services", "qrcodes"]
    },
    "timestamp": 1705312456791
  }
}
```

**Form Progress:**
```json
{
  "type": "CONTEXT_UPDATE",
  "context": {
    "route": "/feedback",
    "changeType": "form",
    "form": {
      "formName": "service-feedback",
      "completedFields": ["service", "recipient_group"],
      "pendingFields": ["ratings (3/5 completed)"]
    },
    "timestamp": 1705312456792
  }
}
```

### 2. API Response Format (Portal API → AI Bot)

**Endpoint:** `GET /api/content/page-context?route=/admin/tickets`

**Response Type:** Static Page Metadata

```json
{
  "route": "/admin/tickets",
  "title": "Ticket Management Dashboard",
  "purpose": "View, filter, and manage all support tickets and citizen grievances in a centralized dashboard",
  "audience": "staff",
  "features": [
    "Comprehensive ticket list with search and filtering",
    "Filter by status: Open, In Progress, Waiting, Resolved, Closed",
    "Filter by priority: Critical, High, Medium, Low",
    "Statistics cards showing ticket counts and SLA metrics",
    "Click ticket row to view detailed information"
  ],
  "steps": [
    "Review statistics cards at the top for quick overview",
    "Use filters to narrow down tickets by status, priority, category",
    "Search for specific tickets using ticket number or keywords",
    "Click on any ticket row to open the detail view",
    "Update ticket status and add notes in the detail modal"
  ],
  "tips": [
    "Tickets are color-coded by priority for quick visual scanning",
    "SLA indicators show time remaining to respond (red when overdue)",
    "MDA staff see only tickets assigned to their entity",
    "Use status filters to focus on actionable items (Open, In Progress)"
  ],
  "permissions": [
    "staff: Can view and manage tickets for their assigned entity",
    "admin: Can view and manage all tickets across all entities"
  ],
  "relatedPages": [
    "/admin/analytics: View ticket analytics and performance metrics",
    "/admin/service-requests: Manage EA service requests",
    "/helpdesk: Public ticket tracking portal"
  ],
  "troubleshooting": [
    "Issue: Can't see all tickets | Solution: Staff users only see tickets for their entity",
    "Issue: Can't update ticket status | Solution: Ensure you have proper permissions",
    "Issue: Filters not working | Solution: Clear all filters and try again"
  ],
  "autoGenerated": false,
  "lastUpdated": "2025-11-26T20:08:40.966Z"
}
```

**Status Endpoint:** `GET /api/content/page-context/status`

```json
{
  "totalPages": 22,
  "documented": 22,
  "inferred": 0,
  "coverage": "100%",
  "documentedRoutes": [
    "/",
    "/about",
    "/admin/tickets",
    "/admin/users",
    "/admin/managedata",
    "/feedback",
    "/helpdesk"
  ],
  "inferredRoutes": [],
  "generatedAt": "2025-11-26T20:08:40.979Z"
}
```

---

## Integration Flows

### Flow Diagram: Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USER LANDS ON PAGE                                         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PORTAL SENDS NAVIGATION CONTEXT                             │
│                                                                 │
│  ChatContextProvider detects route change (usePathname)        │
│  Sends: { type: 'CONTEXT_UPDATE', changeType: 'navigation' }  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. AI BOT FETCHES STATIC CONTEXT                              │
│                                                                 │
│  GET /api/content/page-context?route=/admin/tickets           │
│  Receives: page title, purpose, steps, tips, features         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. AI BOT IS NOW AWARE OF:                                    │
│  • What page user is on                                        │
│  • Page purpose and features                                   │
│  • How to use the page                                         │
│  • Common issues and solutions                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. USER OPENS TICKET MODAL                                    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. PORTAL SENDS MODAL CONTEXT                                 │
│                                                                 │
│  openModal('view-ticket', {                                    │
│    entityId: 'TKT-2025-001',                                  │
│    entityName: 'Passport Issue',                              │
│    data: { status: 'Open', priority: 'High' }                │
│  })                                                            │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. AI BOT NOW KNOWS:                                          │
│  • User is viewing specific ticket                             │
│  • Ticket number and subject                                   │
│  • Current status and priority                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. USER ASKS QUESTION                                         │
│  "What's the priority of this ticket?"                         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. AI GENERATES CONTEXT-AWARE RESPONSE                        │
│                                                                 │
│  Combines:                                                     │
│  • Static: "Ticket Management Dashboard helps you..."          │
│  • Dynamic: "You're viewing ticket TKT-2025-001..."           │
│  • Data: "This ticket has High priority..."                   │
│                                                                 │
│  Response: "This ticket (TKT-2025-001: Passport Issue) has    │
│  a High priority. High priority tickets should be addressed    │
│  within 24 hours according to the SLA."                       │
└─────────────────────────────────────────────────────────────────┘
```

### Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  PORTAL (https://gea.abhirup.app)                              │
│                                                                 │
│  1. ChatBot component prepares message                         │
│  2. Gets bot origin from config.CHATBOT_URL                    │
│  3. Validates iframe exists                                     │
│  4. Sends postMessage with targetOrigin check                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ postMessage(message, botOrigin)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI BOT (https://bot.example.com)                              │
│                                                                 │
│  1. window.addEventListener('message', handler)                │
│  2. Validates event.origin === 'https://gea.abhirup.app'      │
│  3. Checks event.data.type === 'CONTEXT_UPDATE'               │
│  4. Stores context in state                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Page Context Endpoint

**URL:** `/api/content/page-context`

**Method:** `GET`

**Parameters:**
- `route` (required): Page route (e.g., `/admin/tickets`)

**Request Example:**
```bash
curl "https://gea.abhirup.app/api/content/page-context?route=/admin/tickets"
```

**Response:** See [JSON Message Formats](#json-message-formats) section

**Error Handling:**
- Missing route: Returns generic auto-generated context
- Invalid route: Returns generic auto-generated context
- No errors thrown - always returns valid JSON

### 2. Status Endpoint

**URL:** `/api/content/page-context/status`

**Method:** `GET`

**Parameters:** None

**Request Example:**
```bash
curl "https://gea.abhirup.app/api/content/page-context/status"
```

**Response:**
```json
{
  "totalPages": 22,
  "documented": 22,
  "coverage": "100%",
  "generatedAt": "2025-11-26T20:08:40.979Z"
}
```

---

## Configuration

### Environment Variables

**Portal (.env):**
```bash
# AI Bot URL (iframe source)
NEXT_PUBLIC_CHATBOT_URL=https://your-bot-domain.vercel.app

# Portal URL (for CORS)
NEXT_PUBLIC_SITE_URL=https://gea.abhirup.app
```

**AI Bot (.env):**
```bash
# Portal URL (for postMessage origin validation)
NEXT_PUBLIC_PORTAL_URL=https://gea.abhirup.app

# API Base URL
NEXT_PUBLIC_API_URL=https://gea.abhirup.app/api
```

### CORS Configuration

**Portal API (Next.js):**
```typescript
// No CORS needed - API is on same domain
// postMessage handles cross-origin communication
```

**AI Bot:**
```typescript
// Validate postMessage origin
window.addEventListener('message', (event) => {
  const allowedOrigin = process.env.NEXT_PUBLIC_PORTAL_URL;

  if (event.origin !== allowedOrigin) {
    console.warn('Rejected message from untrusted origin:', event.origin);
    return;
  }

  // Process message...
});
```

---

## Deployment Guide

### Step 1: Build Portal

```bash
cd /home/azureuser/GEAv3/frontend

# Generate page contexts
npm run generate-contexts

# Build Next.js app
npm run build

# Verify build
ls -la .next/
```

### Step 2: Configure Environment

```bash
# Set environment variables
export NEXT_PUBLIC_CHATBOT_URL=https://your-bot.vercel.app
export NEXT_PUBLIC_SITE_URL=https://gea.abhirup.app

# Verify
echo $NEXT_PUBLIC_CHATBOT_URL
```

### Step 3: Deploy Portal

```bash
# Using Docker
docker-compose up -d --build

# Or using PM2
pm2 start npm --name "gea-portal" -- start
pm2 save
```

### Step 4: Deploy AI Bot

```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_PORTAL_URL=https://gea.abhirup.app
# NEXT_PUBLIC_API_URL=https://gea.abhirup.app/api
```

### Step 5: Verify Integration

```bash
# Test page context API
curl "https://gea.abhirup.app/api/content/page-context/status"

# Test specific page
curl "https://gea.abhirup.app/api/content/page-context?route=/admin/tickets"

# Open portal in browser
# Open DevTools console
# Navigate to different pages
# Verify postMessage logs:
# [ChatContext] Sent: navigation
# [ChatContext] Sent: modal
```

---

## AI Bot Implementation Guide

### Receiving Context Updates

```typescript
// AI Bot - Context Listener
import { useEffect, useState } from 'react';

interface PageContext {
  route: string;
  timestamp: number;
  changeType: string;
  modal?: any;
  edit?: any;
  tab?: any;
  form?: any;
}

export function usePortalContext() {
  const [context, setContext] = useState<PageContext | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      const allowedOrigin = process.env.NEXT_PUBLIC_PORTAL_URL;
      if (event.origin !== allowedOrigin) {
        return;
      }

      // Validate message type
      if (event.data?.type !== 'CONTEXT_UPDATE') {
        return;
      }

      // Store context
      setContext(event.data.context);
      console.log('[AI Bot] Context updated:', event.data.context);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return context;
}
```

### Fetching Static Context

```typescript
// AI Bot - Fetch Page Context
async function fetchPageContext(route: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const url = `${apiUrl}/content/page-context?route=${encodeURIComponent(route)}`;

  const response = await fetch(url);
  const pageContext = await response.json();

  return pageContext;
}
```

### Building AI Prompts

```typescript
// AI Bot - Build Context-Aware Prompt
async function buildPrompt(userQuestion: string, dynamicContext: PageContext) {
  // Fetch static context
  const staticContext = await fetchPageContext(dynamicContext.route);

  // Build prompt
  const systemPrompt = `
You are an AI assistant for the GEA Portal.

CURRENT PAGE:
- Route: ${staticContext.route}
- Title: ${staticContext.title}
- Purpose: ${staticContext.purpose}
- Audience: ${staticContext.audience}

PAGE FEATURES:
${staticContext.features?.map(f => `- ${f}`).join('\n')}

HOW TO USE THIS PAGE:
${staticContext.steps?.map(s => `- ${s}`).join('\n')}

TIPS:
${staticContext.tips?.map(t => `- ${t}`).join('\n')}

CURRENT USER CONTEXT:
${dynamicContext.modal ? `
- User is viewing a modal: ${dynamicContext.modal.title}
- Entity: ${dynamicContext.modal.entityType} (${dynamicContext.modal.entityId})
- Details: ${JSON.stringify(dynamicContext.modal.data, null, 2)}
` : ''}

${dynamicContext.tab ? `
- User is on tab: ${dynamicContext.tab.activeTab}
- Available tabs: ${dynamicContext.tab.availableTabs.join(', ')}
` : ''}

${dynamicContext.form ? `
- User is filling form: ${dynamicContext.form.formName}
- Completed: ${dynamicContext.form.completedFields?.join(', ')}
- Pending: ${dynamicContext.form.pendingFields?.join(', ')}
` : ''}

Provide helpful, context-aware assistance based on what the user is doing.
`;

  const userPrompt = `User question: ${userQuestion}`;

  return { systemPrompt, userPrompt };
}
```

### Example AI Response

```typescript
// User on /admin/tickets, viewing TKT-2025-001
// User asks: "What should I do next?"

const { systemPrompt, userPrompt } = await buildPrompt(
  "What should I do next?",
  {
    route: '/admin/tickets',
    modal: {
      type: 'view-ticket',
      entityId: 'TKT-2025-001',
      data: { status: 'Open', priority: 'High' }
    }
  }
);

// AI Response:
"Based on the ticket you're viewing (TKT-2025-001), here's what you should do next:

1. **Review the ticket details** - This is a High priority ticket, so it requires urgent attention.

2. **Update the status** - Since it's currently Open, you should change it to 'In Progress' to indicate you're working on it.

3. **Add internal notes** - Document any actions you're taking. Remember, internal notes are not visible to citizens.

4. **Check SLA deadline** - High priority tickets should be addressed within 24 hours.

5. **Assign if needed** - If this requires another department's input, you can escalate or assign it.

Would you like help with any of these steps?"
```

---

## Troubleshooting

### Issue: postMessage not received

**Symptoms:**
- Console shows `[ChatContext] Sent:` but bot doesn't update
- No errors in console

**Solution:**
1. Check iframe exists: `document.querySelector('iframe[title="Grenada AI Assistant"]')`
2. Verify bot URL in `.env`: `NEXT_PUBLIC_CHATBOT_URL`
3. Check origin validation in AI bot code
4. Open iframe in separate tab and check console

### Issue: Context not updating

**Symptoms:**
- User actions don't trigger context updates
- Console doesn't show `[ChatContext] Sent:`

**Solution:**
1. Verify component uses `useChatContext()` hook
2. Check provider wraps entire app in `layout.tsx`
3. Ensure handler functions call context methods
4. Check for JavaScript errors in console

### Issue: API returns empty/wrong context

**Symptoms:**
- API returns auto-generated context for documented pages
- Missing page metadata

**Solution:**
1. Regenerate contexts: `npm run generate-contexts`
2. Check `@pageContext` JSDoc in page files
3. Verify JSON files exist: `ls frontend/public/page-contexts*.json`
4. Restart dev server

---

## Performance Considerations

### postMessage Frequency

**Current:** 1-3 messages per user action
**Acceptable:** Up to 10 messages/second
**Optimization:** Context updates are batched in React render cycle

### API Caching

**Static Context API:**
- Cached in memory (15 minutes)
- Generated at build time
- No database queries

**Performance:**
- First request: ~200ms
- Cached requests: < 30ms

### Bundle Size Impact

**Added to bundle:**
- Type definitions: ~2 KB
- Provider: ~8 KB
- Hook: ~0.5 KB
- **Total:** ~10.5 KB (minified + gzipped)

---

## Security Considerations

### 1. postMessage Origin Validation

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

### 2. No Sensitive Data in Context

**What's sent:**
- ✅ Ticket numbers (already visible to user)
- ✅ Entity names (public information)
- ✅ Status/priority (user has access)
- ❌ Password hashes
- ❌ API keys
- ❌ User tokens

### 3. iframe Security

```html
<iframe
  src={CHATBOT_URL}
  sandbox="allow-scripts allow-same-origin"
  allow="clipboard-write"
  title="Grenada AI Assistant"
/>
```

---

## Future Enhancements

### 1. Search Context
Track user search queries and results

### 2. Error Context
Send error messages to bot for troubleshooting help

### 3. User Actions
Track exports, downloads, prints

### 4. Session Context
Track user session length and actions taken

### 5. Performance Metrics
Send performance data for optimization suggestions

---

## Conclusion

The GEA Portal's AI bot integration provides a sophisticated, context-aware assistance system that combines:

✅ **Static page metadata** - Built at compile time
✅ **Dynamic UI state** - Updated in real-time
✅ **Type-safe implementation** - Full TypeScript coverage
✅ **Secure communication** - Origin-validated postMessage
✅ **High performance** - < 30ms API responses
✅ **Comprehensive coverage** - 22 pages, 100% documented

The result is an AI assistant that truly understands what the user is doing and can provide intelligent, contextual help.

---

**Document Version:** 1.0
**Last Updated:** November 26, 2025
**Maintained By:** GEA Development Team
