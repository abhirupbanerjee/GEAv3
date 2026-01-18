/**
 * Citizen Feedback History Page
 *
 * Shows all feedback submitted by the logged-in citizen.
 * Features:
 * - List of feedback submissions
 * - Status indicators (received, reviewed, grievance created)
 * - Quick link to submit new feedback
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiMessageSquare,
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiLoader,
  FiChevronRight,
  FiAlertTriangle,
  FiStar,
  FiThumbsUp,
  FiThumbsDown,
} from 'react-icons/fi';

interface Feedback {
  id: string;
  feedbackId: string;
  entityName: string;
  serviceName: string;
  rating: number;
  feedbackType: 'positive' | 'negative' | 'suggestion';
  comment: string;
  status: 'received' | 'reviewed' | 'grievance_created';
  grievanceId?: string;
  createdAt: string;
}

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'received':
      return { label: 'Received', color: 'bg-blue-100 text-blue-800' };
    case 'reviewed':
      return { label: 'Reviewed', color: 'bg-green-100 text-green-800' };
    case 'grievance_created':
      return { label: 'Grievance Created', color: 'bg-red-100 text-red-800' };
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800' };
  }
};

const getFeedbackTypeIcon = (type: string) => {
  switch (type) {
    case 'positive':
      return <FiThumbsUp className="w-4 h-4 text-green-600" />;
    case 'negative':
      return <FiThumbsDown className="w-4 h-4 text-red-600" />;
    case 'suggestion':
      return <FiMessageSquare className="w-4 h-4 text-blue-600" />;
    default:
      return <FiMessageSquare className="w-4 h-4 text-gray-600" />;
  }
};

const renderStars = (rating: number) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <FiStar
          key={star}
          className={`w-3 h-3 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

export default function CitizenFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const response = await fetch('/api/citizen/feedback');
        const data = await response.json();

        if (data.success && data.feedback) {
          setFeedbackList(data.feedback);
        } else {
          setFeedbackList([]);
        }
      } catch (error) {
        console.error('Failed to load feedback:', error);
        setFeedbackList([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeedback();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Feedback</h1>
          <p className="text-sm text-gray-600 mt-1">
            View feedback you&apos;ve submitted about government services
          </p>
        </div>
        <Link
          href="/feedback"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Submit Feedback
        </Link>
      </div>

      {/* Feedback Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiMessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{feedbackList.length}</p>
              <p className="text-sm text-gray-600">Total Feedback</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {feedbackList.filter((f) => f.status === 'reviewed').length}
              </p>
              <p className="text-sm text-gray-600">Reviewed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {feedbackList.filter((f) => f.status === 'grievance_created').length}
              </p>
              <p className="text-sm text-gray-600">Escalated</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {feedbackList.length === 0 ? (
          <div className="text-center py-12">
            <FiMessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback yet</h3>
            <p className="text-gray-500 mb-6">
              Share your experience with government services
            </p>
            <Link
              href="/feedback"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              Submit Feedback
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {feedbackList.map((feedback) => {
              const statusDisplay = getStatusDisplay(feedback.status);
              return (
                <div
                  key={feedback.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {getFeedbackTypeIcon(feedback.feedbackType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {feedback.feedbackId}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${statusDisplay.color}`}
                        >
                          {statusDisplay.label}
                        </span>
                        {renderStars(feedback.rating)}
                      </div>
                      <p className="font-medium text-gray-900">
                        {feedback.entityName} - {feedback.serviceName}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {feedback.comment}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {feedback.createdAt}
                        </span>
                        {feedback.grievanceId && (
                          <Link
                            href={`/citizen/grievances/${feedback.grievanceId}`}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <FiAlertTriangle className="w-3 h-3" />
                            View Grievance
                            <FiChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <FiMessageSquare className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-green-900 font-medium">Your feedback matters</p>
          <p className="text-sm text-green-700 mt-1">
            Your feedback helps improve government services. If you have a serious concern
            that isn&apos;t being addressed, you can{' '}
            <Link href="/citizen/grievances" className="underline hover:no-underline">
              file a grievance
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
