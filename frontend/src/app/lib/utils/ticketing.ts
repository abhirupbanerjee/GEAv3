/**
 * GEA Ticket System - Utility Functions (CORRECTED)
 * Version: 1.1 (Fixed TypeScript type errors)
 * Purpose: Rate limiting, IP hashing, request helpers
 * Location: app/lib/utils/ticketing.ts
 */

import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

/**
 * ============================================
 * IP ADDRESS UTILITIES
 * ============================================
 */

/**
 * Extract client IP from request
 * Handles proxies and CDNs (Cloudflare, AWS, etc.)
 */
export function getClientIp(request: NextRequest): string {
  // Check X-Forwarded-For header (proxy/load balancer)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Check X-Real-IP header (nginx proxy)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Check Cloudflare header
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // Fallback to socket address
  return request.ip || '0.0.0.0';
}

/**
 * Hash IP address for privacy (MD5)
 * Used in database for rate limiting without storing raw IPs
 */
export function hashIp(ipAddress: string): string {
  return createHash('md5')
    .update(ipAddress)
    .digest('hex');
}

/**
 * Generate request ID for tracking
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ============================================
 * RATE LIMITING UTILITIES (CORRECTED)
 * ============================================
 */

interface RateLimitConfig {
  limit: number;        // Max requests
  window: number;       // Time window in seconds
  keyPrefix: string;    // Redis/cache key prefix
}

/**
 * CORRECTED: Added retryAfter as optional property
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;  // ✅ ADDED - Optional, only present when not allowed
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  submit: {
    limit: 5,
    window: 3600,           // 1 hour
    keyPrefix: 'ratelimit:submit:',
  },
  status: {
    limit: 10,
    window: 3600,           // 1 hour
    keyPrefix: 'ratelimit:status:',
  },
  categories: {
    limit: 30,
    window: 3600,           // 1 hour
    keyPrefix: 'ratelimit:categories:',
  },
};

/**
 * Simple in-memory rate limit store (production: use Redis)
 * Key: "endpoint:ip_hash", Value: { count, timestamp }
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * CORRECTED: Check if IP has exceeded rate limit
 * Now returns retryAfter only when rate limit exceeded
 */
export function checkRateLimit(
  endpoint: keyof typeof RATE_LIMITS,
  ipHash: string
): RateLimitResult {
  const config = RATE_LIMITS[endpoint];
  const key = `${config.keyPrefix}${ipHash}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.window * 1000 };
    rateLimitStore.set(key, entry);
  }

  const allowed = entry.count < config.limit;
  const remaining = Math.max(0, config.limit - entry.count - 1);

  // Increment counter if allowed
  if (allowed) {
    entry.count++;
    rateLimitStore.set(key, entry);
    
    // ✅ CORRECTED: Return without retryAfter when allowed
    return {
      allowed: true,
      remaining,
      resetAt: Math.floor(entry.resetAt / 1000),
    };
  }

  // ✅ CORRECTED: Return WITH retryAfter when NOT allowed
  return {
    allowed: false,
    remaining: 0,
    resetAt: Math.floor(entry.resetAt / 1000),
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Requires CAPTCHA if user has high submission attempt rate
 */
export function requiresCaptcha(ipHash: string, threshold = 2): boolean {
  const config = RATE_LIMITS.submit;
  const key = `${config.keyPrefix}${ipHash}`;
  const entry = rateLimitStore.get(key);

  if (!entry) return false;

  // CAPTCHA required after threshold attempts
  return entry.count >= threshold;
}

/**
 * ============================================
 * RESPONSE FORMATTING
 * ============================================
 */

/**
 * Standard success response
 */
export function successResponse<T>(
  data: T,
  statusCode = 200,
  message?: string
) {
  return {
    status: statusCode,
    body: {
      success: true,
      data,
      message: message || 'Operation successful',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Standard error response
 */
export function errorResponse(
  error: string,
  message: string,
  statusCode = 400,
  details?: Record<string, any>,
  requestId?: string
) {
  return {
    status: statusCode,
    body: {
      success: false,
      error,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      ...(requestId && { request_id: requestId }),
    },
  };
}

/**
 * Rate limit exceeded response
 */
export function rateLimitResponse(retryAfter: number, requestId?: string) {
  return errorResponse(
    'rate_limit_exceeded',
    `Maximum requests exceeded. Please try again in ${retryAfter} seconds.`,
    429,
    undefined,
    requestId
  );
}

/**
 * ============================================
 * DATABASE HELPERS
 * ============================================
 */

/**
 * Format ticket number (YYYYMM-XXXXXX)
 */
export function formatTicketNumber(sequence: number): string {
  const now = new Date();
  const yearMonth = now.getFullYear().toString().slice(-2) + 
                    String(now.getMonth() + 1).padStart(2, '0');
  const sequencePad = String(sequence).padStart(6, '0');
  return `${yearMonth}-${sequencePad}`;
}

/**
 * Parse ticket number to get sequence
 */
export function parseTicketNumber(ticketNumber: string): {
  yearMonth: string;
  sequence: number;
} | null {
  const match = ticketNumber.match(/^(\d{4})-(\d{6})$/);
  if (!match) return null;

  return {
    yearMonth: match[1],
    sequence: parseInt(match[2], 10),
  };
}

/**
 * Calculate SLA target based on category and priority
 */
export function calculateSlaTarget(
  baseHours: number,
  priorityMultiplier: number
): Date {
  const target = new Date();
  const adjustedHours = baseHours / priorityMultiplier;
  target.setHours(target.getHours() + adjustedHours);
  return target;
}

/**
 * ============================================
 * VALIDATION HELPERS
 * ============================================
 */

/**
 * Validate ticket number format
 */
export function isValidTicketNumber(ticketNumber: string): boolean {
  return /^\d{6}-\d{6}$/.test(ticketNumber);
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['";]/g, '')  // Remove quotes
    .trim();
}

/**
 * Clean up in-memory rate limit store (run periodically)
 * Remove expired entries
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
      removed++;
    }
  }

  console.log(`Cleanup: Removed ${removed} expired rate limit entries`);
  return removed;
}

/**
 * Get rate limit store stats (for monitoring)
 */
export function getRateLimitStats() {
  return {
    entriesCount: rateLimitStore.size,
    memory: process.memoryUsage(),
  };
}

/**
 * ============================================
 * MIDDLEWARE UTILITIES
 * ============================================
 */

/**
 * Middleware to extract and validate common request data
 */
export function extractRequestContext(request: NextRequest) {
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const requestId = generateRequestId();
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return {
    ip,
    ipHash,
    requestId,
    userAgent,
    timestamp: new Date(),
  };
}

/**
 * Format error for logging
 */
export function formatErrorLog(error: unknown, context: string): string {
  if (error instanceof Error) {
    return `[${context}] ${error.message} - ${error.stack}`;
  }
  return `[${context}] ${JSON.stringify(error)}`;
}