/**
 * Citizen Analytics Page
 *
 * Shows statistics and charts for the citizen's:
 * - Feedback: total, average rating, rating distribution
 * - Tickets: total, status distribution
 *
 * Features a refresh button to bypass cache and fetch fresh data.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  FiRefreshCw,
  FiMessageSquare,
  FiFileText,
  FiStar,
  FiLoader,
} from 'react-icons/fi';

interface AnalyticsData {
  feedback: {
    total: number;
    averageRating: number | null;
    ratingBreakdown: { rating: number; count: number }[];
  };
  tickets: {
    total: number;
    statusBreakdown: { status: string; count: number }[];
  };
  cached?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-yellow-500',
  'In Progress': 'bg-blue-500',
  Resolved: 'bg-green-500',
  Closed: 'bg-gray-500',
};

const RATING_COLORS: Record<number, string> = {
  5: 'bg-green-500',
  4: 'bg-lime-500',
  3: 'bg-yellow-500',
  2: 'bg-orange-500',
  1: 'bg-red-500',
};

export default function CitizenAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (refresh: boolean = false) => {
    try {
      if (refresh) setRefreshing(true);
      const url = refresh ? '/api/citizen/analytics?refresh=true' : '/api/citizen/analytics';
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  // Calculate max values for bar scaling
  const maxRatingCount = data?.feedback.ratingBreakdown
    ? Math.max(...data.feedback.ratingBreakdown.map((r) => r.count), 1)
    : 1;

  const maxStatusCount = data?.tickets.statusBreakdown
    ? Math.max(...data.tickets.statusBreakdown.map((s) => s.count), 1)
    : 1;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">
            Overview of your feedback and ticket statistics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Feedback */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Feedback</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {data?.feedback.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiMessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-3xl font-bold text-gray-900">
                  {data?.feedback.averageRating !== null
                    ? data.feedback.averageRating.toFixed(1)
                    : '-'}
                </p>
                <span className="text-lg text-gray-500">/5</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiStar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Total Tickets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {data?.tickets.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h2>
          {data?.feedback.ratingBreakdown && data.feedback.ratingBreakdown.some((r) => r.count > 0) ? (
            <div className="space-y-3">
              {data.feedback.ratingBreakdown.map((item) => (
                <div key={item.rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700">{item.rating}</span>
                    <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                  </div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${RATING_COLORS[item.rating] || 'bg-gray-500'} transition-all duration-500`}
                      style={{
                        width: `${(item.count / maxRatingCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiStar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No ratings yet</p>
              <p className="text-sm mt-1">Submit feedback to see rating distribution</p>
            </div>
          )}
        </div>

        {/* Ticket Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Status</h2>
          {data?.tickets.statusBreakdown && data.tickets.statusBreakdown.length > 0 ? (
            <div className="space-y-3">
              {data.tickets.statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0 truncate">
                    {item.status}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${STATUS_COLORS[item.status] || 'bg-gray-500'} transition-all duration-500`}
                      style={{
                        width: `${(item.count / maxStatusCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiFileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No tickets yet</p>
              <p className="text-sm mt-1">Submit feedback to create tickets</p>
            </div>
          )}
        </div>
      </div>

      {/* Cache indicator */}
      {data?.cached && (
        <p className="text-xs text-gray-400 text-center">
          Data cached for performance. Click Refresh for latest data.
        </p>
      )}
    </div>
  );
}
