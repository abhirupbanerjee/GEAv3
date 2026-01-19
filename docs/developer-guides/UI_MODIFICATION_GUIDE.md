# GEA Portal - UI Modification Developer Guide

**Government of Grenada Enterprise Architecture Portal**

**Version:** 1.1
**Last Updated:** January 2026
**Audience:** Frontend Developers, UI/UX Developers

---

## Applicable Portal Pages

This guide covers modification and extension of the following admin and public pages:

### Admin Pages (Requires Admin/Staff Login)
| Page | URL | What You Can Modify |
|------|-----|---------------------|
| **Admin Dashboard** | `/admin/home` | Dashboard cards, quick stats, layout |
| **Ticket Management** | `/admin/tickets` | Ticket table, filters, status badges |
| **User Management** | `/admin/users` | User table, add/edit forms |
| **Master Data Management** | `/admin/managedata` | Entity/service/QR code tables and forms |
| **Analytics Dashboard** | `/admin/analytics` | Metric cards, charts, leaderboards |
| **Service Requests** | `/admin/service-requests` | Request table, status displays |
| **AI Bot Inventory** | `/admin/ai-inventory` | Bot cards, status indicators |
| **System Settings** | `/admin/settings` | 9 settings categories, configuration tabs, database backups |

### Public Pages
| Page | URL | What You Can Modify |
|------|-----|---------------------|
| **Home** | `/` | Hero section, service grid, content |
| **About** | `/about` | Page content, leadership contacts |
| **Services** | `/services` | Service directory, search, filters |
| **Feedback** | `/feedback` | Rating forms, submission flow |
| **Helpdesk** | `/helpdesk` | Ticket lookup, display |

