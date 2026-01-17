/**
 * Database Backup Utilities
 *
 * Provides functions for PostgreSQL 16 database backup and restore operations
 * using Docker exec commands for pg_dump and psql.
 *
 * Usage:
 *   import { listBackups, createBackup, restoreBackup } from '@/lib/backup'
 */

import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { pool } from './db'

const execAsync = promisify(exec)

// Configuration constants
export const BACKUP_DIR = '/tmp/gea_backups'
export const DB_HOST = process.env.FEEDBACK_DB_HOST || 'feedback_db'
export const DB_USER = process.env.FEEDBACK_DB_USER || 'feedback_user'
export const DB_NAME = process.env.FEEDBACK_DB_NAME || 'feedback'
export const DB_PASSWORD = process.env.FEEDBACK_DB_PASSWORD || ''

// Backup file interface
export interface BackupFile {
  filename: string
  created_at: Date
  size: number
  size_formatted: string
  type: 'manual' | 'scheduled' | 'pre_restore' | 'unknown'
}

// Restore progress callback type
export type RestoreProgressCallback = (
  step: string,
  message: string,
  progress: number
) => void

// Audit log action type
export type BackupAction = 'create' | 'download' | 'restore' | 'delete' | 'scheduled'

/**
 * Ensure backup directory exists
 */
export function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o755 })
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Parse backup filename to extract metadata
 * Expected format: feedback_backup_YYYYMMDD_HHMMSS_type.sql
 */
export function parseBackupFilename(filename: string): BackupFile | null {
  // Match pattern: feedback_backup_YYYYMMDD_HHMMSS_type.sql
  const regex = /^feedback_backup_(\d{8})_(\d{6})_(\w+)\.sql$/
  const match = filename.match(regex)

  if (!match) {
    // Try alternate pattern without type
    const altRegex = /^feedback_backup_(\d{8})_(\d{6})\.sql$/
    const altMatch = filename.match(altRegex)
    if (!altMatch) return null

    const [, dateStr, timeStr] = altMatch
    const created_at = parseTimestamp(dateStr, timeStr)
    const filePath = path.join(BACKUP_DIR, filename)

    if (!fs.existsSync(filePath)) return null
    const stats = fs.statSync(filePath)

    return {
      filename,
      created_at,
      size: stats.size,
      size_formatted: formatBytes(stats.size),
      type: 'unknown',
    }
  }

  const [, dateStr, timeStr, type] = match
  const created_at = parseTimestamp(dateStr, timeStr)
  const filePath = path.join(BACKUP_DIR, filename)

  if (!fs.existsSync(filePath)) return null
  const stats = fs.statSync(filePath)

  return {
    filename,
    created_at,
    size: stats.size,
    size_formatted: formatBytes(stats.size),
    type: type as BackupFile['type'],
  }
}

/**
 * Parse timestamp from date and time strings
 */
function parseTimestamp(dateStr: string, timeStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4))
  const month = parseInt(dateStr.substring(4, 6)) - 1 // 0-indexed
  const day = parseInt(dateStr.substring(6, 8))
  const hour = parseInt(timeStr.substring(0, 2))
  const minute = parseInt(timeStr.substring(2, 4))
  const second = parseInt(timeStr.substring(4, 6))

  return new Date(year, month, day, hour, minute, second)
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(type: string): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
  return `feedback_backup_${dateStr}_${timeStr}_${type}.sql`
}

/**
 * List all backup files
 */
export async function listBackups(): Promise<BackupFile[]> {
  ensureBackupDir()

  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.sql'))

  const backups = files
    .map(parseBackupFilename)
    .filter((b): b is BackupFile => b !== null)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())

  return backups
}

/**
 * Get total backup directory size
 */
export function getBackupDirStats(): { totalSize: number; totalSizeFormatted: string; count: number } {
  ensureBackupDir()

  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.sql'))
  let totalSize = 0

  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file)
    if (fs.existsSync(filePath)) {
      totalSize += fs.statSync(filePath).size
    }
  }

  return {
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    count: files.length,
  }
}

/**
 * Create a new database backup using pg_dumpall (PostgreSQL 16)
 * Uses pg_dumpall for complete cluster dump including roles
 */
export async function createBackup(type: string = 'manual'): Promise<BackupFile> {
  ensureBackupDir()

  const filename = generateBackupFilename(type)
  const filePath = path.join(BACKUP_DIR, filename)

  // Use pg_dumpall for complete dump (includes roles, tablespaces, databases)
  // PostgreSQL 16 compatible flags - connect directly via Docker network
  const command = `PGPASSWORD="${DB_PASSWORD}" pg_dumpall -h ${DB_HOST} -U ${DB_USER} --clean --if-exists`

  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 500, // 500MB buffer for large databases
      timeout: 300000, // 5 minute timeout
    })

    fs.writeFileSync(filePath, stdout, { mode: 0o644 })

    const backup = parseBackupFilename(filename)
    if (!backup) {
      throw new Error('Failed to parse created backup file')
    }

    return backup
  } catch (error) {
    // Clean up partial file if exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    throw error
  }
}

/**
 * Restore database from backup file
 * Creates a safety backup before restore
 */
