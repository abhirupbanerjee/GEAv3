'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { footerLinks as staticFooterLinks } from '@/config/content'
import { config } from '@/config/env'
import { useSidebarState } from '@/hooks/useSidebarState'

interface FooterLink {
  label: string
  url: string
}

export default function Footer() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isCollapsed } = useSidebarState()
  const [quickLinks, setQuickLinks] = useState<FooterLink[]>(staticFooterLinks.quickLinks)
  const [gogUrl, setGogUrl] = useState(config.GOG_URL)
  const [isCitizenAuth, setIsCitizenAuth] = useState(false)

  // Hide footer on citizen portal pages (they have their own layout)
  const isCitizenRoute = pathname?.startsWith('/citizen')

  // Determine if we should show sidebar margin (admin pages with authenticated user)
  // /admin is the login page - no sidebar there
  const isAdminRoute = pathname?.startsWith('/admin') && pathname !== '/admin'
  const showSidebarMargin = isAdminRoute && !!session

  // Check if citizen is authenticated
  useEffect(() => {
    const checkCitizenAuth = async () => {
      try {
        const res = await fetch('/api/citizen/auth/check')
        if (res.ok) {
          const data = await res.json()
          setIsCitizenAuth(data.authenticated === true)
        }
      } catch {
        // Ignore errors - assume not authenticated
      }
    }
    // Only check if not already authenticated via NextAuth
    if (!session) {
      checkCitizenAuth()
    }
  }, [session])

  // Fetch dynamic footer links from settings API
  useEffect(() => {
    const fetchFooterLinks = async () => {
      try {
        const response = await fetch('/api/public/footer-links')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.links?.quickLinks) {
            setQuickLinks(data.links.quickLinks)
            // Update GoG URL for Facts link
            const gogLink = data.links.quickLinks.find((l: FooterLink) => l.label === 'GoG')
            if (gogLink) {
              setGogUrl(gogLink.url)
            }
          }
        }
      } catch (error) {
        // Keep static fallback on error
        console.error('Failed to fetch footer links:', error)
      }
    }
    fetchFooterLinks()
  }, [])

  // Don't render on citizen routes or when any user is logged in
  const isAuthenticated = !!session || isCitizenAuth
  if (isCitizenRoute || isAuthenticated) {
    return null
  }

  return (
    <footer className={`bg-gray-900 text-white relative z-50 transition-all duration-200 ${
      showSidebarMargin ? (isCollapsed ? 'md:ml-16' : 'md:ml-64') : ''
    }`}>
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Government Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="text-2xl">🇬🇩</div>
              <div>
                <div className="font-bold">Government of Grenada</div>
                <div className="text-sm text-gray-400">EA Portal</div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* General Information */}
          <div>
            <h3 className="font-semibold text-lg mb-4">General Information</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  About Grenada
                </Link>
              </li>
              <li>
                <a
                  href={gogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Facts
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Emergency Info
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          © {config.COPYRIGHT_YEAR} Digital Transformation Agency (DTA) All rights reserved.
        </div>
      </div>
    </footer>
  )
}
