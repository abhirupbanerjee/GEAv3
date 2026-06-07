// API: /api/managedata/qrcodes/next-id/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get next available ID for QR code based on service
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const serviceId = searchParams.get('serviceId')

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID parameter required' }, { status: 400 })
    }

    // Extract category prefix from service ID (e.g., SVC-IMM-001 -> IMM)
    const parts = serviceId.split('-')
    const categoryPrefix = parts[1] || 'GEN'

    const qrPrefix = `QR-${categoryPrefix}`

    // Get highest number for this prefix
    const result = await pool.query(`
      SELECT qr_code_id
      FROM qr_codes
      WHERE qr_code_id LIKE $1
      ORDER BY qr_code_id DESC
      LIMIT 1
    `, [`${qrPrefix}-%`])

    let nextNumber = 1
    if (result.rows.length > 0) {
      const lastId = result.rows[0].qr_code_id
      const lastParts = lastId.split('-')
      const lastNumber = parseInt(lastParts[lastParts.length - 1])
      nextNumber = lastNumber + 1
    }

    const suggestedId = `${qrPrefix}-${String(nextNumber).padStart(3, '0')}`

    return NextResponse.json({
      suggested_id: suggestedId,
      prefix: qrPrefix,
      next_number: nextNumber,
      service_id: serviceId
    })
  } catch (error) {
    console.error('Error getting next QR ID:', error)
    return NextResponse.json({ error: 'Failed to get next ID' }, { status: 500 })
  }
}