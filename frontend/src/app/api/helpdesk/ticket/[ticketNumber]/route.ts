// ============================================
// TICKET LOOKUP BY TICKET NUMBER - PUBLIC ENDPOINT
// ============================================
// GET /api/helpdesk/ticket/[ticketNumber]
// Public endpoint for citizens to track their tickets
// No authentication required - ticket number is the access token
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticketNumber: string } }
) {
  try {
    const { ticketNumber } = params;

    // Validate ticket number format (YYYYMM-XXXXXX)
    const ticketNumberRegex = /^\d{6}-\d{6}$/;
    if (!ticketNumberRegex.test(ticketNumber)) {
      return NextResponse.json(
        {
          error: 'Invalid ticket number format. Expected format: YYYYMM-XXXXXX (e.g., 202511-123456)',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Query ticket with related data
    const result = await pool.query(
      `SELECT
        t.ticket_id,
        t.ticket_number,
        t.subject,
        t.description,
        t.created_at,
        t.updated_at,
        t.entity_id,
        t.requester_category,
        t.feedback_id,
        ts.status_name,
        ts.status_code,
        pl.priority_name,
        pl.priority_code,
        s.service_name,
        s.service_id,
        e.entity_name
      FROM tickets t
      LEFT JOIN ticket_status ts ON t.status_id = ts.status_id
      LEFT JOIN priority_levels pl ON t.priority_id = pl.priority_id
      LEFT JOIN service_master s ON t.service_id = s.service_id
      LEFT JOIN entity_master e ON t.entity_id = e.unique_entity_id
      WHERE t.ticket_number = $1`,
      [ticketNumber]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error: 'Ticket not found',
          message: `No ticket found with number: ${ticketNumber}. Please check the ticket number and try again.`,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    const ticket = result.rows[0];

    // Fetch public activities (exclude internal notes UNLESS ticket is resolved/closed)
    // For resolved/closed tickets, include the last internal note as resolution comment
    const isResolvedOrClosed = ticket.status_code === 'resolved' || ticket.status_code === 'closed';

    let activitiesResult;
    if (isResolvedOrClosed) {
      // Include all public activities + last internal note
      activitiesResult = await pool.query(
        `SELECT
          activity_id,
          activity_type,
          performed_by,
          description,
          created_at,
          CASE
            WHEN activity_type = 'internal_note' THEN 'resolution_comment'
            ELSE activity_type
          END as display_type
        FROM (
          -- Get all public activities
          SELECT * FROM ticket_activity
          WHERE ticket_id = $1 AND activity_type != 'internal_note'

          UNION

          -- Get last internal note for resolved/closed tickets
          SELECT * FROM ticket_activity
          WHERE ticket_id = $1 AND activity_type = 'internal_note'
          ORDER BY created_at DESC
          LIMIT 1
        ) as combined_activities
        ORDER BY created_at DESC`,
        [ticket.ticket_id]
      );
    } else {
      // Only public activities for open/in-progress tickets
      activitiesResult = await pool.query(
        `SELECT
          activity_id,
          activity_type,
          activity_type as display_type,
          performed_by,
          description,
          created_at
        FROM ticket_activity
        WHERE ticket_id = $1
          AND activity_type != 'internal_note'
        ORDER BY created_at DESC`,
        [ticket.ticket_id]
      );
    }

    // Return ticket details
    return NextResponse.json({
      success: true,
      ticket: {
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status_name || 'Unknown',
        status_code: ticket.status_code,
        priority: ticket.priority_name || 'Unknown',
        priority_code: ticket.priority_code,
        service_name: ticket.service_name,
        service_id: ticket.service_id,
        entity_name: ticket.entity_name,
        entity_id: ticket.entity_id,
        requester_category: ticket.requester_category,
        feedback_id: ticket.feedback_id,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at
      },
      activities: activitiesResult.rows,
      metadata: {
        retrieved_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch ticket details',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
