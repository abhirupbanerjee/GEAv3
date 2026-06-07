/**
 * Admin/Staff Activity API
 *
 * GET /api/admin/activity - Get recent activity for the logged-in user
 *
 * Query params:
 *   - limit: number of records (default 50, max 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Get activity from user_audit_log
    const result = await executeQuery(
      `SELECT
        log_id,
        action,
        resource_type,
        resource_id,
        old_value,
        new_value,
        ip_address,
        created_at
      FROM user_audit_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [session.user.id, limit]
    );

    // Format activity items
    const activities = result.rows.map((row) => ({
      id: row.log_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      oldValue: row.old_value,
      newValue: row.new_value,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
      description: formatActivityDescription(row.action, row.resource_type, row.resource_id, row.new_value),
    }));

    return NextResponse.json({
      success: true,
      activities,
      total: activities.length,
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}

function formatActivityDescription(
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  newValue: Record<string, unknown> | null
): string {
  switch (action) {
    case 'login':
      return 'Signed in to the portal';
    case 'logout':
      return 'Signed out of the portal';
    case 'user_created':
      return `Created user ${newValue?.email || resourceId || ''}`;
    case 'user_updated':
      return `Updated user ${resourceId || ''}`;
    case 'user_deleted':
      return `Deactivated user ${resourceId || ''}`;
    case 'entity_created':
      return `Created entity ${newValue?.entity_name || resourceId || ''}`;
    case 'entity_updated':
      return `Updated entity ${resourceId || ''}`;
    case 'service_created':
      return `Created service ${newValue?.name || resourceId || ''}`;
    case 'service_updated':
      return `Updated service ${resourceId || ''}`;
    case 'ticket_created':
      return `Created ticket ${resourceId || ''}`;
    case 'ticket_updated':
      return `Updated ticket ${resourceId || ''}`;
    case 'feedback_submitted':
      return `Submitted feedback ${resourceId || ''}`;
    case 'settings_updated':
      return `Updated system settings`;
    default:
      return `${action.replace(/_/g, ' ')}${resourceType ? ` on ${resourceType}` : ''}`;
  }
}
