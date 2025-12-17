/**
 * GEA Portal - External Dashboard API
 *
 * GET /api/external/dashboard
 *
 * Consolidated endpoint for external bot/integration access.
 * Requires X-API-Key header for authentication.
 *
 * Query Parameters:
 *   - include: comma-separated sections (feedback,tickets,leaderboard,requests,entities,services)
 *              Defaults to all sections if not specified
 *   - entity_id: optional entity filter (comma-separated for multiple)
 *
 * Example:
 *   GET /api/external/dashboard?include=feedback,tickets&entity_id=AGY-001
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================
// SECTION FETCHERS
// ============================================

type SectionFetcher = (entityId: string | null) => Promise<any>;

/**
 * Feedback Statistics
 * Source: /api/feedback/stats
 */
async function getFeedbackStats(entityId: string | null) {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (entityId) {
    const entityIds = entityId.split(',').filter(Boolean);
    if (entityIds.length > 0) {
      const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`f.entity_id IN (${placeholders})`);
      params.push(...entityIds);
    }
  }

  const whereClause =
    conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Overall statistics
  const overallStats = await pool.query(
    `
    SELECT
      COUNT(*) as total_submissions,
      ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
      ROUND(AVG(q1_ease)::numeric, 2) as avg_ease,
      ROUND(AVG(q2_clarity)::numeric, 2) as avg_clarity,
      ROUND(AVG(q3_timeliness)::numeric, 2) as avg_timeliness,
      ROUND(AVG(q4_trust)::numeric, 2) as avg_trust,
      COUNT(CASE WHEN grievance_flag = TRUE THEN 1 END) as grievance_count
    FROM service_feedback f
    ${whereClause}
  `,
    params
  );

  // Channel breakdown
  const channelBreakdown = await pool.query(
    `
    SELECT
      channel,
      COUNT(*) as count,
      ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
    FROM service_feedback f
    ${whereClause}
    GROUP BY channel
    ORDER BY count DESC
  `,
    params
  );

  // Rating distribution
  const ratingDistribution = await pool.query(
    `
    SELECT
      q5_overall_satisfaction as rating,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0), 2) as percentage
    FROM service_feedback f
    ${whereClause}
    GROUP BY q5_overall_satisfaction
    ORDER BY q5_overall_satisfaction DESC
  `,
    params
  );

  return {
    overall: overallStats.rows[0],
    by_channel: channelBreakdown.rows,
    rating_distribution: ratingDistribution.rows,
  };
}

/**
 * Ticket Dashboard Statistics
 * Source: /api/admin/tickets/dashboard-stats
 */
async function getTicketStats(entityId: string | null) {
  const whereClause = entityId ? 'WHERE t.assigned_entity_id = $1' : '';
  const queryParams = entityId ? [entityId] : [];

  // Total tickets
  const totalResult = await pool.query(
    `SELECT COUNT(*) as total FROM tickets t ${whereClause}`,
    queryParams
  );

  // Status breakdown
  const statusResult = await pool.query(
    `
    SELECT
      ts.status_name,
      ts.status_code,
      ts.color_code,
      COUNT(t.ticket_id) as count
    FROM ticket_status ts
    LEFT JOIN tickets t ON ts.status_id = t.status_id ${entityId ? 'AND t.assigned_entity_id = $1' : ''}
    WHERE ts.is_active = true
    GROUP BY ts.status_id, ts.status_name, ts.status_code, ts.color_code, ts.sort_order
    ORDER BY ts.sort_order
  `,
    queryParams
  );

  const statusBreakdown = statusResult.rows.reduce((acc: any, row: any) => {
    acc[row.status_code] = {
      name: row.status_name,
      count: parseInt(row.count),
      color: row.color_code,
    };
    return acc;
  }, {});

  // Priority breakdown
  const priorityResult = await pool.query(
    `
    SELECT
      pl.priority_name,
      pl.priority_code,
      pl.color_code,
      COUNT(t.ticket_id) as count
    FROM priority_levels pl
    LEFT JOIN tickets t ON pl.priority_id = t.priority_id ${entityId ? 'AND t.assigned_entity_id = $1' : ''}
    WHERE pl.is_active = true
    GROUP BY pl.priority_id, pl.priority_name, pl.priority_code, pl.color_code, pl.sort_order
    ORDER BY pl.sort_order
  `,
    queryParams
  );

  const priorityBreakdown = priorityResult.rows.reduce((acc: any, row: any) => {
    acc[row.priority_code.toLowerCase()] = {
      name: row.priority_name,
      count: parseInt(row.count),
      color: row.color_code,
    };
    return acc;
  }, {});

  // Additional metrics
  const metricsResult = await pool.query(
    `
    SELECT
      COUNT(CASE WHEN t.sla_resolution_target < NOW() AND t.status_id NOT IN (
        SELECT status_id FROM ticket_status WHERE is_terminal = true
      ) THEN 1 END) as overdue_count,
      COUNT(CASE WHEN t.created_at >= CURRENT_DATE THEN 1 END) as today_count,
      COUNT(CASE WHEN t.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_count
    FROM tickets t
    ${whereClause}
  `,
    queryParams
  );

  return {
    total_tickets: parseInt(totalResult.rows[0]?.total || '0'),
    status_breakdown: statusBreakdown,
    priority_breakdown: priorityBreakdown,
    metrics: {
      overdue_tickets: parseInt(metricsResult.rows[0]?.overdue_count || '0'),
      today_tickets: parseInt(metricsResult.rows[0]?.today_count || '0'),
      week_tickets: parseInt(metricsResult.rows[0]?.week_count || '0'),
    },
  };
}

