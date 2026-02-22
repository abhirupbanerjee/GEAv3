/**
 * GEA Portal - Single Folder API
 *
 * PATCH /api/admin/documents/folders/[id] - Rename and/or move folder
 * DELETE /api/admin/documents/folders/[id] - Delete folder (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { rename, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { DocFolder } from '@/types/documents'
import { validateFolderName } from '@/lib/file-validation'

// Upload root directory
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'documents')

// ============================================================================
// HELPER: Get all descendant folder IDs
// ============================================================================

async function getDescendantFolderIds(folderId: number, folderPath: string): Promise<number[]> {
  const result = await pool.query<{ id: number }>(
    `SELECT id FROM doc_folders
     WHERE folder_path LIKE $1 AND id != $2 AND is_active = true`,
    [`${folderPath}/%`, folderId]
  )
  return result.rows.map(r => r.id)
}

// ============================================================================
// PATCH - Rename and/or move folder
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
    const { name, parent_id: newParentId } = body as {
      name: string
      parent_id?: number | null
    }

    // Validate new name
    const nameValidation = validateFolderName(name)
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 })
    }

    const folderId = parseInt(id, 10)

    // Get current folder info
    const currentResult = await pool.query<DocFolder>(
      `SELECT id, name, parent_id, folder_path, level
       FROM doc_folders WHERE id = $1 AND is_active = true`,
      [folderId]
    )

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const current = currentResult.rows[0]
    const newName = name.trim()

    // Determine if we're moving the folder
    const isMoving = newParentId !== undefined && newParentId !== current.parent_id
    const isRenaming = newName !== current.name

    // If nothing changed, return early
    if (!isMoving && !isRenaming) {
      return NextResponse.json({ success: true, folder: current })
    }

    // If moving, validate the new parent
    let newParentPath: string | null = null
    let newLevel = 1

    if (isMoving) {
      if (newParentId !== null) {
        // Check that new parent exists
        const parentResult = await pool.query<DocFolder>(
          `SELECT id, folder_path, level FROM doc_folders
           WHERE id = $1 AND is_active = true`,
          [newParentId]
        )

        if (parentResult.rows.length === 0) {
          return NextResponse.json({ error: 'New parent folder not found' }, { status: 404 })
        }

        const newParent = parentResult.rows[0]
        newParentPath = newParent.folder_path
        newLevel = newParent.level + 1

        // Check that new parent is not a descendant of the folder being moved
        const descendantIds = await getDescendantFolderIds(folderId, current.folder_path)
        if (descendantIds.includes(newParentId) || newParentId === folderId) {
          return NextResponse.json(
            { error: 'Cannot move a folder into itself or its descendant' },
            { status: 400 }
          )
        }

        // Check that move won't exceed max depth of 3
        // Find the deepest child level of the folder being moved
        const deepestChildResult = await pool.query<{ max_level: number }>(
          `SELECT COALESCE(MAX(level), $1) as max_level
           FROM doc_folders
           WHERE folder_path LIKE $2 AND is_active = true`,
          [current.level, `${current.folder_path}/%`]
        )
        const deepestChildLevel = deepestChildResult.rows[0].max_level
        const childDepth = deepestChildLevel - current.level

        if (newLevel + childDepth > 3) {
          return NextResponse.json(
            { error: 'Moving to this location would exceed the maximum folder depth of 3 levels' },
            { status: 400 }
          )
        }
      }
      // If newParentId is null, it's moving to root level
    }

    // Calculate new folder path
    let newFolderPath: string
    const targetParentId = isMoving ? newParentId : current.parent_id

    if (targetParentId === null) {
      newFolderPath = newName
      newLevel = 1
    } else {
      // Get parent folder path (if not already fetched)
      if (newParentPath === null) {
        const parentResult = await pool.query<{ folder_path: string; level: number }>(
          'SELECT folder_path, level FROM doc_folders WHERE id = $1',
          [targetParentId]
        )
        if (parentResult.rows.length === 0) {
          return NextResponse.json({ error: 'Parent folder not found' }, { status: 500 })
        }
        newParentPath = parentResult.rows[0].folder_path
        newLevel = parentResult.rows[0].level + 1
      }
      newFolderPath = `${newParentPath}/${newName}`
    }

    // Check if new path already exists (different folder with same path)
    const existingResult = await pool.query(
      'SELECT id FROM doc_folders WHERE folder_path = $1 AND id != $2 AND is_active = true',
      [newFolderPath, folderId]
    )
    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 409 }
      )
    }

    const oldFolderPath = current.folder_path
    const levelDiff = newLevel - current.level

    // Move folder on disk if it exists
    const oldDiskPath = path.join(UPLOAD_ROOT, oldFolderPath)
    const newDiskPath = path.join(UPLOAD_ROOT, newFolderPath)

    if (existsSync(oldDiskPath)) {
      // Create parent directory if needed
      const parentDir = path.dirname(newDiskPath)
      if (!existsSync(parentDir)) {
        await mkdir(parentDir, { recursive: true })
      }
      await rename(oldDiskPath, newDiskPath)
    }

    // Update folder in database
    await pool.query(
      `UPDATE doc_folders
       SET name = $1, folder_path = $2, parent_id = $3, level = $4
       WHERE id = $5`,
      [newName, newFolderPath, targetParentId, newLevel, folderId]
    )

    // Update all child folder paths and levels (recursive update)
    if (oldFolderPath !== newFolderPath || levelDiff !== 0) {
      await pool.query(
        `UPDATE doc_folders
         SET folder_path = $1 || SUBSTRING(folder_path FROM $2),
             level = level + $3
         WHERE folder_path LIKE $4 AND id != $5`,
        [newFolderPath, oldFolderPath.length + 1, levelDiff, `${oldFolderPath}/%`, folderId]
      )
    }

    // Update all document file paths in this folder and subfolders
    if (oldFolderPath !== newFolderPath) {
      // Documents directly in the moved folder
      await pool.query(
        `UPDATE documents
         SET file_path = $1 || SUBSTRING(file_path FROM $2)
         WHERE file_path LIKE $3`,
        [newFolderPath, oldFolderPath.length + 1, `${oldFolderPath}/%`]
      )
    }

    // Get updated folder
    const updatedResult = await pool.query<DocFolder>(
      `SELECT id, name, parent_id, folder_path, level, is_active, created_by, created_at, updated_at
       FROM doc_folders WHERE id = $1`,
      [folderId]
    )

    return NextResponse.json({
      success: true,
      folder: updatedResult.rows[0],
    })
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Soft delete folder
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

    const folderId = parseInt(id, 10)

    // Get folder info
    const folderResult = await pool.query<DocFolder>(
      `SELECT id, name, folder_path FROM doc_folders WHERE id = $1 AND is_active = true`,
      [folderId]
    )

    if (folderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const folder = folderResult.rows[0]

    // Move all documents in this folder and subfolders to "unfiled" (folder_id = NULL)
    // Update file_path to unfiled/filename
    const documentsResult = await pool.query<{ id: number; stored_file_name: string; file_path: string }>(
      `SELECT d.id, d.stored_file_name, d.file_path
       FROM documents d
       JOIN doc_folders f ON d.folder_id = f.id
       WHERE (f.id = $1 OR f.folder_path LIKE $2) AND d.is_active = true`,
      [folderId, `${folder.folder_path}/%`]
    )

    // Move each document to unfiled
    for (const doc of documentsResult.rows) {
      const oldPath = path.join(UPLOAD_ROOT, doc.file_path)
      const newPath = path.join(UPLOAD_ROOT, 'unfiled', doc.stored_file_name)

      // Create unfiled directory if needed
      const unfiledDir = path.join(UPLOAD_ROOT, 'unfiled')
      if (!existsSync(unfiledDir)) {
        await mkdir(unfiledDir, { recursive: true })
      }

      // Move file on disk if it exists
      if (existsSync(oldPath)) {
        await rename(oldPath, newPath)
      }

      // Update document in database
      await pool.query(
        `UPDATE documents SET folder_id = NULL, file_path = $1 WHERE id = $2`,
        [`unfiled/${doc.stored_file_name}`, doc.id]
      )
    }

    // Soft delete all child folders
    await pool.query(
      `UPDATE doc_folders SET is_active = false
       WHERE folder_path LIKE $1`,
      [`${folder.folder_path}/%`]
    )

    // Soft delete the folder itself
    await pool.query(
      `UPDATE doc_folders SET is_active = false WHERE id = $1`,
      [folderId]
    )

    return NextResponse.json({
      success: true,
      message: 'Folder deleted',
      documentsMovedToUnfiled: documentsResult.rows.length,
    })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}
