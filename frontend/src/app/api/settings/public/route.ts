import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

/**
 * Public Settings API
 *
 * Allows client components to fetch non-sensitive settings from database
 * Only settings on the allowlist can be accessed
 *
 * Usage: GET /api/settings/public?keys=MAX_FILE_SIZE,ALLOWED_FILE_TYPES
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keysParam = searchParams.get('keys');

    if (!keysParam) {
      return NextResponse.json(
        { success: false, error: 'Missing keys parameter' },
        { status: 400 }
      );
    }

    const requestedKeys = keysParam.split(',').map(k => k.trim());

    // Security: Allowlist of public (non-sensitive) settings
    const ALLOWED_PUBLIC_SETTINGS = [
      'MAX_FILE_SIZE',
      'MAX_TOTAL_UPLOAD_SIZE',
      'ALLOWED_FILE_TYPES',
      'CHATBOT_ENABLED',
      'CHATBOT_URL',
      'ABOUT_CONTACT_EMAIL',
      'SERVICE_ADMIN_EMAIL',
      'GOG_URL',
      'ESERVICES_URL',
      'CONSTITUTION_URL',
      'SITE_NAME',
      'SITE_SHORT_NAME',
      'SITE_LOGO',
      'SITE_FAVICON',
      // Add other public settings as needed
    ];

    // Filter to only allowed keys
    const allowedKeys = requestedKeys.filter(key =>
      ALLOWED_PUBLIC_SETTINGS.includes(key)
    );

    if (allowedKeys.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid keys provided' },
        { status: 400 }
      );
    }

    // Fetch settings from database directly
    const dbResult = await pool.query(
      `SELECT setting_key, setting_value
       FROM system_settings
       WHERE setting_key = ANY($1)
       AND is_active = true
       AND is_sensitive = false`,
      [allowedKeys]
    );

    // Convert to key-value object
    const result: Record<string, string> = {};
    for (const row of dbResult.rows) {
      result[row.setting_key] = row.setting_value || '';
    }

    return NextResponse.json({
      success: true,
      settings: result,
    });
  } catch (error) {
    console.error('❌ Error fetching public settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Enable CORS if needed for external access
export const dynamic = 'force-dynamic';
