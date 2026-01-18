# GEA Portal - Error Handling Patterns Guide

**Government of Grenada Enterprise Architecture Portal**

**Version:** 1.0
**Last Updated:** January 2026
**Audience:** All Developers

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Error Response Format](#2-error-response-format)
3. [Error Codes Reference](#3-error-codes-reference)
4. [API Error Handling](#4-api-error-handling)
5. [Database Error Handling](#5-database-error-handling)
6. [Client-Side Error Handling](#6-client-side-error-handling)
7. [Logging Best Practices](#7-logging-best-practices)
8. [Common Error Scenarios](#8-common-error-scenarios)

---

## 1. Introduction

### 1.1 About This Guide

This guide documents the **error handling patterns** used throughout the GEA Portal. Consistent error handling ensures:
- Predictable API responses
- Helpful error messages for debugging
- Secure error exposure (no internal details leaked)
- Proper logging for troubleshooting

### 1.2 Key Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/response.ts` | Error codes and response helpers |
| `frontend/src/lib/db.ts` | Database error handling |

---

## 2. Error Response Format

### 2.1 Standard Error Response

All API errors follow this structure:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field_name": ["Specific error for this field"]
  },
  "request_id": "req_1704450600_abc123def",
  "timestamp": "2026-01-05T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `false` for errors |
| `error` | string | Machine-readable error code |
| `message` | string | Human-readable description |
| `details` | object | Optional field-specific errors |
| `request_id` | string | Unique ID for tracing |
| `timestamp` | string | ISO 8601 timestamp |

### 2.2 Using Response Helpers

```typescript
import {
  respondError,
  respondValidationError,
  respondNotFound,
  respondServerError,
  ErrorCodes,
} from '@/lib/response'

// Standard error
return respondError(ErrorCodes.UNAUTHORIZED)

// With custom details
return respondError(ErrorCodes.FORBIDDEN, {
  details: { role: ['Admin access required'] }
})

// Validation error
return respondValidationError({
  email: ['Email is required', 'Invalid format'],
  name: ['Name must be at least 2 characters']
})

// Not found error
return respondNotFound(ErrorCodes.TICKET_NOT_FOUND)

// Server error (logs automatically)
return respondServerError(error, requestId)
```

---

## 3. Error Codes Reference

### 3.1 Validation Errors (400)

| Error Code | Message | When to Use |
|------------|---------|-------------|
| `validation_failed` | Input validation failed | General validation errors |
| `invalid_ticket_number` | Invalid ticket number format | Ticket lookup failed |
| `invalid_email` | Invalid email format | Email validation |
| `invalid_phone` | Invalid phone number format | Phone validation |

### 3.2 Authentication Errors (401)

| Error Code | Message | When to Use |
|------------|---------|-------------|
| `unauthorized` | Authentication required | No session present |
| `session_expired` | Your session has expired | Session timed out |
| `invalid_credentials` | Invalid username or password | Login failed |

### 3.3 Authorization Errors (403)

| Error Code | Message | When to Use |
|------------|---------|-------------|
| `forbidden` | You do not have permission | General access denied |
| `insufficient_permissions` | Your role does not have permission | Role-based denial |

### 3.4 Not Found Errors (404)

| Error Code | Message | When to Use |
|------------|---------|-------------|
| `not_found` | Resource not found | Generic not found |
| `ticket_not_found` | Ticket not found | Specific ticket missing |
| `service_not_found` | Service not found | Service lookup failed |
| `category_not_found` | Ticket category not found | Category missing |
| `feedback_not_found` | Feedback not found | Feedback missing |

### 3.5 Conflict Errors (409)

| Error Code | Message | When to Use |
|------------|---------|-------------|
| `conflict` | Resource conflict | General conflict |
| `duplicate_ticket` | Ticket number already exists | Duplicate creation |
| `invalid_status_change` | Status transition not allowed | Invalid workflow |

### 3.6 Rate Limiting Errors (429)

| Error Code | Message | When to Use |
|------------|---------|-------------|
| `rate_limit_exceeded` | Too many requests | Rate limit hit |

### 3.7 Server Errors (500+)

| Error Code | Message | When to Use |
|------------|---------|-------------|
| `internal_server_error` | Internal server error | Unexpected errors |
| `database_error` | Database operation failed | DB failures |
| `service_unavailable` | Service temporarily unavailable | 503 status |

---

## 4. API Error Handling

### 4.1 Basic Try-Catch Pattern

```typescript
export async function GET(request: NextRequest) {
  const requestId = extractRequestId(request.headers)

  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return respondError(ErrorCodes.UNAUTHORIZED, { requestId })
    }

    // Check authorization
    if (session.user.roleType !== 'admin') {
      return respondError(ErrorCodes.FORBIDDEN, { requestId })
    }

    // Business logic
    const result = await pool.query('SELECT * FROM tickets')

    return respondSuccess(result.rows)

  } catch (error) {
    logError('GET', '/api/endpoint', error, requestId)
    return respondServerError(error, requestId)
  }
}
```

### 4.2 Validation Error Handling

```typescript
export async function POST(request: NextRequest) {
  const requestId = extractRequestId(request.headers)

  try {
    const body = await request.json()

    // Collect validation errors
    const errors: Record<string, string[]> = {}

    if (!body.email) {
      errors.email = ['Email is required']
    } else if (!isValidEmail(body.email)) {
      errors.email = ['Invalid email format']
    }

    if (!body.name) {
      errors.name = ['Name is required']
    } else if (body.name.length < 2) {
      errors.name = ['Name must be at least 2 characters']
    }

    // Return all validation errors at once
    if (Object.keys(errors).length > 0) {
      return respondValidationError(errors, requestId)
    }

    // Continue with valid data...

  } catch (error) {
    return respondServerError(error, requestId)
  }
}
```

### 4.3 Zod Validation Errors

```typescript
import { z } from 'zod'
import { formatZodErrors, respondValidationError } from '@/lib/response'

const schema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name too short'),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validation = schema.safeParse(body)

  if (!validation.success) {
    return respondValidationError(formatZodErrors(validation.error))
  }

  // Use validation.data (typed and validated)
}
```

### 4.4 Not Found Handling

```typescript
// Single record lookup
const result = await pool.query(
  'SELECT * FROM tickets WHERE ticket_id = $1',
  [ticketId]
)

if (result.rows.length === 0) {
  return respondNotFound(ErrorCodes.TICKET_NOT_FOUND, requestId)
}

// Update operation
const updateResult = await pool.query(
  'UPDATE tickets SET status = $1 WHERE ticket_id = $2',
  [newStatus, ticketId]
)

if (updateResult.rowCount === 0) {
  return respondNotFound(ErrorCodes.TICKET_NOT_FOUND, requestId)
}
```

### 4.5 Conflict Handling

```typescript
// Check for duplicates
const existing = await pool.query(
  'SELECT id FROM users WHERE email = $1',
  [email]
)

if (existing.rows.length > 0) {
  return respondError(ErrorCodes.CONFLICT, {
    details: { email: ['User with this email already exists'] },
    requestId
  })
}
```

---

## 5. Database Error Handling

### 5.1 PostgreSQL Error Codes

| PG Code | Meaning | Suggested Response |
|---------|---------|-------------------|
| `23505` | Unique violation | 409 Conflict |
| `23503` | Foreign key violation | 400 Bad Request |
| `23502` | Not null violation | 400 Bad Request |
| `22P02` | Invalid text representation | 400 Bad Request |
| `42P01` | Undefined table | 500 Internal Error |
| `42703` | Undefined column | 500 Internal Error |

### 5.2 Handling Database Errors

```typescript
try {
  const result = await pool.query(query, params)
  return respondSuccess(result.rows)

} catch (error: any) {
  // Handle specific PostgreSQL errors
  if (error.code === '23505') {
    // Unique constraint violation
    const field = extractFieldFromConstraint(error.constraint)
    return respondError(ErrorCodes.CONFLICT, {
      details: { [field]: ['This value already exists'] }
    })
  }

  if (error.code === '23503') {
    // Foreign key violation
    return respondError(ErrorCodes.VALIDATION_FAILED, {
      details: { reference: ['Referenced record does not exist'] }
    })
  }

  if (error.code === '23502') {
    // Not null violation
    return respondError(ErrorCodes.VALIDATION_FAILED, {
      details: { [error.column]: ['This field is required'] }
    })
  }

  // Log and return generic error for unexpected issues
  logError('POST', '/api/endpoint', error, requestId)
  return respondServerError(error, requestId)
}

function extractFieldFromConstraint(constraint: string): string {
  // Convert 'users_email_key' to 'email'
  const match = constraint.match(/_([^_]+)_key$/)
  return match ? match[1] : 'field'
}
```

### 5.3 Transaction Error Handling

```typescript
import { withTransaction } from '@/lib/db'

try {
  const result = await withTransaction(async (client) => {
    // Operations that might fail
    await client.query('INSERT INTO tickets ...')
    await client.query('INSERT INTO ticket_activity ...')
    return 'success'
  })

  return respondSuccess({ result })

} catch (error: any) {
  // Transaction automatically rolled back
  if (error.message === 'Ticket not found') {
    return respondNotFound(ErrorCodes.TICKET_NOT_FOUND)
  }

  return respondServerError(error, requestId)
}
```

---

## 6. Client-Side Error Handling

### 6.1 Fetching with Error Handling

```typescript
async function fetchData() {
  try {
    const response = await fetch('/api/admin/tickets')

    if (!response.ok) {
      const error = await response.json()

      // Handle specific errors
      switch (response.status) {
        case 401:
          // Redirect to login
          window.location.href = '/auth/signin'
          return
        case 403:
          setError('You do not have permission to access this resource')
          return
        case 404:
          setError('Resource not found')
          return
        default:
          setError(error.message || 'An error occurred')
      }
      return
    }

    const data = await response.json()
    setTickets(data.data)

  } catch (error) {
    setError('Network error - please check your connection')
  }
}
```

### 6.2 Form Submission Error Handling

```typescript
async function handleSubmit(formData: FormData) {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    const result = await response.json()

    if (!result.success) {
      // Handle validation errors
      if (result.details) {
        setFieldErrors(result.details)
      } else {
        setGeneralError(result.message)
      }
      return
    }

    // Success
    setSuccess('Feedback submitted successfully')

  } catch (error) {
    setGeneralError('Failed to submit. Please try again.')
  }
}
```

### 6.3 Displaying Validation Errors

```typescript
function FormField({ name, label, error }: Props) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        name={name}
        className={`mt-1 block w-full rounded-md border ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error.join(', ')}
        </p>
      )}
    </div>
  )
}
```

---

## 7. Logging Best Practices

### 7.1 Structured Logging

Use the logging helpers from `response.ts`:

```typescript
import { logRequest, logError } from '@/lib/response'

// Log successful request
logRequest('GET', '/api/tickets', 200, 45, requestId, {
  ticketCount: result.rows.length
})

// Log error
logError('POST', '/api/users', error, requestId, {
  attemptedEmail: email
})
```

### 7.2 What to Log

**DO log:**
- Request method and path
- Response status code
- Request duration
- Error messages and stack traces
- User actions (for audit)

**DON'T log:**
- Passwords or tokens
- Full request/response bodies with sensitive data
- Personal information (mask if needed)

### 7.3 Log Format

```typescript
// Structured log entry
console.log(JSON.stringify({
  type: 'api_request',
  method: 'POST',
  path: '/api/admin/users',
  status: 201,
  duration_ms: 127,
  request_id: 'req_1704450600_abc123',
  timestamp: '2026-01-05T10:30:00.000Z',
  user_email: 'admin@gov.gd',
  action: 'user_created'
}))
```

### 7.4 Error Log Format

```typescript
// Error log entry
console.error(JSON.stringify({
  type: 'api_error',
  method: 'POST',
  path: '/api/admin/users',
  error: 'Database connection failed',
  error_code: 'ECONNREFUSED',
  request_id: 'req_1704450600_abc123',
  timestamp: '2026-01-05T10:30:00.000Z'
}))
```

---

## 8. Common Error Scenarios

### 8.1 Authentication Failure

**Scenario:** User not logged in

```typescript
const session = await getServerSession(authOptions)
if (!session) {
  return respondError(ErrorCodes.UNAUTHORIZED)
}
```

**Client receives:**
```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Authentication required",
  "request_id": "req_xxx",
  "timestamp": "..."
}
```

### 8.2 Authorization Failure

**Scenario:** Staff user accessing admin endpoint

```typescript
if (session.user.roleType !== 'admin') {
  return respondError(ErrorCodes.FORBIDDEN)
}
```

**Client receives:**
```json
{
  "success": false,
  "error": "forbidden",
  "message": "You do not have permission to access this resource",
  "request_id": "req_xxx",
  "timestamp": "..."
}
```

### 8.3 Validation Failure

**Scenario:** Missing required fields

```typescript
if (!body.email || !body.name) {
  return respondValidationError({
    email: !body.email ? ['Email is required'] : [],
    name: !body.name ? ['Name is required'] : []
  })
}
```

**Client receives:**
```json
{
  "success": false,
  "error": "validation_failed",
  "message": "Input validation failed",
  "details": {
    "email": ["Email is required"],
    "name": ["Name is required"]
  },
  "request_id": "req_xxx",
  "timestamp": "..."
}
```

### 8.4 Resource Not Found

**Scenario:** Ticket doesn't exist

```typescript
const result = await pool.query(
  'SELECT * FROM tickets WHERE ticket_id = $1',
  [ticketId]
)

