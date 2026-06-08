/**
 * Tests for /api/ai-agents/registry API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock DB
const mockExecuteQuery = vi.fn()
const mockWithTransaction = vi.fn(async (cb: any) => {
  const client = { query: vi.fn() }
  return cb(client)
})

vi.mock('@/lib/db', () => ({
  executeQuery: (...args: any[]) => mockExecuteQuery(...args),
  withTransaction: (cb: any) => mockWithTransaction(cb)
}))

const mockEncryptValue = vi.fn((v: string) => `enc:${v}`)
const mockDecryptValue = vi.fn((v: string) => v.replace(/^enc:/, ''))

vi.mock('@/lib/settings-encryption', () => ({
  encryptValue: (v: string) => mockEncryptValue(v),
  decryptValue: (v: string) => mockDecryptValue(v)
}))

import { getServerSession } from 'next-auth'
import { GET, POST } from '@/app/api/ai-agents/registry/route'

const mockGetServerSession = vi.mocked(getServerSession)

const adminSession = {
  user: { roleType: 'admin', email: 'admin@example.com', id: '1' }
}

const sampleAgentRow = {
  id: 'test-agent',
  name: 'Test Agent',
  description: 'Desc',
  endpoint: 'https://example.com/invoke',
  accepts_file: false,
  file_upload: null,
  output_types: ['text', 'json'],
  default_output_type: 'text',
  async: null,
}

describe('/api/ai-agents/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    it('returns agents without tokens for admin', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      mockExecuteQuery.mockResolvedValue({ rows: [sampleAgentRow] })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agents).toHaveLength(1)
      expect(data.agents[0].id).toBe('test-agent')
      expect(data.agents[0]).not.toHaveProperty('token')
    })
  })

  describe('POST', () => {
    it('returns 403 for non-admin', async () => {
      mockGetServerSession.mockResolvedValue({ user: { roleType: 'public' } })
      const request = new NextRequest('http://localhost/api/ai-agents/registry', {
        method: 'POST',
        body: JSON.stringify({})
      })
      const response = await POST(request)
      expect(response.status).toBe(403)
    })

    it('returns 400 for invalid JSON', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      const request = new NextRequest('http://localhost/api/ai-agents/registry', {
        method: 'POST',
        body: 'not-json'
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('returns 400 for missing required fields', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      const request = new NextRequest('http://localhost/api/ai-agents/registry', {
        method: 'POST',
        body: JSON.stringify({ id: 'x', name: 'X' })
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('registers a new agent successfully', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      mockExecuteQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] })

      const transactionClient = { query: vi.fn() }
      mockWithTransaction.mockImplementation(async (cb: any) => cb(transactionClient))

      const request = new NextRequest('http://localhost/api/ai-agents/registry', {
        method: 'POST',
        body: JSON.stringify({
          id: 'new-agent',
          name: 'New Agent',
          endpoint: 'https://example.com/invoke',
          token: 'secret',
          outputTypes: ['text'],
          defaultOutputType: 'text',
          acceptsFile: false,
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.agent.id).toBe('new-agent')
    })

    it('returns 409 when agent already exists', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      mockExecuteQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] })

      const request = new NextRequest('http://localhost/api/ai-agents/registry', {
        method: 'POST',
        body: JSON.stringify({
          id: 'dup-agent',
          name: 'Dup',
          endpoint: 'https://example.com/invoke',
          token: 'secret',
          outputTypes: ['text'],
          defaultOutputType: 'text',
          acceptsFile: false,
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(409)
    })
  })
})
