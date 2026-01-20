/**
 * Admin Citizens Management Page
 *
 * Manage citizens registered in the portal:
 * - View citizens list with PII masked (only phone visible)
 * - Block/unblock citizens
 * - View submission stats (feedback, ticket counts)
 */

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiLoader,
  FiPhone,
  FiMessageSquare,
  FiFileText,
  FiClock,
  FiAlertCircle,
} from 'react-icons/fi';

interface Citizen {
  citizen_id: string;
  phone: string;
  has_name: boolean;
  has_email: boolean;
  is_active: boolean;
  registration_complete: boolean;
  block_reason: string | null;
  blocked_at: string | null;
  blocked_by: string | null;
  created_at: string;
  last_login: string | null;
  feedback_count: number;
  ticket_count: number;
}

interface Stats {
  total: number;
  active: number;
  blocked: number;
}

type StatusFilter = 'all' | 'active' | 'blocked';
type SortField = 'last_login' | 'feedbacks' | 'tickets' | 'created';

export default function CitizensPage() {
  const { data: session, status } = useSession();
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('last_login');
  const [error, setError] = useState<string | null>(null);

  // Block modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);

  // Check if user is admin or staff
  const isAdmin = session?.user?.roleType === 'admin';
  const isStaff = session?.user?.roleType === 'staff';
  const canAccessCitizens = isAdmin || isStaff;

  useEffect(() => {
    if (status === 'authenticated' && canAccessCitizens) {
      fetchCitizens();
    }
  }, [status, canAccessCitizens, statusFilter, sortField]);

  const fetchCitizens = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('sort', sortField);
      params.set('order', 'desc');

      const response = await fetch(`/api/admin/citizens?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCitizens(data.citizens);
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to fetch citizens');
      }
    } catch (err) {
      setError('Failed to fetch citizens');
      console.error('Error fetching citizens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchCitizens();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openBlockModal = (citizen: Citizen) => {
    setSelectedCitizen(citizen);
    setBlockReason('');
    setShowBlockModal(true);
  };

  const handleBlock = async () => {
    if (!selectedCitizen || !blockReason.trim()) return;

    setBlockLoading(true);
    try {
      const response = await fetch(`/api/admin/citizens/${selectedCitizen.citizen_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: false,
          block_reason: blockReason.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowBlockModal(false);
        fetchCitizens();
      } else {
        setError(data.error || 'Failed to block citizen');
      }
    } catch (err) {
      setError('Failed to block citizen');
      console.error('Error blocking citizen:', err);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblock = async (citizen: Citizen) => {
    if (!confirm('Are you sure you want to unblock this citizen?')) return;

    try {
      const response = await fetch(`/api/admin/citizens/${citizen.citizen_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });

      const data = await response.json();
      if (data.success) {
        fetchCitizens();
      } else {
        setError(data.error || 'Failed to unblock citizen');
      }
    } catch (err) {
      setError('Failed to unblock citizen');
      console.error('Error unblocking citizen:', err);
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!canAccessCitizens) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <FiAlertCircle className="inline-block mr-2" />
          Access denied. Admin or staff privileges required.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Citizens</h1>
        <p className="text-sm text-gray-600 mt-1">Manage citizen accounts and access</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <FiAlertCircle className="inline-block mr-2" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiUsers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Citizens</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiUserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiUserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Blocked</p>
              <p className="text-2xl font-bold text-gray-900">{stats.blocked}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'active', 'blocked'] as StatusFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="last_login">Sort by Last Login</option>
            <option value="feedbacks">Sort by Feedbacks (High→Low)</option>
            <option value="tickets">Sort by Tickets (High→Low)</option>
            <option value="created">Sort by Created Date</option>
          </select>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Citizens Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profile
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedbacks
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {citizens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No citizens found
                  </td>
                </tr>
              ) : (
                citizens.map((citizen) => (
                  <tr key={citizen.citizen_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FiPhone className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{citizen.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          citizen.registration_complete
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {citizen.registration_complete ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {citizen.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <FiCheckCircle className="w-4 h-4" />
                          <span className="text-sm">Active</span>
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <FiXCircle className="w-4 h-4" />
                            <span className="text-sm">Blocked</span>
                          </span>
                          {citizen.block_reason && (
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px]" title={citizen.block_reason}>
                              {citizen.block_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FiMessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{citizen.feedback_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FiFileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{citizen.ticket_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <FiClock className="w-4 h-4" />
                        <span>{formatDate(citizen.last_login)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {citizen.is_active ? (
                        <button
                          onClick={() => openBlockModal(citizen)}
                          className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Block
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnblock(citizen)}
                          className="px-3 py-1.5 text-sm text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          Unblock
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block Modal */}
      {showBlockModal && selectedCitizen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Block Citizen</h2>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to block <span className="font-medium">{selectedCitizen.phone}</span>?
                They will not be able to log in until unblocked.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for blocking <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Enter the reason for blocking this citizen..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be shown to the citizen when they try to log in.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlock}
                  disabled={!blockReason.trim() || blockLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {blockLoading ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      Blocking...
                    </>
                  ) : (
                    'Block Citizen'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
