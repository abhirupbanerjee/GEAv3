/**
 * GEA Portal - Single Document API
 *
 * GET /api/admin/documents/[id] - Get document details
 * PATCH /api/admin/documents/[id] - Update document metadata
 * DELETE /api/admin/documents/[id] - Soft delete document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { rename, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { Document } from '@/types/documents'
import { validateTags } from '@/lib/file-validation'

// Upload root directory
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'documents')

// ============================================================================
// GET - Get document details
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

    // Fetch document with folder info
    const result = await pool.query<Document>(
      `SELECT
        d.id, d.title, d.description, d.file_name, d.stored_file_name, d.file_path,
        d.file_size, d.file_type, d.file_extension, d.folder_id, d.tags, d.visibility,
        d.is_active, d.download_count, d.uploaded_by, d.created_at, d.updated_at,
        f.folder_path, f.name as folder_name
       FROM documents d
       LEFT JOIN doc_folders f ON d.folder_id = f.id
       WHERE d.id = $1 AND d.is_active = true`,
      [parseInt(id, 10)]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const document = result.rows[0]

    // Staff visibility check
    if (session.user.roleType === 'staff' && document.visibility === 'admin_only') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Update document metadata
// ============================================================================

export async function PATCH(
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

    // Parse request body
    const body = await request.json()
    const { title, description, folder_id, tags, visibility } = body

    // Fetch current document
    const currentResult = await pool.query<Document>(
      `SELECT id, title, description, file_path, stored_file_name, folder_id, tags, visibility
       FROM documents WHERE id = $1 AND is_active = true`,
      [parseInt(id, 10)]
    )

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const current = currentResult.rows[0]

    // Build update query
    const updates: string[] = []
    const queryParams: (string | number | string[] | null)[] = []
    let paramIndex = 1

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
      }
      if (title.length > 500) {
        return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 })
      }
      updates.push(`title = $${paramIndex}`)
      queryParams.push(title.trim())
      paramIndex++
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`)
      queryParams.push(description?.trim() || null)
      paramIndex++
    }

    if (tags !== undefined) {
      const tagsValidation = validateTags(tags)
      if (!tagsValidation.valid) {
        return NextResponse.json({ error: tagsValidation.error }, { status: 400 })
      }
      updates.push(`tags = $${paramIndex}`)
      queryParams.push(tags)
      paramIndex++
    }

    if (visibility !== undefined) {
      if (!['all_staff', 'admin_only'].includes(visibility)) {
        return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 })
      }
      updates.push(`visibility = $${paramIndex}`)
      queryParams.push(visibility)
      paramIndex++
    }

    // Handle folder change (requires file move)
    if (folder_id !== undefined && folder_id !== current.folder_id) {
      let newFolderPath = 'unfiled'
      let newFolderId: number | null = null

      if (folder_id !== null) {
        const folderResult = await pool.query<{ id: number; folder_path: string }>(
          'SELECT id, folder_path FROM doc_folders WHERE id = $1 AND is_active = true',
          [folder_id]
        )

        if (folderResult.rows.length === 0) {
          return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
        }

        newFolderId = folderResult.rows[0].id
        newFolderPath = folderResult.rows[0].folder_path
      }

      // Move file on disk
      const currentFilePath = path.join(UPLOAD_ROOT, current.file_path)
      const newDir = path.join(UPLOAD_ROOT, newFolderPath)
      const newFilePath = path.join(newDir, current.stored_file_name)

      if (existsSync(currentFilePath)) {
        // Create new directory if needed
        if (!existsSync(newDir)) {
          await mkdir(newDir, { recursive: true })
        }

        // Move file
        await rename(currentFilePath, newFilePath)
      }

      // Update database
      const newRelativePath = path.join(newFolderPath, current.stored_file_name)
      updates.push(`folder_id = $${paramIndex}`)
      queryParams.push(newFolderId)
      paramIndex++
      updates.push(`file_path = $${paramIndex}`)
      queryParams.push(newRelativePath)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Execute update
    queryParams.push(parseInt(id, 10))
    const updateResult = await pool.query<Document>(
      `UPDATE documents SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, title, description, file_name, stored_file_name, file_path,
         file_size, file_type, file_extension, folder_id, tags, visibility,
         is_active, download_count, uploaded_by, created_at, updated_at`,
      queryParams
    )

    return NextResponse.json({
      success: true,
      document: updateResult.rows[0],
    })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Soft delete document
// ============================================================================

export async function DELETE(
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

    // Soft delete (set is_active = false)
    const result = await pool.query(
      `UPDATE documents SET is_active = false
       WHERE id = $1 AND is_active = true
       RETURNING id`,
      [parseInt(id, 10)]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted',
    })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
