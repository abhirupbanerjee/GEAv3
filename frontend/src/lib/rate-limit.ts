/**
 * Rate Limiting Utility - Consolidated Version
 * 
 * Combines best practices from existing implementation and Phase 1
 * IP-based rate limiting for public endpoints
 * Supports CAPTCHA challenges after threshold
 * 
 * Improvements:
 * ✅ Uses SHA256 hashing (from existing)
 * ✅ Configurable per-endpoint limits (from Phase 1)
 * ✅ CAPTCHA integration (from Phase 1)
 * ✅ Attempt tracking and analytics (from Phase 1)
 * ✅ Simple, efficient queries (from existing)
 */

import crypto from 'crypto'
import { executeQuery } from './db'

// ============================================
// TYPES
// ============================================

export interface RateLimitConfig {
  requests: number // Max requests allowed
  window: number // Time window in seconds
  captchaThreshold: number // Attempts before CAPTCHA required
}

export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetAt: Date
  requiresCaptcha: boolean
  attemptCount: number
}

// ============================================
// DEFAULT LIMITS
// ============================================

export const DefaultLimits: Record<string, RateLimitConfig> = {
  // Public endpoints - Per endpoint configuration
  'ticket_submit': {
    requests: 5,
    window: 3600, // 1 hour
    captchaThreshold: 2,
  },
  'ticket_status': {
    requests: 10,
    window: 3600, // 1 hour
    captchaThreshold: 5,
  },
  'ticket_categories': {
    requests: 30,
    window: 3600, // 1 hour
    captchaThreshold: 20,
  },
  'feedback_submit': {
    requests: 5,
    window: 3600, // 1 hour
    captchaThreshold: 2,
  },
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Hash IP address for privacy
 * Uses SHA256 (more secure than MD5)
 */
export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex')
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  const realIP = headers.get('x-real-ip')
  const direct = headers.get('host')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return realIP || direct || 'unknown'
}

/**
 * Check if a request is allowed under rate limit
 * Simplified version combining both implementations
 * 
 * Returns:
 *   - allowed: true/false (request should be processed)
 *   - remaining: number of requests left in window
 *   - resetAt: when the limit resets
 *   - requiresCaptcha: whether CAPTCHA is needed
 */
