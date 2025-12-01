// ============================================
// FEEDBACK STATISTICS API - Updated for Multi-Select
// ============================================
// GET /api/feedback/stats
// Query Parameters:
//   - service_id: comma-separated IDs (e.g., "SVC-001,SVC-002")
//   - entity_id: comma-separated IDs (e.g., "MIN-001,DEPT-005")
//   - start_date: ISO date string
//   - end_date: ISO date string
//   - channel: ea_portal | qr_code
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { getEntityFilter } from '@/lib/entity-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const serviceIdParam = searchParams.get('service_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const channel = searchParams.get('channel');

    // Apply entity filter for staff users - override entity_id parameter
    const entityFilter = getEntityFilter(session);
    const entityIdParam = entityFilter || searchParams.get('entity_id');

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Handle multiple service IDs (comma-separated)
    if (serviceIdParam && serviceIdParam.trim()) {
      const serviceIds = serviceIdParam.split(',').filter(Boolean);
      if (serviceIds.length > 0) {
        const placeholders = serviceIds.map(() => `$${paramIndex++}`).join(',');
        conditions.push(`f.service_id IN (${placeholders})`);
        params.push(...serviceIds);
      }
    }

    // Handle entity filtering (single entity for staff, multiple for admin)
    if (entityIdParam && entityIdParam.trim()) {
      // Handle multiple entity IDs (comma-separated) for admin
      const entityIds = entityIdParam.split(',').filter(Boolean);
      if (entityIds.length > 0) {
        const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
        conditions.push(`f.entity_id IN (${placeholders})`);
        params.push(...entityIds);
      }
    }

    if (startDate) {
      conditions.push(`f.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`f.created_at <= $${paramIndex++}`);
      params.push(endDate + ' 23:59:59');
    }

    if (channel) {
      conditions.push(`f.channel = $${paramIndex++}`);
      params.push(channel);
    }

    const whereClause = conditions.length > 0 
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // Query 1: Overall Statistics
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_submissions,
        ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
        ROUND(AVG(q1_ease)::numeric, 2) as avg_ease,
        ROUND(AVG(q2_clarity)::numeric, 2) as avg_clarity,
        ROUND(AVG(q3_timeliness)::numeric, 2) as avg_timeliness,
        ROUND(AVG(q4_trust)::numeric, 2) as avg_trust,
        COUNT(CASE WHEN grievance_flag = TRUE THEN 1 END) as grievance_count,
        MIN(created_at) as first_submission,
        MAX(created_at) as last_submission
      FROM service_feedback f
      ${whereClause}
    `, params);

    // Query 2: Breakdown by Channel
    const channelBreakdown = await pool.query(`
      SELECT 
        channel,
        COUNT(*) as count,
        ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
      FROM service_feedback f
      ${whereClause}
      GROUP BY channel
      ORDER BY count DESC
    `, params);

    // Query 3: Breakdown by Recipient Group
    const recipientBreakdown = await pool.query(`
      SELECT 
        recipient_group,
        COUNT(*) as count,
        ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
      FROM service_feedback f
      ${whereClause}
      ${conditions.length > 0 ? 'AND' : 'WHERE'} recipient_group IS NOT NULL
      GROUP BY recipient_group
      ORDER BY count DESC
    `, params);

    // Query 4: Rating Distribution for Overall Satisfaction
    const ratingDistribution = await pool.query(`
      SELECT 
        q5_overall_satisfaction as rating,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM service_feedback f
      ${whereClause}
      GROUP BY q5_overall_satisfaction
      ORDER BY q5_overall_satisfaction DESC
    `, params);

    // Query 5: Top Services (if not filtered by specific services)
    let topServices = null;
    if (!serviceIdParam || !serviceIdParam.trim()) {
      topServices = await pool.query(`
        SELECT 
          s.service_id,
          s.service_name,
          e.entity_name,
          COUNT(f.feedback_id) as submission_count,
          ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
        FROM service_feedback f
        JOIN service_master s ON f.service_id = s.service_id
        JOIN entity_master e ON f.entity_id = e.unique_entity_id
        ${whereClause}
        GROUP BY s.service_id, s.service_name, e.entity_name
        ORDER BY submission_count DESC
        LIMIT 10
      `, params);
    }

    // Query 6: Trend Data (Daily submissions for date range or last 30 days)
    let trendData = null;
    if (!startDate && !endDate) {
      // No date filter - show last 30 days
      const trendParams = conditions.length > 0 
        ? params.filter((_, i) => i < conditions.length) 
        : [];
      
      trendData = await pool.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as submissions,
          ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
        FROM service_feedback f
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, trendParams);
    } else {
      // Date filter applied - show trend for that range
      trendData = await pool.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as submissions,
          ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
        FROM service_feedback f
        ${whereClause}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, params);
    }

    // Query 7: Comments with Grievances
    const recentGrievances = await pool.query(`
      SELECT
        f.feedback_id,
        s.service_name,
        e.entity_name,
        f.q5_overall_satisfaction as satisfaction_rating,
        f.comment_text,
        f.created_at AS submitted_at
      FROM service_feedback f
      JOIN service_master s ON f.service_id = s.service_id
      JOIN entity_master e ON f.entity_id = e.unique_entity_id
      ${whereClause}
      ${conditions.length > 0 ? 'AND' : 'WHERE'} f.grievance_flag = TRUE
      ORDER BY f.created_at DESC
      LIMIT 10
    `, params);

    // Compile response
    const response = {
      filters: {
        service_id: serviceIdParam,
        entity_id: entityIdParam,
        start_date: startDate,
        end_date: endDate,
        channel: channel
      },
      overall: overallStats.rows[0],
      by_channel: channelBreakdown.rows,
      by_recipient: recipientBreakdown.rows,
      rating_distribution: ratingDistribution.rows,
      top_services: topServices?.rows || null,
      trend: trendData?.rows || null,
      recent_grievances: recentGrievances.rows
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}