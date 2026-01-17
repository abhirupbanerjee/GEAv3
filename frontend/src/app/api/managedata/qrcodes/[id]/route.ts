// API: /api/managedata/qrcodes/[id]/route.ts
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
    const { service_id, entity_id, location_name, location_address, location_type, notes, is_active } = body

    await pool.query(`
      UPDATE qr_codes
      SET
        service_id = $1,
        entity_id = $2,
        location_name = $3,
        location_address = $4,
        location_type = $5,
        notes = $6,
        is_active = $7
      WHERE qr_code_id = $8
    `, [service_id, entity_id, location_name, location_address, location_type, notes, is_active, id])

    return NextResponse.json({ success: true, message: 'QR code updated' })
  } catch (error) {
    console.error('Error updating QR code:', error)
    return NextResponse.json({ error: 'Failed to update QR code' }, { status: 500 })
  }
}