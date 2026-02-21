/**
 * GEA Portal - Public Footer Configuration API
 *
 * GET /api/public/footer-links - Get complete footer configuration (no auth required)
 *
 * Returns the configured footer data from system settings including:
 * - Government section text
 * - Quick Links (labels + URLs)
 * - General Information links (labels + URLs)
 * - Copyright text
 *
 * Falls back to defaults if DB unavailable.
 */

import { NextResponse } from 'next/server';
import { getFooterConfiguration } from '@/lib/settings';

export async function GET() {
  try {
    const footerConfig = await getFooterConfiguration();

    return NextResponse.json({
      success: true,
      footer: footerConfig,
    });
  } catch (error) {
    console.error('Error fetching footer configuration:', error);

    // Return fallback values
    return NextResponse.json({
      success: true,
      footer: {
        government_text: '',
        quick_links: [
          { label: 'GoG', url: 'https://www.gov.gd/' },
          { label: 'eServices', url: 'https://eservice.gov.gd/' },
          { label: 'Constitution', url: 'https://grenadaparliament.gd/ova_doc/' },
        ],
        general_info_links: [
          { label: 'About Grenada', url: 'https://www.gov.gd/grenada' },
          { label: 'Facts', url: 'https://www.gov.gd/' },
          { label: 'Emergency Info', url: '#' },
        ],
        copyright_text: '© Digital Transformation Agency (DTA) All rights reserved.',
      },
    });
  }
}

// Cache for 5 minutes (matches settings cache TTL)
export const revalidate = 300;
