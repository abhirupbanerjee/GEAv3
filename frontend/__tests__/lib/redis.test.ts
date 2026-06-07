import { describe, it, expect } from 'vitest'
import { buildCacheKey } from '@/lib/redis'

describe('buildCacheKey', () => {
  it('should build a cache key with sorted parameters', () => {
    const result = buildCacheKey('analytics:requests', { entityId: '123', roleType: 'admin' })
    expect(result).toBe('analytics:requests:entityId:123:roleType:admin')
  })

  it('should sort keys alphabetically using localeCompare', () => {
    const result = buildCacheKey('prefix', { z: '1', a: '2', m: '3' })
    expect(result).toBe('prefix:a:2:m:3:z:1')
  })

  it('should handle null values', () => {
    const result = buildCacheKey('prefix', { key: null })
    expect(result).toBe('prefix:key:')
  })

  it('should handle undefined values', () => {
    const result = buildCacheKey('prefix', { key: undefined })
    expect(result).toBe('prefix:key:')
  })

  it('should handle empty params object', () => {
    const result = buildCacheKey('prefix', {})
    expect(result).toBe('prefix:')
  })

  it('should handle numeric values', () => {
    const result = buildCacheKey('prefix', { count: 42, page: 1 })
    expect(result).toBe('prefix:count:42:page:1')
  })

  it('should handle boolean values', () => {
    const result = buildCacheKey('prefix', { active: true, deleted: false })
    expect(result).toBe('prefix:active:true:deleted:false')
  })

  it('should handle special characters in values', () => {
    const result = buildCacheKey('prefix', { query: 'test@example.com' })
    expect(result).toBe('prefix:query:test@example.com')
  })

  it('should maintain consistent ordering for same keys', () => {
    const result1 = buildCacheKey('prefix', { b: '1', a: '2' })
    const result2 = buildCacheKey('prefix', { a: '2', b: '1' })
    expect(result1).toBe(result2)
  })
})
