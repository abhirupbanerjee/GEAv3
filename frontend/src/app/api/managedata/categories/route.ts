// API: /api/managedata/categories
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all categories
export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await pool.query(`
      SELECT *
      FROM service_categories
      ORDER BY sort_order, label
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST - Create new category
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
    const { value, label, description, sort_order, is_active } = body

    // Validation
    if (!value || !label) {
      return NextResponse.json({ error: 'Missing required fields: value and label are required' }, { status: 400 })
    }

    await pool.query(`
      INSERT INTO service_categories
        (value, label, description, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5)
    `, [value, label, description || null, sort_order || 0, is_active !== false])

    return NextResponse.json({ success: true, message: 'Category created' })
  } catch (error) {
    console.error('Error creating category:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Category value already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
