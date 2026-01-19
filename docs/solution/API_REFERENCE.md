# GEA Portal v3 - API Reference

**Document Version:** 3.5
**Last Updated:** January 19, 2026
**API Base URL:** `https://gea.your-domain.com` (Production)
**Framework:** Next.js 16 App Router
**Authentication:** NextAuth v4 with OAuth (Google, Microsoft) + Twilio SMS OTP (Citizens)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Rate Limiting](#rate-limiting)
4. [Public API Endpoints](#public-api-endpoints)
5. [Citizen Authentication API](#citizen-authentication-api)
6. [Admin API Endpoints](#admin-api-endpoints)
   - [User Management](#1-user-management)
   - [Ticket Management](#2-ticket-management)
   - [System Settings Management](#3-system-settings-management)
   - [Database Backup & Restore](#4-database-backup--restore)
7. [Master Data Management APIs](#master-data-management-apis)
8. [External API (Bot/Integration Access)](#external-api-botintegration-access)
9. [Error Handling](#error-handling)
10. [Response Formats](#response-formats)
11. [Testing Guide](#testing-guide)

---

## Overview

### API Architecture

The GEA Portal v3 uses **Next.js 16 App Router API Routes** for all backend functionality. All endpoints follow RESTful conventions and return JSON responses.

```
/frontend/src/app/api/
├── auth/              # NextAuth OAuth endpoints (admin/staff)
├── citizen/           # Citizen authentication (Twilio SMS OTP)
│   └── auth/          # Citizen login, OTP verification, registration
├── feedback/          # Public service feedback endpoints
├── tickets/           # Public & internal ticket endpoints
├── helpdesk/          # Public ticket lookup
├── admin/             # Admin management APIs
│   ├── users/         # User management
│   ├── tickets/       # Ticket management
│   ├── settings/      # System settings management (9 categories)
│   └── database/      # Database backup/restore
├── managedata/        # Master data CRUD (admin)
└── external/          # External API (bot/integration access)
```

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | Node.js 22 |
| Database | PostgreSQL 16-alpine |
| Connection Pooling | PgBouncer v1.23.1 (200 max clients, 20 pool size) |
| Cache | Redis 7.4.4-alpine (analytics caching) |
| Database Driver | node-postgres (pg) v8.x |
| Validation | Zod schemas v3.x |
| Admin/Staff Auth | NextAuth v4 with OAuth (Google, Microsoft) |
| Citizen Auth | Twilio Verify SMS OTP (passwordless) |
| Authorization | Role-based (Admin, Staff, Citizen, Public) + Entity filtering |
| Settings Encryption | AES-256-GCM (sensitive values) |
| File Storage | PostgreSQL BYTEA |
| Email | SendGrid API v7.x |
| SMS | Twilio Verify API |

### Base URL

**Production:** `https://gea.your-domain.com`
**Development:** `http://localhost:3000`

### API Versioning

Currently v1 (no version prefix in URL). Future versions will use `/api/v2/` prefix.

---

## Authentication & Authorization

### Overview

The GEA Portal uses **dual authentication systems** to support different user types:

**1. Admin & Staff Authentication (NextAuth v4 with OAuth)**
- Google OAuth 2.0
- Microsoft Azure AD (optional)
- Email whitelist authorization
- JWT session tokens (2-hour expiration)
- Role-based access control (Admin, Staff)
- Entity-based data filtering for staff users

**2. Citizen Authentication (Twilio SMS OTP)**
- Passwordless phone-based authentication
- SMS OTP verification via Twilio Verify API
- E.164 phone format validation
- Regional filtering (Grenada + 18 Caribbean countries)
- Optional password for returning users
- Trusted device management (30-day cookies)
- 24-hour session duration
- Account security with max OTP attempts

**Key Features:**
- Dual authentication paths (OAuth for internal, SMS OTP for citizens)
- Role-based access control (Admin, Staff, Citizen, Public)
- Entity-based data filtering for staff users
- Comprehensive audit logging
- Separate session management for each authentication type

### Public Endpoints

**No authentication required** for:
- Service feedback submission
- Grievance ticket submission
- Ticket status checking (with ticket number)
- QR code lookups
- Service/entity listing

**Security measures:**
- IP-based rate limiting (5 requests/hour)
- SHA256 IP hashing for privacy (no PII stored)
- Request ID tracking

### Protected Endpoints

**OAuth authentication required** for:
- Admin portal (`/admin/*`)
- Staff portal (`/staff/*`)
- User management APIs (`/api/admin/users/*`)
- Master data management (`/api/managedata/*`)

**Authentication flow:**
1. User visits protected route (e.g., `/admin`)
2. Middleware checks for valid session
3. If no session → Redirect to `/auth/signin`
4. User selects OAuth provider (Google or Microsoft)
5. OAuth consent flow
6. NextAuth validates email against `users` table
7. If authorized → Create JWT session with role & entity data
8. If unauthorized → Redirect to `/auth/unauthorized`

**Authorization checks:**
- **Email Whitelist:** User email must exist in `users` table
- **Active Status:** `is_active = TRUE` required
- **Role Check:** Admin vs Staff vs Public roles
- **Entity Filtering:** Staff users see only their entity's data

### Session Structure

#### Admin/Staff Session (NextAuth OAuth)

When authenticated via OAuth, the NextAuth session object contains:

```typescript
session = {
  user: {
    id: "uuid",                        // User UUID
    email: "user@gov.gd",              // OAuth email
    name: "User Name",                 // Display name
    image: "https://...",              // OAuth profile picture
    roleId: 1,                         // Role ID
    roleCode: "admin_dta",             // Role code
    roleType: "admin",                 // admin | staff | public
    entityId: "MIN-001" | null,        // Entity ID (null for admin)
    isActive: true                     // Active status
  },
  expires: "2026-01-17T12:00:00Z"      // Session expiration (2 hours)
}
```

**Session Refresh:** The UI calls `updateSession()` when navigating to the admin area. This triggers the JWT callback with `trigger === 'update'`, which refreshes user role data from the database to ensure menu visibility matches current permissions.

#### Citizen Session (Custom SMS OTP)

When authenticated via SMS OTP, the citizen session is stored separately from NextAuth:

```typescript
citizenSession = {
  citizen_id: "uuid",                  // Citizen UUID
  phone_number: "+1473...",            // E.164 formatted phone
  first_name: "John",                  // First name
  last_name: "Doe",                    // Last name
  email: "john@example.com",           // Optional email
  preferred_language: "en",            // Language preference
  is_verified: true,                   // Phone verification status
  session_id: "uuid",                  // Session UUID
  expires_at: "2026-01-20T12:00:00Z",  // Session expiration (24 hours)
  trusted_device: true,                // Whether device is trusted
  device_id: "device_uuid"             // Trusted device ID (if applicable)
}
```

**Citizen Session Storage:**
- Stored in `citizen_sessions` table
- Session cookie: `citizen_session_id` (HTTP-only, secure)
- Trusted device cookie: `trusted_device_id` (30-day expiration)
- Auto-logout after 24 hours of inactivity

### Using Authentication in API Routes

#### Admin/Staff Authentication (NextAuth)

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check role
  if (session.user.roleType !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Use session data
  return NextResponse.json({ user: session.user });
}
```

#### Citizen Authentication (Custom Session)

```typescript
import { getCitizenSession } from '@/lib/citizen-auth';

export async function GET(request: NextRequest) {
  const citizenSession = await getCitizenSession(request);

  if (!citizenSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if phone is verified
  if (!citizenSession.is_verified) {
    return NextResponse.json({ error: 'Phone verification required' }, { status: 403 });
  }

  // Use citizen session data
  return NextResponse.json({ citizen: citizenSession });
}
```

### NextAuth API Endpoints

**Authentication handled by NextAuth:**

```
GET  /api/auth/signin           # Sign-in page (redirects to OAuth)
GET  /api/auth/signout          # Sign-out
GET  /api/auth/session          # Get current session
GET  /api/auth/csrf             # CSRF token
GET  /api/auth/providers        # List OAuth providers
POST /api/auth/callback/google  # Google OAuth callback
POST /api/auth/callback/azure-ad # Microsoft OAuth callback
```

**Note:** These endpoints are managed by NextAuth. For manual authentication testing, use the web interface at `/auth/signin`.

---

## Rate Limiting

### Configuration

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Feedback Submission | 5 requests | 1 hour |
| Grievance Submission | 3 requests | 1 hour |
| Ticket Submission | 5 requests | 1 hour |
| Ticket Status Check | 10 requests | 1 hour | N/A |
| Category List | 30 requests | 1 hour | N/A |

### Rate Limit Headers

**Response includes:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1700000000
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many submissions. Please try again in 45 minutes.",
    "retryAfter": "2025-11-20T15:30:00Z"
  },
  "meta": {
    "limit": 5,
    "remaining": 0,
    "resetAt": "2025-11-20T15:30:00Z"
  }
}
```

---

## Public API Endpoints

### 1. Service Feedback

#### POST /api/feedback/submit

Submit service feedback with 5-point rating.

**Rate Limit:** 5 submissions/hour

**Request Body:**
```json
{
  "service_id": "SVC-IMM-001",
  "rating": 4,
  "channel": "web",
  "recipient_group": "citizen",
  "comments": "Quick and helpful service",
  "qr_code": "QR-DTA-001",
  "contact_name": "John Doe",
  "contact_email": "john@example.com",
  "contact_phone": "+1473555000"
}
```

**Parameters:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| service_id | string | Yes | Valid service ID | Service being rated |
| rating | integer | Yes | 1-5 | Star rating |
| channel | string | No | web, qr, mobile, kiosk | Feedback channel (default: web) |
| recipient_group | string | Yes | citizen, business, government, tourist, student, other | User category |
| comments | string | No | Max 2000 chars | Feedback text |
| qr_code | string | No | Valid QR code | QR code scanned (if any) |
| contact_name | string | No | Max 255 chars | Contact name |
| contact_email | string | No | Valid email | Contact email |
| contact_phone | string | No | Max 50 chars | Contact phone |

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "feedback_id": 123,
    "service_name": "Work Permit Application",
    "rating": 4,
    "auto_grievance_created": false,
    "created_at": "2025-11-20T10:30:00Z"
  },
  "message": "Thank you for your feedback!"
}
```

**Auto-Grievance Created (rating ≤ 2.5):**
```json
{
  "success": true,
  "data": {
    "feedback_id": 124,
    "service_name": "Work Permit Application",
    "rating": 2,
    "auto_grievance_created": true,
    "grievance_number": "GRV-20251120-0001",
    "ticket_number": "202511-000001",
    "created_at": "2025-11-20T10:35:00Z"
  },
  "message": "Thank you for your feedback. A grievance has been automatically created and you will be contacted soon."
}
```

**Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "rating",
        "message": "Rating must be between 1 and 5"
      },
      {
        "field": "service_id",
        "message": "Service not found or inactive"
      }
    ]
  }
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/feedback/submit \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "SVC-IMM-001",
    "rating": 5,
    "channel": "web",
    "recipient_group": "citizen",
    "comments": "Excellent service!",
    "contact_email": "citizen@example.com"
  }'
```

---

#### GET /api/feedback/search

Fuzzy search for services (for autocomplete).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (min 2 chars) |

**Example Request:**
```
GET /api/feedback/search?q=work
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "unique_service_id": "SVC-IMM-001",
      "service_name": "Work Permit Application",
      "category": "Immigration",
      "entity_name": "Department of Immigration",
      "similarity": 0.85
    },
    {
      "unique_service_id": "SVC-LAB-001",
      "service_name": "Work Safety Inspection",
      "category": "Labour",
      "entity_name": "Department of Labour",
      "similarity": 0.72
    }
  ]
}
```

**Example cURL:**
```bash
curl "https://gea.your-domain.com/api/feedback/search?q=work"
```

---

#### GET /api/feedback/stats

Comprehensive feedback statistics and analytics.

**Authentication:** Admin (future)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| service_id | string | No | Comma-separated service IDs (multi-select) |
| entity_id | string | No | Comma-separated entity IDs (multi-select) |
| start_date | string | No | ISO 8601 date (YYYY-MM-DD) |
| end_date | string | No | ISO 8601 date (YYYY-MM-DD) |
| channel | string | No | Filter by channel (web, qr, mobile, kiosk) |

**Example Request:**
```
GET /api/feedback/stats?start_date=2025-11-01&end_date=2025-11-30&service_id=SVC-IMM-001,SVC-TAX-001
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_feedback": 1250,
      "average_rating": 4.2,
      "total_grievances": 45,
      "period": {
        "start": "2025-11-01",
        "end": "2025-11-30"
      }
    },
    "by_channel": [
      {
        "channel": "web",
        "count": 850,
        "avg_rating": 4.3
      },
      {
        "channel": "qr",
        "count": 300,
        "avg_rating": 4.0
      },
      {
        "channel": "mobile",
        "count": 100,
        "avg_rating": 4.1
      }
    ],
    "by_recipient_group": [
      {
        "recipient_group": "citizen",
        "count": 900,
        "avg_rating": 4.2
      },
      {
        "recipient_group": "business",
        "count": 250,
        "avg_rating": 4.3
      },
      {
        "recipient_group": "government",
        "count": 100,
        "avg_rating": 4.0
      }
    ],
    "rating_distribution": {
      "5_star": 550,
      "4_star": 400,
      "3_star": 200,
      "2_star": 70,
      "1_star": 30
    },
    "top_services": [
      {
        "service_id": "SVC-IMM-001",
        "service_name": "Work Permit Application",
        "count": 450,
        "avg_rating": 4.5
      },
      {
        "service_id": "SVC-TAX-001",
        "service_name": "Property Tax Payment",
        "count": 380,
        "avg_rating": 4.1
      }
    ],
    "trend_data": [
      {
        "date": "2025-11-01",
        "count": 42,
        "avg_rating": 4.3
      },
      {
        "date": "2025-11-02",
        "count": 38,
        "avg_rating": 4.2
      }
    ],
    "recent_grievances": [
      {
        "grievance_number": "GRV-20251120-0001",
        "service_name": "Work Permit Application",
        "rating": 2,
        "comments": "Long wait time",
        "created_at": "2025-11-20T10:30:00Z"
      }
    ]
  }
}
```

**Example cURL:**
```bash
curl "https://gea.your-domain.com/api/feedback/stats?start_date=2025-11-01&end_date=2025-11-30"
```

---

#### GET /api/feedback/qr/[code]

Fetch QR code data for feedback submission.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| code | QR code identifier (e.g., QR-DTA-001) |

**Example Request:**
```
GET /api/feedback/qr/QR-DTA-001
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qr_code": "QR-DTA-001",
    "service_id": "SVC-IMM-001",
    "service_name": "Work Permit Application",
    "entity_id": "DEPT-001",
    "entity_name": "Department of Immigration",
    "location": "Maurice Bishop Airport - Immigration Counter",
    "scan_count": 145,
    "is_active": true
  }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "QR_CODE_NOT_FOUND",
    "message": "QR code not found or inactive"
  }
}
```

**Example cURL:**
```bash
curl https://gea.your-domain.com/api/feedback/qr/QR-DTA-001
```

---

#### POST /api/feedback/qr/[code]/scan

Increment scan count for QR code analytics.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| code | QR code identifier |

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qr_code": "QR-DTA-001",
    "scan_count": 146,
    "last_scanned_at": "2025-11-20T10:30:00Z"
  }
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/feedback/qr/QR-DTA-001/scan
```

---

### 2. Tickets

#### POST /api/tickets/submit

Public endpoint for citizens to submit new tickets.

**Rate Limit:** 5 submissions/hour

**Request Body:**
```json
{
  "service_id": "SVC-IMM-001",
  "entity_id": "DEPT-001",
  "category_id": 1,
  "requester_category": "citizen",
  "subject": "Unable to download work permit application form",
  "description": "The PDF link on the website returns a 404 error. I need to submit my application by next week.",
  "contact_name": "Jane Smith",
  "contact_email": "jane@example.com",
  "contact_phone": "+1473555001"
}
```

**Parameters:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| service_id | string | Yes | Valid service ID | Service related to ticket |
| entity_id | string | Yes | Valid entity ID | Responsible entity |
| category_id | integer | No | Valid category ID | Ticket category |
| requester_category | string | Yes | citizen, business, government, tourist, student, other | User category |
| subject | string | Yes | Max 500 chars | Brief subject |
| description | string | Yes | Max 5000 chars | Detailed description |
| contact_name | string | Yes | Max 255 chars | Submitter name |
| contact_email | string | Yes | Valid email | Contact email |
| contact_phone | string | No | Max 50 chars | Contact phone |

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "ticket_id": 456,
    "ticket_number": "202511-000456",
    "service_name": "Work Permit Application",
    "status": "New",
    "priority": "Medium",
    "sla_target": "2025-11-22T10:30:00Z",
    "created_at": "2025-11-20T10:30:00Z",
    "tracking_url": "https://gea.your-domain.com/helpdesk/ticket/202511-000456"
  },
  "message": "Your ticket has been created successfully. Please save your ticket number: 202511-000456"
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/tickets/submit \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "SVC-IMM-001",
    "entity_id": "DEPT-001",
    "requester_category": "citizen",
    "subject": "Unable to download form",
    "description": "The PDF link returns 404 error",
    "contact_name": "Jane Smith",
    "contact_email": "jane@example.com"
  }'
```

---

#### GET /api/tickets/status/[ticket_number]

Check ticket status by ticket number.

**Rate Limit:** 10 checks/hour

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| ticket_number | Ticket number (format: YYYYMM-XXXXXX) |

**Example Request:**
```
GET /api/tickets/status/202511-000456
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ticket_number": "202511-000456",
    "status": "In Progress",
    "priority": "Medium",
    "subject": "Unable to download work permit application form",
    "service_name": "Work Permit Application",
    "entity_name": "Department of Immigration",
    "created_at": "2025-11-20T10:30:00Z",
    "updated_at": "2025-11-20T14:15:00Z",
    "sla_target": "2025-11-22T10:30:00Z",
    "sla_status": "On Time",
    "time_remaining": "1 day 20 hours",
    "activity": [
      {
        "timestamp": "2025-11-20T14:15:00Z",
        "action": "Status changed to In Progress",
        "by": "System"
      },
      {
        "timestamp": "2025-11-20T10:30:00Z",
        "action": "Ticket created",
        "by": "Jane Smith"
      }
    ]
  }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket not found. Please check your ticket number."
  }
}
```

**Example cURL:**
```bash
curl https://gea.your-domain.com/api/tickets/status/202511-000456
```

---

#### GET /api/tickets/categories

List available ticket categories.

**Rate Limit:** 30 requests/hour

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| service_id | string | No | Filter categories by service |
| entity_id | string | No | Filter categories by entity |

**Example Request:**
```
GET /api/tickets/categories?service_id=SVC-IMM-001
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "category_name": "Technical Issue",
      "category_code": "TECH",
      "description": "Website errors, broken links, form issues"
    },
    {
      "category_id": 2,
      "category_name": "Service Request",
      "category_code": "SERVICE",
      "description": "General service inquiries and requests"
    },
    {
      "category_id": 3,
      "category_name": "Feedback/Complaint",
      "category_code": "FEEDBACK",
      "description": "Service feedback or complaints"
    },
    {
      "category_id": 4,
      "category_name": "Access/Permission",
      "category_code": "ACCESS",
      "description": "Account access or permission issues"
    },
    {
      "category_id": 5,
      "category_name": "Other",
      "category_code": "OTHER",
      "description": "Other issues not covered above"
    }
  ]
}
```

**Example cURL:**
```bash
curl https://gea.your-domain.com/api/tickets/categories
```

---

#### POST /api/tickets/from-feedback

**Internal endpoint** to auto-create tickets from feedback/grievances.

**Authentication:** Service-to-service (internal only)

**Request Body:**
```json
{
  "source_type": "feedback",
  "source_id": 123,
  "service_id": "SVC-IMM-001",
  "entity_id": "DEPT-001",
  "requester_category": "citizen",
  "subject": "Low rating received for service",
  "description": "Auto-created from feedback with rating 2. Comments: Long wait time.",
  "contact_name": "John Doe",
  "contact_email": "john@example.com",
  "priority": "High"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "ticket_id": 457,
    "ticket_number": "202511-000457",
    "created_at": "2025-11-20T10:35:00Z"
  }
}
```

---

#### POST /api/tickets/[id]/attachments

Upload file attachments to a ticket.

**Authentication:** Admin (future)

**Request:** Multipart form data

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | File to upload (max 5MB) |

**Allowed file types:**
- Documents: PDF, DOC, DOCX, XLS, XLSX
- Images: JPEG, PNG, GIF

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "attachment_id": 789,
    "file_name": "error_screenshot.png",
    "file_type": "image/png",
    "file_size": 245678,
    "uploaded_at": "2025-11-20T10:40:00Z"
  }
}
```

**File Too Large (413):**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size of 5MB",
    "max_size_mb": 5
  }
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/tickets/456/attachments \
  -F "file=@screenshot.png" \
  -b cookies.txt
```

---

#### GET /api/tickets/[id]/attachments

List attachments for a ticket (metadata only).

**Authentication:** Admin (future)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "attachment_id": 789,
      "file_name": "error_screenshot.png",
      "file_type": "image/png",
      "file_size": 245678,
      "uploaded_at": "2025-11-20T10:40:00Z"
    }
  ]
}
```

---

### 3. Helpdesk

#### GET /api/helpdesk/ticket/[ticketNumber]

Public ticket lookup with activity timeline.

**Features:**
- Returns ticket details and activity history
- **Smart Privacy Controls:**
  - Open/In-Progress tickets: Internal notes are hidden
  - Resolved/Closed tickets: Last internal note shown as "Resolution Comment"

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| ticketNumber | Ticket number (format: YYYYMM-XXXXXX) |

**Example Request:**
```
GET /api/helpdesk/ticket/202511-000456
```

**Success Response (200 OK) - Open/In-Progress Ticket:**
```json
{
  "success": true,
  "ticket": {
    "ticket_number": "202511-000456",
    "status": "In Progress",
    "status_code": "in_progress",
    "priority": "Medium",
    "priority_code": "medium",
    "subject": "Unable to download work permit application form",
    "description": "The PDF link on the website returns a 404 error...",
    "service_name": "Work Permit Application",
    "service_id": "SVC-IMM-001",
    "entity_name": "Department of Immigration",
    "entity_id": "DEPT-001",
    "requester_category": "citizen",
    "feedback_id": null,
    "created_at": "2025-11-20T10:30:00Z",
    "updated_at": "2025-11-20T14:15:00Z"
  },
  "activities": [
    {
      "activity_id": 2,
      "activity_type": "status_change",
      "display_type": "status_change",
      "performed_by": "admin",
      "description": "Status changed from New to In Progress",
      "created_at": "2025-11-20T14:15:00Z"
    },
    {
      "activity_id": 1,
      "activity_type": "created",
      "display_type": "created",
      "performed_by": "system",
      "description": "Ticket created",
      "created_at": "2025-11-20T10:30:00Z"
    }
  ],
  "metadata": {
    "retrieved_at": "2025-11-22T10:00:00Z"
  }
}
```

**Success Response (200 OK) - Resolved/Closed Ticket:**
```json
{
  "success": true,
  "ticket": {
    "ticket_number": "202511-000456",
    "status": "Resolved",
    "status_code": "resolved",
    "priority": "Medium",
    "priority_code": "medium",
    "subject": "Unable to download work permit application form",
    "description": "The PDF link on the website returns a 404 error...",
    "service_name": "Work Permit Application",
    "service_id": "SVC-IMM-001",
    "entity_name": "Department of Immigration",
    "entity_id": "DEPT-001",
    "requester_category": "citizen",
    "feedback_id": null,
    "created_at": "2025-11-20T10:30:00Z",
    "updated_at": "2025-11-20T16:45:00Z"
  },
  "activities": [
    {
      "activity_id": 5,
      "activity_type": "internal_note",
      "display_type": "resolution_comment",
      "performed_by": "admin",
      "description": "The PDF link has been fixed. The form is now accessible at www.example.com/forms/work-permit.pdf. If you continue to experience issues, please submit a new ticket.",
      "created_at": "2025-11-20T16:45:00Z"
    },
    {
      "activity_id": 4,
      "activity_type": "status_change",
      "display_type": "status_change",
      "performed_by": "admin",
      "description": "Status changed from In Progress to Resolved",
      "created_at": "2025-11-20T16:44:00Z"
    },
    {
      "activity_id": 2,
      "activity_type": "status_change",
      "display_type": "status_change",
      "performed_by": "admin",
      "description": "Status changed from New to In Progress",
      "created_at": "2025-11-20T14:15:00Z"
    },
    {
      "activity_id": 1,
      "activity_type": "created",
      "display_type": "created",
      "performed_by": "system",
      "description": "Ticket created",
      "created_at": "2025-11-20T10:30:00Z"
    }
  ],
  "metadata": {
    "retrieved_at": "2025-11-22T10:00:00Z"
  }
}
```

**Activity Types:**

| Type | Display Type | Icon | Description |
|------|-------------|------|-------------|
| created | created | 🎫 | Ticket was created |
| status_change | status_change | 🔄 | Status was updated |
| priority_change | priority_change | ⚡ | Priority was modified |
| internal_note | resolution_comment | ✅ | Admin's resolution comment (only shown on resolved/closed tickets) |

**Privacy Rules:**
- **Open/In-Progress**: `internal_note` activities are excluded
- **Resolved/Closed**: Last `internal_note` is included and relabeled as `resolution_comment`

**Not Found (404):**
```json
{
  "error": "Ticket not found",
  "message": "No ticket found with number: 202511-000456. Please check the ticket number and try again.",
  "timestamp": "2025-11-22T10:00:00Z"
}
```

**Example cURL:**
```bash
curl https://gea.your-domain.com/api/helpdesk/ticket/202511-000456
```

---

## Citizen Authentication API

The Citizen Portal uses **Twilio Verify SMS OTP** for passwordless phone-based authentication. Citizens can log in using only their phone number, receive an OTP via SMS, and access government services.

### Key Features

- **Passwordless Authentication:** No password required (optional for returning users)
- **SMS OTP Delivery:** Twilio Verify API ensures reliable delivery
- **E.164 Phone Validation:** International format with regional filtering
- **Trusted Devices:** Remember device for 30 days (skip OTP)
- **Account Security:** Max OTP attempts, account blocking after failures
- **24-Hour Sessions:** Long-lived sessions for citizen convenience
- **Regional Filtering:** Grenada + 18 Caribbean countries + custom regions

### 1. Send OTP (Login Initiation)

#### POST /api/citizen/auth/send-otp

Initiates login by sending SMS OTP to the citizen's phone number.

**Rate Limit:** 5 requests/hour per phone number

**Request Body:**
```json
{
  "phone_number": "+14735551234",
  "channel": "sms"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | E.164 formatted phone number (e.g., +14735551234) |
| channel | string | No | Delivery channel: "sms" or "call" (default: sms) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully to +1473***1234",
  "data": {
    "phone_masked": "+1473***1234",
    "channel": "sms",
    "expires_in": 600,
    "verification_sid": "VE..."
  }
}
```

**Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": "Phone must be in E.164 format (e.g., +14735551234)"
  }
}
```

**Regional Block (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "code": "REGION_NOT_ALLOWED",
    "message": "Phone number region is not allowed",
    "details": "Only Grenada and Caribbean countries are supported"
  }
}
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many OTP requests. Please try again in 45 minutes."
  }
}
```

---

### 2. Verify OTP

#### POST /api/citizen/auth/verify-otp

Verifies the OTP code sent via SMS.

**Request Body:**
```json
{
  "phone_number": "+14735551234",
  "otp_code": "123456"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | E.164 formatted phone number |
| otp_code | string | Yes | 6-digit OTP code |

**Success Response - Existing User (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "verified": true,
    "is_new_user": false,
    "citizen": {
      "citizen_id": "uuid",
      "phone_number": "+14735551234",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "is_verified": true
    },
    "session": {
      "session_id": "uuid",
      "expires_at": "2026-01-20T12:00:00Z"
    }
  }
}
```

**Success Response - New User (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully. Please complete registration.",
  "data": {
    "verified": true,
    "is_new_user": true,
    "requires_registration": true,
    "phone_number": "+14735551234"
  }
}
```

**Invalid OTP (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Invalid OTP code",
    "attempts_remaining": 2
  }
}
```

**Account Blocked (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_BLOCKED",
    "message": "Account temporarily blocked due to too many failed attempts",
    "blocked_until": "2026-01-19T18:00:00Z"
  }
}
```

---

### 3. Complete Registration (New Citizens)

#### POST /api/citizen/auth/complete-registration

Completes registration for new citizens after OTP verification.

**Request Body:**
```json
{
  "phone_number": "+14735551234",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "preferred_language": "en",
  "password": "SecurePass123!"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | E.164 formatted phone number (must match verified OTP) |
| first_name | string | Yes | First name (2-50 chars) |
| last_name | string | Yes | Last name (2-50 chars) |
| email | string | No | Email address |
| preferred_language | string | No | Language code: "en" or "fr" (default: en) |
| password | string | No | Optional password for future logins (min 8 chars) |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "citizen": {
      "citizen_id": "uuid",
      "phone_number": "+14735551234",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "preferred_language": "en",
      "is_verified": true,
      "created_at": "2026-01-19T10:00:00Z"
    },
    "session": {
      "session_id": "uuid",
      "expires_at": "2026-01-20T10:00:00Z"
    }
  }
}
```

**Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "first_name",
        "message": "First name must be 2-50 characters"
      },
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

### 4. Login with Password (Returning Citizens)

#### POST /api/citizen/auth/login

Allows returning citizens to login with phone number and password (skips OTP).

**Request Body:**
```json
{
  "phone_number": "+14735551234",
  "password": "SecurePass123!",
  "trust_device": true
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | E.164 formatted phone number |
| password | string | Yes | User password |
| trust_device | boolean | No | Remember device for 30 days (default: false) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "citizen": {
      "citizen_id": "uuid",
      "phone_number": "+14735551234",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    "session": {
      "session_id": "uuid",
      "expires_at": "2026-01-20T10:00:00Z",
      "trusted_device": true
    }
  }
}
```

**Invalid Credentials (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid phone number or password"
  }
}
```

---

### 5. Logout

#### POST /api/citizen/auth/logout

Logs out the current citizen session.

**Authentication:** Required (citizen session)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 6. Get Current Citizen

#### GET /api/citizen/auth/me

Returns the current logged-in citizen's profile.

**Authentication:** Required (citizen session)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "citizen": {
      "citizen_id": "uuid",
      "phone_number": "+14735551234",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "preferred_language": "en",
      "is_verified": true,
      "created_at": "2026-01-15T10:00:00Z",
      "last_login": "2026-01-19T09:00:00Z"
    },
    "session": {
      "session_id": "uuid",
      "expires_at": "2026-01-20T09:00:00Z",
      "trusted_device": true
    }
  }
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No active citizen session"
  }
}
```

