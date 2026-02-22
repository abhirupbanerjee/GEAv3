/**
 * GEA Portal - Bulk Document Restore API
 *
 * POST /api/admin/documents/bulk/restore - Restore multiple documents from trash
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

// ============================================================================
// POST - Bulk restore documents from trash
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check authorization (admin only)
    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { document_ids } = body

    // Validate document_ids
    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({ error: 'document_ids must be a non-empty array' }, { status: 400 })
    }

    if (document_ids.length > 100) {
      return NextResponse.json({ error: 'Cannot restore more than 100 documents at once' }, { status: 400 })
    }

    // Restore documents (set is_active = true, deleted_at = NULL)
    const result = await pool.query(
      `UPDATE documents
       SET is_active = true, deleted_at = NULL
       WHERE id = ANY($1::int[]) AND is_active = false
       RETURNING id`,
      [document_ids]
    )

    return NextResponse.json({
      success: true,
      restored: result.rowCount,
      message: `${result.rowCount} document(s) restored`,
    })
  } catch (error) {
    console.error('Error in bulk restore:', error)
    return NextResponse.json(
      { error: 'Failed to restore documents' },
      { status: 500 }
    )
  }
}
