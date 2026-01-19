# GEA Portal - API Development Patterns Guide

**Government of Grenada Enterprise Architecture Portal**

**Version:** 1.0
**Last Updated:** January 2026
**Audience:** Backend Developers, Full-Stack Developers

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Project Structure](#2-project-structure)
3. [Creating a New API Endpoint](#3-creating-a-new-api-endpoint)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Request Validation](#5-request-validation)
6. [Response Formatting](#6-response-formatting)
7. [Error Handling](#7-error-handling)
8. [Database Operations](#8-database-operations)
9. [Common Patterns](#9-common-patterns)
10. [Testing Your API](#10-testing-your-api)
11. [Checklist](#11-checklist)

---

## 1. Introduction

### 1.1 About This Guide

This guide provides **step-by-step patterns** for developing API endpoints in the GEA Portal. Following these patterns ensures consistency, security, and maintainability across all endpoints.

### 1.2 Prerequisites

- Working knowledge of **TypeScript** and **Next.js 14** (App Router)
- Understanding of **REST API** principles
- Familiarity with **PostgreSQL** and parameterized queries
- Access to the codebase and local development environment

### 1.3 Key Libraries

| Library | Purpose |
|---------|---------|
| `next-auth` | Authentication & session management |
| `pg` (node-postgres) | PostgreSQL database driver |
| `redis` | Redis client for caching |
| `zod` | Schema validation (optional but recommended) |

---

## 2. Project Structure

### 2.1 API Directory Layout

```
frontend/src/app/api/
├── admin/                    # Admin-only endpoints
│   ├── users/
│   │   ├── route.ts         # GET (list), POST (create)
│   │   └── [id]/
│   │       └── route.ts     # GET (single), PATCH, DELETE
│   ├── tickets/
│   │   ├── list/route.ts
│   │   └── [id]/
│   │       ├── details/route.ts
│   │       └── update/route.ts
│   ├── service-requests/
│   │   └── route.ts
│   ├── settings/            # System settings management
│   │   ├── route.ts         # GET, PUT
│   │   ├── test-sms/route.ts
│   │   └── test-email/route.ts
│   └── database/            # Database backup/restore
│       └── backups/route.ts
├── citizen/                 # Citizen authentication (Twilio SMS OTP)
│   └── auth/
│       ├── send-otp/route.ts      # Send OTP via Twilio Verify
│       ├── verify-otp/route.ts    # Verify OTP and create session
│       ├── login/route.ts         # Password-based login
│       └── complete-registration/route.ts  # Complete citizen registration
├── external/                 # External API (bot/integration access)
│   ├── tickets/route.ts
│   └── entities/route.ts
├── feedback/                 # Public feedback endpoints
│   └── route.ts
├── managedata/              # Master data CRUD
│   ├── entities/route.ts
│   └── services/route.ts
└── helpdesk/                # Public ticket lookup
    └── route.ts
```

### 2.2 Supporting Libraries

```
frontend/src/lib/
├── auth.ts                  # NextAuth configuration (admin/staff)
├── citizen-auth.ts          # Citizen authentication helpers
├── twilio.ts                # Twilio Verify SMS OTP integration
├── settings.ts              # System settings management
├── settings-encryption.ts   # AES-256-GCM encryption for sensitive settings
├── db.ts                    # Database connection pool (PgBouncer)
├── redis.ts                 # Redis caching utilities
├── response.ts              # Response helpers & error codes
└── schemas/                 # Zod validation schemas (if used)
```

---

## 3. Creating a New API Endpoint

### 3.1 Basic Structure

Create a new file at `frontend/src/app/api/[path]/route.ts`:

```typescript
/**
 * GEA Portal - [Description of Endpoint]
 *
 * [Brief description of what this API does]
 *
 * GET /api/[path] - [Description]
 * POST /api/[path] - [Description]
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

// Required for dynamic routes in Next.js
export const dynamic = 'force-dynamic'

/**
 * GET /api/[path]
 * [Description of what GET does]
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check (if required)
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Authorization check (if admin/staff only)
    if (session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // 3. Parse query parameters (if any)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // 4. Database query
    const result = await pool.query(`
      SELECT * FROM your_table
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, (page - 1) * limit])

    // 5. Return success response
    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: result.rowCount
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 3.2 POST Endpoint Pattern

```typescript
/**
 * POST /api/[path]
 * Create a new resource
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // 2. Parse and validate body
    const body = await request.json()
    const { field1, field2, field3 } = body

    // 3. Validation
    if (!field1 || !field2) {
      return NextResponse.json(
        { error: 'Missing required fields: field1, field2' },
        { status: 400 }
      )
    }

    // 4. Check for duplicates (if applicable)
    const existing = await pool.query(
      'SELECT id FROM your_table WHERE unique_field = $1',
      [field1]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Resource already exists' },
        { status: 409 }
      )
    }

    // 5. Insert data
    const result = await pool.query(
      `INSERT INTO your_table (field1, field2, field3, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [field1, field2, field3, session.user.email]
    )

    // 6. Return success
    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Resource created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    )
  }
}
```

---

## 4. Authentication & Authorization

### 4.1 Session Check Pattern

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Get session
  const session = await getServerSession(authOptions)

  // Check if authenticated
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Access session data
  const { email, name, roleType, entityId } = session.user

  // Continue with authenticated user...
}
```

### 4.2 Role-Based Authorization

```typescript
// Admin only
if (session.user.roleType !== 'admin') {
  return NextResponse.json(
    { error: 'Forbidden - Admin access required' },
    { status: 403 }
  )
}

// Admin or Staff
if (!['admin', 'staff'].includes(session.user.roleType)) {
  return NextResponse.json(
    { error: 'Forbidden - Staff access required' },
    { status: 403 }
  )
}

// Staff with entity filtering
if (session.user.roleType === 'staff') {
  // Filter data by user's entity
  query += ' WHERE entity_id = $1'
  params.push(session.user.entityId)
}
```

### 4.3 Entity-Based Data Filtering

Staff users should only see data from their assigned entity:

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  let query = 'SELECT * FROM tickets WHERE 1=1'
  const params: any[] = []

  // Staff: filter by entity
  if (session.user.roleType === 'staff') {
    if (!session.user.entityId) {
      return NextResponse.json(
        { error: 'No entity assigned to user' },
        { status: 403 }
      )
    }
    query += ` AND entity_id = $${params.length + 1}`
    params.push(session.user.entityId)
  }
  // Admin: sees all entities (no filter)

  const result = await pool.query(query, params)
  return NextResponse.json({ data: result.rows })
}
```

---

## 5. Request Validation

### 5.1 Manual Validation

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Required field validation
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

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({
      error: 'Validation failed',
      details: errors
    }, { status: 400 })
  }

  // Continue with valid data...
}

// Helper function
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

### 5.2 Zod Validation (Recommended)

```typescript
import { z } from 'zod'
import { formatZodErrors } from '@/lib/response'

// Define schema
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role_id: z.number().int().positive('Invalid role ID'),
  entity_id: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validate with Zod
  const validation = createUserSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: formatZodErrors(validation.error)
    }, { status: 400 })
  }

  // Use validated data
  const { email, name, role_id, entity_id } = validation.data

  // Continue...
}
```

---

## 6. Response Formatting

### 6.1 Using Response Helpers

Import from `@/lib/response`:

```typescript
import {
  respondSuccess,
  respondList,
  respondError,
  respondValidationError,
  respondNotFound,
  respondServerError,
  ErrorCodes,
} from '@/lib/response'

