/**
 * Admin Ticket Update API
 *
 * PUT /api/admin/tickets/[id]/update
 *
 * Updates ticket status, priority, and adds internal notes/activity
 *
 * Path Parameters:
 *   - id: ticket_id (integer)
 *
 * Request Body:
 *   {
 *     status_id?: number,
 *     priority_id?: number,
 *     internal_note?: string,
 *     performed_by?: string
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, withTransaction } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = parseInt(params.id)

    if (isNaN(ticketId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Invalid ticket ID'
          },
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status_id, priority_id, internal_note, performed_by = 'admin' } = body

    // Validate at least one field is being updated
    if (!status_id && !priority_id && !internal_note) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'At least one field (status_id, priority_id, or internal_note) must be provided'
          },
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Execute update in transaction
    const result = await withTransaction(async (client) => {
      // 1. Check if ticket exists
      const checkQuery = 'SELECT ticket_id, status_id, priority_id FROM tickets WHERE ticket_id = $1'
      const checkResult = await client.query(checkQuery, [ticketId])

      if (checkResult.rows.length === 0) {
        throw new Error('TICKET_NOT_FOUND')
      }

      const currentTicket = checkResult.rows[0]
      const updates: string[] = []
      const updateParams: any[] = []
      let paramIndex = 1

      // 2. Build update query for tickets table
      if (status_id !== undefined) {
        // Validate status exists
        const statusCheck = await client.query(
          'SELECT status_id, status_name FROM ticket_status WHERE status_id = $1 AND is_active = true',
          [status_id]
        )
        if (statusCheck.rows.length === 0) {
          throw new Error('INVALID_STATUS_ID')
        }

        updates.push(`status_id = $${paramIndex}`)
        updateParams.push(status_id)
        paramIndex++

        // Log activity for status change
        if (currentTicket.status_id !== status_id) {
          const activityDesc = `Status changed from ${currentTicket.status_id} to ${statusCheck.rows[0].status_name}`
          await client.query(
            `INSERT INTO ticket_activity (ticket_id, activity_type, performed_by, description, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [ticketId, 'status_change', performed_by, activityDesc]
          )
        }
      }

      if (priority_id !== undefined) {
        // Validate priority exists
        const priorityCheck = await client.query(
          'SELECT priority_id, priority_name FROM priority_levels WHERE priority_id = $1 AND is_active = true',
          [priority_id]
        )
        if (priorityCheck.rows.length === 0) {
          throw new Error('INVALID_PRIORITY_ID')
        }

        updates.push(`priority_id = $${paramIndex}`)
        updateParams.push(priority_id)
        paramIndex++

        // Log activity for priority change
        if (currentTicket.priority_id !== priority_id) {
          const activityDesc = `Priority changed to ${priorityCheck.rows[0].priority_name}`
          await client.query(
            `INSERT INTO ticket_activity (ticket_id, activity_type, performed_by, description, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [ticketId, 'priority_change', performed_by, activityDesc]
          )
        }
      }

      // 3. Update updated_at timestamp
      updates.push(`updated_at = NOW()`)

      // 4. Execute ticket update if there are field changes
      if (updates.length > 1) { // More than just updated_at
        updateParams.push(ticketId)
        const updateQuery = `
          UPDATE tickets
          SET ${updates.join(', ')}
          WHERE ticket_id = $${paramIndex}
          RETURNING ticket_id, ticket_number, status_id, priority_id, updated_at
        `
        const updateResult = await client.query(updateQuery, updateParams)
        var updatedTicket = updateResult.rows[0]
      } else {
        // Just update timestamp
        const timestampUpdate = await client.query(
          'UPDATE tickets SET updated_at = NOW() WHERE ticket_id = $1 RETURNING ticket_id, ticket_number, status_id, priority_id, updated_at',
          [ticketId]
        )
        var updatedTicket = timestampUpdate.rows[0]
      }

      // 5. Add internal note if provided
      // Note: We don't have a ticket_notes table in the schema, so we'll log it as an activity
      if (internal_note && internal_note.trim()) {
        await client.query(
          `INSERT INTO ticket_activity (ticket_id, activity_type, performed_by, description, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [ticketId, 'internal_note', performed_by, internal_note.trim()]
        )
      }

      return updatedTicket
    })

    // Return success response
    const response = {
      success: true,
      data: {
        ticket_id: result.ticket_id,
        ticket_number: result.ticket_number,
        status_id: result.status_id,
        priority_id: result.priority_id,
        updated_at: result.updated_at
      },
      message: 'Ticket updated successfully',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Ticket update error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'TICKET_NOT_FOUND') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Ticket with ID ${params.id} not found`
            },
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        )
      }

      if (error.message === 'INVALID_STATUS_ID') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid or inactive status_id provided'
            },
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        )
      }

      if (error.message === 'INVALID_PRIORITY_ID') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PARAMETER',
              message: 'Invalid or inactive priority_id provided'
            },
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update ticket',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