if (result.rows.length === 0) {
  return respondNotFound(ErrorCodes.TICKET_NOT_FOUND)
}
```

**Client receives:**
```json
{
  "success": false,
  "error": "ticket_not_found",
  "message": "Ticket not found",
  "request_id": "req_xxx",
  "timestamp": "..."
}
```

### 8.5 Database Error

**Scenario:** Unexpected database failure

```typescript
try {
  await pool.query(query)
} catch (error) {
  // Logs error with full stack trace
  return respondServerError(error, requestId)
}
```

**Client receives:**
```json
{
  "success": false,
  "error": "internal_server_error",
  "message": "An internal server error occurred",
  "request_id": "req_xxx",
  "timestamp": "..."
}
```

**Note:** Internal error details are logged but NOT exposed to client.

---

## Quick Reference

### Import Statement

```typescript
import {
  respondError,
  respondValidationError,
  respondNotFound,
  respondServerError,
  ErrorCodes,
  extractRequestId,
  formatZodErrors,
  logRequest,
  logError,
} from '@/lib/response'
```

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 400 | Validation failed |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Not found |
| 409 | Conflict |
| 429 | Rate limited |
| 500 | Server error |

---

**Last Updated:** January 2026 | **Version:** 1.0

For questions or to report issues with this guide, contact the development team.
