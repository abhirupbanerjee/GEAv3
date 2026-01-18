/**
 * Citizen Ticket Comments API
 *
 * POST: Add a new comment to a ticket
 * - Validates citizen owns the ticket
 * - Creates ticket_activity entry with type 'citizen_comment'
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

    // Check authentication via citizen session cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('citizen_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate session and get citizen ID
    const sessionResult = await pool.query(
      `SELECT cs.citizen_id, c.phone, c.name
       FROM citizen_sessions cs
       JOIN citizens c ON c.citizen_id = cs.citizen_id
       WHERE cs.token = $1 AND cs.expires_at > NOW()`,
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const { citizen_id, phone, name } = sessionResult.rows[0];

    // Parse request body
    const body = await request.json();
    const { comment } = body;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment is required' },
        { status: 400 }
      );
    }

    if (comment.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Comment is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Verify the citizen owns this ticket
    const ticketResult = await pool.query(
      `SELECT t.ticket_id, t.ticket_number
       FROM tickets t
       WHERE t.ticket_id = $1
         AND (t.submitter_id = $2 OR t.submitter_phone = $3)`,
      [ticketId, citizen_id, phone]
    );

    if (ticketResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }

    const { ticket_id, ticket_number } = ticketResult.rows[0];

    // Insert the comment as a ticket activity
    const insertResult = await pool.query(
      `INSERT INTO ticket_activity (
        ticket_id, activity_type, description, performed_by, visible_to_citizen
      ) VALUES ($1, $2, $3, $4, TRUE)
      RETURNING activity_id, created_at`,
      [ticket_id, 'citizen_comment', comment.trim(), name || phone]
    );

    const newActivity = insertResult.rows[0];

    return NextResponse.json({
      success: true,
      activity: {
        id: newActivity.activity_id,
        type: 'citizen_comment',
        message: comment.trim(),
        timestamp: newActivity.created_at,
        user: name || 'You',
      },
    });
  } catch (error) {
    console.error('Error adding citizen comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
