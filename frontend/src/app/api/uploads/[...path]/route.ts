/**
 * GEA Portal - File Serving API
 *
 * Serves uploaded files from public/uploads directory.
 * This is needed because Next.js standalone mode doesn't
 * automatically serve files added to public after build.
 *
 * GET /api/uploads/branding/filename.svg
 * GET /api/uploads/contacts/filename.jpg
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Allowed directories (security: prevent directory traversal)
const ALLOWED_DIRS = ['branding', 'contacts'];

/**
 * GET /api/uploads/[...path]
 * Serve uploaded files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path;

    // Validate path
    if (!pathSegments || pathSegments.length < 2) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    const [category, ...rest] = pathSegments;
    const filename = rest.join('/');

    // Security: Only allow specific directories
    if (!ALLOWED_DIRS.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 403 }
      );
    }

    // Security: Prevent directory traversal
    if (filename.includes('..') || filename.includes('//')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 403 }
      );
    }

    // Build file path
    const filePath = path.join(process.cwd(), 'public', 'uploads', category, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
