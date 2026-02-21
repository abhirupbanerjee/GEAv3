// API: /api/public/services
// External public API for querying services, categories, life events, delivery channels, and service consumers
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Query services with various filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Query parameters
    const category = searchParams.get('category')
    const lifeEvent = searchParams.get('life_event')
    const deliveryChannel = searchParams.get('delivery_channel')
    const targetConsumer = searchParams.get('target_consumer')
    const search = searchParams.get('search')
    const entityId = searchParams.get('entity_id')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    // Build WHERE clause dynamically
    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (!includeInactive) {
      conditions.push(`s.is_active = true`)
    }

    if (category) {
      conditions.push(`s.service_category = $${paramIndex}`)
      values.push(category)
      paramIndex++
    }

    if (lifeEvent) {
      conditions.push(`$${paramIndex} = ANY(s.life_events)`)
      values.push(lifeEvent)
      paramIndex++
    }

    if (deliveryChannel) {
      conditions.push(`$${paramIndex} = ANY(s.delivery_channel)`)
      values.push(deliveryChannel)
      paramIndex++
    }

    if (targetConsumer) {
      conditions.push(`$${paramIndex} = ANY(s.target_consumers)`)
      values.push(targetConsumer)
      paramIndex++
    }

    if (search) {
      conditions.push(`(
        s.service_name ILIKE $${paramIndex} OR
        s.service_description ILIKE $${paramIndex} OR
        s.service_id ILIKE $${paramIndex}
      )`)
      values.push(`%${search}%`)
      paramIndex++
    }

    if (entityId) {
      conditions.push(`s.entity_id = $${paramIndex}`)
      values.push(entityId)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT
        s.service_id,
        s.service_name,
        s.service_description,
        s.service_category,
        s.entity_id,
        e.entity_name,
        s.life_events,
        s.delivery_channel,
        s.target_consumers,
        s.is_active,
        s.created_at,
        s.updated_at
      FROM service_master s
      LEFT JOIN entity_master e ON s.entity_id = e.unique_entity_id
      ${whereClause}
      ORDER BY s.service_name
    `

    const result = await pool.query(query, values)

    // Get metadata about categories, life events, etc.
    const metadata = await Promise.all([
      pool.query('SELECT value, label, description FROM service_categories WHERE is_active = true ORDER BY sort_order'),
      pool.query('SELECT value, label, description, category FROM life_events WHERE is_active = true ORDER BY category, sort_order'),
      pool.query('SELECT value, label, description FROM delivery_channels WHERE is_active = true ORDER BY sort_order'),
      pool.query('SELECT value, label, description FROM service_consumers WHERE is_active = true ORDER BY sort_order')
    ])

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      services: result.rows,
      metadata: {
        categories: metadata[0].rows,
        life_events: metadata[1].rows,
        delivery_channels: metadata[2].rows,
        service_consumers: metadata[3].rows
      },
      filters_applied: {
        category,
        life_event: lifeEvent,
        delivery_channel: deliveryChannel,
        target_consumer: targetConsumer,
        search,
        entity_id: entityId,
        include_inactive: includeInactive
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error querying services:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to query services',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
