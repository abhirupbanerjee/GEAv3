/**
 * GEA Portal - Service Attachments API
 *
 * GET /api/admin/services/[id]/attachments - Get required attachments for a service
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
 * GET /api/admin/services/[id]/attachments
 * Get required document attachments for a specific service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceId = params.id;

    // Fetch attachment requirements for this service
    const query = `
      SELECT
        service_attachment_id,
        service_id,
        filename,
        file_extension,
        is_mandatory,
        description,
        sort_order
      FROM service_attachments
      WHERE service_id = $1 AND is_active = true
      ORDER BY sort_order ASC, service_attachment_id ASC
    `;

    const result = await pool.query(query, [serviceId]);

    return NextResponse.json({
      success: true,
      data: {
        attachments: result.rows,
        count: result.rows.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching service attachments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch service attachments',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
