/**
 * @pageContext
 * @title Service Request Details
 * @purpose View and manage detailed information about a specific EA service request, including status updates and internal notes
 * @audience staff
 * @routePattern /admin/service-requests/:id
 * @routeParams
 *   - id: Service request ID number (e.g., 1, 82, 145)
 * @features
 *   - Complete request details including requester information and description
 *   - Status badge with color coding (Submitted, In Progress, Under Review, Completed, Rejected)
 *   - Service and entity information
 *   - Activity timeline showing all comments and status changes
 *   - Add internal notes/comments (visible to staff only)
 *   - Change request status with required comment (admin only)
 *   - Email notifications sent to requester on status changes
 *   - Request metadata (ID, created by, assigned to, timestamps)
 * @steps
 *   - Review request details in the main panel
 *   - Check activity timeline for previous updates and notes
 *   - Add internal comments using the "+ Add Comment" button
 *   - Admin users can change status via "Update Status" in sidebar
 *   - Provide a comment when changing status (required for email notification)
 * @tips
 *   - Internal notes are never visible to the requester - use for coordination
 *   - Status changes trigger automatic email notifications to requester
 *   - Activity timeline shows full audit trail of all actions
 *   - Use "Back to Service Requests" link to return to list view
 *   - Request numbers follow format: SR-YYYYMM-XXXX
 * @relatedPages
 *   - /admin/service-requests: Return to service requests list
 *   - /admin/service-requests/analytics: View analytics for all requests
 *   - /admin/analytics: Overall system analytics dashboard
 * @permissions
 *   - staff: Can view requests for their entity and add comments
 *   - admin: Can view all requests, change status, and add comments
 * @troubleshooting
 *   - Issue: Can't change status | Solution: Only admin users can change request status - staff can add comments only
 *   - Issue: Can't view request | Solution: Staff users can only view requests for their assigned entity
 *   - Issue: Status change failed | Solution: Ensure you provided a comment explaining the status change
 *   - Issue: Request not found | Solution: Verify the request ID is correct or you have permission to access it
 */

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
  requester_phone: string | null;
  requester_ministry: string | null;
  request_description: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Comment {
  comment_id: number;
  comment_text: string;
  comment_type: string;
  is_status_change: boolean;
  old_status: string | null;
  new_status: string | null;
  created_by: string;
  created_at: string;
  is_visible_to_staff: boolean;
}

interface Attachment {
  attachment_id: number;
  request_id: number;
  filename: string;
  mimetype: string;
  file_size: number;
  is_mandatory: boolean;
  uploaded_by: string;
  created_at: string;
}

export default function ServiceRequestDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const isAdmin = session?.user?.roleType === 'admin';
  const requestId = params.id as string;

  const fetchRequestDetails = useCallback(async () => {
    if (!requestId) return;

    try {
      setError(null);
      const response = await fetch(`/api/admin/service-requests/${requestId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Service request not found');
        } else if (response.status === 401) {
          throw new Error('Unauthorized - Please log in');
        } else if (response.status === 403) {
          throw new Error('Access denied - You do not have permission to view this request');
        } else {
          throw new Error('Failed to fetch request details');
        }
      }
      const data = await response.json();
      setRequest(data.data.request);
      setAttachments(data.data.attachments || []);
      setNewStatus(data.data.request.status);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const fetchComments = useCallback(async () => {
    if (!requestId) return;

    try {
      const response = await fetch(`/api/admin/service-requests/${requestId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data.data.comments);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
      fetchComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === request?.status) {
      alert('Please select a different status');
      return;
    }

    if (!statusComment.trim()) {
      alert('Please provide a comment for the status change');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/service-requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: newStatus,
          comment: statusComment,
        }),
      });

      if (!response.ok) throw new Error('Failed to change status');

      alert('Status changed successfully! Email notification sent to requester.');
      setShowStatusChange(false);
      setStatusComment('');
      fetchRequestDetails();
      fetchComments();
    } catch (error) {
      alert('Failed to change status');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/service-requests/${requestId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_text: newComment,
          comment_type: 'internal_note',
          is_visible_to_staff: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      setNewComment('');
      setShowAddComment(false);
      fetchComments();
    } catch (error) {
      alert('Failed to add comment');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      under_review: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (mimetype === 'application/zip' || mimetype === 'application/x-zip-compressed') {
      return (
        <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm4 0v2h2V4H8zm0 4v2h2V8H8zm0 4v2h2v-2H8z" clipRule="evenodd" />
        </svg>
      );
    }
    if (mimetype.startsWith('image/')) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  };

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingId(attachment.attachment_id);
    try {
      const response = await fetch(
        `/api/admin/service-requests/${requestId}/attachments/${attachment.attachment_id}`
      );
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Error Loading Request</h2>
            <p className="mb-4">{error}</p>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchRequestDetails();
                  fetchComments();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
              <Link
                href="/admin/service-requests"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Back to Service Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg">
            <p className="mb-4">No request data available.</p>
            <Link
              href="/admin/service-requests"
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 inline-block"
            >
              Back to Service Requests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{request.request_number}</h1>
            <p className="text-gray-600 mt-1">{request.service_name}</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-semibold border ${getStatusColor(request.status)}`}>
            {request.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Requester Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.requester_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Requester Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.requester_email}</dd>
              </div>
              {request.requester_phone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.requester_phone}</dd>
                </div>
              )}
              {request.requester_ministry && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ministry/Department</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.requester_ministry}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Entity</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.entity_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Service</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.service_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(request.created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(request.updated_at)}</dd>
              </div>
            </dl>
            {request.request_description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-500 mb-2">Description</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{request.request_description}</dd>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Attachments ({attachments.length})
              </h2>
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.attachment_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {getFileIcon(attachment.mimetype)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {attachment.filename}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>•</span>
                          <span>Uploaded by {attachment.uploaded_by}</span>
                          <span>•</span>
                          <span>{formatDate(attachment.created_at)}</span>
                          {attachment.is_mandatory && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 font-medium">Required</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(attachment)}
                      disabled={downloadingId === attachment.attachment_id}
                      className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                    >
                      {downloadingId === attachment.attachment_id ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments/Activity Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Activity & Comments</h2>
              <button
                onClick={() => setShowAddComment(!showAddComment)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Comment
              </button>
            </div>

            {/* Add Comment Form */}
            {showAddComment && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add an internal note..."
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => {
                      setShowAddComment(false);
                      setNewComment('');
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.comment_id}
                    className={`p-4 rounded-lg border ${
                      comment.is_status_change
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {comment.is_status_change && (
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-semibold text-blue-900">
                          Status changed from "{comment.old_status}" to "{comment.new_status}"
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-700">{comment.comment_text}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{comment.created_by}</span>
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Status Change (Admin Only) */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Status</h3>
              <button
                onClick={() => setShowStatusChange(!showStatusChange)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Status
              </button>

              {showStatusChange && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="in_progress">In Progress</option>
                      <option value="under_review">Under Review</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comment (required)
                    </label>
                    <textarea
                      value={statusComment}
                      onChange={(e) => setStatusComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Explain the status change..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setShowStatusChange(false);
                        setStatusComment('');
                        setNewStatus(request.status);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStatusChange}
                      disabled={submitting}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    📧 An email notification will be sent to the requester
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Request ID</span>
                <span className="font-medium">#{request.request_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created by</span>
                <span className="font-medium">{request.created_by}</span>
              </div>
              {request.assigned_to && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned to</span>
                  <span className="font-medium">{request.assigned_to}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
