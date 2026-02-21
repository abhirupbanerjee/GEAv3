// API: /api/managedata/services/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const {
      service_name,
      entity_id,
      service_category,
      service_description,
      is_active,
      life_events,
      delivery_channel,
      target_consumers
    } = body

    await pool.query(`
      UPDATE service_master
      SET
        service_name = $1,
        entity_id = $2,
        service_category = $3,
        service_description = $4,
        is_active = $5,
        life_events = $6,
        delivery_channel = $7,
        target_consumers = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE service_id = $9
    `, [
      service_name,
      entity_id,
      service_category,
      service_description,
      is_active,
      life_events || [],
      delivery_channel || [],
      target_consumers || [],
      id
    ])

    return NextResponse.json({ success: true, message: 'Service updated' })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}