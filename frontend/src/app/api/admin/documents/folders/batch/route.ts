/**
 * GEA Portal - Batch Folder Creation API
 *
 * POST /api/admin/documents/folders/batch - Create multiple folders from path array
 *
 * Used for folder uploads to create the folder hierarchy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { DocFolder } from '@/types/documents'
import { validateFolderPath, validateFolderName } from '@/lib/file-validation'

// ============================================================================
// POST - Batch create folders from paths
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
    const { paths } = body as { paths: string[] }

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'Paths array is required' }, { status: 400 })
    }

    // Validate all paths
    for (const pathStr of paths) {
      const pathValidation = validateFolderPath(pathStr)
      if (!pathValidation.valid) {
        return NextResponse.json(
          { error: `Invalid path "${pathStr}": ${pathValidation.error}` },
          { status: 400 }
        )
      }

      // Validate each folder name in the path
      const parts = pathStr.split('/')
      for (const part of parts) {
        const nameValidation = validateFolderName(part)
        if (!nameValidation.valid) {
          return NextResponse.json(
            { error: `Invalid folder name "${part}": ${nameValidation.error}` },
            { status: 400 }
          )
        }
      }
    }

    // Sort paths by depth (shortest first) so parents are created before children
    const sortedPaths = [...paths].sort((a, b) => {
      const depthA = a.split('/').length
      const depthB = b.split('/').length
      return depthA - depthB
    })

    // Remove duplicates
    const uniquePaths = [...new Set(sortedPaths)]

    let created = 0
    let skipped = 0
    const createdFolders: DocFolder[] = []

    // Process each path
    for (const pathStr of uniquePaths) {
      // Check if folder already exists
      const existingResult = await pool.query<DocFolder>(
        'SELECT id, name, parent_id, folder_path, level, is_active, created_by, created_at, updated_at FROM doc_folders WHERE folder_path = $1',
        [pathStr]
      )

      if (existingResult.rows.length > 0) {
        skipped++
        createdFolders.push(existingResult.rows[0])
        continue
      }

      // Parse path to get folder name and parent path
      const parts = pathStr.split('/')
      const name = parts[parts.length - 1]
      const level = parts.length

      // Check max depth
      if (level > 3) {
        return NextResponse.json(
          { error: `Path "${pathStr}" exceeds maximum depth of 3 levels` },
          { status: 400 }
        )
      }

      let parent_id: number | null = null

      // Find parent folder if not root level
      if (parts.length > 1) {
        const parentPath = parts.slice(0, -1).join('/')
        const parentResult = await pool.query<{ id: number }>(
          'SELECT id FROM doc_folders WHERE folder_path = $1',
          [parentPath]
        )

        if (parentResult.rows.length === 0) {
          // Parent should have been created already (paths are sorted by depth)
          return NextResponse.json(
            { error: `Parent folder not found for "${pathStr}"` },
            { status: 500 }
          )
        }

        parent_id = parentResult.rows[0].id
      }

      // Insert folder
      const insertResult = await pool.query<DocFolder>(
        `INSERT INTO doc_folders (name, parent_id, folder_path, level, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, parent_id, folder_path, level, is_active, created_by, created_at, updated_at`,
        [name, parent_id, pathStr, level, session.user.email]
      )

      created++
      createdFolders.push(insertResult.rows[0])
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      folders: createdFolders,
    })
  } catch (error) {
    console.error('Error batch creating folders:', error)
    return NextResponse.json(
      { error: 'Failed to create folders' },
      { status: 500 }
    )
  }
}
