/**
 * @pageContext
 * @title Service Requests Management
 * @purpose View, manage, and track all Enterprise Architecture service requests submitted by government entities
 * @audience staff
 * @features
 *   - List view of all service requests with sortable columns
 *   - Filter by status: Submitted, In Progress, Under Review, Completed, Rejected
 *   - Filter by service type and entity
 *   - Search by request number, requester name, or service name
 *   - Statistics dashboard showing request counts by status and time period
 *   - Pagination for large result sets
 *   - Create new service request button (staff only)
 *   - Entity filter dropdown (admin sees all, staff sees assigned entity only)
 * @steps
 *   - Review the statistics cards to see overview of request volumes
 *   - Use filters and search to narrow down requests
 *   - Click on a request row to view full details
 *   - Staff users can click "New Request" to submit EA service request
 * @tips
 *   - MDA staff can only see requests for their assigned entity (server-enforced)
 *   - DTA administrators can view and manage requests across all entities
 *   - Status colors: Yellow (Submitted), Blue (In Progress), Purple (Under Review), Green (Completed), Red (Rejected)
 *   - Click column headers to sort table data
 *   - Use the entity filter to focus on specific government organizations
 * @relatedPages
 *   - /admin/service-requests/new: Create a new EA service request (staff only)
 *   - /admin/service-requests/[id]: View detailed information about specific request
 *   - /admin/service-requests/analytics: View detailed analytics and trends
 *   - /admin/analytics: Overall dashboard with all analytics
 * @permissions
 *   - staff: Can view requests for their entity and create new requests
 *   - admin: Can view all requests across all entities and change request status
 * @troubleshooting
 *   - Issue: Can't see all requests | Solution: Staff users only see requests for their entity - this is by design for data security
 *   - Issue: Statistics don't match table count | Solution: Statistics reflect filtered data - clear filters to see all
 *   - Issue: Can't create new request | Solution: Only staff users can create requests - admin users manage existing requests
 */

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import RequestStats from '@/components/admin/service-requests/RequestStats';
import RequestTable from '@/components/admin/service-requests/RequestTable';
import { config } from '@/config/env';

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

interface Entity {
  unique_entity_id: string;
  entity_name: string;
  is_active?: boolean;
}

export default function ServiceRequestsPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    service_id: '',
    search: '',
    entity_id: '', // Default to empty (All Entities), will be set for staff users
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 0,
    total_count: 0,
  });

  // Entity filter state (for admin users)
  const [entities, setEntities] = useState<Entity[]>([]);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [entitySearchTerm, setEntitySearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.roleType === 'admin';
  const isStaff = session?.user?.roleType === 'staff';

  // Set default entity filter for staff users
  useEffect(() => {
    if (isStaff && filters.entity_id === '') {
      setFilters(prev => ({ ...prev, entity_id: config.SERVICE_REQUEST_ENTITY_ID }));
    }
  }, [isStaff]);

  // Load entities (admin: all, staff: only service request entity)
  useEffect(() => {
    if (isAdmin || isStaff) {
      const loadEntities = async () => {
        try {
          // For staff, fetch the service request entity (AGY-005) specifically
          // For admin, fetch all entities
          const url = isStaff
            ? `/api/managedata/entities?entity_id=${config.SERVICE_REQUEST_ENTITY_ID}`
            : '/api/managedata/entities';

          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const filteredEntities = data.filter((e: Entity) => e.is_active !== false);
            setEntities(filteredEntities);
          }
        } catch (error) {
          console.error('Error loading entities:', error);
        }
      };
      loadEntities();
    }
  }, [isAdmin, isStaff]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEntityDropdown(false);
      }
    };

    if (showEntityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEntityDropdown]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.service_id) params.append('service_id', filters.service_id);
      if (filters.search) params.append('search', filters.search);
      // Send entity_id for both admin and staff users
      if (filters.entity_id) params.append('entity_id', filters.entity_id);

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
  }, [pagination.page, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      // Send entity_id for both admin and staff users
      if (filters.entity_id) params.append('entity_id', filters.entity_id);

      const response = await fetch(`/api/admin/service-requests/stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [filters.entity_id]);

  // Fetch requests when filters change
  useEffect(() => {
    if (status === 'authenticated') {
      fetchRequests();
      fetchStats();
    }
  }, [status, fetchRequests, fetchStats]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
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

  // Entity filter handlers
  const handleEntityChange = (entityId: string) => {
    setFilters(prev => ({ ...prev, entity_id: entityId }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const filteredEntities = entities.filter(e =>
    e.entity_name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
    e.unique_entity_id.toLowerCase().includes(entitySearchTerm.toLowerCase())
  );

  const selectedEntity = entities.find(e => e.unique_entity_id === filters.entity_id);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-600 mt-1">
            {session?.user?.roleType === 'admin'
              ? 'Manage EA service requests from all entities'
              : 'Submit and track EA service requests for your entity'}
          </p>
        </div>
        {/* Only staff can create new requests */}
        {session?.user?.roleType === 'staff' && (
          <Link
            href="/admin/service-requests/new"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Request</span>
          </Link>
        )}
      </div>

      {/* Entity Filter (Admin and Staff) */}
      {(isAdmin || isStaff) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {isStaff ? 'Service Owner:' : 'Filter by Service Owner:'}
            </label>
            <div className="relative flex-1 max-w-md" ref={dropdownRef}>
              <button
                onClick={() => setShowEntityDropdown(!showEntityDropdown)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white flex items-center justify-between"
              >
                <span className="text-sm text-gray-900">
                  {selectedEntity ? `${selectedEntity.entity_name} (${selectedEntity.unique_entity_id})` : 'Select Entity'}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {showEntityDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
                  {/* Search box */}
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search entities..."
                      value={entitySearchTerm}
                      onChange={(e) => setEntitySearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Options list */}
                  <div className="overflow-y-auto max-h-64">
                    {filteredEntities.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No entities found</div>
                    ) : (
                      filteredEntities.map((entity) => (
                        <button
                          key={entity.unique_entity_id}
                          onClick={() => {
                            handleEntityChange(entity.unique_entity_id);
                            setShowEntityDropdown(false);
                            setEntitySearchTerm('');
                          }}
                          className={`w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 text-left ${
                            filters.entity_id === entity.unique_entity_id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {entity.entity_name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {entity.unique_entity_id}
                            </div>
                          </div>
                          {filters.entity_id === entity.unique_entity_id && (
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clear filter button (admin only) */}
            {isAdmin && filters.entity_id && (
              <button
                onClick={() => {
                  handleEntityChange('');
                  setEntitySearchTerm('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>

          {/* Info note for staff users */}
          {isStaff && (
            <div className="mt-3 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
              <span className="font-medium">Note:</span> Your view is filtered to show requests for the selected entity. Server-side security ensures you only see authorized data.
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
