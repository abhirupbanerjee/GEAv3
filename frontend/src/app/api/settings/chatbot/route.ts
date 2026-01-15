import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/settings/chatbot
 * Public endpoint to fetch chatbot configuration
 * Returns enabled status and URL
 */
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value
       FROM system_settings
       WHERE setting_key IN ('CHATBOT_ENABLED', 'CHATBOT_URL')
       AND is_active = true`
    )

    const settings: Record<string, string> = {}
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value || ''
    }

    // Parse enabled as boolean
    const enabled = settings['CHATBOT_ENABLED'] === 'true' || settings['CHATBOT_ENABLED'] === '1'
    const url = settings['CHATBOT_URL'] || process.env.NEXT_PUBLIC_CHATBOT_URL || ''

    return NextResponse.json({
      enabled,
      url,
    })
  } catch (error) {
    console.error('Error fetching chatbot settings:', error)
    // Return defaults on error - default to enabled with env URL
    return NextResponse.json({
      enabled: true,
      url: process.env.NEXT_PUBLIC_CHATBOT_URL || '',
    })
  }
}
