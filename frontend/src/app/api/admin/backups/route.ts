/**
 * Admin Backups API
 *
 * GET /api/admin/backups - List all backups
 * POST /api/admin/backups - Create a new backup
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  listBackups,
  createBackup,
  logBackupAction,
  getBackupDirStats,
  BACKUP_DIR,
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
 * GET /api/admin/backups
 * List all available backups
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = (await getServerSession(authOptions)) as ExtendedSession

    if (!session?.user || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get backups list
    const backups = await listBackups()
    const stats = getBackupDirStats()

    return NextResponse.json({
      success: true,
      backups,
      backup_dir: BACKUP_DIR,
      total_size: stats.totalSizeFormatted,
      total_count: stats.count,
    })
  } catch (error) {
    console.error('Error listing backups:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list backups',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/backups
 * Create a new backup
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = (await getServerSession(authOptions)) as ExtendedSession

    if (!session?.user || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const startTime = Date.now()

    // Create backup
    const backup = await createBackup('manual')
    const duration = Date.now() - startTime

    // Log the action
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    await logBackupAction('create', backup.filename, session.user.email || 'admin', ipAddress, userAgent, {
      fileSize: backup.size,
      durationMs: duration,
      status: 'success',
    })

    return NextResponse.json({
      success: true,
      backup,
      message: `Backup created successfully in ${duration}ms`,
      duration_ms: duration,
    })
  } catch (error) {
    console.error('Error creating backup:', error)

    // Log failure
    const session = (await getServerSession(authOptions)) as ExtendedSession
    if (session?.user) {
      await logBackupAction('create', 'failed', session.user.email || 'admin', undefined, undefined, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create backup',
      },
      { status: 500 }
    )
  }
}
