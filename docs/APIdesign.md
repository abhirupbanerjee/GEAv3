# GEA Ticket Management System - API Design Document

**Version:** 1.0  
**Date:** November 18, 2025  
**Status:** Production Ready  
**Audience:** Backend Developers, System Architects, Frontend Teams

---

## Executive Summary

The GEA Ticket Management System provides a comprehensive API suite replacing legacy osTicket with native ticket management capabilities. The system supports 13 primary endpoints across public submission, admin management, integration, and analytics layers, with built-in rate limiting, SLA tracking, and feedback integration.

### API Endpoints Overview

| # | Endpoint | Method | Auth | Rate Limit | Purpose |
|---|----------|--------|------|-----------|---------|
| 1 | `/api/tickets/submit` | POST | Public | 5/hr | Citizens submit new tickets |
| 2 | `/api/tickets/status/:number` | GET | Public | 10/hr | Check ticket status by number |
| 3 | `/api/tickets/categories` | GET | Public | 30/hr | List available ticket categories |
| 4 | `/api/admin/tickets` | GET | Admin | 100/hr | List all tickets (with filters) |
| 5 | `/api/admin/tickets/:id` | GET | Admin | 100/hr | Get complete ticket details |
| 6 | `/api/admin/tickets/:id` | PUT | Admin | 50/hr | Update ticket status/priority/assignment |
| 7 | `/api/admin/tickets/:id/close` | POST | Admin | 50/hr | Close/resolve ticket with notes |
| 8 | `/api/admin/tickets/:id/notes` | POST | Admin | 50/hr | Add internal notes to ticket |
| 9 | `/api/tickets/from-feedback` | POST | Service | Custom | Auto-create ticket from feedback (grievance/low rating) |
| 10 | `/api/admin/tickets/:id/link-feedback` | POST | Admin | 50/hr | Link existing feedback to ticket |
| 11 | `/api/admin/analytics/sla-dashboard` | GET | Admin | 100/hr | SLA compliance metrics by priority/status |
| 12 | `/api/admin/analytics/service-performance` | GET | Admin | 100/hr | Service-level metrics and satisfaction trends |
| 13 | `/api/admin/analytics/volume-trend` | GET | Admin | 100/hr | Ticket volume trends over time |

