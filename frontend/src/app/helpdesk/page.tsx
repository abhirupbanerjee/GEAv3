/**
 * @pageContext
 * @title Helpdesk Portal
 * @purpose Citizens enter their ticket number to track the status of their feedback submissions and grievances
 * @audience public
 * @steps
 *   - Enter your ticket number in the format YYYYMM-XXXXXX (e.g., 202511-123456)
 *   - Click "View Ticket Status" to navigate to the ticket details page
 *   - View your ticket status, updates, and resolution timeline
 * @tips
 *   - Your ticket number is provided after submitting feedback with low ratings (average ≤ 2.0)
 *   - The ticket number format is YYYYMM-XXXXXX where YYYYMM is the year-month and XXXXXX is a unique identifier
 *   - Keep your ticket number safe to track your grievance progress
 *   - No authentication required - anyone with a valid ticket number can view its status
 * @features
 *   - Ticket number validation (format: YYYYMM-XXXXXX)
 *   - Direct navigation to ticket details page
 *   - Helpful guidance on where to find ticket numbers
 *   - Link to submit new feedback
 * @relatedPages
 *   - /helpdesk/ticket/[ticketNumber]: View detailed ticket status and updates
 *   - /feedback: Submit new feedback for government services
 *   - /: Return to homepage
 * @permissions
 *   - public: Full access - no authentication required
 * @troubleshooting
 *   - Issue: Invalid ticket number format | Solution: Ensure format is YYYYMM-XXXXXX (e.g., 202511-494435)
 *   - Issue: Ticket not found | Solution: Double-check the ticket number for typos, or contact support if issue persists
 *   - Issue: Where do I find my ticket number | Solution: It appears on the confirmation page after submitting feedback with low ratings
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HelpdeskPage() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate ticket number format
    const ticketRegex = /^\d{6}-\d{6}$/;
    const cleanedTicket = ticketNumber.trim();

    if (!cleanedTicket) {
      setError('Please enter a ticket number');
      return;
    }

    if (!ticketRegex.test(cleanedTicket)) {
      setError('Invalid format. Expected: YYYYMM-XXXXXX (e.g., 202511-123456)');
      return;
    }

    // Navigate to ticket details page
    router.push(`/helpdesk/ticket/${cleanedTicket}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Helpdesk Portal
          </h1>
          <p className="text-lg text-gray-600">
            Track your service tickets and feedback submissions
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Track Your Ticket
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="ticketNumber"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Ticket Number
              </label>
              <input
                type="text"
                id="ticketNumber"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="202511-123456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter your ticket number in format: YYYYMM-XXXXXX
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              View Ticket Status
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Where do I find my ticket number?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your ticket number is provided after submitting feedback with low ratings</li>
              <li>• It appears on the confirmation page in format: YYYYMM-XXXXXX</li>
              <li>• Example: 202511-494435</li>
            </ul>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Need to submit new feedback?</p>
          <a
            href="/feedback"
            className="inline-block px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-300 transition-colors"
          >
            Submit Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
