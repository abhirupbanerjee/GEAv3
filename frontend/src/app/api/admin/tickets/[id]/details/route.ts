/**
 * Admin Ticket Detail API
 *
 * GET /api/admin/tickets/[id]/details
 *
 * Returns complete ticket information including:
 * - Ticket core data
 * - Attachments
 * - Activity timeline
 * - Related entities and services
 *
 * Path Parameters:
 *   - id: ticket_id (integer)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeQuery } from '@/lib/db'
import { getEntityFilter } from '@/lib/entity-filter'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }

    const ticketId = parseInt(params.id)

    if (isNaN(ticketId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Invalid ticket ID'
          },
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Query 1: Get ticket details with all related lookups
    const ticketQuery = `
      SELECT
        t.ticket_id,
        t.ticket_number,
        t.subject,
        t.description,
        t.submitter_name,
        t.submitter_email,
        t.submitter_phone,
        t.created_at,
        t.updated_at,
        t.resolved_at,
        t.closed_at,
        t.first_response_at,
        t.sla_response_target,
        t.sla_resolution_target,
        t.source,
        t.requester_category,
        ts.status_id,
        ts.status_name,
        ts.status_code,
        ts.color_code as status_color,
        pl.priority_id,
        pl.priority_name,
        pl.priority_code,
        pl.color_code as priority_color,
        tc.category_id,
        tc.category_name,
        tc.category_code,
        sm.service_id,
        sm.service_name,
        em.unique_entity_id as entity_id,
        em.entity_name,
        aem.unique_entity_id as assigned_entity_id,
        aem.entity_name as assigned_entity_name
      FROM tickets t
      LEFT JOIN ticket_status ts ON t.status_id = ts.status_id
      LEFT JOIN priority_levels pl ON t.priority_id = pl.priority_id
      LEFT JOIN ticket_categories tc ON t.category_id = tc.category_id
      LEFT JOIN service_master sm ON t.service_id = sm.service_id
      LEFT JOIN entity_master em ON t.entity_id = em.unique_entity_id
      LEFT JOIN entity_master aem ON t.assigned_entity_id = aem.unique_entity_id
      WHERE t.ticket_id = $1
    `
    const ticketResult = await executeQuery(ticketQuery, [ticketId])

    if (ticketResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Ticket with ID ${ticketId} not found`
          },
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    const ticket = ticketResult.rows[0]

    // Validate entity access for staff users
    const entityFilter = getEntityFilter(session)
    if (entityFilter && ticket.assigned_entity_id !== entityFilter) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this ticket'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }

    // Query 2: Get attachments
    const attachmentsQuery = `
      SELECT
        attachment_id,
        filename,
        mimetype,
        file_size,
        uploaded_by,
        created_at
      FROM ticket_attachments
      WHERE ticket_id = $1
      ORDER BY created_at DESC
    `
    const attachmentsResult = await executeQuery(attachmentsQuery, [ticketId])

    // Query 3: Get activity timeline
    const activityQuery = `
      SELECT
        activity_id,
        activity_type,
        performed_by,
        description,
        created_at
      FROM ticket_activity
      WHERE ticket_id = $1
      ORDER BY created_at DESC
    `
    const activityResult = await executeQuery(activityQuery, [ticketId])

    // Format response
    const response = {
      success: true,
      data: {
        ticket: {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          description: ticket.description,
          status: {
            id: ticket.status_id,
            name: ticket.status_name,
            code: ticket.status_code,
            color: ticket.status_color
          },
          priority: {
            id: ticket.priority_id,
            name: ticket.priority_name,
            code: ticket.priority_code,
            color: ticket.priority_color
          },
          category: ticket.category_id ? {
            id: ticket.category_id,
            name: ticket.category_name,
            code: ticket.category_code
          } : null,
          service: ticket.service_id ? {
            id: ticket.service_id,
            name: ticket.service_name
          } : null,
          entity: ticket.entity_id ? {
            id: ticket.entity_id,
            name: ticket.entity_name
          } : null,
          assigned_entity: ticket.assigned_entity_id ? {
            id: ticket.assigned_entity_id,
            name: ticket.assigned_entity_name
          } : null,
          requester: {
            name: ticket.submitter_name,
            email: ticket.submitter_email,
            phone: ticket.submitter_phone,
            category: ticket.requester_category
          },
          sla: {
            response_target: ticket.sla_response_target,
            resolution_target: ticket.sla_resolution_target,
            first_response_at: ticket.first_response_at
          },
          timestamps: {
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            resolved_at: ticket.resolved_at,
            closed_at: ticket.closed_at
          },
          source: ticket.source
        },
        attachments: attachmentsResult.rows.map((att: any) => ({
          attachment_id: att.attachment_id,
          filename: att.filename,
          mimetype: att.mimetype,
          file_size: att.file_size,
          uploaded_by: att.uploaded_by,
          created_at: att.created_at
        })),
        activities: activityResult.rows.map((act: any) => ({
          activity_id: act.activity_id,
          activity_type: act.activity_type,
          performed_by: act.performed_by,
          description: act.description,
          created_at: act.created_at
        }))
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Ticket detail error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch ticket details',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
