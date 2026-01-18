/**
 * TicketDashboard Component
 *
 * Main container for the ticket management dashboard
 * Coordinates all child components and manages state
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTickets } from '@/hooks/useTickets'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useChatContext } from '@/hooks/useChatContext'
import type { TicketFilters, TicketSort } from '@/types/tickets'
import { DashboardStats } from './DashboardStats'
import { FilterSection } from './FilterSection'
import { TicketTable } from './TicketTable'
import { TicketDetailModal } from './TicketDetailModal'

export function TicketDashboard() {
  // URL params for tab handling (Feature 1.5) - controlled via sidebar navigation
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as 'received' | 'submitted' | null

  // State - view defaults to 'received'
  const [filters, setFilters] = useState<TicketFilters>({
    view: tabFromUrl || 'received',
    entity_id: null,
    service_id: null,
    status: null,
    priority: null,
    search: null
  })
  const [sort, setSort] = useState<TicketSort>({
    by: 'created_at',
    order: 'desc'
  })
  const [page, setPage] = useState(1)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)

  // Sync view state with URL param changes (Feature 1.5)
  useEffect(() => {
    const newView = tabFromUrl || 'received'
    setFilters((prev) => {
      if (prev.view !== newView) {
        setPage(1)
        return { ...prev, view: newView }
      }
      return prev
    })
  }, [tabFromUrl])

  // Chat context
  const { openModal, closeModal } = useChatContext()

  // Data fetching
  const { stats, isLoading: statsLoading, mutate: refreshStats } = useDashboardStats(filters.entity_id || undefined)
  const {
    tickets,
    pagination,
    isLoading: ticketsLoading,
    mutate: refreshTickets
  } = useTickets({
    filters,
    sort,
    page,
    limit: 20
  })

  // Handlers
  const handleFilterChange = (newFilters: TicketFilters) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  const handleSort = (column: TicketSort['by']) => {
    setSort((prev) => ({
      by: column,
      order: prev.by === column && prev.order === 'asc' ? 'desc' : 'asc'
    }))
    setPage(1) // Reset to first page when sort changes
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEditTicket = (ticketId: number) => {
    setSelectedTicketId(ticketId)

    // Find the ticket to get its details
    const ticket = tickets.find(t => t.ticket_id === ticketId)

    // Notify AI Bot about the modal
    if (ticket) {
      openModal('view-ticket', {
        title: 'Ticket Details',
        entityType: 'ticket',
        entityId: ticket.ticket_number,
        entityName: ticket.subject,
        data: {
          status: ticket.status.name,
          priority: ticket.priority.name,
          category: ticket.category?.name,
          entity: ticket.entity?.name,
          service: ticket.service?.name,
          createdAt: ticket.created_at,
        },
      })
    }
  }

  const handleCloseModal = () => {
    setSelectedTicketId(null)
    // Notify AI Bot that modal is closed
    closeModal()
    // Refresh tickets list and stats when modal closes to ensure any updates are reflected
    refreshTickets()
    refreshStats()
  }

  const handleTicketUpdate = () => {
    // Refresh both tickets list and stats after update
    refreshTickets()
    refreshStats()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tickets {filters.view === 'submitted' ? '- Submitted' : '- Received'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filters.view === 'submitted'
              ? 'Tickets you have submitted'
              : 'View and manage all support tickets and grievances'}
          </p>
        </div>
      </div>

      {/* Dashboard Stats */}
      <DashboardStats stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <FilterSection onFilterChange={handleFilterChange} currentFilters={filters} />

      {/* Tickets Table */}
      <TicketTable
        tickets={tickets}
        isLoading={ticketsLoading}
        pagination={pagination}
        sort={sort}
        onSort={handleSort}
        onEdit={handleEditTicket}
        onPageChange={handlePageChange}
      />

      {/* Ticket Detail Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={handleCloseModal}
          onUpdate={handleTicketUpdate}
        />
      )}
    </div>
  )
}
