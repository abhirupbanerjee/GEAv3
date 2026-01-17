/**
 * GET /api/tickets/status/:ticket_number
 * 
 * Public endpoint for citizens to check their ticket status
 * Uses ticket number (e.g., 202511-000042)
 * 
 * Rate Limit: 10 checks per hour per IP
 * No authentication required
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import {
  respondSuccess,
  respondError,
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

interface TicketStatusResult {
  ticket_id: string
  ticket_number: string
  status: string
  priority: string
  category_id: string
  subject: string
  created_at: string
  updated_at: string
  assigned_to: string | null
  service_id: string
  entity_id: string
  sla_target: string | null
}

interface ActivityResult {
  activity_id: string
  timestamp: string
  status: string
  message: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticket_number: string }> }
) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  const { ticket_number: ticketNumber } = await params

  try {
    
    // 1. VALIDATE TICKET NUMBER FORMAT
    const ticketNumberRegex = /^\d{6}-\d{6}$/
    if (!ticketNumberRegex.test(ticketNumber)) {
      logRequest('GET', `/api/tickets/status/${ticketNumber}`, 400, Date.now() - startTime, requestId, {
        reason: 'invalid_format',
      })
      return respondError(ErrorCodes.INVALID_TICKET_NUMBER, { requestId })
    }
    
    // 2. EXTRACT CLIENT IP AND CHECK RATE LIMIT
    const clientIP = getClientIP(request)
    const ipHash = hashIP(clientIP)
    const rateLimitStatus = await checkRateLimit(ipHash, 'feedback')
    
    if (!rateLimitStatus.allowed) {
      logRequest('GET', `/api/tickets/status/${ticketNumber}`, 429, Date.now() - startTime, requestId, {
        reason: 'rate_limit_exceeded',
      })
      return respondError(ErrorCodes.RATE_LIMIT_EXCEEDED, { requestId })
    }
    
    // 3. FETCH TICKET DETAILS
    const ticketResult = await executeQuery<TicketStatusResult>(
      `SELECT 
        t.ticket_id,
        t.ticket_number,
        t.status,
        t.priority,
        t.category_id,
        t.subject,
        t.created_at,
        t.updated_at,
        t.assigned_to,
        t.service_id,
        t.entity_id,
        sb.target_resolution_time as sla_target
       FROM tickets t
       LEFT JOIN sla_breaches sb ON t.ticket_id = sb.ticket_id
       WHERE t.ticket_number = $1`,
      [ticketNumber]
    )
    
    if (ticketResult.rows.length === 0) {
      await recordAttempt(clientIP, 'ticket_status', false)
      logRequest('GET', `/api/tickets/status/${ticketNumber}`, 404, Date.now() - startTime, requestId, {
        reason: 'ticket_not_found',
      })
      return respondError(ErrorCodes.TICKET_NOT_FOUND, { requestId })
    }
    
    const ticket = ticketResult.rows[0]
    
    // 4. FETCH ACTIVITY HISTORY (Last 10 activities)
    const activitiesResult = await executeQuery<ActivityResult>(
      `SELECT 
        activity_id,
        created_at as timestamp,
        activity_type as status,
        description as message
       FROM ticket_activity
       WHERE ticket_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [ticket.ticket_id]
    )
    
    // 5. CALCULATE SLA STATUS
    let slaStatus = 'on_track'
    let hoursRemaining = null
    
    if (ticket.sla_target) {
      const targetTime = new Date(ticket.sla_target)
      const now = new Date()
      const hoursLeft = (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      hoursRemaining = Math.max(0, Math.round(hoursLeft))
      
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        slaStatus = 'resolved'
      } else if (hoursLeft < 0) {
        slaStatus = 'breached'
      } else if (hoursLeft < 4) {
        slaStatus = 'at_risk'
      }
    }
    
    // 6. RECORD SUCCESSFUL ATTEMPT AND LOG
    await recordAttempt(clientIP, 'ticket_status', true)
    
    logRequest('GET', `/api/tickets/status/${ticketNumber}`, 200, Date.now() - startTime, requestId, {
      ticket_id: ticket.ticket_id,
      status: ticket.status,
    })
    
    // 7. RETURN RESPONSE
    return respondSuccess(
      {
        ticket: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category_id,
          subject: ticket.subject,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          assigned_to: ticket.assigned_to,
          service_id: ticket.service_id,
          entity_id: ticket.entity_id,
        },
        sla: {
          target_resolution: ticket.sla_target,
          status: slaStatus,
          hours_remaining: hoursRemaining,
        },
        updates: activitiesResult.rows.map(activity => ({
          timestamp: activity.timestamp,
          status: activity.status,
          message: activity.message,
        })),
      },
      { status: 200, message: 'Ticket found' }
    )
    
  } catch (error) {
    const duration = Date.now() - startTime
    logError('GET', `/api/tickets/status/${ticketNumber}`, error instanceof Error ? error.message : String(error), requestId)
    return respondServerError(error, requestId)
  }
}