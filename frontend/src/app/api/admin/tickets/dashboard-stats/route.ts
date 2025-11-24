/**
 * Admin Ticket Dashboard Stats API
 *
 * GET /api/admin/tickets/dashboard-stats
 *
 * Returns aggregated statistics for the admin ticket management dashboard:
 * - Total ticket count
 * - Status breakdown (Open, In Progress, Resolved, Closed, etc.)
 * - Priority breakdown (Critical, High, Medium, Low)
 * - Optional entity filtering
 *
 * Query Parameters:
 *   - entity_id: Filter by assigned entity (optional)
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

    // Build WHERE clause for entity filtering
    const whereClause = entityId ? 'WHERE t.assigned_entity_id = $1' : ''
    const queryParams = entityId ? [entityId] : []

    // Query 1: Total tickets
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      ${whereClause}
    `
    const totalResult = await executeQuery(totalQuery, queryParams)
    const totalTickets = parseInt(totalResult.rows[0]?.total || '0')

    // Query 2: Status breakdown
    const statusQuery = `
      SELECT
        ts.status_name,
        ts.status_code,
        ts.color_code,
        COUNT(t.ticket_id) as count
      FROM ticket_status ts
      LEFT JOIN tickets t ON ts.status_id = t.status_id ${entityId ? 'AND t.assigned_entity_id = $1' : ''}
      WHERE ts.is_active = true
      GROUP BY ts.status_id, ts.status_name, ts.status_code, ts.color_code, ts.sort_order
      ORDER BY ts.sort_order
    `
    const statusResult = await executeQuery(statusQuery, queryParams)
    const statusBreakdown = statusResult.rows.reduce((acc: any, row: any) => {
      acc[row.status_code] = {
        name: row.status_name,
        count: parseInt(row.count),
        color: row.color_code
      }
      return acc
    }, {})

    // Query 3: Priority breakdown
    const priorityQuery = `
      SELECT
        pl.priority_name,
        pl.priority_code,
        pl.color_code,
        COUNT(t.ticket_id) as count
      FROM priority_levels pl
      LEFT JOIN tickets t ON pl.priority_id = t.priority_id ${entityId ? 'AND t.assigned_entity_id = $1' : ''}
      WHERE pl.is_active = true
      GROUP BY pl.priority_id, pl.priority_name, pl.priority_code, pl.color_code, pl.sort_order
      ORDER BY pl.sort_order
    `
    const priorityResult = await executeQuery(priorityQuery, queryParams)
    const priorityBreakdown = priorityResult.rows.reduce((acc: any, row: any) => {
      acc[row.priority_code.toLowerCase()] = {
        name: row.priority_name,
        count: parseInt(row.count),
        color: row.color_code
      }
      return acc
    }, {})

    // Query 4: Additional metrics
    const metricsQuery = `
      SELECT
        COUNT(CASE WHEN t.sla_resolution_target < NOW() AND t.status_id NOT IN (
          SELECT status_id FROM ticket_status WHERE is_terminal = true
        ) THEN 1 END) as overdue_count,
        AVG(
          CASE
            WHEN t.resolved_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600
          END
        ) as avg_resolution_hours,
        COUNT(CASE WHEN t.created_at >= CURRENT_DATE THEN 1 END) as today_count,
        COUNT(CASE WHEN t.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_count
      FROM tickets t
      ${whereClause}
    `
    const metricsResult = await executeQuery(metricsQuery, queryParams)
    const metrics = metricsResult.rows[0]

    // Calculate SLA compliance (tickets resolved within target / total resolved)
    const slaQuery = `
      SELECT
        COUNT(CASE WHEN resolved_at <= sla_resolution_target THEN 1 END) as on_time,
        COUNT(*) as total_resolved
      FROM tickets t
      WHERE t.resolved_at IS NOT NULL
      ${entityId ? 'AND t.assigned_entity_id = $1' : ''}
    `
    const slaResult = await executeQuery(slaQuery, queryParams)
    const slaData = slaResult.rows[0]
    const slaCompliance = slaData.total_resolved > 0
      ? ((parseInt(slaData.on_time) / parseInt(slaData.total_resolved)) * 100).toFixed(1)
      : '0.0'

    // Build response
    const response = {
      success: true,
      data: {
        total_tickets: totalTickets,
        status_breakdown: statusBreakdown,
        priority_breakdown: priorityBreakdown,
        metrics: {
          overdue_tickets: parseInt(metrics.overdue_count || '0'),
          avg_resolution_time: metrics.avg_resolution_hours
            ? parseFloat(metrics.avg_resolution_hours).toFixed(1)
            : null,
          sla_compliance: `${slaCompliance}%`,
          today_tickets: parseInt(metrics.today_count || '0'),
          week_tickets: parseInt(metrics.week_count || '0')
        }
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Dashboard stats error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
