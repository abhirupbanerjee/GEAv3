/**
 * GEA Portal - Bulk Document Operations API
 *
 * POST /api/admin/documents/bulk - Upload multiple files from folder upload
 * PATCH /api/admin/documents/bulk - Add tags to multiple documents
 * DELETE /api/admin/documents/bulk - Delete multiple documents
 *
 * Handles batch operations on documents.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { Document } from '@/types/documents'
import {
  validateDocumentFile,
  validateTags,
  validateBatchUpload,
  sanitizeFilename,
  getFileExtension,
} from '@/lib/file-validation'

// Upload root directory
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'documents')

// ============================================================================
// POST - Bulk upload documents
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

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const folderPathsJson = formData.get('folder_paths') as string | null
    const tagsJson = formData.get('tags') as string | null
    const visibility = (formData.get('visibility') as string) || 'all_staff'

    // Validate files array
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Validate batch
    const batchValidation = validateBatchUpload(files)
    if (!batchValidation.valid) {
      return NextResponse.json({ error: batchValidation.error }, { status: 400 })
    }

    // Validate visibility
    if (!['all_staff', 'admin_only'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 })
    }

    // Parse folder paths mapping
    let folderPaths: Record<string, string> = {}
    if (folderPathsJson) {
      try {
        folderPaths = JSON.parse(folderPathsJson)
      } catch {
        return NextResponse.json({ error: 'Invalid folder_paths format' }, { status: 400 })
      }
    }

    // Parse and validate tags
    let tags: string[] = []
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson)
        const tagsValidation = validateTags(tags)
        if (!tagsValidation.valid) {
          return NextResponse.json({ error: tagsValidation.error }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid tags format' }, { status: 400 })
      }
    }

    // Cache folder lookups
    const folderCache = new Map<string, { id: number | null; path: string }>()
    folderCache.set('', { id: null, path: 'unfiled' })

    // Process each file
    const results: Array<{
      file_name: string
      status: 'success' | 'failed'
      error?: string
      document?: Document
    }> = []

    let uploaded = 0
    let failed = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        // Validate individual file
        const fileValidation = await validateDocumentFile(file)
        if (!fileValidation.valid) {
          results.push({
            file_name: file.name,
            status: 'failed',
            error: fileValidation.error,
          })
          failed++
          continue
        }

        // Get folder for this file using index as key
        // (handles duplicate filenames in different folders)
        const folderPathKey = folderPaths[i.toString()] || ''
        let folderInfo = folderCache.get(folderPathKey)

        if (!folderInfo && folderPathKey) {
          // Look up folder in database
          const folderResult = await pool.query<{ id: number; folder_path: string }>(
            'SELECT id, folder_path FROM doc_folders WHERE folder_path = $1 AND is_active = true',
            [folderPathKey]
          )

          if (folderResult.rows.length > 0) {
            folderInfo = {
              id: folderResult.rows[0].id,
              path: folderResult.rows[0].folder_path,
            }
          } else {
            // Folder doesn't exist, use unfiled
            folderInfo = { id: null, path: 'unfiled' }
          }

          folderCache.set(folderPathKey, folderInfo)
        }

        folderInfo = folderInfo || { id: null, path: 'unfiled' }

        // Generate stored filename
        const timestamp = Date.now()
        const randomHex = crypto.randomBytes(8).toString('hex')
        const safeOriginal = sanitizeFilename(file.name)
        const storedFileName = `${timestamp}-${randomHex}-${safeOriginal}`
        const extension = getFileExtension(file.name).toLowerCase()

        // Create directory if needed
        const uploadDir = path.join(UPLOAD_ROOT, folderInfo.path)
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true })
        }

        // Write file
        const filePath = path.join(uploadDir, storedFileName)
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Store relative path from upload root
        const relativeFilePath = path.join(folderInfo.path, storedFileName)

        // Use filename without extension as title
        const title = file.name.replace(/\.[^/.]+$/, '') || file.name

        // Insert document record
        const insertResult = await pool.query<Document>(
          `INSERT INTO documents (
            title, description, file_name, stored_file_name, file_path,
            file_size, file_type, file_extension, folder_id, tags, visibility, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, title, description, file_name, stored_file_name, file_path,
            file_size, file_type, file_extension, folder_id, tags, visibility,
            is_active, download_count, uploaded_by, created_at, updated_at`,
          [
            title,
            null,
            file.name,
            storedFileName,
            relativeFilePath,
            file.size,
            file.type,
            extension,
            folderInfo.id,
            tags,
            visibility,
            session.user.email,
          ]
        )

        results.push({
          file_name: file.name,
          status: 'success',
          document: insertResult.rows[0],
        })
        uploaded++
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error)
        results.push({
          file_name: file.name,
          status: 'failed',
          error: 'Failed to upload file',
        })
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      uploaded,
      failed,
      results,
    })
  } catch (error) {
    console.error('Error in bulk upload:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Add tags to multiple documents
// ============================================================================

export async function PATCH(request: NextRequest) {
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
    const { document_ids, tags } = body

    // Validate document_ids
    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({ error: 'document_ids must be a non-empty array' }, { status: 400 })
    }

    if (document_ids.length > 100) {
      return NextResponse.json({ error: 'Cannot update more than 100 documents at once' }, { status: 400 })
    }

    // Validate tags
    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'tags must be a non-empty array' }, { status: 400 })
    }

    const tagsValidation = validateTags(tags)
    if (!tagsValidation.valid) {
      return NextResponse.json({ error: tagsValidation.error }, { status: 400 })
    }

    // Update documents - append new tags to existing tags (avoiding duplicates)
    const result = await pool.query(
      `UPDATE documents
       SET tags = (
         SELECT array_agg(DISTINCT tag)
         FROM unnest(tags || $1::text[]) AS tag
       )
       WHERE id = ANY($2::int[]) AND is_active = true
       RETURNING id`,
      [tags, document_ids]
    )

    return NextResponse.json({
      success: true,
      updated: result.rowCount,
      message: `Tags added to ${result.rowCount} document(s)`,
    })
  } catch (error) {
    console.error('Error adding bulk tags:', error)
    return NextResponse.json(
      { error: 'Failed to add tags' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Bulk delete documents (soft delete or permanent)
// ============================================================================

export async function DELETE(request: NextRequest) {
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

    // Check for permanent delete flag
    const { searchParams } = new URL(request.url)
    const isPermanent = searchParams.get('permanent') === 'true'

    // Parse request body
    const body = await request.json()
    const { document_ids } = body

    // Validate document_ids
    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({ error: 'document_ids must be a non-empty array' }, { status: 400 })
    }

    if (document_ids.length > 100) {
      return NextResponse.json({ error: 'Cannot delete more than 100 documents at once' }, { status: 400 })
    }

    let result

    if (isPermanent) {
      // Permanent delete - only from trash (is_active = false)
      result = await pool.query(
        `DELETE FROM documents
         WHERE id = ANY($1::int[]) AND is_active = false
         RETURNING id`,
        [document_ids]
      )

      return NextResponse.json({
        success: true,
        deleted: result.rowCount,
        message: `${result.rowCount} document(s) permanently deleted`,
      })
    } else {
      // Soft delete documents
      result = await pool.query(
        `UPDATE documents
         SET is_active = false, deleted_at = NOW()
         WHERE id = ANY($1::int[]) AND is_active = true
         RETURNING id`,
        [document_ids]
      )

      return NextResponse.json({
        success: true,
        deleted: result.rowCount,
        message: `${result.rowCount} document(s) moved to trash`,
      })
    }
  } catch (error) {
    console.error('Error in bulk delete:', error)
    return NextResponse.json(
      { error: 'Failed to delete documents' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Bulk move documents to a folder
// ============================================================================

export async function PUT(request: NextRequest) {
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
    const { document_ids, folder_id } = body as {
      document_ids: number[]
      folder_id: number | null
    }

    // Validate document_ids
    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json({ error: 'document_ids must be a non-empty array' }, { status: 400 })
    }

    if (document_ids.length > 100) {
      return NextResponse.json({ error: 'Cannot move more than 100 documents at once' }, { status: 400 })
    }

    // Get target folder info
    let targetFolderPath = 'unfiled'
    if (folder_id !== null) {
      const folderResult = await pool.query<{ id: number; folder_path: string }>(
        'SELECT id, folder_path FROM doc_folders WHERE id = $1 AND is_active = true',
        [folder_id]
      )

      if (folderResult.rows.length === 0) {
        return NextResponse.json({ error: 'Target folder not found' }, { status: 404 })
      }

      targetFolderPath = folderResult.rows[0].folder_path
    }

    // Get documents to move
    const docsResult = await pool.query<{
      id: number
      stored_file_name: string
      file_path: string
      folder_id: number | null
    }>(
      `SELECT id, stored_file_name, file_path, folder_id
       FROM documents
       WHERE id = ANY($1::int[]) AND is_active = true`,
      [document_ids]
    )

    if (docsResult.rows.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 })
    }

    let moved = 0
    let failed = 0

    // Move each document
    for (const doc of docsResult.rows) {
      try {
        const oldFilePath = doc.file_path
        const newFilePath = path.join(targetFolderPath, doc.stored_file_name)

        // Move file on disk
        const oldDiskPath = path.join(UPLOAD_ROOT, oldFilePath)
        const newDiskPath = path.join(UPLOAD_ROOT, newFilePath)

        // Create target directory if needed
        const targetDir = path.join(UPLOAD_ROOT, targetFolderPath)
        if (!existsSync(targetDir)) {
          await mkdir(targetDir, { recursive: true })
        }

        // Move file if it exists
        if (existsSync(oldDiskPath)) {
          const { rename } = await import('fs/promises')
          await rename(oldDiskPath, newDiskPath)
        }

        // Update database
        await pool.query(
          `UPDATE documents
           SET folder_id = $1, file_path = $2
           WHERE id = $3`,
          [folder_id, newFilePath, doc.id]
        )

        moved++
      } catch (err) {
        console.error(`Error moving document ${doc.id}:`, err)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      moved,
      failed,
      message: `${moved} document(s) moved to ${folder_id === null ? 'Unfiled' : 'folder'}`,
    })
  } catch (error) {
    console.error('Error in bulk move:', error)
    return NextResponse.json(
      { error: 'Failed to move documents' },
      { status: 500 }
    )
  }
}
