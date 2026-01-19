# GEA Portal - Testing Guide

**Government of Grenada Enterprise Architecture Portal**

**Version:** 2.0
**Last Updated:** January 2026
**Audience:** All Developers

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Testing Strategy Overview](#2-testing-strategy-overview)
3. [Automated Testing](#3-automated-testing) **NEW**
4. [Manual API Testing](#4-manual-api-testing)
5. [Testing Authentication](#5-testing-authentication)
6. [Database Testing](#6-database-testing)
7. [UI Testing](#7-ui-testing)
8. [Performance Testing](#8-performance-testing)
9. [Pre-Deployment Checklist](#9-pre-deployment-checklist)

---

## 1. Introduction

### 1.1 About This Guide

This guide provides **testing procedures and patterns** for the GEA Portal. It covers both automated testing with Vitest and manual testing procedures to ensure code quality.

### 1.2 Testing Priorities

| Priority | What to Test | When |
|----------|--------------|------|
| **Critical** | Authentication, authorization | Every change |
| **High** | API endpoints, database operations | Every feature |
| **Medium** | UI functionality, form validation | Feature development |
| **Low** | Edge cases, error messages | Before release |

---

## 2. Testing Strategy Overview

### 2.1 Types of Testing

| Type | Purpose | Tools |
|------|---------|-------|
| **API Testing** | Verify endpoints work correctly | curl, Postman, browser DevTools |
| **Database Testing** | Verify queries and data integrity | psql, pgAdmin |
| **UI Testing** | Verify user interface functionality | Browser, DevTools |
| **Security Testing** | Verify auth and input validation | Manual + curl |

### 2.2 Test Environments

| Environment | URL | Database | Purpose |
|-------------|-----|----------|---------|
| **Local** | http://localhost:3000 | Local Docker | Development |
| **Production** | https://gea.gov.gd | Production DB | Live system |

---

## 3. Automated Testing

The GEA Portal uses **Vitest** for automated testing with **React Testing Library** for component tests.

### 3.1 Running Tests

```bash
cd frontend

# Run tests in watch mode (development)
npm test

# Run tests once (CI/CD)
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

### 3.2 Test Structure

```
frontend/
├── __tests__/
│   ├── setup.ts                    # Global test setup and mocks
│   ├── lib/
│   │   ├── redis.test.ts           # Cache key building (9 tests)
│   │   ├── entity-filter.test.ts   # Entity filtering logic (18 tests)
│   │   └── backup.test.ts          # Backup utilities (27 tests)
│   ├── api/
│   │   └── admin/
│   │       ├── users.test.ts           # User management API (12 tests)
│   │       ├── service-requests.test.ts # Service requests API (12 tests)
│   │       └── backups-download.test.ts # Backup download API (9 tests)
│   └── components/
│       ├── Sidebar.test.tsx        # Navigation sidebar (14 tests)
│       └── QRCodeManager.test.tsx  # QR code management (20 tests)
├── vitest.config.ts                # Vitest configuration
└── package.json                    # Test scripts
```

### 3.3 What Automated Tests Cover

| Category | Tests | Coverage Area |
|----------|-------|---------------|
| **Unit Tests** | 54 | Pure functions (cache keys, entity filtering, backup validation) |
| **API Tests** | 33 | Authentication, authorization, validation, error handling |
| **Component Tests** | 34 | UI rendering, user interactions, role-based visibility |

### 3.4 Security-Critical Tests (Never Remove)

These tests validate security controls:

- **Authentication**: 403 for unauthenticated/unauthorized users
- **Role-based access**: Admin vs staff permissions
- **Entity filtering**: Staff users only see their entity's data
- **Path traversal prevention**: Malicious filename rejection
- **Input validation**: Required fields, duplicate prevention

### 3.5 When to Add/Update Tests

**Add new tests when:**
- Adding a new API endpoint
- Adding a new component
- Adding a new utility function
- Adding role-based features

**Update existing tests when:**
- Changing API response structure
- Changing component text/labels (watch for emojis - use regex patterns)
- Changing authentication or validation rules

### 3.6 Writing New Tests

#### API Route Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/[your-endpoint]/route'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  pool: { query: vi.fn() }
}))

import { getServerSession } from 'next-auth'
import { pool } from '@/lib/db'

describe('/api/[your-endpoint]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 403 for unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/your-endpoint')
    const response = await GET(request)

    expect(response.status).toBe(403)
  })
})
```

#### Component Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YourComponent from '@/components/YourComponent'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}))

describe('YourComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### 3.7 CI/CD Integration

Tests run automatically via GitHub Actions on:
- Every push to `main` or `develop` branches
- Every pull request targeting `main` or `develop`

**Workflow file:** `.github/workflows/test.yml`

**What runs:**
1. `npm run test:run` - All 121 tests
2. `npm run test:coverage` - Coverage report
3. `npm run lint` - ESLint checks
4. `npx tsc --noEmit` - TypeScript type checking

**Viewing results:**
- Go to the **Actions** tab in GitHub
- Click on the workflow run to see test output
- Download coverage report from **Artifacts**

**PR Requirements:**
- All tests must pass before merging
- Consider adding branch protection rules in GitHub settings

### 3.8 ESLint Configuration

**Note:** Next.js 16 removed the `next lint` command. The project uses ESLint 9 with flat config.

**Configuration file:** `frontend/eslint.config.mjs`

**Running lint:**
```bash
cd frontend
npm run lint  # Uses: eslint src
```

### 3.9 Troubleshooting Automated Tests

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Check import path matches `@/` alias |
| "Multiple elements found" | Use more specific selectors (`getByRole`, `getByTestId`) |
| Async state warnings | Wrap assertions in `waitFor()` |
| Mock not working | Ensure `vi.mock()` at top level, call `vi.clearAllMocks()` in `beforeEach` |
| CI fails but local passes | Check Node.js version matches (v22) |
| "next lint" not found | Next.js 16 removed this - use `npm run lint` instead |

---

## 4. Manual API Testing

### 4.1 Using curl

**Basic GET request:**
```bash
curl http://localhost:3000/api/managedata/entities
```

**GET with query parameters:**
```bash
curl "http://localhost:3000/api/admin/tickets/list?page=1&limit=10&status=open"
```

**POST request with JSON:**
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "SVC-001",
    "rating": 5,
    "comment": "Great service!"
  }'
```

**POST with authentication cookie:**
```bash
# First, get your session cookie from browser DevTools
# Application > Cookies > next-auth.session-token

curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE" \
  -d '{
    "email": "test@gov.gd",
    "name": "Test User",
    "role_id": 2
  }'
```

### 4.2 Using Browser DevTools

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Perform action that triggers API call
4. Click on the request to see:
   - Request headers and body
   - Response status and body
   - Timing information

**Pro tip:** Right-click request → "Copy as cURL" for command-line testing.

### 4.3 API Test Cases

#### Public Endpoints

| Endpoint | Test Case | Expected Result |
|----------|-----------|-----------------|
| `GET /api/managedata/entities` | Fetch all entities | 200, list of entities |
| `GET /api/managedata/services` | Fetch all services | 200, list of services |
| `POST /api/feedback` | Submit valid feedback | 201, confirmation |
| `POST /api/feedback` | Submit without rating | 400, validation error |
| `GET /api/helpdesk/[number]` | Valid ticket number | 200, ticket details |
| `GET /api/helpdesk/INVALID` | Invalid ticket number | 404, not found |

#### Admin Endpoints

| Endpoint | Test Case | Expected Result |
|----------|-----------|-----------------|
| `GET /api/admin/users` | Without auth | 401 Unauthorized |
| `GET /api/admin/users` | As staff user | 403 Forbidden |
| `GET /api/admin/users` | As admin user | 200, user list |
| `POST /api/admin/users` | Missing email | 400, validation error |
| `POST /api/admin/users` | Duplicate email | 409, conflict |

### 4.4 Response Validation Checklist

For each API response, verify:
- [ ] Correct HTTP status code
- [ ] `success` field matches expectation
- [ ] `data` or `error` field present
- [ ] Response time is acceptable (<500ms for most endpoints)
- [ ] No sensitive data exposed in errors

---

## 5. Testing Authentication

### 5.1 Session Testing

**Check if logged in:**
```bash
# Should return 401 if not authenticated
curl http://localhost:3000/api/admin/users

# With valid session
curl http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### 5.2 Role-Based Access Tests

| Scenario | Action | Expected |
|----------|--------|----------|
| **Unauthenticated** | Access /admin/users | Redirect to /auth/signin |
| **Unauthenticated** | Call /api/admin/users | 401 Unauthorized |
| **Staff user** | Access /admin/users | 403 Forbidden |
| **Staff user** | Access /admin/tickets | 200 (own entity only) |
| **Admin user** | Access /admin/users | 200 (full access) |
| **Admin user** | Access /admin/tickets | 200 (all entities) |

### 5.3 Entity Filtering Tests

For staff users, verify they only see their entity's data:

```bash
# Login as staff user assigned to MIN-001
# GET tickets should only return MIN-001 tickets

curl http://localhost:3000/api/admin/tickets/list \
  -H "Cookie: next-auth.session-token=STAFF_TOKEN"

# Verify: All returned tickets have entity_id = MIN-001
```

### 5.4 Testing User States

| User State | Test | Expected |
|------------|------|----------|
| **Active user** | Login | Success |
| **Inactive user** | Login | Redirect to /auth/unauthorized |
| **Non-existent email** | Login | Redirect to /auth/unauthorized |
| **Session expired** | Access protected route | Redirect to /auth/signin |

---

## 6. Database Testing

### 6.1 Connecting to Database

```bash
# Local development
docker exec -it feedback_db psql -U feedback_user -d feedback

# Quick query
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT COUNT(*) FROM tickets"
```

### 6.2 Data Integrity Checks

```sql
-- Check foreign key relationships
SELECT t.ticket_id, t.entity_id
FROM tickets t
LEFT JOIN entity_master e ON t.entity_id = e.unique_entity_id
WHERE e.unique_entity_id IS NULL;
-- Should return 0 rows (no orphaned tickets)

-- Check user role assignments
SELECT u.email, u.role_id
FROM users u
LEFT JOIN user_roles r ON u.role_id = r.role_id
WHERE r.role_id IS NULL;
-- Should return 0 rows (all users have valid roles)

-- Check for duplicate emails
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### 6.3 Testing Database Operations

After API operations, verify database state:

```sql
-- After creating a ticket via API
SELECT ticket_id, ticket_number, status, created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 1;

-- After updating ticket status
SELECT ticket_id, status, updated_at, updated_by
FROM tickets
WHERE ticket_id = [ID];

-- Verify audit log was created
SELECT *
FROM user_audit_log
ORDER BY created_at DESC
LIMIT 5;
```

### 6.4 Transaction Testing

Test that failed transactions rollback properly:

1. Start a multi-step operation
2. Force an error in a later step
3. Verify no partial data was saved

```sql
-- Check ticket count before
SELECT COUNT(*) FROM tickets;

-- [Attempt operation that should fail mid-transaction]

-- Check ticket count after (should be same)
SELECT COUNT(*) FROM tickets;
```

---

## 7. UI Testing

### 7.1 Page Load Testing

| Page | Check |
|------|-------|
| `/` | Home page loads, navigation visible |
| `/feedback` | Form renders, entities load in dropdown |
| `/admin/home` | Dashboard cards display, data loads |
| `/admin/tickets` | Table renders, pagination works |
| `/admin/users` | User list displays, add button visible |

### 7.2 Form Validation Testing

For each form, test:
- [ ] Required fields show error when empty
- [ ] Invalid format shows appropriate error
- [ ] Valid data submits successfully
- [ ] Success/error messages display correctly
- [ ] Form resets after successful submission (if applicable)

### 7.3 Responsive Design Testing

Test on different viewport sizes:
- [ ] Mobile (375px width)
- [ ] Tablet (768px width)
- [ ] Desktop (1024px+ width)

Use browser DevTools → Device Toolbar (Ctrl+Shift+M) to simulate devices.

### 7.4 Browser Console Checks

After each action, check browser console for:
- [ ] No JavaScript errors (red)
- [ ] No React warnings (yellow)
- [ ] No failed network requests
- [ ] No CORS errors

---

## 8. Performance Testing

### 8.1 API Response Times

Measure response times for critical endpoints:

```bash
# Time a request
time curl -s http://localhost:3000/api/managedata/entities > /dev/null

# Multiple measurements
for i in {1..5}; do
  curl -s -o /dev/null -w "%{time_total}\n" \
    http://localhost:3000/api/admin/tickets/list
done
```

**Expected response times:**
- Simple lookups: <100ms
- List queries: <200ms
- Complex analytics: <500ms
- File uploads: <2000ms

### 8.2 Database Query Performance

```sql
-- Enable timing
\timing on

-- Run your query
SELECT * FROM tickets WHERE status = 'open' ORDER BY created_at DESC LIMIT 50;

-- Check query execution plan
EXPLAIN ANALYZE
SELECT * FROM tickets
WHERE entity_id = 'MIN-001' AND status = 'open'
ORDER BY created_at DESC;
```

### 8.3 Load Testing (Basic)

```bash
# Simple concurrent requests (requires Apache Bench)
ab -n 100 -c 10 http://localhost:3000/api/managedata/entities

# -n 100 = 100 total requests
# -c 10 = 10 concurrent requests
```

---

## 9. Pre-Deployment Checklist

### 9.1 Code Quality

- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] ESLint passes: `npm run lint`
- [ ] **Automated tests pass: `npm run test:run`**
- [ ] No console.log statements in production code
- [ ] No hardcoded credentials or secrets

### 9.2 Security

- [ ] All endpoints use parameterized queries
- [ ] Authentication required for admin endpoints
- [ ] Authorization checks for role-based access
- [ ] Input validation on all user inputs
- [ ] Error messages don't expose internal details

### 9.3 Functionality

- [ ] Happy path works for all new features
- [ ] Error cases return appropriate status codes
- [ ] Validation errors provide helpful messages
- [ ] Database state is correct after operations

### 9.4 Performance

- [ ] API responses under 500ms
- [ ] No N+1 query issues
- [ ] Pagination implemented for list endpoints
- [ ] Large file uploads have size limits

### 9.5 Production Readiness

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build completes successfully: `npm run build`
- [ ] Application starts without errors
- [ ] Health check endpoint responds

---

## Appendix A: Test Data

### Creating Test Users

```sql
-- Add test admin user
INSERT INTO users (email, name, role_id, is_active)
VALUES (
  'testadmin@gov.gd',
  'Test Admin',
  (SELECT role_id FROM user_roles WHERE role_code = 'admin_dta'),
  TRUE
);

-- Add test staff user
INSERT INTO users (email, name, role_id, entity_id, is_active)
VALUES (
  'teststaff@gov.gd',
  'Test Staff',
  (SELECT role_id FROM user_roles WHERE role_code = 'staff_mda'),
  'MIN-001',
  TRUE
);
```

### Cleaning Test Data

```sql
-- Remove test users (be careful!)
DELETE FROM users WHERE email LIKE 'test%@gov.gd';

-- Remove test tickets
DELETE FROM tickets WHERE subject LIKE 'TEST:%';
```

---

## Appendix B: Common Issues

### Issue: 401 Unauthorized on Admin Endpoints

**Cause:** Session expired or cookie not sent

**Solution:**
1. Login again in browser
2. Copy fresh session cookie
3. Verify cookie is included in request

### Issue: 403 Forbidden for Staff User

**Cause:** Trying to access admin-only endpoint

**Solution:** Verify endpoint allows staff access, or login as admin

### Issue: Database Connection Errors

**Cause:** Database container not running

**Solution:**
```bash
docker-compose up -d feedback_db
docker-compose ps  # Verify status
```

### Issue: Validation Errors Not Clear

**Cause:** Missing or incorrect field names in request

**Solution:** Check response body for `details` field with specific errors

---

**Last Updated:** January 19, 2026 | **Version:** 2.0

**Change Log:**
- v2.0 (Jan 2026): Added automated testing with Vitest, ESLint 9 configuration, CI/CD integration (121 tests total)
- v1.0: Initial manual testing guide

For questions or to report issues with this guide, contact the development team.