// Success response
return respondSuccess(data, { message: 'Operation successful' })

// List with pagination
return respondList(items, page, limit, totalCount)

// Error responses
return respondError(ErrorCodes.UNAUTHORIZED)
return respondError(ErrorCodes.FORBIDDEN)
return respondError(ErrorCodes.NOT_FOUND)

// Validation error with details
return respondValidationError({
  email: ['Email is required'],
  name: ['Name too short']
})

// Not found
return respondNotFound(ErrorCodes.TICKET_NOT_FOUND)

// Server error (logs automatically)
return respondServerError(error)
```

### 6.2 Standard Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "timestamp": "2026-01-05T10:30:00.000Z"
}
```

**List Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "total_pages": 5,
    "has_next": true,
    "has_previous": false
  },
  "timestamp": "2026-01-05T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "validation_failed",
  "message": "Input validation failed",
  "details": {
    "email": ["Invalid email format"]
  },
  "request_id": "req_1704450600_abc123def",
  "timestamp": "2026-01-05T10:30:00.000Z"
}
```

---

## 7. Error Handling

### 7.1 Error Code Reference

| Error Code | HTTP Status | When to Use |
|------------|-------------|-------------|
| `VALIDATION_FAILED` | 400 | Invalid input data |
| `INVALID_EMAIL` | 400 | Email format incorrect |
| `UNAUTHORIZED` | 401 | Not logged in |
| `SESSION_EXPIRED` | 401 | Session timed out |
| `FORBIDDEN` | 403 | Logged in but not allowed |
| `INSUFFICIENT_PERMISSIONS` | 403 | Role cannot perform action |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `TICKET_NOT_FOUND` | 404 | Specific ticket missing |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected error |
| `DATABASE_ERROR` | 500 | Database operation failed |

### 7.2 Try-Catch Pattern

```typescript
export async function GET(request: NextRequest) {
  const requestId = extractRequestId(request.headers)

  try {
    // Your logic here...

    return respondSuccess(data)

  } catch (error) {
    // Log the error with context
    logError('GET', '/api/your-endpoint', error, requestId)

    // Return generic error (don't expose internals)
    return respondServerError(error, requestId)
  }
}
```

### 7.3 Database Error Handling

```typescript
try {
  const result = await pool.query(query, params)
  return respondSuccess(result.rows)

} catch (error) {
  // Check for specific PostgreSQL errors
  if (error.code === '23505') {
    // Unique constraint violation
    return respondError(ErrorCodes.CONFLICT, {
      details: { field: ['Value already exists'] }
    })
  }

  if (error.code === '23503') {
    // Foreign key violation
    return respondError(ErrorCodes.VALIDATION_FAILED, {
      details: { reference: ['Referenced record does not exist'] }
    })
  }

  // Generic database error
  return respondServerError(error, requestId)
}
```

---

## 8. Database Operations

### 8.1 Basic Query

```typescript
import { pool } from '@/lib/db'

