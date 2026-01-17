/**
 * GEA Portal - Settings Redirect Page
 *
 * Redirects /admin/setting to /admin/settings
 * Shows access denied message for staff users
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function SettingRedirectPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') return

    // Staff users see access denied
    if (session?.user?.roleType === 'staff') {
      // Don't redirect, show access denied
      return
    }

    // Admin users get redirected to correct URL
    if (session?.user?.roleType === 'admin') {
      router.replace('/admin/settings')
    }
  }, [session, status, router])

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Staff users see access denied message
  if (session?.user?.roleType === 'staff') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">
            Only administrators can access system settings.
          </p>
          <a href="/admin/staff/home" className="text-blue-600 hover:underline">
            &larr; Return to Staff Home
          </a>
        </div>
      </div>
    )
  }

  // Admin users see redirect message (briefly)
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Settings...</p>
      </div>
    </div>
  )
}
