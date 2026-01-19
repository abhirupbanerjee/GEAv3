/**
 * Citizen Portal Home Page
 *
 * Simple welcome page with navigation cards to main sections:
 * - Analytics
 * - My Tickets
 * - Give Feedback
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiBarChart2,
  FiFileText,
  FiMessageSquare,
  FiLoader,
  FiArrowRight,
} from 'react-icons/fi';

interface CitizenUser {
  name: string | null;
  phone: string;
}

export default function CitizenHome() {
  const [user, setUser] = useState<CitizenUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/citizen/auth/check');
        const data = await response.json();
        if (data.authenticated && data.citizen) {
          setUser({
            name: data.citizen.name,
            phone: data.citizen.phone,
          });
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const displayName = user?.name || 'Citizen';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {displayName}!
        </h1>
        <p className="text-gray-600 mt-2 max-w-md mx-auto">
          Access your citizen services, track tickets, and provide feedback on government services.
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Analytics Card */}
        <Link
          href="/citizen/analytics"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
            <FiBarChart2 className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics</h2>
          <p className="text-gray-600 text-sm mb-4">
            View your feedback statistics, ratings, and ticket status breakdown.
          </p>
          <span className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium group-hover:gap-2 transition-all">
            View Analytics
            <FiArrowRight className="w-4 h-4" />
          </span>
        </Link>

        {/* Tickets Card */}
        <Link
          href="/citizen/tickets"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all"
        >
          <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
            <FiFileText className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">My Tickets</h2>
          <p className="text-gray-600 text-sm mb-4">
            Track and manage your submitted tickets and view their current status.
          </p>
          <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium group-hover:gap-2 transition-all">
            View Tickets
            <FiArrowRight className="w-4 h-4" />
          </span>
        </Link>

        {/* Give Feedback Card */}
        <Link
          href="/citizen/feedback/submit"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-purple-300 transition-all"
        >
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
            <FiMessageSquare className="w-7 h-7 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Give Feedback</h2>
          <p className="text-gray-600 text-sm mb-4">
            Rate government services, report issues, and help improve public services.
          </p>
          <span className="inline-flex items-center gap-1 text-purple-600 text-sm font-medium group-hover:gap-2 transition-all">
            Submit Feedback
            <FiArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Need to check a ticket without logging in?{' '}
          <a href="/helpdesk" className="text-blue-600 hover:underline">
            Use the public helpdesk
          </a>
        </p>
      </div>
    </div>
  );
}
