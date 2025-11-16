// ============================================
// ADMIN LOGIN API
// ============================================
// POST /api/admin/auth/login
// Validates password and creates session
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession, validatePasswordFormat } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// Rate limiting storage (in-memory, replace with Redis for production)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  
  if (!attempt || now > attempt.resetAt) {
    // Reset or new attempt
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 minutes
    return { allowed: true, remaining: 4 };
  }
  
  if (attempt.count >= 5) {
    return { allowed: false, remaining: 0 };
  }
  
  attempt.count++;
  return { allowed: true, remaining: 5 - attempt.count };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Check rate limit
    const rateLimitKey = getRateLimitKey(request);
    const { allowed, remaining } = checkRateLimit(rateLimitKey);
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }
    
    // Validate password format
    if (!validatePasswordFormat(password)) {
      return NextResponse.json(
        { 
          error: 'Invalid password format. Must be 8+ characters with letters, numbers, and special characters (@-!#)',
          remaining 
        },
        { status: 400 }
      );
    }
    
    // Verify password
    const isValid = await verifyPassword(password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password', remaining },
        { status: 401 }
      );
    }
    
    // Create session
    await createSession();
    
    // Clear rate limit on successful login
    loginAttempts.delete(rateLimitKey);
    
    return NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}