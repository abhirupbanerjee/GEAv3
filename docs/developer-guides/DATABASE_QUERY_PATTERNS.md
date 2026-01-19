# GEA Portal - Database Query Patterns Guide

**Government of Grenada Enterprise Architecture Portal**

**Version:** 1.0
**Last Updated:** January 2026
**Audience:** Backend Developers, Database Developers

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Connection Management](#2-connection-management)
3. [Basic Query Patterns](#3-basic-query-patterns)
4. [Parameterized Queries](#4-parameterized-queries)
5. [Transactions](#5-transactions)
6. [Common Query Patterns](#6-common-query-patterns)
7. [Performance Optimization](#7-performance-optimization)
8. [Error Handling](#8-error-handling)
9. [Quick Reference](#9-quick-reference)

---

## 1. Introduction

### 1.1 About This Guide

This guide provides **database query patterns** specific to the GEA Portal. Following these patterns ensures security, performance, and maintainability.

### 1.2 Database Overview

| Metric | Value |
|--------|-------|
| **Database** | PostgreSQL 16 |
| **Connection Pooling** | PgBouncer v1.23.1 (200 max clients, 20 pool size) |
| **Total Tables** | 40+ |
| **Indexes** | 60+ |
| **Direct Pool** | 20 max connections (via lib/db.ts) |

### 1.3 Key Tables by Category

| Category | Tables |
|----------|--------|
| **Reference Data** | `entity_master`, `service_master`, `service_attachments` |
| **Admin/Staff Auth** | `users`, `user_roles`, `accounts`, `sessions` |
| **Citizen Auth** | `citizens`, `citizen_sessions`, `citizen_trusted_devices`, `citizen_otp`, `citizen_account_blocks` |
| **System Settings** | `system_settings`, `settings_audit_log`, `leadership_contacts` |
| **Feedback** | `service_feedback`, `grievance_tickets` |
| **Tickets** | `tickets`, `ticket_activity`, `ticket_notes` |
| **EA Requests** | `ea_service_requests`, `ea_service_request_attachments` |

---

## 2. Connection Management

### 2.1 Using the Connection Pool

The pool is configured in `frontend/src/lib/db.ts`:

```typescript
import { pool } from '@/lib/db'

// Direct pool query
const result = await pool.query('SELECT * FROM tickets')
```

### 2.2 Pool Configuration

```typescript
// Current configuration (in db.ts)
const config = {
  max: 20,                    // Maximum 20 connections
  idleTimeoutMillis: 30000,   // Close idle after 30 seconds
  connectionTimeoutMillis: 5000, // Fail if can't connect in 5 seconds
}
```

### 2.3 Checking Pool Health

```typescript
import { getPoolStats, healthCheck } from '@/lib/db'

// Get pool statistics
const stats = getPoolStats()
console.log(stats)
// { totalConnections: 5, idleConnections: 3, activeConnections: 2 }

// Health check
const health = await healthCheck()
console.log(health)
// { status: 'ok', message: 'Database connection healthy', latency: 12 }
```

---

## 3. Basic Query Patterns

### 3.1 SELECT - Single Row

```typescript
// Get single ticket by ID
const result = await pool.query(
  'SELECT * FROM tickets WHERE ticket_id = $1',
  [ticketId]
)

if (result.rows.length === 0) {
  // Handle not found
}

const ticket = result.rows[0]
```

### 3.2 SELECT - Multiple Rows

```typescript
// Get all open tickets
const result = await pool.query(
  `SELECT * FROM tickets
   WHERE status = $1
   ORDER BY created_at DESC`,
  ['open']
)

const tickets = result.rows
const count = result.rowCount
```

### 3.3 SELECT with JOIN

```typescript
// Get tickets with entity and user info
const result = await pool.query(`
  SELECT
    t.ticket_id,
    t.ticket_number,
    t.subject,
    t.status,
    t.created_at,
    e.entity_name,
    e.unique_entity_id,
    u.name as created_by_name,
    u.email as created_by_email
  FROM tickets t
  LEFT JOIN entity_master e ON t.entity_id = e.unique_entity_id
  LEFT JOIN users u ON t.created_by = u.email
  WHERE t.status = $1
  ORDER BY t.created_at DESC
`, ['open'])
```

### 3.4 INSERT with RETURNING

```typescript
// Insert and get the new row back
const result = await pool.query(
  `INSERT INTO tickets (subject, description, entity_id, status, created_by)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING ticket_id, ticket_number, created_at`,
  [subject, description, entityId, 'open', userEmail]
)

const newTicket = result.rows[0]
// { ticket_id: 123, ticket_number: 'TKT-2026-00001', created_at: '...' }
```

### 3.5 UPDATE with RETURNING

```typescript
// Update and get the modified row
const result = await pool.query(
  `UPDATE tickets
   SET status = $1, resolved_at = CURRENT_TIMESTAMP, updated_by = $2
   WHERE ticket_id = $3
   RETURNING *`,
  ['resolved', userEmail, ticketId]
)

if (result.rowCount === 0) {
  // No rows updated - ticket not found
}
```

### 3.6 DELETE

```typescript
// Delete a record
const result = await pool.query(
  'DELETE FROM ticket_notes WHERE note_id = $1 AND ticket_id = $2',
  [noteId, ticketId]
)

if (result.rowCount === 0) {
  // No rows deleted - record not found
}
```

---

## 4. Parameterized Queries

### 4.1 Why Parameterized Queries?

**NEVER** do this (SQL injection vulnerability):
```typescript
// ❌ DANGEROUS - Never do this!
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
```

**ALWAYS** use parameterized queries:
```typescript
// ✅ SAFE - Always use parameters
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
)
```

### 4.2 Parameter Syntax

PostgreSQL uses numbered parameters: `$1`, `$2`, `$3`, etc.

```typescript
// Multiple parameters
const result = await pool.query(
  `SELECT * FROM tickets
   WHERE status = $1 AND entity_id = $2 AND priority = $3`,
  [status, entityId, priority]
)
```

### 4.3 Dynamic Query Building

When building queries dynamically, track parameter position:

```typescript
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
  query += ` AND subject ILIKE $${params.length}`
}

// params.length tracks the parameter number automatically
const result = await pool.query(query, params)
```

### 4.4 IN Clause with Parameters

```typescript
// Option 1: Generate numbered parameters
const statusList = ['open', 'in_progress', 'pending']
const placeholders = statusList.map((_, i) => `$${i + 1}`).join(', ')

const result = await pool.query(
  `SELECT * FROM tickets WHERE status IN (${placeholders})`,
  statusList
)

// Option 2: Use ANY with array
const result = await pool.query(
  'SELECT * FROM tickets WHERE status = ANY($1)',
  [statusList]
)
```

---

## 5. Transactions

### 5.1 When to Use Transactions

Use transactions when:
- Multiple tables need to be updated together
- An operation must be "all or nothing"
- You need to prevent race conditions

### 5.2 Using withTransaction Helper

```typescript
import { withTransaction } from '@/lib/db'

const ticketId = await withTransaction(async (client) => {
  // Step 1: Create ticket
  const ticketResult = await client.query(
    `INSERT INTO tickets (subject, entity_id)
     VALUES ($1, $2)
     RETURNING ticket_id`,
    [subject, entityId]
  )
  const ticketId = ticketResult.rows[0].ticket_id

  // Step 2: Create initial activity
  await client.query(
    `INSERT INTO ticket_activity (ticket_id, action, performed_by)
     VALUES ($1, $2, $3)`,
    [ticketId, 'created', userEmail]
  )

  // Step 3: Update entity stats
  await client.query(
    `UPDATE entity_stats SET ticket_count = ticket_count + 1
     WHERE entity_id = $1`,
    [entityId]
  )

  // Return value from transaction
  return ticketId
})

// If any step fails, all changes are rolled back automatically
```

### 5.3 Manual Transaction Control

```typescript
const client = await pool.connect()

try {
  await client.query('BEGIN')

  // Your queries here...
  await client.query('INSERT INTO ...')
  await client.query('UPDATE ...')

  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release() // Always release the connection!
}
```

### 5.4 Transaction Example: Status Change

```typescript
const result = await withTransaction(async (client) => {
  // 1. Get current ticket state
  const current = await client.query(
    'SELECT status, assigned_to FROM tickets WHERE ticket_id = $1 FOR UPDATE',
    [ticketId]
  )

  if (current.rows.length === 0) {
    throw new Error('Ticket not found')
  }

  const oldStatus = current.rows[0].status

  // 2. Update ticket status
  await client.query(
    `UPDATE tickets SET status = $1, updated_at = NOW() WHERE ticket_id = $2`,
    [newStatus, ticketId]
  )

  // 3. Log the activity
  await client.query(
    `INSERT INTO ticket_activity (ticket_id, action, old_value, new_value, performed_by)
     VALUES ($1, 'status_change', $2, $3, $4)`,
    [ticketId, oldStatus, newStatus, userEmail]
  )

  // 4. If resolved, set resolution time
  if (newStatus === 'resolved') {
    await client.query(
      `UPDATE tickets SET resolved_at = NOW() WHERE ticket_id = $1`,
      [ticketId]
    )
  }

  return { oldStatus, newStatus }
})
```

---

## 6. Common Query Patterns

### 6.1 Pagination

```typescript
const page = Math.max(1, parseInt(pageParam || '1'))
const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20')))
const offset = (page - 1) * limit

// Get total count
const countResult = await pool.query(
  'SELECT COUNT(*) FROM tickets WHERE status = $1',
  [status]
)
const total = parseInt(countResult.rows[0].count)

// Get page of data
const result = await pool.query(
  `SELECT * FROM tickets
   WHERE status = $1
   ORDER BY created_at DESC
   LIMIT $2 OFFSET $3`,
  [status, limit, offset]
)

// Return with pagination metadata
return {
  data: result.rows,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrevious: page > 1
  }
}
```

### 6.2 Search with ILIKE

```typescript
// Case-insensitive search
const searchTerm = `%${search}%`

const result = await pool.query(
  `SELECT * FROM tickets
   WHERE subject ILIKE $1 OR description ILIKE $1
   ORDER BY created_at DESC
   LIMIT 50`,
  [searchTerm]
)
```

### 6.3 Date Range Filtering

```typescript
// Filter by date range
const result = await pool.query(
  `SELECT * FROM tickets
   WHERE created_at >= $1 AND created_at < $2
   ORDER BY created_at DESC`,
  [startDate, endDate]
)

// Today's tickets
const result = await pool.query(
  `SELECT * FROM tickets
   WHERE created_at >= CURRENT_DATE
     AND created_at < CURRENT_DATE + INTERVAL '1 day'`
)

// Last 7 days
const result = await pool.query(
  `SELECT * FROM tickets
   WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
)
```

### 6.4 Aggregations

```typescript
// Count by status
const result = await pool.query(`
  SELECT status, COUNT(*) as count
  FROM tickets
  GROUP BY status
  ORDER BY count DESC
`)

// Average resolution time
const result = await pool.query(`
  SELECT
    entity_id,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
  FROM tickets
  WHERE resolved_at IS NOT NULL
  GROUP BY entity_id
`)

// Monthly trends
const result = await pool.query(`
  SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved
  FROM tickets
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month
`)
```

### 6.5 Existence Check

```typescript
// Check if record exists
const result = await pool.query(
  'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
  [email]
)

const exists = result.rows.length > 0
```

### 6.6 Upsert (Insert or Update)

```typescript
// Insert or update on conflict
const result = await pool.query(
  `INSERT INTO user_preferences (user_id, preference_key, preference_value)
   VALUES ($1, $2, $3)
   ON CONFLICT (user_id, preference_key)
   DO UPDATE SET preference_value = EXCLUDED.preference_value, updated_at = NOW()
   RETURNING *`,
  [userId, key, value]
)
```

### 6.7 Entity-Based Filtering (Staff Users)

```typescript
// Common pattern for staff data access
async function getTicketsForUser(session: Session) {
  let query = `
    SELECT t.*, e.entity_name
    FROM tickets t
    JOIN entity_master e ON t.entity_id = e.unique_entity_id
    WHERE 1=1
  `
  const params: any[] = []

  // Staff can only see their entity's tickets
  if (session.user.roleType === 'staff') {
    params.push(session.user.entityId)
    query += ` AND t.entity_id = $${params.length}`
  }
  // Admins see all tickets (no filter)

  query += ' ORDER BY t.created_at DESC'

  return await pool.query(query, params)
}
```

---

## 7. Performance Optimization

### 7.1 Use Specific Columns

```typescript
// ❌ Avoid SELECT * when you don't need all columns
const result = await pool.query('SELECT * FROM tickets')

// ✅ Select only what you need
const result = await pool.query(`
  SELECT ticket_id, ticket_number, subject, status, created_at
  FROM tickets
`)
```

### 7.2 Limit Result Size

```typescript
// Always use LIMIT for potentially large result sets
const result = await pool.query(
  'SELECT * FROM tickets ORDER BY created_at DESC LIMIT 100'
)
```

### 7.3 Use Indexes

Check if appropriate indexes exist for your query columns:

```sql
-- View existing indexes on a table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tickets';
```

Common indexed columns in GEA Portal:
- `ticket_id`, `ticket_number` (primary key, unique)
- `status`, `entity_id`, `created_at` (filtering/sorting)
- `email` in users table (lookup)

### 7.4 Avoid N+1 Queries

```typescript
// ❌ N+1 problem - one query per ticket
const tickets = await pool.query('SELECT * FROM tickets')
for (const ticket of tickets.rows) {
  const entity = await pool.query(
    'SELECT * FROM entity_master WHERE unique_entity_id = $1',
    [ticket.entity_id]
  )
  // ...
}

// ✅ Single query with JOIN
const result = await pool.query(`
  SELECT t.*, e.entity_name, e.entity_type
  FROM tickets t
  LEFT JOIN entity_master e ON t.entity_id = e.unique_entity_id
`)
```

### 7.5 Use EXPLAIN for Query Analysis

```sql
-- Analyze query execution plan
EXPLAIN ANALYZE
SELECT * FROM tickets
WHERE entity_id = 'MIN-001' AND status = 'open'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 8. Error Handling

### 8.1 Common PostgreSQL Error Codes

| Error Code | Meaning | How to Handle |
|------------|---------|---------------|
| `23505` | Unique violation | Duplicate key - return 409 Conflict |
| `23503` | Foreign key violation | Referenced record doesn't exist - return 400 |
| `23502` | Not null violation | Missing required field - return 400 |
| `42P01` | Table not found | Table doesn't exist - configuration error |
| `42703` | Column not found | Column doesn't exist - code/migration issue |

### 8.2 Error Handling Pattern

```typescript
try {
  const result = await pool.query(query, params)
  return { success: true, data: result.rows }

} catch (error: any) {
  // Handle specific PostgreSQL errors
  switch (error.code) {
    case '23505': // Unique violation
      return {
        success: false,
        error: 'Duplicate entry',
        field: error.constraint // e.g., 'users_email_key'
      }

    case '23503': // Foreign key violation
      return {
        success: false,
        error: 'Referenced record does not exist'
      }

    case '23502': // Not null violation
      return {
        success: false,
        error: `Missing required field: ${error.column}`
      }

    default:
      // Log unexpected errors
      console.error('Database error:', {
        code: error.code,
        message: error.message,
        query: query.substring(0, 100)
      })
      throw error
  }
}
```

### 8.3 Connection Error Handling

```typescript
try {
  const result = await pool.query(query)
  return result.rows

} catch (error: any) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Database connection refused - is PostgreSQL running?')
    throw new Error('Database unavailable')
  }

  if (error.code === 'ETIMEDOUT') {
    console.error('Database connection timeout')
    throw new Error('Database timeout')
  }

  throw error
}
```

---

## 9. Quick Reference

### 9.1 Import Statement

```typescript
import { pool, executeQuery, withTransaction, healthCheck } from '@/lib/db'
```

### 9.2 Query Cheat Sheet

| Operation | Pattern |
|-----------|---------|
| **Select one** | `SELECT * FROM t WHERE id = $1 LIMIT 1` |
| **Select many** | `SELECT * FROM t WHERE status = $1 ORDER BY created_at DESC` |
| **Count** | `SELECT COUNT(*) FROM t WHERE status = $1` |
| **Insert** | `INSERT INTO t (a, b) VALUES ($1, $2) RETURNING *` |
| **Update** | `UPDATE t SET a = $1 WHERE id = $2 RETURNING *` |
| **Delete** | `DELETE FROM t WHERE id = $1` |
| **Exists** | `SELECT 1 FROM t WHERE id = $1 LIMIT 1` |
| **Upsert** | `INSERT ... ON CONFLICT (key) DO UPDATE SET ...` |

### 9.3 Common Filters

```sql
-- Date comparisons
WHERE created_at >= $1 AND created_at < $2
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'

-- Text search
WHERE name ILIKE $1  -- Case-insensitive
WHERE name ILIKE '%' || $1 || '%'  -- Contains

-- NULL handling
WHERE resolved_at IS NULL
WHERE resolved_at IS NOT NULL
COALESCE(value, 'default')

-- Array/IN
WHERE status IN ($1, $2, $3)
WHERE status = ANY($1)  -- $1 is array
```

### 9.4 Useful PostgreSQL Functions

```sql
-- Current timestamp
CURRENT_TIMESTAMP, NOW()

-- Date extraction
DATE_TRUNC('month', created_at)
EXTRACT(EPOCH FROM interval)

-- String functions
LOWER(email), UPPER(name)
TRIM(input), LENGTH(text)

-- Conditional
CASE WHEN condition THEN 'yes' ELSE 'no' END
COALESCE(nullable_value, 'default')
NULLIF(value, 0)

-- Aggregates
COUNT(*), COUNT(DISTINCT entity_id)
SUM(amount), AVG(rating)
MIN(created_at), MAX(updated_at)
```

---

**Last Updated:** January 19, 2026 | **Version:** 1.1

**Change Log:**
- v1.1 (Jan 19, 2026): Added citizen authentication tables, system settings tables, PgBouncer connection pooling info, updated table counts
- v1.0 (Jan 2026): Initial version

For questions or to report issues with this guide, contact the development team.
