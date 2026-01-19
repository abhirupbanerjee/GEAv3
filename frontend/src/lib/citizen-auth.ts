/**
 * Citizen Authentication Logic
 *
 * Handles citizen portal authentication including:
 * - Session management (create, validate, refresh, destroy)
 * - Trusted device management ("Remember Me" functionality)
 * - Password hashing and verification
 * - Token generation
 *
 * Uses separate tables from NextAuth admin authentication.
 */

import { pool } from './db';
import { getCitizenLoginSettings } from './settings';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// ============================================================================
// Types
// ============================================================================

export interface Citizen {
  citizen_id: string;
  phone: string;
  phone_verified: boolean;
  name: string | null;
  email: string | null;
  registration_complete: boolean;
  is_active: boolean;
  created_at: Date;
  last_login: Date | null;
}

export interface CitizenSession {
  session_id: string;
  citizen_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  last_activity: Date;
}

export interface TrustedDevice {
  device_id: string;
  citizen_id: string;
  device_token: string;
  device_name: string | null;
  expires_at: Date;
  last_used_at: Date;
}

export interface AuthResult {
  success: boolean;
  message: string;
  citizen?: Citizen;
  session?: {
    token: string;
    expiresAt: Date;
  };
  deviceToken?: string;
  isNewUser?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const BCRYPT_ROUNDS = 12;
const SESSION_COOKIE_NAME = 'citizen_session';
const DEVICE_COOKIE_NAME = 'citizen_device';

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure session token with checksum
 */
export function generateSessionToken(): string {
  const random = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  return `${random}.${timestamp}`;
}

// ============================================================================
// Password Functions
// ============================================================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Citizen CRUD Operations
// ============================================================================

/**
 * Find citizen by phone number
 */
export async function findCitizenByPhone(phone: string): Promise<Citizen | null> {
  try {
    const result = await pool.query<Citizen>(
      `SELECT citizen_id, phone, phone_verified, name, email,
              registration_complete, is_active, created_at, last_login
       FROM citizens
       WHERE phone = $1 AND is_active = true`,
      [phone]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding citizen by phone:', error);
    return null;
  }
}

/**
 * Find citizen by ID
 */
export async function findCitizenById(citizenId: string): Promise<Citizen | null> {
  try {
    const result = await pool.query<Citizen>(
      `SELECT citizen_id, phone, phone_verified, name, email,
              registration_complete, is_active, created_at, last_login
       FROM citizens
       WHERE citizen_id = $1 AND is_active = true`,
      [citizenId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding citizen by ID:', error);
    return null;
  }
}

/**
 * Create a new citizen (phone only, registration incomplete)
 */
export async function createCitizen(phone: string): Promise<Citizen | null> {
  try {
    const result = await pool.query<Citizen>(
      `INSERT INTO citizens (phone, phone_verified, registration_complete)
       VALUES ($1, true, false)
       RETURNING citizen_id, phone, phone_verified, name, email,
                 registration_complete, is_active, created_at, last_login`,
      [phone]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error creating citizen:', error);
    return null;
  }
}

/**
 * Complete citizen registration (name, email, password)
 */
export async function completeCitizenRegistration(
  citizenId: string,
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        message: passwordValidation.errors.join('. '),
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Update citizen
    const result = await pool.query(
      `UPDATE citizens
       SET name = $1, email = $2, password_hash = $3, registration_complete = true, updated_at = CURRENT_TIMESTAMP
       WHERE citizen_id = $4 AND is_active = true
       RETURNING citizen_id`,
      [name, email, passwordHash, citizenId]
    );

    if (result.rowCount === 0) {
      return { success: false, message: 'Citizen not found' };
    }

    return { success: true, message: 'Registration completed successfully' };
  } catch (error: unknown) {
    console.error('Error completing registration:', error);

    // Check for duplicate email
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code: string };
      if (pgError.code === '23505') {
        return { success: false, message: 'Email is already in use' };
      }
    }

    return { success: false, message: 'Failed to complete registration' };
  }
}

/**
 * Update citizen profile (name, email)
 */
export async function updateCitizenProfile(
  citizenId: string,
  data: { name?: string; email?: string }
): Promise<{ success: boolean; message: string; citizen?: Citizen }> {
  try {
    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | null)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(data.name || null);
      paramIndex++;
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(data.email || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return { success: false, message: 'No fields to update' };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(citizenId);

    const result = await pool.query(
      `UPDATE citizens
       SET ${updates.join(', ')}
       WHERE citizen_id = $${paramIndex} AND is_active = true
       RETURNING citizen_id, phone, phone_verified, name, email,
                 registration_complete, is_active, created_at, last_login`,
      values
    );

    if (result.rowCount === 0) {
      return { success: false, message: 'Citizen not found' };
    }

    const citizen: Citizen = result.rows[0];

    return { success: true, message: 'Profile updated successfully', citizen };
  } catch (error: unknown) {
    console.error('Error updating citizen profile:', error);

    // Check for duplicate email
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code: string };
      if (pgError.code === '23505') {
        return { success: false, message: 'Email is already in use by another account' };
      }
    }

    return { success: false, message: 'Failed to update profile' };
  }
}

