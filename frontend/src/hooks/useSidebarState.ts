'use client'

import { useEffect, useState } from 'react'

interface SidebarState {
  isCollapsed: boolean
}

/**
 * Hook to track sidebar collapsed/expanded state.
 * Syncs with localStorage and listens for sidebar toggle events.
 */
export function useSidebarState(): SidebarState {
  const [isCollapsed, setIsCollapsed] = useState(true)

  useEffect(() => {
    // Check initial state (default to collapsed if no saved state)
    const checkCollapsedState = () => {
      const savedState = localStorage.getItem('ea-portal-sidebar-collapsed')
      setIsCollapsed(savedState === null ? true : savedState === 'true')
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

  return { isCollapsed }
}
