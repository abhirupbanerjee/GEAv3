/**
 * Citizen Ticket Detail Page
 *
 * Shows detailed view of a specific ticket including:
 * - Ticket information
 * - Status and priority
 * - Activity timeline with admin comments
 * - Any attachments
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiClock,
  FiCheckCircle,
  FiLoader,
  FiMessageSquare,
  FiUser,
  FiAlertCircle,
  FiFileText,
  FiMapPin,
  FiCalendar,
} from 'react-icons/fi';

interface TicketActivity {
  id: string;
  type: 'status_change' | 'admin_comment' | 'resolution';
  message: string;
  timestamp: string;
  user?: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  statusColor: string;
  priority: string;
  priorityColor: string;
  category: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  assignedEntity: string;
  activities: TicketActivity[];
}

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

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'status_change':
      return <FiCheckCircle className="w-4 h-4 text-blue-600" />;
    case 'admin_comment':
      return <FiMessageSquare className="w-4 h-4 text-purple-600" />;
    case 'resolution':
      return <FiCheckCircle className="w-4 h-4 text-green-600" />;
    default:
      return <FiClock className="w-4 h-4 text-gray-600" />;
  }
};

const getActivityBadge = (type: string) => {
  switch (type) {
    case 'admin_comment':
      return (
        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
          Admin Response
        </span>
      );
    case 'resolution':
      return (
        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
          Resolution
        </span>
      );
    default:
      return null;
  }
};

export default function CitizenTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTicket = async () => {
      try {
        const response = await fetch(`/api/citizen/tickets/${params.id}`);
        const data = await response.json();

        if (data.success && data.ticket) {
          setTicket(data.ticket);
        } else {
          setError(data.error || 'Ticket not found');
        }
      } catch (err) {
        console.error('Failed to load ticket:', err);
        setError('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <FiAlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Ticket not found'}
        </h3>
        <p className="text-gray-500 mb-6">
          The ticket you&apos;re looking for could not be found.
        </p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/citizen/tickets"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FiArrowLeft className="w-4 h-4" />
        Back to My Tickets
      </Link>

      {/* Ticket Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-sm font-mono text-gray-500">
                {ticket.ticketNumber}
              </span>
              <span className={`text-sm px-2.5 py-1 rounded-full ${ticket.statusColor}`}>
                {ticket.status}
              </span>
              <span className={`text-sm px-2.5 py-1 rounded-full ${ticket.priorityColor}`}>
                {ticket.priority} Priority
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
          </div>
        </div>

        {/* Ticket Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <FiFileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Category</p>
              <p className="text-sm font-medium text-gray-900">{ticket.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <FiUser className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Assigned To</p>
              <p className="text-sm font-medium text-gray-900">{ticket.assignedEntity}</p>
            </div>
          </div>
          {ticket.location && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <FiMapPin className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900">{ticket.location}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm font-medium text-gray-900">{ticket.createdAt}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Activity</h2>
        <div className="space-y-6">
          {ticket.activities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4">
              {/* Timeline Line */}
              {index < ticket.activities.length - 1 && (
                <div className="absolute left-5 top-10 w-0.5 h-full -ml-px bg-gray-200" />
              )}

              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'admin_comment'
                    ? 'bg-purple-100'
                    : activity.type === 'resolution'
                    ? 'bg-green-100'
                    : 'bg-blue-100'
                }`}
              >
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {activity.user && (
                    <span className="text-sm font-medium text-gray-900">
                      {activity.user}
                    </span>
                  )}
                  {getActivityBadge(activity.type)}
                  <span className="text-xs text-gray-500">{activity.timestamp}</span>
                </div>
                <p
                  className={`text-sm ${
                    activity.type === 'admin_comment'
                      ? 'bg-purple-50 border border-purple-100 rounded-lg p-3 text-gray-800'
                      : 'text-gray-700'
                  }`}
                >
                  {activity.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
        <FiAlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-700">
            <strong>Need to add more information?</strong> If you have additional details about this issue,
            please submit a new ticket referencing this ticket number ({ticket.ticketNumber}).
          </p>
        </div>
      </div>
    </div>
  );
}
