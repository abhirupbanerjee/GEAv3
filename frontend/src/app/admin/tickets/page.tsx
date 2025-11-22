/**
 * Admin Tickets Management Page
 *
 * Main page for viewing and managing all tickets/grievances
 * Replaces the old "Submit Ticket" form with a comprehensive dashboard
 */

'use client'

import React from 'react'
import { TicketDashboard } from '@/components/admin/tickets/TicketDashboard'

export default function AdminTicketsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <TicketDashboard />
      </div>
    </div>
  )
}
