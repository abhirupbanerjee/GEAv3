'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import UserProfileDropdown from './UserProfileDropdown'

const navigationItems = [
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Feedback', href: '/feedback' },
  { label: 'Helpdesk', href: '/helpdesk' },
]

// Default Grenada flag SVG as fallback
const DefaultLogo = () => (
  <svg width="32" height="20" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" className="rounded-sm">
    <path fill="#ce1126" d="M0 0h500v300H0z" />
    <path fill="#007a5e" d="M42 42h416v216H42z" />
    <path d="M42 42h416L42 258h416z" fill="#fcd116" />
    <circle r="36" cy="150" cx="250" fill="#ce1126" />
  </svg>
)

interface BrandingSettings {
  siteName: string
  siteLogo: string
  siteLogoAlt: string
  siteFavicon: string
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const [branding, setBranding] = useState<BrandingSettings>({
    siteName: 'EA Portal',
    siteLogo: '',
    siteLogoAlt: 'EA Portal Logo',
    siteFavicon: '',
  })

  useEffect(() => {
    fetch('/api/settings/branding')
      .then((res) => res.json())
      .then((data) => setBranding(data))
      .catch((err) => console.error('Failed to load branding:', err))
  }, [])

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            {branding.siteLogo ? (
              <Image
                src={branding.siteLogo}
                alt={branding.siteLogoAlt}
                width={32}
                height={32}
                className="rounded-sm object-contain"
                unoptimized={branding.siteLogo.startsWith('http')}
              />
            ) : (
              <DefaultLogo />
            )}
            <div className="text-lg font-bold text-gray-900">{branding.siteName}</div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            {/* Show User Home link if authenticated */}
            {session && (
              <Link
                href={session.user?.roleType === 'staff' ? '/admin/staff/home' : '/admin/home'}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Dashboard</span>
              </Link>
            )}
            {/* Show Profile Dropdown if authenticated, otherwise show Login button */}
            {session ? (
              <UserProfileDropdown />
            ) : status !== 'loading' ? (
              <Link
                href="/admin"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Login
              </Link>
            ) : null}
          </nav>

          {/* Mobile menu button - positioned on the right to avoid sidebar conflict */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 ml-auto"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-blue-600 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {/* Mobile: Show User Home link if authenticated */}
              {session && (
                <Link
                  href={session.user?.roleType === 'staff' ? '/admin/staff/home' : '/admin/home'}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Dashboard</span>
                </Link>
              )}
              {/* Mobile: Show Profile Dropdown or Login */}
              {session ? (
                <div className="pt-2">
                  <UserProfileDropdown />
                </div>
              ) : status !== 'loading' ? (
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
              ) : null}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}