// API: /api/managedata/entities
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all entities
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        p.entity_name as parent_entity_name
      FROM entity_master e
      LEFT JOIN entity_master p ON e.parent_entity_id = p.unique_entity_id
      ORDER BY e.entity_type, e.entity_name
    `)
    
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