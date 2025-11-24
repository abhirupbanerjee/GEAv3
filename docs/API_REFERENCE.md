# GEA Portal v3 - API Reference

**Document Version:** 3.0
**Last Updated:** November 24, 2025
**API Base URL:** `https://gea.your-domain.com` (Production)
**Framework:** Next.js 14 App Router
**Authentication:** NextAuth v4 with OAuth (Google, Microsoft)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Rate Limiting](#rate-limiting)
4. [Public API Endpoints](#public-api-endpoints)
5. [Admin API Endpoints](#admin-api-endpoints)
6. [Master Data Management APIs](#master-data-management-apis)
7. [Error Handling](#error-handling)
8. [Response Formats](#response-formats)
9. [Testing Guide](#testing-guide)

---

## Overview

### API Architecture

The GEA Portal v3 uses **Next.js 14 App Router API Routes** for all backend functionality. All endpoints follow RESTful conventions and return JSON responses.

```
/frontend/src/app/api/
├── auth/              # NextAuth OAuth endpoints
├── feedback/          # Public service feedback endpoints
├── tickets/           # Public & internal ticket endpoints
├── helpdesk/          # Public ticket lookup
├── admin/             # Admin management APIs (users, roles, etc.)
└── managedata/        # Master data CRUD (admin)
```

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL 15 |
| Database Driver | node-postgres (pg) |
| Validation | Zod schemas |
| Authentication | NextAuth v4 with OAuth (Google, Microsoft) |
| Authorization | Role-based (Admin, Staff, Public) + Entity filtering |
| File Storage | PostgreSQL BYTEA |
| Email | SendGrid API |

### Base URL

**Production:** `https://gea.your-domain.com`
**Development:** `http://localhost:3000`

### API Versioning

Currently v1 (no version prefix in URL). Future versions will use `/api/v2/` prefix.

---

## Authentication & Authorization

### Overview

The GEA Portal uses **NextAuth v4** for authentication with OAuth providers. All authentication is handled via OAuth - no passwords are stored.

**Supported Providers:**
- Google OAuth 2.0
- Microsoft Azure AD (optional)

**Key Features:**
- OAuth-only authentication (no password storage)
- Role-based access control (Admin, Staff, Public)
- Entity-based data filtering for staff users
- Email whitelist authorization
- JWT session tokens (2-hour expiration)
- Comprehensive audit logging

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

When authenticated, the session object contains:

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
  expires: "2025-11-24T12:00:00Z"      // Session expiration (2 hours)
}
```

### Using Authentication in API Routes

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
| captcha_token | string | Conditional | | Required after threshold failures |

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

**CAPTCHA Required (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "code": "CAPTCHA_REQUIRED",
    "message": "CAPTCHA verification required. Please complete the challenge.",
    "captcha_site_key": "6Lf..."
  }
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

## Admin API Endpoints

### 1. User Management

#### GET /api/admin/users

List all users with their roles and entity assignments.

**Authentication:** Required (admin session with `admin` role)

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

**Authentication:** Required (admin session with `admin` role)

**Request Body:**
```json
{
  "email": "newuser@gov.gd",
  "name": "New User",
  "role_id": 2,
  "entity_id": "MIN-001"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email (must match OAuth account) |
| name | string | Yes | Full name |
| role_id | integer | Yes | Role ID (1=Admin, 2=Staff, 3=Public) |
| entity_id | string | Conditional | Required if role is Staff |

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
| 403 | Forbidden | CAPTCHA required, insufficient permissions |
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
| CAPTCHA_REQUIRED | 403 | CAPTCHA verification needed |
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

# Admin
ADMIN_PASSWORD=<bcrypt_hashed_password>
ADMIN_SESSION_SECRET=<secret>
SERVICE_ADMIN_EMAIL=admin@your-domain.com

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

### Recent API Enhancements (v2.1 - November 22, 2025)

**Newly Implemented:**

1. **Admin Ticket Management** ✅
   - `GET /api/admin/tickets/dashboard-stats` - Dashboard metrics with status/priority breakdown
   - `GET /api/admin/tickets/list` - Paginated ticket list with filtering and sorting
   - `GET /api/admin/tickets/[id]/details` - Complete ticket details with activity history
   - `PATCH /api/admin/tickets/[id]/update` - Update status/priority and add internal notes

2. **Public Ticket Activity Timeline** ✅
   - `GET /api/helpdesk/ticket/[ticketNumber]` - Enhanced with activity timeline
   - **Smart Privacy Controls:**
     - Open/In-Progress tickets: Internal notes hidden
     - Resolved/Closed tickets: Last internal note shown as "Resolution Comment"

3. **Database Schema Updates** ✅
   - `ticket_activity` table for activity logging
   - `ticket_attachments` table for file storage
   - Activity types: created, status_change, priority_change, internal_note

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

**Document Version:** 3.0
**Last Updated:** November 24, 2025
**Maintained By:** GEA Portal Development Team
