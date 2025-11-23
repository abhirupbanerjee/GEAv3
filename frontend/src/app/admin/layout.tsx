'use client'

import { usePathname, useRouter } from 'next/navigation'
import { SessionProvider, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import Sidebar from '@/components/admin/Sidebar'

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
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Wrap everything with SessionProvider for NextAuth
  return (
    <SessionProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SessionProvider>
  )
}