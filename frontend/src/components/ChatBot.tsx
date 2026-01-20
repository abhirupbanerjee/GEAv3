'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { config } from '@/config/env'
import { useChatContext } from '@/hooks/useChatContext'

interface ChatBotSize {
  width: number
  height: number
}

interface ChatBotSettings {
  enabled: boolean
  url: string
}

const DEFAULT_SIZE: ChatBotSize = { width: 480, height: 700 }
const MIN_SIZE = { width: 320, height: 400 }
const MAX_SIZE = { width: 800, height: 900 }

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [size, setSize] = useState<ChatBotSize>(DEFAULT_SIZE)
  const [isResizing, setIsResizing] = useState(false)
  const [chatbotSettings, setChatbotSettings] = useState<ChatBotSettings>({ enabled: false, url: '' })
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const pathname = usePathname()
  const { context } = useChatContext()

  // Fetch chatbot settings from API with cache busting
  const fetchChatbotSettings = useCallback((isInitialLoad = false) => {
    if (!isInitialLoad) {
      setIsRefreshing(true)
      console.log('[ChatBot] Refreshing chatbot settings...')
    }

    // Add timestamp to prevent caching
    fetch(`/api/settings/chatbot?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data) => {
        const newSettings = {
          enabled: data.enabled,
          url: data.url || config.CHATBOT_URL,
        }

        // Log if URL changed
        if (chatbotSettings.url && chatbotSettings.url !== newSettings.url) {
          console.log('[ChatBot] Settings updated:', {
            oldUrl: chatbotSettings.url,
            newUrl: newSettings.url,
          })
        }

        setChatbotSettings(newSettings)
        setSettingsLoaded(true)
        setFetchError(null)
        setIsRefreshing(false)
      })
      .catch((err) => {
        console.error('[ChatBot] Failed to load chatbot settings:', err)
        setFetchError(err.message)

        // Fallback to env config on error (only if not already loaded)
        if (!settingsLoaded) {
          setChatbotSettings({ enabled: true, url: config.CHATBOT_URL })
          setSettingsLoaded(true)
        }
        setIsRefreshing(false)
      })
  }, [chatbotSettings.url, settingsLoaded])

  // Initial fetch on mount
  useEffect(() => {
    fetchChatbotSettings(true) // Initial load
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for settings updates every 60 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchChatbotSettings(false) // Background refresh
    }, 60000) // 60 seconds

    return () => clearInterval(pollInterval)
  }, [fetchChatbotSettings])

  // Refetch settings when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('[ChatBot] Window focused, checking for setting updates...')
      fetchChatbotSettings(false)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchChatbotSettings])

  // Persist chatbot state and size in localStorage
  useEffect(() => {
    const savedState = sessionStorage.getItem('chatbot-open')
    if (savedState === 'true') {
      setIsOpen(true)
    }

    const savedSize = localStorage.getItem('chatbot-size')
    if (savedSize) {
      try {
        const parsedSize = JSON.parse(savedSize)
        setSize({
          width: Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, parsedSize.width)),
          height: Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, parsedSize.height))
        })
      } catch (error) {
        console.error('[ChatBot] Failed to parse saved size:', error)
      }
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
  // Resize handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w') => {
    e.preventDefault()
    e.stopPropagation()

    setIsResizing(true)
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = resizeStartPos.current.x - moveEvent.clientX
      const deltaY = resizeStartPos.current.y - moveEvent.clientY

      let newWidth = resizeStartPos.current.width
      let newHeight = resizeStartPos.current.height

      // Handle horizontal resize
      if (direction.includes('w')) {
        newWidth = resizeStartPos.current.width + deltaX
      } else if (direction.includes('e')) {
        newWidth = resizeStartPos.current.width - deltaX
      }

      // Handle vertical resize
      if (direction.includes('n')) {
        newHeight = resizeStartPos.current.height + deltaY
      } else if (direction.includes('s')) {
        newHeight = resizeStartPos.current.height - deltaY
      }

      // Constrain to min/max sizes
      newWidth = Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, newWidth))
      newHeight = Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, newHeight))

      setSize({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)

      // Save size to localStorage
      localStorage.setItem('chatbot-size', JSON.stringify(size))

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [size])

  // Save size to localStorage when it changes
  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem('chatbot-size', JSON.stringify(size))
    }
  }, [size, isResizing])

  // ──────────────────────────────────────────────────────────────────────────
  // Send context when iframe loads or context changes
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && iframeLoaded && iframeRef.current?.contentWindow && chatbotSettings.url) {
      const message = {
        type: 'CONTEXT_UPDATE',
        context: context,
      }

      try {
        const botOrigin = new URL(chatbotSettings.url).origin
        iframeRef.current.contentWindow.postMessage(message, botOrigin)
        console.log('[ChatBot] Sent context on load/change')
      } catch (error) {
        console.error('[ChatBot] Failed to send context:', error)
      }
    }
  }, [isOpen, iframeLoaded, context, chatbotSettings.url])

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

  const chatbotUrl = chatbotSettings.url || config.CHATBOT_URL
  const iframeSrc = `${chatbotUrl}?source=${encodeURIComponent(pathname)}`

  // Don't render if settings not loaded yet or chatbot is disabled
  if (!settingsLoaded || !chatbotSettings.enabled) {
    return null
  }

  return (
    <>
      {/* Chatbot Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
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
        <div
          ref={containerRef}
          className="fixed bottom-24 right-6 z-45 bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 flex flex-col"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            cursor: isResizing ? 'nwse-resize' : 'default',
            pointerEvents: isResizing ? 'none' : 'auto'
          }}
        >
          {/* Resize Handles */}
          {/* Top-left corner */}
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            style={{ cursor: 'nwse-resize' }}
          />
          {/* Top-right corner */}
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            style={{ cursor: 'nesw-resize' }}
          />
          {/* Bottom-left corner */}
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            style={{ cursor: 'nesw-resize' }}
          />
          {/* Bottom-right corner */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            style={{ cursor: 'nwse-resize' }}
          />
          {/* Top edge */}
          <div
            className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            style={{ cursor: 'ns-resize' }}
          />
          {/* Bottom edge */}
          <div
            className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 's')}
            style={{ cursor: 'ns-resize' }}
          />
          {/* Left edge */}
          <div
            className="absolute left-0 top-4 bottom-4 w-2 cursor-ew-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            style={{ cursor: 'ew-resize' }}
          />
          {/* Right edge */}
          <div
            className="absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize z-10"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            style={{ cursor: 'ew-resize' }}
          />

          {/* Iframe */}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            onLoad={handleIframeLoad}
            className="flex-1 w-full border-0"
            style={{
              pointerEvents: isResizing ? 'none' : 'auto'
            }}
            title="Grenada AI Assistant"
            allow="clipboard-write"
          />
        </div>
      )}

      {/* Mobile Responsive Adjustments */}
      <style jsx>{`
        @media (max-width: 640px) {
          div[ref] {
            bottom: 80px !important;
            right: 1rem !important;
            left: 1rem !important;
            width: calc(100% - 2rem) !important;
            height: 500px !important;
          }
        }
      `}</style>
    </>
  )
}