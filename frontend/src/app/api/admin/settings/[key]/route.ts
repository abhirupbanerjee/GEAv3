/**
 * GEA Portal - Single Setting API
 *
 * Endpoints for managing individual settings.
 * Only accessible by admin users.
 *
 * GET /api/admin/settings/[key] - Get a single setting
 * PUT /api/admin/settings/[key] - Update a single setting
 * DELETE /api/admin/settings/[key] - Deactivate a setting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { updateSetting, getSettingAuditHistory } from '@/lib/settings';
import { decryptValue, maskSensitiveValue } from '@/lib/settings-encryption';

interface RouteParams {
  params: Promise<{ key: string }>;
}

/**
 * GET /api/admin/settings/[key]
 * Get a single setting with its audit history
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

    const { key } = await params;

    // Get setting
    const result = await pool.query(
      'SELECT * FROM system_settings WHERE setting_key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    const setting = result.rows[0];

    // Mask sensitive values
    if (setting.is_sensitive && setting.setting_value) {
      setting.setting_value = maskSensitiveValue(decryptValue(setting.setting_value));
    }

    // Get audit history
    const history = await getSettingAuditHistory(key, 10);

    return NextResponse.json({
      success: true,
      setting,
      history,
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings/[key]
 * Update a single setting
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

    const { key } = await params;

    // Parse request body
    const body = await request.json();
    const { value, reason } = body;

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      );
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : 'unknown';

    // Update setting
    const result = await updateSetting(key, {
      value: String(value),
      changedBy: session.user.email || 'admin',
      changeReason: reason,
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      requiresRestart: result.requiresRestart,
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/settings/[key]
 * Deactivate a setting (soft delete)
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

    const { key } = await params;

    // Deactivate setting
    const result = await pool.query(
      `UPDATE system_settings
       SET is_active = false, updated_at = CURRENT_TIMESTAMP, last_modified_by = $1
       WHERE setting_key = $2
       RETURNING *`,
      [session.user.email, key]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    // Log to audit
    await pool.query(
      `INSERT INTO settings_audit_log (setting_key, old_value, new_value, changed_by, change_reason)
       VALUES ($1, 'active', 'deactivated', $2, 'Setting deactivated by admin')`,
      [key, session.user.email]
    );

    return NextResponse.json({
      success: true,
      message: 'Setting deactivated',
    });
  } catch (error) {
    console.error('Error deactivating setting:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate setting' },
      { status: 500 }
    );
  }
}
