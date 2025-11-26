/**
 * @pageContext
 * @title Create New Service Request
 * @purpose Submit a new Enterprise Architecture service request with details and supporting documentation
 * @audience staff
 * @features
 *   - Service selection dropdown (filtered by service owner entity for staff)
 *   - Requester information fields (name, email, phone, ministry/department)
 *   - Detailed request description textarea
 *   - File upload for supporting documents (PDF, DOCX, XLSX, PNG, JPG)
 *   - Mandatory vs optional attachment indicators
 *   - Form validation before submission
 *   - Automatic entity assignment based on logged-in user
 * @steps
 *   - Select the EA service you need from the dropdown
 *   - Fill in your contact information (name, email, phone, ministry/department)
 *   - Provide a detailed description of your request (what, why, expected outcomes)
 *   - Upload any required supporting documents
 *   - Review your information and click "Submit Request"
 *   - You'll receive a confirmation with your request number
 * @tips
 *   - Be as detailed as possible in the description to help DTA staff understand your needs
 *   - Some services require mandatory attachments - these are marked with a red asterisk
 *   - Maximum file size: 10MB per file
 *   - Supported formats: PDF, Word documents, Excel sheets, images (PNG, JPG)
 *   - You can track your request status after submission
 * @relatedPages
 *   - /admin/service-requests: View all your service requests and their status
 *   - /services: Learn more about available EA services
 *   - /admin/home: Return to dashboard
 * @permissions
 *   - staff: Can create service requests for their assigned entity
 *   - admin: Cannot create requests (admin role is for managing, not requesting)
 * @troubleshooting
 *   - Issue: Service dropdown is empty | Solution: Verify services exist for your entity in master data
 *   - Issue: File upload fails | Solution: Check file size (max 10MB) and format (PDF, DOCX, XLSX, PNG, JPG only)
 *   - Issue: Can't submit | Solution: Ensure all required fields are filled and mandatory attachments are uploaded
 */

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { config } from '@/config/env';

interface Service {
  service_id: string;
  service_name: string;
  entity_id: string;
  description: string;
}

interface ServiceAttachment {
  service_attachment_id: number;
  service_id: string;
  filename: string;
  file_extension: string;
  is_mandatory: boolean;
  description: string;
}

interface Entity {
  unique_entity_id: string;
  entity_name: string;
}

