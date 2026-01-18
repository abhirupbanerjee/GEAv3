/**
 * Citizen Verify OTP API
 *
 * POST /api/citizen/auth/verify-otp
 *
 * Verifies the OTP code sent to the phone number.
 * If the citizen is new, returns registration required flag.
 * If the citizen exists and is fully registered, creates a session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCitizenLoginSettings } from '@/lib/settings';
import { verifyOtp, normalizePhone } from '@/lib/twilio';
import {
  findCitizenByPhone,
  createCitizen,
  performLogin,
} from '@/lib/citizen-auth';

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
    const { phone, code, rememberDevice } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'Phone number and verification code are required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone);

    // Verify OTP via Twilio Verify
    const verifyResult = await verifyOtp(normalizedPhone, code);

    if (!verifyResult.valid) {
      return NextResponse.json(
        { success: false, error: verifyResult.message },
        { status: 400 }
      );
    }

    // Check if citizen exists
    let citizen = await findCitizenByPhone(normalizedPhone);
    let isNewUser = false;

    if (!citizen) {
      // Create new citizen record
      citizen = await createCitizen(normalizedPhone);
      isNewUser = true;

      if (!citizen) {
        return NextResponse.json(
          { success: false, error: 'Failed to create account' },
          { status: 500 }
        );
      }
    }

    // Check if registration is complete
    if (!citizen.registration_complete) {
      // Return citizen ID for registration flow
      return NextResponse.json({
        success: true,
        message: 'Phone verified successfully',
        requiresRegistration: true,
        citizenId: citizen.citizen_id,
        phone: normalizedPhone,
      });
    }

    // Registration is complete - create session and log in
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
                      undefined;

    const loginResult = await performLogin(
      citizen.citizen_id,
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
      requiresRegistration: false,
      citizen: {
        citizenId: citizen.citizen_id,
        phone: citizen.phone,
        name: citizen.name,
        email: citizen.email,
      },
      session: loginResult.session,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}
