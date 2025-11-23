import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatBot from '@/components/ChatBot'
import SessionProvider from '@/components/providers/SessionProvider'
import { validateEnvironment } from '@/lib/validateEnv'

// Validate environment on app startup
const appConfig = validateEnvironment();

export const metadata: Metadata = {
  title: appConfig.SITE_NAME,
  description: 'Enterprise Architecture Portal for the Government of Grenada',
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
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <ChatBot />
        </SessionProvider>
      </body>
    </html>
  )
}