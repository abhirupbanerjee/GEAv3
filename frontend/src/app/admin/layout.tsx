'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import Sidebar from '@/components/admin/Sidebar'
import AdminContentWrapper from '@/components/admin/AdminContentWrapper'

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isLoginPage = pathname === '/admin'

  // Staff redirect: use ref to run once when auth resolves, not on every navigation
  const redirectedRef = useRef(false)
  useEffect(() => {
    if (status === 'loading' || redirectedRef.current) return

    if (session?.user && !isLoginPage) {
      const isStaff = (session.user as any).roleType === 'staff'

      // Redirect staff users from admin home to staff home
      if (isStaff && pathname === '/admin/home') {
        redirectedRef.current = true
        window.location.replace('/admin/staff/home')
      }
    }
  }, [status])

  if (isLoginPage) {
    // Login page - no sidebar, just the content
    return <>{children}</>
  }

  // All other admin pages - show sidebar
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
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