/**
 * Citizen Grievance Detail Page
 *
 * Shows detailed view of a specific grievance including:
 * - Grievance information
 * - Status and priority
 * - Investigation timeline
 * - Admin responses
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
  FiAlertTriangle,
  FiCalendar,
  FiExternalLink,
} from 'react-icons/fi';

interface GrievanceActivity {
  id: string;
  type: 'status_change' | 'admin_comment' | 'resolution' | 'escalation';
  message: string;
  timestamp: string;
  user?: string;
}

interface GrievanceDetail {
  id: string;
  grievanceNumber: string;
  subject: string;
  description: string;
  status: string;
  statusColor: string;
  priority: string;
  priorityColor: string;
  entityName: string;
  source: 'direct' | 'escalated_feedback';
  feedbackId?: string;
  createdAt: string;
  updatedAt: string;
  activities: GrievanceActivity[];
}

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'open':
      return 'bg-yellow-100 text-yellow-800';
    case 'under_investigation':
      return 'bg-blue-100 text-blue-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800';
    case 'escalated':
      return 'bg-red-100 text-red-800';
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

const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'status_change':
      return <FiClock className="w-4 h-4 text-blue-600" />;
    case 'admin_comment':
      return <FiMessageSquare className="w-4 h-4 text-purple-600" />;
    case 'resolution':
      return <FiCheckCircle className="w-4 h-4 text-green-600" />;
    case 'escalation':
      return <FiAlertTriangle className="w-4 h-4 text-red-600" />;
    default:
      return <FiClock className="w-4 h-4 text-gray-600" />;
  }
};

const getActivityBadge = (type: string) => {
  switch (type) {
    case 'admin_comment':
      return (
        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
          Official Response
        </span>
      );
    case 'resolution':
      return (
        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
          Resolution
        </span>
      );
    case 'escalation':
      return (
        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
          Escalation
        </span>
      );
    default:
      return null;
  }
};

export default function CitizenGrievanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [grievance, setGrievance] = useState<GrievanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGrievance = async () => {
      try {
        const response = await fetch(`/api/citizen/grievances/${params.id}`);
        const data = await response.json();

        if (data.success && data.grievance) {
          setGrievance(data.grievance);
        } else {
          setError(data.error || 'Grievance not found');
        }
      } catch (err) {
        console.error('Failed to load grievance:', err);
        setError('Failed to load grievance details');
      } finally {
        setLoading(false);
      }
    };

    loadGrievance();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="text-center py-12">
        <FiAlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {error || 'Grievance not found'}
        </h3>
        <p className="text-gray-500 mb-6">
          The grievance you&apos;re looking for could not be found.
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
        href="/citizen/grievances"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FiArrowLeft className="w-4 h-4" />
        Back to Grievances
      </Link>

      {/* Grievance Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-sm font-mono text-gray-500">
                {grievance.grievanceNumber}
              </span>
              <span className={`text-sm px-2.5 py-1 rounded-full ${grievance.statusColor}`}>
                {formatStatus(grievance.status)}
              </span>
              <span className={`text-sm px-2.5 py-1 rounded-full ${grievance.priorityColor}`}>
                {grievance.priority} Priority
              </span>
              {grievance.source === 'escalated_feedback' && (
                <span className="text-sm px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                  From Feedback
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{grievance.subject}</h1>
          </div>
        </div>

        {/* Grievance Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <FiUser className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Assigned To</p>
              <p className="text-sm font-medium text-gray-900">{grievance.entityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm font-medium text-gray-900">{grievance.createdAt}</p>
            </div>
          </div>
          {grievance.feedbackId && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <FiExternalLink className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Original Feedback</p>
                <p className="text-sm font-medium text-purple-600">{grievance.feedbackId}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{grievance.description}</p>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Investigation Timeline</h2>
        <div className="space-y-6">
          {grievance.activities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4">
              {/* Timeline Line */}
              {index < grievance.activities.length - 1 && (
                <div className="absolute left-5 top-10 w-0.5 h-full -ml-px bg-gray-200" />
              )}

              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'admin_comment'
                    ? 'bg-purple-100'
                    : activity.type === 'resolution'
                    ? 'bg-green-100'
                    : activity.type === 'escalation'
                    ? 'bg-red-100'
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
            <strong>Need to escalate further?</strong> If you are not satisfied with the
            handling of this grievance, you can contact the Office of the Ombudsman for
            further assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
