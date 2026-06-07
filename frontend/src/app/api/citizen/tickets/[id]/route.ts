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
        t.subject,
        t.description,
        ts.status_name as status,
        COALESCE(pl.priority_name, 'Medium') as priority,
        t.requester_category as category,
        t.assigned_entity_id,
        e.entity_name as assigned_entity_name,
        t.created_at,
        t.updated_at
      FROM tickets t
      LEFT JOIN entity_master e ON t.assigned_entity_id = e.unique_entity_id
      LEFT JOIN ticket_status ts ON t.status_id = ts.status_id
      LEFT JOIN priority_levels pl ON t.priority_id = pl.priority_id
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
        description,
        performed_by,
        created_at
      FROM ticket_activity
      WHERE ticket_id = $1
      ORDER BY created_at ASC`,
      [row.ticket_id]
    );

    const activities = activitiesResult.rows.map((activity) => ({
      id: activity.activity_id,
      type: activity.activity_type,
      message: activity.description || getActivityMessage(activity.activity_type),
      timestamp: formatDateTime(activity.created_at),
      user: activity.performed_by || undefined,
    }));

    const ticket = {
      id: row.ticket_id,
      ticketNumber: row.ticket_number,
      subject: row.subject,
      description: row.description,
      status: row.status || 'Open',
      statusColor: getStatusColor(row.status),
      priority: row.priority || 'Medium',
      priorityColor: getPriorityColor(row.priority || 'medium'),
      category: row.category || 'General',
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
function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'new': 'bg-yellow-100 text-yellow-800',
    'open': 'bg-yellow-100 text-yellow-800',
    'assigned': 'bg-blue-100 text-blue-800',
    'in progress': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-blue-100 text-blue-800',
    'pending customer': 'bg-orange-100 text-orange-800',
    'pending': 'bg-orange-100 text-orange-800',
    'resolved': 'bg-green-100 text-green-800',
    'closed': 'bg-gray-100 text-gray-800',
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
    created: 'Ticket created and submitted',
    assigned: 'Ticket assigned',
    status_change: 'Status updated',
    resolution: 'Ticket resolved',
  };
  return messages[type] || 'Activity recorded';
}
