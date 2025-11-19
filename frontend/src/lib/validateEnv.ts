// lib/validateEnv.ts
// ============================================
// Validate required environment variables
// Uses env.ts config generated at Docker build time
// ============================================

import { config } from '@/config/env';

export function validateEnvironment() {
  // Check critical variables exist
  const required = [
    'SITE_NAME',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'SERVICE_ADMIN_EMAIL',
    'API_BASE_URL',
  ];

  const missing = required.filter((key) => {
    const value = config[key as keyof typeof config];
    return !value || value === '';
  });

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing);
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  console.log('✅ Environment validation passed');
  
  // Return config for use in app
  return config;
}

// Type-safe config access
export type AppConfig = ReturnType<typeof validateEnvironment>;