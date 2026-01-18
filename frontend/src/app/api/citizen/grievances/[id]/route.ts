/**
 * Citizen Grievance Detail API
 *
 * GET /api/citizen/grievances/[id] - Get grievance details with activity
 *
 * Returns grievance details including visible activities/comments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCitizen } from '@/lib/citizen-auth';
import { pool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify citizen is logged in
    const citizen = await getCurrentCitizen();
    if (!citizen) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Query grievance (must belong to this citizen)
    const grievanceResult = await pool.query(
      `SELECT
        g.grievance_id,
        g.grievance_number,
        g.title,
        g.description,
        g.status,
        g.priority,
        g.entity_id,
        e.name as entity_name,
        g.feedback_id,
        g.created_at,
        g.updated_at
      FROM grievance_tickets g
      LEFT JOIN entities e ON g.entity_id = e.entity_id
      WHERE g.grievance_id = $1
        AND g.submitter_id = $2
        AND g.submitter_type = 'citizen'`,
      [id, citizen.citizen_id]
    );

    if (grievanceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Grievance not found' },
        { status: 404 }
      );
    }

    const row = grievanceResult.rows[0];

    // Query visible activities
    const activitiesResult = await pool.query(
      `SELECT
        activity_id,
        activity_type,
        comment,
        created_by,
        created_at,
        visible_to_citizen
      FROM grievance_activity
      WHERE grievance_id = $1
        AND (
          activity_type != 'internal_note'
          OR visible_to_citizen = TRUE
        )
      ORDER BY created_at ASC`,
      [id]
    );

    const activities = activitiesResult.rows.map((activity) => ({
      id: activity.activity_id,
      type: activity.activity_type === 'internal_note' && activity.visible_to_citizen
        ? 'admin_comment'
        : activity.activity_type,
      message: activity.comment || getActivityMessage(activity.activity_type),
      timestamp: formatDateTime(activity.created_at),
      user: (activity.activity_type === 'internal_note' || activity.activity_type === 'admin_comment')
        ? 'Grievance Committee'
        : undefined,
    }));

    // Add initial activity if none exist
    if (activities.length === 0) {
      activities.push({
        id: 'initial',
        type: row.feedback_id ? 'escalation' : 'status_change',
        message: row.feedback_id
          ? `Grievance created from escalated feedback`
          : 'Grievance submitted',
        timestamp: formatDateTime(row.created_at),
        user: undefined,
      });
    }

    const grievance = {
      id: row.grievance_id,
      grievanceNumber: row.grievance_number || `GRV-${row.grievance_id.substring(0, 8).toUpperCase()}`,
      subject: row.title || 'Grievance',
      description: row.description || '',
      status: row.status || 'open',
      statusColor: getStatusColor(row.status || 'open'),
      priority: formatPriority(row.priority),
      priorityColor: getPriorityColor(row.priority || 'medium'),
      entityName: row.entity_name || 'Unknown Entity',
      source: row.feedback_id ? 'escalated_feedback' : 'direct',
      feedbackId: row.feedback_id ? `FB-${row.feedback_id.substring(0, 8).toUpperCase()}` : null,
      createdAt: formatDateTime(row.created_at),
      updatedAt: formatDateTime(row.updated_at),
      activities,
    };

    return NextResponse.json({
      success: true,
      grievance,
    });
  } catch (error) {
    console.error('Error fetching grievance detail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch grievance' },
      { status: 500 }
    );
  }
}

function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    urgent: 'Urgent',
  };
  return priorityMap[priority?.toLowerCase()] || 'Medium';
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-800',
    under_investigation: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    escalated: 'bg-red-100 text-red-800',
  };
  return colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

function getPriorityColor(priority: string): string {
  const colorMap: Record<string, string> = {
    high: 'bg-red-100 text-red-800',
    urgent: 'bg-red-100 text-red-800',
    medium: 'bg-orange-100 text-orange-800',
    low: 'bg-green-100 text-green-800',
  };
  return colorMap[priority?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

function formatDateTime(date: Date): string {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getActivityMessage(type: string): string {
  const messages: Record<string, string> = {
    created: 'Grievance submitted',
    escalation: 'Grievance escalated from feedback',
    assigned: 'Assigned to grievance committee',
    status_change: 'Status updated',
    resolution: 'Grievance resolved',
  };
  return messages[type] || 'Activity recorded';
}
