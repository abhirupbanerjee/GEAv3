/**
 * TicketTable Component
 *
 * Displays paginated list of tickets with sortable columns
 */

'use client'

import React from 'react'
import type { Ticket, TicketSort, Pagination } from '@/types/tickets'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'

interface TicketTableProps {
  tickets: Ticket[]
  isLoading: boolean
  pagination?: Pagination
  sort: TicketSort
  onSort: (column: TicketSort['by']) => void
  onEdit: (ticketId: number) => void
  onPageChange: (page: number) => void
}

export function TicketTable({
  tickets,
  isLoading,
  pagination,
  sort,
  onSort,
  onEdit,
  onPageChange
}: TicketTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Feature 1.5: Display submitter type (no PII)
  const getSubmitterDisplay = (submitter?: { type: string; entity_name: string | null }) => {
    if (!submitter) return 'Unknown'
    switch (submitter.type) {
      case 'anonymous':
        return 'Anonymous'
      case 'citizen':
        return 'Citizen'
      case 'staff':
        return submitter.entity_name ? `Staff - ${submitter.entity_name}` : 'Staff'
      default:
        return 'Unknown'
    }
  }

  const SortIcon = ({ column }: { column: TicketSort['by'] }) => {
    if (sort.by !== column) {
      return <span className="text-gray-400">⇅</span>
    }
    return sort.order === 'asc' ? (
      <span className="text-blue-600">↑</span>
    ) : (
      <span className="text-blue-600">↓</span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-gray-600">No tickets found</p>
          <p className="text-sm text-gray-500">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('ticket_number')}
              >
                <div className="flex items-center gap-1">
                  Ticket # <SortIcon column="ticket_number" />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('subject')}
              >
                <div className="flex items-center gap-1">
                  Subject <SortIcon column="subject" />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('status_id')}
              >
                <div className="flex items-center gap-1">
                  Status <SortIcon column="status_id" />
                </div>
              </th>
              <th
                scope="col"
                className="hidden sm:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('priority_id')}
              >
                <div className="flex items-center gap-1">
                  Priority <SortIcon column="priority_id" />
                </div>
              </th>
              <th scope="col" className="hidden xl:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requester
              </th>
              <th scope="col" className="hidden xl:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted By
              </th>
              <th
                scope="col"
                className="hidden sm:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Created <SortIcon column="created_at" />
                </div>
              </th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <tr key={ticket.ticket_id} className="hover:bg-gray-50">
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {ticket.ticket_number}
                  {ticket.is_overdue && (
                    <span className="ml-2 text-xs text-red-600">⚠ Overdue</span>
                  )}
                </td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={ticket.subject}>
                    {ticket.subject}
                  </div>
                  {ticket.service && (
                    <div className="text-xs text-gray-500">{ticket.service.name}</div>
                  )}
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={ticket.status} size="sm" />
                </td>
                <td className="hidden sm:table-cell px-4 lg:px-6 py-4 whitespace-nowrap">
                  <PriorityBadge priority={ticket.priority} size="sm" />
                </td>
                <td className="hidden xl:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{ticket.requester.name || 'N/A'}</div>
                  <div className="text-xs text-gray-400">{ticket.requester.email}</div>
                </td>
                <td className="hidden xl:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ticket.submitter?.type === 'staff'
                      ? 'bg-purple-100 text-purple-800'
                      : ticket.submitter?.type === 'citizen'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getSubmitterDisplay(ticket.submitter)}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(ticket.created_at)}
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(ticket.ticket_id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.has_prev}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.has_next}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total_count)}
                </span>{' '}
                of <span className="font-medium">{pagination.total_count}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={!pagination.has_prev}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  ‹
                </button>
                {[...Array(Math.min(pagination.total_pages, 5))].map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pagination.page === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!pagination.has_next}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  ›
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