---

### Citizen Authentication Flow

**Flow 1: New Citizen (First-Time)**
1. User enters phone number → `POST /api/citizen/auth/send-otp`
2. User receives SMS with 6-digit OTP
3. User enters OTP → `POST /api/citizen/auth/verify-otp` (returns `is_new_user: true`)
4. User fills registration form → `POST /api/citizen/auth/complete-registration`
5. Session created, user logged in

**Flow 2: Returning Citizen (OTP Method)**
1. User enters phone number → `POST /api/citizen/auth/send-otp`
2. User receives SMS with 6-digit OTP
3. User enters OTP → `POST /api/citizen/auth/verify-otp` (returns `is_new_user: false`)
4. Session created, user logged in

**Flow 3: Returning Citizen (Password Method)**
1. User enters phone number and password → `POST /api/citizen/auth/login`
2. Session created, user logged in

**Flow 4: Trusted Device**
1. If device is trusted (30-day cookie), OTP step may be skipped for returning users
2. Direct login with phone number only

---

## Admin API Endpoints

### 1. User Management

#### GET /api/admin/users

List all users with their roles and entity assignments.

**Authentication:** Required (admin or staff session)
- **Admin:** Sees all users across the system
- **Staff:** Sees only users from their assigned entity

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Search by email or name |
| role_type | string | No | Filter by role type (admin, staff, public) |
| is_active | boolean | No | Filter by active status |

