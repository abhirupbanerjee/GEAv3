/**
 * GEA Portal - Document Download API
 *
 * GET /api/admin/documents/[id]/download - Download a document
 *
 * Security:
 * - Requires authentication
 * - Staff can only download 'all_staff' visibility documents
 * - Increments download counter
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Upload root directory
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'documents')

// ============================================================================
// GET - Download document file
// ============================================================================

export async function GET(
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

    // Check authorization (admin or staff)
    if (!['admin', 'staff'].includes(session.user.roleType)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch document from database (NOT from request params - security)
    const result = await pool.query<{
      id: number
      file_name: string
      file_path: string
      file_type: string
      file_size: number
      visibility: string
    }>(
      `SELECT id, file_name, file_path, file_type, file_size, visibility
       FROM documents
       WHERE id = $1 AND is_active = true`,
      [parseInt(id, 10)]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const document = result.rows[0]

    // Visibility check for staff users
    if (session.user.roleType === 'staff' && document.visibility === 'admin_only') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build full file path (path from DB is trusted)
    const filePath = path.join(UPLOAD_ROOT, document.file_path)

    // Security: Validate path is within upload root (defense in depth)
    const normalizedPath = path.normalize(filePath)
    if (!normalizedPath.startsWith(UPLOAD_ROOT)) {
      console.error('Path traversal attempt detected:', filePath)
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 })
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error('File not found on disk:', filePath)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(filePath)

    // Increment download count (fire and forget)
    pool.query(
      'UPDATE documents SET download_count = download_count + 1 WHERE id = $1',
      [parseInt(id, 10)]
    ).catch((err) => {
      console.error('Failed to increment download count:', err)
    })

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': document.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(document.file_name)}"`,
        'Content-Length': document.file_size.toString(),
        // Prevent caching of downloaded files
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error downloading document:', error)
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    )
  }
}
