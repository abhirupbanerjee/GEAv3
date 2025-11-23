/**
 * Service Request Form Component
 * Modal form for creating new service requests
 */

'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';

interface RequestFormProps {
  session: Session | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Service {
  service_id: string;
  service_name: string;
  entity_id: string;
}

interface Entity {
  entity_id: string;
  entity_name: string;
}

export default function RequestForm({ session, onClose, onSuccess }: RequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [formData, setFormData] = useState({
    service_id: '',
    entity_id: session?.user?.entityId || '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    requester_ministry: '',
    request_description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const isStaff = session?.user?.roleType === 'staff';

  useEffect(() => {
    fetchServices();
    if (!isStaff) {
      fetchEntities();
    }
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/managedata/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  const fetchEntities = async () => {
    try {
      const response = await fetch('/api/admin/entities');
      if (response.ok) {
        const data = await response.json();
        setEntities(data.entities || []);
      }
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.service_id || !formData.entity_id || !formData.requester_name || !formData.requester_email) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/service-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create service request');
      }

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">New Service Request</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Entity Selection (Admin only) */}
          {!isStaff && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.entity_id}
                onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select entity...</option>
                {entities.map((entity) => (
                  <option key={entity.entity_id} value={entity.entity_id}>
                    {entity.entity_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.service_id}
              onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select service...</option>
              {services
                .filter((s) => !isStaff || s.entity_id === session?.user?.entityId)
                .map((service) => (
                  <option key={service.service_id} value={service.service_id}>
                    {service.service_name}
                  </option>
                ))}
            </select>
          </div>

          {/* Requester Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requester Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.requester_name}
                onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requester Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.requester_email}
                onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requester Phone
              </label>
              <input
                type="tel"
                value={formData.requester_phone}
                onChange={(e) => setFormData({ ...formData, requester_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ministry/Department
              </label>
              <input
                type="text"
                value={formData.requester_ministry}
                onChange={(e) => setFormData({ ...formData, requester_ministry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Request Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Description
            </label>
            <textarea
              value={formData.request_description}
              onChange={(e) => setFormData({ ...formData, request_description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide details about the service request..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Request</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
