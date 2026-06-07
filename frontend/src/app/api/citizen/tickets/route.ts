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

    // Get filter parameters
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');

    // Build dynamic query with optional entity filter
    const params: string[] = [citizen.citizen_id];
    let entityFilter = '';
    if (entityId) {
      params.push(entityId);
      entityFilter = `AND t.assigned_entity_id = $${params.length}`;
    }

    // Query tickets for this citizen with optional filters
    const result = await pool.query(
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
      WHERE t.submitter_id = $1
        AND t.submitter_type = 'citizen'
        ${entityFilter}
      ORDER BY t.created_at DESC
      LIMIT 100`,
      params
    );

    // Query distinct entities for filter dropdown
    const entitiesResult = await pool.query(
      `SELECT DISTINCT e.unique_entity_id as id, e.entity_name as name
       FROM tickets t
       JOIN entity_master e ON t.assigned_entity_id = e.unique_entity_id
       WHERE t.submitter_id = $1
         AND t.submitter_type = 'citizen'
         AND t.assigned_entity_id IS NOT NULL
       ORDER BY e.entity_name`,
      [citizen.citizen_id]
    );

    const tickets = result.rows.map((row) => ({
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
      assignedEntityId: row.assigned_entity_id || null,
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at),
    }));

    const entities = entitiesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
    }));

    return NextResponse.json({
      success: true,
      tickets,
      total: tickets.length,
      entities,
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

function formatDate(date: Date): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
