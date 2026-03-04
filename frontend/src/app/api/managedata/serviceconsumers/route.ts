// API: /api/managedata/serviceconsumers
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all service consumers
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await pool.query(`
      SELECT *
      FROM service_consumers
      ORDER BY sort_order, label
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching service consumers:', error)
    return NextResponse.json({ error: 'Failed to fetch service consumers' }, { status: 500 })
  }
}

// POST - Create new service consumer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { value, label, description, icon, sort_order, is_active } = body

    if (!value || !label) {
      return NextResponse.json({ error: 'Missing required fields: value and label are required' }, { status: 400 })
    }

    await pool.query(`
      INSERT INTO service_consumers
        (value, label, description, icon, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [value, label, description || null, icon || null, sort_order || 0, is_active !== false])

    return NextResponse.json({ success: true, message: 'Service consumer created' })
  } catch (error) {
    console.error('Error creating service consumer:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Service consumer value already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create service consumer' }, { status: 500 })
  }
}
