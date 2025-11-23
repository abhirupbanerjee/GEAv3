/**
 * GEA Portal - Service Requests Page
 *
 * Page for managing EA service requests
 * Features:
 * - View all service requests (filtered by entity for staff users)
 * - Create new service requests
 * - Filter and search requests
 * - View request statistics
 */

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import RequestStats from '@/components/admin/service-requests/RequestStats';
import RequestTable from '@/components/admin/service-requests/RequestTable';
import RequestForm from '@/components/admin/service-requests/RequestForm';

interface ServiceRequest {
  request_id: number;
  request_number: string;
  service_id: string;
  service_name: string;
  entity_id: string;
  entity_name: string;
  status: string;
  requester_name: string;
  requester_email: string;
  created_at: string;
  attachment_count: number;
}

interface Stats {
  submitted: number;
  in_progress: number;
  under_review: number;
  completed: number;
  rejected: number;
  total: number;
  last_7_days: number;
  last_30_days: number;
}

export default function ServiceRequestsPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    service_id: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 0,
    total_count: 0,
  });

  // Fetch requests when filters change
  useEffect(() => {
    if (status === 'authenticated') {
      fetchRequests();
      fetchStats();
    }
  }, [status, filters, pagination.page]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.service_id) params.append('service_id', filters.service_id);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/admin/service-requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      setRequests(data.data.requests || []);
      setPagination((prev) => ({
        ...prev,
        total_pages: data.data.pagination.total_pages,
        total_count: data.data.pagination.total_count,
      }));
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/service-requests/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRequestCreated = () => {
    setShowForm(false);
    fetchRequests();
    fetchStats();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading service requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-600 mt-1">
            Manage EA service requests
            {session?.user?.roleType === 'staff' && ' for your entity'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Request</span>
        </button>
      </div>

      {/* Statistics */}
      {stats && <RequestStats stats={stats} />}

      {/* Requests Table */}
      <RequestTable
        requests={requests}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        loading={loading}
      />

      {/* Request Form Modal */}
      {showForm && (
        <RequestForm
          session={session}
          onClose={() => setShowForm(false)}
          onSuccess={handleRequestCreated}
        />
      )}
    </div>
  );
}
