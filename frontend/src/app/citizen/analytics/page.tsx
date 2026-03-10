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
  FiAlertTriangle,
  FiChevronRight,
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

interface RecentFeedback {
  id: string;
  entityName: string;
  serviceName: string;
  rating: number;
  status: string;
  createdAt: string;
}

interface RecentTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  statusColor: string;
  createdAt: string;
}

interface RecentGrievance {
  id: string;
  grievanceNumber: string;
  subject: string;
  status: string;
  statusColor: string;
  createdAt: string;
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
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [recentGrievances, setRecentGrievances] = useState<RecentGrievance[]>([]);
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

  const fetchRecentItems = async () => {
    try {
      const [fbRes, tkRes, grRes] = await Promise.all([
        fetch('/api/citizen/feedback'),
        fetch('/api/citizen/tickets'),
        fetch('/api/citizen/grievances'),
      ]);
      const [fbData, tkData, grData] = await Promise.all([
        fbRes.json(),
        tkRes.json(),
        grRes.json(),
      ]);
      if (fbData.success && fbData.feedback) {
        setRecentFeedback(fbData.feedback.slice(0, 5));
      }
      if (tkData.success && tkData.tickets) {
        setRecentTickets(tkData.tickets.slice(0, 5));
      }
      if (grData.success && grData.grievances) {
        setRecentGrievances(grData.grievances.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch recent items:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchRecentItems();
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

      {/* Recent Activity — Three Columns */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Feedback */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <FiMessageSquare className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Recent Feedback</h3>
            </div>
            {recentFeedback.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FiMessageSquare className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No feedback yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFeedback.map((item) => (
                  <a
                    key={item.id}
                    href="/citizen/feedback"
                    className="block p-3 border border-gray-100 rounded-lg hover:border-green-200 hover:bg-green-50/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.entityName} - {item.serviceName}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FiStar
                            key={star}
                            className={`w-3 h-3 ${star <= item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{item.createdAt}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
            {recentFeedback.length > 0 && (
              <a
                href="/citizen/feedback"
                className="flex items-center justify-center gap-1 mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                View All <FiChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Recent Tickets */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FiFileText className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Recent Tickets</h3>
            </div>
            {recentTickets.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FiFileText className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No tickets yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((item) => (
                  <a
                    key={item.id}
                    href={`/citizen/tickets/${item.id}`}
                    className="block p-3 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">{item.subject}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.statusColor}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-500">{item.createdAt}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
            {recentTickets.length > 0 && (
              <a
                href="/citizen/tickets"
                className="flex items-center justify-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All <FiChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Recent Grievances */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Recent Grievances</h3>
            </div>
            {recentGrievances.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FiAlertTriangle className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No grievances yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGrievances.map((item) => (
                  <a
                    key={item.id}
                    href={`/citizen/grievances/${item.id}`}
                    className="block p-3 border border-gray-100 rounded-lg hover:border-red-200 hover:bg-red-50/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">{item.subject}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.statusColor}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-500">{item.createdAt}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
            {recentGrievances.length > 0 && (
              <a
                href="/citizen/grievances"
                className="flex items-center justify-center gap-1 mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                View All <FiChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>
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
