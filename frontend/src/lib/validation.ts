/**
 * Validation Schemas for Ticket System
 * 
 * Zod-based schemas for input validation across all endpoints
 * Ensures type safety and consistent validation
 */

import { z } from 'zod'

// ============================================
// COMMON SCHEMAS
// ============================================

export const UUIDSchema = z
  .string()
  .uuid('Invalid UUID format')
  .describe('UUID identifier')

export const TicketNumberSchema = z
  .string()
  .regex(/^\d{6}-\d{6}$/, 'Invalid ticket number format (expected: YYYYMM-XXXXXX)')
  .describe('Ticket number in format YYYYMM-XXXXXX')

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .optional()
  .nullable()
  .describe('Valid email address')

export const PhoneSchema = z
  .string()
  .regex(/^\+\d{1,3}[-.\s]?\d{1,14}$/, 'Invalid phone format (E.164)')
  .optional()
  .nullable()
  .describe('Phone in E.164 format')

export const PrioritySchema = z
  .enum(['high', 'medium', 'low'])
  .default('medium')
  .describe('Ticket priority level')

export const StatusSchema = z
  .enum(['open', 'in_progress', 'on_hold', 'resolved', 'closed'])
  .describe('Ticket status')

// ============================================
// PHASE 2: PUBLIC TICKET ENDPOINTS
// ============================================

export const SubmitTicketRequestSchema = z
  .object({
    service_id: z
      .string()
      .min(1, 'Service ID required')
      .max(50)
      .describe('Service identifier'),
    
    entity_id: z
      .string()
      .min(1, 'Entity ID required')
      .max(50)
      .describe('Entity/Ministry identifier'),
    
    channel: z
      .enum(['portal', 'qr_code', 'mobile', 'walk_in'])
      .default('portal')
      .describe('Submission channel'),
    
    subject: z
      .string()
      .min(10, 'Subject must be at least 10 characters')
      .max(500, 'Subject must be less than 500 characters')
      .describe('Ticket subject'),
    
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(5000, 'Description must be less than 5000 characters')
      .describe('Detailed description of issue'),
    
    category: z
      .string()
      .min(1, 'Category required')
      .max(50)
      .describe('Ticket category'),
    
    priority: PrioritySchema.optional(),
    
    submitter_email: EmailSchema,
    
    submitter_phone: PhoneSchema,
    
    attachments: z
      .array(z.string().url())
      .max(5, 'Maximum 5 attachments')
      .optional()
      .default([])
      .describe('Attachment URLs'),
    
    qr_code_id: z
      .string()
      .max(100)
      .optional()
      .nullable()
      .describe('QR code identifier if submitted via QR'),
  })
  .strict()

export type SubmitTicketRequest = z.infer<typeof SubmitTicketRequestSchema>

export const CheckStatusRequestSchema = z
  .object({
    ticket_number: TicketNumberSchema,
  })
  .strict()

export type CheckStatusRequest = z.infer<typeof CheckStatusRequestSchema>

// ============================================
// PHASE 3: ADMIN TICKET ENDPOINTS
// ============================================

export const ListTicketsQuerySchema = z
  .object({
    status: z
      .string()
      .optional()
      .describe('Filter by status (comma-separated)'),
    
    priority: z
      .string()
      .optional()
      .describe('Filter by priority'),
    
    entity_id: z
      .string()
      .optional()
      .describe('Filter by entity'),
    
    assigned_to: UUIDSchema.optional()
      .describe('Filter by assigned user'),
    
    sla_status: z
      .string()
      .optional()
      .describe('Filter by SLA status'),
    
    page: z
      .coerce
      .number()
      .int()
      .min(1, 'Page must be >= 1')
      .default(1)
      .describe('Page number (1-indexed)'),
    
    limit: z
      .coerce
      .number()
      .int()
      .min(1, 'Limit must be >= 1')
      .max(100, 'Limit must be <= 100')
      .default(20)
      .describe('Items per page'),
    
    sort_by: z
      .enum(['created_at', 'updated_at', 'priority', 'status', 'ticket_number'])
      .default('created_at')
      .describe('Field to sort by'),
    
    sort_order: z
      .enum(['asc', 'desc'])
      .default('desc')
      .describe('Sort direction'),
  })
  .strict()

export type ListTicketsQuery = z.infer<typeof ListTicketsQuerySchema>

export const UpdateTicketRequestSchema = z
  .object({
    status: StatusSchema.optional(),
    
    priority: PrioritySchema.optional(),
    
    assigned_to_id: UUIDSchema.optional()
      .nullable()
      .describe('Assign to user UUID'),
    
    category: z
      .string()
      .max(50)
      .optional()
      .describe('Update ticket category'),
    
    internal_note: z
      .string()
      .max(2000)
      .optional()
      .describe('Internal note to add'),
  })
  .strict()
  .refine(
    (obj) => Object.keys(obj).length > 0,
    'At least one field must be provided for update'
  )

