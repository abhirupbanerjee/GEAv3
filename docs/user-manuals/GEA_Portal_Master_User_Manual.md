# GEA Portal - Master User Manual

**Government of Grenada Enterprise Architecture Portal**

**Complete Documentation Guide**

**Version:** 1.0
**Last Updated:** January 2026
**Audience:** All Portal Users

---

## Welcome to the GEA Portal

This is the **Master User Manual** for the Government Enterprise Architecture (GEA) Portal. This guide will help you find the right documentation for your needs and navigate the portal effectively.

### About This Document

This master manual serves as:
- **Navigation hub** for all GEA Portal documentation
- **Quick reference** for portal features by user type
- **Decision guide** to help you find the right manual
- **Overview** of the entire GEA Portal ecosystem

---

## Table of Contents

1. [About the GEA Portal](#1-about-the-gea-portal)
2. [User Manual Directory](#2-user-manual-directory)
3. [Which Manual Do I Need?](#3-which-manual-do-i-need)
4. [Portal Features by User Type](#4-portal-features-by-user-type)
5. [Getting Started Guide](#5-getting-started-guide)
6. [Common Tasks Quick Reference](#6-common-tasks-quick-reference)
7. [Portal Architecture Overview](#7-portal-architecture-overview)
8. [Support and Contact Information](#8-support-and-contact-information)

---

## 1. About the GEA Portal

### 1.1 What is the GEA Portal?

The **Government Enterprise Architecture (GEA) Portal** is the official digital platform for the Government of Grenada to engage with citizens, businesses, and visitors while providing internal tools for government staff and administrators.

### 1.2 Portal Objectives

The GEA Portal enables:

- **Service Quality Monitoring** - Collect and analyze feedback on government services
- **Grievance Management** - Track and resolve citizen complaints
- **Performance Analytics** - Monitor service delivery metrics
- **Transparency** - Provide public access to service information
- **Efficiency** - Streamline government operations and citizen interactions

### 1.3 Who Uses the Portal?

The portal serves four main user groups:

| User Type | Description | Access Level |
|-----------|-------------|--------------|
| **Anonymous Users** | Public visitors without accounts | Public features only |
| **Citizens** | Registered users with Citizen Portal accounts | Public + Citizen features |
| **Staff** | Government employees assigned to handle tickets | Public + Citizen + Staff features |
| **Administrators** | System administrators and supervisors | All features + Admin controls |

### 1.4 Key Features

**For Everyone:**
- Browse government services directory
- Submit service feedback
- File grievances and track tickets
- Access AI-powered assistance

**For Citizens (with account):**
- View all feedback and tickets in one dashboard
- Track analytics and statistics
- Add comments to tickets
- Manage profile and settings

**For Staff:**
- View and manage assigned tickets
- Respond to grievances
- Update ticket status
- Collaborate with team members

**For Administrators:**
- Manage users, services, and entities
- Configure system settings
- Generate reports and analytics
- Monitor portal performance

---

## 2. User Manual Directory

The GEA Portal documentation is organized into **four comprehensive user manuals**, each tailored to a specific user type.

### 2.1 Available Manuals

| Manual | File | Target Audience | Features Covered |
|--------|------|-----------------|------------------|
| **[Anonymous User Manual](#21-anonymous-user-manual)** | `GEA_Portal_Anonymous_User_Manual.md` | Public users without accounts | Public features, feedback, grievances, helpdesk, QR codes, AI assistants |
| **[Citizen User Manual](#22-citizen-user-manual)** | `GEA_Portal_Citizen_User_Manual.md` | Registered citizens with accounts | Registration, login, profile, feedback history, tickets, grievances, analytics |
| **[Staff User Manual](#23-staff-user-manual)** | `GEA_Portal_Staff_User_Manual.md` | Government employees | Ticket management, assignment, responses, workflow, collaboration |
| **[Admin User Manual](#24-admin-user-manual)** | `GEA_Portal_Admin_User_Manual.md` | System administrators | User management, system configuration, reports, master data, settings |

### 2.2 Anonymous User Manual

**File:** [GEA_Portal_Anonymous_User_Manual.md](GEA_Portal_Anonymous_User_Manual.md)

**For:** Citizens, businesses, tourists, and visitors who want to use the portal **without creating an account**.

**Covers:**
- Accessing the portal
- Browsing government services
- Submitting service feedback
- Filing grievances
- Tracking tickets by number
- Using QR codes for quick feedback
- Using AI assistants
- When and how to create an account

**Start Here If:**
- You don't have a Citizen Portal account
- You want to submit feedback anonymously
- You received a ticket number and want to check its status
- You scanned a QR code at a government office

**Key Sections:**
- Section 4: Submitting Service Feedback
- Section 5: Filing a Grievance
- Section 6: Tracking Your Ticket
- Section 7: Using QR Codes

### 2.3 Citizen User Manual

**File:** [GEA_Portal_Citizen_User_Manual.md](GEA_Portal_Citizen_User_Manual.md)

**For:** Registered users who have created a **Citizen Portal account**.

**Covers:**
- Registration and login (SMS OTP and password)
- Profile management
- Dashboard navigation
- Submitting feedback (linked to account)
- Viewing feedback history with statistics
- Managing all tickets in one place
- Managing grievances with filtering
- Viewing analytics and charts
- Using the public helpdesk

**Start Here If:**
- You have a Citizen Portal account
- You want to create an account
- You want to see all your feedback and tickets in one place
- You want analytics and statistics

**Key Sections:**
- Section 3: Registration & Login
- Section 5: Managing Your Profile
- Section 7: Viewing Your Feedback History
- Section 9: Managing Your Grievances
- Section 10: Viewing Your Analytics

### 2.4 Staff User Manual

**File:** [GEA_Portal_Staff_User_Manual.md](GEA_Portal_Staff_User_Manual.md)

**For:** Government employees who handle tickets, respond to grievances, and manage service delivery.

**Covers:**
- Staff portal access and authentication
- Dashboard and queue management
- Viewing assigned tickets
- Responding to grievances
- Updating ticket status and priority
- Adding comments and resolutions
- Collaboration with team members
- Workflow and escalation procedures

**Start Here If:**
- You are a government employee assigned to handle tickets
- You need to respond to citizen grievances
- You manage service delivery for your department
- You need to update ticket status

**Key Sections:**
- Staff dashboard navigation
- Ticket assignment and management
- Response procedures
- Status workflow
- Team collaboration

### 2.5 Admin User Manual

**File:** [GEA_Portal_Admin_User_Manual.md](GEA_Portal_Admin_User_Manual.md)

**For:** System administrators, supervisors, and technical staff who configure and manage the portal.

**Covers:**
- Admin portal access
- User management (citizens, staff, admins)
- Entity and service management
- Master data configuration
- System settings and configuration
- Reports and analytics
- QR code management
- Portal monitoring and maintenance

**Start Here If:**
- You are a system administrator
- You need to create or manage user accounts
- You configure services and entities
- You generate reports
- You manage portal settings

**Key Sections:**
- User administration
- Master data management
- System configuration
- Reports and analytics
- QR code generation

---

## 3. Which Manual Do I Need?

### 3.1 Quick Decision Guide

Use this flowchart to find the right manual:

```
START
  ↓
Do you have an account?
  ↓
  ├─ NO → Are you a government employee?
  │         ↓
  │         ├─ NO → Use ANONYMOUS USER MANUAL
  │         └─ YES → Contact your supervisor for account setup
  │
  └─ YES → What type of account?
            ↓
            ├─ Citizen Account → Use CITIZEN USER MANUAL
            ├─ Staff Account → Use STAFF USER MANUAL
            └─ Admin Account → Use ADMIN USER MANUAL
```

### 3.2 By Task

Find the right manual based on what you want to do:

| I Want To... | Use This Manual |
|--------------|-----------------|
| Submit feedback without signing in | Anonymous User Manual |
| Check a ticket status using ticket number | Anonymous User Manual |
| Scan a QR code to give feedback | Anonymous User Manual |
| Create a Citizen Portal account | Anonymous User Manual → Section 9 |
| Sign in to my Citizen Portal account | Citizen User Manual |
| View all my feedback in one place | Citizen User Manual |
| See my analytics and statistics | Citizen User Manual |
| Add a comment to my ticket | Citizen User Manual |
| Manage my profile | Citizen User Manual |
| Respond to citizen grievances | Staff User Manual |
| Update ticket status | Staff User Manual |
| View my assigned tickets | Staff User Manual |
| Create new user accounts | Admin User Manual |
| Configure government services | Admin User Manual |
| Generate system reports | Admin User Manual |
| Manage portal settings | Admin User Manual |

### 3.3 By User Role

| Your Role | Primary Manual | Also Review |
|-----------|----------------|-------------|
| **Citizen** | Citizen User Manual | Anonymous User Manual (for public features) |
| **Business Owner** | Citizen User Manual | Anonymous User Manual |
| **Tourist/Visitor** | Anonymous User Manual | - |
| **Government Employee (Staff)** | Staff User Manual | Citizen User Manual (to understand citizen experience) |
| **Department Manager** | Staff User Manual | Admin User Manual (for reports) |
| **System Administrator** | Admin User Manual | All manuals (to support all users) |
| **DTA Technical Staff** | Admin User Manual | All manuals |

---

## 4. Portal Features by User Type

### 4.1 Feature Comparison Matrix

| Feature | Anonymous | Citizen | Staff | Admin |
|---------|-----------|---------|-------|-------|
| **Public Access** |
| Browse services directory | ✓ | ✓ | ✓ | ✓ |
| Submit feedback | ✓ | ✓ | ✓ | ✓ |
| File grievances | ✓ | ✓ | ✓ | ✓ |
| Check ticket by number | ✓ | ✓ | ✓ | ✓ |
| Use QR codes | ✓ | ✓ | ✓ | ✓ |
| Use AI assistants | ✓ | ✓ | ✓ | ✓ |
| **Citizen Features** |
| Create account | ✓ | ✓ | - | - |
| Login (SMS OTP/Password) | - | ✓ | - | - |
| View feedback history | - | ✓ | - | - |
| View all tickets dashboard | - | ✓ | - | - |
| View grievances dashboard | - | ✓ | - | - |
| Add comments to tickets | - | ✓ | - | - |
| View analytics | - | ✓ | - | - |
| Edit profile | - | ✓ | - | - |
| **Staff Features** |
| Staff portal access | - | - | ✓ | ✓ |
| View assigned tickets | - | - | ✓ | ✓ |
| Update ticket status | - | - | ✓ | ✓ |
| Respond to grievances | - | - | ✓ | ✓ |
| Add internal notes | - | - | ✓ | ✓ |
| Reassign tickets | - | - | ✓ | ✓ |
| View team queue | - | - | ✓ | ✓ |
| **Admin Features** |
| User management | - | - | - | ✓ |
| Service configuration | - | - | - | ✓ |
| Entity management | - | - | - | ✓ |
| System settings | - | - | - | ✓ |
| Generate reports | - | - | - | ✓ |
| QR code management | - | - | - | ✓ |
| Portal monitoring | - | - | - | ✓ |

### 4.2 Access Levels Summary

**Level 0: Anonymous Access**
- No account required
- Public features only
- Limited ticket tracking

**Level 1: Citizen Access**
- Free registration
- Full personal dashboard
- Complete ticket management
- Analytics and history

**Level 2: Staff Access**
- Government employee accounts
- Ticket assignment and handling
- Response and resolution tools
- Team collaboration

**Level 3: Admin Access**
- System administration
- Configuration and settings
- User and data management
- Reports and analytics

---

## 5. Getting Started Guide

### 5.1 For First-Time Visitors (Anonymous)

**Step 1:** Open your browser and navigate to the GEA Portal
- URL: https://gea.gov.gd (or provided URL)

**Step 2:** Explore the portal
- Review the homepage
- Browse the services directory
- Read about the GEA initiative

**Step 3:** Submit feedback (optional)
- Click "Feedback" in the navigation
- Select a service you've used
- Rate and provide comments

**Step 4:** Consider creating an account
- See **Anonymous User Manual → Section 9**
- Benefits: Track all feedback, view analytics, add comments

**Read:** [Anonymous User Manual](GEA_Portal_Anonymous_User_Manual.md)

### 5.2 For New Citizen Portal Users

**Step 1:** Create your account
- Click "Login" → "Create Account"
- Verify your phone number via SMS
- Complete your profile

**Step 2:** Explore your dashboard
- View navigation sidebar
- Check quick links on homepage

**Step 3:** Link existing feedback (optional)
- Submit new feedback while logged in
- Future feedback automatically linked

**Step 4:** Customize your experience
- Edit your profile
- Set preferences

**Read:** [Citizen User Manual](GEA_Portal_Citizen_User_Manual.md)

### 5.3 For New Staff Members

**Step 1:** Get your account
- Contact your supervisor or IT department
- Receive login credentials

**Step 2:** First login
- Navigate to the staff portal
- Sign in with provided credentials
- Review your dashboard

**Step 3:** Familiarize with your queue
- View assigned tickets
- Understand ticket statuses
- Learn response procedures

**Step 4:** Complete training
- Review workflow guidelines
- Understand escalation procedures
- Practice with sample tickets

**Read:** [Staff User Manual](GEA_Portal_Staff_User_Manual.md)

### 5.4 For New Administrators

**Step 1:** Access admin portal
- Receive admin credentials from DTA
- Sign in to admin panel

**Step 2:** Review system configuration
- Check user roles
- Review entities and services
- Understand current settings

**Step 3:** Learn management tools
- User administration
- Master data management
- Report generation

**Step 4:** Setup monitoring
- Configure alerts
- Review dashboards
- Establish maintenance routines

**Read:** [Admin User Manual](GEA_Portal_Admin_User_Manual.md)

---

## 6. Common Tasks Quick Reference

### 6.1 For Anonymous Users

| Task | Quick Steps | Manual Reference |
|------|-------------|------------------|
| Submit feedback | Feedback → Select Service → Rate → Submit | Anonymous Manual, Section 4 |
| File grievance | Feedback → Check "grievance" box → Submit | Anonymous Manual, Section 5 |
| Check ticket status | Helpdesk → Enter ticket number → View | Anonymous Manual, Section 6 |
| Use QR code | Scan code → Tap link → Submit feedback | Anonymous Manual, Section 7 |

### 6.2 For Citizen Users

| Task | Quick Steps | Manual Reference |
|------|-------------|------------------|
| Sign in | Login → Enter phone → Verify OTP or Password | Citizen Manual, Section 3.2 |
| View all tickets | Sidebar → Tickets | Citizen Manual, Section 8 |
| View feedback history | Sidebar → Feedback | Citizen Manual, Section 7 |
| View analytics | Sidebar → Analytics | Citizen Manual, Section 10 |
| Edit profile | Sidebar → My Profile → Edit → Save | Citizen Manual, Section 5 |
| Add comment to ticket | Tickets → Select ticket → Add Comment → Send | Citizen Manual, Section 8.6 |

### 6.3 For Staff Users

| Task | Quick Steps | Manual Reference |
|------|-------------|------------------|
| View assigned tickets | Staff Dashboard → My Tickets | Staff Manual |
| Respond to grievance | Open ticket → Add response → Update status | Staff Manual |
| Update ticket status | Ticket Details → Change status → Save | Staff Manual |
| Add internal note | Ticket → Internal Notes → Add note | Staff Manual |
| Reassign ticket | Ticket → Reassign → Select staff → Confirm | Staff Manual |

### 6.4 For Administrators

| Task | Quick Steps | Manual Reference |
|------|-------------|------------------|
| Create user account | Admin → Users → New User → Enter details → Save | Admin Manual |
| Add new service | Admin → Services → New Service → Configure → Save | Admin Manual |
| Generate report | Admin → Reports → Select type → Configure → Generate | Admin Manual |
| Create QR code | Admin → QR Codes → Select service → Generate | Admin Manual |
| Configure settings | Admin → Settings → Modify → Save | Admin Manual |

---

## 7. Portal Architecture Overview

### 7.1 Portal Components

The GEA Portal consists of several interconnected components:

```
┌─────────────────────────────────────────────────────┐
│                    GEA PORTAL                       │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
   │ Public  │      │  Citizen  │    │   Staff   │
   │  Portal │      │  Portal   │    │  Portal   │
   └─────────┘      └───────────┘    └───────────┘
        │                 │                 │
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    ┌─────▼─────┐
                    │   Admin   │
                    │  Portal   │
                    └───────────┘
```

### 7.2 User Journey Paths

**Anonymous User Journey:**
```
Visit Portal → Browse Services → Submit Feedback
     ↓
File Grievance → Receive Ticket Number
     ↓
Track Status via Helpdesk
     ↓
(Optional) Create Account → Become Citizen User
```

**Citizen User Journey:**
```
Register → Verify Phone → Login
     ↓
Submit Feedback → View in History
     ↓
File Grievance → Track in Dashboard
     ↓
View Analytics → Monitor Trends
```

**Staff User Journey:**
```
Login to Staff Portal → View Assigned Queue
     ↓
Review Ticket → Investigate Issue
     ↓
Add Response → Update Status
     ↓
Resolve Ticket → Close
```

**Admin User Journey:**
```
Login to Admin Portal → Monitor System
     ↓
Manage Users/Services/Settings
     ↓
Generate Reports → Analyze Trends
     ↓
Configure & Optimize
```

### 7.3 Data Flow

```
Citizen Feedback
     ↓
System Processing
     ↓
Ticket Creation (if grievance or low rating)
     ↓
Assignment to Entity/Staff
     ↓
Staff Response & Resolution
     ↓
Analytics & Reporting
```

### 7.4 Integration Points

The portal integrates with:
- **SMS Service (Twilio)** - For OTP verification
- **Email Service** - For notifications
- **AI Assistants** - For help and guidance
- **QR Code System** - For location-based feedback
- **Analytics Engine** - For reports and dashboards

---

## 8. Support and Contact Information

### 8.1 Digital Transformation Agency (DTA)

**Main Contact:**
- **Email:** support@dta.gov.gd
- **Phone:** [Contact Number]
- **Office Hours:** Monday - Friday, 8:00 AM - 4:00 PM
- **Location:** [DTA Office Address]

### 8.2 Technical Support

**For Portal Issues:**
- **Helpdesk Email:** alerts.dtahelpdesk@gmail.com
- **Subject Line:** Include "GEA Portal" and issue type
- **Include:**
  - Your user type (Anonymous, Citizen, Staff, Admin)
  - Description of the issue
  - Screenshots if possible
  - Browser and device information

### 8.3 Department-Specific Support

For service-specific questions:
- Navigate to the Services Directory on the portal
- Contact information is listed for each service
- Or contact the relevant Ministry/Department directly

### 8.4 Getting Help by User Type

**Anonymous Users:**
- Check [Anonymous User Manual](GEA_Portal_Anonymous_User_Manual.md)
- Use AI Assistants on the portal
- Email: support@dta.gov.gd

**Citizen Users:**
- Check [Citizen User Manual](GEA_Portal_Citizen_User_Manual.md)
- Submit feedback through the portal
- Email: support@dta.gov.gd

**Staff Users:**
- Check [Staff User Manual](GEA_Portal_Staff_User_Manual.md)
- Contact your supervisor
- Email: alerts.dtahelpdesk@gmail.com

**Administrators:**
- Check [Admin User Manual](GEA_Portal_Admin_User_Manual.md)
- Contact DTA technical team
- Email: alerts.dtahelpdesk@gmail.com

### 8.5 Reporting Issues

When reporting an issue, include:
1. **User Type** - Anonymous, Citizen, Staff, or Admin
2. **What you were trying to do** - Specific task
3. **What happened** - Error message or unexpected behavior
4. **When it happened** - Date and time
5. **Browser/Device** - What you're using
6. **Screenshots** - If applicable

### 8.6 Manual Feedback

Help us improve this documentation:
- **Email:** support@dta.gov.gd
- **Subject:** "Manual Feedback"
- **Include:**
  - Which manual
  - Section reference
  - Suggested improvement

---

## Appendix: Manual Versions and Updates

### Current Manual Versions

| Manual | Version | Last Updated | Key Updates |
|--------|---------|--------------|-------------|
| Master User Manual | 1.0 | January 2026 | Initial release |
| Anonymous User Manual | 1.0 | January 2026 | Initial release |
| Citizen User Manual | 2.1 | January 2026 | Profile management, password auth, grievances |
| Staff User Manual | [Version] | [Date] | [Updates] |
| Admin User Manual | [Version] | [Date] | [Updates] |

### Update Schedule

Documentation is reviewed and updated:
- **Quarterly** - Regular review cycle
- **As needed** - For major portal updates
- **Upon request** - Based on user feedback

### Change Log

Track major documentation changes:
- **January 2026** - Initial release of all manuals
- **January 2026** - Citizen manual updated with new features
- **January 2026** - Anonymous manual created
- **January 2026** - Master manual created

---

## Quick Links

### Manual Links
- [Anonymous User Manual](GEA_Portal_Anonymous_User_Manual.md)
- [Citizen User Manual](GEA_Portal_Citizen_User_Manual.md)
- [Staff User Manual](GEA_Portal_Staff_User_Manual.md)
- [Admin User Manual](GEA_Portal_Admin_User_Manual.md)

### Portal Links
- Portal Homepage: https://gea.gov.gd (or provided URL)
- Citizen Portal: https://gea.gov.gd/citizen
- Staff Portal: https://gea.gov.gd/staff
- Admin Portal: https://gea.gov.gd/admin

### Support Links
- DTA Website: [URL]
- Submit Feedback: https://gea.gov.gd/feedback
- Check Ticket: https://gea.gov.gd/helpdesk
- Services Directory: https://gea.gov.gd/services

---

**Document Information:**

**Version:** 1.0
**Published:** January 2026
**Purpose:** Master index and guide for all GEA Portal user documentation
**Maintained By:** Digital Transformation Agency (DTA)
**© Government of Grenada - Digital Transformation Agency**

---

## Need Help?

1. **Find Your Manual** - Use Section 3 to identify which manual you need
2. **Read the Relevant Sections** - Navigate to specific sections using the table of contents
3. **Try the Task** - Follow step-by-step instructions
4. **Get Support** - Contact DTA if you need additional help

**Welcome to the GEA Portal! We're here to help you serve and be served better.**
