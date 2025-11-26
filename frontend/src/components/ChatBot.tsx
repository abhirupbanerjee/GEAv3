'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { config } from '@/config/env'
import { useChatContext } from '@/hooks/useChatContext'

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pathname = usePathname()
  const { context } = useChatContext()

  // Persist chatbot state in sessionStorage
  useEffect(() => {
    const savedState = sessionStorage.getItem('chatbot-open')
    if (savedState === 'true') {
      setIsOpen(true)
    }
  }, [])

  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      const newState = !prev
      sessionStorage.setItem('chatbot-open', String(newState))
      if (!newState) {
        setIframeLoaded(false)
      }
      return newState
    })
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Send context when iframe loads or context changes
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && iframeLoaded && iframeRef.current?.contentWindow) {
      const message = {
        type: 'CONTEXT_UPDATE',
        context: context,
      }

      try {
        const botOrigin = new URL(config.CHATBOT_URL).origin
        iframeRef.current.contentWindow.postMessage(message, botOrigin)
        console.log('[ChatBot] Sent context on load/change')
      } catch (error) {
        console.error('[ChatBot] Failed to send context:', error)
      }
    }
  }, [isOpen, iframeLoaded, context])

  // ──────────────────────────────────────────────────────────────────────────
  // Handle iframe load
  // ──────────────────────────────────────────────────────────────────────────

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true)
    console.log('[ChatBot] Iframe loaded')
  }, [])

  // ──────────────────────────────────────────────────────────────────────────
  // Build iframe URL
  // ──────────────────────────────────────────────────────────────────────────

  const iframeSrc = `${config.CHATBOT_URL}?source=${encodeURIComponent(pathname)}`

  // ──────────────────────────────────────────────────────────────────────────
  // Get display info for current context
  // ──────────────────────────────────────────────────────────────────────────

  const getContextDisplay = () => {
    if (context.modal) {
      return `📋 ${context.modal.title || context.modal.type}`
    }
    if (context.edit?.isEditing) {
      return `✏️ Editing ${context.edit.entityName || context.edit.entityType}`
    }
    if (context.tab) {
      return `📁 ${context.tab.activeTab}`
    }
    return `📍 ${pathname}`
  }

  return (
    <>
      {/* Chatbot Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
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
        <div className="fixed bottom-24 right-6 z-50 w-[400px] h-[600px] md:w-[480px] md:h-[700px] bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/icon.png"
                alt="GEA"
                className="w-8 h-8 rounded"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div>
                <h3 className="font-semibold text-sm">Grenada AI Assistant</h3>
                <span className="text-xs text-blue-200 truncate block max-w-[200px]">
                  {getContextDisplay()}
                </span>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Iframe */}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            onLoad={handleIframeLoad}
            className="flex-1 w-full border-0"
            title="Grenada AI Assistant"
            allow="clipboard-write"
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