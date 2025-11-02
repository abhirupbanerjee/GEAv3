'use client'

import Link from 'next/link'
import { useState } from 'react'
import { navigationItems, siteBranding } from '@/config/navigation'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href={siteBranding.homeUrl} className="flex items-center space-x-2">
            <span className="text-2xl">{siteBranding.logo}</span>
            <div>
              <div className="font-bold text-gray-900">{siteBranding.name}</div>
              <div className="text-xs text-gray-600">{siteBranding.tagline}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              item.type === 'internal' ? (
                <Link key={item.label} href={item.href} className="text-gray-700 hover:text-blue-600 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-600 transition-colors">
                  {item.label}
                </a>
              )
            ))}
          </nav>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            {navigationItems.map((item) => (
              item.type === 'internal' ? (
                <Link key={item.label} href={item.href} className="block py-2 text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="block py-2 text-gray-700">
                  {item.label}
                </a>
              )
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
