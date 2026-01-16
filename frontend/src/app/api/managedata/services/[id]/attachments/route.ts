/**
 * GEA Portal - Service Attachments Management API
 *
 * GET /api/managedata/services/[id]/attachments - List attachment requirements for a service
 * POST /api/managedata/services/[id]/attachments - Add new attachment requirement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

/**
 * GET /api/managedata/services/[id]/attachments
 * Get all attachment requirements for a service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can manage service attachments
    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceId = params.id;

    // Verify service exists
    const serviceCheck = await pool.query(
      'SELECT service_id FROM service_master WHERE service_id = $1',
      [serviceId]
    );

    if (serviceCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Fetch attachments
    const result = await pool.query(
      `SELECT
        service_attachment_id,
        service_id,
        filename,
        file_extension,
        is_mandatory,
        description,
        sort_order,
        is_active,
        created_at
      FROM service_attachments
      WHERE service_id = $1
      ORDER BY sort_order ASC, created_at ASC`,
      [serviceId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching service attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/managedata/services/[id]/attachments
 * Add new attachment requirement to a service
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can manage service attachments
    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceId = params.id;
    const body = await request.json();

    const { filename, file_extension, is_mandatory, description, sort_order } = body;

    // Validate required fields
    if (!filename || !filename.trim()) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    if (!file_extension || !file_extension.trim()) {
      return NextResponse.json(
        { error: 'File extension is required' },
        { status: 400 }
      );
    }

    // Verify service exists
    const serviceCheck = await pool.query(
      'SELECT service_id FROM service_master WHERE service_id = $1',
      [serviceId]
    );

    if (serviceCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check for duplicate filename
    const duplicateCheck = await pool.query(
      'SELECT service_attachment_id FROM service_attachments WHERE service_id = $1 AND filename = $2',
      [serviceId, filename.trim()]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'An attachment with this filename already exists for this service' },
        { status: 409 }
      );
    }

    // Insert new attachment
    const result = await pool.query(
      `INSERT INTO service_attachments (
        service_id,
        filename,
        file_extension,
        is_mandatory,
        description,
        sort_order,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *`,
      [
        serviceId,
        filename.trim(),
        file_extension.trim().toLowerCase(),
        is_mandatory || false,
        description?.trim() || null,
        sort_order || 0,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Attachment requirement added successfully',
    });
  } catch (error) {
    console.error('Error adding service attachment:', error);
    return NextResponse.json(
      { error: 'Failed to add attachment' },
      { status: 500 }
    );
  }
}
