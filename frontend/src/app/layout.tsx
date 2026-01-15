import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatBot from '@/components/ChatBot'
import SessionProvider from '@/components/providers/SessionProvider'
import { ChatContextProvider } from '@/providers/ChatContextProvider'
import { getSetting } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSetting('SITE_NAME', process.env.NEXT_PUBLIC_SITE_NAME || 'EA Portal')
  const siteFavicon = await getSetting('SITE_FAVICON', '')

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
            <main className="min-h-screen">
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