// API: /api/feedback/popular-services
// Public endpoint for displaying popular/trending services on feedback page
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// Cache popular services for 1 hour (3600 seconds)
// Since popular services are based on 90-day feedback data, they don't need real-time updates
export const revalidate = 3600

export async function GET() {
  try {
    // Get popular services based on feedback volume and satisfaction in last 90 days
    const query = `
      SELECT
        s.service_id,
        s.service_name,
        s.service_description,
        s.service_category,
        e.entity_name,
        e.unique_entity_id as entity_id,
        s.life_events,
        COUNT(DISTINCT f.feedback_id)::int as feedback_count,
        ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2)::float as avg_satisfaction,
        COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END)::int as grievance_count,
        MAX(f.created_at) as last_feedback_date
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      LEFT JOIN service_feedback f ON s.service_id = f.service_id
        AND f.created_at >= NOW() - INTERVAL '90 days'
      WHERE s.is_active = TRUE
        AND e.is_active = TRUE
      GROUP BY
        s.service_id,
        s.service_name,
        s.service_description,
        s.service_category,
        e.entity_name,
        e.unique_entity_id,
        s.life_events
      HAVING COUNT(DISTINCT f.feedback_id) >= 3
      ORDER BY
        feedback_count DESC,
        avg_satisfaction DESC NULLS LAST
      LIMIT 8
    `

    const result = await pool.query(query)

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      services: result.rows,
      metadata: {
        period_days: 90,
        min_feedback_threshold: 3,
        last_updated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching popular services:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch popular services',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
