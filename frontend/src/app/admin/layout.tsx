import Sidebar from '@/components/admin/Sidebar'
import { validateSession } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is authenticated
  const isAuthenticated = await validateSession()
  
  // Redirect to login if not authenticated (except for login page itself)
  // Login page is handled separately at /admin/page.tsx
  
  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      ) : (
        // Not authenticated - show login page (handled by /admin/page.tsx)
        <>{children}</>
      )}
    </div>
  )
}