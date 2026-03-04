// API: /api/managedata/lifeevents
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all life events
export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await pool.query(`
      SELECT *
      FROM life_events
      ORDER BY category, sort_order, label
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching life events:', error)
    return NextResponse.json({ error: 'Failed to fetch life events' }, { status: 500 })
  }
}

// POST - Create new life event
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { value, label, description, category, icon, sort_order, is_active } = body

    // Validation
    if (!value || !label || !description || !category) {
      return NextResponse.json({
        error: 'Missing required fields: value, label, description, and category are required'
      }, { status: 400 })
    }

    await pool.query(`
      INSERT INTO life_events
        (value, label, description, category, icon, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [value, label, description, category, icon || null, sort_order || 0, is_active !== false])

    return NextResponse.json({ success: true, message: 'Life event created' })
  } catch (error) {
    console.error('Error creating life event:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Life event value already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create life event' }, { status: 500 })
  }
}
