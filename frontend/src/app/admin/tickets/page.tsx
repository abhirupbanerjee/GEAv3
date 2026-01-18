/**
 * @pageContext
 * @title Tickets
 * @purpose View, manage, and respond to all citizen support tickets and grievances in a centralized management dashboard
 * @audience staff
 * @features
 *   - Comprehensive ticket list with search and filtering
 *   - Filter by status: Open, In Progress, Waiting, Resolved, Closed
 *   - Filter by priority: Critical, High, Medium, Low
 *   - Filter by category: Feedback, Grievance, EA Service Request
 *   - Filter by entity and service
 *   - Search by ticket number, subject, or keywords
 *   - Statistics cards showing ticket counts and SLA metrics
 *   - Click ticket row to view detailed information
 *   - Bulk actions for multiple tickets
 *   - Priority color coding (red=critical, orange=high, yellow=medium, green=low)
 * @steps
 *   - Review statistics cards at the top for quick overview
 *   - Use filters to narrow down tickets by status, priority, category, or entity
 *   - Search for specific tickets using ticket number or keywords
 *   - Click on any ticket row to open the detail view
 *   - Update ticket status and add notes in the detail modal
 *   - Assign or escalate tickets as needed
 * @tips
 *   - Tickets are color-coded by priority for quick visual scanning
 *   - SLA indicators show time remaining to respond (red when overdue)
 *   - MDA staff see only tickets assigned to their entity
 *   - Use status filters to focus on actionable items (Open, In Progress)
 *   - Internal notes are never visible to citizens - use for coordination
 * @relatedPages
 *   - /admin/analytics: View ticket analytics and performance metrics
 *   - /admin/service-requests: Manage EA service requests
 *   - /helpdesk: Public ticket tracking portal
 * @permissions
 *   - staff: Can view and manage tickets for their assigned entity
 *   - admin: Can view and manage all tickets across all entities
 * @troubleshooting
 *   - Issue: Can't see all tickets | Solution: Staff users only see tickets for their entity - contact admin for broader access
 *   - Issue: Can't update ticket status | Solution: Ensure you have proper permissions and the ticket is not already closed
 *   - Issue: Filters not working | Solution: Clear all filters and try again, or refresh the page
 */

'use client'

import React, { Suspense } from 'react'
import { TicketDashboard } from '@/components/admin/tickets/TicketDashboard'

// Loading fallback for Suspense (required for useSearchParams)
function TicketDashboardFallback() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-600 mt-1">Loading...</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminTicketsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<TicketDashboardFallback />}>
          <TicketDashboard />
        </Suspense>
      </div>
    </div>
  )
}
