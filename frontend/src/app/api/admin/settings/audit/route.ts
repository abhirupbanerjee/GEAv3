/**
 * GEA Portal - Settings Audit Log API
 *
 * Endpoints for viewing settings change history.
 * Only accessible by admin users.
 *
 * GET /api/admin/settings/audit - Get audit history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettingAuditHistory } from '@/lib/settings';

/**
 * GET /api/admin/settings/audit
 * Get settings audit history with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get audit history
    const history = await getSettingAuditHistory(key, Math.min(limit, 200));

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit history' },
      { status: 500 }
    );
  }
}
