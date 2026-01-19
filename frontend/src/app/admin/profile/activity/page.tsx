/**
 * Admin/Staff Recent Activity Page
 *
 * Shows recent activity log for the logged-in user:
 * - Login/logout events
 * - Resource modifications
 * - Settings changes
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiActivity,
  FiLoader,
  FiClock,
  FiUser,
  FiSettings,
  FiFileText,
  FiMessageSquare,
  FiDatabase,
  FiLogIn,
  FiLogOut,
  FiEdit,
  FiPlus,
  FiTrash2,
  FiArrowLeft,
  FiRefreshCw,
} from 'react-icons/fi';

interface Activity {
  id: number;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  description: string;
  createdAt: string;
}

const getActivityIcon = (action: string) => {
  if (action.includes('login')) return <FiLogIn className="w-4 h-4" />;
  if (action.includes('logout')) return <FiLogOut className="w-4 h-4" />;
  if (action.includes('created')) return <FiPlus className="w-4 h-4" />;
  if (action.includes('updated')) return <FiEdit className="w-4 h-4" />;
  if (action.includes('deleted')) return <FiTrash2 className="w-4 h-4" />;
  if (action.includes('user')) return <FiUser className="w-4 h-4" />;
  if (action.includes('settings')) return <FiSettings className="w-4 h-4" />;
  if (action.includes('ticket')) return <FiFileText className="w-4 h-4" />;
  if (action.includes('feedback')) return <FiMessageSquare className="w-4 h-4" />;
  if (action.includes('entity') || action.includes('service')) return <FiDatabase className="w-4 h-4" />;
  return <FiActivity className="w-4 h-4" />;
};

const getActivityColor = (action: string): string => {
  if (action.includes('login')) return 'bg-green-100 text-green-600';
  if (action.includes('logout')) return 'bg-gray-100 text-gray-600';
  if (action.includes('created')) return 'bg-blue-100 text-blue-600';
  if (action.includes('updated')) return 'bg-yellow-100 text-yellow-600';
  if (action.includes('deleted')) return 'bg-red-100 text-red-600';
  return 'bg-purple-100 text-purple-600';
};

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = async () => {
    try {
      const response = await fetch('/api/admin/activity?limit=50');
      const data = await response.json();

      if (data.success) {
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivity();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatFullDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
        <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/profile"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1>
            <p className="text-sm text-gray-600 mt-1">Your recent actions in the portal</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <FiActivity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
            <p className="text-gray-500">Your actions in the portal will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className={`p-2 rounded-full ${getActivityColor(activity.action)}`}>
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <FiClock className="w-3 h-3 text-gray-400" />
                    <span
                      className="text-xs text-gray-500"
                      title={formatFullDate(activity.createdAt)}
                    >
                      {formatDate(activity.createdAt)}
                    </span>
                    {activity.resourceType && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500 capitalize">
                          {activity.resourceType.replace(/_/g, ' ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      {activities.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing last {activities.length} activities
        </p>
      )}
    </div>
  );
}
