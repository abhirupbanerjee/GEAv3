/**
 * Citizen Analytics API
 *
 * Returns analytics data for the logged-in citizen:
 * - Feedback stats: total, average rating, rating breakdown
 * - Ticket stats: total, status breakdown
 *
 * Supports ?refresh=true to bypass cache.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { withCache } from '@/lib/redis';

interface AnalyticsData {
  feedback: {
    total: number;
    averageRating: number | null;
    ratingBreakdown: { rating: number; count: number }[];
  };
  tickets: {
    total: number;
    statusBreakdown: { status: string; count: number }[];
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication via citizen session cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('citizen_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to view analytics' },
        { status: 401 }
      );
    }

    // Validate session and get citizen ID
    const sessionResult = await pool.query(
      `SELECT cs.citizen_id, c.phone
       FROM citizen_sessions cs
       JOIN citizens c ON c.citizen_id = cs.citizen_id
       WHERE cs.token = $1 AND cs.expires_at > NOW()`,
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session expired', message: 'Please log in again' },
        { status: 401 }
      );
    }

    const { citizen_id, phone } = sessionResult.rows[0];

    // Check for refresh parameter
    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === 'true';

    // Use withCache for Redis caching with 5 minute TTL
    const cacheKey = `citizen:analytics:${citizen_id}`;

    const fetchAnalytics = async (): Promise<AnalyticsData> => {
      // Fetch feedback stats
    const feedbackResult = await pool.query(
      `SELECT
         COUNT(*)::int as total,
         ROUND(AVG(rating), 1) as average_rating
       FROM service_feedback
       WHERE submitter_id = $1
         OR (submitter_phone IS NOT NULL AND submitter_phone = $2)`,
      [citizen_id, phone]
    );

    const feedbackStats = feedbackResult.rows[0] || { total: 0, average_rating: null };

    // Fetch rating breakdown
    const ratingResult = await pool.query(
      `SELECT rating, COUNT(*)::int as count
       FROM service_feedback
       WHERE (submitter_id = $1 OR (submitter_phone IS NOT NULL AND submitter_phone = $2))
         AND rating IS NOT NULL
       GROUP BY rating
       ORDER BY rating DESC`,
      [citizen_id, phone]
    );

    // Ensure all ratings 1-5 are represented
    const ratingMap = new Map<number, number>();
    for (let i = 5; i >= 1; i--) {
      ratingMap.set(i, 0);
    }
    for (const row of ratingResult.rows) {
      ratingMap.set(row.rating, row.count);
    }
    const ratingBreakdown = Array.from(ratingMap.entries()).map(([rating, count]) => ({
      rating,
      count,
    }));

    // Fetch ticket stats
    const ticketResult = await pool.query(
      `SELECT COUNT(*)::int as total
       FROM tickets
       WHERE submitter_id = $1
         OR (submitter_phone IS NOT NULL AND submitter_phone = $2)`,
      [citizen_id, phone]
    );

    const ticketTotal = ticketResult.rows[0]?.total || 0;

    // Fetch status breakdown
    const statusResult = await pool.query(
      `SELECT
         COALESCE(s.status_name, t.status) as status,
         COUNT(*)::int as count
       FROM tickets t
       LEFT JOIN status_master s ON t.status = s.status_code OR t.status = s.status_name
       WHERE t.submitter_id = $1
         OR (t.submitter_phone IS NOT NULL AND t.submitter_phone = $2)
       GROUP BY COALESCE(s.status_name, t.status)
       ORDER BY count DESC`,
      [citizen_id, phone]
    );

    const statusBreakdown = statusResult.rows.map((row) => ({
      status: row.status || 'Unknown',
      count: row.count,
    }));

      return {
        feedback: {
          total: feedbackStats.total,
          averageRating: feedbackStats.average_rating ? parseFloat(feedbackStats.average_rating) : null,
          ratingBreakdown,
        },
        tickets: {
          total: ticketTotal,
          statusBreakdown,
        },
      };
    };

    // Use withCache for Redis caching (5 minute TTL, bypass on refresh)
    const analytics = await withCache<AnalyticsData>(
      cacheKey,
      300, // 5 minutes
      fetchAnalytics,
      refresh
    );

    return NextResponse.json({
      success: true,
      ...analytics,
      cached: !refresh,
    });
  } catch (error) {
    console.error('Error fetching citizen analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
