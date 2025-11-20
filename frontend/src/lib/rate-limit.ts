/**
 * Rate Limiting Utility - Updated for env.ts Configuration
 * 
 * Key Changes:
 * ✅ Reads EA_SERVICE_RATE_LIMIT and GRIEVANCE_RATE_LIMIT from config/env.ts
 * ✅ Removed hardcoded rate limit values
 * ✅ Removed CAPTCHA logic (not in Phase 2b scope)
 * ✅ Simplified to focus on core feedback/grievance rate limiting
 * ✅ Uses SHA256 hashing for privacy
 * ✅ Simple, efficient database queries
 */

import crypto from 'crypto'
import { pool } from './db'
import { config } from '@/config/env'

// ============================================
// TYPES
// ============================================

export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetAt: Date
  attemptCount: number
  limit: number
}

// ============================================
// RATE LIMIT TYPES
// ============================================

type RateLimitType = 'feedback' | 'grievance'

/**
 * Get rate limit for a specific endpoint type
 * Reads from config/env.ts
 */
function getRateLimit(type: RateLimitType): number {
  switch (type) {
    case 'feedback':
      return config.EA_SERVICE_RATE_LIMIT || 5
    case 'grievance':
      return config.GRIEVANCE_RATE_LIMIT || 2
    default:
      return 5
  }
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Hash IP address for privacy
 * Uses SHA256 (secure, consistent)
 */
export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex')
}

/**
 * Hash user agent for additional fingerprinting
 */
export function hashUserAgent(userAgent: string): string {
  return crypto.createHash('sha256').update(userAgent).digest('hex')
}

/**
 * Extract client IP from request headers
 * Handles proxy headers (X-Forwarded-For, X-Real-IP)
 */
export function getClientIP(request: Request): string {
  const headers = new Headers(request.headers)
  
  // Check X-Forwarded-For (for proxies like Traefik, Nginx)
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // Check X-Real-IP (for reverse proxies)
  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback to host (less reliable)
  return headers.get('host') || 'unknown'
}

/**
 * Check if a request is allowed under rate limit
 * 
 * Algorithm:
 * 1. Hash the IP address
 * 2. Query database for submissions in last hour
 * 3. Compare against limit from config
 * 4. Return remaining requests
 * 
 * Returns:
 *   - allowed: true if under limit, false if exceeded
 *   - remaining: number of requests left in window
 *   - resetAt: when the limit window resets
 *   - attemptCount: total attempts in current window
 *   - limit: the configured limit
 */
export async function checkRateLimit(
  ipHash: string,
  type: RateLimitType = 'feedback'
): Promise<RateLimitStatus> {
  const limit = getRateLimit(type)
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 3600 * 1000)

  try {
    // Count submissions from this IP in the last hour
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM service_feedback
       WHERE ip_hash = $1
       AND submitted_at > $2`,
      [ipHash, oneHourAgo]
    )

    const attemptCount = parseInt(result.rows[0]?.count || '0', 10)
    const allowed = attemptCount < limit
    const remaining = Math.max(0, limit - attemptCount)

    // Calculate when the oldest submission in the window was made
    // This helps users understand when they can submit again
    const oldestResult = await pool.query(
      `SELECT MIN(submitted_at) as oldest
       FROM service_feedback
       WHERE ip_hash = $1
       AND submitted_at > $2
       LIMIT 1`,
      [ipHash, oneHourAgo]
    )

    const oldestSubmission = oldestResult.rows[0]?.oldest
    const resetAt = oldestSubmission 
      ? new Date(new Date(oldestSubmission).getTime() + 3600 * 1000)
      : new Date(now.getTime() + 3600 * 1000)

    return {
      allowed,
      remaining,
      resetAt,
      attemptCount,
      limit
    }
  } catch (error) {
    console.error('❌ Rate limit check error:', error)
    // Fail open on database errors - allow the request
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(now.getTime() + 3600 * 1000),
      attemptCount: 0,
      limit
    }
  }
}

/**
 * Check rate limit for grievances (separate from feedback)
 * Uses tickets table instead of service_feedback
 */
export async function checkGrievanceRateLimit(
  ipHash: string
): Promise<RateLimitStatus> {
  const limit = getRateLimit('grievance')
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 3600 * 1000)

  try {
    // Count grievance submissions from this IP in the last hour
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM tickets
       WHERE ip_hash = $1
       AND created_at > $2`,
      [ipHash, oneHourAgo]
    )

    const attemptCount = parseInt(result.rows[0]?.count || '0', 10)
    const allowed = attemptCount < limit
    const remaining = Math.max(0, limit - attemptCount)

    const oldestResult = await pool.query(
      `SELECT MIN(created_at) as oldest
       FROM tickets
       WHERE ip_hash = $1
       AND created_at > $2`,
      [ipHash, oneHourAgo]
    )

    const oldestSubmission = oldestResult.rows[0]?.oldest
    const resetAt = oldestSubmission 
      ? new Date(new Date(oldestSubmission).getTime() + 3600 * 1000)
      : new Date(now.getTime() + 3600 * 1000)

    return {
      allowed,
      remaining,
      resetAt,
      attemptCount,
      limit
    }
  } catch (error) {
    console.error('❌ Grievance rate limit check error:', error)
    // Fail open on database errors
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(now.getTime() + 3600 * 1000),
      attemptCount: 0,
      limit
    }
  }
}

