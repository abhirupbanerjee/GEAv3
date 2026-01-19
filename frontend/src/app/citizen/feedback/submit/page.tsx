/**
 * Citizen Feedback Submission Page
 *
 * Authenticated version of the public feedback form for logged-in citizens.
 * - Uses the citizen portal layout
 * - Automatically tags submissions with citizen info
 * - Same feedback flow as public form
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ServiceSearch from '@/components/feedback/ServiceSearch';
import RatingQuestions from '@/components/feedback/RatingQuestions';
import { FiArrowLeft, FiLoader, FiCheck, FiExternalLink, FiAlertCircle } from 'react-icons/fi';

interface Service {
  service_id: string;
  service_name: string;
  service_description: string;
  entity_name: string;
  entity_id?: string;
}

interface FeedbackData {
  service_id: string;
  entity_id: string;
  channel: string;
  qr_code_id?: string;
  recipient_group: string;
  q1_ease: number;
  q2_clarity: number;
  q3_timeliness: number;
  q4_trust: number;
  q5_overall_satisfaction: number;
  comment_text: string;
  grievance_flag: boolean;
}

function CitizenFeedbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [ratings, setRatings] = useState({
    q1_ease: 0,
    q2_clarity: 0,
    q3_timeliness: 0,
    q4_trust: 0,
    q5_overall_satisfaction: 0,
  });

  const [recipientGroup, setRecipientGroup] = useState('');
  const [comments, setComments] = useState('');
  const [grievanceFlag, setGrievanceFlag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<number | null>(null);
  const [ticketInfo, setTicketInfo] = useState<{
    created: boolean;
    ticketNumber?: string;
    reason?: string;
  } | null>(null);

  // QR code handling
  const [isLoadingPrefilledService, setIsLoadingPrefilledService] = useState(false);
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);

  // Handle pre-filled service from URL parameters
  useEffect(() => {
    const serviceId = searchParams.get('service');
    const qrId = searchParams.get('qr');

    if (serviceId && !selectedService) {
      setIsLoadingPrefilledService(true);
      setQrCodeId(qrId);

      fetch(`/api/feedback/service/${serviceId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Service not found');
          return res.json();
        })
        .then((service) => {
          setSelectedService({
            service_id: service.service_id,
            service_name: service.service_name,
            service_description: service.service_description || '',
            entity_name: service.entity_name || '',
            entity_id: service.entity_id,
          });
        })
        .catch((error) => {
          console.error('Error loading pre-filled service:', error);
          setSubmitError('Unable to load service. Please search manually.');
        })
        .finally(() => {
          setIsLoadingPrefilledService(false);
        });
    }
  }, [searchParams, selectedService]);

  // Reset form
  const resetForm = () => {
    setSelectedService(null);
    setRatings({
      q1_ease: 0,
      q2_clarity: 0,
      q3_timeliness: 0,
      q4_trust: 0,
      q5_overall_satisfaction: 0,
    });
    setRecipientGroup('');
    setComments('');
    setGrievanceFlag(false);
    setSubmitSuccess(false);
    setSubmitError(null);
    setFeedbackId(null);
    setTicketInfo(null);
    setQrCodeId(null);
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!selectedService) {
      return 'Please select a service';
    }
    if (
      ratings.q1_ease === 0 ||
      ratings.q2_clarity === 0 ||
      ratings.q3_timeliness === 0 ||
      ratings.q4_trust === 0 ||
      ratings.q5_overall_satisfaction === 0
    ) {
      return 'Please rate all questions';
    }
    if (!recipientGroup) {
      return 'Please select who you are';
    }
    return null;
  };

  // Submit feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      setSubmitError(error);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const entity_id = (selectedService as any).entity_id || 'UNKNOWN';

      const feedbackData: FeedbackData = {
        service_id: selectedService!.service_id,
        entity_id: entity_id,
        channel: qrCodeId ? 'qr_code' : 'ea_portal',
        qr_code_id: qrCodeId || undefined,
        recipient_group: recipientGroup,
        q1_ease: ratings.q1_ease,
        q2_clarity: ratings.q2_clarity,
        q3_timeliness: ratings.q3_timeliness,
        q4_trust: ratings.q4_trust,
        q5_overall_satisfaction: ratings.q5_overall_satisfaction,
        comment_text: comments.trim(),
        grievance_flag: grievanceFlag,
      };

      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setFeedbackId(data.feedback_id);
      if (data.ticket) {
        setTicketInfo(data.ticket);
      }
      setSubmitSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Thank You for Your Feedback!
          </h1>
          <p className="text-gray-600 mb-6">
            Your feedback has been submitted successfully. Reference ID:{' '}
            <span className="font-mono font-semibold">FB-{feedbackId}</span>
          </p>

          {ticketInfo?.created && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">
                    Ticket Created: {ticketInfo.ticketNumber}
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {ticketInfo.reason}
                  </p>
                  <Link
                    href={`/citizen/tickets`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                  >
                    View in My Tickets
                    <FiExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Another
            </button>
            <Link
              href="/citizen"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Give Feedback</h1>
          <p className="text-sm text-gray-600 mt-1">
            Share your experience with government services
          </p>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoadingPrefilledService && (
        <div className="flex items-center justify-center py-8">
          <FiLoader className="w-6 h-6 text-blue-600 animate-spin mr-2" />
          <span className="text-gray-600">Loading service information...</span>
        </div>
      )}

      {/* Error Alert */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700">{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <FiArrowLeft className="w-4 h-4 rotate-45" />
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Service Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Select Service
            </h2>
          </div>
          <ServiceSearch
            selectedService={selectedService}
            onServiceSelect={setSelectedService}
          />
        </div>

        {/* Step 2: Who are you? */}
        {selectedService && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Who are you?
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { value: 'citizen', label: 'Citizen', icon: '👤' },
                { value: 'business', label: 'Business', icon: '🏢' },
                { value: 'government', label: 'Gov Employee', icon: '🏛️' },
                { value: 'visitor', label: 'Visitor', icon: '✈️' },
                { value: 'student', label: 'Student', icon: '🎓' },
                { value: 'other', label: 'Other', icon: '📋' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRecipientGroup(option.value)}
                  className={`p-3 border-2 rounded-lg text-center transition-all ${
                    recipientGroup === option.value
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-blue-300 text-gray-700'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Rate Your Experience */}
        {selectedService && recipientGroup && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Rate Your Experience
              </h2>
            </div>
            <RatingQuestions
              ratings={ratings}
              onRatingChange={(question, value) =>
                setRatings((prev) => ({ ...prev, [question]: value }))
              }
            />
          </div>
        )}

        {/* Step 4: Additional Comments */}
        {selectedService &&
          recipientGroup &&
          ratings.q5_overall_satisfaction > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Additional Comments{' '}
                  <span className="font-normal text-gray-500">(Optional)</span>
                </h2>
              </div>

              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share any additional thoughts, suggestions, or concerns..."
                rows={4}
                maxLength={1000}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="mt-1 text-sm text-gray-500 text-right">
                {comments.length}/1000 characters
              </div>

              {/* Grievance Flag */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grievanceFlag}
                    onChange={(e) => setGrievanceFlag(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 text-sm">
                      This is a formal grievance or complaint
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Check this if you experienced significant issues that
                      require formal review.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

        {/* Submit Button */}
        {selectedService &&
          recipientGroup &&
          ratings.q5_overall_satisfaction > 0 && (
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <FiLoader className="animate-spin mr-2" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          )}
      </form>
    </div>
  );
}

export default function CitizenFeedbackSubmitPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <CitizenFeedbackContent />
    </Suspense>
  );
}
