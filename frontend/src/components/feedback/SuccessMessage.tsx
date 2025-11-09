'use client'

interface SuccessMessageProps {
  feedbackId: number | null
  serviceName: string
  onSubmitAnother: () => void
}

export default function SuccessMessage({ 
  feedbackId, 
  serviceName, 
  onSubmitAnother 
}: SuccessMessageProps) {
  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Success Animation/Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <svg 
              className="w-16 h-16 text-green-600" 
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
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Thank You!
          </h1>
          
          <p className="text-xl text-gray-600 mb-2">
            Your feedback has been successfully submitted
          </p>

          {feedbackId && (
            <p className="text-sm text-gray-500">
              Reference ID: <span className="font-mono font-semibold">#{feedbackId}</span>
            </p>
          )}
        </div>

        {/* Feedback Summary Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start mb-6">
            <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                What happens next?
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Your feedback about <span className="font-semibold">{serviceName}</span> has been recorded 
                and will be reviewed by the relevant government department. Your input helps us:
              </p>
            </div>
          </div>

          <div className="space-y-4 ml-9">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Identify areas for service improvement</span>
            </div>
            
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Enhance citizen experience across government services</span>
            </div>
            
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">Inform policy and service delivery decisions</span>
            </div>
          </div>
        </div>

        {/* Privacy Reminder */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Your Privacy is Protected</h3>
              <p className="text-sm text-blue-800">
                Your feedback is anonymous. We do not collect or store any personal identifying information 
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
          
          <a
            href="/"
            className="px-8 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-300 transition-colors text-center"
          >
            Return to Home
          </a>
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-center text-sm text-gray-600">
          <p className="mb-2">Need to report a serious issue or make a formal complaint?</p>
          <a 
            href="/services" 
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Visit our Service Request Portal →
          </a>
        </div>
      </div>
    </div>
  )
}