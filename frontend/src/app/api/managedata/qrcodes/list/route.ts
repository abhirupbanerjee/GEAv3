/**
 * QR Codes List API with Pagination
 *
 * GET /api/managedata/qrcodes/list
 *
 * Returns paginated list of QR codes with filtering and sorting capabilities
 *
 * Query Parameters:
 *   - search: Search in location_name or qr_code_id (optional)
 *   - is_active: Filter by active status (optional, "active", "inactive", "all", default: "active")
 *   - sort_by: Column to sort by (default: "created_at")
 *   - sort_order: "asc" or "desc" (default: "desc")
 *   - page: Page number (default: 1)
 *   - limit: Records per page (default: 20, max: 100)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { getEntityFilter } from '@/lib/entity-filter'

export const dynamic = 'force-dynamic'

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

    // Parse query parameters
    const search = searchParams.get('search')
    const isActive = searchParams.get('is_active') || 'active'
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
      'qr_code_id',
      'location_name',
      'location_type',
      'service_name',
      'created_at',
      'is_active'
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

    // Apply entity filter for staff users
    const entityFilter = getEntityFilter(session)

    // Build WHERE clause dynamically
    const whereClauses: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1

    // Entity filter for staff users (they can only see their entity's QR codes)
    if (entityFilter) {
      whereClauses.push(`q.entity_id = $${paramIndex}`)
      queryParams.push(entityFilter)
      paramIndex++
    }

    // Search filter (search in location name or QR code ID)
    if (search) {
      whereClauses.push(`(
        q.location_name ILIKE $${paramIndex} OR
        q.qr_code_id ILIKE $${paramIndex}
      )`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Active status filter
    if (isActive === 'active') {
      whereClauses.push(`q.is_active = true`)
    } else if (isActive === 'inactive') {
      whereClauses.push(`q.is_active = false`)
    }
    // If isActive === 'all', don't add any filter

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : ''

    // Calculate offset
    const offset = (page - 1) * limit

    // Query 1: Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM qr_codes q
      JOIN service_master s ON q.service_id = s.service_id
      JOIN entity_master e ON q.entity_id = e.unique_entity_id
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, queryParams)
    const totalCount = parseInt(countResult.rows[0]?.total || '0')

    // Query 2: Get paginated QR codes
    // Map sort_by for service_name (it's from joined table)
    const sortColumn = sortBy === 'service_name' ? 's.service_name' : `q.${sortBy}`

    const qrCodesQuery = `
      SELECT
        q.qr_code_id,
        q.service_id,
        q.entity_id,
        q.location_name,
        q.location_address,
        q.location_type,
        q.generated_url,
        q.scan_count,
        q.is_active,
        q.notes,
        q.created_at,
        q.updated_at,
        s.service_name,
        e.entity_name
      FROM qr_codes q
      JOIN service_master s ON q.service_id = s.service_id
      JOIN entity_master e ON q.entity_id = e.unique_entity_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const qrCodesResult = await pool.query(qrCodesQuery, queryParams)

    // Build pagination metadata
    const totalPages = Math.ceil(totalCount / limit)

    const response = {
      success: true,
      data: {
        qrcodes: qrCodesResult.rows,
        pagination: {
          page,
          limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        filters: {
          search,
          is_active: isActive
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
    console.error('QR codes list error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch QR codes list'
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