/**
 * Service Leaderboard
 * Source: /api/admin/service-leaderboard
 */
async function getServiceLeaderboard(entityId: string | null) {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (entityId) {
    const entityIds = entityId.split(',').filter(Boolean);
    if (entityIds.length > 0) {
      const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`s.entity_id IN (${placeholders})`);
      params.push(...entityIds);
    }
  }

  const whereClause =
    conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const result = await pool.query(
    `
    WITH service_feedback_stats AS (
      SELECT
        s.service_id,
        s.service_name,
        e.entity_name,
        COUNT(DISTINCT f.feedback_id) as feedback_count,
        ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
        COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END) as grievance_count
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      LEFT JOIN service_feedback f ON s.service_id = f.service_id
      ${whereClause}
      GROUP BY s.service_id, s.service_name, e.entity_name
      HAVING COUNT(DISTINCT f.feedback_id) > 0
    )
    SELECT *,
      ROUND(
        (COALESCE(avg_satisfaction, 0) * 0.4 +
         (5 - COALESCE(grievance_count::numeric / NULLIF(feedback_count::numeric, 0) * 5, 0)))::numeric,
        2
      ) as overall_score
    FROM service_feedback_stats
    ORDER BY overall_score DESC
  `,
    params
  );

  const allServices = result.rows;

  return {
    top_5: allServices.slice(0, 5),
    bottom_5: allServices.slice(-5).reverse(),
    total_services: allServices.length,
  };
}

/**
 * Service Request Statistics
 * Source: /api/admin/service-requests/stats
 */
async function getServiceRequestStats(entityId: string | null) {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (entityId) {
    const entityIds = entityId.split(',').filter(Boolean);
    if (entityIds.length > 0) {
      const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`entity_id IN (${placeholders})`);
      params.push(...entityIds);
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const statsResult = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as last_30_days
    FROM ea_service_requests
    ${whereClause}
  `,
    params
  );

  const stats = statsResult.rows[0];

  return {
    submitted: parseInt(stats.submitted) || 0,
    in_progress: parseInt(stats.in_progress) || 0,
    under_review: parseInt(stats.under_review) || 0,
    completed: parseInt(stats.completed) || 0,
    rejected: parseInt(stats.rejected) || 0,
    total: parseInt(stats.total) || 0,
    last_7_days: parseInt(stats.last_7_days) || 0,
    last_30_days: parseInt(stats.last_30_days) || 0,
  };
}

/**
 * Entity Master List
 * Source: /api/managedata/entities
 */
async function getEntities(entityId: string | null) {
  let whereClause = '';
  const queryParams: any[] = [];

  if (entityId) {
    whereClause = 'WHERE e.unique_entity_id = $1';
    queryParams.push(entityId);
  }

  const result = await pool.query(
    `
    SELECT
      e.unique_entity_id,
      e.entity_name,
      e.entity_type,
      e.parent_entity_id,
      e.is_active,
      p.entity_name as parent_entity_name
    FROM entity_master e
    LEFT JOIN entity_master p ON e.parent_entity_id = p.unique_entity_id
    ${whereClause}
    ORDER BY e.entity_type, e.entity_name
  `,
    queryParams
  );

  return result.rows;
}

/**
 * Service Master List
 * Source: /api/managedata/services
 */
async function getServices(entityId: string | null) {
  let whereClause = '';
  const queryParams: any[] = [];

  if (entityId) {
    whereClause = 'WHERE s.entity_id = $1';
    queryParams.push(entityId);
  }

  const result = await pool.query(
    `
    SELECT
      s.service_id,
      s.service_name,
      s.entity_id,
      s.service_category,
      s.service_description,
      s.is_active,
      e.entity_name
    FROM service_master s
    JOIN entity_master e ON s.entity_id = e.unique_entity_id
    ${whereClause}
    ORDER BY s.service_category, s.service_name
  `,
    queryParams
  );

  return result.rows;
}

// ============================================
// SECTION MAP
// ============================================

const SECTION_MAP: Record<string, SectionFetcher> = {
  feedback: getFeedbackStats,
  tickets: getTicketStats,
  leaderboard: getServiceLeaderboard,
  requests: getServiceRequestStats,
  entities: getEntities,
  services: getServices,
};

const VALID_SECTIONS = Object.keys(SECTION_MAP);

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(request: NextRequest) {
  try {
    // API Key validation
    const authError = validateApiKey(request);
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const includeParam = searchParams.get('include');
    const entityId = searchParams.get('entity_id') || null;

    // Determine which sections to include
    const requestedSections = includeParam
      ? includeParam.split(',').map((s) => s.trim().toLowerCase())
      : VALID_SECTIONS;

    // Filter to valid sections only
    const sections = requestedSections.filter((s) => VALID_SECTIONS.includes(s));

    if (sections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid sections. Valid options: ${VALID_SECTIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Run selected sections in parallel
    const results = await Promise.allSettled(
      sections.map(async (section) => {
        const data = await SECTION_MAP[section](entityId);
        return { section, data };
      })
    );

    // Build response
    const data: Record<string, any> = {};
    const errors: Record<string, string> = {};

    for (const result of results) {
      if (result.status === 'fulfilled') {
        data[result.value.section] = result.value.data;
      } else {
        const reason = result.reason as Error;
        errors['unknown'] = reason?.message || 'Unknown error';
      }
    }

    return NextResponse.json({
      success: Object.keys(errors).length === 0,
      data,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      meta: {
        included_sections: sections,
        entity_filter: entityId,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[EXTERNAL API] Dashboard error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
