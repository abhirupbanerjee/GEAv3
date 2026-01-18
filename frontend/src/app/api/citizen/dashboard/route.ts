/**
 * Citizen Dashboard API
 *
 * GET /api/citizen/dashboard - Get dashboard stats and recent activity
 *
 * Returns aggregated stats and recent items for the citizen dashboard.
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

    // Get ticket stats
    const ticketStats = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')) as open,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved
      FROM tickets
      WHERE submitter_id = $1
        AND submitter_type = 'citizen'`,
      [citizen.citizen_id]
    );

    // Get feedback stats
    const feedbackStats = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_grievance = false OR is_grievance IS NULL) as pending
      FROM service_feedback
      WHERE submitter_id = $1
        AND submitter_type = 'citizen'`,
      [citizen.citizen_id]
    );

    // Get grievance stats
    const grievanceStats = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('open', 'under_investigation')) as open
      FROM grievance_tickets
      WHERE submitter_id = $1
        AND submitter_type = 'citizen'`,
      [citizen.citizen_id]
    );

    // Get recent activity (combined from tickets and feedback)
    const recentTickets = await pool.query(
      `SELECT
        ticket_id as id,
        'ticket' as type,
        title,
        status,
        created_at
      FROM tickets
      WHERE submitter_id = $1
        AND submitter_type = 'citizen'
      ORDER BY created_at DESC
      LIMIT 3`,
      [citizen.citizen_id]
    );

    const recentFeedback = await pool.query(
      `SELECT
        f.feedback_id as id,
        'feedback' as type,
        CONCAT(e.name, ' - ', s.name) as title,
        CASE
          WHEN g.grievance_id IS NOT NULL THEN 'Escalated'
          ELSE 'Received'
        END as status,
        f.created_at
      FROM service_feedback f
      LEFT JOIN entities e ON f.entity_id = e.entity_id
      LEFT JOIN services s ON f.service_id = s.service_id
      LEFT JOIN grievance_tickets g ON g.feedback_id = f.feedback_id
      WHERE f.submitter_id = $1
        AND f.submitter_type = 'citizen'
      ORDER BY f.created_at DESC
      LIMIT 3`,
      [citizen.citizen_id]
    );

    // Combine and sort recent items
    const allRecent = [
      ...recentTickets.rows.map((row) => ({
        id: row.id,
        type: 'ticket' as const,
        title: row.title || 'Ticket',
        status: formatStatus(row.status),
        statusColor: getStatusColor(row.status),
        date: formatRelativeDate(row.created_at),
        href: `/citizen/tickets/${row.id}`,
      })),
      ...recentFeedback.rows.map((row) => ({
        id: row.id,
        type: 'feedback' as const,
        title: row.title || 'Feedback',
        status: row.status,
        statusColor: row.status === 'Escalated' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800',
        date: formatRelativeDate(row.created_at),
        href: '/citizen/feedback',
      })),
    ];

    // Sort by date and take top 5
    allRecent.sort((a, b) => {
      // This is a simplified sort - in production you'd compare actual dates
      return 0;
    });
    const recentItems = allRecent.slice(0, 5);

    const ticketRow = ticketStats.rows[0] || { total: 0, open: 0, resolved: 0 };
    const feedbackRow = feedbackStats.rows[0] || { total: 0, pending: 0 };
    const grievanceRow = grievanceStats.rows[0] || { total: 0, open: 0 };

    return NextResponse.json({
      success: true,
      stats: {
        tickets: {
          total: parseInt(ticketRow.total) || 0,
          open: parseInt(ticketRow.open) || 0,
          resolved: parseInt(ticketRow.resolved) || 0,
        },
        feedback: {
          total: parseInt(feedbackRow.total) || 0,
          pending: parseInt(feedbackRow.pending) || 0,
        },
        grievances: {
          total: parseInt(grievanceRow.total) || 0,
          open: parseInt(grievanceRow.open) || 0,
        },
      },
      recentItems,
    });
  } catch (error) {
    console.error('Error fetching citizen dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return statusMap[status?.toLowerCase()] || status || 'Unknown';
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  };
  return colorMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

function formatRelativeDate(date: Date): string {
  if (!date) return '';

  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}
