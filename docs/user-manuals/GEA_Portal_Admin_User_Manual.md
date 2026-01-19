# GEA Portal - Administrator User Manual

**Government of Grenada Enterprise Architecture Portal**

**Version:** 2.0
**Last Updated:** January 19, 2026
**Audience:** Digital Transformation Agency (DTA) Administrators

---

## Applicable Portal Pages

This manual covers the following pages accessible to DTA administrators (requires admin login):

### Admin-Only Pages
| Page | URL | Purpose |
|------|-----|---------|
| **Admin Home** | `/admin` or `/admin/home` | Main administrator dashboard |
| **Tickets** | `/admin/tickets` | Manage all tickets across entities |
| **Users** | `/admin/users` | Create and manage user accounts |
| **Master Data** | `/admin/managedata` | Manage entities, services, QR codes |
| **Analytics** | `/admin/analytics` | System-wide analytics with entity filtering |
| **Service Requests** | `/admin/service-requests` | EA service request management |
| **Service Request Analytics** | `/admin/service-requests/analytics` | Detailed service request metrics |
| **AI Bots** | `/admin/ai-inventory` | Manage AI chatbot integrations |
| **Settings** | `/admin/settings` | System configuration and service providers |

### Public Pages (Also Available to Admins)
| Page | URL | Purpose |
|------|-----|---------|
| **Home** | `/` | Portal homepage |
| **About** | `/about` | Information about the portal |
| **Services** | `/services` | Browse government services |
| **Submit Feedback** | `/feedback` | Rate government services |
| **Check Ticket Status** | `/helpdesk` | Public ticket lookup |
| **Sign In** | `/auth/signin` | OAuth authentication page |

