'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import Sidebar from '@/components/admin/Sidebar'
import AdminContentWrapper from '@/components/admin/AdminContentWrapper'

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const isLoginPage = pathname === '/admin'

  useEffect(() => {
    // Only redirect after authentication is resolved
    if (status === 'loading') return

    // If authenticated and on admin routes, check role
    if (session?.user && !isLoginPage) {
      const isStaff = session.user.roleType === 'staff'

      // Redirect staff users from admin home to staff home
      if (isStaff && pathname === '/admin/home') {
        router.replace('/admin/staff/home')
      }
    }
  }, [session, status, pathname, router, isLoginPage])

  if (isLoginPage) {
    // Login page - no sidebar, just the content
    return <>{children}</>
  }

  // All other admin pages - show sidebar
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Mobile Sidebar Toggle Button */}
      <button
        onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
        className="lg:hidden fixed top-20 left-4 z-20 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Toggle sidebar menu"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Sidebar />
      <AdminContentWrapper>
        {children}
      </AdminContentWrapper>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // SessionProvider is already provided at root layout level
  return <AdminLayoutContent>{children}</AdminLayoutContent>
}