**Example Request:**
```
GET /api/admin/users?role_type=staff&is_active=true
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@your-domain.com",
      "name": "Admin User",
      "image": "https://lh3.googleusercontent.com/...",
      "role_id": 1,
      "role_code": "admin_dta",
      "role_name": "DTA Administrator",
      "role_type": "admin",
      "entity_id": null,
      "entity_name": null,
      "is_active": true,
      "last_login": "2025-11-24T10:30:00Z",
      "created_at": "2025-11-20T08:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "staff@ministry.gd",
      "name": "Ministry Staff",
      "image": null,
      "role_id": 2,
      "role_code": "staff_mda",
      "role_name": "MDA Staff Officer",
      "role_type": "staff",
      "entity_id": "MIN-001",
      "entity_name": "Ministry of Digital Transformation",
      "is_active": true,
      "last_login": "2025-11-23T15:45:00Z",
      "created_at": "2025-11-21T09:00:00Z"
    }
  ]
}
```

---

#### POST /api/admin/users

Add a new user to the system.

**Authentication:** Required (admin or staff session)
- **Admin:** Can create any user type
- **Staff:** Can only create staff users for their own entity

**Request Body:**
```json
{
  "email": "newuser@gov.gd",
  "name": "New User",
  "roleCode": "staff_mda",
  "entity_id": "MIN-001",
  "is_active": true
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email (must match OAuth account) |
| name | string | Yes | Full name |
| roleCode | string | Yes | Role code (admin_dta, staff_mda, public_user) |
| entity_id | string | Conditional | Required for staff users, auto-assigns AGY-005 for admin_dta if not specified |
| is_active | boolean | No | Active status (default: true) |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User added successfully",
  "user": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "email": "newuser@gov.gd",
    "name": "New User",
    "role_code": "staff_mda",
    "entity_id": "MIN-001",
    "is_active": true,
    "created_at": "2025-11-24T11:00:00Z"
  }
}
```

**Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "error": "Email already exists" | "Invalid role_id" | "Entity required for staff role"
}
```

---

#### PATCH /api/admin/users/[id]

Update user details (activate/deactivate, change role, reassign entity).

**Authentication:** Required (admin session with `admin` role)

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | User UUID |

**Request Body:**
```json
{
  "is_active": false,
  "role_id": 2,
  "entity_id": "DEPT-001"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| is_active | boolean | No | Activate/deactivate user |
| role_id | integer | No | Change role |
| entity_id | string | No | Change entity assignment |
| name | string | No | Update display name |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully"
}
```

---

#### DELETE /api/admin/users/[id]

Deactivate a user (soft delete - sets `is_active = FALSE`).

**Authentication:** Required (admin session with `admin` role)

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | User UUID |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

---

#### GET /api/admin/roles

List all available user roles.

**Authentication:** Required (admin session)

**Success Response (200 OK):**
```json
{
  "success": true,
  "roles": [
    {
      "role_id": 1,
      "role_code": "admin_dta",
      "role_name": "DTA Administrator",
      "role_type": "admin",
      "description": "Full system access for DTA administrators"
    },
    {
      "role_id": 2,
      "role_code": "staff_mda",
      "role_name": "MDA Staff Officer",
      "role_type": "staff",
      "description": "Entity-specific access for ministry/department staff"
    },
    {
      "role_id": 3,
      "role_code": "public_user",
      "role_name": "Public User",
      "role_type": "public",
      "description": "Limited public access (future use)"
    }
  ]
}
```

---

#### GET /api/admin/entities

List all entities for entity assignment (used when adding/editing staff users).

**Authentication:** Required (admin session)

**Success Response (200 OK):**
```json
{
  "success": true,
  "entities": [
    {
      "unique_entity_id": "MIN-001",
      "entity_name": "Ministry of Digital Transformation",
      "entity_type": "ministry"
    },
    {
      "unique_entity_id": "DEPT-001",
      "entity_name": "Department of e-Government",
      "entity_type": "department"
    },
    {
      "unique_entity_id": "AGY-001",
      "entity_name": "Digital Transformation Agency",
      "entity_type": "agency"
    }
  ]
}
```

---

#### GET /api/admin/service-providers

List all entities with their service provider status, or get only service providers.

**Authentication:** Required (admin session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| providers_only | boolean | No | If `true`, only return entities enabled as service providers |

**Success Response (200 OK):**
```json
{
  "success": true,
  "entities": [
    {
      "unique_entity_id": "MIN-001",
      "entity_name": "Ministry of Digital Transformation",
      "entity_type": "ministry",
      "is_service_provider": false
    },
    {
      "unique_entity_id": "AGY-005",
      "entity_name": "Digital Transformation Agency (DTA)",
      "entity_type": "agency",
      "is_service_provider": true
    }
  ]
}
```

**Example Request:**
```bash
# Get all entities with service provider status
curl https://gea.your-domain.com/api/admin/service-providers \
  -H "Cookie: next-auth.session-token=..."

# Get only service providers
curl https://gea.your-domain.com/api/admin/service-providers?providers_only=true \
  -H "Cookie: next-auth.session-token=..."
```

---

#### PUT /api/admin/service-providers

Update an entity's service provider status.

**Authentication:** Required (admin session)

**Request Body:**
```json
{
  "entity_id": "AGY-005",
  "is_service_provider": true
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Digital Transformation Agency (DTA) is now a service provider"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "entity_id and is_service_provider are required"
}
```

**Example Request:**
```bash
# Enable entity as service provider
curl -X PUT https://gea.your-domain.com/api/admin/service-providers \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"entity_id": "AGY-005", "is_service_provider": true}'
```

---

### 2. Ticket Management

#### GET /api/admin/tickets/dashboard-stats

Get ticket dashboard statistics and metrics.

**Authentication:** Required (admin session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| entity_id | string | No | Filter by entity ID |

**Example Request:**
```
GET /api/admin/tickets/dashboard-stats?entity_id=DEPT-001
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_tickets": 45,
    "status_breakdown": {
      "new": { "name": "New", "count": 12, "color": "#3B82F6" },
      "in_progress": { "name": "In Progress", "count": 18, "color": "#8B5CF6" },
      "resolved": { "name": "Resolved", "count": 10, "color": "#10B981" },
      "closed": { "name": "Closed", "count": 5, "color": "#6B7280" }
    },
    "priority_breakdown": {
      "low": { "name": "Low", "count": 15, "color": "#10B981" },
      "medium": { "name": "Medium", "count": 20, "color": "#F59E0B" },
      "high": { "name": "High", "count": 8, "color": "#EF4444" },
      "urgent": { "name": "Urgent", "count": 2, "color": "#DC2626" }
    },
    "metrics": {
      "overdue_tickets": 3,
      "avg_resolution_time": "2.5 days",
      "sla_compliance": "94%"
    }
  }
}
```

---

#### GET /api/admin/tickets/list

Get paginated list of tickets with filtering and sorting.

**Authentication:** Required (admin session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| entity_id | string | No | Filter by entity ID |
| service_id | string | No | Filter by service ID |
| status | string | No | Filter by status code |
| priority | string | No | Filter by priority code |
| search | string | No | Search in subject/description |
| sort_by | string | No | Sort field (default: created_at) |
| sort_order | string | No | asc or desc (default: desc) |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Results per page (default: 20, max: 100) |

**Example Request:**
```
GET /api/admin/tickets/list?status=in_progress&sort_by=priority&page=1&limit=20
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "ticket_id": 123,
        "ticket_number": "202511-000123",
        "subject": "Unable to download form",
        "status": { "id": 2, "name": "In Progress", "code": "in_progress" },
        "priority": { "id": 3, "name": "High", "code": "high" },
        "service": { "id": "SVC-IMM-001", "name": "Work Permit Application" },
        "entity": { "id": "DEPT-001", "name": "Department of Immigration" },
        "requester": {
          "category": "citizen",
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "created_at": "2025-11-20T10:30:00Z",
        "updated_at": "2025-11-20T14:15:00Z",
        "sla_target": "2025-11-22T10:30:00Z",
        "is_overdue": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_pages": 3,
      "total_count": 45,
      "has_next": true,
      "has_prev": false
    },
    "filters": {
      "entity_id": null,
      "status": "in_progress",
      "priority": null,
      "search": null
    },
    "sort": {
      "by": "priority",
      "order": "desc"
    }
  }
}
```

---

#### GET /api/admin/tickets/[id]/details

Get complete ticket details with activity history and attachments.

**Authentication:** Required (admin session)

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Ticket ID (numeric) |

**Example Request:**
```
GET /api/admin/tickets/123/details
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ticket": {
      "ticket_id": 123,
      "ticket_number": "202511-000123",
      "subject": "Unable to download form",
      "description": "The PDF link on the website returns a 404 error...",
      "status": { "id": 2, "name": "In Progress", "code": "in_progress" },
      "priority": { "id": 3, "name": "High", "code": "high" },
      "service": { "id": "SVC-IMM-001", "name": "Work Permit Application" },
      "entity": { "id": "DEPT-001", "name": "Department of Immigration" },
      "requester": {
        "category": "citizen",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1473555001"
      },
      "created_at": "2025-11-20T10:30:00Z",
      "updated_at": "2025-11-20T14:15:00Z",
      "sla_target": "2025-11-22T10:30:00Z",
      "feedback_id": null
    },
    "activities": [
      {
        "activity_id": 3,
        "activity_type": "internal_note",
        "performed_by": "admin",
        "description": "Investigating the issue with the IT team",
        "created_at": "2025-11-20T14:30:00Z"
      },
      {
        "activity_id": 2,
        "activity_type": "status_change",
        "performed_by": "admin",
        "description": "Status changed from New to In Progress",
        "created_at": "2025-11-20T14:15:00Z"
      },
      {
        "activity_id": 1,
        "activity_type": "created",
        "performed_by": "system",
        "description": "Ticket created",
        "created_at": "2025-11-20T10:30:00Z"
      }
    ],
    "attachments": []
  }
}
```

---

#### PATCH /api/admin/tickets/[id]/update

Update ticket status, priority, or add internal notes.

**Authentication:** Required (admin session)

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Ticket ID (numeric) |

**Request Body:**
```json
{
  "status_id": 3,
  "priority_id": 2,
  "internal_note": "Issue has been escalated to IT department. Expected resolution within 24 hours.",
  "performed_by": "admin"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status_id | integer | No | New status ID |
| priority_id | integer | No | New priority ID |
| internal_note | string | No | Add internal note (max 5000 chars) |
| performed_by | string | Yes | Username performing action |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ticket_id": 123,
    "ticket_number": "202511-000123",
    "updated_fields": ["status_id", "internal_note"],
    "new_status": "Resolved",
    "new_priority": null,
    "note_added": true,
    "activities_created": 2,
    "updated_at": "2025-11-20T16:45:00Z"
  },
  "message": "Ticket updated successfully"
}
```

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "details": "Invalid status_id: Status not found"
}
```

**Example cURL:**
```bash
curl -X PATCH https://gea.your-domain.com/api/admin/tickets/123/update \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status_id": 3,
    "internal_note": "Issue resolved. PDF link has been fixed.",
    "performed_by": "admin"
  }'
```

---

### 2. Authentication

#### POST /api/admin/auth/login

Admin login with password.

**Rate Limit:** 5 attempts per 15 minutes

**Request Body:**
```json
{
  "password": "your_admin_password"
}
```

**Parameters:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| password | string | Yes | Min 8 chars, must contain letters, numbers, special chars | Admin password |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "session_expires_at": "2025-11-20T12:30:00Z"
  },
  "message": "Login successful"
}
```

**Sets HTTP-only cookie:**
```
Set-Cookie: admin_session=<encrypted_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=7200
```

**Invalid Password (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid password"
  }
}
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_ATTEMPTS",
    "message": "Too many login attempts. Please try again in 15 minutes.",
    "retryAfter": "2025-11-20T11:00:00Z"
  }
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "SecureP@ssw0rd123"}' \
  -c cookies.txt
```

---

#### GET /api/admin/auth/check

Check authentication status.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "session_expires_at": "2025-11-20T12:30:00Z"
  }
}
```

**Not Authenticated (200 OK):**
```json
{
  "success": true,
  "data": {
    "authenticated": false
  }
}
```

**Example cURL:**
```bash
curl https://gea.your-domain.com/api/admin/auth/check \
  -b cookies.txt
```

---

#### POST /api/admin/auth/logout

Destroy admin session.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/admin/auth/logout \
  -b cookies.txt
```

---

### 4. EA Service Requests

#### GET /api/admin/service-requests

List EA service requests with filtering and pagination.