// Simple query
const result = await pool.query('SELECT * FROM tickets')
const tickets = result.rows

// Parameterized query (ALWAYS use this for user input)
const result = await pool.query(
  'SELECT * FROM tickets WHERE status = $1 AND entity_id = $2',
  [status, entityId]
)
```

### 8.2 Insert with Returning

```typescript
const result = await pool.query(
  `INSERT INTO tickets (subject, description, entity_id, created_by)
   VALUES ($1, $2, $3, $4)
   RETURNING ticket_id, ticket_number, created_at`,
  [subject, description, entityId, userEmail]
)

const newTicket = result.rows[0]
```

### 8.3 Update with Returning

```typescript
const result = await pool.query(
  `UPDATE tickets
   SET status = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
   WHERE ticket_id = $3
   RETURNING *`,
  [newStatus, userEmail, ticketId]
)

if (result.rowCount === 0) {
  return respondNotFound(ErrorCodes.TICKET_NOT_FOUND)
}
```

### 8.4 Transactions

Use transactions for multi-step operations:

```typescript
import { withTransaction } from '@/lib/db'

const result = await withTransaction(async (client) => {
  // Step 1: Create ticket
  const ticketResult = await client.query(
    'INSERT INTO tickets (subject) VALUES ($1) RETURNING ticket_id',
    [subject]
  )
  const ticketId = ticketResult.rows[0].ticket_id

  // Step 2: Create activity log
  await client.query(
    'INSERT INTO ticket_activity (ticket_id, action) VALUES ($1, $2)',
    [ticketId, 'created']
  )

  // Step 3: Update counter
  await client.query(
    'UPDATE ticket_stats SET total_count = total_count + 1'
  )

  return ticketId
})
// If any step fails, all changes are rolled back
```

### 8.5 Dynamic Query Building

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const entityId = searchParams.get('entity_id')
  const search = searchParams.get('search')

  // Build query dynamically
  let query = 'SELECT * FROM tickets WHERE 1=1'
  const params: any[] = []

  if (status) {
    params.push(status)
    query += ` AND status = $${params.length}`
  }

  if (entityId) {
    params.push(entityId)
    query += ` AND entity_id = $${params.length}`
  }

  if (search) {
    params.push(`%${search}%`)
    query += ` AND (subject ILIKE $${params.length} OR description ILIKE $${params.length})`
  }

  query += ' ORDER BY created_at DESC'

  const result = await pool.query(query, params)
  return NextResponse.json({ data: result.rows })
}
```

