'use client'

/**
 * @pageContext
 * @title Documents
 * @purpose Manage and access government policy documents and reference materials
 * @audience admin, staff
 * @features
 *   - Browse documents in hierarchical folder structure (up to 3 levels)
 *   - Upload individual files or entire folder structures
 *   - Filter by folder, tags, and sort order
 *   - Download documents (all authenticated users)
 *   - Edit document metadata — title, description, tags, folder, visibility (admin only)
 *   - Delete documents (admin only, soft delete)
 * @permissions
 *   - admin: full CRUD
 *   - staff: view and download only
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import FolderTree from '@/components/documents/FolderTree'
import DocumentList from '@/components/documents/DocumentList'
import UploadModal from '@/components/documents/UploadModal'
import EditModal from '@/components/documents/EditModal'
import CreateFolderModal from '@/components/documents/CreateFolderModal'
import { Document, FolderNode, DocumentSortBy } from '@/types/documents'

// ============================================================================
// DOCUMENTS PAGE
// ============================================================================

export default function DocumentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'unfiled' | null>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<DocumentSortBy>('newest')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [createFolderParentId, setCreateFolderParentId] = useState<number | null>(null)

  const isAdmin = session?.user?.roleType === 'admin'
  const limit = 50

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/documents/folders')
      const data = await res.json()
      if (data.success) {
        setFolders(data.folders)
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err)
    }
  }, [])

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (selectedFolderId === 'unfiled') {
        params.set('folder_id', 'unfiled')
      } else if (selectedFolderId !== 'all' && selectedFolderId !== null) {
        params.set('folder_id', selectedFolderId.toString())
      }

      if (searchQuery) {
        params.set('search', searchQuery)
      }

      params.set('sort', sortBy)
      params.set('page', page.toString())
      params.set('limit', limit.toString())

      const res = await fetch(`/api/admin/documents?${params}`)
      const data = await res.json()

      if (data.success) {
        setDocuments(data.documents)
        setTotal(data.total)
      } else {
        setError(data.error || 'Failed to fetch documents')
      }
    } catch (err) {
      setError('Failed to fetch documents')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedFolderId, searchQuery, sortBy, page])

  // Initial fetch
  useEffect(() => {
    if (status === 'authenticated') {
      fetchFolders()
      fetchDocuments()
    }
  }, [status, fetchFolders, fetchDocuments])

  // Refetch documents when filters change
  useEffect(() => {
    if (status === 'authenticated') {
      fetchDocuments()
    }
  }, [selectedFolderId, searchQuery, sortBy, page, fetchDocuments, status])

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  // Handle folder selection
  const handleSelectFolder = (folderId: number | 'all' | 'unfiled' | null) => {
    setSelectedFolderId(folderId)
    setPage(1)
  }

  // Handle sort change
  const handleSort = (newSortBy: DocumentSortBy) => {
    setSortBy(newSortBy)
    setPage(1)
  }

  // Handle download
  const handleDownload = async (doc: Document) => {
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/download`)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download document')
      setTimeout(() => setError(''), 5000)
    }
  }

  // Handle edit
  const handleEdit = (doc: Document) => {
    setEditingDocument(doc)
    setShowEditModal(true)
  }

  // Handle delete
  const handleDelete = async (doc: Document) => {
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        setSuccessMessage('Document deleted')
        setTimeout(() => setSuccessMessage(''), 3000)
        fetchDocuments()
      } else {
        setError(data.error || 'Failed to delete document')
        setTimeout(() => setError(''), 5000)
      }
    } catch {
      setError('Failed to delete document')
      setTimeout(() => setError(''), 5000)
    }
  }

  // Handle create folder
  const handleCreateFolder = (parentId: number | null) => {
    setCreateFolderParentId(parentId)
    setShowCreateFolderModal(true)
  }

  // Save new folder
  const handleSaveFolder = async (name: string) => {
    const res = await fetch('/api/admin/documents/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: createFolderParentId }),
    })
    const data = await res.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to create folder')
    }

    setSuccessMessage('Folder created')
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchFolders()
  }

  // Handle single file upload
  const handleUploadFile = async (data: {
    file: File
    title: string
    description: string
    folder_id: number | null
    tags: string[]
    visibility: 'all_staff' | 'admin_only'
  }) => {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('title', data.title)
    formData.append('description', data.description)
    if (data.folder_id) {
      formData.append('folder_id', data.folder_id.toString())
    }
    formData.append('tags', JSON.stringify(data.tags))
    formData.append('visibility', data.visibility)

    const res = await fetch('/api/admin/documents', {
      method: 'POST',
      body: formData,
    })
    const result = await res.json()

    if (!result.success) {
      throw new Error(result.error || 'Upload failed')
    }

    setSuccessMessage('Document uploaded')
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchDocuments()
  }

  // Handle folder upload
  const handleUploadFolder = async (data: {
    files: File[]
    folderPaths: Record<string, string>
    tags: string[]
    visibility: 'all_staff' | 'admin_only'
  }) => {
    // First, create folders
    const uniquePaths = [...new Set(Object.values(data.folderPaths))].filter(Boolean)

    if (uniquePaths.length > 0) {
      // Build all cumulative paths
      const allPaths: string[] = []
      for (const pathStr of uniquePaths) {
        const parts = pathStr.split('/')
        for (let i = 1; i <= parts.length; i++) {
          allPaths.push(parts.slice(0, i).join('/'))
        }
      }
      const uniqueAllPaths = [...new Set(allPaths)]

      const foldersRes = await fetch('/api/admin/documents/folders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: uniqueAllPaths }),
      })
      const foldersData = await foldersRes.json()

      if (!foldersData.success) {
        throw new Error(foldersData.error || 'Failed to create folders')
      }

      // Refresh folders
      await fetchFolders()
    }

    // Upload files
    const formData = new FormData()
    for (const file of data.files) {
      formData.append('files', file)
    }
    formData.append('folder_paths', JSON.stringify(data.folderPaths))
    formData.append('tags', JSON.stringify(data.tags))
    formData.append('visibility', data.visibility)

    const res = await fetch('/api/admin/documents/bulk', {
      method: 'POST',
      body: formData,
    })
    const result = await res.json()

    if (!result.success) {
      throw new Error(result.error || 'Bulk upload failed')
    }

    setSuccessMessage(`Uploaded ${result.uploaded} documents`)
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchDocuments()
  }

  // Handle save edit
  const handleSaveEdit = async (data: {
    title: string
    description: string
    folder_id: number | null
    tags: string[]
    visibility: 'all_staff' | 'admin_only'
  }) => {
    if (!editingDocument) return

    const res = await fetch(`/api/admin/documents/${editingDocument.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()

    if (!result.success) {
      throw new Error(result.error || 'Update failed')
    }

    setSuccessMessage('Document updated')
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchDocuments()
  }

  // Get parent folder name for create modal
  const getParentFolderName = (parentId: number | null): string | null => {
    if (!parentId) return null

    const findFolder = (nodes: FolderNode[]): string | null => {
      for (const node of nodes) {
        if (node.id === parentId) return node.folder_path
        if (node.children.length > 0) {
          const found = findFolder(node.children)
          if (found) return found
        }
      }
      return null
    }

    return findFolder(folders)
  }

  // Auth check
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/admin')
    return null
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">
            {total} documents across {folders.length} folders
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Folder tree */}
        <div className="w-64 flex-shrink-0">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onCreateFolder={isAdmin ? handleCreateFolder : undefined}
            isAdmin={isAdmin}
          />
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <DocumentList
            documents={documents}
            total={total}
            page={page}
            limit={limit}
            sortBy={sortBy}
            searchQuery={searchQuery}
            isLoading={loading}
            isAdmin={isAdmin}
            onSearch={handleSearch}
            onSort={handleSort}
            onPageChange={setPage}
            onDownload={handleDownload}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={showUploadModal}
        folders={folders}
        onClose={() => setShowUploadModal(false)}
        onUploadFile={handleUploadFile}
        onUploadFolder={handleUploadFolder}
      />

      <EditModal
        isOpen={showEditModal}
        document={editingDocument}
        folders={folders}
        onClose={() => {
          setShowEditModal(false)
          setEditingDocument(null)
        }}
        onSave={handleSaveEdit}
      />

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        parentFolderName={getParentFolderName(createFolderParentId)}
        onClose={() => {
          setShowCreateFolderModal(false)
          setCreateFolderParentId(null)
        }}
        onSave={handleSaveFolder}
      />
    </div>
  )
}