export default function NewServiceRequestPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [attachmentRequirements, setAttachmentRequirements] = useState<ServiceAttachment[]>([]);
  const [entityName, setEntityName] = useState<string>('');

  // Form state
  const [selectedService, setSelectedService] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterMinistry, setRequesterMinistry] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [priority, setPriority] = useState('2'); // Medium priority default
  const [attachments, setAttachments] = useState<Record<number, File>>({});

  const isAdmin = session?.user?.roleType === 'admin';
  const isStaff = session?.user?.roleType === 'staff';
  const userEntityId = session?.user?.entityId;

  // Redirect admin users - they should not create requests
  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      alert('Admin users cannot create service requests. Only staff can submit requests to DTA.');
      router.push('/admin/service-requests');
    }
  }, [status, isAdmin, router]);

  const fetchServices = useCallback(async () => {
    try {
      // Fetch services for the service request entity (AGY-005)
      const response = await fetch(`/api/managedata/services?entity_id=${config.SERVICE_REQUEST_ENTITY_ID}`);
      if (response.ok) {
        const data = await response.json();
        // API returns array directly
        setServices(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  }, []);

  const fetchAttachmentRequirements = useCallback(async (serviceId: string) => {
    try {
      const response = await fetch(`/api/admin/services/${serviceId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachmentRequirements(data.data.attachments || []);
      }
    } catch (error) {
      console.error('Error fetching attachment requirements:', error);
      setAttachmentRequirements([]);
    }
  }, []);

  const fetchEntityName = useCallback(async (entityId: string) => {
    try {
      const response = await fetch('/api/managedata/entities');
      if (response.ok) {
        const entities: Entity[] = await response.json();
        const entity = entities.find((e) => e.unique_entity_id === entityId);
        if (entity) {
          setEntityName(entity.entity_name);
        }
      }
    } catch (error) {
      console.error('Error fetching entity name:', error);
    }
  }, []);

  useEffect(() => {
    // Only initialize for staff users
    if (!isStaff) return;

    // Pre-fill user information
    if (session?.user) {
      setRequesterName(session.user.name || '');
      setRequesterEmail(session.user.email || '');
    }

    // Set entity for staff users and fetch entity name
    if (userEntityId) {
      setSelectedEntity(userEntityId);
      fetchEntityName(userEntityId);
    }

    fetchServices();
  }, [session, isStaff, userEntityId, fetchServices, fetchEntityName]);

  useEffect(() => {
    if (selectedService) {
      fetchAttachmentRequirements(selectedService);
    } else {
      setAttachmentRequirements([]);
    }
  }, [selectedService, fetchAttachmentRequirements]);

  const handleFileChange = (attachmentId: number, file: File | null) => {
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Validate file type against attachment requirements
      const requirement = attachmentRequirements.find(
        (a) => a.service_attachment_id === attachmentId
      );

      if (requirement) {
        // Get file extension without dot (e.g., 'pdf')
        const fileExt = (file.name.split('.').pop()?.toLowerCase() || '');

        // Parse allowed extensions from requirement (stored without dots in DB)
        const allowedExtensions = requirement.file_extension
          .split(',')
          .map((ext) => ext.trim().toLowerCase());

        // Debug logging
        console.log('File extension:', fileExt);
        console.log('Allowed extensions:', allowedExtensions);
        console.log('Match found:', allowedExtensions.includes(fileExt));

        // Check if file extension is allowed (compare without dots)
        if (!allowedExtensions.includes(fileExt)) {
          alert(
            `Invalid file type.\n\nAllowed: ${allowedExtensions.join(', ')}\nYou uploaded: ${fileExt}\n\nPlease upload one of the allowed file types.`
          );
          return;
        }

        // For MIME validation, we need the extension with dot
        const fileExtWithDot = '.' + fileExt;

        // Validate MIME type for common file types
        const mimeTypeMap: Record<string, string[]> = {
          '.pdf': ['application/pdf'],
          '.doc': ['application/msword'],
          '.docx': [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          '.xls': ['application/vnd.ms-excel'],
          '.xlsx': [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
          '.jpg': ['image/jpeg'],
          '.jpeg': ['image/jpeg'],
          '.png': ['image/png'],
          '.gif': ['image/gif'],
        };

        const expectedMimes = mimeTypeMap[fileExtWithDot] || [];
        if (expectedMimes.length > 0 && !expectedMimes.includes(file.type)) {
          alert(
            `File type mismatch. The file appears to be a different type than its extension suggests.`
          );
          return;
        }
      }

      setAttachments((prev) => ({ ...prev, [attachmentId]: file }));
    } else {
      setAttachments((prev) => {
        const updated = { ...prev };
        delete updated[attachmentId];
        return updated;
      });
    }
  };

  const validateForm = () => {
    if (!selectedService) {
      alert('Please select a service');
      return false;
    }

    if (!selectedEntity) {
      alert('Please select an entity');
      return false;
    }

    if (!requesterName.trim()) {
      alert('Please enter your name');
      return false;
    }

    if (!requesterEmail.trim()) {
      alert('Please enter your email');
      return false;
    }

    if (!requestDescription.trim()) {
      alert('Please provide a description');
      return false;
    }

    // Validate mandatory attachments
    const mandatoryAttachments = attachmentRequirements.filter((a) => a.is_mandatory);
    for (const attachment of mandatoryAttachments) {
      if (!attachments[attachment.service_attachment_id]) {
        alert(`Please upload required document: ${attachment.filename}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('service_id', selectedService);
      formData.append('entity_id', selectedEntity);
      formData.append('requester_name', requesterName);
      formData.append('requester_email', requesterEmail);
      formData.append('requester_phone', requesterPhone);
      formData.append('requester_ministry', requesterMinistry);
      formData.append('request_description', requestDescription);
      formData.append('priority', priority);

      // Append files
      Object.entries(attachments).forEach(([attachmentId, file]) => {
        formData.append(`attachment_${attachmentId}`, file);
      });

      const response = await fetch('/api/admin/service-requests', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create request');
      }

      alert('Service request created successfully!');
      router.push('/admin/service-requests');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: '1', label: 'Low', color: 'text-gray-600' },
    { value: '2', label: 'Medium', color: 'text-blue-600' },
    { value: '3', label: 'High', color: 'text-orange-600' },
    { value: '4', label: 'Critical', color: 'text-red-600' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/service-requests"
          className="text-blue-600 hover:text-blue-800 flex items-center mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Service Requests
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">New Service Request</h1>
        <p className="text-gray-600 mt-1">Submit a request for EA services from DTA</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a service...</option>
                {services.map((service) => (
                  <option key={service.service_id} value={service.service_id}>
                    {service.service_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Field - Disabled/Read-only for staff */}
            {isStaff && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requesting Entity
                </label>
                <input
                  type="text"
                  value={entityName ? `${entityName} (${selectedEntity})` : selectedEntity}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This request will be submitted to the entity shown above
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Requester Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Requester Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                maxLength={255}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                maxLength={255}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={20}
              />
            </div>
          </div>
        </div>

        {/* Request Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Description</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={requestDescription}
              onChange={(e) => setRequestDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please provide details about your service request..."
              required
              maxLength={2000}
            />
            <p className="text-sm text-gray-500 mt-1">
              {requestDescription.length}/2000 characters
            </p>
          </div>
        </div>

        {/* Document Attachments */}
        {attachmentRequirements.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Documents</h2>

            <div className="space-y-4">
              {attachmentRequirements.map((attachment) => (
                <div key={attachment.service_attachment_id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">
                        {attachment.filename}
                        {attachment.is_mandatory && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {attachment.description && (
                        <p className="text-sm text-gray-500 mt-1">{attachment.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Accepted: {attachment.file_extension} • Max 5MB
                      </p>
                    </div>
                    {attachment.is_mandatory && (
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        Required
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    accept={attachment.file_extension}
                    onChange={(e) =>
                      handleFileChange(
                        attachment.service_attachment_id,
                        e.target.files?.[0] || null
                      )
                    }
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required={attachment.is_mandatory}
                  />

                  {attachments[attachment.service_attachment_id] && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {attachments[attachment.service_attachment_id].name} (
                      {(attachments[attachment.service_attachment_id].size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Link
            href="/admin/service-requests"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
