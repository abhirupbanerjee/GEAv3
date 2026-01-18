/**
 * Tests for /api/admin/backups/[filename]/download API route
 *
 * Tests authentication, filename validation, and file serving
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/backups/[filename]/download/route'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/backup', () => ({
  isValidBackupFilename: vi.fn(),
  getBackupFilePath: vi.fn(),
  getBackupInfo: vi.fn(),
  logBackupAction: vi.fn()
}))

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn()
  }
}))

import { getServerSession } from 'next-auth'
import {
  isValidBackupFilename,
  getBackupFilePath,
  getBackupInfo,
  logBackupAction
} from '@/lib/backup'
import fs from 'fs'

const mockGetServerSession = vi.mocked(getServerSession)
const mockIsValidBackupFilename = vi.mocked(isValidBackupFilename)
const mockGetBackupFilePath = vi.mocked(getBackupFilePath)
const mockGetBackupInfo = vi.mocked(getBackupInfo)
const mockLogBackupAction = vi.mocked(logBackupAction)
const mockReadFileSync = vi.mocked(fs.readFileSync)

describe('/api/admin/backups/[filename]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/backups/[filename]/download', () => {
    const validFilename = 'backup-2024-01-15-120000.sql'
    const mockBackupInfo = {
      filename: validFilename,
      size: 1024,
      createdAt: new Date('2024-01-15T12:00:00Z')
    }

    it('should return 403 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest(`http://localhost/api/admin/backups/${validFilename}/download`)
      const response = await GET(request, { params: Promise.resolve({ filename: validFilename }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 403 for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'staff', email: 'staff@example.com' }
      })

      const request = new NextRequest(`http://localhost/api/admin/backups/${validFilename}/download`)
      const response = await GET(request, { params: Promise.resolve({ filename: validFilename }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 400 for invalid filename', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })
      mockIsValidBackupFilename.mockReturnValue(false)

      const invalidFilename = '../../../etc/passwd'
      const request = new NextRequest(`http://localhost/api/admin/backups/${invalidFilename}/download`)
      const response = await GET(request, { params: Promise.resolve({ filename: invalidFilename }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid backup filename')
    })

    it('should return 404 when backup not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })
      mockIsValidBackupFilename.mockReturnValue(true)
      mockGetBackupFilePath.mockReturnValue('/backups/backup.sql')
      mockGetBackupInfo.mockReturnValue(null) // Backup not found

      const request = new NextRequest(`http://localhost/api/admin/backups/${validFilename}/download`)
      const response = await GET(request, { params: Promise.resolve({ filename: validFilename }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should return file for valid admin request', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })
      mockIsValidBackupFilename.mockReturnValue(true)
      mockGetBackupFilePath.mockReturnValue('/backups/backup.sql')
      mockGetBackupInfo.mockReturnValue(mockBackupInfo)
      mockReadFileSync.mockReturnValue(Buffer.from('-- SQL backup content'))
      mockLogBackupAction.mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost/api/admin/backups/${validFilename}/download`, {
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'Test Browser'
        }
      })
      const response = await GET(request, { params: Promise.resolve({ filename: validFilename }) })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
      expect(response.headers.get('Content-Disposition')).toContain(validFilename)

      // Verify download was logged
      expect(mockLogBackupAction).toHaveBeenCalledWith(
        'download',
        validFilename,
        'admin@example.com',
        '127.0.0.1',
        'Test Browser',
        expect.objectContaining({ status: 'success' })
      )
    })

    it('should reject path traversal attempts', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })

      const pathTraversalFilenames = [
        '../secret.txt',
        '..\\secret.txt',
        'backup/../../../etc/passwd',
        'backup%2F..%2F..%2Fetc%2Fpasswd',
        '/etc/passwd'
      ]

      for (const maliciousFilename of pathTraversalFilenames) {
        mockIsValidBackupFilename.mockReturnValue(false)

        const request = new NextRequest(`http://localhost/api/admin/backups/${maliciousFilename}/download`)
        const response = await GET(request, { params: Promise.resolve({ filename: maliciousFilename }) })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid backup filename')
      }
    })

    it('should handle file read errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })
      mockIsValidBackupFilename.mockReturnValue(true)
      mockGetBackupFilePath.mockReturnValue('/backups/backup.sql')
      mockGetBackupInfo.mockReturnValue(mockBackupInfo)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      const request = new NextRequest(`http://localhost/api/admin/backups/${validFilename}/download`)
      const response = await GET(request, { params: Promise.resolve({ filename: validFilename }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('ENOENT')
    })

    it('should use fallback IP when headers not present', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })
      mockIsValidBackupFilename.mockReturnValue(true)
      mockGetBackupFilePath.mockReturnValue('/backups/backup.sql')
      mockGetBackupInfo.mockReturnValue(mockBackupInfo)
      mockReadFileSync.mockReturnValue(Buffer.from('-- SQL backup content'))
      mockLogBackupAction.mockResolvedValue(undefined)

      // Request without IP headers
      const request = new NextRequest(`http://localhost/api/admin/backups/${validFilename}/download`)
      await GET(request, { params: Promise.resolve({ filename: validFilename }) })

      // Verify fallback IP was used
      expect(mockLogBackupAction).toHaveBeenCalledWith(
        'download',
        validFilename,
        'admin@example.com',
        'unknown',
        undefined, // No user-agent header
        expect.objectContaining({ status: 'success' })
      )
    })

    it('should set correct cache headers', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { roleType: 'admin', email: 'admin@example.com' }
      })
      mockIsValidBackupFilename.mockReturnValue(true)
      mockGetBackupFilePath.mockReturnValue('/backups/backup.sql')
      mockGetBackupInfo.mockReturnValue(mockBackupInfo)
      mockReadFileSync.mockReturnValue(Buffer.from('-- SQL backup content'))
      mockLogBackupAction.mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost/api/admin/backups/${validFilename}/download`)
      const response = await GET(request, { params: Promise.resolve({ filename: validFilename }) })

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })
  })
})
