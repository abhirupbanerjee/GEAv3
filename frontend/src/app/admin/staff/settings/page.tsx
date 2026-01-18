/**
 * GEA Portal - Staff Settings Access Denied Page
 *
 * This page shows an access denied message for staff users
 * trying to access settings at /admin/staff/settings
 */

'use client'

import { useSession } from 'next-auth/react'

export default function StaffSettingsPage() {
  const { status } = useSession()

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

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
