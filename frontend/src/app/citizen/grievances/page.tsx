/**
 * Citizen Grievances List Page
 *
 * Shows all grievances submitted by or escalated for the logged-in citizen.
 * Features:
 * - List of grievances with status
 * - Timeline of grievance handling
 * - Link to view details
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiAlertTriangle,
  FiClock,
  FiLoader,
  FiChevronRight,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';

interface Grievance {
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

export default function CitizenGrievancesPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGrievances = async () => {
      try {
        const response = await fetch('/api/citizen/grievances');
        const data = await response.json();

        if (data.success && data.grievances) {
          setGrievances(data.grievances);
        } else {
          setGrievances([]);
        }
      } catch (error) {
        console.error('Failed to load grievances:', error);
        setGrievances([]);
      } finally {
        setLoading(false);
      }
    };

    loadGrievances();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900">My Grievances</h1>
        <p className="text-sm text-gray-600 mt-1">
          Track formal complaints and escalated issues
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{grievances.length}</p>
              <p className="text-sm text-gray-600">Total Grievances</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiClock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {
                  grievances.filter(
                    (g) => g.status === 'open' || g.status === 'under_investigation'
                  ).length
                }
              </p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {
                  grievances.filter(
                    (g) => g.status === 'resolved' || g.status === 'closed'
                  ).length
                }
              </p>
              <p className="text-sm text-gray-600">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grievances List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {grievances.length === 0 ? (
          <div className="text-center py-12">
            <FiAlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No grievances</h3>
            <p className="text-gray-500">
              Grievances are created when feedback is escalated or when you file a formal
              complaint.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {grievances.map((grievance) => (
              <Link
                key={grievance.id}
                href={`/citizen/grievances/${grievance.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FiAlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">
                        {grievance.grievanceNumber}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${grievance.statusColor}`}
                      >
                        {formatStatus(grievance.status)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${grievance.priorityColor}`}
                      >
                        {grievance.priority}
                      </span>
                      {grievance.source === 'escalated_feedback' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          From Feedback
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 mt-1 truncate">
                      {grievance.subject}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        Created: {grievance.createdAt}
                      </span>
                      <span>Entity: {grievance.entityName}</span>
                    </div>
                  </div>
                </div>
                <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-900 font-medium">About Grievances</p>
          <p className="text-sm text-red-700 mt-1">
            Grievances are formal complaints about government services. They are created when
            feedback is flagged as a serious issue or when you file a formal complaint
            directly. Grievances are handled with higher priority and involve formal
            investigation.
          </p>
        </div>
      </div>
    </div>
  );
}
