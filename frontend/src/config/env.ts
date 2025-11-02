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
  // Service URLs
  WIKI_URL: 'https://wiki.gea.abhirup.app',
  DMS_URL: 'https://dms.gea.abhirup.app',
  SERVICES_URL: 'https://services.gea.abhirup.app',
  
  // External URLs
  CHATBOT_URL: 'https://gea-ai-assistant.vercel.app/',
  GOG_URL: 'https://www.gov.gd/',
  ESERVICES_URL: 'https://eservice.gov.gd/',
  CONSTITUTION_URL: 'https://grenadaparliament.gd/ova_doc/',
  
  // Site Information
  SITE_NAME: 'Government of Grenada - EA Portal',
  CONTACT_EMAIL: 'eservices@gov.gd',
  COPYRIGHT_YEAR: '2025',
};

// Type definitions for configuration
export type Config = typeof config;