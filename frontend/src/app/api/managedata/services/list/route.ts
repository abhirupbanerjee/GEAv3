/**
 * Services List API with Pagination
 *
 * GET /api/managedata/services/list
 *
 * Returns paginated list of services with filtering and sorting capabilities
 *
 * Query Parameters:
 *   - search: Search in service_name or service_id (optional)
 *   - service_category: Filter by category (optional, e.g., "Immigration", "Tax & Revenue", etc.)
 *   - entity_id: Filter by entity (optional)
 *   - is_active: Filter by active status (optional, "active", "inactive", "all", default: "active")
 *   - sort_by: Column to sort by (default: "service_name")
 *   - sort_order: "asc" or "desc" (default: "asc")
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
    const serviceCategory = searchParams.get('service_category')
    const entityId = searchParams.get('entity_id')
    const isActive = searchParams.get('is_active') || 'active'
    const sortBy = searchParams.get('sort_by') || 'service_name'
    const sortOrder = searchParams.get('sort_order') || 'asc'
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
      'service_id',
      'service_name',
      'entity_name',
      'service_category',
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

    // Entity filter for staff users (they can only see their entity's services)
    if (entityFilter) {
      whereClauses.push(`s.entity_id = $${paramIndex}`)
      queryParams.push(entityFilter)
      paramIndex++
    }

    // Entity ID filter (admin can filter by specific entity)
    if (entityId && entityId !== 'all' && !entityFilter) {
      whereClauses.push(`s.entity_id = $${paramIndex}`)
      queryParams.push(entityId)
      paramIndex++
    }

    // Search filter (search in service name or ID)
    if (search) {
      whereClauses.push(`(
        s.service_name ILIKE $${paramIndex} OR
        s.service_id ILIKE $${paramIndex}
      )`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Service category filter
    if (serviceCategory && serviceCategory !== 'all') {
      whereClauses.push(`s.service_category = $${paramIndex}`)
      queryParams.push(serviceCategory)
      paramIndex++
    }

    // Active status filter
    if (isActive === 'active') {
      whereClauses.push(`s.is_active = true`)
    } else if (isActive === 'inactive') {
      whereClauses.push(`s.is_active = false`)
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
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, queryParams)
    const totalCount = parseInt(countResult.rows[0]?.total || '0')

    // Query 2: Get paginated services
    // Map sort_by for entity_name (it's from joined table)
    const sortColumn = sortBy === 'entity_name' ? 'e.entity_name' : `s.${sortBy}`

    const servicesQuery = `
      SELECT
        s.service_id,
        s.service_name,
        s.entity_id,
        s.service_category,
        s.service_description,
        s.is_active,
        s.created_at,
        s.updated_at,
        e.entity_name
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const servicesResult = await pool.query(servicesQuery, queryParams)

    // Build pagination metadata
    const totalPages = Math.ceil(totalCount / limit)

    const response = {
      success: true,
      data: {
        services: servicesResult.rows,
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
          service_category: serviceCategory,
          entity_id: entityId,
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
    console.error('Services list error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch services list'
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