**Note:** Administrators have full access to all entities and system-wide features. This is the highest level of access in the portal.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Admin Dashboard](#3-admin-dashboard)
4. [Tickets](#4-tickets)
5. [Master Data](#5-master-data)
6. [Users](#6-users)
7. [Analytics & Reporting](#7-analytics--reporting)
8. [AI Bot Inventory](#8-ai-bot-inventory)
9. [EA Service Requests](#9-ea-service-requests)
10. [Settings](#10-settings)
11. [System Administration](#11-system-administration)
12. [Troubleshooting](#12-troubleshooting)
13. [Appendices](#13-appendices)

---

## 1. Introduction

### 1.1 About This Manual

This comprehensive manual is designed for **Digital Transformation Agency (DTA) Administrators** with full system access to the GEA Portal. As an administrator, you have access to all system features including citizen-facing pages, staff functions, and administrative capabilities.

### 1.2 Administrator Role Overview

DTA Administrators have the highest level of access:

| Feature | Citizen | Staff | Admin |
|---------|---------|-------|-------|
| Submit feedback | ✅ | ✅ | ✅ |
| File grievances | ✅ | ✅ | ✅ |
| Check ticket status (public) | ✅ | ✅ | ✅ |
| Sign in with OAuth | ❌ | ✅ | ✅ |
| View entity tickets | ❌ | Own Entity | **All Entities** |
| Update ticket status | ❌ | Own Entity | **All Entities** |
| Manage master data | ❌ | ❌ | ✅ |
| Manage users | ❌ | 🟡 Limited | ✅ |
| View all analytics | ❌ | Own Entity | **All Entities** |
| Manage AI bots | ❌ | ❌ | ✅ |
| EA service requests | ❌ | ❌ | ✅ |

### 1.3 Key Responsibilities

As a DTA Administrator, you are responsible for:

- Managing all grievance and feedback tickets across entities
- Maintaining master data (entities, services, QR codes)
- Creating and managing user accounts
- Monitoring system-wide analytics
- Managing AI bot inventory
- Processing EA service requests
- Ensuring system integrity and security

### 1.4 Prerequisites

- DTA Administrator account with `admin_dta` role
- Valid Google or Microsoft account (registered email)
- Understanding of Government of Grenada MDA structure
- Familiarity with IT security best practices

---

## 2. Getting Started

### 2.1 Accessing the Admin Portal

1. Open your web browser
2. Navigate to: **https://gea.gov.gd/admin** (or provided portal URL)
3. Sign in with your OAuth provider

### 2.2 First-Time Setup Checklist

If you are a new administrator:

- [ ] Confirm your account is active
- [ ] Verify you have `admin_dta` role
- [ ] Review existing entities and services
- [ ] Familiarize yourself with ticket workflow
- [ ] Review current user list
- [ ] Check AI bot inventory

### 2.3 Admin Portal URL Structure

| URL Path | Function |
|----------|----------|
| `/admin` | Admin Home |
| `/admin/tickets` | Tickets |
| `/admin/entities` | Entity Management |
| `/admin/services` | Service Management |
| `/admin/qr-codes` | QR Code Management |
| `/admin/users` | Users |
| `/admin/analytics` | Analytics |
| `/admin/ai-inventory` | AI Bots |
| `/admin/service-requests` | EA Service Requests |

---

## 3. Admin Dashboard

### 3.1 Dashboard Overview

The Admin Dashboard provides a system-wide view:

**Summary Cards:**
- Total Tickets (all entities)
- Open Tickets requiring attention
- Tickets resolved today
- Average resolution time

**Quick Actions:**
- View All Tickets
- Add New Entity
- Add New Service
- Add New User

**Recent Activity:**
- Latest ticket updates
- New user registrations
- Recent feedback submissions

### 3.2 Navigation Menu

The admin sidebar is organized in the following order:

**Main Sections:**
- **Admin Home** - System overview
- **Analytics** - Reports and charts
- **Master Data** - Entities, Services, QR Codes
- **Users** - User management
- **Services** - EA service requests
- **Tickets** - All ticket management
- **Settings** - System configuration
  - AI Bots - Bot management
  - Backups - Database backup and restore

### 3.3 Quick Stats Panel

Real-time metrics displayed:
- Active users online
- Tickets by status
- Feedback ratings trend
- System health status

---

## 4. Tickets

### 4.1 Accessing All Tickets

1. Click **"Tickets"** in the admin menu
2. View tickets from ALL entities

Unlike staff users, administrators can see and manage tickets across the entire government.

### 4.2 Ticket Views: Received vs. Submitted

The portal now supports two distinct ticket views:

| View | Description | What You See |
|------|-------------|--------------|
| **Received** (Default) | Tickets assigned to your entity or entities | Service requests and grievances received by your organization |
| **Submitted** | Tickets you personally created | Service requests you submitted to other entities |

**To switch views:**
1. Navigate to Tickets page
2. Use the **View toggle** at the top
3. Select "Received" or "Submitted"

**Use cases:**
- **Admins**: Can see all received tickets across government
- **Staff**: See tickets received by their entity AND tickets they submitted to others
- **Inter-agency collaboration**: Track service requests sent to and from other entities

### 4.3 Ticket List View

**Columns displayed:**
- Ticket Number
- Category (if assigned)
- Type (Grievance/EA Request/Feedback-Auto)
- Entity (Service provider)
- Assigned Entity (Current handler)
- Service
- Status (with color coding)
- Priority (with color coding)
- Submitter Info (Type and Entity)
- Created Date
- SLA Due Date
- Last Updated
- Overdue Indicator (red flag icon)

**Status color codes:**
- **Blue** - Open/New
- **Yellow** - In Progress
- **Orange** - Pending
- **Green** - Resolved/Closed

**Priority color codes:**
- **Red** - Urgent
- **Orange** - High
- **Yellow** - Medium
- **Gray** - Low

### 4.4 Advanced Filtering

**Filter Options:**

| Filter | Options |
|--------|---------|
| **View** | Received, Submitted |
| **Entity** | All entities in system |
| **Service** | All services |
| **Category** | All ticket categories |
| **Status** | Open, In Progress, Pending, Resolved, Closed |
| **Type** | Grievance, EA Request, Feedback-Auto, Service Request |
| **Priority** | Urgent, High, Medium, Low |
| **Date Range** | Start date, End date |
| **SLA Status** | On Track, At Risk, Overdue |
| **Source** | Web, QR, Mobile, Auto-generated |

**Search capabilities:**
- By ticket number (e.g., "TKT-2026-001234")
- By subject/description keywords
- By submitter name
- By submitter email

**Sorting options:**
- Created date (newest/oldest)
- Updated date (most/least recent)
- Ticket number (ascending/descending)
- Status
- Priority

**Filter persistence:**
- Filters remain active when switching between pages
- Clear all filters with "Reset" button
- Active filters shown with badges at top

### 4.5 Ticket Categories

Ticket categories help organize and route tickets more effectively.

**What are ticket categories?**
- Predefined classifications for common ticket types
- Associated with specific entities and services
- Include average resolution time estimates
- Help with reporting and analytics

**Category information displayed:**
- **Category Name**: e.g., "Payment Issue", "Document Request"
- **Description**: What this category covers
- **Icon**: Visual identifier
- **Avg. Resolution**: Historical average resolution time

**How categories are assigned:**
- Auto-assigned based on service and keywords (AI-assisted)
- Manually selected by staff when creating tickets
- Can be changed later by admins

**Managing categories:**
- Categories are entity and service-specific
- Admins can view category performance metrics
- Historical data shows resolution trends by category

### 4.6 Bulk Actions

Select multiple tickets for:
- Status change (bulk update)
- Priority update
- Reassignment to different entity
- Export to CSV/Excel
- Mark as urgent

**To perform bulk actions:**
1. Check boxes next to desired tickets
2. Click **"Bulk Actions"** dropdown
3. Select action
4. Confirm changes
5. All selected tickets updated simultaneously

**Bulk action limits:**
- Maximum 50 tickets per bulk operation
- Audit log records all bulk changes
- Cannot bulk delete (tickets are permanent records)

### 4.7 Ticket Details (Admin View)

Administrators see additional information:

**Standard Information:**
- All fields visible to staff
- Full activity timeline
- All attachments

**Admin-Only Information:**
- IP hash (privacy-protected for tracking without exposing PII)
- Submission metadata (source, device type, timestamp)
- Full audit trail (all status changes, assignments, updates)
- Assignment history (complete timeline of entity transfers)
- Submitter type and entity (staff_mda, admin_dta, or citizen)

**SLA tracking information:**
- **SLA Response Target**: When first response is due
- **SLA Resolution Target**: When ticket should be resolved
- **First Response At**: Timestamp of first staff response
- **Overdue Status**: Real-time calculation of SLA compliance
- **Time to Resolution**: Calculated from creation to resolution

**Activity timeline:**
- All status changes with timestamps
- All comments and notes (public and internal)
- Attachment uploads and downloads
- Priority changes
- Entity reassignments
- User who performed each action

### 4.8 Ticket Operations

**Update Status:**
1. Open ticket details page
2. Click **"Update Status"** button
3. Select new status from dropdown:
   - **Open** → **In Progress** (when staff starts working)
   - **In Progress** → **Pending** (waiting for info/approval)
   - **Pending** → **In Progress** (resume work)
   - **In Progress** → **Resolved** (issue fixed)
   - **Resolved** → **Closed** (citizen confirmed or auto-close)
4. Add comment explaining the update (required)
5. Click **"Save"** - email notification sent automatically

**Change Priority:**
1. Open ticket details
2. Click **"Change Priority"** button
3. Select from:
   - **Urgent** (red) - Immediate attention required
   - **High** (orange) - Important, near-term action needed
   - **Medium** (yellow) - Normal processing
   - **Low** (gray) - Can be deferred
4. Add justification for priority change
5. Save - priority badge updates immediately

**Reassign Entity:**
1. Open ticket details
2. Click **"Reassign"** button
3. Select new entity from dropdown (all entities available to admins)
4. Add reason for transfer (required - for audit trail)
5. Save - new entity receives email notification
6. Original entity can still view ticket history

**Assign Category:**
1. Open ticket details
2. Click **"Assign Category"** (if not already categorized)
3. Select from available categories for this service/entity
4. Category updates with average resolution time estimate
5. Helps with routing and reporting

**Add Internal Note:**
1. Open ticket details
2. Scroll to comments section
3. Select **"Internal Note"** tab (separate from public comments)
4. Type note (markdown supported)
5. Click **"Add Note"**
6. Internal notes NOT visible to ticket submitter
7. Visible only to staff and admins

**Add Public Comment:**
1. Open ticket details
2. Select **"Public Comment"** tab
3. Type response to submitter
4. Click **"Add Comment"**
5. Submitter receives email notification with comment
6. Comment visible in ticket timeline

**Attach Files:**
1. Open ticket details
2. Scroll to attachments section
3. Click **"Upload Attachment"**
4. Select file (PDF, images, Office docs allowed)
5. File size limits apply (see Settings → Business Rules)
6. Attachments visible to all parties (submitter, staff, admin)

### 4.9 Ticket Types

**Grievance:**
- Citizen complaints about service quality or government processes
- Auto-created from low feedback ratings (≤ threshold set in Settings)
- Requires investigation and resolution
- May result in process improvements
- Default SLA: 5 business days

**EA Service Request:**
- Requests for Enterprise Architecture services from DTA
- Examples: System integration, technical consultation, data governance
- May have technical document attachments
- Requires specialist review and assignment
- Default SLA: 10 business days

**Service Request:**
- General requests for government services
- Staff-to-staff or inter-agency requests
- Tracked with "Submitted" vs "Received" views
- Can be any service registered in service_master table
- SLA varies by service type

**Feedback-Auto:**
- Auto-generated from low-rating feedback (configurable threshold)
- Links back to original feedback entry (feedback_id)
- Created to ensure poor experiences are addressed
- Includes original feedback rating and comments
- Default SLA: 3 business days (faster response for dissatisfaction)

### 4.10 SLA Management

**Understanding SLA targets:**

| SLA Type | Meaning | Calculation |
|----------|---------|-------------|
| **Response Target** | When first staff response is due | Created_at + service.response_hours |
| **Resolution Target** | When ticket should be resolved | Created_at + service.resolution_hours |

**SLA status indicators:**

| Status | Color | Meaning |
|--------|-------|---------|
| **On Track** | Green | More than 25% of SLA time remaining |
| **At Risk** | Yellow | Less than 25% of SLA time remaining |
| **Overdue** | Red | SLA target time has passed |

**SLA exception handling:**
- SLA paused when status = "Pending" (waiting for external input)
- SLA resumes when status changes back to "In Progress"
- Admins can manually adjust SLA targets if needed
- SLA violations automatically flagged in reports

**Configuring SLA defaults:**
1. Navigate to Settings → Business Rules
2. Adjust response and resolution hours
3. Set thresholds for urgency escalation
4. Changes apply to new tickets only

---

## 5. Master Data

### 5.1 Overview

Master data forms the foundation of the portal:
- **Entities** - Ministries, Departments, Agencies
- **Services** - Government services offered
- **QR Codes** - Physical location identifiers

### 5.2 Entity Management

#### Viewing Entities

1. Navigate to **Master Data → Entities**
2. View list of all registered entities

**Entity Information:**
- Entity ID (e.g., MIN-001, DEP-002)
- Full Name
- Short Name/Abbreviation
- Type (Ministry/Department/Agency/Other)
- Parent Entity (for hierarchies)
- Status (Active/Inactive)

#### Adding a New Entity

**Step 1:** Click **"Add Entity"**

**Step 2:** Fill in the form:
- **Entity ID** - Unique identifier (format: TYPE-XXX)
- **Full Name** - Complete official name
- **Short Name** - Abbreviation
- **Type** - Ministry, Department, Agency, Statutory Body
- **Parent Entity** - Select if this is a sub-entity
- **Description** - Brief description
- **Status** - Active by default

**Step 3:** Click **"Save"**

#### Editing an Entity

1. Find entity in list
2. Click **"Edit"** button
3. Modify fields as needed
4. Click **"Save"**

> **Warning:** Changing Entity ID affects related tickets and users.

#### Deactivating an Entity

1. Edit the entity
2. Set Status to **"Inactive"**
3. Save

Inactive entities:
- Do not appear in public dropdown lists
- Retain historical data
- Can be reactivated later

### 5.3 Service Management

#### Viewing Services

1. Navigate to **Master Data → Services**
2. View all registered services

**Service Information:**
- Service ID (e.g., SVC-IMM-001)
- Service Name
- Description
- Entity (which MDA provides this)
- Category
- Status (Active/Inactive)

#### Adding a New Service

**Step 1:** Click **"Add Service"**

**Step 2:** Fill in the form:
- **Service ID** - Unique identifier
- **Service Name** - Official name
- **Description** - What the service provides
- **Entity** - Select from entity list
- **Category** - Service category
- **Status** - Active by default

**Step 3:** Click **"Save"**

#### Linking Services to Entities

Services must be linked to an entity:
1. Edit the service
2. Select the correct Entity from dropdown
3. Save

One service can only belong to one entity.

### 5.4 QR Code Management

#### Viewing QR Codes

1. Navigate to **Master Data → QR Codes**
2. View all registered QR codes

**QR Code Information:**
- QR Code ID (e.g., QR-DTA-001)
- Location Description
- Entity
- Service (optional)
- Status

#### Creating a New QR Code

**Step 1:** Click **"Add QR Code"**

**Step 2:** Fill in details:
- **QR Code ID** - Unique identifier
- **Location** - Where it will be placed (e.g., "Ministry of Finance - Reception")
- **Entity** - Which MDA this is for
- **Service** - Specific service (optional, pre-fills feedback form)
- **Status** - Active

**Step 3:** Click **"Save"**

**Step 4:** Generate QR Code
- Click **"Generate"** to create the QR code image
- Download and print for physical deployment

#### QR Code Deployment

After creating a QR code:
1. Print the generated QR code
2. Place at the designated location
3. Test by scanning with a smartphone
4. Verify feedback form opens with correct prefills

### 5.5 Master Data Best Practices

**Naming Conventions:**
- Entity IDs: `MIN-001`, `DEP-001`, `AGY-001`
- Service IDs: `SVC-[ENTITY]-[NUMBER]`
- QR Codes: `QR-[ENTITY]-[LOCATION]`

**Data Quality:**
- Regularly review and update entity information
- Archive inactive services rather than deleting
- Document QR code physical locations

---

## 6. Users

### 6.1 Overview

User management controls who can access the staff and admin portals. All users authenticate via OAuth (Google or Microsoft).

### 6.2 User Roles

| Role Code | Role Type | Access Level |
|-----------|-----------|--------------|
| `admin_dta` | Admin | Full system access |
| `staff_mda` | Staff | Entity-specific access |
| `public_user` | Public | No portal access (future) |

### 6.3 Viewing Users

1. Navigate to **Users**
2. View list of all registered users

**User Information:**
- Name
- Email
- Role
- Entity (for staff)
- Status (Active/Inactive)
- Last Login
- Created Date

### 6.4 Adding a New User

**Step 1:** Click **"Add User"**

**Step 2:** Enter user details:
- **Email** - Must match their Google/Microsoft account
- **Name** - Full name
- **Role** - Select Admin or Staff
- **Entity** - Required for Staff role (select their MDA)

**Step 3:** Click **"Create User"**

**Important Notes:**
- User cannot sign in until account is created here
- Email must exactly match their OAuth provider email
- User will authenticate via Google or Microsoft on first login

### 6.5 Editing a User

1. Find user in list
2. Click **"Edit"**
3. Modify fields:
   - Name
   - Role
   - Entity assignment
4. Click **"Save"**

**Role Change Implications:**
- Staff → Admin: Gains access to all entities
- Admin → Staff: Loses access to other entities

### 6.6 Entity Assignment

For staff users, entity assignment determines what they can see:

1. Edit the user
2. Select correct **Entity** from dropdown
3. Save

Staff users can only:
- View tickets for their assigned entity
- Update tickets for their assigned entity
- See analytics for their assigned entity

### 6.7 Activating/Deactivating Users

**To Deactivate:**
1. Edit user
2. Set Status to **"Inactive"**
3. Save

Deactivated users:
- Cannot sign in
- Appear in user list as inactive
- Retain historical audit records
- Can be reactivated later

**To Reactivate:**
1. Edit user
2. Set Status to **"Active"**
3. Save

### 6.8 Removing Users

**Soft Delete (Recommended):**
- Deactivate rather than delete
- Preserves audit trail
- Allows reactivation if needed

**Hard Delete:**
- Only if user was created in error
- Removes all user records
- Cannot be undone

### 6.9 User Audit Trail

Each user action is logged:
- Login/logout events
- Ticket updates
- Status changes
- Administrative actions

View audit logs in the user's profile or system audit section.

---

## 7. Analytics & Reporting

### 7.1 Accessing Analytics

1. Navigate to **Analytics**
2. System-wide dashboard loads by default

### 7.2 Dashboard Metrics

**Ticket Analytics:**
- Total tickets by period
- Tickets by status
- Tickets by entity
- Resolution time trends
- SLA compliance rates

**Feedback Analytics:**
- Overall average rating (1-5 scale)
- Ratings by entity (all MDAs)
- Ratings by service (all services)
- Rating trends over time (daily, weekly, monthly)
- Feedback volume by channel (EA Portal vs QR Code)
- Grievance tracking (low-rating flags)
- Top/bottom performing services
- Rating distribution breakdown
- Recent grievances with comments

**User Analytics:**
- Active users
- Login frequency
- Actions per user

### 7.3 Detailed Feedback Analytics

The Feedback Analytics dashboard provides comprehensive insights into service quality and citizen satisfaction.

**Overall Statistics:**

| Metric | Description |
|--------|-------------|
| **Total Submissions** | Count of all feedback received |
| **Average Satisfaction** | Overall rating (Q5: Overall Satisfaction) |
| **Average Ease** | Q1: How easy was it to access this service? |
| **Average Clarity** | Q2: How clear were the instructions/requirements? |
| **Average Timeliness** | Q3: How satisfied are you with the timeliness? |
| **Average Trust** | Q4: How much do you trust this service? |
| **Grievance Count** | Feedback submissions that triggered ticket creation |
| **First/Last Submission** | Date range of feedback data |

**All feedback questions use a 5-point scale:**
- 5 = Excellent/Very Satisfied
- 4 = Good/Satisfied
- 3 = Fair/Neutral
- 2 = Poor/Dissatisfied
- 1 = Very Poor/Very Dissatisfied

**Channel Breakdown:**

Feedback can be submitted via two channels:
- **EA Portal** (`ea_portal`): Web form submissions from `/feedback` page
- **QR Code** (`qr_code`): Submissions via QR codes placed at physical service locations

Each channel shows:
- Submission count
- Average satisfaction rating
- Percentage of total feedback

**Recipient Group Breakdown:**

Tracks which citizen groups are providing feedback:
- General Public
- Business Owners
- Government Employees
- Students
- Seniors
- Tourists
- Other

Helps identify which demographics are engaging with services.

**Rating Distribution:**

Visual breakdown showing percentage of feedback at each rating level:
- How many 5-star ratings
- How many 4-star ratings
- How many 3-star ratings
- How many 2-star ratings (grievance threshold)
- How many 1-star ratings (grievance threshold)

**Top/Bottom Services:**

Ranked lists showing:
- **Top 10 Services**: Highest average ratings (best performing)
- **Bottom 10 Services**: Lowest average ratings (need improvement)
- Submission count for each service
- Entity providing the service

**Trend Analysis:**

Daily, weekly, or monthly trends showing:
- Feedback submission volume over time
- Average satisfaction rating trends
- Identification of improving vs. declining services

**Recent Grievances:**

Real-time list of low-rated feedback that triggered ticket creation:
- Service name and entity
- Satisfaction rating (typically ≤2.5)
- Citizen comment text
- Submission timestamp
- Link to auto-generated ticket

**Filtering Feedback Analytics:**

All feedback analytics can be filtered by:
- **Service**: Single or multiple services
- **Entity**: Single or multiple entities (admins see all, staff see own entity)
- **Date Range**: Custom start and end dates
- **Channel**: EA Portal, QR Code, or both
- **Rating Threshold**: Show only feedback below certain rating

### 7.4 Filtering Analytics

**By Entity:**
- All entities (system-wide)
- Specific entity selection

**By Time Period:**
- Today
- Last 7 days
- Last 30 days
- Last 90 days
- Custom range

**By Ticket Type:**
- All types
- Grievances only
- EA Requests only
- Auto-generated only

### 7.4 Charts and Visualizations

**Available Charts:**
- Bar chart: Tickets by entity
- Line chart: Trends over time
- Pie chart: Status distribution
- Gauge: SLA compliance

### 7.5 Understanding Citizen Feedback Submission

To effectively interpret feedback analytics, admins should understand what citizens experience when submitting feedback.

**Feedback Submission Channels:**

1. **EA Portal Web Form** (`/feedback`):
   - Citizens access directly from portal homepage
   - No account/login required
   - Anonymous submissions allowed
   - 5-10 minute completion time

2. **QR Code Scanning**:
   - Citizens scan QR code at service location
   - Form pre-filled with entity and service
   - Faster submission (2-3 minutes)
   - Location tracking (which QR code scanned)

**Feedback Form Questions:**

The feedback form asks 5 standardized questions plus optional comments:

| # | Question | Purpose |
|---|----------|---------|
| **Q1** | How easy was it to access this service? | Accessibility evaluation |
| **Q2** | How clear were the instructions and requirements? | Communication quality |
| **Q3** | How satisfied are you with the timeliness? | Speed and efficiency |
| **Q4** | How much do you trust this service to handle your information securely? | Trust and security perception |
| **Q5** | Overall, how would you rate your experience? | Overall satisfaction (primary metric) |

**Additional Information Collected:**

| Field | Required | Purpose |
|-------|----------|---------|
| **Service** | Yes | Which government service being rated |
| **Recipient Group** | Optional | Who is the feedback from? (General Public, Business Owner, etc.) |
| **Comments** | Optional | Free-text feedback and suggestions |
| **Contact Info** | Optional | If citizen wants follow-up |

**Automatic Ticket Creation:**

Low ratings automatically create tickets:
- **Grievance Threshold**: Configurable in Settings → Business Rules
- **Default**: Overall satisfaction ≤ 2.5 triggers ticket
- **Ticket Type**: "Feedback-Auto"
- **Priority**: Based on rating (≤1.5 = Urgent, ≤2.5 = High)
- **Assignment**: Auto-assigned to service's entity
- **Notification**: Entity staff notified via email

**Why This Matters for Admins:**

- **Low response rates** may indicate citizens don't know feedback option exists
- **QR code submissions** show physical service points are active
- **Recipient group data** helps target service improvements
- **Comments with low ratings** provide actionable insights
- **Grievance flags** require prompt admin attention

**Encouraging Feedback Submissions:**

To increase feedback volume:
1. Deploy QR codes at high-traffic service locations
2. Train staff to mention feedback option after service delivery
3. Include feedback link in service confirmation emails
4. Promote feedback page on social media and government websites
5. Respond to feedback promptly (builds citizen trust)

### 7.6 Exporting Reports

**Export Options:**
1. Click **"Export"** button
2. Select format:
   - CSV (for spreadsheet analysis)
   - Excel (formatted)
   - PDF (for printing)
3. Download file

### 7.7 Scheduled Reports (Future)

Planned feature for automated report delivery:
- Daily summary emails
- Weekly performance reports
- Monthly executive dashboards

---

## 8. AI Bot Inventory

### 8.1 Overview

The AI Bot Inventory manages AI assistants integrated with government services. Access at `/admin/ai-inventory`.

### 8.2 Viewing Bots

**Bot List Shows:**
- Bot Name
- Status (Active/Planned)
- Category
- Target Audience
- Deployment Platform
- URL

**Filtering:**
- All bots
- Active only
- Planned only

### 8.3 Bot Actions

**View Bot:**
- Click "View" to see bot in iframe preview
- Only available for active bots

**Open Bot:**
- Click "Open" to access bot in new tab
- Test bot functionality

### 8.4 Managing Bots

Bots are managed via configuration file (`bots-config.json`). To add, edit, or remove bots:

**Adding a Bot:**
1. Edit `frontend/public/config/bots-config.json`
2. Add new bot object with required fields
3. Rebuild and redeploy frontend

**Required Bot Fields:**
```json
{
  "id": "unique-bot-id",
  "name": "Bot Display Name",
  "url": "https://bot-url.example.com/",
  "description": "What the bot does",
  "status": "active",
  "deployment": "Vercel",
  "audience": "Public",
  "modality": "text",
  "category": "General Support"
}
```

**Bot Status Values:**
- `active` - Deployed and operational
- `planned` - In development

### 8.5 Current Bot Categories

- General Support
- Process Management
- Feedback Collection
- Compliance
- Policy Guidance
- Assessment

---

## 9. EA Service Requests

### 9.1 Overview

EA Service Requests are formal requests for Enterprise Architecture services from MDAs. Multiple entities can be configured as **service providers** to receive service requests.

### 9.2 Multi-Entity Service Provider Support

The portal supports multiple service provider entities:

- **Service Providers**: Entities enabled to receive service requests from other entities
- **Default Provider**: DTA (AGY-005) is the default service provider
- **Configuration**: Manage service providers via Settings → Service Providers tab

**Staff from service provider entities** will see:
- **Requests Received** tab: Service requests received from other entities
- **Requests Submitted** tab: Service requests submitted by their own entity

### 9.3 Types of EA Services

1. **Architecture Review** - Review of existing systems
2. **Solution Design** - New solution architecture
3. **Technology Assessment** - Evaluate technology options
4. **Integration Planning** - System integration support
5. **Standards Compliance** - Check against EA standards
6. **Training & Support** - EA knowledge transfer
7. **Documentation** - Architecture documentation

### 9.4 Viewing EA Requests

1. Navigate to **Service Requests**
2. Use tabs to switch between views:
   - **Requests Received**: Requests your entity needs to fulfill (service providers only)
   - **Requests Submitted**: Requests your entity has submitted

**Request Information:**
- Request Number
- Requesting Entity / Service Provider Entity
- Service Type
- Description
- Priority
- Status
- Attachments
- Due Date

### 9.5 Processing EA Requests

**Step 1: Review Request**
- Read full description
- Review attachments
- Assess complexity

**Step 2: Acknowledge**
- Set status to "In Progress"
- Add acknowledgment note

**Step 3: Work on Request**
- Perform required EA activities
- Document findings
- Prepare deliverables

**Step 4: Complete**
- Upload any deliverables
- Set status to "Resolved"
- Add completion notes

### 9.6 EA Request Attachments

Requesters may attach:
- Current architecture diagrams
- Requirements documents
- Policy documents
- Screenshots
- Other supporting materials

**Supported Formats:**
- PDF, DOC, DOCX
- PNG, JPG
- XLS, XLSX
- Maximum 5MB per file

---

## 10. Settings

The Settings page (`/admin/settings`) provides comprehensive system configuration without requiring code changes or server restarts. All settings are stored in the database with encryption for sensitive values and full audit logging.

### 10.1 Accessing Settings

1. Navigate to **Admin Portal** → **Settings**
2. Settings are organized into 9 category tabs
3. Each category has subcategories for organized management

**Key Features:**
- Real-time validation before saving
- Sensitive values are encrypted (AES-256-GCM)
- Settings marked "Requires restart" need application restart
- Audit trail tracks all changes (who, when, why, from which IP)
- Test functionality for Twilio SMS and SendGrid email

### 10.2 Settings Categories Overview

The 9 settings categories provide control over every aspect of the portal:

| Category | Subcategories | Key Features |
|----------|---------------|--------------|
| **System** | General, Branding, Contact | Site name, logo/favicon upload, contact emails, session duration |
| **Authentication** | Google OAuth, Microsoft OAuth, Citizen Login | OAuth credentials, Twilio SMS OTP configuration |
| **Integrations** | Email (SendGrid), Chatbot | Email notifications, AI chatbot integration |
| **Business Rules** | Service Requests, Rate Limits, Thresholds, File Upload | Feedback/grievance rate limits, priority thresholds, file upload settings |
| **Performance** | Caching (Redis) | Analytics caching toggle and TTL |
| **Content** | Footer Links, Leadership Contacts | Government website URLs, leadership team with photo upload |
| **User Management** | Admin Entities | Configure which entities can have admin users |
| **Service Providers** | Provider Entities | Configure which entities receive service requests |
| **Database** | Backups, Restore, Schedule | Manual/automated backups, restore with safety backups |

### 10.3 System Settings (Tab 1)

Configure basic portal settings under the **System** tab:

**General Subcategory:**
- **Site Name**: Full portal name (e.g., "Government of Grenada Enterprise Architecture Portal")
- **Site Short Name**: Abbreviated name for compact displays
- **Copyright Year**: Year displayed in footer
- **Session Duration**: Admin session timeout in hours (default: 2 hours, requires restart)

**Branding Subcategory:**
- **Site Logo**: Upload logo image or provide URL - displays in header
- **Site Favicon**: Upload favicon (ICO/PNG) - displays in browser tab
- **Logo Alt Text**: Accessibility text for logo

**Contact Subcategory:**
- **Service Admin Email**: Email for service request notifications
- **About Contact Email**: Contact email displayed on About page

**How to Update:**
1. Navigate to Settings → System
2. Select subcategory (General/Branding/Contact)
3. Modify fields
4. Click "Save Changes"
5. Logo/favicon changes apply immediately (no restart required)

### 10.4 Authentication Settings (Tab 2)

The **Authentication** tab manages sign-in methods for both admin/staff and citizens.

#### Google OAuth Configuration

Enable staff and admins to sign in with Google accounts:

| Setting | Description |
|---------|-------------|
| **Enable Google OAuth** | Toggle Google sign-in ON/OFF |
| **Google Client ID** | OAuth 2.0 Client ID from Google Cloud Console |
| **Google Client Secret** | OAuth 2.0 Client Secret (encrypted automatically) |

**To configure:**
1. Create OAuth credentials in Google Cloud Console
2. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
3. Copy Client ID and Client Secret to settings
4. Enable toggle and save

#### Microsoft OAuth Configuration

Enable staff and admins to sign in with Microsoft accounts:

| Setting | Description |
|---------|-------------|
| **Enable Microsoft OAuth** | Toggle Microsoft sign-in ON/OFF |
| **Microsoft Client ID** | Application (client) ID from Azure Portal |
| **Microsoft Client Secret** | Client secret (encrypted automatically) |
| **Microsoft Tenant ID** | Directory (tenant) ID |

#### Citizen Login (Twilio SMS OTP) - NEW FEATURE

The portal now supports phone-based citizen authentication using SMS one-time passwords (OTP) via Twilio Verify.

**What is Citizen Login?**
- Allows general public to create accounts using phone numbers
- Passwordless authentication via SMS OTP codes
- Optional password for returning users (faster login)
- Separate from admin/staff OAuth authentication
- Phone numbers validated by region (Grenada + Caribbean + configurable countries)

**Twilio Credentials (Required):**

| Setting | Description |
|---------|-------------|
| **Enable Citizen Login** | Master toggle - turns citizen portal ON/OFF |
| **Twilio Account SID** | Account SID from Twilio Console (starts with AC...) - ENCRYPTED |
| **Twilio Auth Token** | Auth Token from Twilio Console - ENCRYPTED |
| **Twilio Verify Service SID** | Verify Service SID (starts with VA...) - ENCRYPTED |

**Phone Region Settings:**

Configure which countries' phone numbers can register:

- **Allowed Countries**: Multi-select list of 20+ countries
  - **Primary**: Grenada (+1-473)
  - **Caribbean Islands (18)**: Antigua, Barbados, Dominica, Jamaica, St. Lucia, Trinidad, etc.
  - **Other Regions**: USA, UK, Canada

- **Custom Country Codes**: Add country codes not in preset list (e.g., `+91,+49,+33`)

**Session & Security Settings:**

| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| **OTP Expiry (minutes)** | 5 | 1-15 | How long SMS codes remain valid |
| **Max OTP Attempts** | 3 | 1-10 | Failed verification attempts before lockout |
| **Session Duration (hours)** | 24 | 1-168 | How long citizen sessions last |
| **Device Trust (days)** | 30 | 7-90 | "Remember this device" cookie validity |

**Setting Up Citizen Login:**

1. **Create Twilio Account:**
   - Sign up at [twilio.com/verify](https://www.twilio.com/verify)
   - Create a new Verify Service in Twilio Console
   - Note your Account SID, Auth Token, and Verify Service SID

2. **Configure in Portal:**
   - Navigate to Settings → Authentication → Citizen Login
   - Toggle "Enable Citizen Login" to ON
   - Enter Twilio credentials (will be encrypted automatically)
   - Select allowed countries or add custom country codes
   - Configure OTP and session settings
   - Click "Save Changes"

3. **Test Configuration:**
   - Click "Test SMS" button
   - Enter a phone number (your own)
   - Verify you receive OTP code via SMS
   - If successful, configuration is correct

**Cost Estimate:**
- Twilio Verify: ~$0.05 per SMS verification
- Example: 1,000 citizen logins/month = ~$50/month

**Use Cases:**
- Citizens checking service request status
- Citizens providing feedback without creating accounts
- Government service portals requiring citizen authentication
- Future: Citizen-facing e-services

### 10.5 Integrations Settings (Tab 3)

Configure third-party service integrations.

#### SendGrid Email

Configure email notifications for the portal:

| Setting | Description |
|---------|-------------|
| **SendGrid API Key** | API key from SendGrid (encrypted automatically) |
| **Sender Email** | Email address for outgoing notifications |
| **Sender Name** | Display name (e.g., "GEA Portal Notifications") |

**Test Email Feature:**
- Click "Test Email" button
- Sends test email to your admin email address
- Validates API key and sender configuration

#### Chatbot Integration

Configure AI chatbot widgets:

| Setting | Description |
|---------|-------------|
| **Chatbot URL** | Full URL to embedded chatbot iframe |
| **Enable Chatbot** | Toggle chatbot display ON/OFF |

**Link:** Manage individual bots at `/admin/ai-inventory`

### 10.6 Business Rules Settings (Tab 4)

#### Rate Limits

Protect against abuse while allowing legitimate use:

| Limit | Default | Range | Purpose |
|-------|---------|-------|---------|
| **Feedback Rate Limit** | 5 | 1-100 | Max feedback submissions per hour per IP |
| **Grievance Rate Limit** | 2 | 1-50 | Max grievance submissions per hour per IP |
| **EA Service Rate Limit** | 10 | 1-100 | Max EA requests per hour per IP |
| **Rate Limit Window** | 3600 sec | 60-86400 | Time window for rate limiting |

**When to adjust:**
- Increase during public campaigns or events
- Decrease if experiencing spam/abuse
- Monitor analytics for normal usage patterns

#### Priority Thresholds

Configure when low ratings trigger tickets:

| Threshold | Default | Range | Purpose |
|-----------|---------|-------|---------|
| **Low Rating Threshold** | 2.5 | 1-5 | Ratings ≤ this create tickets |
| **DTA Alert Threshold** | 2 | 1-5 | Ratings ≤ this alert admin |
| **Urgent Priority** | 1.5 | 1-5 | Ratings ≤ this = URGENT |
| **High Priority** | 2.5 | 1-5 | Ratings ≤ this = HIGH |
| **Medium Priority** | 3.5 | 1-5 | Ratings ≤ this = MEDIUM |

#### File Upload Limits

Configure file attachment constraints:

| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| **Max File Size** | 2MB | 100KB-10MB | Maximum single file size |
| **Max Total Upload** | 5MB | 1MB-50MB | Maximum total per submission |
| **Allowed File Types** | pdf,jpg,jpeg,png,doc,docx,xlsx,xls | - | Comma-separated extensions |

### 10.7 Performance Settings (Tab 5)

Control Redis caching for analytics dashboard:

| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| **Enable Analytics Caching** | ON | - | Toggle Redis caching |
| **Analytics Cache TTL** | 300 sec | 60-600 | How long cache remains valid |

**Benefits of Caching:**
- Dashboard loads in 1-5ms instead of 200-500ms
- Reduces database load during peak usage
- Automatic cache invalidation on data changes

**When to disable:**
- Troubleshooting stale data issues
- Prefer using "Refresh" button on dashboard instead

### 10.8 Content Settings (Tab 6)

#### Footer Links

Configure government website links in portal footer:

- **Government Website URL**: Main government website
- **eServices URL**: Link to eServices portal
- **Constitution URL**: Link to constitution documents

#### Leadership Contacts - NEW FEATURE

Dynamically manage leadership contacts displayed on the About page:

**Features:**
- Add/Edit/Delete contacts
- Drag-and-drop reordering
- Photo upload for each contact (JPG/PNG)
- Active/inactive toggle
- Sort order management

**Contact Fields:**
- **Name** (required): Full name
- **Title** (required): Official title/position
- **Email** (optional): Contact email
- **Photo** (optional): Profile photo with upload
- **Active**: Show/hide on About page

**To add a leadership contact:**
1. Navigate to Settings → Content → Leadership Contacts
2. Click "Add Contact"
3. Fill in name and title (required)
4. Optionally add email and upload photo
5. Click "Save Contact"
6. Drag to reorder if needed
7. Toggle "Active" to control visibility

### 10.9 User Management Settings (Tab 7)

Configure which entities are allowed to have admin users:

**Setting:** `ADMIN_ALLOWED_ENTITIES`

**Purpose:**
- Restricts which entities can be assigned to users with `admin_dta` role
- Prevents unauthorized entities from having admin-level access
- Maintains centralized admin control

**Default:** `AGY-005` (Digital Transformation Agency only)

**To enable additional admin entities:**
1. Navigate to Settings → User Management
2. Check entities that should be allowed to have admins
3. Save changes
4. Only checked entities will appear in "Entity" dropdown when creating admin users

### 10.10 Service Providers Settings (Tab 8)

The **Service Providers** tab controls which entities can receive service requests from other entities.

**To enable an entity as a service provider:**
1. Navigate to Settings → Service Providers tab
2. Find the entity in the list
3. Toggle the switch to enable/disable service provider status

**Effects of enabling service provider:**
- Entity staff will see "Requests Received" tab in Service Requests
- Entity appears in the provider dropdown when submitting new service requests
- Entity dashboard shows received request statistics

**Default Configuration:**
- DTA (AGY-005) is enabled as the default service provider

### 10.11 Database Settings (Tab 9)

The **Database** tab provides comprehensive backup and restore functionality directly from the admin interface.

#### Backup Management

The backup interface displays all available database backups with:

| Column | Description |
|--------|-------------|
| **Filename** | Backup file name (format: `gea_backup_YYYYMMDD_HHMMSS.sql`) |
| **Created** | Date and time the backup was created |
| **Size** | File size of the backup (human-readable) |
| **Type** | Manual (user-created) or Scheduled (automatic) |
| **Actions** | Download, Restore, Delete buttons |

**What's included in backups:**
- All database tables and data (40+ tables)
- Indexes and constraints
- Sequences (for auto-incrementing IDs)
- Functions and triggers
- Table schemas and relationships

#### Creating Manual Backups

**To create a backup:**
1. Navigate to Settings → Database tab
2. Click **"Create Backup"** button in the top right
3. Wait for backup to complete (progress indicator shown)
4. Backup appears in the list when complete with current timestamp

**Backup naming convention:**
- Format: `gea_backup_YYYYMMDD_HHMMSS.sql`
- Example: `gea_backup_20260119_143022.sql`
- Automatically sorted by date (newest first)

**When to create manual backups:**
- Before major system changes or upgrades
- Before bulk data imports or deletions
- Before applying database migrations
- Weekly for critical data protection
- Before restoring from another backup (safety backup)

#### Downloading Backups

**To download a backup:**
1. Find the backup in the list
2. Click the **Download** icon (↓)
3. Backup file downloads to your computer as `.sql` file
4. Store in secure location for disaster recovery

**Best practices:**
- Keep at least 3 offsite copies (3-2-1 backup rule)
- Download weekly backups to external storage
- Verify downloaded backups can be opened (check file size)
- Label downloaded files with date and purpose
- Downloads keep the server copy intact

#### Restoring from Backup

> **⚠️ CRITICAL WARNING:** Restore operations **completely overwrite all current data**. This action **cannot be undone**. All tickets, users, feedback, and settings will be replaced with the backup's data.

**To restore from a backup:**
1. Find the backup you want to restore from
2. Click the **Restore** icon (↻)
3. A confirmation dialog appears with warning
4. Type **"RESTORE DATABASE"** exactly in the confirmation field (case-sensitive)
5. Click **Confirm Restore**
6. Wait for restore to complete (may take 30-60 seconds)
7. You will be automatically logged out
8. Log back in to verify restoration

**Safety Features:**
- **Automatic safety backup** created before every restore
  - Named: `safety_backup_YYYYMMDD_HHMMSS.sql`
  - If restore fails, immediately restore from safety backup
- All restore operations logged to audit trail with:
  - Admin who performed restore
  - Backup file restored from
  - Timestamp and result (success/failure)
- Database connection pool reset after restore
- All active sessions invalidated (users must re-login)

**When restore fails:**
1. Check error message in the dialog
2. Verify backup file is not corrupted (check size)
3. Look for safety backup created just before failed restore
4. Restore from safety backup to return to pre-restore state
5. Contact technical support if issue persists

#### Scheduled Backups

Configure automatic backups to run on a schedule:

**Schedule Configuration:**

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| **Enable Scheduled Backups** | ON/OFF | OFF | Toggle automatic backups |
| **Schedule Type** | Daily, Weekly, Monthly | Daily | How often to run |
| **Backup Time** | HH:MM (24-hour) | 02:00 | What time to run backup |
| **Day of Week** | Mon-Sun | Sunday | (Weekly only) Which day to run |
| **Day of Month** | 1-28 | 1 | (Monthly only) Which day to run |

**Retention Policy Settings:**

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| **Auto-delete old backups** | Enabled | - | Automatically remove old backups |
| **Retention Days** | 30 | 7-365 | Delete backups older than X days |
| **Minimum Keep** | 10 | 5-100 | Always keep at least X backups (even if older) |

**How retention policy works:**
1. After each scheduled backup, retention check runs
2. Backups older than retention days are marked for deletion
3. System ensures minimum keep count is maintained
4. Oldest backups deleted first (if over minimum)
5. Manual backups and scheduled backups both count toward limits

**Example retention scenarios:**

*Scenario 1: Daily backups, 30-day retention, min keep 10*
- After 30 days: 30 backups exist
- After 60 days: Still 30 backups (old ones deleted daily)
- Min keep protects against accidental deletion

*Scenario 2: Weekly backups, 90-day retention, min keep 10*
- After 90 days: ~13 backups exist (13 weeks)
- After 180 days: ~13 backups (old ones deleted)
- Min keep ensures at least 10 always remain

**Recommended settings by use case:**

| Use Case | Schedule | Retention | Min Keep |
|----------|----------|-----------|----------|
| **High-Activity Production** | Daily, 02:00 | 30 days | 20 |
| **Standard Production** | Daily, 02:00 | 14 days | 10 |
| **Low-Activity/Dev** | Weekly, Sunday | 60 days | 8 |
| **Testing Environment** | Weekly, Sunday | 30 days | 5 |

**Monitoring scheduled backups:**
- Check backup list regularly to verify new backups appearing
- Monitor backup sizes (sudden size changes may indicate issues)
- Review backup type column (should show "Scheduled")
- Check system logs if scheduled backups fail

#### Backup Directory Information

The backup directory section displays (read-only):

| Information | Typical Value |
|-------------|---------------|
| **Directory Path** | `/tmp/gea_backups/` |
| **Total Backups** | Count of all backup files |
| **Total Size** | Combined size of all backups |

**Note:** Backup directory path cannot be changed from the UI. It requires server configuration changes and Docker volume mapping updates.

**Disk space monitoring:**
- Each backup is typically 5-50MB depending on data volume
- With 30-day daily retention: ~1.5GB disk space needed
- Monitor "Total Size" to ensure adequate disk space
- Consider retention policy if approaching storage limits

### 10.12 Saving Settings Changes

**How to save changes:**
1. Make changes to any settings on any tab
2. **"Unsaved changes"** indicator appears in top right
3. Review your changes
4. Click **"Save Changes"** button
5. Success message confirms save
6. Changes take effect immediately (most settings)

**Settings requiring restart:**
- Some settings show a **"Requires Restart"** badge
- These include: Database connection settings, Redis configuration
- Apply these changes during maintenance windows
- Restart required services after saving

**Validation:**
- Invalid values are highlighted before save
- Save button disabled until all errors corrected
- Helpful error messages guide corrections

**Audit trail:**
- All settings changes logged to `settings_audit_log` table
- Includes: Admin who made change, field changed, old/new values, timestamp
- View audit log via database queries or future audit UI

---

## 11. System Administration

### 11.1 System Health Monitoring

Check system health regularly:

**Container Status:**
```bash
docker-compose ps
```

**Service Logs:**
```bash
docker-compose logs -f frontend
docker-compose logs -f feedback_db
```

**Database Status:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT 1"
```

### 11.2 Database Maintenance

**Backup Database:**
```bash
docker exec feedback_db pg_dump -U feedback_user feedback > backup_$(date +%Y%m%d).sql
```

**Check Database Size:**
```bash
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT pg_size_pretty(pg_database_size('feedback'));"
```

### 11.3 User Session Management

Sessions expire after **2 hours** of inactivity. No manual session management is typically required.

### 11.4 Email Notification Configuration

Email notifications use SendGrid. Current configuration:
- **Admin Email:** alerts.dtahelpdesk@gmail.com
- Notifications sent for: New tickets, Status changes

### 11.5 Rate Limiting

Current rate limits:
- Feedback: 5/hour
- Grievances: 3/hour
- Tickets: 5/hour

These protect against abuse while allowing legitimate use.

### 11.6 Security Best Practices

**For Administrators:**
- Use strong, unique passwords for OAuth accounts
- Enable 2FA on Google/Microsoft accounts
- Sign out when leaving workstation
- Review user access regularly
- Monitor for unusual activity

**For the System:**
- Keep containers updated
- Review logs for errors
- Backup database regularly
- Test restore procedures
- Monitor SSL certificate expiry

---

## 12. Troubleshooting

### 12.1 User Cannot Sign In

**Check:**
1. Email exists in users table
2. Account status is Active
3. Role is correctly assigned
4. User is using correct OAuth provider

**Resolution:**
- Create/update user account
- Reactivate if inactive
- Verify email matches exactly

### 12.2 Missing Tickets

**Check:**
1. Filter settings (may be filtering out tickets)
2. Entity assignment (for staff users)
3. Date range selection

**Resolution:**
- Clear filters
- Verify entity assignment
- Expand date range

### 12.3 Email Notifications Not Sending

**Check:**
1. SendGrid API key is valid
2. FROM email is verified in SendGrid
3. Container has network access

**Resolution:**
- Verify SendGrid configuration
- Check container logs for errors
- Test API key manually

### 12.4 Database Connection Errors

**Check:**
1. Database container is running
2. Environment variables are correct
3. Network connectivity between containers

**Resolution:**
```bash
docker-compose restart feedback_db
docker-compose restart frontend
```

### 12.5 Performance Issues

**Check:**
1. Container resource usage: `docker stats`
2. Database query performance
3. Network latency

**Resolution:**
- Increase container resources
- Optimize slow queries
- Check server capacity

### 12.6 SSL Certificate Issues

**Check:**
1. Certificate expiry date
2. Traefik logs for errors
3. DNS configuration

**Resolution:**
- Force certificate renewal
- Verify DNS points to correct server
- Check Traefik configuration

---

## 13. Appendices

### Appendix A: Role Permissions Matrix

| Permission | Admin | Staff | Public |
|------------|-------|-------|--------|
| View public pages | ✅ | ✅ | ✅ |
| Submit feedback | ✅ | ✅ | ✅ |
| File grievance | ✅ | ✅ | ✅ |
| Lookup ticket status | ✅ | ✅ | ✅ |
| Sign in to portal | ✅ | ✅ | ❌ |
| View own entity tickets | ✅ | ✅ | ❌ |
| View all entity tickets | ✅ | ❌ | ❌ |
| Update ticket status | ✅ | ✅ | ❌ |
| Reassign tickets | ✅ | ❌ | ❌ |
| Manage entities | ✅ | ❌ | ❌ |
| Manage services | ✅ | ❌ | ❌ |
| Manage QR codes | ✅ | ❌ | ❌ |
| Create users (all) | ✅ | ❌ | ❌ |
| Create staff users (own entity) | ✅ | ✅ | ❌ |
| Modify users | ✅ | ❌ | ❌ |
| View all analytics | ✅ | ❌ | ❌ |
| Manage AI bots | ✅ | ❌ | ❌ |
| Process EA requests | ✅ | ❌ | ❌ |

### Appendix B: Ticket Status Workflow

```
                    ┌──────────────────┐
                    │      OPEN        │
                    │ (New submission) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   IN PROGRESS    │◄────────┐
                    │  (Being worked)  │         │
                    └────────┬─────────┘         │
                             │                   │
              ┌──────────────┼──────────────┐    │
              │              │              │    │
              ▼              │              ▼    │
     ┌──────────────┐        │     ┌──────────────┐
     │   PENDING    │────────┼────►│   RESOLVED   │
     │  (Waiting)   │        │     │   (Done)     │
     └──────────────┘        │     └──────┬───────┘
                             │            │
                             │            ▼
                             │   ┌──────────────┐
                             └──►│    CLOSED    │
                                 │  (Complete)  │
                                 └──────────────┘
```

### Appendix C: Entity ID Conventions

| Type | Prefix | Example |
|------|--------|---------|
| Ministry | MIN | MIN-001, MIN-002 |
| Department | DEP | DEP-001, DEP-002 |
| Agency | AGY | AGY-001, AGY-002 |
| Statutory Body | STB | STB-001, STB-002 |
| Unit | UNT | UNT-001, UNT-002 |

### Appendix D: Quick Reference Commands

**Docker Commands:**
```bash
# View all containers
docker-compose ps

# Restart all services
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild frontend
docker-compose up -d --build frontend

# Database shell
docker exec -it feedback_db psql -U feedback_user -d feedback
```

**Database Queries:**
```sql
-- Count tickets by status
SELECT status, COUNT(*) FROM tickets GROUP BY status;

-- List active users
SELECT email, role_code FROM users WHERE is_active = true;

-- Recent feedback ratings
SELECT rating, COUNT(*) FROM feedback 
WHERE created_at > NOW() - INTERVAL '7 days' 
GROUP BY rating;
```

### Appendix E: Contact Information

**DTA Helpdesk:**
- Email: alerts.dtahelpdesk@gmail.com

**Technical Support:**
- Email: support@dta.gov.gd

**System Administrator:**
- Contact your DTA team lead

---

## Document Information

**Document Version:** 2.0
**Published:** January 2026
**Classification:** Internal Use - DTA Staff Only
**© Government of Grenada - Digital Transformation Agency**

---

## Version History

### Version 2.0 (January 19, 2026)

**Major Updates:**

**Settings (Section 10):**
- Complete rewrite with comprehensive 9-category documentation
- Added detailed Citizen Login (Twilio SMS OTP) configuration guide
- Documented Leadership Contacts feature
- Added Database Settings with backup/restore procedures
- Expanded all settings categories with tables and step-by-step procedures

**Tickets (Section 4):**
- Added "Received vs. Submitted" views documentation (Feature 1.5)
- Added Ticket Categories feature
- Enhanced filtering and sorting capabilities
- Expanded ticket operations with detailed workflows
- Added comprehensive SLA Management section (4.10)
- Documented color coding for status and priority

**Analytics & Feedback (Section 7):**
- Added comprehensive Feedback Analytics section (7.3)
- Documented all 5 feedback questions and rating scales
- Added Channel Breakdown (EA Portal vs QR Code)
- Documented Recipient Group tracking
- Added Understanding Citizen Feedback Submission section (7.5)
- Included guidance on encouraging feedback submissions

**Minor Updates:**
- Updated version from 1.3 to 2.0
- Updated last updated date to January 19, 2026
- Corrected section numbering throughout

### Version 1.3 (January 17, 2026)
- Initial comprehensive manual
- Basic coverage of all admin features

---

## Related Documents

- **GEA Portal Citizen User Manual** - Public user guide
- **GEA Portal Staff User Manual** - MDA officer guide
- **API Development Patterns** - Technical API documentation (v1.1)
- **Database Query Patterns** - Database usage guide (v1.1)
- **Error Handling Patterns** - Error handling reference (v1.0)
- **Testing Guide** - Automated testing procedures (v2.0)
- **UI Modification Guide** - Frontend development guide (v1.2)
- **Solution Architecture** - System architecture overview
- **User Management Guide** - RBAC and authentication reference (v4.0)
