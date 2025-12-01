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
}

export default function StaffHomePage() {
  const { data: session } = useSession();
  const [entityInfo, setEntityInfo] = useState<EntityInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEntityInfo = useCallback(async () => {
    if (!session?.user?.entityId) return;

    try {
      const response = await fetch(`/api/admin/entities/${session.user.entityId}`);
      if (response.ok) {
        const data = await response.json();
        setEntityInfo(data.data.entity);
      }
    } catch (error) {
      console.error('Error fetching entity info:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.entityId]);

  useEffect(() => {
    if (session?.user?.entityId) {
      fetchEntityInfo();
    }
  }, [session?.user?.entityId, fetchEntityInfo]);

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

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
