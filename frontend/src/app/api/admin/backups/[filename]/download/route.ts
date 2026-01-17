/**
 * Admin Backup Download API
 *
 * GET /api/admin/backups/[filename]/download - Download backup file
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import {
  getBackupFilePath,
  getBackupInfo,
  logBackupAction,
  isValidBackupFilename,
} from '@/lib/backup'

// Extend session type
interface ExtendedSession {
  user?: {
    name?: string | null
    email?: string | null
    roleType?: string
  }
}

/**
 * GET /api/admin/backups/[filename]/download
 * Stream download a backup file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Check authentication
    const session = (await getServerSession(authOptions)) as ExtendedSession

    if (!session?.user || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { filename } = await params

    // Validate filename
    if (!isValidBackupFilename(filename)) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup filename' },
        { status: 400 }
      )
    }

    // Get file path
    const filePath = getBackupFilePath(filename)
    const backup = getBackupInfo(filename)

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      )
    }

    // Read file content
    const fileBuffer = fs.readFileSync(filePath)

    // Log the download
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    await logBackupAction('download', filename, session.user.email || 'admin', ipAddress, userAgent, {
      fileSize: backup.size,
      status: 'success',
    })

    // Return file as download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(backup.size),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error downloading backup:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download backup',
      },
      { status: 500 }
    )
  }
}
