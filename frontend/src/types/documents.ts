/**
 * GEA Portal - Documents Module Types
 *
 * Type definitions for the Documents Library module.
 */

// ============================================================================
// FOLDER TYPES
// ============================================================================

export interface DocFolder {
  id: number
  name: string
  parent_id: number | null
  folder_path: string
  level: 1 | 2 | 3
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface FolderNode extends DocFolder {
  children: FolderNode[]
}

export interface CreateFolderRequest {
  name: string
  parent_id: number | null
}

export interface BatchCreateFoldersRequest {
  paths: string[]
}

export interface BatchCreateFoldersResponse {
  created: number
  skipped: number
  folders: DocFolder[]
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export interface Document {
  id: number
  title: string
  description: string | null
  file_name: string
  stored_file_name: string
  file_path: string
  file_size: number
  file_type: string
  file_extension: string
  folder_id: number | null
  folder_path: string | null
  folder_name: string | null
  tags: string[]
  visibility: 'all_staff' | 'admin_only'
  is_active: boolean
  download_count: number
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface DocumentListResponse {
  documents: Document[]
  total: number
  page: number
  limit: number
}

export interface UploadDocumentRequest {
  file: File
  title: string
  description?: string
  folder_id?: number | null
  tags?: string[]
  visibility: 'all_staff' | 'admin_only'
}

export interface UpdateDocumentRequest {
  title?: string
  description?: string
  folder_id?: number | null
  tags?: string[]
  visibility?: 'all_staff' | 'admin_only'
}

export interface BulkUploadRequest {
  files: File[]
  folder_paths: Record<string, string> // filename -> folder_path
  tags?: string[]
  visibility: 'all_staff' | 'admin_only'
}

export interface BulkUploadResponse {
  uploaded: number
  failed: number
  results: Array<{
    file_name: string
    status: 'success' | 'failed'
    error?: string
    document?: Document
  }>
}

// ============================================================================
// FILTER & SORT TYPES
// ============================================================================

export interface DocumentFilters {
  folder_id?: number | null
  tags?: string[]
  visibility?: 'all_staff' | 'admin_only'
  search?: string
}

export type DocumentSortBy = 'newest' | 'oldest' | 'name' | 'size'

// ============================================================================
// CONSTANTS
// ============================================================================

export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/markdown': 'md',
}

export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md']

export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024 // 20MB

export const MAX_BATCH_FILES = 100

export const MAX_BATCH_SIZE = 500 * 1024 * 1024 // 500MB total

export const MAX_FOLDER_DEPTH = 3

export const MAX_TAGS = 10

export const MAX_TAG_LENGTH = 50

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface UploadProgress {
  file_name: string
  status: 'waiting' | 'uploading' | 'success' | 'failed'
  error?: string
}

export interface FolderUploadPreview {
  path: string
  files: File[]
  level: number
}