/**
 * Verify citizen password
 */
export async function verifyCitizenPassword(
  phone: string,
  password: string
): Promise<{
  success: boolean;
  citizen?: Citizen;
  message: string;
  error?: string;
  blockReason?: string;
}> {
  try {
    // First, check if citizen exists (regardless of is_active)
    const result = await pool.query(
      `SELECT citizen_id, phone, phone_verified, name, email,
              registration_complete, is_active, created_at, last_login, password_hash,
              block_reason
       FROM citizens
       WHERE phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid phone number or password' };
    }

    const row = result.rows[0];

    // Check if account is blocked
    if (!row.is_active) {
      return {
        success: false,
        message: 'Your account has been blocked.',
        error: 'account_blocked',
        blockReason: row.block_reason || 'Please contact support for assistance.',
      };
    }

    if (!row.password_hash) {
      return { success: false, message: 'Account not fully registered. Please complete registration first.' };
    }

    const passwordValid = await verifyPassword(password, row.password_hash);

    if (!passwordValid) {
      return { success: false, message: 'Invalid phone number or password' };
    }

    // Update last login
    await pool.query(
      'UPDATE citizens SET last_login = CURRENT_TIMESTAMP WHERE citizen_id = $1',
      [row.citizen_id]
    );

    const citizen: Citizen = {
      citizen_id: row.citizen_id,
      phone: row.phone,
      phone_verified: row.phone_verified,
      name: row.name,
      email: row.email,
      registration_complete: row.registration_complete,
      is_active: row.is_active,
      created_at: row.created_at,
      last_login: new Date(),
    };

    return { success: true, citizen, message: 'Login successful' };
  } catch (error) {
    console.error('Error verifying password:', error);
    return { success: false, message: 'Authentication failed' };
  }
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new session for a citizen
 */
export async function createSession(
  citizenId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<CitizenSession | null> {
  try {
    const settings = await getCitizenLoginSettings();
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + settings.sessionHours * 60 * 60 * 1000);

    const result = await pool.query<CitizenSession>(
      `INSERT INTO citizen_sessions (citizen_id, token, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING session_id, citizen_id, token, expires_at, created_at, last_activity`,
      [citizenId, token, userAgent || null, ipAddress || null, expiresAt]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Validate and get session by token
 */
export async function validateSession(token: string): Promise<{ citizen: Citizen; session: CitizenSession } | null> {
  try {
    const result = await pool.query(
      `SELECT s.session_id, s.citizen_id, s.token, s.expires_at, s.created_at, s.last_activity,
              c.phone, c.phone_verified, c.name, c.email, c.registration_complete, c.is_active, c.last_login
       FROM citizen_sessions s
       JOIN citizens c ON s.citizen_id = c.citizen_id
       WHERE s.token = $1 AND s.expires_at > NOW() AND c.is_active = true`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Update last activity
    await pool.query(
      'UPDATE citizen_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = $1',
      [row.session_id]
    );

    const citizen: Citizen = {
      citizen_id: row.citizen_id,
      phone: row.phone,
      phone_verified: row.phone_verified,
      name: row.name,
      email: row.email,
      registration_complete: row.registration_complete,
      is_active: row.is_active,
      created_at: row.created_at,
      last_login: row.last_login,
    };

    const session: CitizenSession = {
      session_id: row.session_id,
      citizen_id: row.citizen_id,
      token: row.token,
      expires_at: row.expires_at,
      created_at: row.created_at,
      last_activity: row.last_activity,
    };

    return { citizen, session };
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

/**
 * Destroy a session (logout)
 */
export async function destroySession(token: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'DELETE FROM citizen_sessions WHERE token = $1',
      [token]
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error destroying session:', error);
    return false;
  }
}

/**
 * Destroy all sessions for a citizen
 */
export async function destroyAllSessions(citizenId: string): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM citizen_sessions WHERE citizen_id = $1',
      [citizenId]
    );
  } catch (error) {
    console.error('Error destroying all sessions:', error);
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await pool.query(
      'DELETE FROM citizen_sessions WHERE expires_at < NOW()'
    );

    return result.rowCount ?? 0;
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return 0;
  }
}

// ============================================================================
// Trusted Device Management
// ============================================================================

/**
 * Create a trusted device token
 */
export async function createTrustedDevice(
  citizenId: string,
  deviceName?: string,
  deviceFingerprint?: string
): Promise<TrustedDevice | null> {
  try {
    const settings = await getCitizenLoginSettings();
    const token = generateToken(48);
    const expiresAt = new Date(Date.now() + settings.deviceTrustDays * 24 * 60 * 60 * 1000);

    const result = await pool.query<TrustedDevice>(
      `INSERT INTO citizen_trusted_devices (citizen_id, device_token, device_name, device_fingerprint, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING device_id, citizen_id, device_token, device_name, expires_at, last_used_at`,
      [citizenId, token, deviceName || null, deviceFingerprint || null, expiresAt]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error creating trusted device:', error);
    return null;
  }
}

/**
 * Validate trusted device token and get citizen
 */
export async function validateTrustedDevice(deviceToken: string): Promise<Citizen | null> {
  try {
    const result = await pool.query(
      `SELECT c.citizen_id, c.phone, c.phone_verified, c.name, c.email,
              c.registration_complete, c.is_active, c.created_at, c.last_login,
              d.device_id
       FROM citizen_trusted_devices d
       JOIN citizens c ON d.citizen_id = c.citizen_id
       WHERE d.device_token = $1 AND d.expires_at > NOW() AND c.is_active = true`,
      [deviceToken]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Update last used
    await pool.query(
      'UPDATE citizen_trusted_devices SET last_used_at = CURRENT_TIMESTAMP WHERE device_id = $1',
      [row.device_id]
    );

    return {
      citizen_id: row.citizen_id,
      phone: row.phone,
      phone_verified: row.phone_verified,
      name: row.name,
      email: row.email,
      registration_complete: row.registration_complete,
      is_active: row.is_active,
      created_at: row.created_at,
      last_login: row.last_login,
    };
  } catch (error) {
    console.error('Error validating trusted device:', error);
    return null;
  }
}

/**
 * Revoke a trusted device
 */
export async function revokeTrustedDevice(deviceToken: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'DELETE FROM citizen_trusted_devices WHERE device_token = $1',
      [deviceToken]
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error revoking trusted device:', error);
    return false;
  }
}

/**
 * Revoke all trusted devices for a citizen
 */
export async function revokeAllTrustedDevices(citizenId: string): Promise<void> {
  try {
    await pool.query(
      'DELETE FROM citizen_trusted_devices WHERE citizen_id = $1',
      [citizenId]
    );
  } catch (error) {
    console.error('Error revoking all trusted devices:', error);
  }
}

// ============================================================================
// Cookie Helpers
// ============================================================================

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Set device trust cookie
 */
export async function setDeviceCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Get session token from cookie
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Get device token from cookie
 */
export async function getDeviceToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(DEVICE_COOKIE_NAME)?.value || null;
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Clear device cookie
 */
export async function clearDeviceCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEVICE_COOKIE_NAME);
}

// ============================================================================
// High-Level Auth Functions
// ============================================================================

/**
 * Get current authenticated citizen from cookies
 */
export async function getCurrentCitizen(): Promise<Citizen | null> {
  // Try session first
  const sessionToken = await getSessionToken();
  if (sessionToken) {
    const sessionData = await validateSession(sessionToken);
    if (sessionData) {
      return sessionData.citizen;
    }
  }

  // Try trusted device (auto-login)
  const deviceToken = await getDeviceToken();
  if (deviceToken) {
    const citizen = await validateTrustedDevice(deviceToken);
    if (citizen) {
      // Create a new session for this trusted device
      const session = await createSession(citizen.citizen_id);
      if (session) {
        await setSessionCookie(session.token, session.expires_at);
        return citizen;
      }
    }
  }

  return null;
}

/**
 * Perform full login flow
 */
export async function performLogin(
  citizenId: string,
  rememberDevice: boolean = false,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthResult> {
  try {
    // Create session
    const session = await createSession(citizenId, userAgent, ipAddress);
    if (!session) {
      return { success: false, message: 'Failed to create session' };
    }

    // Set session cookie
    await setSessionCookie(session.token, session.expires_at);

    // Create trusted device if requested
    let deviceToken: string | undefined;
    if (rememberDevice) {
      const device = await createTrustedDevice(citizenId, userAgent);
      if (device) {
        await setDeviceCookie(device.device_token, device.expires_at);
        deviceToken = device.device_token;
      }
    }

    // Get citizen data
    const citizen = await findCitizenById(citizenId);
    if (!citizen) {
      return { success: false, message: 'Citizen not found' };
    }

    return {
      success: true,
      message: 'Login successful',
      citizen,
      session: {
        token: session.token,
        expiresAt: session.expires_at,
      },
      deviceToken,
    };
  } catch (error) {
    console.error('Error performing login:', error);
    return { success: false, message: 'Login failed' };
  }
}

/**
 * Perform logout
 */
export async function performLogout(): Promise<boolean> {
  try {
    const sessionToken = await getSessionToken();
    if (sessionToken) {
      await destroySession(sessionToken);
    }

    await clearSessionCookie();
    // Note: We don't clear the device cookie on logout to preserve "remember me"
    // User can explicitly revoke trusted devices in settings

    return true;
  } catch (error) {
    console.error('Error performing logout:', error);
    return false;
  }
}

export default {
  // Token generation
  generateToken,
  generateSessionToken,
  // Password functions
  hashPassword,
  verifyPassword,
  validatePassword,
  // Citizen CRUD
  findCitizenByPhone,
  findCitizenById,
  createCitizen,
  completeCitizenRegistration,
  updateCitizenProfile,
  verifyCitizenPassword,
  // Session management
  createSession,
  validateSession,
  destroySession,
  destroyAllSessions,
  cleanupExpiredSessions,
  // Trusted devices
  createTrustedDevice,
  validateTrustedDevice,
  revokeTrustedDevice,
  revokeAllTrustedDevices,
  // Cookie helpers
  setSessionCookie,
  setDeviceCookie,
  getSessionToken,
  getDeviceToken,
  clearSessionCookie,
  clearDeviceCookie,
  // High-level auth
  getCurrentCitizen,
  performLogin,
  performLogout,
};
