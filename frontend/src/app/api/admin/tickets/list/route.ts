/**
 * Admin Tickets List API
 *
 * GET /api/admin/tickets/list
 *
 * Returns paginated list of tickets with filtering and sorting capabilities
 *
 * Query Parameters:
 *   - entity_id: Filter by assigned entity (optional)
 *   - service_id: Filter by service (optional)
 *   - status: Filter by status code (optional, e.g., "1", "2", "3", "4")
 *   - priority: Filter by priority code (optional, e.g., "URGENT", "HIGH", "MEDIUM", "LOW")
 *   - search: Search in ticket_number, subject, submitter_name, submitter_email (optional)
 *   - sort_by: Column to sort by (default: "created_at")
 *   - sort_order: "asc" or "desc" (default: "desc")
 *   - page: Page number (default: 1)
 *   - limit: Records per page (default: 20, max: 100)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeQuery } from '@/lib/db'
import { getEntityFilter } from '@/lib/entity-filter'

export async function GET(request: NextRequest) {
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
          }
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Apply entity filter for staff users - override entity_id parameter
    const entityFilter = getEntityFilter(session)
    const entityId = entityFilter || searchParams.get('entity_id')
    const serviceId = searchParams.get('service_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Validate sort order
    if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'sort_order must be "asc" or "desc"'
          }
        },
        { status: 400 }
      )
    }

    // Validate sort column
    const allowedSortColumns = [
      'created_at',
      'updated_at',
      'ticket_number',
      'subject',
      'status_id',
      'priority_id'
    ]
    if (!allowedSortColumns.includes(sortBy)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `sort_by must be one of: ${allowedSortColumns.join(', ')}`
          }
        },
        { status: 400 }
      )
    }

    // Build WHERE clause dynamically
    const whereClauses: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1

    if (entityId) {
      whereClauses.push(`t.assigned_entity_id = $${paramIndex}`)
      queryParams.push(entityId)
      paramIndex++
    }

    if (serviceId) {
      whereClauses.push(`t.service_id = $${paramIndex}`)
      queryParams.push(serviceId)
      paramIndex++
    }

    if (status) {
      whereClauses.push(`ts.status_code = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }

    if (priority) {
      whereClauses.push(`UPPER(pl.priority_code) = UPPER($${paramIndex})`)
      queryParams.push(priority)
      paramIndex++
    }

    if (search) {
      whereClauses.push(`(
        t.ticket_number ILIKE $${paramIndex} OR
        t.subject ILIKE $${paramIndex} OR
        t.submitter_name ILIKE $${paramIndex} OR
        t.submitter_email ILIKE $${paramIndex}
      )`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : ''

    // Calculate offset
    const offset = (page - 1) * limit

    // Query 1: Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      LEFT JOIN ticket_status ts ON t.status_id = ts.status_id
      LEFT JOIN priority_levels pl ON t.priority_id = pl.priority_id
      ${whereClause}
    `
    const countResult = await executeQuery(countQuery, queryParams)
    const totalCount = parseInt(countResult.rows[0]?.total || '0')

    // Query 2: Get paginated tickets
    const ticketsQuery = `
      SELECT
        t.ticket_id,
        t.ticket_number,
        t.subject,
        t.description,
        t.submitter_name,
        t.submitter_email,
        t.created_at,
        t.updated_at,
        t.sla_resolution_target,
        ts.status_id,
        ts.status_name,
        ts.status_code,
        ts.color_code as status_color,
        pl.priority_id,
        pl.priority_name,
        pl.priority_code,
        pl.color_code as priority_color,
        sm.service_id,
        sm.service_name,
        em.unique_entity_id as entity_id,
        em.entity_name,
        aem.unique_entity_id as assigned_entity_id,
        aem.entity_name as assigned_entity_name,
        CASE
          WHEN t.sla_resolution_target < NOW() AND ts.is_terminal = false
          THEN true
          ELSE false
        END as is_overdue
      FROM tickets t
      LEFT JOIN ticket_status ts ON t.status_id = ts.status_id
      LEFT JOIN priority_levels pl ON t.priority_id = pl.priority_id
      LEFT JOIN service_master sm ON t.service_id = sm.service_id
      LEFT JOIN entity_master em ON t.entity_id = em.unique_entity_id
      LEFT JOIN entity_master aem ON t.assigned_entity_id = aem.unique_entity_id
      ${whereClause}
      ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const ticketsResult = await executeQuery(ticketsQuery, queryParams)

    // Format response
    const tickets = ticketsResult.rows.map((ticket: any) => ({
      ticket_id: ticket.ticket_id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      description: ticket.description?.substring(0, 200) + (ticket.description?.length > 200 ? '...' : ''),
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
        email: ticket.submitter_email
      },
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      sla_resolution_target: ticket.sla_resolution_target,
      is_overdue: ticket.is_overdue
    }))

    const totalPages = Math.ceil(totalCount / limit)

    const response = {
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        filters: {
          entity_id: entityId,
          service_id: serviceId,
          status,
          priority,
          search
        },
        sort: {
          by: sortBy,
          order: sortOrder
        }
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Tickets list error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch tickets list',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
