/**
 * GEA Portal - Leadership Contacts API
 *
 * Endpoints for managing leadership contacts displayed on the About page.
 * Only accessible by admin users.
 *
 * GET /api/admin/contacts - List all contacts
 * POST /api/admin/contacts - Add new contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export interface LeadershipContact {
  contact_id: number;
  name: string;
  title: string;
  email: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * GET /api/admin/contacts
 * List all leadership contacts
 */
export async function GET(request: NextRequest) {
  try {
    // Check for public access (no auth required for public display)
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get('public') === 'true';

    if (!isPublic) {
      // Check authentication for admin access
      const session = await getServerSession(authOptions);

      if (!session || session.user.roleType !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403 }
        );
      }
    }

    // Fetch contacts - only active for public, all for admin
    const query = isPublic
      ? 'SELECT * FROM leadership_contacts WHERE is_active = true ORDER BY sort_order ASC'
      : 'SELECT * FROM leadership_contacts ORDER BY sort_order ASC';

    const result = await pool.query<LeadershipContact>(query);

    return NextResponse.json({
      success: true,
      contacts: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/contacts
 * Add a new leadership contact
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
    const { name, title, email, image_path, sort_order } = body;

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

    // Get max sort_order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxResult = await pool.query(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM leadership_contacts'
      );
      finalSortOrder = maxResult.rows[0].next_order;
    }

    // Insert contact
    const result = await pool.query<LeadershipContact>(
      `INSERT INTO leadership_contacts (name, title, email, image_path, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, title, email || null, image_path || null, finalSortOrder, session.user.email]
    );

    return NextResponse.json({
      success: true,
      message: 'Contact added successfully',
      contact: result.rows[0],
    });
  } catch (error) {
    console.error('Error adding contact:', error);
    return NextResponse.json(
      { error: 'Failed to add contact' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/contacts
 * Bulk update contact sort order (for drag-and-drop reordering)
 */
export async function PUT(request: NextRequest) {
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
    const { contacts } = body;

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'Contacts array is required' },
        { status: 400 }
      );
    }

    // Update sort order for each contact
    for (const { contact_id, sort_order } of contacts) {
      await pool.query(
        `UPDATE leadership_contacts
         SET sort_order = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
         WHERE contact_id = $3`,
        [sort_order, session.user.email, contact_id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contact order updated successfully',
    });
  } catch (error) {
    console.error('Error updating contact order:', error);
    return NextResponse.json(
      { error: 'Failed to update contact order' },
      { status: 500 }
    );
  }
}
