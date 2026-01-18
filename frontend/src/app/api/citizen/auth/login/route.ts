/**
 * Citizen Password Login API
 *
 * POST /api/citizen/auth/login
 *
 * Authenticates a citizen using phone + password.
 * This is for returning users who have already registered.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCitizenLoginSettings } from '@/lib/settings';
import { normalizePhone, isValidE164 } from '@/lib/twilio';
import { verifyCitizenPassword, performLogin } from '@/lib/citizen-auth';

export async function POST(request: NextRequest) {
  try {
    // Check if citizen login is enabled
    const settings = await getCitizenLoginSettings();
    if (!settings.enabled) {
      return NextResponse.json(
        { success: false, error: 'Citizen login is not enabled' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { phone, password, rememberDevice } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    // Normalize and validate phone
    const normalizedPhone = normalizePhone(phone);
    if (!isValidE164(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Verify password
    const authResult = await verifyCitizenPassword(normalizedPhone, password);

    if (!authResult.success || !authResult.citizen) {
      return NextResponse.json(
        { success: false, error: authResult.message },
        { status: 401 }
      );
    }

    // Create session and log in
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
                      undefined;

    const loginResult = await performLogin(
      authResult.citizen.citizen_id,
      rememberDevice === true,
      userAgent,
      ipAddress
    );

    if (!loginResult.success) {
      return NextResponse.json(
        { success: false, error: loginResult.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      citizen: {
        citizenId: authResult.citizen.citizen_id,
        phone: authResult.citizen.phone,
        name: authResult.citizen.name,
        email: authResult.citizen.email,
      },
      session: loginResult.session,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
