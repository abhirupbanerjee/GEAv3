/**
 * POST /api/tickets/submit
 *
 * Public endpoint for citizens to submit new tickets
 * Includes rate limiting and feedback integration
 *
 * Rate Limit: 5 submissions per hour per IP
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { 
  SubmitTicketRequestSchema, 
  safeValidate, 
  formatValidationErrors 
} from '@/lib/validation'
import {
  respondSuccess,
  respondError,
  respondValidationError,
  respondServerError,
  ErrorCodes,
  generateRequestId,
  logRequest,
  logError,
} from '@/lib/response'
import {
  checkRateLimit,
  recordAttempt,
  getClientIP,
  hashIP,
} from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface TicketCreationResult {
  ticket_id: string
  ticket_number: string
  status: string
  created_at: string
  service_id: string
  entity_id: string
}

interface ServiceCheckResult {
  service_id: string
  entity_id: string
  is_active: boolean
}

interface CategoryCheckResult {
  category_id: string
}

interface SLAResult {
  sla_id: string
  target_resolution_hours: number
  priority: string
}

interface TicketData {
  service_id: string
  entity_id: string
  subject: string
  description: string
  category: string
  priority?: string
  submitter_email?: string
  submitter_phone?: string
  channel?: string
  qr_code_id?: string
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    // 1. EXTRACT CLIENT IP
    const clientIP = getClientIP(request)
    const ipHash = hashIP(clientIP)

    // 2. CHECK RATE LIMIT
    const rateLimitStatus = await checkRateLimit(ipHash, 'grievance')
    
    if (!rateLimitStatus.allowed) {
      logRequest('POST', '/api/tickets/submit', 429, Date.now() - startTime, requestId, {
        reason: 'rate_limit_exceeded',
        ip: clientIP,
        remaining: rateLimitStatus.remaining,
      })
      return respondError(ErrorCodes.RATE_LIMIT_EXCEEDED, { requestId })
    }
    
    // 3. PARSE AND VALIDATE REQUEST BODY
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      logError('POST', '/api/tickets/submit', 'Invalid JSON', requestId)
      return respondValidationError(
        { body: ['Invalid JSON format'] },
        requestId
      )
    }
    
    // Validate with Zod schema
    const validation = safeValidate(SubmitTicketRequestSchema, body)
    
    if (!validation.success) {
      // Cast to proper type when validation fails
      const errors = formatValidationErrors((validation as any).error)
      logRequest('POST', '/api/tickets/submit', 400, Date.now() - startTime, requestId, {
        reason: 'validation_failed',
        errors: Object.keys(errors),
      })
      return respondValidationError(errors, requestId)
    }
    
    // Cast to proper type when validation succeeds
    const ticketData = (validation as any).data as TicketData

    // 4. VERIFY SERVICE AND ENTITY EXIST
    const serviceCheck = await executeQuery<ServiceCheckResult>(
      `SELECT s.service_id, s.entity_id, s.is_active
       FROM service_master s
       WHERE s.service_id = $1 AND s.is_active = TRUE`,
      [ticketData.service_id]
    )
    
    if (serviceCheck.rows.length === 0) {
      logError('POST', '/api/tickets/submit', `Service not found: ${ticketData.service_id}`, requestId)
      return respondError(ErrorCodes.SERVICE_NOT_FOUND, { requestId })
    }
    
    // Verify entity matches
    const serviceRow = (serviceCheck.rows as ServiceCheckResult[])[0]
    if (!serviceRow || serviceRow.entity_id !== ticketData.entity_id) {
      logError('POST', '/api/tickets/submit', `Entity mismatch for service: ${ticketData.service_id}`, requestId)
      return respondValidationError(
        { entity_id: ['Entity ID does not match service'] },
        requestId
      )
    }
    
    // 6. VERIFY CATEGORY EXISTS
    const categoryCheck = await executeQuery<CategoryCheckResult>(
      `SELECT category_id FROM ticket_categories
      WHERE category_code = $1 AND is_active = TRUE`,
      [ticketData.category]
    )
    
    if (categoryCheck.rows.length === 0) {
      logError('POST', '/api/tickets/submit', `Category not found: ${ticketData.category}`, requestId)
      return respondError(ErrorCodes.CATEGORY_NOT_FOUND, { requestId })
    }
    
    // 7. CREATE TICKET IN DATABASE
    // CORRECT - Get the category_id integer
const categoryRow = (categoryCheck.rows as CategoryCheckResult[])[0]
if (!categoryRow) {
  return respondError(ErrorCodes.CATEGORY_NOT_FOUND, { requestId })
}

// Get the correct status_id for 'Open' status (code '1')
const openStatusResult = await executeQuery(
  `SELECT status_id FROM ticket_status WHERE status_code = '1' AND is_active = TRUE LIMIT 1`
)
const openStatusId = openStatusResult.rows[0]?.status_id || 1

const insertResult = await executeQuery<TicketCreationResult>(
  `INSERT INTO tickets (
    service_id,
    entity_id,
    category_id,
    status_id,
    priority_id,
    subject,
    description,
    submitter_email,
    submitter_phone,
    source,
    created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
  RETURNING
    ticket_id,
    ticket_number,
    status_id,
    created_at,
    service_id,
    entity_id`,
  [
    ticketData.service_id,
    ticketData.entity_id,
    categoryRow.category_id,  // ← CORRECT: integer ID from lookup
    openStatusId,  // status_id for 'Open' (code '1')
    2,  // priority_id for 'MEDIUM' (adjust as needed)
    ticketData.subject,
    ticketData.description,
    ticketData.submitter_email || null,
    ticketData.submitter_phone || null,
    'portal',
  ]
)

    
    if (insertResult.rows.length === 0) {
      logError('POST', '/api/tickets/submit', 'Failed to insert ticket', requestId)
      return respondServerError('Failed to create ticket', requestId)
    }
    
    const ticketResult = (insertResult.rows as TicketCreationResult[])[0]!
    
    // 8. CALCULATE SLA TARGETS
    const slaResult = await executeQuery<SLAResult>(
      `SELECT sla_id, target_resolution_hours, priority
       FROM sla_definitions
       WHERE priority = $1 AND is_active = TRUE
       LIMIT 1`,
      [ticketData.priority || 'medium']
    )
    
    let slaData: {
      target_resolution_time: string | null
      priority: string
      estimated_days: number | null
    } = {
      target_resolution_time: null,
      priority: ticketData.priority || 'medium',
      estimated_days: null,
    }
    
    if (slaResult.rows.length > 0) {
      const sla = (slaResult.rows as SLAResult[])[0]!
      const targetTime = new Date(ticketResult.created_at)
      targetTime.setHours(targetTime.getHours() + sla.target_resolution_hours)
      slaData.target_resolution_time = targetTime.toISOString()
      slaData.estimated_days = Math.ceil(sla.target_resolution_hours / 24)
      
      // Create SLA record
      await executeQuery(
        `INSERT INTO sla_breaches (
          ticket_id,
          sla_id,
          target_resolution_time,
          is_breached,
          created_at
        ) VALUES ($1, $2, $3, FALSE, NOW())`,
        [ticketResult.ticket_id, sla.sla_id, targetTime.toISOString()]
      )
    }
    
    // 9. RECORD ACTIVITY LOG
    await executeQuery(
      `INSERT INTO ticket_activity (
        ticket_id,
        activity_type,
        performed_by,
        description,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [
        ticketResult.ticket_id,
        'ticket_created',
        'system',
        'Ticket created via public portal',
      ]
    )
    
    // 10. RECORD RATE LIMIT ATTEMPT
    await recordAttempt(clientIP, 'ticket_submit', true)
    
    // 11. LOG SUCCESS AND RETURN RESPONSE
    logRequest('POST', '/api/tickets/submit', 201, Date.now() - startTime, requestId, {
      ticket_id: ticketResult.ticket_id,
      ticket_number: ticketResult.ticket_number,
      service_id: ticketData.service_id,
      entity_id: ticketData.entity_id,
    })
    
    return NextResponse.json(
      {
        success: true,
        data: {
          ticket_id: ticketResult.ticket_id,
          ticket_number: ticketResult.ticket_number,
          status: ticketResult.status,
          created_at: ticketResult.created_at,
          service_id: ticketResult.service_id,
          entity_id: ticketResult.entity_id,
        },
        sla: slaData,
        message: `Ticket created successfully. Your ticket number is ${ticketResult.ticket_number}`,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    )
    
  } catch (error) {
    const duration = Date.now() - startTime
    logError('POST', '/api/tickets/submit', error instanceof Error ? error.message : String(error), requestId)
    
    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate')) {
        return respondError(ErrorCodes.DUPLICATE_TICKET, { requestId })
      }
      if (error.message.includes('connection')) {
        return respondError(ErrorCodes.SERVICE_UNAVAILABLE, { requestId })
      }
    }
    
    return respondServerError(error, requestId)
  }
}