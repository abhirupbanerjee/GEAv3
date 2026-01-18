/**
 * Citizen Session Check API
 *
 * GET /api/citizen/auth/check
 *
 * Validates the current session and returns citizen info if authenticated.
 * Used by client-side auth state management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCitizenLoginSettings } from '@/lib/settings';
import { getCurrentCitizen } from '@/lib/citizen-auth';

export async function GET(request: NextRequest) {
  try {
    // Check if citizen login is enabled
    const settings = await getCitizenLoginSettings();
    if (!settings.enabled) {
      return NextResponse.json(
        { authenticated: false, error: 'Citizen login is not enabled' },
        { status: 403 }
      );
    }

    // Get current citizen from session or trusted device
    const citizen = await getCurrentCitizen();

    if (!citizen) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    return NextResponse.json({
      authenticated: true,
      citizen: {
        citizenId: citizen.citizen_id,
        phone: citizen.phone,
        name: citizen.name,
        email: citizen.email,
        registrationComplete: citizen.registration_complete,
      },
    });
  } catch (error) {
    console.error('Error checking auth:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}
