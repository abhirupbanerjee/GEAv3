/**
 * Citizen Tickets API
 *
 * GET /api/citizen/tickets - List tickets for logged-in citizen
 * POST /api/citizen/tickets - Create a new ticket (future)
 *
 * Returns tickets where submitter_id matches the citizen's ID.
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

    // Query tickets for this citizen
    const result = await pool.query(
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
      WHERE t.submitter_id = $1
        AND t.submitter_type = 'citizen'
      ORDER BY t.created_at DESC
      LIMIT 100`,
      [citizen.citizen_id]
    );

    const tickets = result.rows.map((row) => ({
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
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at),
    }));

    return NextResponse.json({
      success: true,
      tickets,
      total: tickets.length,
    });
  } catch (error) {
    console.error('Error fetching citizen tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets' },
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

function formatDate(date: Date): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
