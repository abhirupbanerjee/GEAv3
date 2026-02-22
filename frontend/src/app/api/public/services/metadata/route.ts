// API: /api/public/services/metadata
// Returns filtered metadata (life_events, categories) based on active filters
// Supports cascading filters in feedback page

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entity_id = searchParams.get('entity_id')
    const life_event = searchParams.get('life_event')
    const category = searchParams.get('category')

    // If no filters specified, return empty (frontend will use full metadata)
    if (!entity_id && !life_event && !category) {
      return NextResponse.json({
        success: true,
        filters: {
          life_events: [],
          categories: []
        },
        total_services: 0
      })
    }

    // Build dynamic WHERE conditions for life_events query
    // Life events should be filtered by: entity_id, category
    const leConditions: string[] = ['s.is_active = TRUE', 'le.is_active = TRUE']
    const leParams: any[] = []
    let leParamIndex = 1

    if (entity_id) {
      leConditions.push(`s.entity_id = $${leParamIndex}`)
      leParams.push(entity_id)
      leParamIndex++
    }
    if (category) {
      leConditions.push(`s.service_category = $${leParamIndex}`)
      leParams.push(category)
      leParamIndex++
    }

    const lifeEventsQuery = `
      SELECT
        le.value,
        le.label,
        le.description,
        le.category,
        COUNT(DISTINCT s.service_id)::int as service_count
      FROM life_events le
      JOIN service_master s ON le.value = ANY(s.life_events)
      WHERE ${leConditions.join(' AND ')}
      GROUP BY le.value, le.label, le.description, le.category
      ORDER BY service_count DESC, le.label
    `

    // Build dynamic WHERE conditions for categories query
    // Categories should be filtered by: entity_id, life_event
    const catConditions: string[] = ['s.is_active = TRUE', 'sc.is_active = TRUE']
    const catParams: any[] = []
    let catParamIndex = 1

    if (entity_id) {
      catConditions.push(`s.entity_id = $${catParamIndex}`)
      catParams.push(entity_id)
      catParamIndex++
    }
    if (life_event) {
      catConditions.push(`$${catParamIndex} = ANY(s.life_events)`)
      catParams.push(life_event)
      catParamIndex++
    }

    const categoriesQuery = `
      SELECT
        sc.value,
        sc.label,
        sc.description,
        COUNT(DISTINCT s.service_id)::int as service_count
      FROM service_categories sc
      JOIN service_master s ON sc.value = s.service_category
      WHERE ${catConditions.join(' AND ')}
      GROUP BY sc.value, sc.label, sc.description
      ORDER BY service_count DESC, sc.label
    `

    // Build dynamic WHERE conditions for total services query
    const totalConditions: string[] = ['is_active = TRUE']
    const totalParams: any[] = []
    let totalParamIndex = 1

    if (entity_id) {
      totalConditions.push(`entity_id = $${totalParamIndex}`)
      totalParams.push(entity_id)
      totalParamIndex++
    }
    if (life_event) {
      totalConditions.push(`$${totalParamIndex} = ANY(life_events)`)
      totalParams.push(life_event)
      totalParamIndex++
    }
    if (category) {
      totalConditions.push(`service_category = $${totalParamIndex}`)
      totalParams.push(category)
      totalParamIndex++
    }

    const totalServicesQuery = `
      SELECT COUNT(*)::int as count
      FROM service_master
      WHERE ${totalConditions.join(' AND ')}
    `

    // Execute all queries in parallel
    const [lifeEventsResult, categoriesResult, totalServicesResult] = await Promise.all([
      pool.query(lifeEventsQuery, leParams),
      pool.query(categoriesQuery, catParams),
      pool.query(totalServicesQuery, totalParams)
    ])

    return NextResponse.json({
      success: true,
      filters: {
        life_events: lifeEventsResult.rows,
        categories: categoriesResult.rows
      },
      total_services: totalServicesResult.rows[0]?.count || 0,
      filters_applied: {
        entity_id,
        life_event,
        category
      }
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
