/**
 * GEA Portal - Admin Citizens API
 *
 * Endpoints for managing citizens in the system.
 * Only accessible by admin users.
 * PII is masked - only phone number is shown, name/email shown as boolean flags.
 *
 * GET /api/admin/citizens - List all citizens with stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

/**
 * GET /api/admin/citizens
 * List all citizens with PII masked
 *
 * Query Parameters:
 * - search: Search by phone number only
 * - status: 'active', 'blocked', 'all' (default: 'all')
 * - sort: 'last_login', 'feedbacks', 'tickets', 'created' (default: 'last_login')
 * - order: 'asc', 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'last_login';
    const order = searchParams.get('order') || 'desc';

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Search by phone only (PII protection)
    if (search) {
      conditions.push(`c.phone ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Status filter
    if (status === 'active') {
      conditions.push('c.is_active = true');
    } else if (status === 'blocked') {
      conditions.push('c.is_active = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Determine ORDER BY clause
    let orderByClause = 'ORDER BY ';
    switch (sort) {
      case 'feedbacks':
        orderByClause += `feedback_count ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;
        break;
      case 'tickets':
        orderByClause += `ticket_count ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;
        break;
      case 'created':
        orderByClause += `c.created_at ${order === 'asc' ? 'ASC' : 'DESC'}`;
        break;
      case 'last_login':
      default:
        orderByClause += `c.last_login ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;
        break;
    }

    // Main query with PII masked and counts
    const query = `
      SELECT
        c.citizen_id,
        c.phone,
        CASE WHEN c.name IS NOT NULL AND c.name != '' THEN true ELSE false END as has_name,
        CASE WHEN c.email IS NOT NULL AND c.email != '' THEN true ELSE false END as has_email,
        c.is_active,
        c.registration_complete,
        c.block_reason,
        c.blocked_at,
        c.blocked_by,
        c.created_at,
        c.last_login,
        COALESCE(f.feedback_count, 0) as feedback_count,
        COALESCE(t.ticket_count, 0) as ticket_count
      FROM citizens c
      LEFT JOIN (
        SELECT submitter_id, COUNT(*) as feedback_count
        FROM service_feedback
        WHERE submitter_type = 'citizen'
        GROUP BY submitter_id
      ) f ON c.citizen_id::text = f.submitter_id
      LEFT JOIN (
        SELECT submitter_id, COUNT(*) as ticket_count
        FROM tickets
        WHERE submitter_type = 'citizen'
        GROUP BY submitter_id
      ) t ON c.citizen_id::text = t.submitter_id
      ${whereClause}
      ${orderByClause}
    `;

    const result = await pool.query(query, params);

    // Get stats
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as blocked
      FROM citizens
    `;
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    return NextResponse.json({
      success: true,
      citizens: result.rows,
      stats: {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        blocked: parseInt(stats.blocked),
      },
    });
  } catch (error) {
    console.error('Error fetching citizens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch citizens' },
      { status: 500 }
    );
  }
}
