'use client'

import Link from 'next/link'
import { useState } from 'react'
import { navigationItems, siteBranding } from '@/config/navigation'

// Grenada Flag SVG Component
const GrenadaFlag = () => (
  <svg 
    width="32" 
    height="20" 
    viewBox="0 0 500 300" 
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    className="rounded-sm"
  >
    <path fill="#ce1126" d="M0 0h500v300H0z"/>
    <path fill="#007a5e" d="M42 42h416v216H42z"/>
    <path d="M42 42h416L42 258h416z" fill="#fcd116"/>
    <circle r="36" cy="150" cx="250" fill="#ce1126"/>
    <path d="M67.944 150.113c4.262 8.515 12.757 17.893 20.313 21.321.367-8.513-2.341-19.515-6.224-28.33z" fill="#ce1126"/>
    <path d="M60.284 121.487c6.35 13.695-17.533 45.856 21.453 53.976-4.736-6.643-7.33-17.752-6.04-26.456 8.095 3.448 16.212 11.464 19.402 18.972 13.444-37.484-26.456-33.922-34.815-46.492z" fill="#fcd116"/>
    <use xlinkHref="#a" fill="#fcd116"/>
    <use xlinkHref="#a" x="100" fill="#fcd116"/>
    <use xlinkHref="#a" x="200" fill="#fcd116"/>
    <use xlinkHref="#a" x="200" y="-258" fill="#fcd116"/>
    <use xlinkHref="#a" x="100" y="-258" fill="#fcd116"/>
    <use xlinkHref="#a" y="-258" fill="#fcd116"/>
    <path d="m250 117-19.397 59.697 50.782-36.895h-62.769l50.782 36.895z" fill="#fcd116"/>
    <defs>
      <path id="a" d="m150 259.5-11.462 35.276 30.007-21.802h-37.091l30.007 21.802z"/>
    </defs>
  </svg>
)

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href={siteBranding.homeUrl} className="flex items-center space-x-2">
            <GrenadaFlag />
            <div className="text-lg font-bold text-gray-900">
              EA Portal
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