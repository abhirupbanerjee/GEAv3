/**
 * Tests for the database-backed AI agent registry (frontend/src/lib/ai-agents.ts)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DB before importing the module under test
const mockExecuteQuery = vi.fn()
const mockWithTransaction = vi.fn(async (cb: any) => {
  const client = {
    query: vi.fn()
  }
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

import {
  getAllAgents,
  getAgentById,
  getPublicAgents,
  getAgentToken,
  addAgent,
  removeAgent,
  updateAgent,
  getAllMappings,
  getAllowedAgentIdsForServiceName,
  getPublicAgentsForServiceName,
  setMapping,
  deleteMapping,
  tokenEnvNameFor,
} from '@/lib/ai-agents'

const sampleAgentRow = {
  id: 'test-agent',
  name: 'Test Agent',
  description: 'A test agent',
  endpoint: 'https://example.com/api/invoke',
  accepts_file: false,
  file_upload: null,
  output_types: ['text', 'json'],
  default_output_type: 'text',
  async: null,
}

const sampleAgentRowWithFile = {
  ...sampleAgentRow,
  id: 'file-agent',
  name: 'File Agent',
  accepts_file: true,
  file_upload: { maxFiles: 3, maxSizeMB: 5, required: false, allowedTypes: ['pdf'] },
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.AI_AGENT_TOKEN_TEST_AGENT
  delete process.env.AI_AGENT_TOKEN_FILE_AGENT
})

describe('tokenEnvNameFor', () => {
  it('converts id to safe env var name', () => {
    expect(tokenEnvNameFor('my-agent')).toBe('AI_AGENT_TOKEN_MY_AGENT')
    expect(tokenEnvNameFor('agent-123')).toBe('AI_AGENT_TOKEN_AGENT_123')
  })
})

describe('getAllAgents', () => {
  it('returns active agents ordered by name', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [sampleAgentRow] })
    const agents = await getAllAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0].id).toBe('test-agent')
    expect(agents[0].tokenEnv).toBe('AI_AGENT_TOKEN_TEST_AGENT')
  })

  it('returns empty array when no agents', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [] })
    const agents = await getAllAgents()
    expect(agents).toEqual([])
  })
})

describe('getAgentById', () => {
  it('returns agent when found', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [sampleAgentRow] })
    const agent = await getAgentById('test-agent')
    expect(agent).toBeDefined()
    expect(agent?.name).toBe('Test Agent')
  })

  it('returns undefined when not found', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [] })
    const agent = await getAgentById('missing')
    expect(agent).toBeUndefined()
  })
})

describe('getPublicAgents', () => {
  it('strips tokenEnv and endpoint from agents', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [sampleAgentRow] })
    const agents = await getPublicAgents()
    expect(agents[0]).not.toHaveProperty('tokenEnv')
    expect(agents[0]).not.toHaveProperty('endpoint')
    expect(agents[0].name).toBe('Test Agent')
  })
})

describe('getAgentToken', () => {
  it('returns token from environment variable first', async () => {
    process.env.AI_AGENT_TOKEN_TEST_AGENT = 'env-token'
    const agent = { tokenEnv: 'AI_AGENT_TOKEN_TEST_AGENT', id: 'test-agent' } as any
    const token = await getAgentToken(agent)
    expect(token).toBe('env-token')
    expect(mockExecuteQuery).not.toHaveBeenCalled()
  })

  it('falls back to encrypted DB token', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [{ encrypted_token: 'enc:db-token' }] })
    const agent = { tokenEnv: 'AI_AGENT_TOKEN_TEST_AGENT', id: 'test-agent' } as any
    const token = await getAgentToken(agent)
    expect(mockExecuteQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT encrypted_token'),
      ['test-agent']
    )
    expect(token).toBe('db-token')
  })

  it('returns undefined when no token exists', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [] })
    const agent = { tokenEnv: 'AI_AGENT_TOKEN_TEST_AGENT', id: 'test-agent' } as any
    const token = await getAgentToken(agent)
    expect(token).toBeUndefined()
  })
})

describe('addAgent', () => {
  it('inserts agent and token in a transaction', async () => {
    mockExecuteQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // duplicate check
    const transactionClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (cb: any) => cb(transactionClient))

    const result = await addAgent({
      id: 'new-agent',
      name: 'New Agent',
      endpoint: 'https://example.com/invoke',
      acceptsFile: false,
      outputTypes: ['text'],
      defaultOutputType: 'text',
      token: 'secret-token',
    })

    expect(result.id).toBe('new-agent')
    expect(transactionClient.query).toHaveBeenCalledTimes(2)
    expect(mockEncryptValue).toHaveBeenCalledWith('secret-token')
  })

  it('throws when agent id already exists', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] })
    await expect(
      addAgent({
        id: 'dup-agent',
        name: 'Dup',
        endpoint: 'https://example.com/invoke',
        acceptsFile: false,
        outputTypes: ['text'],
        defaultOutputType: 'text',
        token: 'tok',
      })
    ).rejects.toThrow('already exists')
  })
})

describe('removeAgent', () => {
  it('returns true when row deleted', async () => {
    mockExecuteQuery.mockResolvedValue({ rowCount: 1 })
    const ok = await removeAgent('test-agent')
    expect(ok).toBe(true)
  })

  it('returns false when no row deleted', async () => {
    mockExecuteQuery.mockResolvedValue({ rowCount: 0 })
    const ok = await removeAgent('missing')
    expect(ok).toBe(false)
  })
})

describe('updateAgent', () => {
  it('updates agent fields', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rows: [sampleAgentRow] })
    const transactionClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (cb: any) => cb(transactionClient))

    const updated = await updateAgent('test-agent', { name: 'Updated Name' })
    expect(updated.name).toBe('Updated Name')
    expect(transactionClient.query).toHaveBeenCalledTimes(1)
  })

  it('updates token when provided', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rows: [sampleAgentRow] })
    const transactionClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (cb: any) => cb(transactionClient))

    await updateAgent('test-agent', { token: 'new-secret' })
    const upsertCall = transactionClient.query.mock.calls.find(
      (call: any) => call[0].includes('ON CONFLICT')
    )
    expect(upsertCall).toBeDefined()
    expect(mockEncryptValue).toHaveBeenCalledWith('new-secret')
  })

  it('throws when agent not found', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rows: [] })
    await expect(updateAgent('missing', { name: 'X' })).rejects.toThrow('not found')
  })
})

describe('getAllMappings', () => {
  it('groups mappings by service name', async () => {
    mockExecuteQuery.mockResolvedValue({
      rows: [
        { service_name: 'Service A', agent_id: 'agent-1' },
        { service_name: 'Service A', agent_id: 'agent-2' },
        { service_name: 'Service B', agent_id: 'agent-1' },
      ]
    })
    const mappings = await getAllMappings()
    expect(mappings['Service A']).toEqual(['agent-1', 'agent-2'])
    expect(mappings['Service B']).toEqual(['agent-1'])
  })

  it('returns empty object when no mappings', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [] })
    const mappings = await getAllMappings()
    expect(mappings).toEqual({})
  })
})

describe('getAllowedAgentIdsForServiceName', () => {
  it('returns agent ids for service (case-insensitive)', async () => {
    mockExecuteQuery.mockResolvedValue({ rows: [{ agent_id: 'a1' }, { agent_id: 'a2' }] })
    const ids = await getAllowedAgentIdsForServiceName('  My Service  ')
    expect(ids).toEqual(['a1', 'a2'])
  })
})

describe('getPublicAgentsForServiceName', () => {
  it('returns only mapped agents for service', async () => {
    mockExecuteQuery
      .mockResolvedValueOnce({
        rows: [
          { ...sampleAgentRow, id: 'a1' },
          { ...sampleAgentRow, id: 'a2' },
        ]
      })
      .mockResolvedValueOnce({ rows: [{ agent_id: 'a1' }] })

    const agents = await getPublicAgentsForServiceName('My Service')
    expect(agents).toHaveLength(1)
    expect(agents[0].id).toBe('a1')
  })

  it('returns empty array for null serviceName', async () => {
    const agents = await getPublicAgentsForServiceName(null)
    expect(agents).toEqual([])
  })
})

describe('setMapping', () => {
  it('replaces mappings for a service in a transaction', async () => {
    mockExecuteQuery.mockResolvedValueOnce({ rows: [{ ...sampleAgentRow, id: 'a1' }] })
    const transactionClient = { query: vi.fn() }
    mockWithTransaction.mockImplementation(async (cb: any) => cb(transactionClient))

    await setMapping('My Service', ['a1', 'a1', 'unknown'])
    expect(transactionClient.query).toHaveBeenCalledTimes(2) // delete + one insert
  })
})

describe('deleteMapping', () => {
  it('returns true when rows deleted', async () => {
    mockExecuteQuery.mockResolvedValue({ rowCount: 1 })
    const ok = await deleteMapping('My Service')
    expect(ok).toBe(true)
  })

  it('returns false when no rows deleted', async () => {
    mockExecuteQuery.mockResolvedValue({ rowCount: 0 })
    const ok = await deleteMapping('Missing')
    expect(ok).toBe(false)
  })
})
