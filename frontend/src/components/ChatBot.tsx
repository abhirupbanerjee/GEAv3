'use client'

'use client'

import { useState, useEffect } from 'react'
import { config } from '@/config/env'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  // Persist chatbot state in sessionStorage
  useEffect(() => {
    const savedState = sessionStorage.getItem('chatbot-open')
    if (savedState === 'true') {
      setIsOpen(true)
    }
  }, [])

  const toggleChat = () => {
    const newState = !isOpen
    setIsOpen(newState)
    sessionStorage.setItem('chatbot-open', String(newState))
  }

  return (
    <>
      {/* Chatbot Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Toggle chatbot"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chatbot Overlay */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-xl">🇬🇩</div>
              <span className="font-semibold">Grenada AI Assistant</span>
            </div>
            <button
              onClick={toggleChat}
              className="hover:bg-blue-700 rounded p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Iframe */}
          <iframe
            key={iframeKey}
            src={config.CHATBOT_URL}
            className="w-full h-[calc(100%-60px)]"
            title="Grenada AI Assistant"
            allow="microphone"
          />
        </div>
      )}

      {/* Mobile Responsive Adjustments */}
      <style jsx>{`
        @media (max-width: 640px) {
          .fixed.bottom-24.right-6 {
            bottom: 80px;
            right: 1rem;
            left: 1rem;
            width: calc(100% - 2rem);
            height: 500px;
          }
        }
      `}</style>
    </>
  )
}