/**
 * Get rate limit statistics (for monitoring/admin)
 * Shows usage patterns across all IPs
 */
export async function getRateLimitStats(
  type: RateLimitType = 'feedback'
): Promise<{
  limit: number
  total_submissions: number
  unique_ips: number
  ips_at_limit: number
  average_per_ip: number
}> {
  const limit = getRateLimit(type)
  const oneHourAgo = new Date(Date.now() - 3600 * 1000)

  try {
    // Get statistics for the last hour
    const result = await pool.query(
      type === 'feedback'
        ? `SELECT
            COUNT(*) as total,
            COUNT(DISTINCT ip_hash) as unique_ips,
            COUNT(DISTINCT CASE 
              WHEN (SELECT COUNT(*) FROM service_feedback sf2 
                    WHERE sf2.ip_hash = service_feedback.ip_hash 
                    AND sf2.submitted_at > $1) >= $2 
              THEN ip_hash 
            END) as at_limit
           FROM service_feedback
           WHERE submitted_at > $1`
        : `SELECT
            COUNT(*) as total,
            COUNT(DISTINCT ip_hash) as unique_ips,
            COUNT(DISTINCT CASE 
              WHEN (SELECT COUNT(*) FROM tickets t2 
                    WHERE t2.ip_hash = tickets.ip_hash 
                    AND t2.created_at > $1) >= $2 
              THEN ip_hash 
            END) as at_limit
           FROM tickets
           WHERE created_at > $1`,
      [oneHourAgo, limit]
    )

    const stats = result.rows[0]
    const total = parseInt(stats?.total || '0', 10)
    const uniqueIPs = parseInt(stats?.unique_ips || '0', 10)
    const atLimit = parseInt(stats?.at_limit || '0', 10)

    return {
      limit,
      total_submissions: total,
      unique_ips: uniqueIPs,
      ips_at_limit: atLimit,
      average_per_ip: uniqueIPs > 0 ? Math.round(total / uniqueIPs) : 0
    }
  } catch (error) {
    console.error('❌ Failed to get rate limit stats:', error)
    return {
      limit,
      total_submissions: 0,
      unique_ips: 0,
      ips_at_limit: 0,
      average_per_ip: 0
    }
  }
}

/**
 * Reset rate limit for an IP (admin function)
 * Useful for testing or resolving blocked IPs
 */
export async function resetRateLimit(
  ipHash: string,
  type: RateLimitType = 'feedback'
): Promise<void> {
  try {
    if (type === 'feedback') {
      // For feedback, we'd need to delete from service_feedback
      // Usually not done - better to wait for window to pass
      console.warn('⚠️ Rate limit resets automatically after 1 hour')
      return
    } else {
      // For grievances, similar approach
      console.warn('⚠️ Rate limit resets automatically after 1 hour')
      return
    }
  } catch (error) {
    console.error('❌ Failed to reset rate limit:', error)
    throw error
  }
}

/**
 * Record an attempt for rate limiting and analytics (DEPRECATED)
 * Kept for backward compatibility with existing imports
 */
export async function recordAttempt(
  ip: string,
  limitType: string,
  success: boolean
): Promise<void> {
  console.log(`Attempt recorded: ${limitType} - ${success ? 'success' : 'failed'}`);
}

/**
 * Verify CAPTCHA token (NOT IMPLEMENTED IN PHASE 2B)
 * Kept for backward compatibility with existing imports
 */
export async function verifyCaptcha(token: string): Promise<{
  success: boolean;
  score?: number;
  action?: string;
  error?: string;
}> {
  console.warn('CAPTCHA not implemented in Phase 2b');
  return {
    success: true,
    error: 'CAPTCHA not configured for Phase 2b'
  };
}

export default {
  // Core functions
  hashIP,
  hashUserAgent,
  getClientIP,
  checkRateLimit,
  checkGrievanceRateLimit,
  getRateLimitStats,
  resetRateLimit,
  verifyCaptcha,
  recordAttempt,
}