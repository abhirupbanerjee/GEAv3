'use client'

import { usePathname } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import Sidebar from '@/components/admin/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin'

  // Wrap everything with SessionProvider for NextAuth
  return (
    <SessionProvider>
      {isLoginPage ? (
        // Login page - no sidebar, just the content
        <>{children}</>
      ) : (
        // All other admin pages - show sidebar
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar />
          <div className="flex-1 overflow-auto">
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      )}
    </SessionProvider>
  )
}