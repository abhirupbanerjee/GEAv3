'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

// Icons as separate components for reusability
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)

const AnalyticsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const TicketsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
)

const MasterDataIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
)

const ServiceRequestsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

// Sub-item icon (smaller dot/circle)
const SubItemIcon = () => (
  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
    <circle cx="4" cy="4" r="3" />
  </svg>
)

interface SubItem {
  label: string
  tabKey: string
  href?: string
}

interface NavigationItem {
  label: string
  href: string
  icon: React.ReactNode
  requiredRole: string | null
  children?: SubItem[]
}

interface SidebarMenuItemProps {
  item: NavigationItem
  isActive: boolean
  isExpanded: boolean
  isCollapsed: boolean
  pathname: string
  searchParams: ReturnType<typeof useSearchParams>
  onToggleExpand: (href: string) => void
  onExpandSidebar: () => void
}

// Extracted component to reduce cognitive complexity
function SidebarMenuItem({
  item,
  isActive,
  isExpanded,
  isCollapsed,
  pathname,
  searchParams,
  onToggleExpand,
  onExpandSidebar,
}: SidebarMenuItemProps) {
  const hasChildren = item.children && item.children.length > 0

  const isSubItemActive = (parentHref: string, tabKey: string) => {
    if (pathname !== parentHref) return false
    return searchParams.get('tab') === tabKey
  }

  const baseClasses = `flex items-center rounded-lg transition-all ${
    isCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'
  }`

  const activeClasses = isCollapsed
    ? 'bg-blue-100 text-blue-700'
    : 'bg-blue-50 text-blue-700 font-medium border-l-3 border-blue-600'

  const inactiveClasses = 'text-gray-700 hover:bg-gray-100'

  if (hasChildren) {
    return (
      <div className="relative group">
        <div className="flex flex-col">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (isCollapsed) {
                // Expand sidebar first to show sub-menu items
                onExpandSidebar()
              } else {
                onToggleExpand(item.href)
              }
            }}
            className={`flex items-center w-full rounded-lg transition-all ${
              isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'
            } ${
              isActive || (pathname === item.href && !searchParams.get('tab'))
                ? activeClasses
                : inactiveClasses
            }`}
            aria-label={isCollapsed ? item.label : undefined}
            title={isCollapsed ? item.label : undefined}
          >
            <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
              <span className={isCollapsed ? '' : 'flex-shrink-0'}>
                {item.icon}
              </span>
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            {!isCollapsed && <ChevronDownIcon isOpen={isExpanded} />}
          </button>

          {!isCollapsed && isExpanded && (
            <div className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1 relative z-10">
              {item.children!.map((child) => {
                const childHref = child.href || `${item.href}?tab=${child.tabKey}`
                const isChildActive = child.href
                  ? pathname === child.href
                  : isSubItemActive(item.href, child.tabKey)
                return (
                  <Link
                    key={child.tabKey}
                    href={childHref}
                    prefetch={false}
                    onClick={(e) => e.stopPropagation()}
                    className={`block flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm cursor-pointer select-none ${
                      isChildActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <SubItemIcon />
                    <span>{child.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {isCollapsed && (
          <div className="hidden lg:group-hover:block absolute left-full ml-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-md whitespace-nowrap shadow-lg">
              {item.label}
              <span className="text-gray-400 text-xs ml-1">({item.children!.length})</span>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative group">
      <Link
        href={item.href}
        onClick={(e) => e.stopPropagation()}
        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        aria-label={isCollapsed ? item.label : undefined}
        title={isCollapsed ? item.label : undefined}
      >
        <span className={isCollapsed ? '' : 'flex-shrink-0'}>
          {item.icon}
        </span>
        {!isCollapsed && <span>{item.label}</span>}
      </Link>

      {isCollapsed && (
        <div className="hidden lg:group-hover:block absolute left-full ml-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-md whitespace-nowrap shadow-lg">
            {item.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  )
}

const navigationItems: NavigationItem[] = [
  // Admin-only home
  {
    label: 'Admin Home',
    href: '/admin/home',
    icon: <HomeIcon />,
    requiredRole: 'admin',
  },
  // Staff-only home
  {
    label: 'Staff Home',
    href: '/admin/staff/home',
    icon: <HomeIcon />,
    requiredRole: 'staff',
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: <AnalyticsIcon />,
    requiredRole: null,
  },
  {
    label: 'Master Data',
    href: '/admin/managedata',
    icon: <MasterDataIcon />,
    requiredRole: null,
    children: [
      { label: 'Entities', tabKey: 'entities' },
      { label: 'Services', tabKey: 'services' },
      { label: 'QR Codes', tabKey: 'qrcodes' },
    ],
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: <UsersIcon />,
    requiredRole: null,  // Allow both admin and staff
  },
  {
    label: 'Services',
    href: '/admin/service-requests',
    icon: <ServiceRequestsIcon />,
    requiredRole: null,
  },
  {
    label: 'Tickets',
    href: '/admin/tickets',
    icon: <TicketsIcon />,
    requiredRole: null,
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: <SettingsIcon />,
    requiredRole: 'admin',
    children: [
      { label: 'System', tabKey: 'SYSTEM' },
      { label: 'Authentication', tabKey: 'AUTHENTICATION' },
      { label: 'Integrations', tabKey: 'INTEGRATIONS' },
      { label: 'Business Rules', tabKey: 'BUSINESS_RULES' },
      { label: 'Performance', tabKey: 'PERFORMANCE' },
      { label: 'Content', tabKey: 'CONTENT' },
      { label: 'Admin Management', tabKey: 'USER_MANAGEMENT' },
      { label: 'Service Providers', tabKey: 'SERVICE_PROVIDERS' },
      { label: 'AI Bots', tabKey: 'AI_BOTS', href: '/admin/ai-inventory' },
      { label: 'Backups', tabKey: 'DATABASE' },
    ],
  },
]

// Inner component that uses useSearchParams - must be wrapped in Suspense
function SidebarContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session, update: updateSession } = useSession()
  const prevPathRef = useRef<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Load collapse state from localStorage (default to collapsed if no saved state)
  useEffect(() => {
    const savedState = localStorage.getItem('ea-portal-sidebar-collapsed')
    // Default to collapsed (true) if no saved state exists
    setIsCollapsed(savedState === null ? true : savedState === 'true')
    // Load expanded items state
    const savedExpanded = localStorage.getItem('ea-portal-sidebar-expanded')
    if (savedExpanded) {
      setExpandedItems(JSON.parse(savedExpanded))
    }
  }, [])

  // Refresh session ONLY when entering admin area from non-admin route
  // This fixes stale sidebar menu without causing page blinking on admin-to-admin navigation
  useEffect(() => {
    const wasInAdmin = prevPathRef.current?.startsWith('/admin')
    const nowInAdmin = pathname.startsWith('/admin')

    // Only update session when transitioning FROM non-admin TO admin
    if (nowInAdmin && !wasInAdmin) {
      updateSession()
    }

    prevPathRef.current = pathname
  }, [pathname, updateSession])

  // Auto-expand parent when navigating to a child route
  useEffect(() => {
    navigationItems.forEach(item => {
      if (item.children && pathname === item.href) {
        setExpandedItems(prev => {
          if (prev.includes(item.href)) return prev
          return [...prev, item.href]
        })
      }
    })
  }, [pathname])


  // Save collapse state to localStorage
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev
      localStorage.setItem('ea-portal-sidebar-collapsed', String(newState))
      window.dispatchEvent(new Event('sidebar-toggled'))
      return newState
    })
  }, [])

  // Toggle expanded state for items with children
  const toggleExpanded = useCallback((href: string) => {
    setExpandedItems(prev => {
      const newExpanded = prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href]
      localStorage.setItem('ea-portal-sidebar-expanded', JSON.stringify(newExpanded))
      return newExpanded
    })
  }, [])

  // Keyboard shortcut: Ctrl/Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        toggleCollapse()
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [toggleCollapse])

  // Filter navigation items based on user role
  const visibleMenuItems = navigationItems.filter((item) => {
    if (!item.requiredRole) return true
    return session?.user?.roleType === item.requiredRole
  })

  // Check if parent is active (either direct match or any child is active)
  const isParentActive = (item: NavigationItem) => {
    if (pathname === item.href) {
      // If it has children and a tab is specified, don't highlight parent
      if (item.children && searchParams.get('tab')) {
        return false
      }
      return true
    }
    return false
  }

  // Expand sidebar (for menu items with children when collapsed)
  const expandSidebar = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false)
      localStorage.setItem('ea-portal-sidebar-collapsed', 'false')
      window.dispatchEvent(new Event('sidebar-toggled'))
    }
  }, [isCollapsed])

  return (
    <>
      {/* Sidebar - Always visible, icon-only when collapsed */}
      <div
        onClick={() => {
          if (isCollapsed) {
            expandSidebar()
          }
        }}
        className={`
          fixed left-0 top-16 z-50 bg-gray-50 border-r border-gray-200 flex flex-col
          transition-all duration-200 ease-in-out
          h-[calc(100vh-4rem)]
          ${isCollapsed ? 'w-16 cursor-pointer' : 'w-64'}
        `}
      >
        {/* Header - Collapse Toggle */}
        <div className="flex items-center justify-end p-2 border-b border-gray-200 bg-white">
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleCollapse()
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem
              key={item.href}
              item={item}
              isActive={isParentActive(item)}
              isExpanded={expandedItems.includes(item.href)}
              isCollapsed={isCollapsed}
              pathname={pathname}
              searchParams={searchParams}
              onToggleExpand={toggleExpanded}
              onExpandSidebar={expandSidebar}
            />
          ))}
        </nav>
      </div>
    </>
  )
}

// Fallback loading state for Suspense (collapsed view by default)
function SidebarFallback() {
  return (
    <div className="fixed left-0 top-16 z-50 bg-gray-50 border-r border-gray-200 flex flex-col h-[calc(100vh-4rem)] w-16">
      <div className="flex items-center justify-end p-2 border-b border-gray-200 bg-white">
        <div className="w-5 h-5" />
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-center p-3 rounded-lg bg-gray-100 animate-pulse">
            <div className="w-5 h-5 bg-gray-300 rounded" />
          </div>
        ))}
      </nav>
    </div>
  )
}

// Main export wrapped in Suspense for useSearchParams
export default function Sidebar() {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <SidebarContent />
    </Suspense>
  )
}
