// API: /api/managedata/qrcodes
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all QR codes
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        q.*,
        s.service_name,
        e.entity_name
      FROM qr_codes q
      JOIN service_master s ON q.service_id = s.service_id
      JOIN entity_master e ON q.entity_id = e.unique_entity_id
      ORDER BY q.created_at DESC
    `)
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching QR codes:', error)
    return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 })
  }
}

// POST - Create new QR code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qr_code_id, service_id, entity_id, location_name, location_address, location_type, generated_url, notes, is_active } = body

    if (!qr_code_id || !service_id || !entity_id || !location_name || !location_address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await pool.query(`
      INSERT INTO qr_codes 
        (qr_code_id, service_id, entity_id, location_name, location_address, location_type, generated_url, notes, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'system')
    `, [qr_code_id, service_id, entity_id, location_name, location_address, location_type || 'office', generated_url, notes, is_active !== false])

    return NextResponse.json({ success: true, message: 'QR code created' })
  } catch (error: any) {
    console.error('Error creating QR code:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'QR Code ID already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create QR code' }, { status: 500 })
  }
}