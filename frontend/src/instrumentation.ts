/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the Next.js server starts (development or production).
 * It's used to initialize services that need to run for the entire application lifecycle.
 *
 * Documentation: https://nextjs.org/docs/app/guides/instrumentation
 */

export async function register() {
  // Only run on Node.js server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Dynamic import to ensure this only runs server-side
      const { initBackupScheduler } = await import('./lib/backup-scheduler')
      const { ensureBackupDir } = await import('./lib/backup')

      // Ensure backup directory exists
      ensureBackupDir()

      // Initialize backup scheduler
      await initBackupScheduler()
    } catch (error) {
      // Log error but don't crash the server if scheduler fails
      console.error('[Instrumentation] Failed to initialize backup scheduler:', error)
      console.error(
        '[Instrumentation] Server will continue, but automatic backups may not work'
      )
    }
  }
}