---

## 9. Common Patterns

### 9.1 Pagination

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  // Get total count
  const countResult = await pool.query('SELECT COUNT(*) FROM tickets')
  const total = parseInt(countResult.rows[0].count)

  // Get paginated data
  const result = await pool.query(
    'SELECT * FROM tickets ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )

  return respondList(result.rows, page, limit, total)
}
```

### 9.2 Sorting

```typescript
const allowedSortFields = ['created_at', 'updated_at', 'status', 'priority']
const sortField = allowedSortFields.includes(searchParams.get('sort') || '')
  ? searchParams.get('sort')
  : 'created_at'
const sortOrder = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC'

const query = `SELECT * FROM tickets ORDER BY ${sortField} ${sortOrder}`
```

### 9.3 File Uploads (BYTEA Storage)

```typescript
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  // Validate file
  if (!file) {
    return respondValidationError({ file: ['File is required'] })
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return respondValidationError({ file: ['File exceeds 10MB limit'] })
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    return respondValidationError({ file: ['Invalid file type'] })
  }

  // Convert to buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Store in database
  const result = await pool.query(
    `INSERT INTO attachments (filename, mime_type, file_size, file_data)
     VALUES ($1, $2, $3, $4)
     RETURNING attachment_id`,
    [file.name, file.type, file.size, buffer]
  )

  return respondSuccess({ attachment_id: result.rows[0].attachment_id })
}
```

### 9.4 Audit Logging

```typescript
// After successful operation, log the action
try {
  const adminUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [session.user.email]
  )

  if (adminUser.rows.length > 0) {
    await pool.query(
      `INSERT INTO user_audit_log (user_id, action, resource_type, new_value)
       VALUES ($1, $2, $3, $4)`,
      [
        adminUser.rows[0].id,
        'resource_created',
        'ticket',
        JSON.stringify({ ticket_id: newTicketId, subject })
      ]
    )
  }
} catch (auditError) {
  // Log failure but don't fail the main operation
  console.error('Audit log failed:', auditError)
}
```

### 9.5 Redis Caching

The portal uses Redis for caching expensive queries (e.g., analytics). Use the helpers from `@/lib/redis`:

```typescript
import { withCache, invalidateCache, buildCacheKey } from '@/lib/redis'

