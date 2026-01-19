/**
 * Citizen Tickets List Page
 *
 * Shows all tickets submitted by the logged-in citizen.
 * Features:
 * - List of tickets with status
 * - Quick link to submit new ticket
 * - Filter by status
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiFileText,
  FiClock,
  FiLoader,
  FiChevronRight,
  FiFilter,
  FiSearch,
  FiX,
} from 'react-icons/fi';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  statusColor: string;
  priority: string;
  priorityColor: string;
  createdAt: string;
  updatedAt: string;
  assignedEntity: string;
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Tickets' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'open':
      return 'bg-yellow-100 text-yellow-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-orange-100 text-orange-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function CitizenTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const response = await fetch('/api/citizen/tickets');
        const data = await response.json();

        if (data.success && data.tickets) {
          setTickets(data.tickets);
        } else {
          // No tickets or error - show empty state
          setTickets([]);
        }
      } catch (error) {
        console.error('Failed to load tickets:', error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    // Apply status filter
    const matchesStatus = statusFilter === 'all' ||
      ticket.status.toLowerCase().replace(' ', '_') === statusFilter;

    // Apply search filter (by ticket number)
    const matchesSearch = !searchQuery.trim() ||
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase().trim());

    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
        <p className="text-sm text-gray-600 mt-1">
          Track and manage your submitted tickets
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Search by ticket number */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket number (e.g., 202501-123456)"
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <FiFilter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 mr-2">Filter by status:</span>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                statusFilter === option.value
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <FiFileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'all' ? 'No tickets yet' : 'No tickets found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {statusFilter === 'all'
                ? 'Submit feedback to create a ticket for tracking issues or requests.'
                : 'Try selecting a different filter.'}
            </p>
            {statusFilter === 'all' && (
              <Link
                href="/citizen/feedback/submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Give Feedback
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/citizen/tickets/${ticket.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiFileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">
                        {ticket.ticketNumber}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.statusColor}`}>
                        {ticket.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.priorityColor}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mt-1 truncate">
                      {ticket.subject}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        Created: {ticket.createdAt}
                      </span>
                      <span>Assigned to: {ticket.assignedEntity}</span>
                    </div>
                  </div>
                </div>
                <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