**Authentication:** Required (admin/staff session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| view | string | No | `submitted` (requests from your entity), `received` (requests to your entity - service providers only), `all` (admin only) |
| status | string | No | Filter by status: `Draft`, `Submitted`, `In Progress`, `Completed`, `Cancelled` |
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 20) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "request_number": "EA-20260115-0001",
      "service_id": "SVC-ARCH-001",
      "service_name": "Architecture Review",
      "entity_id": "DEPT-001",
      "entity_name": "Department of e-Government",
      "service_provider_entity_id": "AGY-005",
      "service_provider_entity_name": "Digital Transformation Agency (DTA)",
      "requester_name": "John Smith",
      "requester_email": "john@gov.gd",
      "status": "Submitted",
      "priority": "Medium",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "is_service_provider": true
}
```

**Example Requests:**
```bash
# Get submitted requests (from your entity)
curl https://gea.your-domain.com/api/admin/service-requests?view=submitted \
  -H "Cookie: next-auth.session-token=..."

# Get received requests (for service provider entities)
curl https://gea.your-domain.com/api/admin/service-requests?view=received \
  -H "Cookie: next-auth.session-token=..."

# Get all requests (admin only)
curl https://gea.your-domain.com/api/admin/service-requests?view=all \
  -H "Cookie: next-auth.session-token=..."
```

---

#### GET /api/admin/service-requests/stats

Get service request statistics.

**Authentication:** Required (admin/staff session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| view | string | No | `submitted`, `received`, or `all` - affects which requests are counted |

**Success Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "total": 25,
    "by_status": {
      "Draft": 2,
      "Submitted": 5,
      "In Progress": 10,
      "Completed": 8
    },
    "by_priority": {
      "High": 3,
      "Medium": 15,
      "Low": 7
    }
  }
}
```

---

### 3. System Settings Management

Admin-only API for managing 100+ system-wide configuration settings across 9 categories with AES-256-GCM encryption for sensitive values.

#### GET /api/admin/settings

Retrieve all system settings (with sensitive values encrypted).

**Authentication:** Required (admin session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | No | Filter by category (system, authentication, integrations, etc.) |
| decrypt | boolean | No | Decrypt sensitive values (admin only, default: false) |

**Example Request:**
```
GET /api/admin/settings?category=integrations&decrypt=true
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "settings": [
      {
        "id": 1,
        "category": "integrations",
        "setting_key": "sendgrid_api_key",
        "setting_value": "SG.xxxxx",
        "data_type": "string",
        "is_encrypted": true,
        "description": "SendGrid API key for email delivery",
        "updated_at": "2026-01-19T10:00:00Z",
        "updated_by": "admin@your-domain.com"
      },
      {
        "id": 2,
        "category": "integrations",
        "setting_key": "sendgrid_from_email",
        "setting_value": "noreply@gov.gd",
        "data_type": "string",
        "is_encrypted": false,
        "description": "Default sender email address",
        "updated_at": "2026-01-19T10:00:00Z",
        "updated_by": "admin@your-domain.com"
      }
    ],
    "categories": [
      "system",
      "authentication",
      "integrations",
      "business_rules",
      "performance",
      "content",
      "user_management",
      "service_providers",
      "database"
    ],
    "total": 100
  }
}
```

---

#### PUT /api/admin/settings

Update one or more system settings (with automatic encryption for sensitive values).

**Authentication:** Required (admin session)

**Request Body:**
```json
{
  "settings": [
    {
      "setting_key": "sendgrid_api_key",
      "setting_value": "SG.new_api_key_here"
    },
    {
      "setting_key": "system_title",
      "setting_value": "GEA Portal - Grenada"
    }
  ]
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| settings | array | Yes | Array of settings to update |
| settings[].setting_key | string | Yes | Setting key (e.g., "sendgrid_api_key") |
| settings[].setting_value | string | Yes | New value (auto-encrypted if marked as sensitive) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "2 settings updated successfully",
  "data": {
    "updated_count": 2,
    "updated_keys": [
      "sendgrid_api_key",
      "system_title"
    ],
    "audit_log_ids": [123, 124]
  }
}
```

**Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid setting values",
    "details": [
      {
        "setting_key": "max_file_upload_size",
        "error": "Value must be a number between 1 and 10485760"
      }
    ]
  }
}
```

---

#### POST /api/admin/settings/test-sms

Test SMS delivery using Twilio settings.

**Authentication:** Required (admin session)

**Request Body:**
```json
{
  "phone_number": "+14735551234",
  "message": "Test message from GEA Portal"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Test SMS sent successfully",
  "data": {
    "phone_number": "+14735551234",
    "message_sid": "SM...",
    "status": "sent",
    "timestamp": "2026-01-19T10:00:00Z"
  }
}
```

**Twilio Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": {
    "code": "TWILIO_ERROR",
    "message": "Failed to send SMS",
    "details": "Invalid Twilio credentials or insufficient balance"
  }
}
```

---

#### POST /api/admin/settings/test-email

Test email delivery using SendGrid settings.

**Authentication:** Required (admin session)

**Request Body:**
```json
{
  "to_email": "test@example.com",
  "subject": "Test Email",
  "body": "This is a test email from GEA Portal settings."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "data": {
    "to_email": "test@example.com",
    "message_id": "abc123",
    "status": "sent",
    "timestamp": "2026-01-19T10:00:00Z"
  }
}
```

**SendGrid Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": {
    "code": "SENDGRID_ERROR",
    "message": "Failed to send email",
    "details": "Invalid SendGrid API key"
  }
}
```

---

#### GET /api/admin/settings/audit-log

Retrieve audit log for settings changes.

**Authentication:** Required (admin session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| setting_key | string | No | Filter by setting key |
| user_email | string | No | Filter by user who made changes |
| start_date | string | No | Start date (YYYY-MM-DD) |
| end_date | string | No | End date (YYYY-MM-DD) |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Records per page (default: 50, max: 200) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "audit_logs": [
      {
        "log_id": 123,
        "setting_key": "sendgrid_api_key",
        "old_value": "SG.old***",
        "new_value": "SG.new***",
        "changed_by": "admin@your-domain.com",
        "changed_at": "2026-01-19T10:00:00Z",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total_count": 150,
      "total_pages": 3
    }
  }
}
```

---

### 4. Database Backup & Restore

Admin-only API for PostgreSQL database backup and restore operations.

#### GET /api/admin/database/backups

List all database backups.

**Authentication:** Required (admin session)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | Filter by type: "manual" or "automated" |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Records per page (default: 20, max: 100) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "backup_id": "uuid",
        "backup_name": "manual_backup_2026-01-19_10-00",
        "backup_type": "manual",
        "file_name": "backup_2026-01-19_10-00.sql.gz",
        "file_size_mb": 45.2,
        "status": "completed",
        "created_by": "admin@your-domain.com",
        "created_at": "2026-01-19T10:00:00Z",
        "completed_at": "2026-01-19T10:05:00Z",
        "retention_until": "2026-04-19T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_count": 45,
      "total_pages": 3
    },
    "storage": {
      "total_backups": 45,
      "total_size_gb": 12.8,
      "last_automated_backup": "2026-01-19T00:00:00Z"
    }
  }
}
```

---

#### POST /api/admin/database/backups

Create a new manual database backup.

**Authentication:** Required (admin session)

**Request Body:**
```json
{
  "backup_name": "pre_migration_backup",
  "description": "Backup before data migration",
  "compression": true
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| backup_name | string | No | Custom backup name (auto-generated if not provided) |
| description | string | No | Backup description |
| compression | boolean | No | Compress backup file (default: true) |

**Success Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Backup started successfully",
  "data": {
    "backup_id": "uuid",
    "backup_name": "pre_migration_backup",
    "status": "in_progress",
    "estimated_completion": "2026-01-19T10:10:00Z"
  }
}
```

---

#### GET /api/admin/database/backups/[id]

Get details of a specific backup.

**Authentication:** Required (admin session)

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Backup UUID |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "backup_id": "uuid",
    "backup_name": "manual_backup_2026-01-19_10-00",
    "backup_type": "manual",
    "file_name": "backup_2026-01-19_10-00.sql.gz",
    "file_size_mb": 45.2,
    "status": "completed",
    "description": "Pre-migration backup",
    "compression": true,
    "database_name": "feedback",
    "created_by": "admin@your-domain.com",
    "created_at": "2026-01-19T10:00:00Z",
    "completed_at": "2026-01-19T10:05:00Z",
    "retention_until": "2026-04-19T10:00:00Z",
    "metadata": {
      "tables_count": 40,
      "rows_count": 125000,
      "pg_version": "16.1"
    }
  }
}
```

---

#### POST /api/admin/database/backups/[id]/restore

Restore database from a backup.

**Authentication:** Required (admin session)

**CRITICAL WARNING:** This operation will overwrite the current database. Use with extreme caution.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Backup UUID |

**Request Body:**
```json
{
  "confirm": true,
  "confirmation_phrase": "RESTORE DATABASE"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| confirm | boolean | Yes | Must be true |
| confirmation_phrase | string | Yes | Must be exactly "RESTORE DATABASE" |

**Success Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Database restore initiated",
  "data": {
    "restore_id": "uuid",
    "backup_id": "uuid",
    "status": "in_progress",
    "estimated_completion": "2026-01-19T10:20:00Z",
    "warning": "All current data will be replaced with backup data"
  }
}
```

**Validation Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid confirmation",
    "details": "You must provide confirmation_phrase: 'RESTORE DATABASE'"
  }
}
```

---

#### DELETE /api/admin/database/backups/[id]

Delete a manual backup file.

**Authentication:** Required (admin session)

**Note:** Automated backups cannot be deleted manually.

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Backup UUID |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Backup deleted successfully",
  "data": {
    "backup_id": "uuid",
    "freed_space_mb": 45.2
  }
}
```

---

#### GET /api/admin/database/backups/schedule

Get automated backup schedule configuration.

**Authentication:** Required (admin session)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "frequency": "daily",
    "time": "00:00",
    "timezone": "America/Grenada",
    "retention_days": 90,
    "compression": true,
    "last_run": "2026-01-19T00:00:00Z",
    "next_run": "2026-01-20T00:00:00Z"
  }
}
```

---

#### PUT /api/admin/database/backups/schedule

Update automated backup schedule.

**Authentication:** Required (admin session)

**Request Body:**
```json
{
  "enabled": true,
  "frequency": "daily",
  "time": "02:00",
  "retention_days": 90
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| enabled | boolean | Yes | Enable/disable automated backups |
| frequency | string | Yes | "daily", "weekly", or "monthly" |
| time | string | Yes | Time in HH:mm format (24-hour) |
| retention_days | integer | Yes | Days to keep backups (7-365) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Backup schedule updated successfully",
  "data": {
    "enabled": true,
    "frequency": "daily",
    "time": "02:00",
    "retention_days": 90,
    "next_run": "2026-01-20T02:00:00Z"
  }
}
```

---

## Master Data Management APIs

**All endpoints require admin authentication.**

### 1. Entities

#### GET /api/managedata/entities

List all entities (ministries, departments, agencies).

**Authentication:** Required (admin session)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "unique_entity_id": "MIN-001",
      "entity_name": "Ministry of Digital Transformation",
      "entity_type": "ministry",
      "parent_entity_id": null,
      "contact_email": "dta@gov.gd",
      "contact_phone": "+1473440-2255",
      "description": "Lead ministry for digital transformation initiatives",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "services_count": 3
    },
    {
      "unique_entity_id": "DEPT-001",
      "entity_name": "Department of Immigration",
      "entity_type": "department",
      "parent_entity_id": "MIN-001",
      "contact_email": "immigration@gov.gd",
      "is_active": true,
      "services_count": 5
    }
  ]
}
```

