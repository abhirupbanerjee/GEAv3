/**
 * GEA Portal - Individual Service Attachment Management API
 *
 * GET /api/managedata/services/[id]/attachments/[attachmentId] - Get single attachment
 * PUT /api/managedata/services/[id]/attachments/[attachmentId] - Update attachment
 * DELETE /api/managedata/services/[id]/attachments/[attachmentId] - Delete attachment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

/**
 * GET /api/managedata/services/[id]/attachments/[attachmentId]
 * Get a single attachment requirement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id: serviceId, attachmentId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await pool.query(
      `SELECT * FROM service_attachments
       WHERE service_attachment_id = $1 AND service_id = $2`,
      [attachmentId, serviceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachment' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/managedata/services/[id]/attachments/[attachmentId]
 * Update an attachment requirement
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id: serviceId, attachmentId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const { filename, file_extension, is_mandatory, description, sort_order, is_active } = body;

    // Verify attachment exists
    const existingCheck = await pool.query(
      'SELECT service_attachment_id FROM service_attachments WHERE service_attachment_id = $1 AND service_id = $2',
      [attachmentId, serviceId]
    );

    if (existingCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Check for duplicate filename (excluding current record)
    if (filename) {
      const duplicateCheck = await pool.query(
        `SELECT service_attachment_id FROM service_attachments
         WHERE service_id = $1 AND filename = $2 AND service_attachment_id != $3`,
        [serviceId, filename.trim(), attachmentId]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'An attachment with this filename already exists for this service' },
          { status: 409 }
        );
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | boolean | number | null)[] = [];
    let paramIndex = 1;

    if (filename !== undefined) {
      updates.push(`filename = $${paramIndex++}`);
      values.push(filename.trim());
    }
    if (file_extension !== undefined) {
      updates.push(`file_extension = $${paramIndex++}`);
      values.push(file_extension.trim().toLowerCase());
    }
    if (is_mandatory !== undefined) {
      updates.push(`is_mandatory = $${paramIndex++}`);
      values.push(is_mandatory);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description?.trim() || null);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(sort_order);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(attachmentId);
    values.push(serviceId);

    const result = await pool.query(
      `UPDATE service_attachments
       SET ${updates.join(', ')}
       WHERE service_attachment_id = $${paramIndex++} AND service_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Attachment updated successfully',
    });
  } catch (error) {
    console.error('Error updating attachment:', error);
    return NextResponse.json(
      { error: 'Failed to update attachment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/managedata/services/[id]/attachments/[attachmentId]
 * Delete an attachment requirement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id: serviceId, attachmentId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.roleType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await pool.query(
      `DELETE FROM service_attachments
       WHERE service_attachment_id = $1 AND service_id = $2
       RETURNING filename`,
      [attachmentId, serviceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Attachment "${result.rows[0].filename}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
