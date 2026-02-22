// ============================================
// HELPDESK STATUS CHECK ENDPOINT
// ============================================
// GET /api/helpdesk/status
// Returns whether public helpdesk is currently enabled
// Used by client components (e.g., Header) to conditionally show helpdesk links
// ============================================

import { NextResponse } from 'next/server';
import { getPublicHelpdeskSettings } from '@/lib/settings';

export async function GET() {
  try {
    const { enabled } = await getPublicHelpdeskSettings();
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Error checking helpdesk status:', error);
    // Default to enabled on error for backward compatibility
    return NextResponse.json({ enabled: true }, { status: 200 });
  }
}
