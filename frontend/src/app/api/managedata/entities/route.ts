// API: /api/managedata/entities
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { getEntityFilter } from '@/lib/entity-filter'

export const dynamic = 'force-dynamic'

// GET - List all entities
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedEntityId = searchParams.get('entity_id')

    // Apply entity filter for staff users (for managedata page)
    const entityFilter = getEntityFilter(session)

    // Build WHERE clause based on entity filter
    let whereClause = ''
    const queryParams: any[] = []

    // Priority: requested entity_id param > Staff entity filter
    // Staff can request specific entity (e.g., AGY-005 for service requests) but managedata page uses their own entity
    const finalEntityId = requestedEntityId || entityFilter

    if (finalEntityId) {
      whereClause = 'WHERE e.unique_entity_id = $1'
      queryParams.push(finalEntityId)
    }

    const result = await pool.query(`
      SELECT
        e.*,
        p.entity_name as parent_entity_name
      FROM entity_master e
      LEFT JOIN entity_master p ON e.parent_entity_id = p.unique_entity_id
      ${whereClause}
      ORDER BY e.entity_type, e.entity_name
    `, queryParams)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching entities:', error)
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 })
  }
}

// POST - Create new entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { unique_entity_id, entity_name, entity_type, parent_entity_id, is_active } = body

    // Validation
    if (!unique_entity_id || !entity_name || !entity_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await pool.query(`
      INSERT INTO entity_master 
        (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active)
      VALUES ($1, $2, $3, $4, $5)
    `, [unique_entity_id, entity_name, entity_type, parent_entity_id || null, is_active !== false])

    return NextResponse.json({ success: true, message: 'Entity created' })
  } catch (error: any) {
    console.error('Error creating entity:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Entity ID already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 })
  }
}