/**
 * Backup Scheduler Health Check Endpoint
 *
 * GET /api/health/backup-scheduler
 *
 * Returns the current status of the backup scheduler for monitoring purposes.
 * No authentication required - useful for external monitoring tools.
 */

import { NextResponse } from 'next/server'
import { getSchedulerStatus } from '@/lib/backup-scheduler'

export async function GET() {
  try {
    const status = getSchedulerStatus()

    return NextResponse.json({
      status: status.isRunning ? 'healthy' : 'degraded',
      scheduler: {
        initialized: status.isInitialized,
        running: status.isRunning,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
