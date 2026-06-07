/**
 * Citizen Profile API
 *
 * GET /api/citizen/profile - Get current citizen profile
 * PUT /api/citizen/profile - Update citizen profile (name, email)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCitizen, updateCitizenProfile, findCitizenById } from '@/lib/citizen-auth';

export async function GET() {
  try {
    const citizen = await getCurrentCitizen();
    if (!citizen) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        citizenId: citizen.citizen_id,
        phone: citizen.phone,
        phoneVerified: citizen.phone_verified,
        name: citizen.name,
        email: citizen.email,
        registrationComplete: citizen.registration_complete,
        createdAt: citizen.created_at,
        lastLogin: citizen.last_login,
      },
    });
  } catch (error) {
    console.error('Error fetching citizen profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const citizen = await getCurrentCitizen();
    if (!citizen) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email } = body;

    // Validate inputs
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid name format' },
        { status: 400 }
      );
    }

    if (email !== undefined) {
      if (typeof email !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Basic email validation
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email address' },
          { status: 400 }
        );
      }
    }

    // Update profile
    const result = await updateCitizenProfile(citizen.citizen_id, { name, email });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    // Fetch updated profile
    const updatedCitizen = await findCitizenById(citizen.citizen_id);
    if (!updatedCitizen) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        citizenId: updatedCitizen.citizen_id,
        phone: updatedCitizen.phone,
        phoneVerified: updatedCitizen.phone_verified,
        name: updatedCitizen.name,
        email: updatedCitizen.email,
        registrationComplete: updatedCitizen.registration_complete,
        createdAt: updatedCitizen.created_at,
        lastLogin: updatedCitizen.last_login,
      },
    });
  } catch (error) {
    console.error('Error updating citizen profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
