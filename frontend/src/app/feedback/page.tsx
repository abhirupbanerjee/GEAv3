'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ServiceSearch from '@/components/feedback/ServiceSearch'
import RatingQuestions from '@/components/feedback/RatingQuestions'
import SuccessMessage from '@/components/feedback/SuccessMessage'

interface Service {
  service_id: string
  service_name: string
  service_description: string
  entity_name: string
  entity_id?: string
}

interface FeedbackData {
  service_id: string
  entity_id: string
  channel: string
  qr_code_id?: string
  recipient_group: string
  q1_ease: number
  q2_clarity: number
  q3_timeliness: number
  q4_trust: number
  q5_overall_satisfaction: number
  comment_text: string
  grievance_flag: boolean
}

function FeedbackPageContent() {
  const searchParams = useSearchParams()
  
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [ratings, setRatings] = useState({
    q1_ease: 0,
    q2_clarity: 0,
    q3_timeliness: 0,
    q4_trust: 0,
    q5_overall_satisfaction: 0
  })
  
  const [recipientGroup, setRecipientGroup] = useState('')
  const [comments, setComments] = useState('')
  const [grievanceFlag, setGrievanceFlag] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [feedbackId, setFeedbackId] = useState<number | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string>('')
  const [ticketInfo, setTicketInfo] = useState<{
    created: boolean
    ticketNumber?: string
    reason?: string
  } | null>(null)

  // QR code handling
  const [isLoadingPrefilledService, setIsLoadingPrefilledService] = useState(false)
  const [qrCodeId, setQrCodeId] = useState<string | null>(null)

  // Handle pre-filled service from URL parameters (QR code scans)
          useEffect(() => {
            const serviceId = searchParams.get('service')
            const qrId = searchParams.get('qr')

            if (serviceId && !selectedService) {
              setIsLoadingPrefilledService(true)
              setQrCodeId(qrId)

              // Use public service lookup endpoint (no auth required for QR code scans)
              fetch(`/api/feedback/service/${serviceId}`)
                .then(res => {
                  if (!res.ok) throw new Error('Service not found')
                  return res.json()
                })
                .then(service => {
                  // Service data is already in the correct format from the public API
                  setSelectedService({
                    service_id: service.service_id,
                    service_name: service.service_name,
                    service_description: service.service_description || '',
                    entity_name: service.entity_name || '',
                    entity_id: service.entity_id
                  })
                })
                .catch(error => {
                  console.error('Error loading pre-filled service:', error)
                  setSubmitError('Unable to load service from QR code. Please search manually.')
                })
                .finally(() => {
                  setIsLoadingPrefilledService(false)
                })
            }
          }, [searchParams, selectedService])


  // Reset form
  const resetForm = () => {
    setSelectedService(null)
    setRatings({
      q1_ease: 0,
      q2_clarity: 0,
      q3_timeliness: 0,
      q4_trust: 0,
      q5_overall_satisfaction: 0
    })
    setRecipientGroup('')
    setComments('')
    setGrievanceFlag(false)
    setSubmitSuccess(false)
    setSubmitError(null)
    setFeedbackId(null)
    setSubmittedAt('')
    setTicketInfo(null)
    setQrCodeId(null)
  }

  // Validate form
  const validateForm = (): string | null => {
    if (!selectedService) {
      return 'Please select a service'
    }
    if (ratings.q1_ease === 0 || ratings.q2_clarity === 0 || 
        ratings.q3_timeliness === 0 || ratings.q4_trust === 0 || 
        ratings.q5_overall_satisfaction === 0) {
      return 'Please rate all questions'
    }
    if (!recipientGroup) {
      return 'Please select who you are'
    }
    return null
  }

  // Submit feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const error = validateForm()
    if (error) {
      setSubmitError(error)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Extract entity_id from service (it should be included in search results)
      const entity_id = (selectedService as any).entity_id || 'UNKNOWN'

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
        grievance_flag: grievanceFlag
      }

      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedbackData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      // Success!
      setFeedbackId(data.feedback_id)
      setSubmittedAt(data.submitted_at)
      if (data.ticket) {
        setTicketInfo(data.ticket)
      }
      //setTicketInfo(data.ticket || null)
      setSubmitSuccess(true)
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' })

    } catch (error) {
      console.error('Submission error:', error)
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // If submission successful, show success message
  if (submitSuccess) {
    return (
      <SuccessMessage 
        feedbackId={feedbackId}
        submittedAt={submittedAt}
        ticket={ticketInfo}
        onSubmitAnother={resetForm}
      />
    )
  }

  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Service Feedback
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Help us improve government services by sharing your experience. Your feedback is valuable and helps us serve you better.
          </p>
          
          {/* QR Scan Indicator */}
          {qrCodeId && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="text-blue-800 font-semibold">Feedback from QR Code Scan</span>
            </div>
          )}
          
          {/* Loading Indicator */}
          {isLoadingPrefilledService && (
            <div className="mt-4 text-blue-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm">Loading service information...</p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-800 font-semibold">Unable to submit feedback</h3>
                <p className="text-red-700 mt-1">{submitError}</p>
              </div>
              <button
                onClick={() => setSubmitError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Step 1: Service Selection */}
          <section className="bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                1
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Select Service
              </h2>
            </div>
            <ServiceSearch 
              selectedService={selectedService}
              onServiceSelect={setSelectedService}
            />
          </section>

          {/* Step 2: Who are you? */}
          {selectedService && (
            <section className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                  2
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Who are you?
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { value: 'citizen', label: 'Citizen', icon: '👤' },
                  { value: 'business', label: 'Business', icon: '🏢' },
                  { value: 'government', label: 'Government Employee', icon: '🏛️' },
                  { value: 'visitor', label: 'Visitor', icon: '✈️' },
                  { value: 'student', label: 'Student', icon: '🎓' }, 
                  { value: 'other', label: 'Other', icon: '📋' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRecipientGroup(option.value)}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      recipientGroup === option.value
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    <div className="text-3xl mb-2">{option.icon}</div>
                    <div className="font-semibold">{option.label}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Step 3: Rate Your Experience */}
          {selectedService && recipientGroup && (
            <section className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                  3
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Rate Your Experience
                </h2>
              </div>
              <RatingQuestions 
                ratings={ratings}
                onRatingChange={(question, value) => 
                  setRatings(prev => ({ ...prev, [question]: value }))
                }
              />
            </section>
          )}

          {/* Step 4: Additional Comments */}
          {selectedService && recipientGroup && ratings.q5_overall_satisfaction > 0 && (
            <section className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                  4
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Additional Comments (Optional)
                </h2>
              </div>
              
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Please share any additional thoughts, suggestions, or concerns about this service..."
                rows={5}
                maxLength={1000}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="mt-2 text-sm text-gray-500 text-right">
                {comments.length}/1000 characters
              </div>

              {/* Grievance Flag */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grievanceFlag}
                    onChange={(e) => setGrievanceFlag(e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <div className="font-semibold text-gray-900">
                      This is a formal grievance or complaint
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Check this if you experienced significant issues that require formal review and follow-up from the service provider.
                    </p>
                  </div>
                </label>
              </div>
            </section>
          )}

          {/* Submit Button */}
          {selectedService && recipientGroup && ratings.q5_overall_satisfaction > 0 && (
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-12 py-4 rounded-lg font-bold text-lg transition-all ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback form...</p>
        </div>
      </div>
    }>
      <FeedbackPageContent />
    </Suspense>
  )
}