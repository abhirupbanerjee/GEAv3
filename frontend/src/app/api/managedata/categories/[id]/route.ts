// API: /api/managedata/categories/[id]
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get single category
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
      FROM service_categories
      WHERE id = $1
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}

// PUT - Update category
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
    const { label, description, sort_order, is_active } = body

    // Validation
    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }

    const result = await pool.query(`
      UPDATE service_categories
      SET
        label = $1,
        description = $2,
        sort_order = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [label, description || null, sort_order || 0, is_active !== false, id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Category updated', data: result.rows[0] })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE - Delete category
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

    // Check if category is in use
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM services
      WHERE service_category = (SELECT value FROM service_categories WHERE id = $1)
    `, [id])

    if (parseInt(checkResult.rows[0].count) > 0) {
      return NextResponse.json({
        error: 'Cannot delete category: it is currently assigned to one or more services'
      }, { status: 409 })
    }

    const result = await pool.query(`
      DELETE FROM service_categories
      WHERE id = $1
      RETURNING *
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Category deleted' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
