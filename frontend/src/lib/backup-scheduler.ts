/**
 * Database Backup Scheduler
 *
 * Manages scheduled automatic database backups using node-cron.
 * Reads schedule configuration from system_settings table.
 *
 * Usage:
 *   import { initBackupScheduler, stopBackupScheduler } from '@/lib/backup-scheduler'
 *   await initBackupScheduler()
 */

import cron, { ScheduledTask } from 'node-cron'
import { createBackup, cleanupOldBackups, logBackupAction } from './backup'
import { pool } from './db'

// Singleton scheduler instance
let scheduledTask: ScheduledTask | null = null
let isInitialized = false

/**
 * Get setting value from database
 */
async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const result = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1 AND is_active = true',
      [key]
    )
    return result.rows[0]?.setting_value ?? defaultValue
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error)
    return defaultValue
  }
}

/**
 * Get boolean setting
 */
async function getBooleanSetting(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await getSetting(key, String(defaultValue))
  return value === 'true' || value === '1'
}

/**
 * Get number setting
 */
async function getNumberSetting(key: string, defaultValue: number): Promise<number> {
  const value = await getSetting(key, String(defaultValue))
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Build cron expression from schedule settings
 */
function buildCronExpression(
  scheduleType: string,
  scheduleTime: string,
  scheduleDay: number
): string {
  const [hourStr, minuteStr] = scheduleTime.split(':')
  const hour = parseInt(hourStr, 10) || 2
  const minute = parseInt(minuteStr, 10) || 0

  switch (scheduleType) {
    case 'daily':
      // Run every day at specified time
      return `${minute} ${hour} * * *`

    case 'weekly':
      // Run every week on specified day (0 = Sunday)
      const dayOfWeek = Math.min(Math.max(scheduleDay, 0), 6)
      return `${minute} ${hour} * * ${dayOfWeek}`

    case 'monthly':
      // Run on specified day of month
      const dayOfMonth = Math.min(Math.max(scheduleDay, 1), 28) // Cap at 28 to avoid month-end issues
      return `${minute} ${hour} ${dayOfMonth} * *`

    default:
      // Default to daily at 2:00 AM
      return `0 2 * * *`
  }
}

/**
 * Execute scheduled backup
 */
async function executeScheduledBackup(): Promise<void> {
  const startTime = Date.now()
  console.log(`[BackupScheduler] Starting scheduled backup at ${new Date().toISOString()}`)

  try {
    // Create backup
    const backup = await createBackup('scheduled')
    const duration = Date.now() - startTime

    console.log(
      `[BackupScheduler] Backup created: ${backup.filename} (${backup.size_formatted}) in ${duration}ms`
    )

    // Log to audit
    await logBackupAction('scheduled', backup.filename, 'scheduler', undefined, undefined, {
      fileSize: backup.size,
      durationMs: duration,
      status: 'success',
    })

    // Run retention cleanup if enabled
    const retentionEnabled = await getBooleanSetting('BACKUP_RETENTION_ENABLED', true)
    if (retentionEnabled) {
      const retentionDays = await getNumberSetting('BACKUP_RETENTION_DAYS', 30)
      const minCount = await getNumberSetting('BACKUP_RETENTION_COUNT', 10)

      const cleanup = await cleanupOldBackups(retentionDays, minCount)
      if (cleanup.deleted.length > 0) {
        console.log(
          `[BackupScheduler] Cleaned up ${cleanup.deleted.length} old backups, kept ${cleanup.kept}`
        )
      }
    }
  } catch (error) {
    console.error('[BackupScheduler] Backup failed:', error)

    // Log failure
    await logBackupAction('scheduled', 'failed', 'scheduler', undefined, undefined, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Initialize the backup scheduler
 * Reads configuration from system_settings and starts cron job if enabled
 */
export async function initBackupScheduler(): Promise<void> {
  if (isInitialized) {
    console.log('[BackupScheduler] Already initialized')
    return
  }

  try {
    // Check if scheduled backups are enabled
    const enabled = await getBooleanSetting('BACKUP_SCHEDULE_ENABLED', false)

    if (!enabled) {
      console.log('[BackupScheduler] Scheduled backups are disabled')
      isInitialized = true
      return
    }

    // Get schedule configuration
    const scheduleType = await getSetting('BACKUP_SCHEDULE_TYPE', 'daily')
    const scheduleTime = await getSetting('BACKUP_SCHEDULE_TIME', '02:00')
    const scheduleDay = await getNumberSetting('BACKUP_SCHEDULE_DAY', 0)

    // Build cron expression
    const cronExpression = buildCronExpression(scheduleType, scheduleTime, scheduleDay)

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error(`[BackupScheduler] Invalid cron expression: ${cronExpression}`)
      return
    }

    // Stop existing task if any
    if (scheduledTask) {
      scheduledTask.stop()
      scheduledTask = null
    }

    // Schedule the backup task
    scheduledTask = cron.schedule(cronExpression, executeScheduledBackup, {
      timezone: 'America/Grenada', // Use Grenada timezone
    })

    isInitialized = true
    console.log(
      `[BackupScheduler] Initialized with schedule: ${scheduleType} at ${scheduleTime} (cron: ${cronExpression})`
    )
  } catch (error) {
    console.error('[BackupScheduler] Failed to initialize:', error)
  }
}

/**
 * Stop the backup scheduler
 */
export function stopBackupScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('[BackupScheduler] Stopped')
  }
  isInitialized = false
}

/**
 * Restart the backup scheduler
 * Call this after schedule settings are changed
 */
export async function restartBackupScheduler(): Promise<void> {
  console.log('[BackupScheduler] Restarting...')
  stopBackupScheduler()
  await initBackupScheduler()
}

/**
 * Get current scheduler status
 */
export function getSchedulerStatus(): {
  isInitialized: boolean
  isRunning: boolean
} {
  return {
    isInitialized,
    isRunning: scheduledTask !== null,
  }
}

/**
 * Trigger a manual backup through the scheduler
 * (Useful for testing)
 */
export async function triggerManualScheduledBackup(): Promise<void> {
  await executeScheduledBackup()
}
