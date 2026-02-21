'use client'

import { useEffect } from 'react'

export default function DynamicFavicon() {
  useEffect(() => {
    async function updateFavicon() {
      try {
        const response = await fetch('/api/settings/branding')
        const data = await response.json()

        if (data.siteFavicon) {
          // Remove existing favicon links
          const existingLinks = document.querySelectorAll("link[rel*='icon']")
          existingLinks.forEach(link => link.remove())

          // Add cache-busting timestamp
          const faviconUrl = `${data.siteFavicon}?v=${Date.now()}`

          // Create new favicon links
          const links = [
            { rel: 'icon', href: faviconUrl },
            { rel: 'shortcut icon', href: faviconUrl },
            { rel: 'apple-touch-icon', href: faviconUrl },
          ]

          links.forEach(({ rel, href }) => {
            const link = document.createElement('link')
            link.rel = rel
            link.href = href
            document.head.appendChild(link)
          })
        }
      } catch (error) {
        console.error('Failed to load dynamic favicon:', error)
      }
    }

    updateFavicon()
  }, [])

  return null
}
