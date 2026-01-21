/**
 * GEA Portal - Service Leaderboard Details API
 *
 * GET /api/admin/service-leaderboard/[serviceId] - Get detailed service statistics
 * Returns comprehensive service data including ratings, metrics, and recent comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceId } = await params;

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    // Fetch configurable weights from settings
    const weightSettings = await getSettings([
      'LEADERBOARD_SATISFACTION_WEIGHT',
      'LEADERBOARD_TICKET_RESOLUTION_WEIGHT',
      'LEADERBOARD_GRIEVANCE_WEIGHT'
    ]);
    const satWeight = (Number(weightSettings.LEADERBOARD_SATISFACTION_WEIGHT) || 40) / 10;
    const ticketWeight = (Number(weightSettings.LEADERBOARD_TICKET_RESOLUTION_WEIGHT) || 25) / 10;
    const grievWeight = (Number(weightSettings.LEADERBOARD_GRIEVANCE_WEIGHT) || 35) / 10;

    // Query 1: Service basic info and feedback stats
    const serviceStatsQuery = `
      SELECT
        s.service_id,
        s.service_name,
        e.entity_name,
        e.unique_entity_id as entity_id,
        COUNT(DISTINCT f.feedback_id) as feedback_count,
        ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
        ROUND(AVG(f.q1_ease)::numeric, 2) as avg_ease,
        ROUND(AVG(f.q2_clarity)::numeric, 2) as avg_clarity,
        ROUND(AVG(f.q3_timeliness)::numeric, 2) as avg_timeliness,
        ROUND(AVG(f.q4_trust)::numeric, 2) as avg_trust,
        COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END) as grievance_count
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      LEFT JOIN service_feedback f ON s.service_id = f.service_id
      WHERE s.service_id = $1
      GROUP BY s.service_id, s.service_name, e.entity_name, e.unique_entity_id
    `;

    const serviceStatsResult = await pool.query(serviceStatsQuery, [serviceId]);

    if (serviceStatsResult.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const serviceStats = serviceStatsResult.rows[0];

    // Query 2: Ticket stats for this service
    const ticketStatsQuery = `
      SELECT
        COUNT(*) as ticket_count,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved_count,
        ROUND(
          (COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::numeric /
           NULLIF(COUNT(*)::numeric, 0) * 100),
          2
        ) as resolution_rate
      FROM tickets
      WHERE service_id = $1
    `;

    const ticketStatsResult = await pool.query(ticketStatsQuery, [serviceId]);
    const ticketStats = ticketStatsResult.rows[0] || {
      ticket_count: 0,
      resolved_count: 0,
      resolution_rate: 0
    };

    // Query 3: Recent comments (non-empty only)
    const recentCommentsQuery = `
      SELECT
        feedback_id,
        comment_text,
        q5_overall_satisfaction as satisfaction_rating,
        created_at,
        grievance_flag
      FROM service_feedback
      WHERE service_id = $1
        AND comment_text IS NOT NULL
        AND TRIM(comment_text) != ''
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const recentCommentsResult = await pool.query(recentCommentsQuery, [serviceId]);

    // Calculate scores
    const feedbackCount = Number(serviceStats.feedback_count) || 0;
    const grievanceCount = Number(serviceStats.grievance_count) || 0;
    const avgSatisfaction = Number(serviceStats.avg_satisfaction) || 0;
    const resolutionRate = Number(ticketStats.resolution_rate) || 0;
    const grievanceRate = feedbackCount > 0 ? grievanceCount / feedbackCount : 0;

    // Calculate score components
    const satisfactionPoints = (avgSatisfaction / 5) * satWeight;
    const resolutionPoints = (resolutionRate / 100) * ticketWeight;
    const grievancePoints = (1 - grievanceRate) * grievWeight;
    const overallScore = satisfactionPoints + resolutionPoints + grievancePoints;

    // Compile response
    const response = {
      service_id: serviceStats.service_id,
      service_name: serviceStats.service_name,
      entity_name: serviceStats.entity_name,
      entity_id: serviceStats.entity_id,

      // Rating dimensions
      avg_ease: Number(serviceStats.avg_ease) || 0,
      avg_clarity: Number(serviceStats.avg_clarity) || 0,
      avg_timeliness: Number(serviceStats.avg_timeliness) || 0,
      avg_trust: Number(serviceStats.avg_trust) || 0,
      avg_satisfaction: avgSatisfaction,

      // Counts
      feedback_count: feedbackCount,
      ticket_count: Number(ticketStats.ticket_count) || 0,
      resolved_count: Number(ticketStats.resolved_count) || 0,
      grievance_count: grievanceCount,

      // Rates
      resolution_rate: resolutionRate,
      grievance_rate: Math.round(grievanceRate * 10000) / 100, // Convert to percentage with 2 decimals

      // Score breakdown
      overall_score: Math.round(overallScore * 100) / 100,
      score_components: {
        satisfaction_points: Math.round(satisfactionPoints * 100) / 100,
        resolution_points: Math.round(resolutionPoints * 100) / 100,
        grievance_points: Math.round(grievancePoints * 100) / 100
      },

      // Weights used
      weights: {
        satisfaction: satWeight * 10,
        ticket_resolution: ticketWeight * 10,
        grievance: grievWeight * 10
      },

      // Recent comments
      recent_comments: recentCommentsResult.rows.map(row => ({
        feedback_id: row.feedback_id,
        comment_text: row.comment_text,
        satisfaction_rating: Number(row.satisfaction_rating),
        created_at: row.created_at,
        grievance_flag: row.grievance_flag
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Service leaderboard details API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve service details' },
      { status: 500 }
    );
  }
}
