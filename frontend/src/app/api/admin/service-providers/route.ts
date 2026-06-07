/**
 * Service Providers API
 *
 * Manages which entities can receive service requests.
 * Only accessible by admin users.
 *
 * GET  /api/admin/service-providers - List all entities with service provider status
 * PUT  /api/admin/service-providers - Update entity's service provider status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

/**
 * GET /api/admin/service-providers
 * Returns all entities with their is_service_provider status
 * Query params:
 *   - providers_only=true: Only return entities that are service providers
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const providersOnly = searchParams.get('providers_only') === 'true'

    let query: string
    if (providersOnly) {
      // Only return service providers (for public/staff use)
      query = `
        SELECT unique_entity_id, entity_name, entity_type, is_service_provider
        FROM entity_master
        WHERE is_service_provider = TRUE AND is_active = TRUE
        ORDER BY entity_name
      `
    } else {
      // Return all entities with their status (for admin management)
      // Admin only
      if (session.user.roleType !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }

      query = `
        SELECT unique_entity_id, entity_name, entity_type,
               COALESCE(is_service_provider, FALSE) as is_service_provider
        FROM entity_master
        WHERE is_active = TRUE
        ORDER BY is_service_provider DESC, entity_name
      `
    }

    const result = await pool.query(query)

    return NextResponse.json({
      success: true,
      entities: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    console.error('Error fetching service providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service providers' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/service-providers
 * Update an entity's service provider status
 * Body: { entity_id: string, is_service_provider: boolean }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { entity_id, is_service_provider } = body

    if (!entity_id || typeof is_service_provider !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: entity_id and is_service_provider' },
        { status: 400 }
      )
    }

    // Verify entity exists
    const entityCheck = await pool.query(
      'SELECT unique_entity_id, entity_name FROM entity_master WHERE unique_entity_id = $1',
      [entity_id]
    )

    if (entityCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      )
    }

    // Update the service provider status
    await pool.query(
      `UPDATE entity_master
       SET is_service_provider = $1
       WHERE unique_entity_id = $2`,
      [is_service_provider, entity_id]
    )

    const entityName = entityCheck.rows[0].entity_name

    return NextResponse.json({
      success: true,
      message: is_service_provider
        ? `${entityName} is now a service provider`
        : `${entityName} is no longer a service provider`,
      entity: {
        entity_id,
        entity_name: entityName,
        is_service_provider,
      },
    })
  } catch (error) {
    console.error('Error updating service provider:', error)
    return NextResponse.json(
      { error: 'Failed to update service provider status' },
      { status: 500 }
    )
  }
}
