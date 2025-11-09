// API: /api/managedata/services/next-id/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get next available ID for service category
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json({ error: 'Category parameter required' }, { status: 400 })
    }

    // Get prefix based on category
    const prefixMap: Record<string, string> = {
      'Immigration': 'IMM',
      'Tax & Revenue': 'TAX',
      'Customs': 'CUS',
      'Civil Registry': 'REG',
      'Property': 'PROP',
      'Health': 'HLT',
      'Tourism': 'TUR',
      'Utilities': 'UTL',
      'Digital': 'DIG',
      'General': 'GEN'
    }

    const prefix = prefixMap[category] || 'SVC'
    const servicePrefix = `SVC-${prefix}`

    // Get highest number for this prefix
    const result = await pool.query(`
      SELECT service_id
      FROM service_master
      WHERE service_id LIKE $1
      ORDER BY service_id DESC
      LIMIT 1
    `, [`${servicePrefix}-%`])

    let nextNumber = 1
    if (result.rows.length > 0) {
      const lastId = result.rows[0].service_id
      const parts = lastId.split('-')
      const lastNumber = parseInt(parts[parts.length - 1])
      nextNumber = lastNumber + 1
    }

    const suggestedId = `${servicePrefix}-${String(nextNumber).padStart(3, '0')}`

    return NextResponse.json({
      suggested_id: suggestedId,
      prefix: servicePrefix,
      next_number: nextNumber,
      category: category
    })
  } catch (error) {
    console.error('Error getting next service ID:', error)
    return NextResponse.json({ error: 'Failed to get next ID' }, { status: 500 })
  }
}