/**
 * GEA Portal - Document Folders API
 *
 * GET /api/admin/documents/folders - Get folder tree
 * POST /api/admin/documents/folders - Create a folder
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'
import { DocFolder, FolderNode } from '@/types/documents'
import { validateFolderName } from '@/lib/file-validation'

// ============================================================================
// GET - Fetch folder tree
// ============================================================================

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check authorization (admin or staff can view folders)
    if (!['admin', 'staff'].includes(session.user.roleType)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch all active folders
    const result = await pool.query<DocFolder>(
      `SELECT id, name, parent_id, folder_path, level, is_active, created_by, created_at, updated_at
       FROM doc_folders
       WHERE is_active = true
       ORDER BY level ASC, name ASC`
    )

    // Build tree structure
    const folders = result.rows
    const tree = buildFolderTree(folders)

    return NextResponse.json({
      success: true,
      folders: tree,
    })
  } catch (error) {
    console.error('Error fetching folder tree:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create a new folder
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check authorization (admin only can create folders)
    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, parent_id } = body

    // Validate folder name
    const nameValidation = validateFolderName(name)
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 })
    }

    // Calculate level and path
    let level = 1
    let folder_path = name.trim()

    if (parent_id) {
      // Fetch parent folder
      const parentResult = await pool.query<DocFolder>(
        'SELECT id, level, folder_path FROM doc_folders WHERE id = $1 AND is_active = true',
        [parent_id]
      )

      if (parentResult.rows.length === 0) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
      }

      const parent = parentResult.rows[0]
      level = parent.level + 1

      // Check max depth
      if (level > 3) {
        return NextResponse.json(
          { error: 'Maximum folder depth (3 levels) exceeded' },
          { status: 400 }
        )
      }

      folder_path = `${parent.folder_path}/${name.trim()}`
    }

    // Check if folder path already exists
    const existingResult = await pool.query(
      'SELECT id FROM doc_folders WHERE folder_path = $1',
      [folder_path]
    )

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 409 }
      )
    }

    // Insert folder
    const insertResult = await pool.query<DocFolder>(
      `INSERT INTO doc_folders (name, parent_id, folder_path, level, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, parent_id, folder_path, level, is_active, created_by, created_at, updated_at`,
      [name.trim(), parent_id || null, folder_path, level, session.user.email]
    )

    return NextResponse.json({
      success: true,
      folder: insertResult.rows[0],
    })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Builds a nested tree structure from flat folder array.
 */
function buildFolderTree(folders: DocFolder[]): FolderNode[] {
  const folderMap = new Map<number, FolderNode>()
  const rootFolders: FolderNode[] = []

  // First pass: create all nodes with empty children arrays
  for (const folder of folders) {
    folderMap.set(folder.id, { ...folder, children: [] })
  }

  // Second pass: build parent-child relationships
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!

    if (folder.parent_id === null) {
      // Root level folder
      rootFolders.push(node)
    } else {
      // Add to parent's children
      const parent = folderMap.get(folder.parent_id)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  // Sort children alphabetically
  const sortChildren = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children)
      }
    }
  }

  sortChildren(rootFolders)

  return rootFolders
}
