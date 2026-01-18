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

export async function GET(request: NextRequest) {
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
        e.name as entity_name,
        f.service_id,
        s.name as service_name,
        f.rating,
        f.feedback_type,
        f.comments,
        f.is_grievance,
        f.created_at,
        g.grievance_id
      FROM service_feedback f
      LEFT JOIN entities e ON f.entity_id = e.entity_id
      LEFT JOIN services s ON f.service_id = s.service_id
      LEFT JOIN grievance_tickets g ON g.feedback_id = f.feedback_id
      WHERE f.submitter_id = $1
        AND f.submitter_type = 'citizen'
      ORDER BY f.created_at DESC
      LIMIT 100`,
      [citizen.citizen_id]
    );

    const feedbackList = result.rows.map((row) => {
      let status = 'received';
      if (row.grievance_id) {
        status = 'grievance_created';
      } else if (row.is_grievance) {
        status = 'reviewed';
      }

      return {
        id: row.feedback_id,
        feedbackId: `FB-${row.feedback_id.substring(0, 8).toUpperCase()}`,
        entityName: row.entity_name || 'Unknown Entity',
        serviceName: row.service_name || 'General Service',
        rating: row.rating || 0,
        feedbackType: row.feedback_type || 'general',
        comment: row.comments || '',
        status,
        grievanceId: row.grievance_id || null,
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
