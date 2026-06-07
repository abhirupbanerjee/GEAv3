// Public API for fetching service details by ID
// Used by QR code feedback flow (no authentication required)
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Fetch service by ID (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const result = await pool.query(`
      SELECT
        s.service_id,
        s.service_name,
        s.service_description,
        s.service_category,
        s.entity_id,
        e.entity_name,
        e.entity_type
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      WHERE s.service_id = $1
        AND s.is_active = TRUE
        AND e.is_active = TRUE
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    )
  }
}
