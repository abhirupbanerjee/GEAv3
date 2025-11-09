// ============================================
// FEEDBACK STATISTICS API
// ============================================
// GET /api/feedback/stats
// Query params: service_id, entity_id, start_date, end_date, channel
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract filter parameters
    const serviceId = searchParams.get('service_id');
    const entityId = searchParams.get('entity_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const channel = searchParams.get('channel');

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (serviceId) {
      conditions.push(`f.service_id = $${paramCount}`);
      params.push(serviceId);
      paramCount++;
    }

    if (entityId) {
      conditions.push(`f.entity_id = $${paramCount}`);
      params.push(entityId);
      paramCount++;
    }

    if (startDate) {
      conditions.push(`f.submitted_at >= $${paramCount}`);
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      conditions.push(`f.submitted_at <= $${paramCount}`);
      params.push(endDate);
      paramCount++;
    }

    if (channel) {
      conditions.push(`f.channel = $${paramCount}`);
      params.push(channel);
      paramCount++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Query 1: Overall Statistics
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_submissions,
        ROUND(AVG(q1_ease)::numeric, 2) as avg_ease,
        ROUND(AVG(q2_clarity)::numeric, 2) as avg_clarity,
        ROUND(AVG(q3_timeliness)::numeric, 2) as avg_timeliness,
        ROUND(AVG(q4_trust)::numeric, 2) as avg_trust,
        ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
        SUM(CASE WHEN grievance_flag THEN 1 ELSE 0 END) as grievance_count,
        MIN(submitted_at) as first_submission,
        MAX(submitted_at) as last_submission
      FROM service_feedback f
      ${whereClause}
    `, params);

    // Query 2: Channel Breakdown
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

    // Query 3: Recipient Group Breakdown
    const recipientBreakdown = await pool.query(`
      SELECT 
        recipient_group,
        COUNT(*) as count,
        ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
      FROM service_feedback f
      ${whereClause ? whereClause + ' AND' : 'WHERE'} recipient_group IS NOT NULL
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

    // Query 5: Top Services (if not filtered by service)
    let topServices = null;
    if (!serviceId) {
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

    // Query 6: Trend Data (Daily submissions for last 30 days if no date filter)
    let trendData = null;
    if (!startDate && !endDate) {
      trendData = await pool.query(`
        SELECT 
          DATE(submitted_at) as date,
          COUNT(*) as submissions,
          ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
        FROM service_feedback f
        WHERE submitted_at >= NOW() - INTERVAL '30 days'
        ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
        GROUP BY DATE(submitted_at)
        ORDER BY date DESC
      `, conditions.length > 0 ? params.filter((_, i) => i < conditions.length) : []);
    }

    // Query 7: Comments with Grievances
    const recentGrievances = await pool.query(`
      SELECT 
        f.feedback_id,
        s.service_name,
        e.entity_name,
        f.q5_overall_satisfaction as satisfaction_rating,
        f.comment_text,
        f.submitted_at
      FROM service_feedback f
      JOIN service_master s ON f.service_id = s.service_id
      JOIN entity_master e ON f.entity_id = e.unique_entity_id
      ${whereClause}
      ${conditions.length > 0 ? 'AND' : 'WHERE'} f.grievance_flag = TRUE
      ORDER BY f.submitted_at DESC
      LIMIT 10
    `, params);

    // Compile response
    const response = {
      filters: {
        service_id: serviceId,
        entity_id: entityId,
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