**Example cURL:**
```bash
curl https://gea.your-domain.com/api/managedata/entities \
  -b cookies.txt
```

---

#### POST /api/managedata/entities

Create new entity.

**Authentication:** Required

**Request Body:**
```json
{
  "unique_entity_id": "DEPT-002",
  "entity_name": "Department of Customs",
  "entity_type": "department",
  "parent_entity_id": "MIN-001",
  "contact_email": "customs@gov.gd",
  "contact_phone": "+1473440-3333",
  "description": "Customs and border control",
  "is_active": true
}
```

**Parameters:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| unique_entity_id | string | Yes | Unique, format: MIN-XXX, DEPT-XXX, AGY-XXX, STAT-XXX | Entity ID |
| entity_name | string | Yes | Max 255 chars, unique | Entity name |
| entity_type | string | Yes | ministry, department, agency, statutory_body | Entity type |
| parent_entity_id | string | No | Valid entity ID | Parent entity |
| contact_email | string | No | Valid email | Contact email |
| contact_phone | string | No | Max 50 chars | Contact phone |
| description | text | No | | Description |
| is_active | boolean | No | Default: true | Active status |

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "unique_entity_id": "DEPT-002",
    "entity_name": "Department of Customs",
    "entity_type": "department",
    "created_at": "2025-11-20T10:30:00Z"
  },
  "message": "Entity created successfully"
}
```

**Duplicate ID (409 Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ENTITY_ID",
    "message": "Entity ID already exists"
  }
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/managedata/entities \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "unique_entity_id": "DEPT-002",
    "entity_name": "Department of Customs",
    "entity_type": "department",
    "parent_entity_id": "MIN-001",
    "contact_email": "customs@gov.gd"
  }'
```

---

#### PUT /api/managedata/entities/[id]

Update entity details.

**Authentication:** Required

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Entity ID (e.g., DEPT-001) |

**Request Body:**
```json
{
  "entity_name": "Department of Immigration Services",
  "contact_email": "immigration_new@gov.gd",
  "contact_phone": "+1473440-2222",
  "description": "Updated description"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unique_entity_id": "DEPT-001",
    "entity_name": "Department of Immigration Services",
    "updated_at": "2025-11-20T10:35:00Z"
  },
  "message": "Entity updated successfully"
}
```

**Example cURL:**
```bash
curl -X PUT https://gea.your-domain.com/api/managedata/entities/DEPT-001 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "entity_name": "Department of Immigration Services",
    "contact_email": "immigration_new@gov.gd"
  }'
```

---

#### GET /api/managedata/entities/next-id

Get suggested next entity ID based on type.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | ministry, department, agency, statutory_body |

**Example Request:**
```
GET /api/managedata/entities/next-id?type=department
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "suggested_id": "DEPT-003",
    "type": "department",
    "prefix": "DEPT"
  }
}
```

**Example cURL:**
```bash
curl "https://gea.your-domain.com/api/managedata/entities/next-id?type=department" \
  -b cookies.txt
```

---

### 2. Services

#### GET /api/managedata/services

List all services.

**Authentication:** Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "unique_service_id": "SVC-IMM-001",
      "service_name": "Work Permit Application",
      "entity_id": "DEPT-001",
      "entity_name": "Department of Immigration",
      "category": "Immigration",
      "description": "Apply for work permit to work in Grenada",
      "service_type": "public",
      "sla_hours": 48,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "feedback_count": 450,
      "avg_rating": 4.5
    }
  ]
}
```

---

#### POST /api/managedata/services

Create new service.

**Authentication:** Required

**Request Body:**
```json
{
  "unique_service_id": "SVC-CUS-002",
  "service_name": "Import Duty Calculation",
  "entity_id": "DEPT-002",
  "category": "Customs",
  "description": "Calculate import duties for goods",
  "service_type": "public",
  "sla_hours": 24,
  "is_active": true
}
```

**Parameters:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| unique_service_id | string | Yes | Unique, format: SVC-XXX-XXX | Service ID |
| service_name | string | Yes | Max 255 chars, unique | Service name |
| entity_id | string | Yes | Valid entity ID | Owning entity |
| category | string | No | Max 100 chars | Service category |
| description | text | No | | Description |
| service_type | string | No | public, ea_only (default: public) | Service type |
| sla_hours | integer | No | Default: 48 | SLA target hours |
| is_active | boolean | No | Default: true | Active status |

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "unique_service_id": "SVC-CUS-002",
    "service_name": "Import Duty Calculation",
    "created_at": "2025-11-20T10:30:00Z"
  },
  "message": "Service created successfully"
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/managedata/services \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "unique_service_id": "SVC-CUS-002",
    "service_name": "Import Duty Calculation",
    "entity_id": "DEPT-002",
    "category": "Customs",
    "sla_hours": 24
  }'
```

---

#### PUT /api/managedata/services/[id]

Update service details.

**Authentication:** Required

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Service ID (e.g., SVC-IMM-001) |

**Request Body:**
```json
{
  "service_name": "Work Permit Application (Updated)",
  "description": "Updated description",
  "sla_hours": 72
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unique_service_id": "SVC-IMM-001",
    "service_name": "Work Permit Application (Updated)",
    "updated_at": "2025-11-20T10:35:00Z"
  },
  "message": "Service updated successfully"
}
```

---

#### GET /api/managedata/services/next-id

Get suggested next service ID based on category.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | Yes | Service category (Immigration, Tax, Customs, etc.) |

**Example Request:**
```
GET /api/managedata/services/next-id?category=Immigration
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "suggested_id": "SVC-IMM-003",
    "category": "Immigration",
    "prefix": "SVC-IMM"
  }
}
```

**Category Prefix Mapping:**
```
Immigration → SVC-IMM
Tax & Revenue → SVC-TAX
Customs → SVC-CUS
Registration → SVC-REG
Licensing → SVC-LIC
Labour → SVC-LAB
Other → SVC-OTH
```

---

### 3. QR Codes

#### GET /api/managedata/qrcodes

List all QR codes.

**Authentication:** Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "qr_code": "QR-DTA-001",
      "service_id": "SVC-IMM-001",
      "service_name": "Work Permit Application",
      "entity_id": "DEPT-001",
      "entity_name": "Department of Immigration",
      "location": "Maurice Bishop Airport - Immigration Counter",
      "deployment_date": "2025-01-15",
      "is_active": true,
      "scan_count": 145,
      "last_scanned_at": "2025-11-20T09:15:00Z",
      "created_at": "2025-01-10T00:00:00Z"
    }
  ]
}
```

---

#### POST /api/managedata/qrcodes

Create new QR code.

**Authentication:** Required

**Request Body:**
```json
{
  "qr_code": "QR-DTA-003",
  "service_id": "SVC-TAX-001",
  "entity_id": "DEPT-002",
  "location": "Tax Office - St. George's Front Desk",
  "deployment_date": "2025-11-25",
  "is_active": true
}
```

**Parameters:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| qr_code | string | Yes | Unique, max 50 chars | QR code identifier |
| service_id | string | Yes | Valid service ID | Linked service |
| entity_id | string | Yes | Valid entity ID | Service entity |
| location | string | No | Max 255 chars | Physical location |
| deployment_date | date | No | ISO 8601 (YYYY-MM-DD) | Deployment date |
| is_active | boolean | No | Default: true | Active status |

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "qr_code": "QR-DTA-003",
    "service_name": "Property Tax Payment",
    "location": "Tax Office - St. George's Front Desk",
    "created_at": "2025-11-20T10:30:00Z"
  },
  "message": "QR code created successfully"
}
```

**Example cURL:**
```bash
curl -X POST https://gea.your-domain.com/api/managedata/qrcodes \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "qr_code": "QR-DTA-003",
    "service_id": "SVC-TAX-001",
    "entity_id": "DEPT-002",
    "location": "Tax Office - St. George''s Front Desk"
  }'
```

---

#### PUT /api/managedata/qrcodes/[id]

Update QR code details.

**Authentication:** Required

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | QR code identifier (e.g., QR-DTA-001) |

**Request Body:**
```json
{
  "location": "Updated location",
  "is_active": false
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qr_code": "QR-DTA-001",
    "location": "Updated location",
    "is_active": false
  },
  "message": "QR code updated successfully"
}
```

---

#### GET /api/managedata/qrcodes/next-id

Get suggested next QR code ID based on service.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| service_id | string | Yes | Service ID for QR code |

**Example Request:**
```
GET /api/managedata/qrcodes/next-id?service_id=SVC-IMM-001
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "suggested_id": "QR-IMM-004",
    "service_id": "SVC-IMM-001",
    "service_name": "Work Permit Application"
  }
}
```

---

## External API (Bot/Integration Access)

The External API provides programmatic access to GEA Portal dashboard data for external systems, bots, and integrations. This API uses API key authentication instead of OAuth sessions.

### Overview

| Feature | Description |
|---------|-------------|
| **Endpoint** | `/api/external/dashboard` |
| **Authentication** | API Key via `X-API-Key` header |
| **Rate Limit** | 100 requests/hour (Traefik-enforced) |
| **Data Access** | Full dashboard data (admin-level) |
| **Entity Filtering** | Optional via `entity_id` parameter |

### Authentication

External API uses API key authentication. The key must be passed in the `X-API-Key` HTTP header.

**Setup:**
1. Generate an API key: `openssl rand -hex 32`
2. Add to `.env`: `EXTERNAL_API_KEY=your-generated-key`
3. Restart containers: `docker-compose up -d`

**Security Notes:**
- API key provides full admin-level access to dashboard data
- Rotate keys periodically (90 days recommended)
- Never expose API keys in client-side code or logs
- Rate limiting is enforced at 100 requests/hour per IP

### GET /api/external/dashboard

Consolidated dashboard data endpoint that combines multiple data sections in a single API call.

**Authentication:** Required (X-API-Key header)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| include | string | No | Comma-separated sections to include (default: all) |
| entity_id | string | No | Filter data by entity ID |

**Available Sections:**

| Section | Description | Source Data |
|---------|-------------|-------------|
| `feedback` | Service feedback statistics | `/api/feedback/stats` |
| `tickets` | Ticket dashboard statistics | `/api/admin/tickets/dashboard-stats` |
| `leaderboard` | Service performance rankings | `/api/admin/service-leaderboard` |
| `requests` | EA service request statistics | `/api/admin/service-requests/stats` |
| `entities` | Entity master data | `/api/managedata/entities` |
| `services` | Service master data | `/api/managedata/services` |

**Example Requests:**

