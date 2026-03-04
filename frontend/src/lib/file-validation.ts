/**
 * GEA Portal - File Validation Utilities
 *
 * Provides file validation including magic byte checking
 * to prevent MIME type spoofing attacks.
 */

import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_DOCUMENT_SIZE,
  MAX_BATCH_FILES,
  MAX_BATCH_SIZE,
  MAX_FOLDER_DEPTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
} from '@/types/documents'

// ============================================================================
// FILE MAGIC BYTES (FILE SIGNATURES)
// ============================================================================

/**
 * File signatures (magic bytes) for supported document types.
 * Used to validate that file content matches claimed MIME type.
 */
const FILE_SIGNATURES: Record<string, number[] | null> = {
  // PDF: %PDF (0x25 0x50 0x44 0x46)
  'application/pdf': [0x25, 0x50, 0x44, 0x46],

  // ZIP-based Office documents (DOCX, XLSX): PK.. (0x50 0x4B 0x03 0x04)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04],

  // Legacy Office documents (DOC, XLS): D0 CF 11 E0 (OLE2 compound document)
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0],
  'application/vnd.ms-excel': [0xD0, 0xCF, 0x11, 0xE0],

  // Text files: No signature check (any bytes allowed)
  'text/plain': null,
  'text/markdown': null,
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates file magic bytes match the expected MIME type.
 * Returns true if valid, false if spoofed.
 *
 * @param file - The file to validate
 * @param claimedMimeType - The MIME type claimed by the browser
 * @returns Promise<boolean> - True if valid
 */
export async function validateFileMagicBytes(
  file: File,
  claimedMimeType: string
): Promise<{ valid: boolean; error?: string }> {
  const expectedSignature = FILE_SIGNATURES[claimedMimeType]

  // No signature check needed for text files
  if (expectedSignature === null) {
    return { valid: true }
  }

  // Unknown MIME type - reject
  if (expectedSignature === undefined) {
    return {
      valid: false,
      error: `Unsupported file type: ${claimedMimeType}`,
    }
  }

  try {
    // Read the first few bytes of the file
    const headerBytes = await readFileHeader(file, expectedSignature.length)

    // Compare with expected signature
    for (let i = 0; i < expectedSignature.length; i++) {
      if (headerBytes[i] !== expectedSignature[i]) {
        return {
          valid: false,
          error: `File content does not match claimed type (${claimedMimeType})`,
        }
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read file header: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Reads the first N bytes of a file.
 */
async function readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
  const slice = file.slice(0, bytes)
  const arrayBuffer = await slice.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Validates a file for document upload.
 * Checks: extension, MIME type, size, and magic bytes.
 */
export async function validateDocumentFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // Check file extension
  const extension = getFileExtension(file.name).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  // Check MIME type
  if (!ALLOWED_DOCUMENT_TYPES[file.type]) {
    // Try to infer from extension for edge cases
    const inferredMime = getInferredMimeType(extension)
    if (!inferredMime || !ALLOWED_DOCUMENT_TYPES[inferredMime]) {
      return {
        valid: false,
        error: `Invalid file type: ${file.type || 'unknown'}. Allowed types: PDF, DOC, DOCX, XLS, XLSX, TXT, MD`,
      }
    }
  }

  // Check file size
  if (file.size > MAX_DOCUMENT_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB`,
    }
  }

  // Check file is not empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    }
  }

  // Validate magic bytes
  const mimeToValidate = file.type || getInferredMimeType(extension) || ''
  const magicResult = await validateFileMagicBytes(file, mimeToValidate)
  if (!magicResult.valid) {
    return magicResult
  }

  return { valid: true }
}

/**
 * Validates a batch of files for upload.
 */
export function validateBatchUpload(files: File[]): { valid: boolean; error?: string } {
  // Check file count
  if (files.length === 0) {
    return { valid: false, error: 'No files selected' }
  }

  if (files.length > MAX_BATCH_FILES) {
    return {
      valid: false,
      error: `Too many files. Maximum: ${MAX_BATCH_FILES} files per batch`,
    }
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_BATCH_SIZE) {
    return {
      valid: false,
      error: `Total upload size too large. Maximum: ${MAX_BATCH_SIZE / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}

/**
 * Validates folder name.
 */
export function validateFolderName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Folder name is required' }
  }

  if (name.length > 100) {
    return { valid: false, error: 'Folder name must be 100 characters or less' }
  }

  // Allow letters, numbers, spaces, and hyphens only
  if (!/^[a-zA-Z0-9\s-]+$/.test(name)) {
    return {
      valid: false,
      error: 'Folder name can only contain letters, numbers, spaces, and hyphens',
    }
  }

  return { valid: true }
}

/**
 * Validates folder path (checks for traversal attacks).
 */
export function validateFolderPath(path: string): { valid: boolean; error?: string } {
  if (!path) {
    return { valid: false, error: 'Path is required' }
  }

  // Check for directory traversal
  if (path.includes('..') || path.includes('//')) {
    return { valid: false, error: 'Invalid path' }
  }

  // Check depth
  const depth = path.split('/').length
  if (depth > MAX_FOLDER_DEPTH) {
    return {
      valid: false,
      error: `Folder depth exceeds maximum of ${MAX_FOLDER_DEPTH} levels`,
    }
  }

  return { valid: true }
}

/**
 * Validates tags array.
 */
export function validateTags(tags: string[]): { valid: boolean; error?: string } {
  if (tags.length > MAX_TAGS) {
    return { valid: false, error: `Maximum ${MAX_TAGS} tags allowed` }
  }

  for (const tag of tags) {
    if (tag.length > MAX_TAG_LENGTH) {
      return {
        valid: false,
        error: `Tag "${tag.substring(0, 20)}..." exceeds ${MAX_TAG_LENGTH} character limit`,
      }
    }

    // Basic sanitization check
    if (/<|>|&|"|'/.test(tag)) {
      return { valid: false, error: 'Tags cannot contain HTML special characters' }
    }
  }

  return { valid: true }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets file extension from filename.
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.substring(lastDot + 1)
}

/**
 * Infers MIME type from file extension.
 */
function getInferredMimeType(extension: string): string | null {
  const extToMime: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    md: 'text/markdown',
  }
  return extToMime[extension.toLowerCase()] || null
}

/**
 * Sanitizes filename for safe storage.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .substring(0, 100)
}

/**
 * Generates a unique stored filename.
 */
export function generateStoredFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const randomHex = Math.random().toString(16).substring(2, 10)
  const safeOriginal = sanitizeFilename(originalFilename)
  return `${timestamp}-${randomHex}-${safeOriginal}`
}

/**
 * Formats file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Gets file type icon based on extension.
 */
export function getFileTypeIcon(extension: string): string {
  const icons: Record<string, string> = {
    pdf: 'file-pdf',
    doc: 'file-word',
    docx: 'file-word',
    xls: 'file-excel',
    xlsx: 'file-excel',
    txt: 'file-text',
    md: 'file-text',
  }
  return icons[extension.toLowerCase()] || 'file'
}
