// API: /api/managedata/services
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all services
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        e.entity_name
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      ORDER BY s.service_category, s.service_name
    `)
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

// POST - Create new service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { service_id, service_name, entity_id, service_category, service_description, is_active } = body

    if (!service_id || !service_name || !entity_id || !service_category || !service_description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await pool.query(`
      INSERT INTO service_master 
        (service_id, service_name, entity_id, service_category, service_description, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [service_id, service_name, entity_id, service_category, service_description, is_active !== false])

    return NextResponse.json({ success: true, message: 'Service created' })
  } catch (error: any) {
    console.error('Error creating service:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Service ID already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}