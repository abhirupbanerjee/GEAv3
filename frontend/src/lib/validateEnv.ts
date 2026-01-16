// lib/validateEnv.ts
// ============================================
// Validate required environment variables
// Uses env.ts config generated at Docker build time
// ============================================

import { config } from '@/config/env';

export function validateEnvironment() {
  // Critical required variables (app won't work without these)
  const required = [
    'SITE_NAME',
    'API_BASE_URL',
  ];

  // Optional variables (features disabled if missing)
  const optional = [
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'SERVICE_ADMIN_EMAIL',
  ];

  const missing = required.filter((key) => {
    const value = config[key as keyof typeof config];
    return !value || value === '';
  });

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  // Warn about optional missing vars (don't fail build)
  const missingOptional = optional.filter((key) => {
    const value = config[key as keyof typeof config];
    return !value || value === '';
  });

  if (missingOptional.length > 0) {
    console.warn('⚠️ Optional features disabled (missing env vars):', missingOptional);
  }

  console.log('✅ Environment validation passed');

  // Return config for use in app
  return config;
}

// Type-safe config access
export type AppConfig = ReturnType<typeof validateEnvironment>;