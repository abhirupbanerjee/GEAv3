// API: /api/managedata/entities/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PUT - Update entity
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { entity_name, entity_type, parent_entity_id, is_active } = body

    await pool.query(`
      UPDATE entity_master
      SET 
        entity_name = $1,
        entity_type = $2,
        parent_entity_id = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE unique_entity_id = $5
    `, [entity_name, entity_type, parent_entity_id || null, is_active, params.id])

    return NextResponse.json({ success: true, message: 'Entity updated' })
  } catch (error) {
    console.error('Error updating entity:', error)
    return NextResponse.json({ error: 'Failed to update entity' }, { status: 500 })
  }
}