// app/admin/tickets/page.tsx
'use client'

import { useState } from 'react'
import { processFeedbackForTicket, OSTICKET_CONFIG, FeedbackData } from '@/lib/osticket-integration'

export default function AdminTicketsPage() {
  const [formData, setFormData] = useState({
    service_name: '',
    entity_name: '',
    q1_ease: 3,
    q2_clarity: 3,
    q3_timeliness: 3,
    q4_trust: 3,
    q5_overall_satisfaction: 3,
    comment_text: '',
    grievance_flag: false,
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    ticketNumber?: string
    reason?: string
    error?: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    try {
      // Construct FeedbackData object with all required fields
      const feedbackData: FeedbackData = {
        feedback_id: 0, // Temporary ID for manual tickets
        service_id: 'MANUAL', // Manual ticket creation
        entity_id: 'ADMIN',
        service_name: formData.service_name,
        entity_name: formData.entity_name,
        q1_ease: formData.q1_ease,
        q2_clarity: formData.q2_clarity,
        q3_timeliness: formData.q3_timeliness,
        q4_trust: formData.q4_trust,
        q5_overall_satisfaction: formData.q5_overall_satisfaction,
        comment_text: formData.comment_text,
        grievance_flag: formData.grievance_flag,
        channel: 'admin_portal',
        recipient_group: 'Admin',
        submitted_at: new Date().toISOString(),
      }

      // Call processFeedbackForTicket with correct signature
      const ticketResult = await processFeedbackForTicket(
        feedbackData,
        OSTICKET_CONFIG
      )

      setResult({
        success: ticketResult.ticketCreated,
        ticketNumber: ticketResult.ticketNumber,
        reason: ticketResult.reason,
        error: ticketResult.error,
      })

      // Reset form on success
      if (ticketResult.ticketCreated) {
        setFormData({
          service_name: '',
          entity_name: '',
          q1_ease: 3,
          q2_clarity: 3,
          q3_timeliness: 3,
          q4_trust: 3,
          q5_overall_satisfaction: 3,
          comment_text: '',
          grievance_flag: false,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Create Support Ticket
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Name *
              </label>
              <input
                type="text"
                required
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Passport Application"
              />
            </div>

            {/* Entity Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity/MDA Name *
              </label>
              <input
                type="text"
                required
                value={formData.entity_name}
                onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Ministry of Immigration"
              />
            </div>

            {/* Ratings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Service Ratings</h3>
              
              {[
                { key: 'q1_ease', label: 'Ease of Access' },
                { key: 'q2_clarity', label: 'Clarity of Information' },
                { key: 'q3_timeliness', label: 'Timeliness' },
                { key: 'q4_trust', label: 'Trust & Reliability' },
                { key: 'q5_overall_satisfaction', label: 'Overall Satisfaction' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}: {formData[key as keyof typeof formData]}/5
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData[key as keyof typeof formData] as number}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      [key]: parseInt(e.target.value) 
                    })}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments/Issues
              </label>
              <textarea
                value={formData.comment_text}
                onChange={(e) => setFormData({ ...formData, comment_text: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the issue or feedback..."
              />
            </div>

            {/* Grievance Flag */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="grievance"
                checked={formData.grievance_flag}
                onChange={(e) => setFormData({ ...formData, grievance_flag: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="grievance" className="ml-2 block text-sm text-gray-900">
                Mark as formal grievance
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
            </button>
          </form>

          {/* Result Display */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <div>
                  <h3 className="text-green-900 font-semibold mb-2">
                    ✓ Ticket Created Successfully
                  </h3>
                  <p className="text-green-800">
                    Ticket Number: <span className="font-bold">#{result.ticketNumber}</span>
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    Reason: {result.reason}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-red-900 font-semibold mb-2">
                    {result.error ? '✗ Error Creating Ticket' : 'ℹ No Ticket Created'}
                  </h3>
                  <p className="text-red-800 text-sm">
                    {result.error || result.reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}