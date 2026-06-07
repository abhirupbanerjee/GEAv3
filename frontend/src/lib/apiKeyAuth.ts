/**
 * GEA Portal - External API Key Authentication
 *
 * Validates X-API-Key header for external API access.
 * Used by /api/external/* endpoints for bot/integration access.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validate API key for external requests
 * Returns null if valid, error response if invalid
 *
 * @param request - NextRequest object
 * @returns NextResponse error or null if valid
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get('X-API-Key');
  const validKey = process.env.EXTERNAL_API_KEY;

  // API key not configured = external access disabled
  if (!validKey) {
    console.warn('[EXTERNAL API] EXTERNAL_API_KEY not configured');
    return NextResponse.json(
      { success: false, error: 'External API access not configured' },
      { status: 503 }
    );
  }

  // Missing or invalid key
  if (!apiKey || apiKey !== validKey) {
    console.warn(
      `[EXTERNAL API] Invalid key: ${apiKey?.substring(0, 8) || 'missing'}...`
    );
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  console.log(`[EXTERNAL API] Authenticated: ${apiKey.substring(0, 8)}...`);
  return null; // Valid
}
