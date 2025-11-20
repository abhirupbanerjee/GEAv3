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
