/**
 * GEA Portal - Admin Entity Detail API
 *
 * GET /api/admin/entities/[id] - Get single entity by ID
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
 * GET /api/admin/entities/[id]
 * Get single entity details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const entityId = params.id;

    // For staff users, verify they can only access their own entity
    if (session.user.roleType === 'staff' && session.user.entityId !== entityId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your assigned entity' },
        { status: 403 }
      );
    }

    // Fetch entity
    const result = await pool.query(`
      SELECT
        unique_entity_id as entity_id,
        entity_name,
        entity_type,
        parent_entity_id,
        contact_email,
        contact_phone,
        is_active,
        created_at,
        updated_at
      FROM entity_master
      WHERE unique_entity_id = $1
    `, [entityId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Entity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      entity: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching entity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entity' },
      { status: 500 }
    );
  }
}
