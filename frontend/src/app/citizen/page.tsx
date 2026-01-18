/**
 * Citizen Portal Dashboard
 *
 * Main dashboard showing:
 * - Summary cards (tickets, feedback, grievances)
 * - Recent activity
 * - Quick actions
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiFileText,
  FiMessageSquare,
  FiAlertTriangle,
  FiClock,
  FiCheckCircle,
  FiLoader,
  FiExternalLink,
} from 'react-icons/fi';

interface DashboardStats {
  tickets: {
    total: number;
    open: number;
    resolved: number;
  };
  feedback: {
    total: number;
    pending: number;
  };
  grievances: {
    total: number;
    open: number;
  };
}

interface RecentItem {
  id: string;
  type: 'ticket' | 'feedback' | 'grievance';
  title: string;
  status: string;
  statusColor: string;
  date: string;
  href: string;
}

export default function CitizenDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch('/api/citizen/dashboard');
        const data = await response.json();

        if (data.success) {
          setStats(data.stats);
          setRecentItems(data.recentItems || []);
        } else {
          // Set default empty state
          setStats({
            tickets: { total: 0, open: 0, resolved: 0 },
            feedback: { total: 0, pending: 0 },
            grievances: { total: 0, open: 0 },
          });
          setRecentItems([]);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
        // Set default empty state on error
        setStats({
          tickets: { total: 0, open: 0, resolved: 0 },
          feedback: { total: 0, pending: 0 },
          grievances: { total: 0, open: 0 },
        });
        setRecentItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome to the GEA Citizen Portal. Track your tickets, feedback, and grievances.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tickets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">My Tickets</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.tickets.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1 text-yellow-600">
              <FiClock className="w-3 h-3" />
              {stats?.tickets.open || 0} Open
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <FiCheckCircle className="w-3 h-3" />
              {stats?.tickets.resolved || 0} Resolved
            </span>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">My Feedback</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.feedback.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiMessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1 text-yellow-600">
              <FiClock className="w-3 h-3" />
              {stats?.feedback.pending || 0} Pending
            </span>
          </div>
        </div>

        {/* Grievances */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Grievances</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.grievances.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FiAlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1 text-red-600">
              <FiClock className="w-3 h-3" />
              {stats?.grievances.open || 0} Open
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200">
              <FiMessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Give Feedback</p>
              <p className="text-xs text-gray-500">Rate services & report issues</p>
            </div>
          </Link>

          <Link
            href="/helpdesk"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200">
              <FiExternalLink className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Track Ticket</p>
              <p className="text-xs text-gray-500">Check ticket status</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {recentItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiClock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No recent activity</p>
            <p className="text-sm mt-1">Your tickets and feedback will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentItems.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.type === 'ticket' ? 'bg-blue-100' :
                    item.type === 'feedback' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {item.type === 'ticket' && <FiFileText className="w-4 h-4 text-blue-600" />}
                    {item.type === 'feedback' && <FiMessageSquare className="w-4 h-4 text-green-600" />}
                    {item.type === 'grievance' && <FiAlertTriangle className="w-4 h-4 text-red-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${item.statusColor}`}>
                  {item.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
