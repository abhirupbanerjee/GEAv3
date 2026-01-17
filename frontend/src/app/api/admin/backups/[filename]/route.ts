/**
 * Admin Backup File API
 *
 * GET /api/admin/backups/[filename] - Get backup info
 * DELETE /api/admin/backups/[filename] - Delete a backup
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getBackupInfo,
  getBackupPreview,
  deleteBackup,
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
 * GET /api/admin/backups/[filename]
 * Get backup file info and preview
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

    // Get backup info
    const backup = getBackupInfo(filename)
    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      )
    }

    // Get preview (first 50 lines)
    let preview = ''
    try {
      preview = getBackupPreview(filename, 50)
    } catch {
      preview = 'Unable to read preview'
    }

    return NextResponse.json({
      success: true,
      backup,
      preview,
    })
  } catch (error) {
    console.error('Error getting backup info:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get backup info',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/backups/[filename]
 * Delete a backup file
 */
export async function DELETE(
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

    // Get backup info before deletion for logging
    const backup = getBackupInfo(filename)

    // Delete the backup
    deleteBackup(filename)

    // Log the action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    await logBackupAction('delete', filename, session.user.email || 'admin', ipAddress, userAgent, {
      fileSize: backup?.size,
      status: 'success',
    })

    return NextResponse.json({
      success: true,
      message: `Backup ${filename} deleted successfully`,
      deleted_file: filename,
    })
  } catch (error) {
    console.error('Error deleting backup:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete backup',
      },
      { status: 500 }
    )
  }
}
