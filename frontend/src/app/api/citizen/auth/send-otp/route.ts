/**
 * Citizen Send OTP API
 *
 * POST /api/citizen/auth/send-otp
 *
 * Sends a verification code via SMS to the provided phone number.
 * Uses Twilio Verify service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCitizenLoginSettings } from '@/lib/settings';
import { sendOtp, normalizePhone, validatePhone } from '@/lib/twilio';
import { findCitizenByPhone } from '@/lib/citizen-auth';

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
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number against allowed regions
    const validation = await validatePhone(phone);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Check if citizen exists
    const existingCitizen = await findCitizenByPhone(validation.normalized);
    const isNewUser = !existingCitizen;

    // Send OTP via Twilio Verify
    const result = await sendOtp(validation.normalized);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      isNewUser,
      phone: validation.normalized,
      expiresIn: settings.otpExpiryMinutes * 60, // seconds
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
