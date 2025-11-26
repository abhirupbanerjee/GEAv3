/**
 * @pageContext
 * @title Service Request Analytics
 * @purpose View detailed analytics, trends, and visual charts for EA service requests over time
 * @audience staff
 * @features
 *   - Request volume trend charts over time
 *   - Status distribution visualizations
 *   - Completion rate metrics
 *   - Average processing time analysis
 *   - Entity-wise breakdown of requests
 *   - Service type popularity charts
 * @tips
 *   - Use date range filters to analyze specific time periods
 *   - MDA staff see analytics for their entity only
 *   - DTA administrators see system-wide analytics
 * @relatedPages
 *   - /admin/service-requests: View and manage service requests
 *   - /admin/analytics: Overall system analytics dashboard
 * @permissions
 *   - staff: View analytics for their assigned entity
 *   - admin: View analytics across all entities
 */

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface AnalyticsData {
  status_distribution: { status: string; count: string }[];
  monthly_trend: { month: string; count: string }[];
  top_services: { service_name: string; count: string }[];
  entity_distribution: { entity_name: string; count: string }[];
  average_processing_time: { status: string; avg_days: string }[];
  completion_rate: number;
  completion_stats: { completed: number; in_progress: number; total: number };
  weekly_trend: { week: string; count: string }[];
}

export default function ServiceRequestAnalyticsPage() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAnalytics();
    }
  }, [status]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/service-requests/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-yellow-500',
      in_progress: 'bg-blue-500',
      under_review: 'bg-purple-500',
      completed: 'bg-green-500',
      rejected: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Service Request Analytics</h1>
        <p className="text-gray-600 mt-1">Comprehensive insights and trends</p>
      </div>

      {/* Completion Rate Card */}
      <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Overall Completion Rate</h2>
            <div className="flex items-baseline space-x-2">
              <span className="text-5xl font-bold">{analytics.completion_rate}%</span>
              <span className="text-lg opacity-90">
                ({analytics.completion_stats.completed} of {analytics.completion_stats.total})
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90 mb-1">In Progress</div>
            <div className="text-2xl font-bold">{analytics.completion_stats.in_progress}</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requests by Status</h3>
          <div className="space-y-3">
            {analytics.status_distribution.map((item) => {
              const total = analytics.status_distribution.reduce(
                (sum, s) => sum + parseInt(s.count),
                0
              );
              const percentage = ((parseInt(item.count) / total) * 100).toFixed(1);

              return (
                <div key={item.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{item.status.replace('_', ' ')}</span>
                    <span className="font-semibold">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${getStatusColor(item.status)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Services</h3>
          <div className="space-y-3">
            {analytics.top_services.map((item, index) => {
              const maxCount = parseInt(analytics.top_services[0].count);
              const percentage = ((parseInt(item.count) / maxCount) * 100).toFixed(1);

              return (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate pr-2">{item.service_name}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend (Last 12 Months)</h3>
          <div className="space-y-2">
            {analytics.monthly_trend.map((item) => (
              <div key={item.month} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.month}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${(parseInt(item.count) / Math.max(...analytics.monthly_trend.map((m) => parseInt(m.count)))) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="font-semibold w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Average Processing Time */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Processing Time</h3>
          <div className="space-y-4">
            {analytics.average_processing_time.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm capitalize">{item.status.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {parseFloat(item.avg_days).toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Entity Distribution (Admin only) */}
      {session?.user?.roleType === 'admin' && analytics.entity_distribution.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requests by Entity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.entity_distribution.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">{item.entity_name}</div>
                <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{
                      width: `${(parseInt(item.count) / Math.max(...analytics.entity_distribution.map((e) => parseInt(e.count)))) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
