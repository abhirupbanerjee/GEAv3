# GEA Portal - Administrator User Manual

**Government of Grenada Enterprise Architecture Portal**

**Version:** 1.3
**Last Updated:** January 17, 2026
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

### 4.2 Ticket List View

**Columns displayed:**
- Ticket Number
- Type (Grievance/EA Request/Feedback)
- Entity (Ministry/Department/Agency)
- Service
- Status
- Priority
- Created Date
- SLA Due Date
- Last Updated

### 4.3 Advanced Filtering

**Filter Options:**

| Filter | Options |
|--------|---------|
| Entity | All entities in system |
| Status | Open, In Progress, Pending, Resolved, Closed |
| Type | Grievance, EA Request, Feedback-Auto |
| Priority | High, Medium, Low |
| Date Range | Start date, End date |
| SLA Status | On Track, At Risk, Overdue |
| Source | Web, QR, Mobile, Auto-generated |

**Search:**
- By ticket number
- By description keywords
- By contact email/phone

### 4.4 Bulk Actions

Select multiple tickets for:
- Status change
- Priority update
- Assignment
- Export

### 4.5 Ticket Details (Admin View)

Administrators see additional information:

**Standard Information:**
- All fields visible to staff
- Full activity timeline
- All attachments

**Admin-Only Information:**
- IP hash (privacy-protected)
- Submission metadata
- Audit trail
- Assignment history

### 4.6 Ticket Operations

**Update Status:**
1. Open ticket
2. Click "Update Status"
3. Select new status
4. Add comment (required)
5. Save

**Change Priority:**
1. Open ticket
2. Click "Change Priority"
3. Select High/Medium/Low
4. Add justification
5. Save

**Reassign Entity:**
1. Open ticket
2. Click "Reassign"
3. Select new entity
4. Add reason for transfer
5. Save

**Add Internal Note:**
1. Open ticket
2. Select "Internal Note" (not visible to citizen)
3. Type note
4. Save

### 4.7 Ticket Types

**Grievance:**
- Citizen complaints about service
- Auto-created from low feedback ratings (≤2.5)
- Requires resolution and follow-up

**EA Service Request:**
- Requests for Enterprise Architecture services
- May have document attachments
- Requires specialist review

**Feedback-Auto:**
- Auto-generated from low-rating feedback
- Links back to original feedback entry
- Requires service quality review

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
- Overall average rating
- Ratings by entity
- Ratings by service
- Rating trends over time
- Feedback volume

**User Analytics:**
- Active users
- Login frequency
- Actions per user

### 7.3 Filtering Analytics

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

### 7.5 Exporting Reports

**Export Options:**
1. Click **"Export"** button
2. Select format:
   - CSV (for spreadsheet analysis)
   - Excel (formatted)
   - PDF (for printing)
3. Download file

### 7.6 Scheduled Reports (Future)

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

The Settings page (`/admin/settings`) allows administrators to configure system-wide settings and service providers.

### 10.1 Accessing Settings

1. Navigate to **Admin Portal** → **Settings**
2. Settings are organized into 9 tabs

### 10.2 Settings Tabs

| Tab | Purpose |
|-----|---------|
| **System** | Site name, branding (logo/favicon), contact emails |
| **Authentication** | OAuth provider credentials (Google/Microsoft) |
| **Integrations** | SendGrid API key, chatbot URL and configuration |
| **Business Rules** | Rate limits, thresholds, file upload limits |
| **Performance** | Analytics caching settings (enable/disable, TTL) |
| **Content** | Footer URLs, leadership contacts |
| **User Management** | Configure entities allowed to have admin users |
| **Service Providers** | Configure which entities can receive service requests |
| **Backups** | Backup/restore operations and scheduled backup configuration |

### 10.3 Service Providers Configuration

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

### 10.4 Performance Settings

The **Performance** tab controls caching behavior for the analytics dashboard.

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Analytics Caching** | Toggle Redis caching for dashboard data | Enabled |
| **Analytics Cache TTL** | How long cached data remains valid (60-600 seconds) | 300 seconds |

**Benefits of caching:**
- Faster dashboard load times (1-5ms vs 200-500ms)
- Reduced database load during peak usage
- Automatic cache invalidation on admin service request submissions

**When to disable caching:**
- During troubleshooting if dashboard shows stale data
- For real-time monitoring needs (use refresh button instead)

### 10.5 Branding Settings

Under the **System** tab, you can customize:
- **Site Logo**: Upload or provide URL for the portal logo
- **Favicon**: Upload or provide URL for the browser tab icon
- **Site Name**: Customize the portal name
- **Contact Email**: Set the primary contact email

### 10.6 Backups

The **Backups** tab provides comprehensive backup and restore functionality directly from the admin interface.

#### Backup List

The backup list displays all available backups with:
- **Filename** - Backup file name (format: `gea_backup_YYYYMMDD_HHMMSS.sql`)
- **Created** - Date and time the backup was created
- **Size** - File size of the backup
- **Type** - Manual or Scheduled
- **Actions** - Download, Restore, Delete buttons

#### Creating a Backup

1. Navigate to **Settings → Database**
2. Click **"Create Backup"** button
3. Wait for backup to complete (progress indicator shown)
4. Backup appears in the list when complete

**What's included in backups:**
- All database tables and data
- Indexes and constraints
- Sequences
- Functions and triggers (if any)

#### Downloading a Backup

1. Find the backup in the list
2. Click the **Download** icon
3. Backup file downloads to your computer
4. Keep a local copy for disaster recovery

**Note:** Downloads keep the server copy intact - use this to maintain offsite backups.

#### Restoring from Backup

> **Warning:** Restore operations overwrite all current data. This action cannot be undone.

1. Find the backup you want to restore from
2. Click the **Restore** icon
3. A confirmation dialog appears
4. Type **"RESTORE DATABASE"** exactly in the confirmation field
5. Click **Confirm Restore**
6. Wait for restore to complete

**Safety Features:**
- A safety backup is automatically created before restore
- If restore fails, you can recover from the safety backup
- All restore operations are logged to the audit trail

#### Scheduled Backups

Configure automatic backups to run on a schedule:

**Schedule Settings:**
| Setting | Options | Description |
|---------|---------|-------------|
| Enable Scheduled Backups | On/Off | Toggle automatic backups |
| Schedule Type | Daily, Weekly, Monthly | How often to run |
| Time | HH:MM (24hr) | What time to run backup |
| Day | (for weekly/monthly) | Which day to run |

**Retention Policy:**
| Setting | Default | Description |
|---------|---------|-------------|
| Auto-delete old backups | Enabled | Automatically remove old backups |
| Retention Days | 30 | Delete backups older than X days |
| Minimum Keep | 10 | Always keep at least X backups |

#### Backup Directory

The backup directory path is displayed (read-only):
- Default: `/tmp/gea_backups/`
- Shows total backup count and size
- Cannot be changed from the UI (requires server configuration)

### 10.7 Saving Changes

- Changes are tracked with "unsaved changes" indicator
- Click **Save Changes** to apply modifications
- Some settings require application restart (marked with badge)

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

**Document Version:** 1.0  
**Published:** November 2025  
**Classification:** Internal Use - DTA Staff Only  
**© Government of Grenada - Digital Transformation Agency**

---

## Related Documents

- **GEA Portal Citizen User Manual** - Public user guide
- **GEA Portal Staff User Manual** - MDA officer guide
- **API Reference** - Technical API documentation
- **Database Reference** - Database schema documentation
- **Solution Architecture** - System architecture overview
