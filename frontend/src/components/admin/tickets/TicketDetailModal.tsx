/**
 * TicketDetailModal Component
 *
 * Modal dialog displaying complete ticket details with edit capabilities
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useTicketDetail } from '@/hooks/useTicketDetail'
import { useTicketUpdate } from '@/hooks/useTicketUpdate'
import { ActivityTimeline } from './ActivityTimeline'

interface TicketDetailModalProps {
  ticketId: number
  onClose: () => void
  onUpdate: () => void
}

export function TicketDetailModal({ ticketId, onClose, onUpdate }: TicketDetailModalProps) {
  const { ticket, attachments, activities, isLoading, isError, error, mutate } = useTicketDetail(ticketId)
  const { updateTicket, isUpdating } = useTicketUpdate()

  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null)
  const [selectedPriorityId, setSelectedPriorityId] = useState<number | null>(null)
  const [internalNote, setInternalNote] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('TicketDetailModal - ticketId:', ticketId)
    console.log('TicketDetailModal - isLoading:', isLoading)
    console.log('TicketDetailModal - isError:', isError)
    console.log('TicketDetailModal - error:', error)
    console.log('TicketDetailModal - ticket:', ticket)
  }, [ticketId, isLoading, isError, error, ticket])

  // Sync local state with fetched ticket data
  useEffect(() => {
    if (ticket) {
      console.log('Syncing dropdown values with ticket data:', {
        statusId: ticket.status.id,
        statusName: ticket.status.name,
        priorityId: ticket.priority.id,
        priorityName: ticket.priority.name,
        previousSelectedStatusId: selectedStatusId,
        previousSelectedPriorityId: selectedPriorityId
      })
      setSelectedStatusId(ticket.status.id)
      setSelectedPriorityId(ticket.priority.id)
    }
  }, [ticket])

  // Track changes
  useEffect(() => {
    if (ticket) {
      const statusChanged = selectedStatusId !== ticket.status.id
      const priorityChanged = selectedPriorityId !== ticket.priority.id
      const hasNote = internalNote.trim().length > 0
      setHasChanges(statusChanged || priorityChanged || hasNote)
    }
  }, [selectedStatusId, selectedPriorityId, internalNote, ticket])

  const handleSaveChanges = async () => {
    if (!ticket || !hasChanges) {
      console.log('Save blocked - ticket:', ticket, 'hasChanges:', hasChanges)
      return
    }

    const payload: any = {
      performed_by: 'admin' // TODO: Get from session
    }

    // Only include changed fields
    if (selectedStatusId !== ticket.status.id) {
      payload.status_id = selectedStatusId
    }
    if (selectedPriorityId !== ticket.priority.id) {
      payload.priority_id = selectedPriorityId
    }
    if (internalNote.trim().length > 0) {
      payload.internal_note = internalNote.trim()
    }

    console.log('Attempting to save ticket update:', {
      ticketId,
      payload,
      currentStatus: ticket.status.id,
      currentPriority: ticket.priority.id,
      selectedStatusId,
      selectedPriorityId
    })

    try {
      const result = await updateTicket(ticketId, payload)
      console.log('Ticket update successful:', result)

      // Clear the note input after successful save
      setInternalNote('')

      // Refresh data
      await mutate()
      onUpdate()
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to update ticket:', error)
      alert(`Failed to update ticket: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                {isLoading ? 'Loading Ticket Details...' : ticket ? `Ticket ${ticket.ticket_number}` : 'Ticket Details'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-gray-600">Loading ticket details...</p>
              </div>
            )}

            {!isLoading && isError && (
              <div className="text-center py-12">
                <div className="text-red-600 text-5xl mb-4">⚠️</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Ticket</h4>
                <p className="text-sm text-gray-600 mb-4">{error || 'An unexpected error occurred'}</p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !isError && ticket && (
              <div className="space-y-6">
                {/* Ticket Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Ticket Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-medium text-gray-500">Subject</span>
                        <p className="text-sm text-gray-900 mt-1">{ticket.subject}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Service</span>
                        <p className="text-sm text-gray-900 mt-1">{ticket.service?.name || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Description</span>
                      <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs font-medium text-gray-500">Requester</span>
                        <p className="text-sm text-gray-900 mt-1">{ticket.requester.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{ticket.requester.email}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Entity</span>
                        <p className="text-sm text-gray-900 mt-1">{ticket.assigned_entity?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Created</span>
                        <p className="text-sm text-gray-900 mt-1">{formatDate(ticket.timestamps.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update Status, Priority & Add Note */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Update Ticket</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Status</label>
                        <select
                          value={selectedStatusId || ''}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value)
                            console.log('Status dropdown changed:', {from: selectedStatusId, to: newValue})
                            setSelectedStatusId(newValue)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="1">Open</option>
                          <option value="2">In Progress</option>
                          <option value="3">Resolved</option>
                          <option value="4">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Priority</label>
                        <select
                          value={selectedPriorityId || ''}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value)
                            console.log('Priority dropdown changed:', {from: selectedPriorityId, to: newValue})
                            setSelectedPriorityId(newValue)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="1">Urgent</option>
                          <option value="2">High</option>
                          <option value="3">Medium</option>
                          <option value="4">Low</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Add Internal Note <span className="text-gray-400">(Optional)</span>
                      </label>
                      <textarea
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        placeholder="Add an internal note about this update..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {hasChanges && (
                      <div>
                        <button
                          onClick={handleSaveChanges}
                          disabled={isUpdating}
                          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attachments */}
                {attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Attachments ({attachments.length})
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.attachment_id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📎</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.filename}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(attachment.file_size)} • {formatDate(attachment.created_at)}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`/api/tickets/${ticketId}/attachments/${attachment.attachment_id}`}
                            download
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity Timeline */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity Timeline</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ActivityTimeline activities={activities} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