### Key Features
- **Public Access:** Anonymous ticket submission with CAPTCHA after threshold
- **Admin Portal:** Full CRUD operations with role-based access (DTA-team, MDA-officer, Performance-analyst)
- **SLA Tracking:** Real-time SLA compliance monitoring with breach detection
- **Feedback Integration:** Automatic ticket creation for grievances and low ratings (≤2)
- **Analytics:** Comprehensive dashboards for performance monitoring and trend analysis

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Core Endpoints](#core-endpoints)
4. [Admin Endpoints](#admin-endpoints)
5. [Integration Endpoints](#integration-endpoints)
6. [Analytics Endpoints](#analytics-endpoints)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Validation Rules](#validation-rules)
10. [Response Formats](#response-formats)

---

## API Overview

### Base URL
```
Development:  http://localhost:3000/api
Production:   https://gea.gov.gd/api
```

### API Capabilities
- Public ticket submission and status checking
- Admin ticket management and SLA monitoring
- Automatic feedback integration
- Real-time SLA tracking
- Analytics and performance metrics
- Rate limiting and CAPTCHA support
- Audit logging for compliance

### Technologies
- **Framework:** Next.js 14 API Routes
- **Database:** PostgreSQL 15+
- **Auth:** Session-based (admin), Anonymous (public)
- **Validation:** Zod schemas
- **Response Format:** JSON

---

## Authentication & Authorization

### Authentication Methods

#### Public Access
- No authentication required
- IP-based rate limiting enforced
- CAPTCHA required after threshold
- Anonymous submissions tracked via IP hash

#### Admin Access
- Session-based authentication
- 2-hour session timeout
- Keycloak integration (future)
- Role-based access control (RBAC)

### Authorization Levels

```typescript
// Access Control Matrix
const accessControl = {
  public: {
    endpoints: [
      'POST /api/tickets/submit',
      'GET /api/tickets/status/:number',
      'GET /api/tickets/categories'
    ],
    rateLimit: '5/hour per IP',
    authentication: false
  },
  
  admin_dta: {
    description: 'Full system access',
    permissions: [
      'view all tickets',
      'update any ticket',
      'view system analytics',
      'manage users and roles',
      'view audit logs'
    ]
  },
  
  mda_officer: {
    description: 'Entity-specific access',
    permissions: [
      'view entity tickets only',
      'update entity tickets',
      'view entity analytics',
      'add notes to tickets'
    ]
  },
  
  performance_analyst: {
    description: 'Analytics only',
    permissions: [
      'view analytics dashboards',
      'export reports',
      'view SLA metrics'
    ]
  }
};
```

### Request Headers (Admin)
```http
Authorization: Bearer <session_token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

---

## Core Endpoints

### 1. Submit Ticket (Public)

**Endpoint:** `POST /api/tickets/submit`

**Authentication:** None (Public)

**Rate Limit:** 5/hour per IP

**Request Body:**
```json
{
  "service_id": "STR_PASSPORT",
  "entity_id": "ENT_MOI",
  "channel": "portal",
  "subject": "Passport renewal delay",
  "description": "Applied 3 weeks ago, no update received",
  "category": "processing_delay",
  "priority": "high",
  "submitter_email": "citizen@example.com",
  "submitter_phone": "+1-473-441-XXXX",
  "attachments": [],
  "qr_code_id": null,
  "captcha_token": "token_from_recaptcha"
}
```

**Response (200):**
```json
{
  "success": true,
  "ticket": {
    "ticket_id": "uuid-1234-5678",
    "ticket_number": "202511-000042",
    "status": "open",
    "created_at": "2025-11-18T10:30:00Z",
    "service_id": "STR_PASSPORT",
    "category": "processing_delay"
  },
  "sla": {
    "target_resolution_time": "2025-11-25T10:30:00Z",
    "priority": "high",
    "estimated_days": 7
  },
  "message": "Ticket created successfully. Your ticket number is 202511-000042"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "validation_failed",
  "details": {
    "service_id": "Service not found",
    "subject": "Subject is required"
  }
}
```

**Response (429):**
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Maximum 5 submissions per hour. Please try again later.",
  "retry_after": 3600
}
```

**Validation Rules:**
- `service_id`: Must exist in service_master
- `entity_id`: Must match service entity
- `subject`: 10-500 characters, no SQL special chars
- `description`: 20-5000 characters
- `category`: Must be valid ticket_category
- `priority`: high|medium|low (default: medium)
- `email`: Valid email format if provided
- `phone`: Valid phone format if provided

---

### 2. Check Ticket Status (Public)

**Endpoint:** `GET /api/tickets/status/:ticket_number`

**Authentication:** None (Public)

**Rate Limit:** 10/hour per IP

**URL Parameters:**
```
ticket_number: String (e.g., "202511-000042")
```

**Response (200):**
```json
{
  "success": true,
  "ticket": {
    "ticket_id": "uuid-1234-5678",
    "ticket_number": "202511-000042",
    "status": "in_progress",
    "priority": "high",
    "category": "processing_delay",
    "subject": "Passport renewal delay",
    "created_at": "2025-11-18T10:30:00Z",
    "updated_at": "2025-11-18T14:45:00Z",
    "assigned_to": "Officer Smith",
    "sla_target": "2025-11-25T10:30:00Z",
    "sla_status": "on_track",
    "estimated_resolution": "2025-11-22T00:00:00Z"
  },
  "updates": [
    {
      "timestamp": "2025-11-18T11:00:00Z",
      "status": "open",
      "message": "Ticket received and queued"
    },
    {
      "timestamp": "2025-11-18T14:45:00Z",
      "status": "in_progress",
      "message": "Assigned to Officer Smith for review"
    }
  ]
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "ticket_not_found",
  "message": "Ticket 202511-000042 not found in system"
}
```

---

### 3. List Ticket Categories (Public)

**Endpoint:** `GET /api/tickets/categories`

**Authentication:** None (Public)

**Query Parameters:**
```
service_id: Optional (filter by service)
entity_id: Optional (filter by entity)
```

**Response (200):**
```json
{
  "success": true,
  "categories": [
    {
      "category_id": "CAT_PROCESS_DELAY",
      "category_name": "Processing Delay",
      "description": "Issues with service processing timeline",
      "icon": "hourglass",
      "service_id": "STR_PASSPORT",
      "entity_id": "ENT_MOI",
      "is_active": true,
      "avg_resolution_hours": 48
    },
    {
      "category_id": "CAT_QUALITY_ISSUE",
      "category_name": "Quality Issue",
      "description": "Problems with service quality",
      "icon": "alert-circle",
      "service_id": "STR_PASSPORT",
      "entity_id": "ENT_MOI",
      "is_active": true,
      "avg_resolution_hours": 72
    }
  ],
  "total": 12
}
```

---

## Admin Endpoints

### 4. List Tickets (Admin)

**Endpoint:** `GET /api/admin/tickets`

**Authentication:** Required (Admin)

**Role Requirements:** dta-team, mda-officer

**Query Parameters:**
```json
{
  "status": "open,in_progress",
  "priority": "high",
  "entity_id": "ENT_MOI",
  "assigned_to": "user-uuid",
  "sla_status": "at_risk,breached",
  "page": 1,
  "limit": 20,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

**Response (200):**
```json
{
  "success": true,
  "tickets": [
    {
      "ticket_id": "uuid-1234-5678",
      "ticket_number": "202511-000042",
      "status": "in_progress",
      "priority": "high",
      "category": "processing_delay",
      "subject": "Passport renewal delay",
      "created_at": "2025-11-18T10:30:00Z",
      "updated_at": "2025-11-18T14:45:00Z",
      "assigned_to": "Officer Smith",
      "assigned_to_id": "user-uuid-123",
      "service_id": "STR_PASSPORT",
      "entity_id": "ENT_MOI",
      "sla_target": "2025-11-25T10:30:00Z",
      "sla_status": "on_track",
      "sla_hours_remaining": 84,
      "escalation_level": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

---

### 5. Get Ticket Details (Admin)

**Endpoint:** `GET /api/admin/tickets/:ticket_id`

**Authentication:** Required (Admin)

**Response (200):**
```json
{
  "success": true,
  "ticket": {
    "ticket_id": "uuid-1234-5678",
    "ticket_number": "202511-000042",
    "status": "in_progress",
    "priority": "high",
    "category": "processing_delay",
    "subject": "Passport renewal delay",
    "description": "Applied 3 weeks ago, no update received",
    "created_at": "2025-11-18T10:30:00Z",
    "updated_at": "2025-11-18T14:45:00Z",
    "created_by": "system_feedback_auto",
    "assigned_to": "Officer Smith",
    "assigned_to_id": "user-uuid-123",
    "service_id": "STR_PASSPORT",
    "entity_id": "ENT_MOI",
    "submitter_email": "citizen@example.com",
    "submitter_phone": "+1-473-441-XXXX",
    "linked_feedback_id": "feedback-uuid-789"
  },
  "sla": {
    "sla_id": "sla-uuid-456",
    "target_resolution": "2025-11-25T10:30:00Z",
    "priority": "high",
    "initial_response_target": "2025-11-18T16:30:00Z",
    "initial_response_breached": false,
    "resolution_breached": false,
    "escalation_level": 0,
    "escalation_triggered_at": null
  },
  "activities": [
    {
      "activity_id": "act-uuid-001",
      "timestamp": "2025-11-18T10:30:00Z",
      "type": "ticket_created",
      "performed_by": "system",
      "description": "Ticket created from feedback submission",
      "details": {}
    },
    {
      "activity_id": "act-uuid-002",
      "timestamp": "2025-11-18T11:00:00Z",
      "type": "status_change",
      "performed_by": "officer-123",
      "description": "Status changed to in_progress",
      "details": {
        "from_status": "open",
        "to_status": "in_progress"
      }
    }
  ],
  "notes": [
    {
      "note_id": "note-uuid-001",
      "created_at": "2025-11-18T11:30:00Z",
      "created_by": "Officer Smith",
      "content": "Checking application file status",
      "is_internal": true
    }
  ]
}
```

---

### 6. Update Ticket (Admin)

**Endpoint:** `PUT /api/admin/tickets/:ticket_id`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "status": "in_progress",
  "priority": "high",
  "assigned_to_id": "user-uuid-123",
  "category": "processing_delay",
  "internal_note": "File found, processing initiated"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket updated successfully",
  "ticket": {
    "ticket_id": "uuid-1234-5678",
    "ticket_number": "202511-000042",
    "status": "in_progress",
    "updated_at": "2025-11-18T15:00:00Z",
    "sla_status": "on_track"
  },
  "changes": [
    {
      "field": "status",
      "old_value": "open",
      "new_value": "in_progress",
      "changed_at": "2025-11-18T15:00:00Z"
    }
  ]
}
```

**Validation Rules:**
- `status`: open|in_progress|on_hold|resolved|closed
- `priority`: high|medium|low
- `assigned_to_id`: Must be valid admin user UUID
- `category`: Must exist in ticket_categories

---

### 7. Close/Resolve Ticket (Admin)

**Endpoint:** `POST /api/admin/tickets/:ticket_id/close`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "status": "resolved",
  "resolution_notes": "Passport found and reissued",
  "resolution_category": "issue_resolved"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket closed successfully",
  "ticket": {
    "ticket_id": "uuid-1234-5678",
    "ticket_number": "202511-000042",
    "status": "resolved",
    "resolved_at": "2025-11-18T15:30:00Z",
    "resolution_time_hours": 29,
    "sla_status": "on_track"
  }
}
```

---

### 8. Add Ticket Note (Admin)

**Endpoint:** `POST /api/admin/tickets/:ticket_id/notes`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "content": "Customer contacted via email about status",
  "is_internal": true,
  "attachments": []
}
```

**Response (201):**
```json
{
  "success": true,
  "note": {
    "note_id": "note-uuid-001",
    "ticket_id": "uuid-1234-5678",
    "created_at": "2025-11-18T15:45:00Z",
    "created_by": "Officer Smith",
    "content": "Customer contacted via email about status",
    "is_internal": true
  }
}
```

---

## Integration Endpoints

### 9. Create Ticket from Feedback (Internal)

**Endpoint:** `POST /api/tickets/from-feedback`

**Authentication:** Service-to-service (API key)

**Used by:** Feedback system automatically

**Trigger:** Feedback submitted with grievance_flag=true OR avg_rating ≤ 2

**Request Body:**
```json
{
  "feedback_id": "feedback-uuid-789",
  "service_id": "STR_PASSPORT",
  "entity_id": "ENT_MOI",
  "subject": "Poor service quality - passport renewal",
  "avg_rating": 1.5,
  "grievance_flag": false,
  "submitter_email": "citizen@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "ticket": {
    "ticket_id": "uuid-1234-5678",
    "ticket_number": "202511-000042",
    "status": "open",
    "priority": "urgent",
    "linked_feedback_id": "feedback-uuid-789"
  }
}
```

---

### 10. Link Feedback to Ticket (Admin)

**Endpoint:** `POST /api/admin/tickets/:ticket_id/link-feedback`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "feedback_id": "feedback-uuid-789"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Feedback linked to ticket successfully"
}
```

---

## Analytics Endpoints

### 11. SLA Dashboard (Admin)

**Endpoint:** `GET /api/admin/analytics/sla-dashboard`

**Authentication:** Required (Admin)

**Query Parameters:**
```
entity_id: Optional
start_date: YYYY-MM-DD
end_date: YYYY-MM-DD
```

**Response (200):**
```json
{
  "success": true,
  "summary": {
    "total_tickets": 156,
    "on_track": 142,
    "at_risk": 10,
    "breached": 4,
    "compliance_rate": "94.2%"
  },
  "by_priority": {
    "high": {
      "total": 45,
      "on_track": 40,
      "at_risk": 3,
      "breached": 2,
      "avg_resolution_hours": 18
    },
    "medium": {
      "total": 78,
      "on_track": 75,
      "at_risk": 2,
      "breached": 1,
      "avg_resolution_hours": 48
    },
    "low": {
      "total": 33,
      "on_track": 27,
      "at_risk": 5,
      "breached": 1,
      "avg_resolution_hours": 120
    }
  },
  "by_status": {
    "open": 23,
    "in_progress": 89,
    "on_hold": 12,
    "resolved": 28,
    "closed": 4
  }
}
```

---

### 12. Service Performance (Admin)

**Endpoint:** `GET /api/admin/analytics/service-performance`

**Authentication:** Required (Admin)

**Query Parameters:**
```
service_id: Optional
entity_id: Optional
time_period: week|month|quarter
```

**Response (200):**
```json
{
  "success": true,
  "services": [
    {
      "service_id": "STR_PASSPORT",
      "service_name": "Passport Services",
      "entity_id": "ENT_MOI",
      "total_tickets": 45,
      "avg_resolution_time": "2.5 days",
      "customer_satisfaction": "4.2/5.0",
      "sla_compliance": "95.5%",
      "trending": "improving"
    }
  ]
}
```

---

### 13. Ticket Volume Trend (Admin)

**Endpoint:** `GET /api/admin/analytics/volume-trend`

**Authentication:** Required (Admin)

**Query Parameters:**
```
period: daily|weekly|monthly
days: 30|60|90
```

**Response (200):**
```json
{
  "success": true,
  "trend": [
    {
      "date": "2025-11-18",
      "total_created": 15,
      "total_resolved": 8,
      "portal_submissions": 10,
      "feedback_generated": 5
    },
    {
      "date": "2025-11-17",
      "total_created": 12,
      "total_resolved": 6,
      "portal_submissions": 7,
      "feedback_generated": 5
    }
  ]
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message",
  "details": {
    "field": "error details"
  },
  "timestamp": "2025-11-18T10:30:00Z",
  "request_id": "req-uuid-123"
}
```

### HTTP Status Codes

```
200 OK               - Request successful
201 Created          - Resource created successfully
400 Bad Request      - Validation failed
401 Unauthorized     - Authentication required
403 Forbidden        - Insufficient permissions
404 Not Found        - Resource not found
409 Conflict         - State conflict (e.g., duplicate)
429 Too Many Requests - Rate limit exceeded
500 Internal Server  - Server error
503 Service Unavailable - Database connection failed
```

### Common Error Codes

```
validation_failed       - Input validation error
rate_limit_exceeded     - Too many requests
ticket_not_found        - Ticket doesn't exist
service_not_found       - Service doesn't exist
unauthorized_access     - User lacks permissions
invalid_status_change   - Status transition not allowed
database_error          - Database operation failed
captcha_invalid         - CAPTCHA verification failed
```

---

## Rate Limiting

### Rate Limit Rules

```typescript
const rateLimits = {
  public_submit: {
    requests: 5,
    window: '1 hour',
    per: 'IP address'
  },
  
  public_status: {
    requests: 10,
    window: '1 hour',
    per: 'IP address'
  },
  
  public_categories: {
    requests: 30,
    window: '1 hour',
    per: 'IP address'
  },
  
  admin_list_tickets: {
    requests: 100,
    window: '1 hour',
    per: 'user'
  },
  
  admin_update_ticket: {
    requests: 50,
    window: '1 hour',
    per: 'user'
  }
};
```

### Rate Limit Headers

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1700302200
Retry-After: 3600
```

---

## Validation Rules

### Email Validation
```
Format: RFC 5322 compliant
Max Length: 254 characters
Example: citizen@example.com
```

### Phone Validation
```
Format: E.164 international
Min: +1 country code
Max: 15 digits
Example: +1-473-441-1234
```

### Ticket Number Format
```
Format: YYYYMM-XXXXXX
Example: 202511-000042
Pattern: 6-digit year+month, hyphen, 6-digit sequence
```

### Priority Levels
```
high   - Requires attention within 24 hours
medium - Requires attention within 3 days
low    - Requires attention within 1 week
```

### Status Transitions

```
Allowed transitions:
open          → in_progress, on_hold
in_progress   → resolved, on_hold, open
on_hold       → in_progress, open
resolved      → closed, on_hold
closed        → (terminal state)
```

---

## Response Formats

### Success Response Template

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful",
  "timestamp": "2025-11-18T10:30:00Z"
}
```

### List Response Template

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  },
  "timestamp": "2025-11-18T10:30:00Z"
}
```

### Paginated Requests

All list endpoints support pagination:
```
?page=1&limit=20&sort_by=created_at&sort_order=desc
```

---

## API Implementation Roadmap

### Phase 1: Core Public APIs
- [x] POST /api/tickets/submit
- [x] GET /api/tickets/status/:ticket_number
- [x] GET /api/tickets/categories

### Phase 2: Admin APIs
- [ ] GET /api/admin/tickets
- [ ] GET /api/admin/tickets/:ticket_id
- [ ] PUT /api/admin/tickets/:ticket_id
- [ ] POST /api/admin/tickets/:ticket_id/close
- [ ] POST /api/admin/tickets/:ticket_id/notes

### Phase 3: Integration APIs
- [ ] POST /api/tickets/from-feedback
- [ ] POST /api/admin/tickets/:ticket_id/link-feedback

### Phase 4: Analytics APIs
- [ ] GET /api/admin/analytics/sla-dashboard
- [ ] GET /api/admin/analytics/service-performance
- [ ] GET /api/admin/analytics/volume-trend

---

## Security Considerations

### Input Sanitization
All inputs are sanitized to prevent:
- SQL injection (parameterized queries)
- XSS attacks (HTML encoding)
- Command injection (no shell execution)

### Authentication
- Session tokens validated on every request
- Tokens expire after 2 hours
- CSRF protection via X-CSRF-Token header

### Authorization
- Role-based access control (RBAC)
- Entity-level filtering for MDA officers
- Audit logging for all admin actions

### Data Protection
- PII minimization (optional email/phone)
- IP addresses hashed with MD5
- User agents hashed with MD5
- No credit card or sensitive data stored

---

## Performance Guidelines

### Expected Response Times
```
Public endpoints:     < 500ms (p95)
Admin list/search:    < 1000ms (p95)
Admin detail/update:  < 500ms (p95)
Analytics queries:    < 2000ms (p95)
```

### Database Query Optimization
- All queries use indexed fields
- Materialized views for dashboard data
- Connection pooling (max 20 connections)
- Query timeouts (30 seconds max)

---

## Deployment Checklist

- [ ] All endpoints implemented and tested
- [ ] Rate limiting active on public endpoints
- [ ] CAPTCHA integration verified
- [ ] Admin authentication configured
- [ ] Audit logging enabled
- [ ] Error handling comprehensive
- [ ] Documentation complete
- [ ] Load testing passed (100+ concurrent)
- [ ] Security audit completed
- [ ] Database backups configured

---

## Document Information

**Version:** 1.0  
**Created:** November 18, 2025  
**Last Updated:** November 18, 2025  
**Status:** Production Ready  

**Next Steps:**
1. Backend API implementation
2. Frontend integration
3. End-to-end testing
4. Production deployment

---

**For clarifications:** Contact Digital Transformation Agency (DTA)