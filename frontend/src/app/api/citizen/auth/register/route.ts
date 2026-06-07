/**
 * Citizen Registration API
 *
 * POST /api/citizen/auth/register
 *
 * Completes the citizen registration after phone verification.
 * Requires: name, email, password, citizenId (from verify-otp)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCitizenLoginSettings } from '@/lib/settings';
import {
  findCitizenById,
  completeCitizenRegistration,
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
    const { citizenId, name, email, password, confirmPassword, rememberDevice } = body;

    // Validate required fields
    if (!citizenId) {
      return NextResponse.json(
        { success: false, error: 'Citizen ID is required. Please verify your phone first.' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name is required and must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Find the citizen
    const citizen = await findCitizenById(citizenId);
    if (!citizen) {
      return NextResponse.json(
        { success: false, error: 'Account not found. Please start the registration process again.' },
        { status: 404 }
      );
    }

    // Check if already registered
    if (citizen.registration_complete) {
      return NextResponse.json(
        { success: false, error: 'Account is already registered. Please login instead.' },
        { status: 400 }
      );
    }

    // Complete registration
    const registrationResult = await completeCitizenRegistration(
      citizenId,
      name.trim(),
      email.toLowerCase().trim(),
      password
    );

    if (!registrationResult.success) {
      return NextResponse.json(
        { success: false, error: registrationResult.message },
        { status: 400 }
      );
    }

    // Create session and log in
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
                      undefined;

    const loginResult = await performLogin(
      citizenId,
      rememberDevice === true,
      userAgent,
      ipAddress
    );

    if (!loginResult.success) {
      return NextResponse.json(
        { success: false, error: 'Registration successful but login failed. Please try logging in.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      citizen: {
        citizenId,
        phone: citizen.phone,
        name: name.trim(),
        email: email.toLowerCase().trim(),
      },
      session: loginResult.session,
    });
  } catch (error) {
    console.error('Error completing registration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete registration' },
      { status: 500 }
    );
  }
}
