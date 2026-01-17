# GEA Portal - Staff User Manual

**Government of Grenada Enterprise Architecture Portal**

**Version:** 1.2
**Last Updated:** January 17, 2026
**Audience:** Ministry, Department, and Agency (MDA) Staff Officers

---

## Applicable Portal Pages

This manual covers the following pages accessible to MDA staff (requires login):

### Staff-Specific Pages
| Page | URL | Purpose |
|------|-----|---------|
| **Staff Home** | `/admin/staff/home` | Your personalized staff dashboard |
| **Analytics** | `/admin/analytics` | View analytics for your entity |
| **Master Data** | `/admin/managedata` | View entities and services (read-only) |
| **Users** | `/admin/users` | View entity users and add new staff users |
| **Service Requests** | `/admin/service-requests` | Submit and manage service requests |
| **Tickets** | `/admin/tickets` | Manage tickets for your entity only |

### Public Pages (Also Available to Staff)
| Page | URL | Purpose |
|------|-----|---------|
| **Home** | `/` | Portal homepage |
| **About** | `/about` | Information about the portal |
| **Services** | `/services` | Browse government services |
| **Submit Feedback** | `/feedback` | Rate government services |
| **Check Ticket Status** | `/helpdesk` | Public ticket lookup |
| **Sign In** | `/auth/signin` | OAuth authentication page |

