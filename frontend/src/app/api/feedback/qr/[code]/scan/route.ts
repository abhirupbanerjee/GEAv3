// frontend/src/app/api/feedback/qr/[code]/scan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST - Increment scan count for QR code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  try {
    await pool.query(`
      UPDATE qr_codes
      SET scan_count = scan_count + 1
      WHERE qr_code_id = $1 AND is_active = TRUE
    `, [code])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error incrementing scan count:', error)
    return NextResponse.json(
      { error: 'Failed to track scan' },
      { status: 500 }
    )
  }
}