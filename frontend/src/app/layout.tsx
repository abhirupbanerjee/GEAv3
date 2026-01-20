import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatBot from '@/components/ChatBot'
import SessionProvider from '@/components/providers/SessionProvider'
import { ChatContextProvider } from '@/providers/ChatContextProvider'
import { getSetting } from '@/lib/settings'

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

  const icons: Metadata['icons'] = siteFavicon
    ? {
        icon: siteFavicon,
        shortcut: siteFavicon,
        apple: siteFavicon,
      }
    : undefined

  return {
    title: siteName,
    description: 'Enterprise Architecture Portal for the Government of Grenada',
    icons,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ChatContextProvider>
            <Header />
            <main className="min-h-screen isolate">
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