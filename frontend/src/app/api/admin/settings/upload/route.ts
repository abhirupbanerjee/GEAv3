/**
 * GEA Portal - Settings Upload API
 *
 * Endpoint for uploading images (branding, contact photos).
 * Only accessible by admin users.
 *
 * POST /api/admin/settings/upload - Upload an image
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Upload directories
const UPLOAD_DIRS = {
  branding: 'public/uploads/branding',
  contacts: 'public/uploads/contacts',
} as const;

type UploadCategory = keyof typeof UPLOAD_DIRS;

/**
 * POST /api/admin/settings/upload
 * Upload an image file
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as UploadCategory) || 'branding';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get upload directory
    const uploadDir = UPLOAD_DIRS[category] || UPLOAD_DIRS.branding;
    const fullUploadDir = path.join(process.cwd(), uploadDir);

    // Create directory if it doesn't exist
    if (!existsSync(fullUploadDir)) {
      await mkdir(fullUploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.name) || getExtensionFromMime(file.type);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const safeOriginalName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    const filename = `${timestamp}-${uniqueId}-${safeOriginalName}`;

    // Write file
    const filePath = path.join(fullUploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate public URL path (use API route for serving)
    const publicPath = `/api/uploads/${category}/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        path: publicPath,
        category,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
  };
  return mimeToExt[mimeType] || '.bin';
}
