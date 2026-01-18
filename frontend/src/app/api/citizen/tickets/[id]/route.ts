/**
 * Citizen Ticket Detail API
 *
 * GET /api/citizen/tickets/[id] - Get ticket details with activity
 *
 * Returns ticket details including visible activities/comments.
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

    // Query ticket (must belong to this citizen)
    const ticketResult = await pool.query(
      `SELECT
        t.ticket_id,
        t.ticket_number,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.category,
        t.location,
        t.assigned_entity_id,
        e.name as assigned_entity_name,
        t.created_at,
        t.updated_at
      FROM tickets t
      LEFT JOIN entities e ON t.assigned_entity_id = e.entity_id
      WHERE t.ticket_id = $1
        AND t.submitter_id = $2
        AND t.submitter_type = 'citizen'`,
      [id, citizen.citizen_id]
    );

    if (ticketResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const row = ticketResult.rows[0];

    // Query visible activities
    const activitiesResult = await pool.query(
      `SELECT
        activity_id,
        activity_type,
        comment,
        created_by,
        created_at,
        visible_to_citizen,
        CASE
          WHEN activity_type = 'internal_note' AND visible_to_citizen = TRUE
          THEN 'admin_comment'
          ELSE activity_type
        END as display_type
      FROM ticket_activity
      WHERE ticket_id = $1
        AND (
          activity_type != 'internal_note'
          OR visible_to_citizen = TRUE
        )
      ORDER BY created_at ASC`,
      [id]
    );

    const activities = activitiesResult.rows.map((activity) => ({
      id: activity.activity_id,
      type: activity.display_type,
      message: activity.comment || getActivityMessage(activity.activity_type),
      timestamp: formatDateTime(activity.created_at),
      user: activity.display_type === 'admin_comment' ? 'Support Team' : undefined,
    }));

    const ticket = {
      id: row.ticket_id,
      ticketNumber: row.ticket_number,
      subject: row.title,
      description: row.description,
      status: formatStatus(row.status),
      statusColor: getStatusColor(row.status),
      priority: row.priority ? formatPriority(row.priority) : 'Medium',
      priorityColor: getPriorityColor(row.priority || 'medium'),
      category: row.category || 'General',
      location: row.location || null,
      assignedEntity: row.assigned_entity_name || 'Unassigned',
      createdAt: formatDateTime(row.created_at),
      updatedAt: formatDateTime(row.updated_at),
      activities,
    };

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Error fetching ticket detail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// Helper functions
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    pending: 'Pending',
  };
  return statusMap[status?.toLowerCase()] || status || 'Unknown';
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    pending: 'bg-orange-100 text-orange-800',
  };
  return colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    urgent: 'Urgent',
  };
  return priorityMap[priority?.toLowerCase()] || priority || 'Medium';
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
    created: 'Ticket created and submitted',
    assigned: 'Ticket assigned',
    status_change: 'Status updated',
    resolution: 'Ticket resolved',
  };
  return messages[type] || 'Activity recorded';
}
