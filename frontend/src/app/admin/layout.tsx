// ============================================
// ADMIN LAYOUT
// ============================================
// Displays sidebar for authenticated admin pages
// Login page has its own layout (no sidebar)
// ============================================

import Sidebar from '@/components/admin/Sidebar'
import { validateSession } from '@/lib/admin-auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication
  const isAuthenticated = await validateSession()
  
  // If not authenticated (login page), render without sidebar
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  // Authenticated - show sidebar layout
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}