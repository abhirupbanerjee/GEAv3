// API: /api/managedata/entities/next-id/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get next available ID for entity type
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('type')

    if (!entityType) {
      return NextResponse.json({ error: 'Type parameter required' }, { status: 400 })
    }

    // Get prefix based on type
    const prefixMap: Record<string, string> = {
      'ministry': 'MIN',
      'department': 'DEPT',
      'agency': 'AGY',
      'statutory_body': 'STAT'
    }

    const prefix = prefixMap[entityType]
    if (!prefix) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    // Get highest number for this prefix
    const result = await pool.query(`
      SELECT unique_entity_id
      FROM entity_master
      WHERE unique_entity_id LIKE $1
      ORDER BY unique_entity_id DESC
      LIMIT 1
    `, [`${prefix}-%`])

    let nextNumber = 1
    if (result.rows.length > 0) {
      const lastId = result.rows[0].unique_entity_id
      const lastNumber = parseInt(lastId.split('-')[1])
      nextNumber = lastNumber + 1
    }

    const suggestedId = `${prefix}-${String(nextNumber).padStart(3, '0')}`

    return NextResponse.json({
      suggested_id: suggestedId,
      prefix: prefix,
      next_number: nextNumber,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error getting next ID:', error)
    return NextResponse.json({ error: 'Failed to get next ID' }, { status: 500 })
  }
}