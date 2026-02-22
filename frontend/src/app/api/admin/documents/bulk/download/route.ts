/**
 * GEA Portal - Bulk Document Download API
 *
 * POST /api/admin/documents/bulk/download - Download multiple files as ZIP
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { createReadStream, existsSync } from 'fs'
import path from 'path'
import archiver from 'archiver'
import { PassThrough } from 'stream'

// Upload root directory
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'documents')

// ============================================================================
// POST - Download multiple documents as ZIP
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check authorization (admin or staff)
    if (!['admin', 'staff'].includes(session.user.roleType)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { document_ids } = body

    // Validate document_ids
    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({ error: 'document_ids must be a non-empty array' }, { status: 400 })
    }

    if (document_ids.length > 100) {
      return NextResponse.json({ error: 'Cannot download more than 100 documents at once' }, { status: 400 })
    }

    // Build visibility filter based on user role
    const visibilityCondition = session.user.roleType === 'admin'
      ? ''
      : " AND visibility = 'all_staff'"

    // Fetch documents
    const result = await pool.query<{
      id: number
      file_name: string
      file_path: string
      visibility: string
    }>(
      `SELECT id, file_name, file_path, visibility
       FROM documents
       WHERE id = ANY($1::int[]) AND is_active = true${visibilityCondition}`,
      [document_ids]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No accessible documents found' }, { status: 404 })
    }

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 5 } // Compression level (0-9)
    })

    // Track added files to handle duplicates
    const addedFiles = new Set<string>()
    let filesAdded = 0

    // Add files to archive
    for (const doc of result.rows) {
      const filePath = path.join(UPLOAD_ROOT, doc.file_path)

      // Check if file exists
      if (!existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`)
        continue
      }

      // Handle duplicate filenames by adding suffix
      let fileName = doc.file_name
      let counter = 1
      while (addedFiles.has(fileName.toLowerCase())) {
        const ext = path.extname(doc.file_name)
        const base = path.basename(doc.file_name, ext)
        fileName = `${base} (${counter})${ext}`
        counter++
      }
      addedFiles.add(fileName.toLowerCase())

      // Add file to archive
      archive.append(createReadStream(filePath), { name: fileName })
      filesAdded++
    }

    if (filesAdded === 0) {
      return NextResponse.json({ error: 'No files could be added to archive' }, { status: 404 })
    }

    // Create a PassThrough stream to pipe the archive
    const passThrough = new PassThrough()
    archive.pipe(passThrough)

    // Finalize the archive
    archive.finalize()

    // Convert stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        passThrough.on('end', () => {
          controller.close()
        })
        passThrough.on('error', (err) => {
          controller.error(err)
        })
      }
    })

    // Return the ZIP file
    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="documents-${Date.now()}.zip"`,
      },
    })
  } catch (error) {
    console.error('Error creating bulk download:', error)
    return NextResponse.json(
      { error: 'Failed to create download archive' },
      { status: 500 }
    )
  }
}
