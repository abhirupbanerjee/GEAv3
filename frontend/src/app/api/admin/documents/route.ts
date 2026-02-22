/**
 * GEA Portal - Documents API
 *
 * GET /api/admin/documents - List documents with filters
 * POST /api/admin/documents - Upload a single document
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
  sanitizeFilename,
  getFileExtension,
} from '@/lib/file-validation'

// Upload root directory
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'documents')

// ============================================================================
// GET - List documents with filters
// ============================================================================

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const folder_id = searchParams.get('folder_id')
    const tags = searchParams.get('tags')
    const visibility = searchParams.get('visibility')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'newest'

    // Build query
    const conditions: string[] = ['d.is_active = true']
    const params: (string | number | null)[] = []
    let paramIndex = 1

    // Folder filter
    if (folder_id === 'unfiled') {
      conditions.push('d.folder_id IS NULL')
    } else if (folder_id && folder_id !== 'all') {
      conditions.push(`d.folder_id = $${paramIndex}`)
      params.push(parseInt(folder_id, 10))
      paramIndex++
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim())
      conditions.push(`d.tags && $${paramIndex}::text[]`)
      params.push(`{${tagArray.join(',')}}`)
      paramIndex++
    }

    // Visibility filter
    if (visibility) {
      conditions.push(`d.visibility = $${paramIndex}`)
      params.push(visibility)
      paramIndex++
    } else if (session.user.roleType === 'staff') {
      // Staff can only see 'all_staff' documents
      conditions.push(`d.visibility = 'all_staff'`)
    }

    // Search filter
    if (search) {
      conditions.push(`(d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Sort order
    let orderBy = 'd.created_at DESC'
    switch (sort) {
      case 'oldest':
        orderBy = 'd.created_at ASC'
        break
      case 'name':
        orderBy = 'd.title ASC'
        break
      case 'size':
        orderBy = 'd.file_size DESC'
        break
      default:
        orderBy = 'd.created_at DESC'
    }

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM documents d ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    // Fetch documents with folder info
    const offset = (page - 1) * limit
    params.push(limit, offset)

    const result = await pool.query<Document>(
      `SELECT
        d.id, d.title, d.description, d.file_name, d.stored_file_name, d.file_path,
        d.file_size, d.file_type, d.file_extension, d.folder_id, d.tags, d.visibility,
        d.is_active, d.download_count, d.uploaded_by, d.created_at, d.updated_at,
        f.folder_path, f.name as folder_name
       FROM documents d
       LEFT JOIN doc_folders f ON d.folder_id = f.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    return NextResponse.json({
      success: true,
      documents: result.rows,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Upload a single document
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
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const folder_id = formData.get('folder_id') as string | null
    const tagsJson = formData.get('tags') as string | null
    const visibility = (formData.get('visibility') as string) || 'all_staff'

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (title.length > 500) {
      return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 })
    }

    // Validate visibility
    if (!['all_staff', 'admin_only'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 })
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

    // Validate file
    const fileValidation = await validateDocumentFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // Get folder info if specified
    let folderPath = 'unfiled'
    let folderId: number | null = null

    if (folder_id && folder_id !== 'null') {
      const folderResult = await pool.query<{ id: number; folder_path: string }>(
        'SELECT id, folder_path FROM doc_folders WHERE id = $1 AND is_active = true',
        [parseInt(folder_id, 10)]
      )

      if (folderResult.rows.length === 0) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }

      folderId = folderResult.rows[0].id
      folderPath = folderResult.rows[0].folder_path
    }

    // Generate stored filename
    const timestamp = Date.now()
    const randomHex = crypto.randomBytes(8).toString('hex')
    const safeOriginal = sanitizeFilename(file.name)
    const storedFileName = `${timestamp}-${randomHex}-${safeOriginal}`
    const extension = getFileExtension(file.name).toLowerCase()

    // Create directory if needed
    const uploadDir = path.join(UPLOAD_ROOT, folderPath)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Write file
    const filePath = path.join(uploadDir, storedFileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Store relative path from upload root
    const relativeFilePath = path.join(folderPath, storedFileName)

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
        title.trim(),
        description?.trim() || null,
        file.name,
        storedFileName,
        relativeFilePath,
        file.size,
        file.type,
        extension,
        folderId,
        tags,
        visibility,
        session.user.email,
      ]
    )

    return NextResponse.json({
      success: true,
      document: insertResult.rows[0],
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}