```bash
# Get all sections
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/dashboard"

# Get specific sections only
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/dashboard?include=feedback,tickets"

# Filter by entity
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/dashboard?entity_id=AGY-001"

# Combined: specific sections with entity filter
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/dashboard?include=feedback,requests&entity_id=MIN-001"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "feedback": {
      "overall": {
        "total_feedback": 1250,
        "average_rating": 4.2,
        "total_grievances": 45
      },
      "by_channel": [...],
      "rating_distribution": {...}
    },
    "tickets": {
      "total_tickets": 156,
      "status_breakdown": {...},
      "priority_breakdown": {...}
    },
    "leaderboard": {
      "services": [...],
      "entities": [...]
    },
    "requests": {
      "stats": {
        "submitted": 12,
        "in_progress": 8,
        "completed": 45,
        "total": 65
      },
      "recent_requests": [...]
    },
    "entities": [
      {
        "unique_entity_id": "MIN-001",
        "entity_name": "Ministry of Finance",
        "entity_type": "ministry",
        "is_active": true
      }
    ],
    "services": [
      {
        "unique_service_id": "SVC-TAX-001",
        "service_name": "Tax Filing",
        "entity_id": "MIN-001",
        "is_active": true
      }
    ]
  },
  "meta": {
    "included_sections": ["feedback", "tickets", "leaderboard", "requests", "entities", "services"],
    "entity_filter": null,
    "generated_at": "2025-12-17T10:30:00.000Z"
  }
}
```

**Error Responses:**

**No API Key (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid or missing API key"
}
```

**API Key Not Configured (503 Service Unavailable):**
```json
{
  "success": false,
  "error": "External API access not configured"
}
```

**Rate Limit Exceeded (429 Too Many Requests):**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
```

### GET /api/external/grievances

Query individual grievance records with filtering and pagination.

**Authentication:** Required (X-API-Key header)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: `open`, `in_progress`, `resolved`, `closed` |
| entity_id | string | No | Filter by entity ID |
| entity_name | string | No | Fuzzy search by entity name (case-insensitive) |
| service_id | string | No | Filter by service ID |
| service_name | string | No | Fuzzy search by service name |
| limit | integer | No | Max records (default: 50, max: 100) |
| offset | integer | No | Pagination offset (default: 0) |

**Example Request:**
```bash
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/grievances?status=open&limit=20"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "grievance_number": "GRV-2025-001",
      "subject": "Long wait time for service",
      "status": "open",
      "submitter_category": "citizen",
      "submitter_name": "J*** D***",
      "submitter_email": "j***@example.com",
      "submitter_phone": "***-1234",
      "incident_date": "2025-12-15",
      "assigned_to": null,
      "created_at": "2025-12-16T10:30:00Z",
      "updated_at": "2025-12-16T10:30:00Z",
      "resolved_at": null,
      "closed_at": null,
      "entity": { "id": "DEPT-001", "name": "Department of Immigration" },
      "service": { "id": "SVC-IMM-001", "name": "Work Permit Application" }
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  },
  "meta": {
    "filters": { "status": "open", "entity_id": null },
    "generated_at": "2025-12-18T10:30:00Z"
  }
}
```

**Note:** PII fields (submitter name, email, phone) are automatically masked.

---

### GET /api/external/tickets

Query individual ticket records with filtering and pagination.

**Authentication:** Required (X-API-Key header)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status code |
| priority | string | No | Filter by priority: `low`, `medium`, `high`, `urgent` |
| entity_id | string | No | Filter by assigned entity ID |
| entity_name | string | No | Fuzzy search by entity name |
| overdue | boolean | No | Set `true` to show only overdue tickets |
| limit | integer | No | Max records (default: 50, max: 100) |
| offset | integer | No | Pagination offset (default: 0) |

**Example Request:**
```bash
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/tickets?priority=high&overdue=true"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "ticket_number": "TKT-2025-001",
      "subject": "Unable to download form",
      "status": { "name": "In Progress", "code": "in_progress", "color": "#8B5CF6" },
      "priority": { "name": "High", "code": "HIGH", "color": "#EF4444" },
      "requester_category": "citizen",
      "contact_name": "J*** S***",
      "contact_email": "j***@example.com",
      "contact_phone": "***-5678",
      "sla": {
        "response_target": "2025-12-17T10:30:00Z",
        "resolution_target": "2025-12-19T10:30:00Z",
        "first_response_at": "2025-12-16T14:00:00Z",
        "resolved_at": null,
        "status": "overdue"
      },
      "created_at": "2025-12-16T10:30:00Z",
      "updated_at": "2025-12-17T14:15:00Z",
      "entity": { "id": "DEPT-001", "name": "Department of Immigration" }
    }
  ],
  "pagination": { "total": 8, "limit": 50, "offset": 0, "has_more": false },
  "meta": { "filters": { "priority": "high", "overdue": true }, "generated_at": "2025-12-18T10:30:00Z" }
}
```

---

### GET /api/external/feedback

Query individual feedback records with ratings and comments.

**Authentication:** Required (X-API-Key header)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| service_id | string | No | Filter by service ID |
| service_name | string | No | Fuzzy search by service name |
| entity_id | string | No | Filter by entity ID |
| entity_name | string | No | Fuzzy search by entity name |
| has_comment | boolean | No | `true` for feedback with comments only |
| has_grievance | boolean | No | `true` for grievance-flagged feedback |
| min_rating | integer | No | Minimum overall satisfaction (1-5) |
| max_rating | integer | No | Maximum overall satisfaction (1-5) |
| channel | string | No | Filter by channel: `portal`, `qr`, `kiosk` |
| limit | integer | No | Max records (default: 50, max: 100) |
| offset | integer | No | Pagination offset (default: 0) |

**Example Request:**
```bash
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/feedback?has_comment=true&min_rating=1&max_rating=2"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "feedback_id": 123,
      "ratings": {
        "ease": 2,
        "clarity": 2,
        "timeliness": 1,
        "trust": 2,
        "overall_satisfaction": 2
      },
      "grievance_flag": true,
      "comment": "Long wait time, staff was unhelpful",
      "recipient_group": "citizen",
      "channel": "portal",
      "created_at": "2025-12-16T10:30:00Z",
      "service": { "id": "SVC-IMM-001", "name": "Work Permit Application", "category": "Immigration" },
      "entity": { "id": "DEPT-001", "name": "Department of Immigration" }
    }
  ],
  "pagination": { "total": 15, "limit": 50, "offset": 0, "has_more": false },
  "meta": { "filters": { "has_comment": true, "min_rating": 1, "max_rating": 2 }, "generated_at": "2025-12-18T10:30:00Z" }
}
```

---

### GET /api/external/services/{id}/requirements

Get document requirements for a specific EA service.

**Authentication:** Required (X-API-Key header)

**Path Parameters:**

| Parameter | Description |
|-----------|-------------|
| id | Service ID (e.g., `digital-roadmap`, `compliance-review`) |

**Example Request:**
```bash
curl -H "X-API-Key: your-api-key" \
  "https://gea.your-domain.com/api/external/services/digital-roadmap/requirements"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "service": {
      "id": "digital-roadmap",
      "name": "Digital Roadmap Development",
      "category": "EA Services",
      "description": "Develop a digital transformation roadmap for your organization",
      "is_active": true,
      "entity": { "id": "AGY-005", "name": "Digital Transformation Agency" }
    },
    "requirements": [
      {
        "id": 1,
        "filename": "Senior leadership approval letter or email",
        "file_extension": "pdf",
        "is_mandatory": true,
        "description": "Approval for roadmap support request"
      },
      {
        "id": 2,
        "filename": "Digital vision / strategic plan",
        "file_extension": "docx",
        "is_mandatory": true,
        "description": "Vision document or strategic plan"
      },
      {
        "id": 3,
        "filename": "Organizational structure",
        "file_extension": "pdf",
        "is_mandatory": false,
        "description": "Organizational chart or structure document"
      }
    ],
    "summary": { "total": 5, "mandatory": 3, "optional": 2 }
  },
  "meta": { "generated_at": "2025-12-18T10:30:00Z" }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "Service not found: invalid-service-id"
}
```

---

### Bot API Selection Guide

A natural language guide for helping bots choose the right endpoint is available at:
```
https://gea.your-domain.com/bot-api-prompt.md
```

This can be included in a bot's system prompt to help it select the appropriate API.

---

### OpenAPI Specification

A complete OpenAPI 3.1.0 specification is available at:
```
https://gea.your-domain.com/openapi.yaml
```

This can be used with API documentation tools (Swagger UI, Redoc) or code generators.

### Bot Integration Example (Python)

```python
import requests

API_KEY = "your-api-key"
BASE_URL = "https://gea.your-domain.com/api/external/dashboard"

def get_dashboard_data(sections=None, entity_id=None):
    """Fetch dashboard data from GEA Portal External API."""
    headers = {"X-API-Key": API_KEY}
    params = {}

    if sections:
        params["include"] = ",".join(sections)
    if entity_id:
        params["entity_id"] = entity_id

    response = requests.get(BASE_URL, headers=headers, params=params)
    response.raise_for_status()
    return response.json()

# Get all dashboard data
data = get_dashboard_data()
print(f"Total feedback: {data['data']['feedback']['overall']['total_feedback']}")

# Get only feedback and ticket stats
stats = get_dashboard_data(sections=["feedback", "tickets"])

# Get data for specific entity
entity_data = get_dashboard_data(entity_id="AGY-001")

# Get leaderboard for specific entity
leaderboard = get_dashboard_data(sections=["leaderboard"], entity_id="MIN-001")
```

### Bot Integration Example (JavaScript/Node.js)

```javascript
const API_KEY = 'your-api-key';
const BASE_URL = 'https://gea.your-domain.com/api/external/dashboard';

async function getDashboardData(sections = null, entityId = null) {
  const params = new URLSearchParams();

  if (sections) params.set('include', sections.join(','));
  if (entityId) params.set('entity_id', entityId);

  const url = `${BASE_URL}${params.toString() ? '?' + params : ''}`;

  const response = await fetch(url, {
    headers: { 'X-API-Key': API_KEY }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Usage
const data = await getDashboardData();
console.log('Total tickets:', data.data.tickets.total_tickets);

// Get specific sections
const stats = await getDashboardData(['feedback', 'requests']);

// Filter by entity
const entityData = await getDashboardData(null, 'AGY-005');
```

### Environment Configuration

**Required in `.env`:**
```bash
# External API Access (generate with: openssl rand -hex 32)
# Leave empty to disable external API access
EXTERNAL_API_KEY=your-64-character-hex-key
```

**Docker Compose (already configured):**
```yaml
# In frontend environment section
- EXTERNAL_API_KEY=${EXTERNAL_API_KEY}

# Traefik rate limiting labels
- "traefik.http.middlewares.external-api-ratelimit.ratelimit.average=100"
- "traefik.http.middlewares.external-api-ratelimit.ratelimit.burst=20"
- "traefik.http.middlewares.external-api-ratelimit.ratelimit.period=1h"
```

### Testing the External API