export type UpdateTicketRequest = z.infer<typeof UpdateTicketRequestSchema>

export const CloseTicketRequestSchema = z
  .object({
    status: z
      .enum(['resolved', 'closed'])
      .describe('Final status'),
    
    resolution_notes: z
      .string()
      .min(10, 'Resolution notes must be at least 10 characters')
      .max(2000, 'Resolution notes must be less than 2000 characters')
      .describe('How the ticket was resolved'),
    
    resolution_category: z
      .string()
      .max(50)
      .optional()
      .describe('Resolution category'),
  })
  .strict()

export type CloseTicketRequest = z.infer<typeof CloseTicketRequestSchema>

export const AddNoteRequestSchema = z
  .object({
    content: z
      .string()
      .min(5, 'Note must be at least 5 characters')
      .max(2000, 'Note must be less than 2000 characters')
      .describe('Note content'),
    
    is_internal: z
      .boolean()
      .default(true)
      .describe('Whether note is internal only'),
    
    attachments: z
      .array(z.string().url())
      .max(5, 'Maximum 5 attachments')
      .optional()
      .default([])
      .describe('Attachment URLs'),
  })
  .strict()

export type AddNoteRequest = z.infer<typeof AddNoteRequestSchema>

// ============================================
// PHASE 4: INTEGRATION ENDPOINTS
// ============================================

export const CreateFromFeedbackRequestSchema = z
  .object({
    feedback_id: UUIDSchema,
    
    service_id: z
      .string()
      .min(1)
      .max(50),
    
    entity_id: z
      .string()
      .min(1)
      .max(50),
    
    subject: z
      .string()
      .min(10)
      .max(500),
    
    avg_rating: z
      .number()
      .min(1)
      .max(5)
      .describe('Average rating from feedback'),
    
    grievance_flag: z
      .boolean()
      .default(false)
      .describe('Whether feedback flagged as grievance'),
    
    submitter_email: EmailSchema,
  })
  .strict()

export type CreateFromFeedbackRequest = z.infer<typeof CreateFromFeedbackRequestSchema>

export const LinkFeedbackRequestSchema = z
  .object({
    feedback_id: UUIDSchema,
  })
  .strict()

export type LinkFeedbackRequest = z.infer<typeof LinkFeedbackRequestSchema>

// ============================================
// PHASE 5: ANALYTICS ENDPOINTS
// ============================================

export const SLADashboardQuerySchema = z
  .object({
    entity_id: z
      .string()
      .optional()
      .describe('Filter by entity'),
    
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      .optional()
      .describe('Start date filter'),
    
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      .optional()
      .describe('End date filter'),
  })
  .strict()

export type SLADashboardQuery = z.infer<typeof SLADashboardQuerySchema>

export const ServicePerformanceQuerySchema = z
  .object({
    service_id: z
      .string()
      .optional(),
    
    entity_id: z
      .string()
      .optional(),
    
    time_period: z
      .enum(['week', 'month', 'quarter'])
      .default('month')
      .describe('Aggregation period'),
  })
  .strict()

export type ServicePerformanceQuery = z.infer<typeof ServicePerformanceQuerySchema>

export const VolumeTrendQuerySchema = z
  .object({
    period: z
      .enum(['daily', 'weekly', 'monthly'])
      .default('daily')
      .describe('Aggregation period'),
    
    days: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(365)
      .default(30)
      .describe('Number of days to include'),
  })
  .strict()

export type VolumeTrendQuery = z.infer<typeof VolumeTrendQuerySchema>

// ============================================
// VALIDATION HELPER FUNCTIONS
// ============================================

/**
 * Safely parse request body with schema
 * Returns { success: true, data: ... } or { success: false, error: ... }
 */
export function safeValidate<T>(
  schema: z.ZodSchema,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const parsed = schema.parse(data) as T
    return { success: true, data: parsed }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error }
    }
    throw error
  }
}

/**
 * Format Zod validation errors for API response
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
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

export default {
  // Common
  UUIDSchema,
  TicketNumberSchema,
  EmailSchema,
  PhoneSchema,
  PrioritySchema,
  StatusSchema,

  // Phase 2
  SubmitTicketRequestSchema,
  CheckStatusRequestSchema,

  // Phase 3
  ListTicketsQuerySchema,
  UpdateTicketRequestSchema,
  CloseTicketRequestSchema,
  AddNoteRequestSchema,

  // Phase 4
  CreateFromFeedbackRequestSchema,
  LinkFeedbackRequestSchema,

  // Phase 5
  SLADashboardQuerySchema,
  ServicePerformanceQuerySchema,
  VolumeTrendQuerySchema,

  // Helpers
  safeValidate,
  formatValidationErrors,
}