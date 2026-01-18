/**
 * GEA Ticket System - Zod Validation Schemas (CORRECTED)
 * Version: 1.1 (Fixed Zod API issues)
 * Purpose: Input validation for all ticket endpoints
 * Location: app/lib/schemas/tickets.ts
 */

import { z } from 'zod';

/**
 * ============================================
 * TICKET SUBMISSION SCHEMA (POST /api/tickets/submit)
 * ============================================
 */
export const TicketSubmissionSchema = z.object({
  // Required fields
  service_id: z.string()
    .min(3, 'Service ID required')
    .max(50, 'Service ID too long'),

  entity_id: z.string()
    .min(3, 'Entity ID required')
    .max(50, 'Entity ID too long'),

  subject: z.string()
    .min(10, 'Subject must be at least 10 characters')
    .max(500, 'Subject must be less than 500 characters')
    .trim(),

  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),

  category: z.string()
    .min(1, 'Category required')
    .max(100, 'Category too long'),

  // Optional contact fields
  submitter_email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),

  submitter_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format (E.164 required)')
    .optional()
    .or(z.literal('')),

  // Priority level
  priority: z.enum(['high', 'medium', 'low'])
    .default('medium'),

  // Channel tracking
  channel: z.enum(['portal', 'qr_code', 'walk_in', 'api'])
    .default('portal'),

  // QR code tracking (optional)
  qr_code_id: z.number()
    .positive()
    .optional()
    .nullable(),
});

export type TicketSubmissionInput = z.infer<typeof TicketSubmissionSchema>;

/**
 * ============================================
 * STATUS CHECK SCHEMA (GET /api/tickets/status/:ticket_number)
 * ============================================
 */
export const StatusCheckSchema = z.object({
  ticket_number: z.string()
    .regex(/^\d{6}-\d{6}$/, 'Invalid ticket number format (YYYYMM-XXXXXX required)')
    .length(13, 'Ticket number must be exactly 13 characters'),
});

export type StatusCheckInput = z.infer<typeof StatusCheckSchema>;

/**
 * ============================================
 * CATEGORY LIST SCHEMA (GET /api/tickets/categories)
 * ============================================
 */
export const CategoryListSchema = z.object({
  entity_id: z.string()
    .optional(),
  
  service_id: z.string()
    .optional(),

  active_only: z.boolean()
    .default(true),
});

export type CategoryListInput = z.infer<typeof CategoryListSchema>;

/**
 * ============================================
 * RATE LIMIT CHECK SCHEMA (internal)
 * CORRECTED: Removed .ip() method (doesn't exist in Zod)
 * ============================================
 */
export const RateLimitSchema = z.object({
  ip_address: z.string()
    .refine(
      (ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip),
      'Invalid IP address'
    ),

  endpoint: z.enum(['submit', 'status', 'categories']),

  limit: z.number()
    .positive(),

  window_hours: z.number()
    .positive(),
});

export type RateLimitInput = z.infer<typeof RateLimitSchema>;

/**
 * ============================================
 * RESPONSE SCHEMAS
 * ============================================
 */

// Successful ticket submission response
export const TicketResponseSchema = z.object({
  ticket_id: z.string().uuid(),
  ticket_number: z.string(),
  status: z.string(),
  created_at: z.string().datetime(),
  service_id: z.string(),
  category: z.string(),
});

// Successful status check response
export const StatusResponseSchema = z.object({
  ticket_id: z.string().uuid(),
  ticket_number: z.string(),
  status: z.string(),
  priority: z.string(),
  category: z.string(),
  subject: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  assigned_to: z.string().optional(),
  sla_target: z.string().datetime().optional(),
  sla_status: z.enum(['on_track', 'at_risk', 'breached']).optional(),
});

// Category response
export const CategoryResponseSchema = z.object({
  category_id: z.number(),
  category_code: z.string(),
  category_name: z.string(),
  description: z.string().optional(),
  sla_response_hours: z.number(),
  sla_resolution_hours: z.number(),
});

/**
 * ============================================
 * ERROR RESPONSE SCHEMA
 * ============================================
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime(),
  request_id: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * ============================================
 * VALIDATION HELPER FUNCTIONS (CORRECTED)
 * ============================================
 */

/**
 * Validate ticket submission input
 * @param data Raw input data
 * @returns Validated data or throws ZodError
 */
export function validateTicketSubmission(data: unknown) {
  return TicketSubmissionSchema.parse(data);
}

/**
 * Safe validation (returns result object instead of throwing)
 */
export function safeValidateTicketSubmission(data: unknown) {
  return TicketSubmissionSchema.safeParse(data);
}

/**
 * Validate status check input
 */
export function validateStatusCheck(data: unknown) {
  return StatusCheckSchema.parse(data);
}

/**
 * Validate category list query
 */
export function validateCategoryList(data: unknown) {
  return CategoryListSchema.parse(data);
}

/**
 * CORRECTED: Format Zod validation errors for API response
 * Now uses .flatten() and .issues instead of .errors
 */
export function formatValidationErrors(error: z.ZodError) {
  const formatted: Record<string, string> = {};
  
  // Use .flatten() to get structured field errors
  const flattened = error.flatten();
  
  // Convert field errors to simple key:message format
  Object.entries(flattened.fieldErrors).forEach(([field, messages]) => {
    formatted[field] = messages?.[0] || 'Invalid value';
  });
  
  return formatted;
}

/**
 * Alternative: Safe format function that handles errors gracefully
 */
export function safeFormatValidationErrors(error: unknown): Record<string, string> {
  if (error instanceof z.ZodError) {
    return formatValidationErrors(error);
  }
  
  if (error instanceof Error) {
    return { error: error.message };
  }
  
  return { error: 'Unknown validation error' };
}