/**
 * GEA Portal - Public Footer Links API
 *
 * GET /api/public/footer-links - Get footer links (no auth required)
 *
 * Returns the configured footer URLs from system settings.
 * Falls back to environment variables or defaults if DB unavailable.
 */

import { NextResponse } from 'next/server';
import { getFooterLinks } from '@/lib/settings';

export async function GET() {
  try {
    const links = await getFooterLinks();

    return NextResponse.json({
      success: true,
      links: {
        quickLinks: [
          { label: 'GoG', url: links.gogUrl },
          { label: 'eServices', url: links.eservicesUrl },
          { label: 'Constitution', url: links.constitutionUrl },
        ],
      },
    });
  } catch (error) {
    console.error('Error fetching footer links:', error);

    // Return fallback values
    return NextResponse.json({
      success: true,
      links: {
        quickLinks: [
          { label: 'GoG', url: 'https://www.gov.gd/' },
          { label: 'eServices', url: 'https://eservice.gov.gd/' },
          { label: 'Constitution', url: 'https://grenadaparliament.gd/ova_doc/' },
        ],
      },
    });
  }
}
