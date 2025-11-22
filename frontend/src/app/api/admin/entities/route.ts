/**
 * GEA Portal - Admin Entities API
 *
 * GET /api/admin/entities - List all entities (ministries/departments/agencies)
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
 * GET /api/admin/entities
 * List all entities for user assignment
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

    // Fetch all entities
    const result = await pool.query(`
      SELECT
        entity_id,
        entity_name,
        entity_type,
        ministry_parent,
        description,
        contact_email,
        contact_phone,
        address,
        is_active
      FROM entity_master
      WHERE is_active = true
      ORDER BY entity_name
    `);

    return NextResponse.json({
      success: true,
      entities: result.rows,
    });
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}
