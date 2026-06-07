'use client'

/**
 * GEA Portal - Document Drag Overlay
 *
 * Custom drag preview shown when dragging documents.
 * Displays a count badge and document icon.
 */

// ============================================================================
// ICONS
// ============================================================================

const DocumentIcon = () => (
  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

// ============================================================================
// TYPES
// ============================================================================

interface DocumentDragOverlayProps {
  count: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DocumentDragOverlay({ count }: DocumentDragOverlayProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-blue-200 cursor-grabbing">
      <DocumentIcon />
      <span className="text-sm font-medium text-gray-700">
        {count} document{count !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
