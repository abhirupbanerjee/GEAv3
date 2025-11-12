// frontend/src/app/feedback/qr/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function QRFeedbackContent() {
  const searchParams = useSearchParams()
  const qrCode = searchParams.get('c')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrData, setQrData] = useState<any>(null)

  useEffect(() => {
    if (!qrCode) {
      setError('Invalid QR code - missing code parameter')
      setLoading(false)
      return
    }

    // Fetch QR code details
    fetch(`/api/feedback/qr/${qrCode}`)
      .then(res => {
        if (!res.ok) throw new Error('QR code not found or inactive')
        return res.json()
      })
      .then(data => {
        setQrData(data)
        setLoading(false)
        
        // Increment scan count
        fetch(`/api/feedback/qr/${qrCode}/scan`, { method: 'POST' })
          .catch(err => console.error('Failed to increment scan count:', err))
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [qrCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback form...</p>
        </div>
      </div>
    )
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">QR Code Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Invalid QR code'}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    )
  }

  // Redirect to feedback page with pre-filled service
  const feedbackUrl = `/feedback?service=${qrData.service_id}&qr=${qrCode}`
  
  if (typeof window !== 'undefined') {
    window.location.href = feedbackUrl
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to feedback form...</p>
      </div>
    </div>
  )
}

export default function QRFeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    }>
      <QRFeedbackContent />
    </Suspense>
  )
}