export async function restoreBackup(
  filename: string,
  onProgress?: RestoreProgressCallback
): Promise<{ tables: number; duration_ms: number; safety_backup: string }> {
  const startTime = Date.now()
  const filePath = path.join(BACKUP_DIR, filename)

  // Validate filename to prevent path traversal
  if (!isValidBackupFilename(filename)) {
    throw new Error('Invalid backup filename')
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file not found')
  }

  const progress = onProgress || (() => {})

  // Step 1: Create safety backup
  progress('safety_backup', 'Creating safety backup of current database...', 10)
  const safetyBackup = await createBackup('pre_restore')

  try {
    // Step 2: Read backup content
    progress('reading', 'Reading backup file...', 30)
    const backupContent = fs.readFileSync(filePath, 'utf-8')

    // Step 3: Drop and recreate database
    progress('dropping', 'Dropping existing database...', 50)
    const dropCmd = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`
    execSync(dropCmd, { stdio: 'pipe' })

    const createCmd = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"`
    execSync(createCmd, { stdio: 'pipe' })

    // Step 4: Restore from backup
    progress('restoring', 'Restoring database from backup...', 70)
    const restoreCmd = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -U ${DB_USER} -d postgres`
    execSync(restoreCmd, {
      input: backupContent,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 500,
      timeout: 600000, // 10 minute timeout
      env: { ...process.env, PGPASSWORD: DB_PASSWORD },
    })

    // Step 5: Verify restoration
    progress('verifying', 'Verifying database restoration...', 90)
    const verifyCmd = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"`
    const { stdout } = await execAsync(verifyCmd)
    const tables = parseInt(stdout.trim(), 10)

    progress('complete', 'Database restored successfully!', 100)

    return {
      tables,
      duration_ms: Date.now() - startTime,
      safety_backup: safetyBackup.filename,
    }
  } catch (error) {
    progress('error', 'Restore failed, database may need manual recovery', 0)
    throw error
  }
}

/**
 * Delete a backup file
 */
export function deleteBackup(filename: string): void {
  // Validate filename to prevent path traversal
  if (!isValidBackupFilename(filename)) {
    throw new Error('Invalid backup filename')
  }

  const filePath = path.join(BACKUP_DIR, filename)

  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file not found')
  }

  // Security check: ensure we're only deleting from backup directory
  const resolvedPath = path.resolve(filePath)
  if (!resolvedPath.startsWith(path.resolve(BACKUP_DIR))) {
    throw new Error('Invalid backup path')
  }

  fs.unlinkSync(filePath)
}

/**
 * Get backup file path for streaming download
 */
export function getBackupFilePath(filename: string): string {
  // Validate filename to prevent path traversal
  if (!isValidBackupFilename(filename)) {
    throw new Error('Invalid backup filename')
  }

  const filePath = path.join(BACKUP_DIR, filename)

  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file not found')
  }

  return filePath
}

/**
 * Get backup file info
 */
export function getBackupInfo(filename: string): BackupFile | null {
  if (!isValidBackupFilename(filename)) {
    return null
  }
  return parseBackupFilename(filename)
}

/**
 * Get preview of backup file (first N lines)
 */
export function getBackupPreview(filename: string, lines: number = 50): string {
  if (!isValidBackupFilename(filename)) {
    throw new Error('Invalid backup filename')
  }

  const filePath = path.join(BACKUP_DIR, filename)
  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file not found')
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const allLines = content.split('\n')
  return allLines.slice(0, lines).join('\n')
}

/**
 * Validate backup filename (prevent path traversal)
 */
export function isValidBackupFilename(filename: string): boolean {
  // Only allow alphanumeric, underscore, hyphen, and .sql extension
  const validPattern = /^[a-zA-Z0-9_-]+\.sql$/
  if (!validPattern.test(filename)) {
    return false
  }
  // Ensure no path components
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return false
  }
  return true
}

/**
 * Clean up old backups based on retention policy
 */
export async function cleanupOldBackups(
  retentionDays: number = 30,
  minCount: number = 10
): Promise<{ deleted: string[]; kept: number }> {
  const backups = await listBackups()
  const deleted: string[] = []

  // Never delete if we have <= minCount backups
  if (backups.length <= minCount) {
    return { deleted: [], kept: backups.length }
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  // Sort by date (newest first) and keep at least minCount
  const sortedBackups = [...backups].sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime()
  )

  for (let i = minCount; i < sortedBackups.length; i++) {
    const backup = sortedBackups[i]
    if (backup.created_at < cutoffDate) {
      try {
        deleteBackup(backup.filename)
        deleted.push(backup.filename)
      } catch (error) {
        console.error(`Failed to delete backup ${backup.filename}:`, error)
      }
    }
  }

  return { deleted, kept: sortedBackups.length - deleted.length }
}

/**
 * Log backup action to audit table
 */
export async function logBackupAction(
  action: BackupAction,
  filename: string,
  performedBy: string,
  ipAddress?: string,
  userAgent?: string,
  details?: {
    safetyBackupFilename?: string
    tablesRestored?: number
    rowsRestored?: number
    fileSize?: number
    durationMs?: number
    status?: 'success' | 'failed' | 'in_progress'
    errorMessage?: string
  }
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO backup_audit_log
       (action, filename, performed_by, ip_address, user_agent, details,
        safety_backup_filename, tables_restored, rows_restored, file_size,
        duration_ms, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        action,
        filename,
        performedBy,
        ipAddress || null,
        userAgent || null,
        details ? JSON.stringify(details) : null,
        details?.safetyBackupFilename || null,
        details?.tablesRestored || null,
        details?.rowsRestored || null,
        details?.fileSize || null,
        details?.durationMs || null,
        details?.status || 'success',
        details?.errorMessage || null,
      ]
    )
  } catch (error) {
    console.error('Failed to log backup action:', error)
    // Don't throw - audit logging should not break backup operations
  }
}

/**
 * Get recent backup audit logs
 */
export async function getBackupAuditLogs(limit: number = 50): Promise<Array<{
  audit_id: number
  action: BackupAction
  filename: string
  performed_by: string
  status: string
  created_at: Date
  duration_ms?: number
  file_size?: number
}>> {
  const result = await pool.query(
    `SELECT audit_id, action, filename, performed_by, status, created_at, duration_ms, file_size
     FROM backup_audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  )
  return result.rows
}
