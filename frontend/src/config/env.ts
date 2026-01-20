// ============================================
// ENVIRONMENT CONFIGURATION (Development)
// ============================================
//
// NOTE: This file is for LOCAL DEVELOPMENT only
// In production, this file is auto-generated during
// Docker build from .env.dev variables
//
// DO NOT COMMIT PRODUCTION VALUES HERE
// ============================================

export const config = {
  // App Configuration
  SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME || 'GEA Portal',
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',

  // Environment configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // SendGrid Email Configuration
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'GEA Portal',
  SERVICE_ADMIN_EMAIL: process.env.SERVICE_ADMIN_EMAIL || 'admin@example.com',

  // Rate Limiting
  EA_SERVICE_RATE_LIMIT: parseInt(process.env.EA_SERVICE_RATE_LIMIT || '5'),
  GRIEVANCE_RATE_LIMIT: parseInt(process.env.GRIEVANCE_RATE_LIMIT || '2'),

  // Service Request Configuration
  SERVICE_REQUEST_ENTITY_ID: process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID || 'AGY-005',
  SERVICE_REQUEST_ENTITY_NAME: process.env.NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_NAME || 'Digital Transformation Agency',

  // External URLs
  GOG_URL: process.env.NEXT_PUBLIC_GOG_URL || 'https://www.gov.gd',
  DMS_URL: process.env.NEXT_PUBLIC_DMS_URL || '#',
  GIT_URL: process.env.NEXT_PUBLIC_GIT_URL || '#',
  CHATBOT_URL: process.env.NEXT_PUBLIC_CHATBOT_URL || '',

  // Contact Info
  ABOUT_CONTACT_EMAIL: process.env.NEXT_PUBLIC_ABOUT_CONTACT_EMAIL || 'contact@example.com',
  COPYRIGHT_YEAR: process.env.NEXT_PUBLIC_COPYRIGHT_YEAR || new Date().getFullYear().toString(),
}
