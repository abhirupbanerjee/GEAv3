/**
 * Tests for /api/admin/users API route
 *
 * Tests authentication, authorization, and business logic for user management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/admin/users/route'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  pool: {
    query: vi.fn()
  }
}))

vi.mock('@/lib/settings', () => ({
  getServiceRequestEntityId: vi.fn().mockResolvedValue('AGY-005'),
  getSetting: vi.fn().mockResolvedValue('["AGY-005"]')
}))

import { getServerSession } from 'next-auth'
import { pool } from '@/lib/db'

const mockGetServerSession = vi.mocked(getServerSession)
const mockQuery = vi.mocked(pool.query)

describe('/api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/users', () => {
    it('should return 403 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 403 for non-admin/staff users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'public', email: 'user@example.com' }
      })

      const request = new NextRequest('http://localhost/api/admin/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return all users for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })

      mockQuery.mockResolvedValue({
        rows: [
          { id: 1, email: 'user1@example.com', name: 'User 1', role_type: 'staff' },
          { id: 2, email: 'user2@example.com', name: 'User 2', role_type: 'admin' }
        ]
      } as any)

      const request = new NextRequest('http://localhost/api/admin/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.users).toHaveLength(2)
      expect(data.isStaffView).toBe(false)
    })

    it('should filter users by entity for staff', async () => {
      const staffEntityId = 'AGY-001'
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'staff', email: 'staff@example.com', entityId: staffEntityId }
      })

      mockQuery.mockResolvedValue({
        rows: [
          { id: 1, email: 'user1@example.com', name: 'User 1', entity_id: staffEntityId }
        ]
      } as any)

      const request = new NextRequest('http://localhost/api/admin/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.isStaffView).toBe(true)

      // Verify query was called with entity filter
      const queryCall = mockQuery.mock.calls[0]
      expect(queryCall[0]).toContain('WHERE u.entity_id = $1')
      expect(queryCall[1]).toContain(staffEntityId)
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })

      mockQuery.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/admin/users')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to fetch users')
    })
  })

  describe('POST /api/admin/users', () => {
    const validUserData = {
      email: 'newuser@example.com',
      name: 'New User',
      role_id: 2,
      entity_id: 'AGY-001'
    }

    it('should return 403 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(validUserData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 400 for missing required fields', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }) // Missing name and role_id
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 409 for duplicate email', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })

      // First query checks for existing user
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }] // User already exists
      } as any)

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(validUserData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })

    it('should return 400 for invalid role_id', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })

      mockQuery
        .mockResolvedValueOnce({ rows: [] } as any) // No existing user
        .mockResolvedValueOnce({ rows: [] } as any) // No matching role

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ ...validUserData, role_id: 999 })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid role_id')
    })

    it('should return 403 when staff tries to create admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'staff', email: 'staff@example.com', entityId: 'AGY-001' }
      })

      mockQuery
        .mockResolvedValueOnce({ rows: [] } as any) // No existing user
        .mockResolvedValueOnce({ rows: [{ role_type: 'admin', role_code: 'admin_dta' }] } as any) // Admin role

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ ...validUserData, role_id: 1 })
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('cannot create admin')
    })

    it('should create user successfully as admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })

      mockQuery
        .mockResolvedValueOnce({ rows: [] } as any) // No existing user
        .mockResolvedValueOnce({ rows: [{ role_type: 'staff', role_code: 'staff_entity' }] } as any) // Staff role
        .mockResolvedValueOnce({ rows: [{ id: 10, ...validUserData }] } as any) // Insert result
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // Admin user lookup for audit
        .mockResolvedValueOnce({ rows: [] } as any) // Audit log insert

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(validUserData)
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
    })

    it('should force staff to create users for their own entity', async () => {
      const staffEntityId = 'AGY-001'
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'staff', email: 'staff@example.com', entityId: staffEntityId }
      })

      mockQuery
        .mockResolvedValueOnce({ rows: [] } as any) // No existing user
        .mockResolvedValueOnce({ rows: [{ role_type: 'staff', role_code: 'staff_entity' }] } as any) // Staff role
        .mockResolvedValueOnce({ rows: [{ id: 10, entity_id: staffEntityId }] } as any) // Insert result
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // Staff user lookup for audit
        .mockResolvedValueOnce({ rows: [] } as any) // Audit log insert

      const request = new NextRequest('http://localhost/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          ...validUserData,
          entity_id: 'AGY-002' // Trying to use different entity
        })
      })
      const response = await POST(request)
      const data = await response.json()

      // Should succeed but use staff's entity_id
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify insert used staff's entity ID, not the requested one
      const insertCall = mockQuery.mock.calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO users')
      )
      expect(insertCall).toBeDefined()
      expect(insertCall![1]).toContain(staffEntityId)
    })
  })
})
