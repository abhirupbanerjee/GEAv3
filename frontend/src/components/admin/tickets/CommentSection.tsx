/**
 * CommentSection Component
 *
 * Allows adding internal notes to a ticket
 * Displays as part of the activity timeline
 */

'use client'

import React, { useState } from 'react'

interface CommentSectionProps {
  onAddNote: (note: string) => Promise<void>
  isSubmitting: boolean
}

export function CommentSection({ onAddNote, isSubmitting }: CommentSectionProps) {
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!noteText.trim()) {
      setError('Note cannot be empty')
      return
    }

    try {
      await onAddNote(noteText.trim())
      setNoteText('') // Clear on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    }
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        Add Internal Note
      </h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add an internal comment (not visible to requester)..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isSubmitting}
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setNoteText('')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !noteText.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-500 mt-2">
        💡 Internal notes are only visible to admin users and not shared with the requester
      </p>
    </div>
  )
}
