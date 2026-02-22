// API: /api/public/services/metadata
// Returns filtered metadata (life_events, categories) for specific entity
// Supports cascading filters in feedback page

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entity_id = searchParams.get('entity_id')

    // If no entity_id specified, return empty (frontend will use full metadata)
    if (!entity_id) {
      return NextResponse.json({
        success: true,
        filters: {
          life_events: [],
          categories: []
        },
        total_services: 0
      })
    }

    // Get distinct life_events for this entity with service counts
    const lifeEventsQuery = `
      SELECT
        le.value,
        le.label,
        le.description,
        le.category,
        COUNT(DISTINCT s.service_id)::int as service_count
      FROM life_events le
      JOIN service_master s ON le.value = ANY(s.life_events)
      WHERE
        s.entity_id = $1
        AND s.is_active = TRUE
        AND le.is_active = TRUE
      GROUP BY le.value, le.label, le.description, le.category
      ORDER BY service_count DESC, le.label
    `

    // Get distinct categories for this entity with service counts
    const categoriesQuery = `
      SELECT
        sc.value,
        sc.label,
        sc.description,
        COUNT(DISTINCT s.service_id)::int as service_count
      FROM service_categories sc
      JOIN service_master s ON sc.value = s.service_category
      WHERE
        s.entity_id = $1
        AND s.is_active = TRUE
        AND sc.is_active = TRUE
      GROUP BY sc.value, sc.label, sc.description
      ORDER BY service_count DESC, sc.label
    `

    // Get total services for this entity
    const totalServicesQuery = `
      SELECT COUNT(*)::int as count
      FROM service_master
      WHERE entity_id = $1 AND is_active = TRUE
    `

    // Execute all queries in parallel
    const [lifeEventsResult, categoriesResult, totalServicesResult] = await Promise.all([
      pool.query(lifeEventsQuery, [entity_id]),
      pool.query(categoriesQuery, [entity_id]),
      pool.query(totalServicesQuery, [entity_id])
    ])

    return NextResponse.json({
      success: true,
      filters: {
        life_events: lifeEventsResult.rows,
        categories: categoriesResult.rows
      },
      total_services: totalServicesResult.rows[0]?.count || 0,
      entity_id: entity_id
    })
  } catch (error) {
    console.error('Error fetching metadata:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch metadata',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
