/**
 * Tests for /api/admin/service-requests API route
 *
 * Tests authentication, entity filtering, pagination, and search
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/service-requests/route'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  pool: {
    query: vi.fn()
  }
}))

vi.mock('@/lib/entity-filter', () => ({
  getEntityFilter: vi.fn()
}))

vi.mock('@/lib/sendgrid', () => ({
  sendEmail: vi.fn(),
  sendBulkEmail: vi.fn()
}))

vi.mock('@/lib/emailTemplates', () => ({
  getEAServiceRequestEmail: vi.fn(),
  getDTAServiceRequestNotificationEmail: vi.fn()
}))

vi.mock('@/lib/settings', () => ({
  getServiceRequestEntityId: vi.fn().mockResolvedValue('AGY-005'),
  getDTAAdminRoleCode: vi.fn().mockResolvedValue('admin_dta')
}))

vi.mock('@/config/env', () => ({
  config: { appUrl: 'http://localhost:3000' }
}))

vi.mock('@/lib/redis', () => ({
  invalidateCache: vi.fn().mockResolvedValue(undefined)
}))

import { getServerSession } from 'next-auth'
import { pool } from '@/lib/db'
import { getEntityFilter } from '@/lib/entity-filter'

const mockGetServerSession = vi.mocked(getServerSession)
const mockQuery = vi.mocked(pool.query)
const mockGetEntityFilter = vi.mocked(getEntityFilter)

describe('/api/admin/service-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/service-requests', () => {
    const mockServiceRequests = [
      {
        request_id: 1,
        request_number: 'SR-202401-0001',
        service_id: 'SVC-001',
        service_name: 'Test Service',
        entity_id: 'AGY-001',
        entity_name: 'Test Entity',
        status: 'submitted',
        requester_name: 'John Doe',
        requester_email: 'john@example.com',
        attachment_count: 2
      }
    ]

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/service-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return service requests for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })
      mockGetEntityFilter.mockReturnValue(null) // Admin sees all

      // Provider check query
      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: true }] } as any)
      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
      // Data query
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.requests).toHaveLength(1)
      expect(data.data.pagination.total_count).toBe(1)
    })

    it('should filter by entity for staff users', async () => {
      const staffEntityId = 'AGY-001'
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'staff', email: 'staff@example.com', entityId: staffEntityId }
      })
      mockGetEntityFilter.mockReturnValue(staffEntityId)

      // Provider check query
      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: false }] } as any)
      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
      // Data query
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify entity filter was applied (submitted view is default)
      const countQuery = mockQuery.mock.calls[1][0] as string
      expect(countQuery).toContain('r.entity_id = $1')
    })

    it('should handle view parameter for submitted requests', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'staff', email: 'staff@example.com', entityId: 'AGY-001' }
      })
      mockGetEntityFilter.mockReturnValue('AGY-001')

      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: false }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests?view=submitted')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.filters.view).toBe('submitted')
    })

    it('should return empty for received view when entity is not a service provider', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'staff', email: 'staff@example.com', entityId: 'AGY-001' }
      })
      mockGetEntityFilter.mockReturnValue('AGY-001')

      // Entity is NOT a service provider
      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: false }] } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests?view=received')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.requests).toHaveLength(0)
      expect(data.data.is_service_provider).toBe(false)
      expect(data.message).toContain('not configured as a service provider')
    })

    it('should filter by status', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })
      mockGetEntityFilter.mockReturnValue(null)

      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: true }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '3' }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests?status=submitted')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify status filter was applied
      const countQuery = mockQuery.mock.calls[1][0] as string
      expect(countQuery).toContain('r.status = $')
    })

    it('should filter by search query', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })
      mockGetEntityFilter.mockReturnValue(null)

      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: true }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests?search=SR-202401')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify search filter was applied
      const countQuery = mockQuery.mock.calls[1][0] as string
      expect(countQuery).toContain('r.request_number ILIKE')
    })

    it('should handle pagination parameters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })
      mockGetEntityFilter.mockReturnValue(null)

      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: true }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '50' }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests?page=2&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.page).toBe(2)
      expect(data.data.pagination.limit).toBe(10)
      expect(data.data.pagination.total_count).toBe(50)
      expect(data.data.pagination.total_pages).toBe(5)
      expect(data.data.pagination.has_prev).toBe(true)
      expect(data.data.pagination.has_next).toBe(true)
    })

    it('should limit max page size to 100', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })
      mockGetEntityFilter.mockReturnValue(null)

      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: true }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '200' }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests?limit=500')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.limit).toBe(100) // Capped at 100
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })
      mockGetEntityFilter.mockReturnValue(null)

      mockQuery.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/admin/service-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to fetch')
    })

    it('should filter by service_id', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })
      mockGetEntityFilter.mockReturnValue(null)

      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: true }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '2' }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests?service_id=SVC-001')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify service filter was applied
      const countQuery = mockQuery.mock.calls[1][0] as string
      expect(countQuery).toContain('r.service_id = $')
    })

    it('should handle multiple entity IDs for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com', entityId: 'AGY-005' }
      })
      mockGetEntityFilter.mockReturnValue(null)

      mockQuery.mockResolvedValueOnce({ rows: [{ is_service_provider: true }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '10' }] } as any)
      mockQuery.mockResolvedValueOnce({ rows: mockServiceRequests } as any)

      const request = new NextRequest('http://localhost/api/admin/service-requests?entity_id=AGY-001,AGY-002')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify multiple entity filter was applied with IN clause
      const countQuery = mockQuery.mock.calls[1][0] as string
      expect(countQuery).toContain('IN ($')
    })
  })
})
