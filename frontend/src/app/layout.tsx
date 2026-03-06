import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatBot from '@/components/ChatBot'
import SessionProvider from '@/components/providers/SessionProvider'
import { ChatContextProvider } from '@/providers/ChatContextProvider'
import { getSetting } from '@/lib/settings'
import DynamicFavicon from '@/components/DynamicFavicon'

// Revalidate metadata every 60 seconds for dynamic favicon updates
export const revalidate = 60

// Convert legacy /uploads/ paths to /api/uploads/ for proper serving
function convertUploadPath(path: string): string {
  if (path && path.startsWith('/uploads/')) {
    return path.replace('/uploads/', '/api/uploads/')
  }
  return path
}

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSetting('SITE_NAME', process.env.NEXT_PUBLIC_SITE_NAME || 'EA Portal')
  const siteFaviconRaw = await getSetting('SITE_FAVICON', '')
  const siteFavicon = convertUploadPath(siteFaviconRaw)

  // Add timestamp for cache busting (changes every hour)
  const cacheBuster = siteFavicon ? `?v=${Math.floor(Date.now() / 3600000)}` : ''
  const faviconUrl = siteFavicon ? `${siteFavicon}${cacheBuster}` : undefined

  const icons: Metadata['icons'] = faviconUrl
    ? {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      }
    : undefined

  return {
    title: siteName,
    description: 'Enterprise Architecture Portal for the Government of Grenada',
    icons,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || ''

  return (
    <html lang="en">
      <head>
        <meta name="csp-nonce" content={nonce} />
      </head>
      <body>
        <DynamicFavicon />
        <SessionProvider>
          <ChatContextProvider>
            <Header />
            <main className="min-h-screen relative z-0 pt-16">
              {children}
            </main>
            <Footer />
            <ChatBot />
          </ChatContextProvider>
        </SessionProvider>
      </body>
    </html>
  )
}