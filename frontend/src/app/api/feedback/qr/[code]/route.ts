// frontend/src/app/api/feedback/qr/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Fetch QR code data by code ID
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const result = await pool.query(`
      SELECT 
        q.qr_code_id,
        q.service_id,
        q.entity_id,
        q.location_name,
        q.location_address,
        q.location_type,
        q.scan_count,
        s.service_name,
        e.entity_name
      FROM qr_codes q
      JOIN service_master s ON q.service_id = s.service_id
      JOIN entity_master e ON q.entity_id = e.unique_entity_id
      WHERE q.qr_code_id = $1 AND q.is_active = TRUE
    `, [params.code])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'QR code not found or inactive' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching QR code:', error)
    return NextResponse.json(
      { error: 'Failed to fetch QR code data' },
      { status: 500 }
    )
  }
}