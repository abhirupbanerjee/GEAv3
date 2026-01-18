/**
 * Citizen Grievances API
 *
 * GET /api/citizen/grievances - List grievances for logged-in citizen
 *
 * Returns grievances where submitter_id matches the citizen's ID.
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

    // Query grievances for this citizen
    const result = await pool.query(
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
      WHERE g.submitter_id = $1
        AND g.submitter_type = 'citizen'
      ORDER BY g.created_at DESC
      LIMIT 100`,
      [citizen.citizen_id]
    );

    const grievances = result.rows.map((row) => ({
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
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at),
    }));

    return NextResponse.json({
      success: true,
      grievances,
      total: grievances.length,
    });
  } catch (error) {
    console.error('Error fetching citizen grievances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch grievances' },
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

function formatDate(date: Date): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
