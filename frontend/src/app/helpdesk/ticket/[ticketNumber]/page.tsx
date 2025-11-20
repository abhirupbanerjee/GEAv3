'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TicketDetails {
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  status_code: string;
  priority: string;
  priority_code: string;
  service_name: string;
  service_id: string;
  entity_name: string;
  entity_id: string;
  requester_category: string;
  feedback_id: number;
  created_at: string;
  updated_at: string;
}

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const ticketNumber = params.ticketNumber as string;

  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/helpdesk/ticket/${ticketNumber}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || data.error || 'Failed to fetch ticket');
          setTicket(null);
        } else {
          setTicket(data.ticket);
          setError('');
        }
      } catch (err) {
        setError('An error occurred while fetching ticket details');
        setTicket(null);
      } finally {
        setLoading(false);
      }
    };

    if (ticketNumber) {
      fetchTicket();
    }
  }, [ticketNumber]);

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in progress':
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Error Icon */}
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-12 h-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Ticket Not Found
              </h1>
              <p className="text-lg text-gray-600 mb-6">{error}</p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Please check:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• The ticket number is correct: <span className="font-mono">{ticketNumber}</span></li>
                <li>• The format is YYYYMM-XXXXXX (e.g., 202511-123456)</li>
                <li>• The ticket exists in the system</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/helpdesk')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Search Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg border-2 border-gray-300 transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/helpdesk')}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Helpdesk
          </button>
        </div>

        {/* Ticket Details Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Ticket Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  Ticket Number
                </p>
                <h1 className="text-3xl font-bold text-white">
                  #{ticket.ticket_number}
                </h1>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-4 py-2 rounded-lg font-semibold border ${getStatusColor(
                    ticket.status
                  )}`}
                >
                  {ticket.status}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="px-8 py-6 space-y-6">
            {/* Priority and Category */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-500 mb-1 block">
                  Priority
                </label>
                <span
                  className={`inline-block px-3 py-1 rounded-md text-sm font-semibold border ${getPriorityColor(
                    ticket.priority
                  )}`}
                >
                  {ticket.priority}
                </span>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-500 mb-1 block">
                  Requester Type
                </label>
                <p className="text-gray-900 capitalize">{ticket.requester_category}</p>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-medium text-gray-500 mb-1 block">
                Subject
              </label>
              <h2 className="text-xl font-semibold text-gray-900">
                {ticket.subject}
              </h2>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">
                Description
              </label>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {ticket.description}
                </pre>
              </div>
            </div>

            {/* Service and Entity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">
                  Service
                </label>
                <p className="text-gray-900">{ticket.service_name}</p>
                <p className="text-xs text-gray-500 mt-1">{ticket.service_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">
                  Department
                </label>
                <p className="text-gray-900">{ticket.entity_name}</p>
                <p className="text-xs text-gray-500 mt-1">{ticket.entity_id}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">
                  Created
                </label>
                <p className="text-gray-900">
                  {new Date(ticket.created_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">
                  Last Updated
                </label>
                <p className="text-gray-900">
                  {new Date(ticket.updated_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            </div>

            {/* Feedback Reference */}
            {ticket.feedback_id && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This ticket was automatically created from
                  feedback submission #{ticket.feedback_id}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/helpdesk')}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition-colors"
              >
                Track Another Ticket
              </button>
              <button
                onClick={() => router.push('/feedback')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Submit New Feedback
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
