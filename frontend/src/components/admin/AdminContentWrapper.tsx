'use client'

import { useEffect, useState } from 'react'

export default function AdminContentWrapper({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // Check initial state
    const checkCollapsedState = () => {
      const savedState = localStorage.getItem('ea-portal-sidebar-collapsed')
      setIsCollapsed(savedState === 'true')
    }

    checkCollapsedState()

    // Listen for storage changes (in case user changes it in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ea-portal-sidebar-collapsed') {
        setIsCollapsed(e.newValue === 'true')
      }
    }

    // Listen for custom event from sidebar
    const handleSidebarToggle = () => {
      const savedState = localStorage.getItem('ea-portal-sidebar-collapsed')
      setIsCollapsed(savedState === 'true')
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('sidebar-toggled', handleSidebarToggle)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('sidebar-toggled', handleSidebarToggle)
    }
  }, [])

  return (
    <div
      className={`transition-all duration-200 ${
        isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}
    >
      <main className="p-6">{children}</main>
    </div>
  )
}
