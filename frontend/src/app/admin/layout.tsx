'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import Sidebar from '@/components/admin/Sidebar'
import AdminContentWrapper from '@/components/admin/AdminContentWrapper'

// Separate component — renders nothing, just handles staff redirect.
// Isolated from the content wrapper so useSession() re-renders
// cannot interfere with page navigation transitions.
function StaffRedirectGuard() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (status === 'loading' || redirectedRef.current) return
    if (session?.user) {
      const isStaff = (session.user as any).roleType === 'staff'
      if (isStaff && pathname === '/admin/home') {
        redirectedRef.current = true
        window.location.replace('/admin/staff/home')
      }
    }
  }, [status])

  return null
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <StaffRedirectGuard />
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
  return <AdminLayoutContent>{children}</AdminLayoutContent>
}