**Note:** Staff users see data filtered to their assigned entity only. For full admin features (all entities, user management, master data), see the Admin user manual.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Signing In](#3-signing-in)
4. [Staff Dashboard](#4-staff-dashboard)
5. [Managing Tickets](#5-managing-tickets)
6. [Service Requests](#6-service-requests)
7. [User Management](#7-user-management)
8. [Viewing Analytics](#8-viewing-analytics)
9. [Using Citizen Features](#9-using-citizen-features)
10. [Troubleshooting](#10-troubleshooting)
11. [Contact & Support](#11-contact--support)

---

## 1. Introduction

### 1.1 About This Manual

This manual is designed for **Ministry, Department, and Agency (MDA) staff** who need to access the GEA Portal's staff features. As a staff user, you have access to all citizen-facing features plus additional capabilities for managing tickets and viewing analytics for your entity.

### 1.2 Staff vs Citizen Access

| Feature | Citizen | Staff |
|---------|---------|-------|
| Submit feedback | ✅ | ✅ |
| File grievances | ✅ | ✅ |
| Check ticket status (public) | ✅ | ✅ |
| Sign in with OAuth | ❌ | ✅ |
| View entity tickets | ❌ | ✅ |
| Update ticket status | ❌ | ✅ |
| Add ticket comments | ❌ | ✅ |
| View entity analytics | ❌ | ✅ |
| View entity users | ❌ | ✅ |
| Add staff users (own entity) | ❌ | ✅ |

### 1.3 Your Role

As a staff user, you are assigned to a specific **entity** (Ministry, Department, or Agency). You can only view and manage tickets that belong to your assigned entity. This ensures data privacy and appropriate access control.

### 1.4 Prerequisites

Before using the staff portal, ensure:

- Your account has been created by a DTA Administrator
- You have a valid **Google** or **Microsoft** account (same email as registered)
- Your account status is **Active**
- You have been assigned to the correct entity

---

## 2. Getting Started

### 2.1 Account Setup

Your account must be created by a DTA Administrator. Contact your supervisor or the DTA if you need:

- A new staff account
- Access to a different entity
- Account reactivation

**Information needed for account creation:**
- Full name
- Email address (Google or Microsoft account)
- Entity assignment (your Ministry/Department/Agency)

### 2.2 Accessing the Portal

1. Open your web browser
2. Navigate to: **https://gea.gov.gd** (or provided portal URL)
3. Click **"Staff Portal"** or navigate to `/staff`

### 2.3 System Requirements

- **Browser:** Chrome, Firefox, Safari, or Edge (latest version)
- **Internet:** Stable connection required
- **Device:** Computer, tablet, or smartphone
- **Account:** Active Google or Microsoft account

---

## 3. Signing In

### 3.1 OAuth Authentication

The GEA Portal uses **OAuth authentication** (no passwords stored). You sign in using your existing Google or Microsoft account.

### 3.2 Step-by-Step Sign In

**Step 1: Navigate to Staff Portal**
- Click **"Staff Portal"** from the main menu, OR
- Go directly to `/staff`

**Step 2: Click Sign In**
- You will be redirected to the sign-in page
- If already signed in, you will go directly to the dashboard

**Step 3: Choose Your Provider**
- Click **"Sign in with Google"** OR
- Click **"Sign in with Microsoft"**

**Step 4: Authenticate with Provider**
- Enter your email and password on the Google/Microsoft page
- Complete any two-factor authentication if enabled
- Grant permission for the portal to access your basic profile

**Step 5: Access Granted**
- You will be redirected to the Staff Dashboard
- Your name and entity will appear in the header

### 3.3 Sign In Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Unauthorized" | Email not registered | Contact DTA to create your account |
| "Account Inactive" | Account disabled | Contact DTA to reactivate |
| "Access Denied" | Wrong email used | Sign in with your registered email |
| "Session Expired" | Inactive for 2+ hours | Sign in again |

### 3.4 Signing Out

1. Click your **profile icon** or name in the header
2. Select **"Sign Out"**
3. You will be returned to the public homepage

> **Security Tip:** Always sign out when using shared computers.

---

## 4. Staff Dashboard

### 4.1 Dashboard Overview

After signing in, you will see the Staff Dashboard with:

- **Welcome Message** - Your name and entity
- **Ticket Summary** - Quick stats for your entity
- **Recent Tickets** - Latest tickets requiring attention
- **Quick Actions** - Common tasks

### 4.2 Dashboard Components

#### Ticket Summary Cards

| Card | Description |
|------|-------------|
| **Open Tickets** | Tickets awaiting action |
| **In Progress** | Tickets being worked on |
| **Pending** | Tickets awaiting external input |
| **Resolved Today** | Tickets closed today |

#### Quick Stats

- Total tickets for your entity
- Average resolution time
- SLA compliance percentage
- Tickets by category breakdown

### 4.3 Navigation Menu

The staff sidebar is organized in the following order:

- **Staff Home** - Overview and quick stats
- **Analytics** - Charts and reports for your entity
- **Master Data** - View entities and services (read-only)
- **Users** - View and add staff users for your entity
- **Services** - EA service requests
- **Tickets** - Full ticket list and management

---

## 5. Managing Tickets

### 5.1 Viewing Tickets

**Accessing the Ticket List:**
1. Click **"Tickets"** in the navigation menu
2. The ticket list shows all tickets for your entity

**Ticket List Columns:**
- **Ticket #** - Unique identifier (YYYYMM-XXXXXX)
- **Subject/Type** - Brief description
- **Status** - Current state
- **Priority** - Urgency level
- **Created** - Submission date
- **SLA Due** - Target resolution date
- **Last Updated** - Most recent activity

### 5.2 Filtering Tickets

Use filters to find specific tickets:

**By Status:**
- All
- Open
- In Progress
- Pending
- Resolved
- Closed

**By Date Range:**
- Select start and end dates

**By Search:**
- Enter ticket number or keywords

### 5.3 Viewing Ticket Details

**Step 1: Click on a Ticket**
- Click the ticket number or row to open details

**Step 2: Review Ticket Information**
- **Ticket Number** - Reference ID
- **Type** - Grievance, EA Request, or Feedback
- **Source** - Web, QR, Auto-generated
- **Status** - Current state
- **Priority** - High, Medium, Low
- **Entity** - Your Ministry/Department/Agency
- **Service** - Related government service
- **Description** - Full complaint/request details
- **Attachments** - Uploaded documents
- **Contact Info** - Submitter's details (if provided)

**Step 3: Review Activity Timeline**
- Chronological list of all actions taken
- Who made each update and when
- Previous status changes
- Comments and notes

### 5.4 Updating Ticket Status

**Step 1: Open the Ticket**
- Navigate to ticket details

**Step 2: Click "Update Status"**
- A form will appear

**Step 3: Select New Status**
- Choose from available options:
  - **In Progress** - Work has begun
  - **Pending** - Awaiting information or action
  - **Resolved** - Issue addressed
  - **Closed** - Ticket complete

**Step 4: Add a Comment**
- Explain what action was taken
- Include any relevant details
- This will be visible in the activity timeline

**Step 5: Save**
- Click **"Update"** or **"Save"**
- The ticket and timeline will refresh

### 5.5 Adding Comments

You can add comments without changing status:

1. Open the ticket
2. Scroll to the **"Add Comment"** section
3. Type your note
4. Click **"Add Comment"**

**Best Practices for Comments:**
- Be clear and professional
- Include dates and names when relevant
- Document phone calls and meetings
- Note any citizen contact attempts

### 5.6 Understanding SLA (Service Level Agreement)

Each ticket has an SLA target based on priority:

| Priority | Target Resolution |
|----------|-------------------|
| High | 24-48 hours |
| Medium | 3-5 business days |
| Low | 7-10 business days |

**SLA Indicators:**
- 🟢 **Green** - On track
- 🟡 **Yellow** - Approaching deadline
- 🔴 **Red** - Overdue

### 5.7 Ticket Status Flow

```
Open → In Progress → Resolved → Closed
         ↓              ↑
      Pending ──────────┘
```

**Status Definitions:**

| Status | When to Use |
|--------|-------------|
| **Open** | New ticket, not yet reviewed |
| **In Progress** | Actively working on resolution |
| **Pending** | Waiting for citizen response or external action |
| **Resolved** | Solution provided, awaiting confirmation |
| **Closed** | Complete, no further action needed |

---

## 6. Service Requests

Staff users can submit service requests to service provider entities (such as DTA) and, if their entity is a service provider, manage received requests.

### 6.1 Accessing Service Requests

1. Click **"Service Requests"** in the navigation menu
2. The page displays based on your entity's role:

**Regular Entity Staff:**
- See **"Requests Submitted"** tab showing requests your entity has submitted

**Service Provider Entity Staff (e.g., DTA):**
- See **"Requests Received"** tab showing requests from other entities
- See **"Requests Submitted"** tab showing requests your entity has submitted

### 6.2 Submitting a New Service Request

1. Click **"New Request"** button
2. Select the **Service Provider** (if multiple providers are available)
3. Choose the **Service Type** from available EA services
4. Fill in request details:
   - Description of the request
   - Priority level
   - Required attachments
5. Click **"Submit"**

### 6.3 Managing Received Requests (Service Providers Only)

If your entity is configured as a service provider, you can:

1. **View received requests** in the "Requests Received" tab
2. **Update status** as work progresses:
   - Draft → Submitted → In Progress → Completed
3. **Add comments** to communicate with requesters
4. **Upload deliverables** when work is complete

### 6.4 Tracking Your Submitted Requests

In the "Requests Submitted" tab:
- View status of all requests you've submitted
- Add comments or additional information
- Upload supplementary attachments
- Track progress through the workflow

### 6.5 Service Request Dashboard Widget

For service provider entities, the Staff Dashboard displays:
- Count of pending received requests
- Quick access to "Requests Received" page
- Recent request activity

---

## 7. User Management

Staff users have limited user management capabilities for their own entity.

### 7.1 What You Can Do

| Capability | Allowed |
|------------|---------|
| View users from your entity | ✅ Yes |
| Add new staff users for your entity | ✅ Yes |
| Edit existing users | ❌ No |
| Change user status (activate/deactivate) | ❌ No |
| Create admin users | ❌ No |

### 7.2 Viewing Entity Users

1. Click **"Users"** in the navigation menu
2. The user list shows all users assigned to your entity
3. You can see each user's name, email, role, and status

### 7.3 Adding a New Staff User

You can add new staff users for your entity only.

**Step 1: Click "Add User"**
- Click the **"Add User"** button at the top of the Users page

**Step 2: Enter User Details**
- **Email** - Must match their Google or Microsoft account email
- **Name** - Full name of the user
- **Role** - Select from available staff roles (admin roles are not available)

**Note:** The new user will automatically be assigned to your entity.

**Step 3: Create User**
- Click **"Create User"**
- The user will appear in your entity's user list

**Important:**
- The email must exactly match the user's Google or Microsoft account email
- Once created, only DTA administrators can edit or deactivate users
- You cannot create admin users - only staff-level users

### 7.4 Limitations

Staff user management has the following restrictions:

- **Entity Scope**: You can only see and add users for your assigned entity
- **No Edit Access**: You cannot modify existing users - contact DTA for changes
- **No Status Changes**: You cannot activate/deactivate users - contact DTA
- **Staff Roles Only**: You cannot assign admin roles to new users

For full user management capabilities, contact a DTA Administrator.

---

## 8. Viewing Analytics

### 8.1 Accessing Analytics

1. Click **"Analytics"** in the navigation menu
2. Dashboard displays your entity's metrics

> **Note:** You can only view analytics for your assigned entity.

### 8.2 Available Metrics

**Ticket Metrics:**
- Total tickets (by period)
- Tickets by status
- Tickets by category
- Average resolution time
- SLA compliance rate

**Feedback Metrics:**
- Average rating (1-5 stars)
- Feedback volume over time
- Rating distribution
- Comments summary

### 8.3 Time Period Selection

Filter analytics by:
- Last 7 days
- Last 30 days
- Last 90 days
- Custom date range

### 8.4 Exporting Data

If export is enabled:
1. Select the desired report
2. Click **"Export"** or **"Download"**
3. Choose format (CSV, Excel)

---

## 9. Using Citizen Features

As a staff user, you have full access to citizen features. Refer to the **Citizen User Manual** for detailed instructions on:

### 9.1 Submitting Feedback
- Rate government services you have used
- Provide comments on service quality
- See: Citizen Manual Section 3

### 9.2 Filing Grievances
- Submit complaints as a citizen
- Attach supporting documents
- See: Citizen Manual Section 4

### 9.3 Checking Ticket Status (Public)
- Look up any ticket using its number
- View public ticket information
- See: Citizen Manual Section 5

### 9.4 Using QR Codes
- Scan QR codes at service locations
- Submit quick feedback
- See: Citizen Manual Section 6

---

## 10. Troubleshooting

### 10.1 Cannot Sign In

**Problem:** "Unauthorized" or "Access Denied" error

**Solutions:**
1. Verify you're using the correct email (registered with DTA)
2. Check if your account is active with DTA
3. Try signing out of Google/Microsoft first, then sign in again
4. Clear browser cache and cookies
5. Contact DTA Administrator if issue persists

### 10.2 Cannot See Tickets

**Problem:** Ticket list is empty or missing tickets

**Solutions:**
1. Check you are signed into the correct account
2. Verify your entity assignment is correct
3. Adjust filters (you may have filtered out tickets)
4. Contact DTA if entity assignment is wrong

### 10.3 Cannot Update Ticket

**Problem:** Update button not working or error on save

**Solutions:**
1. Refresh the page and try again
2. Ensure you selected a status
3. Add a comment (may be required)
4. Check your internet connection
5. Try a different browser

### 10.4 Session Expired

**Problem:** Suddenly logged out or "Session Expired" message

**Cause:** Sessions expire after 2 hours of inactivity

**Solution:** Simply sign in again. Your work should be saved if you clicked "Update" before the session expired.

### 10.5 Page Not Loading

**Solutions:**
1. Check your internet connection
2. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. Clear browser cache
4. Try a different browser
5. Contact technical support if issue persists

---

## 11. Contact & Support

### 11.1 For Account Issues

Contact the **DTA Administrator** for:
- New account creation
- Account reactivation
- Entity assignment changes
- Role modifications

**Email:** alerts.dtahelpdesk@gmail.com

### 11.2 For Technical Support

For system issues or bugs:
- **Email:** support@dta.gov.gd
- **Include:** Screenshots, error messages, steps to reproduce

### 11.3 For Training

Request additional training through your supervisor or contact DTA directly.

### 11.4 Emergency Contacts

For urgent system issues affecting service delivery:
- Contact your DTA liaison
- Escalate through your management chain

---

## Quick Reference

### Common Tasks

| Task | Steps |
|------|-------|
| Sign In | Staff Portal → Choose Google/Microsoft → Authenticate |
| View Tickets | Dashboard → Tickets → Browse/Filter |
| Update Status | Open Ticket → Update Status → Select Status → Add Comment → Save |
| Add Comment | Open Ticket → Add Comment → Type → Submit |
| View Analytics | Dashboard → Analytics → Select Period |
| View Entity Users | Dashboard → Users → Browse |
| Add Staff User | Dashboard → Users → Add User → Enter Details → Create |
| Sign Out | Profile Icon → Sign Out |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+F (Cmd+F on Mac) | Search on page |
| F5 | Refresh page |
| Ctrl+Shift+R | Hard refresh (clear cache) |

### Status Quick Guide

| Status | Meaning | Next Action |
|--------|---------|-------------|
| Open | New ticket | Review and set to In Progress |
| In Progress | Working on it | Continue work or set to Resolved |
| Pending | Waiting | Follow up, then continue |
| Resolved | Done | Verify with citizen, then Close |
| Closed | Complete | No action needed |

---

**Document Version:** 1.0  
**Published:** November 2025  
**© Government of Grenada - Digital Transformation Agency**

---

## Appendix: Citizen Manual Reference

For citizen-facing features, refer to the **GEA Portal Citizen User Manual**, which covers:
- Submitting service feedback
- Filing grievances
- Checking ticket status (public lookup)
- Using QR codes
