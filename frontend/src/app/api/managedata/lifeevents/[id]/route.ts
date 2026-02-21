// API: /api/managedata/lifeevents/[id]
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get single life event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const result = await pool.query(`
      SELECT *
      FROM life_events
      WHERE id = $1
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Life event not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching life event:', error)
    return NextResponse.json({ error: 'Failed to fetch life event' }, { status: 500 })
  }
}

// PUT - Update life event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { label, description, category, icon, sort_order, is_active } = body

    // Validation
    if (!label || !description || !category) {
      return NextResponse.json({
        error: 'Label, description, and category are required'
      }, { status: 400 })
    }

    const result = await pool.query(`
      UPDATE life_events
      SET
        label = $1,
        description = $2,
        category = $3,
        icon = $4,
        sort_order = $5,
        is_active = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [label, description, category, icon || null, sort_order || 0, is_active !== false, id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Life event not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Life event updated', data: result.rows[0] })
  } catch (error) {
    console.error('Error updating life event:', error)
    return NextResponse.json({ error: 'Failed to update life event' }, { status: 500 })
  }
}

// DELETE - Delete life event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Check if life event is in use
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM services
      WHERE $1 = ANY(life_events)
    `, [(await pool.query('SELECT value FROM life_events WHERE id = $1', [id])).rows[0]?.value])

    if (checkResult.rows.length > 0 && parseInt(checkResult.rows[0].count) > 0) {
      return NextResponse.json({
        error: 'Cannot delete life event: it is currently tagged on one or more services'
      }, { status: 409 })
    }

    const result = await pool.query(`
      DELETE FROM life_events
      WHERE id = $1
      RETURNING *
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Life event not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Life event deleted' })
  } catch (error) {
    console.error('Error deleting life event:', error)
    return NextResponse.json({ error: 'Failed to delete life event' }, { status: 500 })
  }
}
