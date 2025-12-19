/**
 * GEA Portal - Admin Single AI Bot API
 *
 * Endpoints for managing individual AI bots.
 * Only accessible by admin users.
 *
 * GET /api/admin/ai-bots/[id] - Get single bot details
 * PATCH /api/admin/ai-bots/[id] - Update bot
 * DELETE /api/admin/ai-bots/[id] - Delete bot (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'feedback',
  user: process.env.DB_USER || 'feedback_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * GET /api/admin/ai-bots/[id]
 * Get a single bot by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id: botId } = await params;

    const result = await pool.query(
      'SELECT * FROM ai_bots WHERE id = $1 AND is_active = true',
      [botId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      bot: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching AI bot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI bot' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai-bots/[id]
 * Update bot details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id: botId } = await params;
    const body = await request.json();

    // Check if bot exists
    const existingBot = await pool.query(
      'SELECT * FROM ai_bots WHERE id = $1',
      [botId]
    );

    if (existingBot.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['active', 'planned', 'inactive'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: active, planned, or inactive' },
          { status: 400 }
        );
      }
    }

    // Build update query dynamically
    const allowedFields = ['name', 'url', 'description', 'status', 'deployment', 'audience', 'modality', 'category'];
    const updates: string[] = [];
    const values: (string | boolean)[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updated_by
    updates.push(`updated_by = $${paramIndex}`);
    values.push(session.user.email);
    paramIndex++;

    values.push(botId);

    const query = `
      UPDATE ai_bots
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      bot: result.rows[0],
      message: 'AI bot updated successfully',
    });
  } catch (error) {
    console.error('Error updating AI bot:', error);
    return NextResponse.json(
      { error: 'Failed to update AI bot' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai-bots/[id]
 * Soft delete a bot by setting is_active to false
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id: botId } = await params;

    // Soft delete by setting is_active to false
    const result = await pool.query(
      `UPDATE ai_bots
       SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [session.user.email, botId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI bot deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting AI bot:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI bot' },
      { status: 500 }
    );
  }
}
