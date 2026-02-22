/**
 * GEA Portal - Document Restore API
 *
 * POST /api/admin/documents/[id]/restore - Restore document from trash
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { Document } from '@/types/documents'

// ============================================================================
// POST - Restore document from trash
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check authorization (admin only)
    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Restore document (set is_active = true, deleted_at = NULL)
    const result = await pool.query<Document>(
      `UPDATE documents SET is_active = true, deleted_at = NULL
       WHERE id = $1 AND is_active = false
       RETURNING id, title, description, file_name, stored_file_name, file_path,
         file_size, file_type, file_extension, folder_id, tags, visibility,
         is_active, download_count, uploaded_by, created_at, updated_at, deleted_at`,
      [parseInt(id, 10)]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found in trash' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document restored',
      document: result.rows[0],
    })
  } catch (error) {
    console.error('Error restoring document:', error)
    return NextResponse.json(
      { error: 'Failed to restore document' },
      { status: 500 }
    )
  }
}
