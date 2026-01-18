/**
 * GEA Portal - Test SMS API
 *
 * Endpoint for testing Twilio Verify SMS configuration.
 * Only accessible by admin users.
 *
 * POST /api/admin/settings/test-sms - Send a test OTP via SMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTwilioSettings } from '@/lib/settings';
import twilio from 'twilio';

/**
 * POST /api/admin/settings/test-sms
 * Send a test OTP using current Twilio Verify configuration
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

    // Get phone number from request
    const body = await request.json().catch(() => ({}));
    const phone = body.phone;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic E.164 validation)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +14731234567)' },
        { status: 400 }
      );
    }

    // Get Twilio settings
    const twilioSettings = await getTwilioSettings();

    if (!twilioSettings.accountSid) {
      return NextResponse.json(
        { error: 'Twilio Account SID is not configured' },
        { status: 400 }
      );
    }

    if (!twilioSettings.authToken) {
      return NextResponse.json(
        { error: 'Twilio Auth Token is not configured' },
        { status: 400 }
      );
    }

    if (!twilioSettings.verifyServiceSid) {
      return NextResponse.json(
        { error: 'Twilio Verify Service SID is not configured' },
        { status: 400 }
      );
    }

    // Create Twilio client
    const client = twilio(twilioSettings.accountSid, twilioSettings.authToken);

    // Send verification code via Twilio Verify
    const verification = await client.verify.v2
      .services(twilioSettings.verifyServiceSid)
      .verifications.create({
        to: phone.replace(/[\s\-\(\)]/g, ''),
        channel: 'sms',
      });

    return NextResponse.json({
      success: true,
      message: `Test OTP sent successfully to ${phone}. Check your phone for the verification code.`,
      details: {
        phone,
        status: verification.status,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error sending test SMS:', error);

    // Handle Twilio specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const twilioError = error as { code: number; message: string };

      // Common Twilio error codes
      const errorMessages: Record<number, string> = {
        20003: 'Invalid Account SID or Auth Token',
        20404: 'Verify Service not found - check Service SID',
        21211: 'Invalid phone number',
        21614: 'Phone number is not a valid mobile number',
        60200: 'Invalid parameter in request',
        60203: 'Max send attempts reached for this phone number',
        60212: 'Too many requests - rate limited',
      };

      const friendlyMessage = errorMessages[twilioError.code] || twilioError.message;

      return NextResponse.json(
        { error: `Twilio error: ${friendlyMessage}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send test SMS. Please check your Twilio configuration.' },
      { status: 500 }
    );
  }
}
