// ============================================
// ADMIN LAYOUT
// ============================================
// Simplified version - authentication is handled by:
// 1. middleware.ts (protects routes)
// 2. admin/page.tsx (login/redirect logic)
// ============================================

import Sidebar from '@/components/admin/Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layout simply renders children
  // Authentication is handled upstream by middleware
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}