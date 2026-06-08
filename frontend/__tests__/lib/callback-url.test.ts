import { describe, it, expect } from 'vitest'
import { validateCallbackUrl, validateCallbackUrlServer } from '@/lib/callback-url'

describe('validateCallbackUrl', () => {
  it('returns default for null', () => {
    expect(validateCallbackUrl(null, '/citizen')).toBe('/citizen')
  })

  it('returns default for empty string', () => {
    expect(validateCallbackUrl('', '/citizen')).toBe('/citizen')
  })

  it('allows valid relative paths', () => {
    expect(validateCallbackUrl('/citizen/tickets', '/citizen')).toBe('/citizen/tickets')
    expect(validateCallbackUrl('/admin/home', '/admin')).toBe('/admin/home')
    expect(validateCallbackUrl('/feedback', '/')).toBe('/feedback')
  })

  it('blocks protocol-relative URLs', () => {
    expect(validateCallbackUrl('//evil.com', '/citizen')).toBe('/citizen')
    expect(validateCallbackUrl('//evil.com/steal', '/citizen')).toBe('/citizen')
  })

  it('blocks scheme-like paths', () => {
    expect(validateCallbackUrl('/javascript:alert(1)', '/citizen')).toBe('/citizen')
    expect(validateCallbackUrl('/data:text/html,<script>alert(1)</script>', '/citizen')).toBe('/citizen')
  })

  it('blocks absolute URLs to other origins', () => {
    expect(validateCallbackUrl('https://evil.com', '/citizen')).toBe('/citizen')
    expect(validateCallbackUrl('http://phishing.example.com', '/citizen')).toBe('/citizen')
  })
})

describe('validateCallbackUrlServer', () => {
  it('returns default for null', () => {
    expect(validateCallbackUrlServer(null, '/citizen', 'https://example.com')).toBe('/citizen')
  })

  it('allows valid relative paths', () => {
    expect(validateCallbackUrlServer('/citizen/tickets', '/citizen', 'https://example.com')).toBe('/citizen/tickets')
  })

  it('blocks protocol-relative URLs', () => {
    expect(validateCallbackUrlServer('//evil.com', '/citizen', 'https://example.com')).toBe('/citizen')
  })

  it('blocks scheme-like paths', () => {
    expect(validateCallbackUrlServer('/javascript:alert(1)', '/citizen', 'https://example.com')).toBe('/citizen')
  })

  it('allows same-origin absolute URLs', () => {
    expect(validateCallbackUrlServer('https://example.com/citizen', '/citizen', 'https://example.com')).toBe('https://example.com/citizen')
  })

  it('blocks cross-origin absolute URLs', () => {
    expect(validateCallbackUrlServer('https://evil.com/citizen', '/citizen', 'https://example.com')).toBe('/citizen')
  })
})
