/**
 * GEA Portal - Admin AI Bots API
 *
 * Endpoints for managing AI chatbot inventory.
 * Only accessible by admin users.
 *
 * GET /api/admin/ai-bots - List all bots
 * POST /api/admin/ai-bots - Add new bot
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
 * GET /api/admin/ai-bots
 * List all AI bots
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all bots
    const result = await pool.query(`
      SELECT
        id,
        name,
        url,
        description,
        status,
        deployment,
        audience,
        modality,
        category,
        is_active,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM ai_bots
      WHERE is_active = true
      ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'planned' THEN 2
          ELSE 3
        END,
        name
    `);

    return NextResponse.json({
      success: true,
      bots: result.rows,
    });
  } catch (error) {
    console.error('Error fetching AI bots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI bots' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-bots
 * Add a new AI bot
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { id, name, url, description, status, deployment, audience, modality, category } = body;

    // Validate required fields
    if (!id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: id and name are required' },
        { status: 400 }
      );
    }

    // Validate id format (alphanumeric with hyphens, lowercase)
    const idRegex = /^[a-z0-9-]+$/;
    if (!idRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid id format. Use lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      );
    }

    // Check if bot already exists
    const existingBot = await pool.query(
      'SELECT id FROM ai_bots WHERE id = $1',
      [id]
    );

    if (existingBot.rows.length > 0) {
      return NextResponse.json(
        { error: 'A bot with this ID already exists' },
        { status: 409 }
      );
    }

    // Validate status
    const validStatuses = ['active', 'planned', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: active, planned, or inactive' },
        { status: 400 }
      );
    }

    // Insert new bot
    const result = await pool.query(
      `INSERT INTO ai_bots (id, name, url, description, status, deployment, audience, modality, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        name,
        url || '',
        description || '',
        status || 'planned',
        deployment || 'TBD',
        audience || '',
        modality || 'text',
        category || '',
        session.user.email
      ]
    );

    return NextResponse.json({
      success: true,
      bot: result.rows[0],
      message: 'AI bot added successfully',
    });
  } catch (error) {
    console.error('Error adding AI bot:', error);
    return NextResponse.json(
      { error: 'Failed to add AI bot' },
      { status: 500 }
    );
  }
}
