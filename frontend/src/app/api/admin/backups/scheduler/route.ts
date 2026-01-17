/**
 * Admin Backup Scheduler API
 *
 * GET /api/admin/backups/scheduler - Get scheduler status
 * POST /api/admin/backups/scheduler - Restart scheduler (after settings change)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getSchedulerStatus,
  restartBackupScheduler,
  initBackupScheduler,
} from '@/lib/backup-scheduler'

// Extend session type
interface ExtendedSession {
  user?: {
    name?: string | null
    email?: string | null
    roleType?: string
  }
}

/**
 * GET /api/admin/backups/scheduler
 * Get current scheduler status
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

    const status = getSchedulerStatus()

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduler status',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/backups/scheduler
 * Restart the backup scheduler (call after changing schedule settings)
 *
 * Request body:
 * {
 *   action: 'restart' | 'init' | 'status'
 * }
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

    const body = await request.json().catch(() => ({ action: 'restart' }))
    const action = body.action || 'restart'

    switch (action) {
      case 'restart':
        await restartBackupScheduler()
        break

      case 'init':
        await initBackupScheduler()
        break

      case 'status':
        // Just return status
        break

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        )
    }

    const status = getSchedulerStatus()

    return NextResponse.json({
      success: true,
      message: `Scheduler ${action} completed`,
      ...status,
    })
  } catch (error) {
    console.error('Error managing scheduler:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage scheduler',
      },
      { status: 500 }
    )
  }
}
