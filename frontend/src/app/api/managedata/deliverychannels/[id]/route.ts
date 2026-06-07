// API: /api/managedata/deliverychannels/[id]
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get single delivery channel
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
      FROM delivery_channels
      WHERE id = $1
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Delivery channel not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching delivery channel:', error)
    return NextResponse.json({ error: 'Failed to fetch delivery channel' }, { status: 500 })
  }
}

// PUT - Update delivery channel
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
    const { label, description, icon, sort_order, is_active } = body

    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }

    const result = await pool.query(`
      UPDATE delivery_channels
      SET
        label = $1,
        description = $2,
        icon = $3,
        sort_order = $4,
        is_active = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [label, description || null, icon || null, sort_order || 0, is_active !== false, id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Delivery channel not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Delivery channel updated', data: result.rows[0] })
  } catch (error) {
    console.error('Error updating delivery channel:', error)
    return NextResponse.json({ error: 'Failed to update delivery channel' }, { status: 500 })
  }
}

// DELETE - Delete delivery channel
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

    const result = await pool.query(`
      DELETE FROM delivery_channels
      WHERE id = $1
      RETURNING *
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Delivery channel not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Delivery channel deleted' })
  } catch (error) {
    console.error('Error deleting delivery channel:', error)
    return NextResponse.json({ error: 'Failed to delete delivery channel' }, { status: 500 })
  }
}