```bash
# Set your API key
export API_KEY="your-api-key"

# Test: All sections (default)
curl -H "X-API-Key: $API_KEY" \
  "https://gea.your-domain.com/api/external/dashboard"

# Test: Specific sections only
curl -H "X-API-Key: $API_KEY" \
  "https://gea.your-domain.com/api/external/dashboard?include=entities,services"

# Test: Invalid key (expect 401)
curl -H "X-API-Key: invalid-key" \
  "https://gea.your-domain.com/api/external/dashboard"

# Test: No key (expect 401)
curl "https://gea.your-domain.com/api/external/dashboard"

# Test rate limiting (run 101+ times)
for i in {1..105}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-API-Key: $API_KEY" \
    "https://gea.your-domain.com/api/external/dashboard?include=entities")
  echo "Request $i: $status"
done
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "field_name",
        "message": "Field-specific error"
      }
    ]
  },
  "meta": {
    "request_id": "req_abc123xyz",
    "timestamp": "2025-11-20T10:30:00Z"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation errors, malformed requests |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource (e.g., ID already exists) |
| 413 | Payload Too Large | File size exceeds limit |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Database connection failed |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| INVALID_CREDENTIALS | 401 | Wrong password |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| TICKET_NOT_FOUND | 404 | Ticket doesn't exist |
| SERVICE_NOT_FOUND | 404 | Service doesn't exist |
| QR_CODE_NOT_FOUND | 404 | QR code doesn't exist |
| DUPLICATE_ENTITY_ID | 409 | Entity ID already exists |
| DUPLICATE_SERVICE_ID | 409 | Service ID already exists |
| FILE_TOO_LARGE | 413 | File exceeds 5MB |
| DATABASE_ERROR | 500 | Database query failed |
| INTERNAL_ERROR | 500 | Unexpected server error |

### Example Error Responses

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "rating",
        "message": "Rating must be between 1 and 5"
      },
      {
        "field": "contact_email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**Database Error (500):**
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Unable to connect to database. Please try again later.",
    "retry": true
  }
}
```

---

## Response Formats

### Success Response Format

```json
{
  "success": true,
  "data": {
    // Response data object or array
  },
  "message": "Optional success message",
  "meta": {
    "request_id": "req_abc123xyz",
    "timestamp": "2025-11-20T10:30:00Z",
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

### Pagination (Future)

For endpoints returning large datasets:

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "meta": {
    "page": 2,
    "per_page": 20,
    "total_pages": 10,
    "total_items": 195,
    "has_next": true,
    "has_prev": true
  },
  "links": {
    "first": "/api/endpoint?page=1",
    "prev": "/api/endpoint?page=1",
    "next": "/api/endpoint?page=3",
    "last": "/api/endpoint?page=10"
  }
}
```

---

## Testing Guide

### Using cURL

**Set base URL:**
```bash
BASE_URL="https://gea.your-domain.com"
```

**Test feedback submission:**
```bash
curl -X POST $BASE_URL/api/feedback/submit \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "SVC-IMM-001",
    "rating": 5,
    "channel": "web",
    "recipient_group": "citizen",
    "comments": "Test feedback",
    "contact_email": "test@example.com"
  }'
```

**Test admin login:**
```bash
curl -X POST $BASE_URL/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "your_password"}' \
  -c cookies.txt
```

**Test authenticated request:**
```bash
curl $BASE_URL/api/managedata/entities \
  -b cookies.txt
```

### Using Postman

**Import collection:** (Future: Provide Postman collection export)

1. Set environment variables:
   - `BASE_URL`: `https://gea.your-domain.com`
   - `ADMIN_PASSWORD`: Your admin password

2. Test endpoints:
   - Feedback → Submit Feedback
   - Admin → Login
   - Master Data → Get Entities

### Testing Rate Limits

```bash
# Send 6 requests rapidly (exceeds limit of 5/hour)
for i in {1..6}; do
  curl -X POST $BASE_URL/api/feedback/submit \
    -H "Content-Type: application/json" \
    -d '{
      "service_id": "SVC-IMM-001",
      "rating": 5,
      "recipient_group": "citizen",
      "contact_email": "test@example.com"
    }'
  echo "\nRequest $i completed"
done
```

### Database Verification

After API calls, verify database changes:

```bash
# Check feedback was created
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT * FROM service_feedback ORDER BY created_at DESC LIMIT 5;"

# Check ticket was created
docker exec -it feedback_db psql -U feedback_user -d feedback \
  -c "SELECT ticket_number, subject, status_id FROM tickets ORDER BY created_at DESC LIMIT 5;"
```

---

## Appendix

### Environment Variables

**Required for API functionality:**

```env
# Database
FEEDBACK_DB_HOST=feedback_db
FEEDBACK_DB_PORT=5432
FEEDBACK_DB_NAME=feedback
FEEDBACK_DB_USER=feedback_user
FEEDBACK_DB_PASSWORD=<password>

# SendGrid (Email notifications)
SENDGRID_API_KEY=<key>
SENDGRID_FROM_EMAIL=noreply@gov.gd
SENDGRID_FROM_NAME=GEA Portal

# Twilio (SMS OTP for citizen authentication)
TWILIO_ACCOUNT_SID=<account_sid>
TWILIO_AUTH_TOKEN=<auth_token>
TWILIO_VERIFY_SERVICE_SID=<verify_service_sid>
TWILIO_PHONE_NUMBER=<phone_number>

# Encryption (for sensitive settings values)
ENCRYPTION_KEY=<32-byte-hex-key>  # AES-256-GCM encryption key

# Admin & NextAuth
ADMIN_PASSWORD=<bcrypt_hashed_password>
ADMIN_SESSION_SECRET=<secret>
SERVICE_ADMIN_EMAIL=admin@your-domain.com
NEXTAUTH_SECRET=<nextauth_secret>
NEXTAUTH_URL=https://gea.your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<client_secret>

# Microsoft Azure AD OAuth (Optional)
AZURE_AD_CLIENT_ID=<client_id>
AZURE_AD_CLIENT_SECRET=<client_secret>
AZURE_AD_TENANT_ID=<tenant_id>

# Rate Limiting
EA_SERVICE_RATE_LIMIT=3
GRIEVANCE_RATE_LIMIT=3

# File Uploads
MAX_FILE_SIZE=5242880
MAX_TOTAL_UPLOAD_SIZE=26214400
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,gif,doc,docx,xls,xlsx

# API URLs
API_BASE_URL=https://gea.your-domain.com
NEXT_PUBLIC_API_BASE_URL=https://gea.your-domain.com

# Redis (Optional - for analytics caching)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<password>
```

### API Rate Limit Configuration

Modify in source code:

**File:** `frontend/src/app/lib/utils/ticketing.ts`

```typescript
const RATE_LIMITS = {
  feedback: { limit: 5, window: 3600000 }, // 5 per hour
  grievance: { limit: 3, window: 3600000 }, // 3 per hour
  ticket: { limit: 5, window: 3600000 },    // 5 per hour
  ticketStatus: { limit: 10, window: 3600000 } // 10 per hour
};
```

### Recent API Enhancements (v3.5 - January 19, 2026)

**Newly Implemented:**

1. **Citizen Portal Authentication** ✅
   - `POST /api/citizen/auth/send-otp` - Send SMS OTP via Twilio Verify
   - `POST /api/citizen/auth/verify-otp` - Verify OTP code
   - `POST /api/citizen/auth/complete-registration` - Complete new citizen registration
   - `POST /api/citizen/auth/login` - Password login for returning citizens
   - `POST /api/citizen/auth/logout` - Logout citizen session
   - `GET /api/citizen/auth/me` - Get current citizen profile
   - **Features:**
     - Passwordless phone-based authentication
     - E.164 phone validation with regional filtering (Grenada + 18 Caribbean countries)
     - Trusted device management (30-day cookies)
     - Account security with max OTP attempts and blocking
     - 24-hour session duration

2. **System Settings Management** ✅
   - `GET /api/admin/settings` - Retrieve all system settings
   - `PUT /api/admin/settings` - Update system settings
   - `POST /api/admin/settings/test-sms` - Test Twilio SMS delivery
   - `POST /api/admin/settings/test-email` - Test SendGrid email delivery
   - `GET /api/admin/settings/audit-log` - View settings change audit log
   - **Features:**
     - 100+ configurable settings across 9 categories
     - AES-256-GCM encryption for sensitive values (API keys, tokens, secrets)
     - Real-time validation before saving
     - Comprehensive audit logging (who, what, when, IP address)
     - Test functionality for integrations

3. **Database Backup & Restore** ✅
   - `GET /api/admin/database/backups` - List all backups
   - `POST /api/admin/database/backups` - Create manual backup
   - `GET /api/admin/database/backups/[id]` - Get backup details
   - `POST /api/admin/database/backups/[id]/restore` - Restore from backup
   - `DELETE /api/admin/database/backups/[id]` - Delete manual backup
   - `GET /api/admin/database/backups/schedule` - Get automated backup schedule
   - `PUT /api/admin/database/backups/schedule` - Update backup schedule
   - **Features:**
     - Manual and automated backups (daily/weekly/monthly)
     - Compression support (gzip)
     - Configurable retention periods (7-365 days)
     - Restore with confirmation safeguards
     - Backup metadata tracking (size, tables, rows)

4. **Technology Stack Updates** ✅
   - Upgraded to Next.js 16 (from 14)
   - PostgreSQL 16-alpine (from 15)
   - Added PgBouncer v1.23.1 for connection pooling
   - Added Redis 7.4.4-alpine for analytics caching
   - Twilio Verify API for SMS OTP
   - Dual authentication systems (NextAuth + Custom Citizen Auth)

### Future API Enhancements

**Planned endpoints (not yet implemented):**

1. **Ticket Assignments**
   - `PATCH /api/admin/tickets/:id/assign` - Assign ticket to user/team
   - `GET /api/admin/tickets/my-assignments` - Get tickets assigned to current user

2. **Advanced Analytics**
   - `GET /api/admin/analytics/sla-dashboard` - SLA compliance metrics
   - `GET /api/admin/analytics/service-performance` - Service-level metrics
   - `GET /api/admin/analytics/volume-trend` - Ticket volume trends
   - `GET /api/admin/analytics/resolution-time-by-category` - Performance by category

3. **Bulk Operations**
   - `PATCH /api/admin/tickets/bulk-update` - Update multiple tickets
   - `POST /api/admin/tickets/bulk-close` - Close multiple tickets

4. **Email Notifications**
   - Automatic email on ticket creation
   - Status change notifications to citizens
   - Resolution emails with final comment

5. **Webhooks**
   - `POST /api/webhooks/ticket-created` - Notify external systems
   - `POST /api/webhooks/ticket-resolved` - Resolution notifications
   - `POST /api/webhooks/ticket-escalated` - SLA breach alerts

---

## See Also

### Related Documentation

- **[Database Reference](DATABASE_REFERENCE.md)** - Complete database schema with all tables and relationships
- **[Authentication Guide](AUTHENTICATION.md)** - Comprehensive OAuth setup and user management guide
- **[Authentication Quick Reference](AUTHENTICATION.md)** - Quick commands for user management
- **[Complete Documentation Index](index.md)** - Overview of all documentation

### External Resources

- **[Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - Official Next.js API docs
- **[NextAuth Documentation](https://next-auth.js.org/)** - OAuth authentication library
- **[PostgreSQL Documentation](https://www.postgresql.org/docs/15/)** - Database reference
- **[Zod Schema Validation](https://zod.dev/)** - Input validation library

---

**Document Version:** 3.5
**Last Updated:** January 19, 2026
**Maintained By:** GEA Portal Development Team

---

## Changelog

### v3.5 (January 19, 2026)
- Added Citizen Portal Authentication API section (6 endpoints)
- Added System Settings Management API section (5 endpoints)
- Added Database Backup & Restore API section (7 endpoints)
- Updated Authentication & Authorization overview for dual auth systems
- Added citizen session structure documentation
- Updated technology stack (Next.js 16, PostgreSQL 16, PgBouncer, Redis)
- Added environment variables for Twilio, encryption, and OAuth
- Updated Recent API Enhancements section

### v3.4 (January 17, 2026)
- Added Admin Ticket Management endpoints
- Added Public Ticket Activity Timeline
- Updated database schema documentation

### v3.3 and earlier
- See git history for previous changes
