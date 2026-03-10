/**
 * Citizen Feedback API
 *
 * GET /api/citizen/feedback - List feedback for logged-in citizen
 *
 * Returns feedback where submitter_id matches the citizen's ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCitizen } from '@/lib/citizen-auth';
import { pool } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    // Verify citizen is logged in
    const citizen = await getCurrentCitizen();
    if (!citizen) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Query feedback for this citizen
    const result = await pool.query(
      `SELECT
        f.feedback_id,
        f.entity_id,
        e.entity_name,
        f.service_id,
        s.service_name,
        f.q5_overall_satisfaction as rating,
        f.comment_text,
        f.grievance_flag,
        f.created_at
      FROM service_feedback f
      LEFT JOIN entity_master e ON f.entity_id = e.unique_entity_id
      LEFT JOIN service_master s ON f.service_id = s.service_id
      WHERE f.submitter_id = $1
        AND f.submitter_type = 'citizen'
      ORDER BY f.created_at DESC
      LIMIT 100`,
      [citizen.citizen_id]
    );

    const feedbackList = result.rows.map((row) => {
      const status = row.grievance_flag ? 'grievance_flagged' : 'received';

      return {
        id: row.feedback_id,
        feedbackId: `FB-${String(row.feedback_id).padStart(6, '0')}`,
        entityName: row.entity_name || 'Unknown Entity',
        serviceName: row.service_name || 'General Service',
        rating: row.rating || 0,
        feedbackType: 'general' as const,
        comment: row.comment_text || '',
        status,
        grievanceFlag: row.grievance_flag || false,
        grievanceId: null,
        createdAt: formatDate(row.created_at),
      };
    });

    return NextResponse.json({
      success: true,
      feedback: feedbackList,
      total: feedbackList.length,
    });
  } catch (error) {
    console.error('Error fetching citizen feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

function formatDate(date: Date): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
