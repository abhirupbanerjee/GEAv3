/**
 * Tests for /api/ai-agents/mappings API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock DB with query-inspecting mock
const mockExecuteQuery = vi.fn()
const mockWithTransaction = vi.fn(async (cb: any) => {
  const client = { query: vi.fn() }
  return cb(client)
})

vi.mock('@/lib/db', () => ({
  executeQuery: (...args: any[]) => mockExecuteQuery(...args),
  withTransaction: (cb: any) => mockWithTransaction(cb)
}))

vi.mock('@/lib/settings-encryption', () => ({
  encryptValue: (v: string) => `enc:${v}`,
  decryptValue: (v: string) => v.replace(/^enc:/, '')
}))

import { getServerSession } from 'next-auth'
import { GET, PUT } from '@/app/api/ai-agents/mappings/route'

const mockGetServerSession = vi.mocked(getServerSession)

const adminSession = {
  user: { roleType: 'admin', email: 'admin@example.com', id: '1' }
}

const sampleAgentRow = {
  id: 'agent-1',
  name: 'Agent 1',
  description: 'Desc',
  endpoint: 'https://example.com/invoke',
  accepts_file: false,
  file_upload: null,
  output_types: ['text'],
  default_output_type: 'text',
  async: null,
}

describe('/api/ai-agents/mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecuteQuery.mockReset()
    mockWithTransaction.mockImplementation(async (cb: any) => {
      const client = { query: vi.fn() }
      return cb(client)
    })
  })

  describe('GET', () => {
    it('returns 403 for non-admin', async () => {
      mockGetServerSession.mockResolvedValue({ user: { roleType: 'staff' } })
      const response = await GET()
      expect(response.status).toBe(403)
    })

    it('returns 403 for unauthenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)
      const response = await GET()
      expect(response.status).toBe(403)
    })

    it('returns mappings for admin', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('ai_service_agent_mappings')) {
          return Promise.resolve({
            rows: [
              { service_name: 'Service A', agent_id: 'agent-1' },
              { service_name: 'Service A', agent_id: 'agent-2' },
            ]
          })
        }
        return Promise.resolve({ rows: [] })
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mappings['Service A']).toEqual(['agent-1', 'agent-2'])
    })
  })

  describe('PUT', () => {
    it('returns 403 for non-admin', async () => {
      mockGetServerSession.mockResolvedValue({ user: { roleType: 'public' } })
      const request = new NextRequest('http://localhost/api/ai-agents/mappings', {
        method: 'PUT',
        body: JSON.stringify({ mappings: {} })
      })
      const response = await PUT(request)
      expect(response.status).toBe(403)
    })

    it('returns 400 for invalid body', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      const request = new NextRequest('http://localhost/api/ai-agents/mappings', {
        method: 'PUT',
        body: JSON.stringify({ mappings: 'not-an-object' })
      })
      const response = await PUT(request)
      expect(response.status).toBe(400)
    })

    it('rejects unknown agent ids in mappings', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('FROM ai_service_agents')) {
          return Promise.resolve({ rows: [{ ...sampleAgentRow, id: 'known-agent' }] })
        }
        return Promise.resolve({ rows: [] })
      })

      const request = new NextRequest('http://localhost/api/ai-agents/mappings', {
        method: 'PUT',
        body: JSON.stringify({
          mappings: { 'Service A': ['unknown-agent'] }
        })
      })
      const response = await PUT(request)
      expect(response.status).toBe(400)
    })

    it('updates mappings successfully', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      mockExecuteQuery.mockImplementation((query: string) => {
        if (query.includes('FROM ai_service_agents')) {
          return Promise.resolve({ rows: [sampleAgentRow] })
        }
        if (query.includes('FROM ai_service_agent_mappings')) {
          return Promise.resolve({ rows: [] })
        }
        return Promise.resolve({ rows: [] })
      })

      const transactionClient = { query: vi.fn() }
      mockWithTransaction.mockImplementation(async (cb: any) => cb(transactionClient))

      const request = new NextRequest('http://localhost/api/ai-agents/mappings', {
        method: 'PUT',
        body: JSON.stringify({
          mappings: { 'Service A': ['agent-1'] }
        })
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
