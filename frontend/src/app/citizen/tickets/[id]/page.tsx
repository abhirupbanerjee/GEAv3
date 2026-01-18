/**
 * Citizen Ticket Detail Page
 *
 * Shows detailed view of a specific ticket including:
 * - Ticket information
 * - Status and priority
 * - Activity timeline with admin and citizen comments
 * - Comment form for adding new comments
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
  FiSend,
} from 'react-icons/fi';

interface TicketActivity {
  id: string;
  type: 'status_change' | 'admin_comment' | 'resolution' | 'citizen_comment';
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

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'status_change':
      return <FiCheckCircle className="w-4 h-4 text-blue-600" />;
    case 'admin_comment':
      return <FiMessageSquare className="w-4 h-4 text-purple-600" />;
    case 'citizen_comment':
      return <FiMessageSquare className="w-4 h-4 text-blue-600" />;
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
    case 'citizen_comment':
      return (
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
          Your Comment
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

const getActivityBgColor = (type: string) => {
  switch (type) {
    case 'admin_comment':
      return 'bg-purple-100';
    case 'citizen_comment':
      return 'bg-blue-100';
    case 'resolution':
      return 'bg-green-100';
    default:
      return 'bg-gray-100';
  }
};

const getMessageStyle = (type: string) => {
  switch (type) {
    case 'admin_comment':
      return 'bg-purple-50 border border-purple-100 rounded-lg p-3 text-gray-800';
    case 'citizen_comment':
      return 'bg-blue-50 border border-blue-100 rounded-lg p-3 text-gray-800';
    default:
      return 'text-gray-700';
  }
};

export default function CitizenTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !ticket) return;

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const response = await fetch(`/api/citizen/tickets/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() }),
      });

      const data = await response.json();

      if (data.success && data.activity) {
        // Add the new activity to the ticket
        setTicket(prev => prev ? {
          ...prev,
          activities: [...prev.activities, data.activity],
        } : null);
        setComment('');
      } else {
        setCommentError(data.error || 'Failed to add comment');
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      setCommentError('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

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

  const isTicketClosed = ticket.status.toLowerCase() === 'closed';

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
          {ticket.activities.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity yet.</p>
          ) : (
            ticket.activities.map((activity, index) => (
              <div key={activity.id} className="relative flex gap-4">
                {/* Timeline Line */}
                {index < ticket.activities.length - 1 && (
                  <div className="absolute left-5 top-10 w-0.5 h-full -ml-px bg-gray-200" />
                )}

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityBgColor(activity.type)}`}
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
                  <p className={`text-sm ${getMessageStyle(activity.type)}`}>
                    {activity.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Form */}
        {!isTicketClosed && (
          <form onSubmit={handleSubmitComment} className="mt-6 pt-6 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add a Comment
            </label>
            {commentError && (
              <div className="mb-2 text-sm text-red-600">{commentError}</div>
            )}
            <div className="flex gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Type your comment here..."
                rows={3}
                maxLength={2000}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                disabled={submittingComment}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {comment.length}/2000 characters
              </span>
              <button
                type="submit"
                disabled={!comment.trim() || submittingComment}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {submittingComment ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    Send Comment
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {isTicketClosed && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center">
              This ticket is closed. You cannot add new comments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