export async function checkRateLimit(
  ip: string,
  limitType: string = 'ticket_submit',
  config?: RateLimitConfig
): Promise<RateLimitStatus> {
  const limit = config || DefaultLimits[limitType] || DefaultLimits['ticket_submit']
  const ipHash = hashIP(ip)
  const now = new Date()
  const windowStart = new Date(now.getTime() - limit.window * 1000)

  try {
    // Use UPSERT pattern (efficient, from existing implementation)
    const result = await executeQuery<{
      submission_count: number
      window_start: Date
    }>(
      `INSERT INTO submission_rate_limit (ip_hash, submission_count, window_start, attempt_type)
       VALUES ($1, 1, NOW(), $2)
       ON CONFLICT (ip_hash, attempt_type) 
       DO UPDATE SET 
         submission_count = CASE
           WHEN submission_rate_limit.window_start < NOW() - INTERVAL '1 hour'
           THEN 1
           ELSE submission_rate_limit.submission_count + 1
         END,
         window_start = CASE
           WHEN submission_rate_limit.window_start < NOW() - INTERVAL '1 hour'
           THEN NOW()
           ELSE submission_rate_limit.window_start
         END
       RETURNING submission_count, window_start`,
      [ipHash, limitType]
    )

    const attemptCount = result.rows[0]?.submission_count || 0
    const windowStart = result.rows[0]?.window_start || now
    const allowed = attemptCount <= limit.requests
    const remaining = Math.max(0, limit.requests - attemptCount)
    const requiresCaptcha = attemptCount >= limit.captchaThreshold
    const resetAt = new Date(new Date(windowStart).getTime() + limit.window * 1000)

    // Also track in submission_attempts for analytics (from Phase 1)
    await recordAttempt(ip, limitType, allowed)

    return {
      allowed,
      remaining,
      resetAt,
      requiresCaptcha,
      attemptCount,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Fail open on database errors
    return {
      allowed: true,
      remaining: limit.requests,
      resetAt: now,
      requiresCaptcha: false,
      attemptCount: 0,
    }
  }
}

/**
 * Record an attempt for rate limiting and analytics
 * Tracks successful/failed attempts
 */
export async function recordAttempt(
  ip: string,
  limitType: string,
  success: boolean
): Promise<void> {
  const ipHash = hashIP(ip)

  try {
    // Insert into attempts table (for analytics, from Phase 1)
    await executeQuery(
      `INSERT INTO submission_attempts (ip_hash, attempt_type, success, attempted_at)
       VALUES ($1, $2, $3, NOW())`,
      [ipHash, limitType, success]
    )

    // Clean up old records (older than 7 days)
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    await executeQuery(
      `DELETE FROM submission_attempts
       WHERE attempted_at < $1`,
      [cutoffDate.toISOString()]
    )
  } catch (error) {
    console.error('Failed to record attempt:', error)
    // Non-critical - don't throw
  }
}

/**
 * Check if CAPTCHA verification is needed
 * Based on previous attempt count
 */
export async function requiresCaptcha(
  ip: string,
  limitType: string = 'ticket_submit'
): Promise<boolean> {
  const limit = DefaultLimits[limitType] || DefaultLimits['ticket_submit']
  if (!limit) {
    return false
  }

  const ipHash = hashIP(ip)
  const now = new Date()
  const windowStart = new Date(now.getTime() - limit.window * 1000)

  try {
    const result = await executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM submission_attempts
       WHERE ip_hash = $1 
       AND attempt_type = $2
       AND attempted_at >= $3
       AND success = true`,
      [ipHash, limitType, windowStart.toISOString()]
    )

    const successCount = result.rows[0]?.count || 0
    return successCount >= limit.captchaThreshold
  } catch (error) {
    console.error('CAPTCHA check error:', error)
    return false
  }
}

/**
 * Verify CAPTCHA token
 * Supports Google reCAPTCHA v3
 */
export async function verifyCaptcha(token: string): Promise<{
  success: boolean
  score?: number
  action?: string
  error?: string
}> {
  const secret = process.env.RECAPTCHA_SECRET_KEY

  if (!secret) {
    console.warn('RECAPTCHA_SECRET_KEY not configured')
    return { success: false, error: 'CAPTCHA not configured' }
  }

  if (!token) {
    return { success: false, error: 'No CAPTCHA token provided' }
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
      }).toString(),
    })

    const data = await response.json() as {
      success: boolean
      score?: number
      action?: string
      error_codes?: string[]
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error_codes?.join(', ') || 'CAPTCHA verification failed',
      }
    }

    // Score threshold: 0.5+ is generally considered human
    const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5')
    const isValid = (data.score || 0) >= minScore

    return {
      success: isValid,
      score: data.score,
      action: data.action,
      error: !isValid ? 'Score too low' : undefined,
    }
  } catch (error) {
    console.error('CAPTCHA verification error:', error)
    return {
      success: false,
      error: 'CAPTCHA verification failed',
    }
  }
}

/**
 * Reset rate limit for an IP (admin only)
 */
export async function resetRateLimit(
  ip: string,
  limitType?: string
): Promise<void> {
  const ipHash = hashIP(ip)

  try {
    if (limitType) {
      await executeQuery(
        `DELETE FROM submission_rate_limit
         WHERE ip_hash = $1 AND attempt_type = $2`,
        [ipHash, limitType]
      )
    } else {
      await executeQuery(
        `DELETE FROM submission_rate_limit
         WHERE ip_hash = $1`,
        [ipHash]
      )
    }
  } catch (error) {
    console.error('Failed to reset rate limit:', error)
    throw error
  }
}

/**
 * Get rate limit statistics for monitoring
 */
export async function getRateLimitStats(
  limitType: string,
  interval: number = 3600
): Promise<{
  total_attempts: number
  unique_ips: number
  blocked_ips: number
  captcha_triggered: number
  limit_config: RateLimitConfig
}> {
  const cutoffTime = new Date(Date.now() - interval * 1000)
  const limit = DefaultLimits[limitType]

  if (!limit) {
    throw new Error(`Unknown rate limit type: ${limitType}`)
  }

  try {
    const result = await executeQuery<{
      total: number
      unique_ips: number
      blocked: number
      captcha: number
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(DISTINCT ip_hash) as unique_ips,
        COUNT(DISTINCT CASE WHEN (
          SELECT COUNT(*) FROM submission_attempts sa
          WHERE sa.ip_hash = submission_attempts.ip_hash
          AND sa.attempt_type = $1
          AND sa.attempted_at >= $2
        ) >= $3 THEN ip_hash END) as blocked,
        COUNT(DISTINCT CASE WHEN (
          SELECT COUNT(*) FROM submission_attempts sa
          WHERE sa.ip_hash = submission_attempts.ip_hash
          AND sa.attempt_type = $1
          AND sa.attempted_at >= $2
          AND sa.success = true
        ) >= $4 THEN ip_hash END) as captcha
       FROM submission_attempts
       WHERE attempt_type = $1
       AND attempted_at >= $2`,
      [limitType, cutoffTime.toISOString(), limit.requests, limit.captchaThreshold]
    )

    const stats = result.rows[0]
    return {
      total_attempts: stats?.total || 0,
      unique_ips: stats?.unique_ips || 0,
      blocked_ips: stats?.blocked || 0,
      captcha_triggered: stats?.captcha || 0,
      limit_config: limit,
    }
  } catch (error) {
    console.error('Failed to get rate limit stats:', error)
    return {
      total_attempts: 0,
      unique_ips: 0,
      blocked_ips: 0,
      captcha_triggered: 0,
      limit_config: limit,
    }
  }
}

export default {
  // Configuration
  DefaultLimits,

  // Core functions
  hashIP,
  getClientIP,
  checkRateLimit,
  recordAttempt,
  requiresCaptcha,
  verifyCaptcha,

  // Admin functions
  resetRateLimit,
  getRateLimitStats,
}