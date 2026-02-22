'use client'

/**
 * GEA Portal - Document Upload Modal
 *
 * Handles single file and folder batch uploads.
 */

import { useState, useRef, useEffect } from 'react'
import { FolderNode } from '@/types/documents'
import { validateDocumentFile, formatFileSize, validateBatchUpload } from '@/lib/file-validation'

// ============================================================================
// TYPES
// ============================================================================

interface UploadModalProps {
  isOpen: boolean
  folders: FolderNode[]
  onClose: () => void
  onUploadFile: (data: {
    file: File
    title: string
    description: string
    folder_id: number | null
    tags: string[]
    visibility: 'all_staff' | 'admin_only'
  }) => Promise<void>
  onUploadFolder: (data: {
    files: File[]
    folderPaths: Record<string, string>
    tags: string[]
    visibility: 'all_staff' | 'admin_only'
  }) => Promise<void>
}

interface UploadProgress {
  file_name: string
  status: 'waiting' | 'uploading' | 'success' | 'failed'
  error?: string
}

// ============================================================================
// UPLOAD MODAL
// ============================================================================

export default function UploadModal({
  isOpen,
  folders,
  onClose,
  onUploadFile,
  onUploadFolder,
}: UploadModalProps) {
  const [mode, setMode] = useState<'file' | 'folder'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [folderPaths, setFolderPaths] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [visibility, setVisibility] = useState<'all_staff' | 'admin_only'>('all_staff')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMode('file')
      setSelectedFile(null)
      setSelectedFiles([])
      setFolderPaths({})
      setTitle('')
      setDescription('')
      setSelectedFolderId(null)
      setTags([])
      setTagInput('')
      setVisibility('all_staff')
      setError('')
      setUploading(false)
      setUploadProgress([])
    }
  }, [isOpen])

  // Handle single file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = await validateDocumentFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setSelectedFile(file)
    setTitle(file.name.replace(/\.[^/.]+$/, '')) // Remove extension
    setError('')
  }

  // Handle folder selection
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate batch
    const batchValidation = validateBatchUpload(files)
    if (!batchValidation.valid) {
      setError(batchValidation.error || 'Invalid batch')
      return
    }

    // Extract folder paths from webkitRelativePath
    const paths: Record<string, string> = {}
    files.forEach((file) => {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || ''
      const parts = relativePath.split('/')
      if (parts.length > 1) {
        // Remove filename, keep folder path
        const folderPath = parts.slice(0, -1).join('/')
        paths[file.name] = folderPath
      }
    })

    setSelectedFiles(files)
    setFolderPaths(paths)
    setError('')
  }

  // Add tag
  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && tags.length < 10 && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  // Handle upload
  const handleUpload = async () => {
    setError('')
    setUploading(true)

    try {
      if (mode === 'file') {
        if (!selectedFile) {
          setError('Please select a file')
          return
        }
        if (!title.trim()) {
          setError('Title is required')
          return
        }

        await onUploadFile({
          file: selectedFile,
          title: title.trim(),
          description: description.trim(),
          folder_id: selectedFolderId,
          tags,
          visibility,
        })
      } else {
        if (selectedFiles.length === 0) {
          setError('Please select a folder')
          return
        }

        // Set initial progress
        setUploadProgress(
          selectedFiles.map((f) => ({
            file_name: f.name,
            status: 'waiting' as const,
          }))
        )

        await onUploadFolder({
          files: selectedFiles,
          folderPaths,
          tags,
          visibility,
        })
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Flatten folders for dropdown
  const flattenFolders = (nodes: FolderNode[], prefix = ''): { id: number; label: string }[] => {
    const result: { id: number; label: string }[] = []
    for (const node of nodes) {
      const label = prefix ? `${prefix} / ${node.name}` : node.name
      result.push({ id: node.id, label })
      if (node.children.length > 0) {
        result.push(...flattenFolders(node.children, label))
      }
    }
    return result
  }

  const flatFolders = flattenFolders(folders)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setMode('file')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 ${
                mode === 'file'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Single File
            </button>
            <button
              onClick={() => setMode('folder')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 ${
                mode === 'folder'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Folder Upload
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {mode === 'file' ? (
              <>
                {/* File input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    {selectedFile ? (
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500">Click to select a file</p>
                    )}
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Document title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description..."
                  />
                </div>

                {/* Folder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
                  <select
                    value={selectedFolderId || ''}
                    onChange={(e) => setSelectedFolderId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Unfiled</option>
                    {flatFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* Folder input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Folder</label>
                  <input
                    ref={folderInputRef}
                    type="file"
                    // @ts-expect-error - webkitdirectory is not in types but works in browsers
                    webkitdirectory=""
                    multiple
                    onChange={handleFolderSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    {selectedFiles.length > 0 ? (
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{selectedFiles.length} files selected</p>
                        <p className="text-gray-500">
                          {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))} total
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500">Click to select a folder</p>
                    )}
                  </button>
                </div>

                {/* Preview folder structure */}
                {selectedFiles.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {selectedFiles.slice(0, 10).map((file, i) => (
                      <div key={i} className="text-sm py-1 text-gray-600 truncate">
                        {folderPaths[file.name] ? `${folderPaths[file.name]}/` : ''}
                        {file.name}
                      </div>
                    ))}
                    {selectedFiles.length > 10 && (
                      <div className="text-sm text-gray-400 py-1">
                        ...and {selectedFiles.length - 10} more files
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add tag..."
                />
                <button
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 10}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={visibility === 'all_staff'}
                    onChange={() => setVisibility('all_staff')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">All Staff</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={visibility === 'admin_only'}
                    onChange={() => setVisibility('admin_only')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Admin Only</span>
                </label>
              </div>
            </div>

            {/* Upload progress */}
            {uploadProgress.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                {uploadProgress.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1">
                    {p.status === 'success' && <span className="text-green-500">✓</span>}
                    {p.status === 'failed' && <span className="text-red-500">✗</span>}
                    {p.status === 'uploading' && (
                      <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    )}
                    {p.status === 'waiting' && <span className="text-gray-300">○</span>}
                    <span className={p.status === 'failed' ? 'text-red-600' : 'text-gray-600'}>{p.file_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || (mode === 'file' && !selectedFile) || (mode === 'folder' && selectedFiles.length === 0)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {uploading ? 'Uploading...' : mode === 'file' ? 'Upload' : `Upload ${selectedFiles.length} files`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
