// ============================================
// ADMIN AUTHENTICATION UTILITIES
// ============================================
// Password validation and session management
// ============================================

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'default-secret-change-in-production';
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Password validation regex: 8+ chars, alphanumeric + special chars (@, -, !, #)
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[@\-!#])[a-zA-Z0-9@\-!#]{8,}$/;

export function validatePasswordFormat(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    // In production, compare against hashed password
    if (ADMIN_PASSWORD_HASH && ADMIN_PASSWORD_HASH.startsWith('$2')) {
      return await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    }
    
    // Fallback for development (plain text comparison)
    // WARNING: Only for development! Production must use hashed passwords
    const plainPassword = process.env.ADMIN_PASSWORD || '';
    return password === plainPassword;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

function generateSessionToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return Buffer.from(`${timestamp}-${random}-${SESSION_SECRET}`).toString('base64');
}

function validateSessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [timestamp] = decoded.split('-');
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    
    // Check if token is expired (2 hours)
    return tokenAge < SESSION_DURATION;
  } catch {
    return false;
  }
}

export async function createSession(): Promise<void> {
  const token = generateSessionToken();
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/admin',
  });
}

export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value) {
    return false;
  }
  
  return validateSessionToken(sessionCookie.value);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromRequest(request: NextRequest): Promise<string | null> {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
}

export function validateSessionFromCookie(sessionToken: string | null): boolean {
  if (!sessionToken) return false;
  return validateSessionToken(sessionToken);
}