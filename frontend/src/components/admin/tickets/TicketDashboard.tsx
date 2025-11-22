/**
 * TicketDashboard Component
 *
 * Main container for the ticket management dashboard
 * Coordinates all child components and manages state
 */

'use client'

import React, { useState } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import type { TicketFilters, TicketSort } from '@/types/tickets'
import { DashboardStats } from './DashboardStats'
import { FilterSection } from './FilterSection'
import { TicketTable } from './TicketTable'
import { TicketDetailModal } from './TicketDetailModal'

export function TicketDashboard() {
  // State
  const [filters, setFilters] = useState<TicketFilters>({
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

  // Data fetching
  const { stats, isLoading: statsLoading } = useDashboardStats(filters.entity_id || undefined)
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
  }

  const handleCloseModal = () => {
    setSelectedTicketId(null)
  }

  const handleTicketUpdate = () => {
    // Refresh both tickets list and stats after update
    refreshTickets()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Tickets</h1>
          <p className="text-sm text-gray-600 mt-1">
            View and manage all support tickets and grievances
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
