/**
 * @pageContext
 * @title Staff Home
 * @purpose Dashboard landing page for MDA staff users with entity-specific data and quick actions
 * @audience staff
 * @features
 *   - Entity-specific statistics and metrics
 *   - Quick links to common staff tasks
 *   - Recent activity feed for assigned entity
 *   - Service request summary
 *   - Ticket queue overview
 * @tips
 *   - Data shown is filtered to your assigned entity only
 *   - Use quick action buttons for common tasks
 * @relatedPages
 *   - /admin/service-requests: View and create service requests
 *   - /admin/service-requests/new: Submit new EA service request
 *   - /admin/analytics: View analytics for your entity
 * @permissions
 *   - staff: Full access to dashboard with entity-scoped data
 */

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface EntityInfo {
  entity_name: string;
  entity_code: string;
  is_service_provider?: boolean;
}

interface ReceivedRequestStats {
  total: number;
  pending: number;
  in_progress: number;
}

interface RecentRequest {
  request_number: string;
  requester_name: string;
  status: string;
  service_name: string;
  entity_name: string;
  created_at: string;
}

export default function StaffHomePage() {
  const { data: session } = useSession();
  const [entityInfo, setEntityInfo] = useState<EntityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isServiceProvider, setIsServiceProvider] = useState(false);
  const [receivedStats, setReceivedStats] = useState<ReceivedRequestStats | null>(null);
  const [recentReceivedRequests, setRecentReceivedRequests] = useState<RecentRequest[]>([]);

  const fetchEntityInfo = useCallback(async () => {
    if (!session?.user?.entityId) return;

    try {
      const response = await fetch(`/api/admin/entities/${session.user.entityId}`);
      if (response.ok) {
        const data = await response.json();
        setEntityInfo(data.entity);
        setIsServiceProvider(data.entity?.is_service_provider === true);
      }
    } catch (error) {
      console.error('Error fetching entity info:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.entityId]);

  // Fetch received request stats for service providers
  const fetchReceivedStats = useCallback(async () => {
    if (!isServiceProvider) return;

    try {
      const response = await fetch('/api/admin/service-requests/stats?view=received');
      if (response.ok) {
        const data = await response.json();
        const stats = data.data.stats;
        setReceivedStats({
          total: stats.total || 0,
          pending: stats.submitted || 0,
          in_progress: stats.in_progress || 0,
        });
        setRecentReceivedRequests(data.data.recent_requests || []);
      }
    } catch (error) {
      console.error('Error fetching received stats:', error);
    }
  }, [isServiceProvider]);

  useEffect(() => {
    if (session?.user?.entityId) {
      fetchEntityInfo();
    }
  }, [session?.user?.entityId, fetchEntityInfo]);

  useEffect(() => {
    if (isServiceProvider) {
      fetchReceivedStats();
    }
  }, [isServiceProvider, fetchReceivedStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Government of Grenada EA Portal
        </h1>
        <h2 className="text-xl text-gray-600">Staff Home</h2>
        {entityInfo && (
          <p className="text-sm text-gray-500 mt-1">
            {entityInfo.entity_name} ({entityInfo.entity_code})
          </p>
        )}
      </div>

      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Welcome, {session?.user?.name || session?.user?.email}
        </h3>
        <div className="prose prose-blue max-w-none text-gray-700 space-y-3">
          <p>
            Welcome to your staff dashboard. Here you can manage service requests and view
            analytics for your entity.
          </p>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
            <h4 className="font-semibold text-green-900 mb-2">Your Access:</h4>
            <ul className="space-y-2 text-green-900">
              <li className="flex items-start">
                <span className="mr-2">📋</span>
                <div>
                  <strong>Service Requests:</strong> View and track service requests for your entity
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📊</span>
                <div>
                  <strong>Request Analytics:</strong> View analytics and trends for your entity
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-2">💬</span>
                <div>
                  <strong>Comments & Updates:</strong> View status changes and admin comments on requests
                </div>
              </li>
            </ul>
          </div>

          <p className="text-sm text-gray-500 italic mt-4">
            You have view-only access to data for {entityInfo?.entity_name}.
          </p>
        </div>
      </div>

      {/* Received Requests Section - Only for Service Providers */}
      {isServiceProvider && receivedStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Requests Received
            </h3>
            <Link
              href="/admin/service-requests?view=received"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{receivedStats.total}</p>
              <p className="text-sm text-gray-600">Total Received</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{receivedStats.pending}</p>
              <p className="text-sm text-gray-600">Pending Review</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{receivedStats.in_progress}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </div>

          {/* Recent Received Requests */}
          {recentReceivedRequests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Requests</h4>
              <div className="space-y-2">
                {recentReceivedRequests.slice(0, 3).map((request, index) => (
                  <Link
                    key={index}
                    href={`/admin/service-requests?search=${request.request_number}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {request.request_number}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        From: {request.entity_name} • {request.service_name}
                      </p>
                    </div>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      request.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recentReceivedRequests.length === 0 && (
            <p className="text-center text-gray-500 py-4">No requests received yet</p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Received Requests - Only for service providers */}
          {isServiceProvider && (
            <Link
              href="/admin/service-requests?view=received"
              className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Requests Received</h4>
                <p className="text-sm text-gray-600">Manage incoming service requests</p>
              </div>
            </Link>
          )}

          <Link
            href="/admin/service-requests"
            className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">View Service Requests</h4>
              <p className="text-sm text-gray-600">Browse and track all service requests</p>
            </div>
          </Link>

          <Link
            href="/admin/service-requests/analytics"
            className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">View Analytics</h4>
              <p className="text-sm text-gray-600">See trends and insights</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