### Citizen Portal Pages (Twilio SMS OTP Auth)
| Page | URL | What You Can Modify |
|------|-----|---------------------|
| **Citizen Login** | `/citizen/login` | OTP verification flow, login/registration forms |
| **Citizen Dashboard** | `/citizen/dashboard` | Citizen-facing features and services |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [How-To: Add a New AI Bot to Inventory](#3-how-to-add-a-new-ai-bot-to-inventory)
4. [How-To: Add a New Analytics Card](#4-how-to-add-a-new-analytics-card)
5. [How-To: Modify Service Leaderboard Calculations](#5-how-to-modify-service-leaderboard-calculations)
6. [How-To: Add a New User Role Category](#6-how-to-add-a-new-user-role-category)
7. [How-To: Add a New Admin Page](#7-how-to-add-a-new-admin-page)
8. [How-To: Customize Dashboard Quick Stats](#8-how-to-customize-dashboard-quick-stats)
9. [Common UI Patterns](#9-common-ui-patterns)
10. [Styling Reference](#10-styling-reference)
11. [Testing Checklist](#11-testing-checklist)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Introduction

### 1.1 About This Guide

This guide provides **step-by-step instructions** for common UI modification tasks in the GEA Portal. Each section is a complete how-to guide that you can follow independently.

### 1.2 What You Need

Before starting:

- ✅ Working knowledge of **React** and **TypeScript**
- ✅ Familiarity with **Next.js 14** (App Router)
- ✅ Understanding of **Tailwind CSS**
- ✅ Local development environment running
- ✅ Access to the codebase

### 1.3 Quick Reference: Project Structure

```
frontend/src/
├── app/                    # Pages and API routes
│   ├── page.tsx           # Home page (/)
│   ├── about/page.tsx     # About page
│   ├── feedback/page.tsx  # Feedback form
│   ├── admin/             # Admin pages
│   │   ├── home/page.tsx
│   │   ├── tickets/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── ai-inventory/page.tsx
│   └── api/               # API endpoints
│       ├── feedback/
│       ├── admin/
│       └── managedata/
│
├── components/            # Reusable UI components
│   ├── admin/
│   ├── analytics/
│   ├── home/
│   └── layout/
│
├── lib/                   # Utilities and helpers
│   ├── auth.ts           # Authentication config
│   ├── db.ts             # Database connection
│   └── schemas/          # Validation schemas
│
├── providers/            # React context providers
├── hooks/                # Custom React hooks
├── types/                # TypeScript types
└── config/               # Configuration files
    ├── content.ts        # Site content
    └── navigation.ts     # Menu items
```

---

## 2. Getting Started

### 2.1 Start Development Server

```bash
# Navigate to frontend
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### 2.2 Important Concepts

#### Page Context Tags
Always add this JSDoc comment at the top of new pages:

```typescript
/**
 * @pageContext
 * @title Your Page Title
 * @purpose What this page does
 * @audience admin|staff|public
 * @features
 *   - Feature 1
 *   - Feature 2
 */
```

This enables the AI assistant to understand the page.

#### Authentication
Admin pages require authentication:

```typescript
import { useSession } from 'next-auth/react'

const { data: session } = useSession()
const isAdmin = session?.user?.roleType === 'admin'
const isStaff = session?.user?.roleType === 'staff'
```

---

## 3. How-To: Add a New AI Bot to Inventory

**Goal:** Add a new AI chatbot to the AI Bot Inventory page.

**Applicable Pages:** `/admin/ai-inventory`

### Step 1: Edit the Bot Configuration File

Edit: `frontend/public/config/bots-config.json`

```json
{
  "bots": [
    {
      "id": "my-new-bot",
      "name": "My New AI Assistant",
      "url": "https://my-bot-url.com",
      "description": "Helps users with specific tasks",
      "status": "active",
      "deployment": "cloud",
      "audience": "staff",
      "modality": "text",
      "category": "Task Automation"
    }
  ]
}
```

**Fields:**
- `id`: Unique identifier (lowercase, hyphens)
- `name`: Display name
- `url`: Full URL to bot interface
- `description`: Brief description
- `status`: `active` or `planned`
- `deployment`: `cloud`, `on-premise`, or `hybrid`
- `audience`: `admin`, `staff`, or `public`
- `modality`: `text`, `voice`, or `multimodal`
- `category`: Free text category

### Step 2: Test

```bash
# Restart dev server
# Ctrl+C, then npm run dev

# Navigate to http://localhost:3000/admin/ai-inventory
# Verify your bot appears in the list
```

### Step 3: Deploy

```bash
# From project root
docker-compose up -d --build frontend
```

**That's it!** The bot will now appear in the inventory with automatic status indicators and action buttons.

---

## 4. How-To: Add a New Analytics Card

**Goal:** Add a new metric card to the analytics dashboard.

**Applicable Pages:** `/admin/analytics`

### Step 1: Identify Where to Add the Card

Open: `frontend/src/app/admin/analytics/page.tsx`

Find the section where you want to add the card. Common locations:
- **Feedback Section** (around line 436)
- **Service Requests Section** (around line 508)
- **Tickets Section** (around line 592)

### Step 2: Add Your Card

Add this code in your chosen section:

```typescript
<div className="bg-white rounded-lg shadow-md p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600 mb-1">Your Metric Name</p>
      <p className="text-3xl font-bold text-blue-600">
        {yourMetricValue}
      </p>
      <p className="text-xs text-gray-500 mt-1">Helpful subtitle</p>
    </div>
    <div className="text-4xl">📊</div>
  </div>
</div>
```

### Step 3: Fetch Data for Your Card

Add to the `fetchAnalytics` function:

```typescript
// Inside fetchAnalytics() function
const yourMetricResponse = await fetch('/api/your-metric-endpoint')
if (yourMetricResponse.ok) {
  const yourMetricData = await yourMetricResponse.json()
  setYourMetric(yourMetricData.value)
}
```

### Step 4: Add State Variable

Add near the top of the component:

```typescript
const [yourMetric, setYourMetric] = useState<number>(0)
```

### Step 5: Test

```bash
npm run dev
# Navigate to /admin/analytics
# Verify your card displays with correct data
```

### Color Options

| Purpose | Text Color | Icon |
|---------|-----------|------|
| Positive/Success | `text-green-600` | ✅ 📈 🟢 |
| Warning | `text-yellow-600` | ⚠️ 🟡 |
| Error/Alert | `text-red-600` | 🚨 🔴 ❌ |
| Info | `text-blue-600` | ℹ️ 📊 📋 |
| Neutral | `text-gray-900` | 📄 |

---

## 5. How-To: Modify Service Leaderboard Calculations

**Goal:** Change how services are ranked on the leaderboard.

**Applicable Pages:** `/admin/analytics` (leaderboard section)

### Understanding the Current Formula

The overall score (0-10 scale) is calculated as:

```
Score = (Satisfaction × 0.4) + (Completion% ÷ 20) + (5 - GrievanceRate × 5)
```

**Breakdown:**
1. **Customer Satisfaction (40%):** Average rating × 0.4 (max 2.0 points)
2. **Completion Rate (25%):** Completion % ÷ 20 (max 5.0 points)
3. **Grievance Penalty (35%):** 5 - (grievance rate × 5) (max 5.0 points)

### Step 1: Modify the SQL Formula

Edit: `frontend/src/app/api/admin/service-leaderboard/route.ts`

Find the `overall_score` calculation (around line 111):

```sql
ROUND(
  (
    COALESCE(sf.avg_satisfaction, 0) * 0.4 +
    COALESCE(sr.completion_rate, 0) / 20 +
    (5 - COALESCE(sf.grievance_count::numeric / NULLIF(sf.feedback_count::numeric, 0) * 5, 0))
  )::numeric,
  2
) as overall_score
```

### Example Modifications

**Example 1: Increase Completion Rate Weight (50%)**

```sql
ROUND(
  (
    COALESCE(sf.avg_satisfaction, 0) * 0.25 +     -- Reduced from 0.4
    COALESCE(sr.completion_rate, 0) / 10 +         -- Changed from /20 (doubles weight)
    (5 - COALESCE(sf.grievance_count::numeric / NULLIF(sf.feedback_count::numeric, 0) * 5, 0))
  )::numeric,
  2
) as overall_score
```

**Example 2: Add Response Time Factor**

First, add response time to the stats (in `service_request_stats` CTE):

```sql
AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::numeric as avg_response_hours
```

Then modify the score:

```sql
ROUND(
  (
    COALESCE(sf.avg_satisfaction, 0) * 0.3 +
    COALESCE(sr.completion_rate, 0) / 20 +
    (5 - COALESCE(sf.grievance_count::numeric / NULLIF(sf.feedback_count::numeric, 0) * 5, 0)) * 0.7 +
    -- Response time bonus (faster = better)
    CASE
      WHEN sr.avg_response_hours <= 24 THEN 2.0
      WHEN sr.avg_response_hours <= 48 THEN 1.5
      WHEN sr.avg_response_hours <= 72 THEN 1.0
      ELSE 0.5
    END
  )::numeric,
  2
) as overall_score
```

### Step 2: Update the Info Panel

Edit: `frontend/src/components/analytics/ServiceLeaderboard.tsx`

Update the score calculation info (around line 61):

```typescript
<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
  <h4 className="font-semibold text-blue-900 mb-2">Overall Score Calculation</h4>
  <div className="text-blue-800 space-y-1">
    <p><strong>1. Customer Satisfaction (40%):</strong> Your formula here</p>
    <p><strong>2. Completion Rate (25%):</strong> Your formula here</p>
    <p><strong>3. Grievance Penalty (35%):</strong> Your formula here</p>
  </div>
</div>
```

### Step 3: Test

```bash
# Rebuild and test
npm run build
npm run dev

# Navigate to /admin/analytics
# Scroll to leaderboard
# Click info button (ℹ️) to see updated formula
# Verify rankings make sense
```

---

## 6. How-To: Add a New User Role Category

**Goal:** Add a new user role type (e.g., "Regional Manager") to the system.

**Applicable Pages:** `/admin/users`, `/auth/signin`

### Step 1: Add Role to Database

```bash
# Connect to database
docker exec -it feedback_db psql -U feedback_user -d feedback

# Add new role
INSERT INTO user_roles (role_code, role_name, description, access_level)
VALUES ('regional_mgr', 'Regional Manager', 'Manages multiple entities in a region', 3);

# Verify
SELECT * FROM user_roles;

# Exit
\q
```

### Step 2: Update TypeScript Types

Edit: `frontend/src/types/next-auth.d.ts` (or create if doesn't exist)

```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      email?: string | null
      name?: string | null
      roleCode?: string
      roleType?: 'admin' | 'staff' | 'regional' | 'public'  // Add 'regional'
      entityId?: string | null
    }
  }
}
```

### Step 3: Update Authentication Logic

Edit: `frontend/src/lib/auth.ts`

Find the role mapping logic and add your new role:

```typescript
// Map role_code to roleType
let roleType: 'admin' | 'staff' | 'regional' | 'public' = 'public'

if (userRole === 'admin_dta') {
  roleType = 'admin'
} else if (userRole === 'staff_mda') {
  roleType = 'staff'
} else if (userRole === 'regional_mgr') {  // Add this
  roleType = 'regional'
}
```

### Step 4: Update User Management UI

Edit: `frontend/src/app/admin/users/page.tsx`

Add the new role to the role dropdown:

```typescript
<select name="role" className="...">
  <option value="admin_dta">Admin (DTA)</option>
  <option value="staff_mda">Staff (MDA)</option>
  <option value="regional_mgr">Regional Manager</option>  {/* Add this */}
</select>
```

### Step 5: Add Role-Specific Logic (Optional)

If regional managers need special permissions:

```typescript
const { data: session } = useSession()
const isRegionalManager = session?.user?.roleType === 'regional'

if (isRegionalManager) {
  // Show regional-specific features
}
```

### Step 6: Test

```bash
# Restart dev server
npm run dev

# Test:
# 1. Go to /admin/users
# 2. Add a new user with "Regional Manager" role
# 3. Sign in as that user
# 4. Verify correct access level
```

---

## 7. How-To: Add a New Admin Page

**Goal:** Create a new admin page from scratch.

**Example:** Create a page to view system logs at `/admin/logs`

### Step 1: Create the Page File

Create: `frontend/src/app/admin/logs/page.tsx`

```typescript
/**
 * @pageContext
 * @title System Logs
 * @purpose View system activity and audit logs
 * @audience admin
 * @features
 *   - Filter logs by date and type
 *   - Search log entries
 *   - Export logs to CSV
 * @permissions
 *   - admin: Full access to all system logs
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface LogEntry {
  log_id: string
  timestamp: string
  user_email: string
  action: string
  details: string
}

export default function SystemLogsPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/logs')

        if (!response.ok) {
          throw new Error('Failed to fetch logs')
        }

        const data = await response.json()
        setLogs(data.logs)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchLogs()
    }
  }, [session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">System Logs</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.log_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.user_email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.action}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### Step 2: Create the API Endpoint

Create: `frontend/src/app/api/admin/logs/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view logs
    if (session.user?.roleType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch logs from database
    const query = `
      SELECT
        log_id,
        timestamp,
        user_email,
        action,
        details
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `

    const result = await pool.query(query)

    return NextResponse.json({
      logs: result.rows,
      count: result.rows.length
    })

  } catch (error) {
    console.error('Logs API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve logs' },
      { status: 500 }
    )
  }
}
```

### Step 3: Add Navigation Link

Edit: `frontend/src/config/navigation.ts` or your admin sidebar component

```typescript
{
  label: 'System Logs',
  href: '/admin/logs',
  icon: '📜',
  requiredRole: 'admin'
}
```

### Step 4: Test

```bash
npm run dev

# Navigate to http://localhost:3000/admin/logs
# Verify:
# - Page loads
# - Data displays in table
# - Only accessible to admins
```

---

## 8. How-To: Customize Dashboard Quick Stats

**Goal:** Modify the stat cards on the admin dashboard.

**Applicable Pages:** `/admin/home`

### Step 1: Understand the Component

The quick stats are in: `frontend/src/components/admin/QuickStatsCards.tsx`

This component fetches data from multiple APIs and displays 4 cards:
1. Active Entities
2. Active Services
3. Active QR Codes
4. Total Feedback

### Step 2: Add a New Stat Card

Edit: `frontend/src/components/admin/QuickStatsCards.tsx`

**Add state for new metric:**

```typescript
const [stats, setStats] = useState<Stats>({
  entities: 0,
  services: 0,
  qrCodes: 0,
  totalFeedback: 0,
  totalUsers: 0  // Add this
})
```

**Fetch the data:**

```typescript
// In fetchStats function
const [entitiesRes, servicesRes, qrCodesRes, feedbackRes, usersRes] = await Promise.all([
  fetch('/api/managedata/entities'),
  fetch('/api/managedata/services'),
  fetch('/api/managedata/qrcodes'),
  fetch('/api/feedback/stats'),
  fetch('/api/admin/users/count')  // Add this
])

const users = await usersRes.json()

setStats({
  // ... existing stats
  totalUsers: users.count || 0
})
```

**Add card definition:**

```typescript
const cards = [
  // ... existing cards
  {
    label: 'Total Users',
    value: stats.totalUsers,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    link: '/admin/users',
  }
]
```

### Step 3: Modify Existing Card

To change an existing card (e.g., change "Total Feedback" to show last 30 days):

```typescript
// Modify fetch logic
const feedbackResponse = await fetch('/api/feedback/stats?period=30days')

// Update card label
{
  label: 'Feedback (Last 30 Days)',  // Changed
  value: stats.totalFeedback,
  // ... rest stays the same
}
```

### Step 4: Test

```bash
npm run dev
# Navigate to /admin/home
# Verify new/modified cards display correctly
```

---

## 9. Common UI Patterns

### Pattern 1: Loading State

```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>
  )
}
```

### Pattern 2: Error State

```typescript
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 className="text-red-800 font-semibold mb-2">Error</h3>
      <p className="text-red-600">{error}</p>
    </div>
  )
}
```

### Pattern 3: Empty State

```typescript
if (data.length === 0) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📭</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Found</h3>
      <p className="text-gray-600">Try adjusting your filters or come back later.</p>
    </div>
  )
}
```

### Pattern 4: Card Layout

```typescript
<div className="bg-white rounded-lg shadow-md p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Title</h3>
  {/* Card content */}
</div>
```

### Pattern 5: Table

```typescript
<div className="bg-white rounded-lg shadow-md overflow-hidden">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Column 1
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {/* Table rows */}
    </tbody>
  </table>
</div>
```

---

## 10. Styling Reference

### Color Palette

```typescript
// Status Colors
'text-green-600 bg-green-50'   // Success/Positive
'text-yellow-600 bg-yellow-50' // Warning
'text-red-600 bg-red-50'       // Error/Danger
'text-blue-600 bg-blue-50'     // Info
'text-purple-600 bg-purple-50' // Special
'text-gray-600 bg-gray-50'     // Neutral
```

### Common Button Styles

```typescript
// Primary button
className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"

// Secondary button
className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"

// Danger button
className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"

// Outline button
className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
```

### Responsive Grid

```typescript
// 1 column mobile, 2 tablet, 3 desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// 1 column mobile, 2 tablet, 4 desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
```

### Common Icons (Emoji)

| Purpose | Icons |
|---------|-------|
| Success | ✅ ✓ 🟢 |
| Warning | ⚠️ 🟡 |
| Error | ❌ 🔴 🚨 |
| Info | ℹ️ 💡 |
| Stats | 📊 📈 📉 |
| User | 👤 👥 |
| Settings | ⚙️ 🔧 |
| Time | ⏰ 🕒 ⏱️ |
| Files | 📄 📁 📋 |

---

## 11. Testing Checklist

When you've made changes, test:

- [ ] Page loads without console errors
- [ ] Data displays correctly
- [ ] Loading state shows briefly
- [ ] Error states work (test by disconnecting from API)
- [ ] Empty states display when no data
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Authentication works (redirects if not logged in)
- [ ] Authorization works (staff see only their data)
- [ ] Buttons and links work
- [ ] Forms validate correctly
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Production build works: `npm run build`

---

## 12. Troubleshooting

### Issue: Page doesn't load / blank screen

**Check:**
1. Browser console for JavaScript errors
2. Terminal for TypeScript errors
3. Syntax errors in your code

**Fix:**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Restart dev server
# Ctrl+C, then npm run dev
```

### Issue: Data not loading

**Check:**
1. Network tab in browser DevTools
2. API endpoint returns 200 status
3. Correct API endpoint path

**Fix:**
```bash
# Test API directly
curl http://localhost:3000/api/your-endpoint

# Check server logs in terminal
```

### Issue: Authentication error (401)

**Check:**
1. You're signed in
2. Session is valid

**Fix:**
```bash
# Clear browser cookies
# Sign out and sign back in
```

### Issue: Authorization error (403)

**Check:**
1. Your user has correct role
2. API endpoint checks for correct role

**Fix:**
```typescript
// In API endpoint, check:
if (session.user?.roleType !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Issue: Styles not applying

**Check:**
1. Tailwind class names are correct
2. No typos in class names

**Fix:**
```bash
# Restart dev server
# Ctrl+C, then npm run dev

# Verify Tailwind config if adding custom colors
```

### Getting Help

1. Check browser console (F12)
2. Check terminal for errors
3. Review similar existing pages
4. Check Next.js docs: https://nextjs.org/docs
5. Check Tailwind docs: https://tailwindcss.com/docs

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm start               # Start production server
npx tsc --noEmit       # Check TypeScript errors

# Docker (from project root)
docker-compose up -d --build frontend  # Rebuild and deploy
docker-compose logs frontend           # View logs
docker-compose restart frontend        # Restart service

# Database
docker exec -it feedback_db psql -U feedback_user -d feedback
```

---

**Last Updated:** January 19, 2026 | **Version:** 1.2

**Change Log:**
- v1.2 (Jan 19, 2026): Added System Settings page, Citizen Portal pages, updated About page features
- v1.1 (Jan 2026): Initial version

For questions or to report issues with this guide, contact the development team.
