'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useSidebarState } from '@/hooks/useSidebarState'

interface FooterLink {
  label: string
  url: string
}

interface FooterConfiguration {
  government_text: string
  quick_links: FooterLink[]
  general_info_links: FooterLink[]
  copyright_text: string
}

export default function Footer() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isCollapsed } = useSidebarState()
  const [footerConfig, setFooterConfig] = useState<FooterConfiguration | null>(null)
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

  // Fetch dynamic footer configuration from settings API
  useEffect(() => {
    const fetchFooterConfig = async () => {
      try {
        const response = await fetch('/api/public/footer-links')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.footer) {
            setFooterConfig(data.footer)
          }
        }
      } catch (error) {
        // Set fallback defaults on error
        console.error('Failed to fetch footer configuration:', error)
        const currentYear = new Date().getFullYear()
        setFooterConfig({
          government_text: '',
          quick_links: [
            { label: 'GoG', url: 'https://www.gov.gd/' },
            { label: 'eServices', url: 'https://eservice.gov.gd/' },
            { label: 'Constitution', url: 'https://grenadaparliament.gd/ova_doc/' },
          ],
          general_info_links: [
            { label: 'About Grenada', url: 'https://www.gov.gd/grenada' },
            { label: 'Facts', url: 'https://www.gov.gd/' },
            { label: 'Emergency Info', url: '#' },
          ],
          copyright_text: `© ${currentYear} Digital Transformation Agency (DTA) All rights reserved.`,
        })
      }
    }
    fetchFooterConfig()
  }, [])

  // Don't render on citizen routes or when any user is logged in
  const isAuthenticated = !!session || isCitizenAuth
  if (isCitizenRoute || isAuthenticated || !footerConfig) {
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
            {footerConfig.government_text && (
              <p className="text-sm text-gray-400 mt-2">
                {footerConfig.government_text}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {footerConfig.quick_links.map((link, index) => (
                <li key={`quick-${index}`}>
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
              {footerConfig.general_info_links.map((link, index) => (
                <li key={`info-${index}`}>
                  <a
                    href={link.url}
                    target={link.url.startsWith('#') ? '_self' : '_blank'}
                    rel={link.url.startsWith('#') ? undefined : 'noopener noreferrer'}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          {footerConfig.copyright_text}
        </div>
      </div>
    </footer>
  )
}
