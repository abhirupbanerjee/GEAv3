/**
 * Admin Backup Restore API
 *
 * POST /api/admin/backups/[filename]/restore - Restore database from backup
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  restoreBackup,
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
 * POST /api/admin/backups/[filename]/restore
 * Restore database from a backup file
 *
 * Request body:
 * {
 *   confirm: boolean,          // Must be true
 *   confirmation_text: string  // Must be "RESTORE DATABASE"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const startTime = Date.now()
  let safetyBackup = ''

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

    // Check backup exists
    const backup = getBackupInfo(filename)
    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { confirm, confirmation_text } = body

    // Validate confirmation
    if (!confirm || confirmation_text !== 'RESTORE DATABASE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Restore requires confirmation. Set confirm=true and confirmation_text="RESTORE DATABASE"',
        },
        { status: 400 }
      )
    }

    // Log restore start
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    await logBackupAction('restore', filename, session.user.email || 'admin', ipAddress, userAgent, {
      status: 'in_progress',
    })

    // Perform restore
    const result = await restoreBackup(filename, (step, message, progress) => {
      // Progress callback - could be used with SSE in future
      console.log(`[Restore] ${progress}% - ${step}: ${message}`)
    })

    safetyBackup = result.safety_backup

    // Log success
    await logBackupAction('restore', filename, session.user.email || 'admin', ipAddress, userAgent, {
      safetyBackupFilename: result.safety_backup,
      tablesRestored: result.tables,
      durationMs: result.duration_ms,
      status: 'success',
    })

    return NextResponse.json({
      success: true,
      message: `Database restored successfully from ${filename}`,
      tables_restored: result.tables,
      duration_ms: result.duration_ms,
      safety_backup: result.safety_backup,
    })
  } catch (error) {
    console.error('Error restoring backup:', error)

    // Log failure
    const session = (await getServerSession(authOptions)) as ExtendedSession
    const { filename } = await params

    if (session?.user) {
      await logBackupAction('restore', filename, session.user.email || 'admin', undefined, undefined, {
        safetyBackupFilename: safetyBackup || undefined,
        durationMs: Date.now() - startTime,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore backup',
        safety_backup: safetyBackup || null,
        message: safetyBackup
          ? `Restore failed. A safety backup was created: ${safetyBackup}`
          : 'Restore failed. Database may need manual recovery.',
      },
      { status: 500 }
    )
  }
}
