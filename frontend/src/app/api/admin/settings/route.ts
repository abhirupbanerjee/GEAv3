/**
 * GEA Portal - Admin Settings API
 *
 * Endpoints for managing system settings.
 * Only accessible by admin users.
 *
 * GET /api/admin/settings - List all settings by category
 * POST /api/admin/settings - Bulk update settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllSettingsGrouped,
  getSettingsByCategory,
  updateSetting,
} from '@/lib/settings';

/**
 * GET /api/admin/settings
 * List all settings, optionally filtered by category
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

    // Check for category filter
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (category) {
      // Get settings for specific category
      const settings = await getSettingsByCategory(category);
      return NextResponse.json({
        success: true,
        settings,
      });
    }

    // Get all settings grouped by category
    const groupedSettings = await getAllSettingsGrouped();

    return NextResponse.json({
      success: true,
      settings: groupedSettings,
      categories: Object.keys(groupedSettings),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings
 * Bulk update multiple settings at once
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
    const { settings, changeReason } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Invalid request: settings array required' },
        { status: 400 }
      );
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : 'unknown';

    // Update each setting
    const results: Array<{
      key: string;
      success: boolean;
      message: string;
      requiresRestart?: boolean;
    }> = [];

    let hasErrors = false;
    let requiresRestart = false;

    for (const { key, value } of settings) {
      const result = await updateSetting(key, {
        value,
        changedBy: session.user.email || 'admin',
        changeReason,
        ipAddress,
      });

      results.push({
        key,
        success: result.success,
        message: result.message,
        requiresRestart: result.requiresRestart,
      });

      if (!result.success) hasErrors = true;
      if (result.requiresRestart) requiresRestart = true;
    }

    return NextResponse.json({
      success: !hasErrors,
      results,
      requiresRestart,
      message: hasErrors
        ? 'Some settings failed to update'
        : requiresRestart
          ? 'Settings updated. Some changes require application restart.'
          : 'All settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
