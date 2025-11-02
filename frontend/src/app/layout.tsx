import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ChatBot from '@/components/ChatBot'
import { config } from '@/config/env'

export const metadata: Metadata = {
  title: config.SITE_NAME,
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
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <ChatBot />
      </body>
    </html>
  )
}