import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/settings/branding
 * Public endpoint to fetch branding settings (logo, favicon, site name)
 * No authentication required - these are public-facing settings
 */
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value
       FROM system_settings
       WHERE setting_key IN ('SITE_NAME', 'SITE_LOGO', 'SITE_LOGO_ALT', 'SITE_FAVICON')
       AND is_active = true`
    )

    const settings: Record<string, string> = {}
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value || ''
    }

    return NextResponse.json({
      siteName: settings['SITE_NAME'] || process.env.NEXT_PUBLIC_SITE_NAME || 'EA Portal',
      siteLogo: settings['SITE_LOGO'] || '',
      siteLogoAlt: settings['SITE_LOGO_ALT'] || 'EA Portal Logo',
      siteFavicon: settings['SITE_FAVICON'] || '',
    })
  } catch (error) {
    console.error('Error fetching branding settings:', error)
    // Return defaults on error
    return NextResponse.json({
      siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'EA Portal',
      siteLogo: '',
      siteLogoAlt: 'EA Portal Logo',
      siteFavicon: '',
    })
  }
}