// Cache expensive analytics query for 5 minutes (300 seconds)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const entityId = searchParams.get('entity_id')
  const forceRefresh = searchParams.get('refresh') === 'true'

  // Build a unique cache key
  const cacheKey = buildCacheKey('analytics', { entityId })

  // Use withCache wrapper - falls back to fetcher if Redis unavailable
  const data = await withCache(
    cacheKey,
    300, // TTL in seconds
    async () => {
      // This only runs on cache miss
      const result = await pool.query(`
        SELECT ... expensive aggregation query ...
      `)
      return result.rows
    },
    forceRefresh // Pass true to bypass cache
  )

  return respondSuccess(data)
}
```

**When to use caching:**
- Analytics and aggregation queries
- Data that doesn't change frequently
- Expensive database operations

**When NOT to cache:**
- User-specific data that changes often
- Real-time data (ticket status, etc.)
- Write operations

**Invalidating cache after data changes:**

```typescript
// After creating/updating data that affects cached results
import { invalidateCache } from '@/lib/redis'

export async function POST(request: NextRequest) {
  // ... create new record ...

  // Invalidate related cache entries
  await invalidateCache('analytics:*')  // Pattern-based invalidation

  return respondSuccess(newRecord)
}
```

**Note:** Redis is optional - if unavailable, `withCache` automatically falls back to direct database queries without failing the request.

---

## 10. Testing Your API

### 10.1 Using curl

```bash
# GET request
curl http://localhost:3000/api/admin/users

# GET with query params
curl "http://localhost:3000/api/admin/tickets?page=1&limit=10&status=open"

# POST request
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gov.gd", "name": "Test User", "role_id": 1}'

# With authentication cookie (copy from browser)
curl http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=your-session-token"
```

### 10.2 Using Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to a page that calls your API
4. Click on the request to see details
5. Right-click → "Copy as cURL" to get full command

### 10.3 Testing Authentication

```bash
# Test unauthorized access (should return 401)
curl http://localhost:3000/api/admin/users
# Expected: {"error":"Unauthorized"}

# Test forbidden access (wrong role)
# Login as staff user, try admin endpoint
# Expected: {"error":"Forbidden - Admin access required"}
```

---

## 11. Checklist

Before deploying your API endpoint:

### Code Quality
- [ ] All user input uses parameterized queries (`$1`, `$2`)
- [ ] No SQL concatenation with user input
- [ ] Error messages don't expose internal details
- [ ] Proper error handling with try-catch
- [ ] Consistent response format

### Security
- [ ] Authentication check (if required)
- [ ] Authorization check (role-based)
- [ ] Entity filtering for staff users
- [ ] Input validation (length, format, type)
- [ ] File upload validation (if applicable)

### Performance
- [ ] Pagination for list endpoints
- [ ] Appropriate indexes exist for queries
- [ ] No N+1 query problems
- [ ] Reasonable limits on result sizes

### Documentation
- [ ] JSDoc comments at top of file
- [ ] HTTP method and path documented
- [ ] Purpose and behavior described

### Testing
- [ ] Test happy path
- [ ] Test validation errors
- [ ] Test authentication/authorization
- [ ] Test edge cases (empty results, not found)
- [ ] TypeScript compiles: `npx tsc --noEmit`

---

## Quick Reference

### Common Imports

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool, executeQuery, withTransaction } from '@/lib/db'
import { withCache, invalidateCache, buildCacheKey } from '@/lib/redis'
import {
  respondSuccess,
  respondList,
  respondError,
  respondValidationError,
  respondNotFound,
  respondServerError,
  ErrorCodes,
} from '@/lib/response'
```

### HTTP Status Codes

| Status | Meaning | When to Use |
|--------|---------|-------------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or invalid state |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Unexpected error |

---

**Last Updated:** January 19, 2026 | **Version:** 1.1

**Change Log:**
- v1.1 (Jan 19, 2026): Added citizen authentication endpoints, system settings APIs, database backup endpoints, enhanced supporting libraries list
- v1.0 (Jan 2026): Initial version

For questions or to report issues with this guide, contact the development team.
