import { describe, it, expect } from 'vitest'
import { isValidBackupFilename, formatBytes } from '@/lib/backup'

describe('isValidBackupFilename', () => {
  describe('valid filenames', () => {
    it('should accept standard backup filename', () => {
      expect(isValidBackupFilename('feedback_backup_20240115_143022_manual.sql')).toBe(true)
    })

    it('should accept filename with scheduled type', () => {
      expect(isValidBackupFilename('feedback_backup_20240115_143022_scheduled.sql')).toBe(true)
    })

    it('should accept filename with pre_restore type', () => {
      expect(isValidBackupFilename('feedback_backup_20240115_143022_pre_restore.sql')).toBe(true)
    })

    it('should accept simple alphanumeric filename', () => {
      expect(isValidBackupFilename('backup.sql')).toBe(true)
    })

    it('should accept filename with hyphens', () => {
      expect(isValidBackupFilename('my-backup-file.sql')).toBe(true)
    })

    it('should accept filename with underscores', () => {
      expect(isValidBackupFilename('my_backup_file.sql')).toBe(true)
    })
  })

  describe('invalid filenames - path traversal', () => {
    it('should reject path traversal with ../', () => {
      expect(isValidBackupFilename('../etc/passwd')).toBe(false)
    })

    it('should reject path traversal with multiple ../', () => {
      expect(isValidBackupFilename('../../../etc/passwd')).toBe(false)
    })

    it('should reject Windows path traversal', () => {
      expect(isValidBackupFilename('..\\windows\\system32')).toBe(false)
    })

    it('should reject absolute paths', () => {
      expect(isValidBackupFilename('/etc/passwd')).toBe(false)
    })

    it('should reject paths with forward slashes', () => {
      expect(isValidBackupFilename('path/to/file.sql')).toBe(false)
    })
  })

  describe('invalid filenames - special characters', () => {
    it('should reject filename with semicolon (command injection)', () => {
      expect(isValidBackupFilename('backup;rm -rf /')).toBe(false)
    })

    it('should reject filename with pipe (command injection)', () => {
      expect(isValidBackupFilename('backup|cat /etc/passwd')).toBe(false)
    })

    it('should reject filename with spaces', () => {
      expect(isValidBackupFilename('backup file.sql')).toBe(false)
    })

    it('should reject filename with backticks', () => {
      expect(isValidBackupFilename('backup`whoami`.sql')).toBe(false)
    })

    it('should reject filename with dollar sign', () => {
      expect(isValidBackupFilename('backup$HOME.sql')).toBe(false)
    })
  })

  describe('invalid filenames - wrong extension', () => {
    it('should reject non-.sql extension', () => {
      expect(isValidBackupFilename('backup.txt')).toBe(false)
    })

    it('should reject .sql.gz extension', () => {
      expect(isValidBackupFilename('backup.sql.gz')).toBe(false)
    })

    it('should reject no extension', () => {
      expect(isValidBackupFilename('backup')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should reject empty string', () => {
      expect(isValidBackupFilename('')).toBe(false)
    })

    it('should reject just .sql', () => {
      expect(isValidBackupFilename('.sql')).toBe(false)
    })
  })
})

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
  })

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes')
  })

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(2048)).toBe('2 KB')
  })

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(5242880)).toBe('5 MB')
  })

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('should handle decimal values', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })
})
