/**
 * Tests for Sidebar component
 *
 * Tests role-based menu filtering and navigation behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReadonlyURLSearchParams } from 'next/navigation'
import Sidebar from '@/components/admin/Sidebar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin/home'),
  useSearchParams: vi.fn(() => new URLSearchParams() as ReadonlyURLSearchParams)
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  )
}))

import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'

const mockUseSession = vi.mocked(useSession)
const mockUsePathname = vi.mocked(usePathname)
const mockUseSearchParams = vi.mocked(useSearchParams)

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockUsePathname.mockReturnValue('/admin/home')
    mockUseSearchParams.mockReturnValue(new URLSearchParams() as ReadonlyURLSearchParams)
  })

  describe('Role-based menu filtering', () => {
    it('should show Admin Home for admin users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'admin', email: 'admin@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      expect(screen.getByText('Admin Home')).toBeInTheDocument()
      expect(screen.queryByText('Staff Home')).not.toBeInTheDocument()
    })

    it('should show Staff Home for staff users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'staff', email: 'staff@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      expect(screen.getByText('Staff Home')).toBeInTheDocument()
      expect(screen.queryByText('Admin Home')).not.toBeInTheDocument()
    })

    it('should show Settings menu for admin users only', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'admin', email: 'admin@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should not show Settings menu for staff users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'staff', email: 'staff@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })

    it('should show common menu items for both admin and staff', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'admin', email: 'admin@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      // Common menu items
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Master Data')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Services')).toBeInTheDocument()
      expect(screen.getByText('Tickets')).toBeInTheDocument()
    })

    it('should show common menu items for staff as well', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'staff', email: 'staff@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      // Common menu items should be visible for staff too
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Master Data')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Services')).toBeInTheDocument()
      expect(screen.getByText('Tickets')).toBeInTheDocument()
    })
  })

  describe('Navigation links', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'admin', email: 'admin@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)
    })

    it('should have correct href for Admin Home', () => {
      render(<Sidebar />)

      const adminHomeLink = screen.getByText('Admin Home').closest('a')
      expect(adminHomeLink).toHaveAttribute('href', '/admin/home')
    })

    it('should have correct href for Analytics', () => {
      render(<Sidebar />)

      const analyticsLink = screen.getByText('Analytics').closest('a')
      expect(analyticsLink).toHaveAttribute('href', '/admin/analytics')
    })

    it('should have correct href for Users', () => {
      render(<Sidebar />)

      const usersLink = screen.getByText('Users').closest('a')
      expect(usersLink).toHaveAttribute('href', '/admin/users')
    })
  })

  describe('Active state highlighting', () => {
    it('should highlight active menu item based on pathname', () => {
      mockUsePathname.mockReturnValue('/admin/analytics')
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'admin', email: 'admin@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      const analyticsLink = screen.getByText('Analytics').closest('a')
      // Active links have blue styling
      expect(analyticsLink?.className).toContain('blue')
    })
  })

  describe('Menu items with children', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { roleType: 'admin', email: 'admin@example.com' }
        },
        status: 'authenticated',
        update: vi.fn()
      } as any)
    })

    it('should render Master Data as expandable menu', () => {
      render(<Sidebar />)

      // Master Data should be present as a button (expandable)
      const masterDataButton = screen.getByText('Master Data')
      expect(masterDataButton).toBeInTheDocument()
    })

    it('should render Settings as expandable menu for admin', () => {
      render(<Sidebar />)

      const settingsButton = screen.getByText('Settings')
      expect(settingsButton).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should show fallback during loading', () => {
      // When session is loading, the Suspense boundary shows fallback
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      // The sidebar should still render (in suspense/loading state)
      // Menu items will depend on session, but structure should be present
    })
  })

  describe('Unauthenticated state', () => {
    it('should show minimal menu for unauthenticated users', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn()
      } as any)

      render(<Sidebar />)

      // Without role, only items with requiredRole: null should show
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.queryByText('Admin Home')).not.toBeInTheDocument()
      expect(screen.queryByText('Staff Home')).not.toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })
  })
})
