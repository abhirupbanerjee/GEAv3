/**
 * Entities List API with Pagination
 *
 * GET /api/managedata/entities/list
 *
 * Returns paginated list of entities with filtering and sorting capabilities
 *
 * Query Parameters:
 *   - search: Search in entity_name or unique_entity_id (optional)
 *   - entity_type: Filter by entity type (optional, e.g., "ministry", "department", "agency", "statutory_body")
 *   - is_active: Filter by active status (optional, "active", "inactive", "all", default: "active")
 *   - sort_by: Column to sort by (default: "entity_type")
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
    const entityType = searchParams.get('entity_type')
    const isActive = searchParams.get('is_active') || 'active'
    const sortBy = searchParams.get('sort_by') || 'entity_type'
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
      'unique_entity_id',
      'entity_name',
      'entity_type',
      'parent_entity_name',
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

    // Entity filter for staff users (they can only see their entity)
    if (entityFilter) {
      whereClauses.push(`e.unique_entity_id = $${paramIndex}`)
      queryParams.push(entityFilter)
      paramIndex++
    }

    // Search filter (search in entity name or ID)
    if (search) {
      whereClauses.push(`(
        e.entity_name ILIKE $${paramIndex} OR
        e.unique_entity_id ILIKE $${paramIndex}
      )`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Entity type filter
    if (entityType && entityType !== 'all') {
      whereClauses.push(`e.entity_type = $${paramIndex}`)
      queryParams.push(entityType)
      paramIndex++
    }

    // Active status filter
    if (isActive === 'active') {
      whereClauses.push(`e.is_active = true`)
    } else if (isActive === 'inactive') {
      whereClauses.push(`e.is_active = false`)
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
      FROM entity_master e
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, queryParams)
    const totalCount = parseInt(countResult.rows[0]?.total || '0')

    // Query 2: Get paginated entities
    // Map sort_by for parent_entity_name (it's from joined table)
    const sortColumn = sortBy === 'parent_entity_name' ? 'p.entity_name' : `e.${sortBy}`

    const entitiesQuery = `
      SELECT
        e.unique_entity_id,
        e.entity_name,
        e.entity_type,
        e.parent_entity_id,
        e.is_active,
        e.created_at,
        e.updated_at,
        p.entity_name as parent_entity_name
      FROM entity_master e
      LEFT JOIN entity_master p ON e.parent_entity_id = p.unique_entity_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    queryParams.push(limit, offset)

    const entitiesResult = await pool.query(entitiesQuery, queryParams)

    // Build pagination metadata
    const totalPages = Math.ceil(totalCount / limit)

    const response = {
      success: true,
      data: {
        entities: entitiesResult.rows,
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
          entity_type: entityType,
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
    console.error('Entities list error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch entities list'
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
