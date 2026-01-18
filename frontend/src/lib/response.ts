/**
 * Response & Error Handling Utilities
 * 
 * Standardized response and error formats across all API endpoints
 * Ensures consistent error codes, messages, and response structures
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// ============================================
// RESPONSE TYPES
// ============================================

export interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export interface ListResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
  timestamp: string
}

export interface ErrorResponse {
  success: false
  error: string
  message: string
  details?: Record<string, string[]>
  request_id: string
  timestamp: string
}

export interface ErrorDetail {
  code: string
  message: string
  statusCode: number
  details?: Record<string, string[]>
}

// ============================================
// ERROR DEFINITIONS
// ============================================

export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_FAILED: {
    code: 'validation_failed',
    message: 'Input validation failed',
    statusCode: 400,
  },
  INVALID_TICKET_NUMBER: {
    code: 'invalid_ticket_number',
    message: 'Invalid ticket number format',
    statusCode: 400,
  },
  INVALID_EMAIL: {
    code: 'invalid_email',
    message: 'Invalid email format',
    statusCode: 400,
  },
  INVALID_PHONE: {
    code: 'invalid_phone',
    message: 'Invalid phone number format',
    statusCode: 400,
  },

  // Authentication/Authorization (401/403)
  UNAUTHORIZED: {
    code: 'unauthorized',
    message: 'Authentication required',
    statusCode: 401,
  },
  SESSION_EXPIRED: {
    code: 'session_expired',
    message: 'Your session has expired. Please login again.',
    statusCode: 401,
  },
  INVALID_CREDENTIALS: {
    code: 'invalid_credentials',
    message: 'Invalid username or password',
    statusCode: 401,
  },
  FORBIDDEN: {
    code: 'forbidden',
    message: 'You do not have permission to access this resource',
    statusCode: 403,
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'insufficient_permissions',
    message: 'Your role does not have permission for this action',
    statusCode: 403,
  },

  // Resource errors (404)
  NOT_FOUND: {
    code: 'not_found',
    message: 'Resource not found',
    statusCode: 404,
  },
  TICKET_NOT_FOUND: {
    code: 'ticket_not_found',
    message: 'Ticket not found',
    statusCode: 404,
  },
  SERVICE_NOT_FOUND: {
    code: 'service_not_found',
    message: 'Service not found',
    statusCode: 404,
  },
  CATEGORY_NOT_FOUND: {
    code: 'category_not_found',
    message: 'Ticket category not found',
    statusCode: 404,
  },
  FEEDBACK_NOT_FOUND: {
    code: 'feedback_not_found',
    message: 'Feedback not found',
    statusCode: 404,
  },

  // Conflict errors (409)
  CONFLICT: {
    code: 'conflict',
    message: 'Resource conflict',
    statusCode: 409,
  },
  DUPLICATE_TICKET: {
    code: 'duplicate_ticket',
    message: 'A ticket with this number already exists',
    statusCode: 409,
  },
  INVALID_STATUS_CHANGE: {
    code: 'invalid_status_change',
    message: 'This status transition is not allowed',
    statusCode: 409,
  },

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: {
    code: 'rate_limit_exceeded',
    message: 'You have exceeded the maximum number of requests. Please try again later.',
    statusCode: 429,
  },
  // Server errors (500)
  INTERNAL_SERVER_ERROR: {
    code: 'internal_server_error',
    message: 'An internal server error occurred',
    statusCode: 500,
  },
  DATABASE_ERROR: {
    code: 'database_error',
    message: 'Database operation failed',
    statusCode: 500,
  },
  SERVICE_UNAVAILABLE: {
    code: 'service_unavailable',
    message: 'Service temporarily unavailable',
    statusCode: 503,
  },
} as const

// ============================================
// RESPONSE BUILDERS
// ============================================

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create a paginated response
 */
export function listResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ListResponse<T> {
  const totalPages = Math.ceil(total / limit)

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_previous: page > 1,
    },
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create an error response
 */
export function errorResponse(
  errorDef: (typeof ErrorCodes)[keyof typeof ErrorCodes],
  details?: Record<string, string[]>,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    error: errorDef.code,
    message: errorDef.message,
    details,
    request_id: requestId || generateRequestId(),
    timestamp: new Date().toISOString(),
  }
}

// ============================================
// NEXT RESPONSE BUILDERS
// ============================================

/**
 * Send a success response
 */
export function respondSuccess<T>(
  data: T,
  options?: { status?: number; message?: string }
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    successResponse(data, options?.message),
    { status: options?.status || 200 }
  )
}

/**
 * Send a list response
 */
export function respondList<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status = 200
): NextResponse<ListResponse<T>> {
  return NextResponse.json(
    listResponse(data, page, limit, total),
    { status }
  )
}

/**
 * Send an error response
 */
export function respondError(
  errorDef: (typeof ErrorCodes)[keyof typeof ErrorCodes],
  options?: { details?: Record<string, string[]>; requestId?: string }
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    errorResponse(errorDef, options?.details, options?.requestId),
    { status: errorDef.statusCode }
  )
}

/**
 * Send a validation error response
 */
export function respondValidationError(
  details: Record<string, string[]>,
  requestId?: string
): NextResponse<ErrorResponse> {
  return respondError(
    ErrorCodes.VALIDATION_FAILED,
    { details, requestId }
  )
}

/**
 * Send a 404 response
 */
/**
 * Send a 404 response for not found errors
 */
export function respondNotFound(
  errorCode: typeof ErrorCodes[keyof typeof ErrorCodes] = ErrorCodes.NOT_FOUND,
  requestId?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    errorResponse(
      errorCode,
      undefined,
      requestId
    ),
    { status: 404 }
  )
}

/**
 * Send a 500 response
 */
export function respondServerError(
  error: Error | string,
  requestId?: string
): NextResponse<ErrorResponse> {
  const message = error instanceof Error ? error.message : String(error)
  
  console.error('Server error:', {
    requestId,
    error: message,
    timestamp: new Date().toISOString(),
  })

  return respondError(
    ErrorCodes.INTERNAL_SERVER_ERROR,
    { requestId }
  )
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Format Zod validation errors for response
 */
export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}

  error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(issue.message)
  })

  return formatted
}

/**
 * Extract request ID from headers (if provided)
 */
export function extractRequestId(headers: Headers): string {
  return headers.get('x-request-id') || generateRequestId()
}

/**
 * Create a structured log entry
 */
export function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  requestId: string,
  details?: Record<string, any>
) {
  console.log(JSON.stringify({
    type: 'api_request',
    method,
    path,
    status,
    duration_ms: duration,
    request_id: requestId,
    timestamp: new Date().toISOString(),
    ...details,
  }))
}

/**
 * Create a structured error log entry
 */
export function logError(
  method: string,
  path: string,
  error: Error | string,
  requestId: string,
  details?: Record<string, any>
) {
  console.error(JSON.stringify({
    type: 'api_error',
    method,
    path,
    error: error instanceof Error ? error.message : String(error),
    error_stack: error instanceof Error ? error.stack : undefined,
    request_id: requestId,
    timestamp: new Date().toISOString(),
    ...details,
  }))
}

export default {
  // Error codes
  ErrorCodes,

  // Response builders
  successResponse,
  listResponse,
  errorResponse,

  // Next response builders
  respondSuccess,
  respondList,
  respondError,
  respondValidationError,
  respondNotFound,
  respondServerError,

  // Utilities
  generateRequestId,
  formatZodErrors,
  extractRequestId,
  logRequest,
  logError,
}