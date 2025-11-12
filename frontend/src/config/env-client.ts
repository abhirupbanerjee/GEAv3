// frontend/src/config/env-client.ts
// ============================================
// CLIENT-SIDE ENVIRONMENT CONFIGURATION
// ============================================
// For use in 'use client' components
// Uses NEXT_PUBLIC_ prefixed variables that are
// exposed to the browser at build time
// ============================================

export const clientEnv = {
  // Base URLs
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://gea.abhirup.app',
  
  // Site Information
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Government of Grenada - EA Portal',
  siteShortName: process.env.NEXT_PUBLIC_SITE_SHORT_NAME || 'Government of Grenada',
  
  // Feedback URLs
  feedbackQRBaseUrl: process.env.NEXT_PUBLIC_FRONTEND_URL 
    ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/feedback/qr`
    : 'https://gea.abhirup.app/feedback/qr',
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Domain info (useful for .gov.gd migration)
  domain: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'abhirup.app',
  
} as const

// Helper function to generate QR feedback URL
export function generateQRFeedbackUrl(qrCodeId: string): string {
  return `${clientEnv.feedbackQRBaseUrl}?c=${qrCodeId}`
}

// Helper function to get site name for different contexts
export function getSiteName(context: 'full' | 'short' | 'copyright' = 'full'): string {
  switch (context) {
    case 'short':
      return clientEnv.siteShortName
    case 'copyright':
      return `© ${new Date().getFullYear()} ${clientEnv.siteShortName}. All rights reserved.`
    case 'full':
    default:
      return clientEnv.siteName
  }
}

// Validation helper for debugging
export function validateClientEnv(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!clientEnv.frontendUrl) {
    errors.push('NEXT_PUBLIC_FRONTEND_URL is not set')
  }
  
  if (!clientEnv.frontendUrl.startsWith('http')) {
    errors.push('NEXT_PUBLIC_FRONTEND_URL must start with http:// or https://')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}