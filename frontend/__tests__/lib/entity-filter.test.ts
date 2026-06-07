import { describe, it, expect } from 'vitest'
import {
  getEntityFilter,
  buildEntityWhereClause,
  validateEntityAccess,
  getEntityFilterQuery
} from '@/lib/entity-filter'
import { Session } from 'next-auth'

// Helper to create mock sessions
const createSession = (roleType: string, entityId?: string): Session => ({
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    roleType,
    entityId: entityId || null,
    roleId: roleType === 'admin' ? 1 : 2,
    roleCode: roleType === 'admin' ? 'ADM' : 'STF',
    isActive: true,
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
})

describe('getEntityFilter', () => {
  it('should return null for admin users', () => {
    const session = createSession('admin', 'AGY-001')
    expect(getEntityFilter(session)).toBeNull()
  })

  it('should return entityId for staff users', () => {
    const session = createSession('staff', 'AGY-001')
    expect(getEntityFilter(session)).toBe('AGY-001')
  })

  it('should return null for staff users without entityId', () => {
    const session = createSession('staff')
    expect(getEntityFilter(session)).toBeNull()
  })

  it('should return null for null session', () => {
    expect(getEntityFilter(null)).toBeNull()
  })

  it('should return null for session without user', () => {
    const session = { expires: '' } as Session
    expect(getEntityFilter(session)).toBeNull()
  })
})

describe('buildEntityWhereClause', () => {
  it('should return empty clause for null entityId', () => {
    const result = buildEntityWhereClause(null)
    expect(result.clause).toBe('')
    expect(result.params).toEqual([])
  })

  it('should build WHERE clause with default param index', () => {
    const result = buildEntityWhereClause('AGY-001')
    expect(result.clause).toBe('entity_id = $1')
    expect(result.params).toEqual(['AGY-001'])
  })

  it('should build WHERE clause with custom param index', () => {
    const result = buildEntityWhereClause('AGY-001', '', 3)
    expect(result.clause).toBe('entity_id = $3')
    expect(result.params).toEqual(['AGY-001'])
  })

  it('should build WHERE clause with table alias', () => {
    const result = buildEntityWhereClause('AGY-001', 'e')
    expect(result.clause).toBe('e.entity_id = $1')
    expect(result.params).toEqual(['AGY-001'])
  })

  it('should build WHERE clause with table alias and custom param index', () => {
    const result = buildEntityWhereClause('AGY-001', 'entity', 5)
    expect(result.clause).toBe('entity.entity_id = $5')
    expect(result.params).toEqual(['AGY-001'])
  })
})

describe('validateEntityAccess', () => {
  it('should return true for admin accessing any entity', () => {
    const session = createSession('admin', 'AGY-001')
    expect(validateEntityAccess(session, 'AGY-002')).toBe(true)
    expect(validateEntityAccess(session, 'AGY-003')).toBe(true)
  })

  it('should return true for staff accessing their own entity', () => {
    const session = createSession('staff', 'AGY-001')
    expect(validateEntityAccess(session, 'AGY-001')).toBe(true)
  })

  it('should return false for staff accessing different entity', () => {
    const session = createSession('staff', 'AGY-001')
    expect(validateEntityAccess(session, 'AGY-002')).toBe(false)
  })

  it('should return false for null session', () => {
    expect(validateEntityAccess(null, 'AGY-001')).toBe(false)
  })

  it('should return false for session without user', () => {
    const session = { expires: '' } as Session
    expect(validateEntityAccess(session, 'AGY-001')).toBe(false)
  })
})

describe('getEntityFilterQuery', () => {
  it('should return empty string for admin', () => {
    const session = createSession('admin', 'AGY-001')
    expect(getEntityFilterQuery(session)).toBe('')
  })

  it('should return query string for staff', () => {
    const session = createSession('staff', 'AGY-001')
    expect(getEntityFilterQuery(session)).toBe('?entity_id=AGY-001')
  })

  it('should return empty string for null session', () => {
    expect(getEntityFilterQuery(null)).toBe('')
  })
})
