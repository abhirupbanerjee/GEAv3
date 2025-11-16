// ============================================
// ADMIN LOGIN PAGE
// ============================================
// This page handles BOTH login form AND redirect after auth
// ============================================

import { validateSession } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import AdminLoginForm from '@/components/admin/AdminLoginForm'

export default async function AdminPage() {
  // Check if already authenticated
  const isAuthenticated = await validateSession()
  
  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    redirect('/admin/home')
  }

  // Not authenticated - show login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white p-4 rounded-full mb-4">
            <svg className="w-16 h-16 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            GEA Admin Portal
          </h1>
          <p className="text-blue-200">
            Government of Grenada Enterprise Architecture
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Administrator Login
          </h2>
          
          <AdminLoginForm />
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Authorized access only. All login attempts are logged.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-blue-200 text-sm">
          <p>© 2025 Government of Grenada. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}