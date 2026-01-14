/**
 * GEA Portal - Single Leadership Contact API
 *
 * Endpoints for managing individual leadership contacts.
 * Only accessible by admin users.
 *
 * GET /api/admin/contacts/[id] - Get a single contact
 * PUT /api/admin/contacts/[id] - Update a contact
 * DELETE /api/admin/contacts/[id] - Delete a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/contacts/[id]
 * Get a single contact by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const contactId = parseInt(id);

    if (isNaN(contactId)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
        { status: 400 }
      );
    }

    // Fetch contact
    const result = await pool.query(
      'SELECT * FROM leadership_contacts WHERE contact_id = $1',
      [contactId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contact: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/contacts/[id]
 * Update a contact
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const contactId = parseInt(id);

    if (isNaN(contactId)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, title, email, image_path, sort_order, is_active } = body;

    // Validate required fields
    if (!name || !title) {
      return NextResponse.json(
        { error: 'Name and title are required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Get current contact to check for image change
    const currentResult = await pool.query(
      'SELECT image_path FROM leadership_contacts WHERE contact_id = $1',
      [contactId]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const currentImagePath = currentResult.rows[0].image_path;

    // If image changed and old image exists, delete old image
    if (currentImagePath && image_path !== currentImagePath) {
      const oldImageFile = path.join(process.cwd(), 'public', currentImagePath);
      if (existsSync(oldImageFile)) {
        try {
          await unlink(oldImageFile);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
    }

    // Update contact
    const result = await pool.query(
      `UPDATE leadership_contacts
       SET name = $1,
           title = $2,
           email = $3,
           image_path = $4,
           sort_order = COALESCE($5, sort_order),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $7
       WHERE contact_id = $8
       RETURNING *`,
      [
        name,
        title,
        email || null,
        image_path || null,
        sort_order,
        is_active,
        session.user.email,
        contactId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Contact updated successfully',
      contact: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/contacts/[id]
 * Delete a contact (and its image)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const contactId = parseInt(id);

    if (isNaN(contactId)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
        { status: 400 }
      );
    }

    // Get contact to delete associated image
    const result = await pool.query(
      'SELECT image_path FROM leadership_contacts WHERE contact_id = $1',
      [contactId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const imagePath = result.rows[0].image_path;

    // Delete contact
    await pool.query('DELETE FROM leadership_contacts WHERE contact_id = $1', [
      contactId,
    ]);

    // Delete associated image if exists
    if (imagePath) {
      const imageFile = path.join(process.cwd(), 'public', imagePath);
      if (existsSync(imageFile)) {
        try {
          await unlink(imageFile);
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
