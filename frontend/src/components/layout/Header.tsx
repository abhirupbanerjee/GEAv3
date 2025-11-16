'use client'

import Link from 'next/link'
import { useState } from 'react'
import { config } from '@/config/env'

const navigationItems = [
  { label: 'About', href: '/about', type: 'internal' as const },
  { label: 'Services', href: '/services', type: 'internal' as const },
  { label: 'Feedback', href: '/feedback', type: 'internal' as const },
  { label: 'Repository', href: config.DMS_URL, type: 'external' as const },
  { label: 'Wiki', href: config.WIKI_URL, type: 'external' as const },
  { label: 'Git', href: config.GIT_URL, type: 'external' as const },
  { label: 'Helpdesk', href: config.HELPDESK_URL, type: 'external' as const },
]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <svg width="32" height="20" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" className="rounded-sm">
              <path fill="#ce1126" d="M0 0h500v300H0z" />
              <path fill="#007a5e" d="M42 42h416v216H42z" />
              <path d="M42 42h416L42 258h416z" fill="#fcd116" />
              <circle r="36" cy="150" cx="250" fill="#ce1126" />
            </svg>
            <div className="text-lg font-bold text-gray-900">EA Portal</div>
          </Link>

          {/* Desktop Navigation - NO LOGIN/LOGOUT BUTTONS */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              item.type === 'internal' ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {item.label}
                </a>
              )
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation - NO LOGIN/LOGOUT BUTTONS */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-3">
              {navigationItems.map((item) => (
                item.type === 'internal' ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-gray-700 hover:text-blue-600 py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 hover:text-blue-600 py-2"
                  >
                    {item.label}
                  </a>
                )
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}