'use client'

import React, { useState } from 'react'

interface TicketInfo {
  created: boolean;
  ticketNumber?: string;
  reason?: string;
}

interface SuccessMessageProps {
  feedbackId: number;
  submittedAt: string;
  ticket?: TicketInfo | null;
  onSubmitAnother: () => void;
  kioskMode?: boolean;
}

export default function SuccessMessage({
  feedbackId,
  submittedAt,
  ticket,
  onSubmitAnother,
  kioskMode = false
}: SuccessMessageProps) {
  const [showTicketModal, setShowTicketModal] = useState(false)
  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
        </div>

        {/* Thank You Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Thank You for Your Feedback!
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Your input helps us improve government services for all citizens.
        </p>

        {/* Feedback Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Feedback ID:</span>
              <span className="ml-2 text-gray-900">#{feedbackId}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Submitted:</span>
              <span className="ml-2 text-gray-900">
                {new Date(submittedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
          </div>

          {/* Ticket Information - NEW */}
          {ticket?.created && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg 
                      className="h-6 w-6 text-blue-600" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-bold text-blue-900 mb-1">
                      🎫 Support Ticket Created
                    </h3>
                    <p className="text-sm text-blue-800 mb-2">
                      A service ticket has been automatically created to address your feedback.
                    </p>
                    <div className="bg-white rounded px-3 py-2 border border-blue-200">
                      <span className="text-xs font-semibold text-gray-600">Ticket Number:</span>
                      <span className="ml-2 text-lg font-bold text-blue-600">
                        #{ticket.ticketNumber}
                      </span>
                    </div>
                    {ticket.reason && (
                      <p className="text-xs text-blue-700 mt-2">
                        <strong>Reason:</strong> {ticket.reason}
                      </p>
                    )}
                    {kioskMode ? (
                      <button
                        onClick={() => setShowTicketModal(true)}
                        className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                      >
                        View Ticket Status
                      </button>
                    ) : (
                      <a
                        href={`/helpdesk/ticket/${ticket.ticketNumber}`}
                        className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                      >
                        Track Ticket Status →
                      </a>
                    )}
                    <p className="text-xs text-blue-700 mt-2">
                      Our team will review your feedback and reach out if additional information is needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What Happens Next */}
        <div className="text-left mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
            What Happens Next?
          </h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Analysis</h3>
                <p className="text-gray-600 text-sm">
                  Your feedback is analyzed alongside other citizen responses to identify trends and improvement opportunities.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Service Review</h3>
                <p className="text-gray-600 text-sm">
                  Service managers review feedback regularly to enhance delivery quality and citizen experience.
                </p>
              </div>
            </div>
            
            {ticket?.created && (
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Direct Follow-up</h3>
                  <p className="text-gray-600 text-sm">
                    Since a support ticket was created, a team member will investigate your specific concern and work toward resolution.
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                <span className="text-blue-600 font-bold">{ticket?.created ? '4' : '3'}</span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Continuous Improvement</h3>
                <p className="text-gray-600 text-sm">
                  Insights from your feedback contribute to ongoing improvements in government service delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <svg 
              className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
            <div className="ml-4 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Your Privacy Matters</h3>
              <p className="text-sm text-gray-600">
                We do not collect or store any personal identifying information 
                such as names, email addresses, or phone numbers. All submissions are confidential.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onSubmitAnother}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Submit Another Feedback
          </button>

          {!kioskMode && (
            <a
              href="/"
              className="px-8 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-300 transition-colors text-center"
            >
              Return to Home
            </a>
          )}
        </div>

        {/* Additional Help - Hidden in kiosk mode */}
        {!kioskMode && (
          <div className="mt-12 text-center text-sm text-gray-600">
            <p className="mb-2">Need to report a serious issue or make a formal complaint?</p>
            <a
              href="/services"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Visit our Service Request Portal →
            </a>
          </div>
        )}
      </div>

      {/* Ticket Status Modal - For kiosk mode */}
      {showTicketModal && ticket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Ticket Status</h3>
                <button
                  onClick={() => setShowTicketModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-600">Ticket Number</span>
                    <span className="text-lg font-bold text-blue-600">#{ticket.ticketNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                      Open
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Your support ticket has been created and will be reviewed by our team.
                  They will investigate your concern and work toward a resolution.
                </p>

                {ticket.reason && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                      <strong>Reason:</strong> {ticket.reason}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowTicketModal(false)}
                className="mt-6 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}