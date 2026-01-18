/**
 * Twilio Verify SMS Wrapper
 *
 * Utility functions for sending and verifying OTPs via Twilio Verify.
 * Used for citizen authentication in the GEA Portal.
 *
 * Features:
 * - Send OTP codes via SMS
 * - Verify OTP codes
 * - Phone number validation (E.164 format)
 * - Region-based phone validation (Grenada, Caribbean, etc.)
 */

import twilio from 'twilio';
import { getTwilioSettings, getCitizenLoginSettings } from './settings';

// ============================================================================
// Types
// ============================================================================

export interface SendOtpResult {
  success: boolean;
  message: string;
  status?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  valid: boolean;
  status?: string;
}

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

// ============================================================================
// Region Phone Prefixes - Individual country codes
// ============================================================================

// Region phone prefixes for validation
const REGION_PREFIXES: Record<string, string[]> = {
  // Primary
  grenada: ['+1473'],

  // Caribbean Islands (individual countries)
  antigua: ['+1268'],
  barbados: ['+1246'],
  dominica: ['+1767'],
  dominican_republic: ['+1809', '+1829', '+1849'],
  jamaica: ['+1876', '+1658'],
  st_kitts: ['+1869'],
  st_lucia: ['+1758'],
  st_vincent: ['+1784'],
  trinidad: ['+1868'],
  usvi: ['+1340'],
  bvi: ['+1284'],
  bahamas: ['+1242'],
  cayman: ['+1345'],
  turks_caicos: ['+1649'],
  bermuda: ['+1441'],
  anguilla: ['+1264'],
  montserrat: ['+1664'],
  guyana: ['+592'],
  suriname: ['+597'],

  // Other regions
  usa: ['+1'],  // Will exclude Caribbean area codes
  uk: ['+44'],
  canada: ['+1'],  // Will use Canadian area codes list
};

// All Caribbean area codes (to distinguish from USA/Canada +1)
const CARIBBEAN_AREA_CODES = [
  '268', '246', '767', '809', '829', '849', '473', '876', '658',
  '869', '758', '784', '868', '340', '284', '242', '345', '649',
  '441', '264', '664'
];

// Canadian area codes (non-exhaustive but covers major areas)
const CANADIAN_AREA_CODES = [
  '204', '226', '236', '249', '250', '289', '306', '343', '365',
  '403', '416', '418', '431', '437', '438', '450', '506', '514',
  '519', '548', '579', '581', '587', '604', '613', '639', '647',
  '672', '705', '709', '778', '780', '782', '807', '819', '825',
  '867', '873', '902', '905'
];

// ============================================================================
// Phone Validation Functions
// ============================================================================

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Validate E.164 format
 */
export function isValidE164(phone: string): boolean {
  // E.164: + followed by 7-15 digits
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Check if a +1 phone number is Caribbean
 */
export function isCaribbean(phone: string): boolean {
  if (!phone.startsWith('+1')) return false;
  const areaCode = phone.substring(2, 5);
  return CARIBBEAN_AREA_CODES.includes(areaCode);
}

/**
 * Check if a +1 phone number is Canadian
 */
export function isCanadian(phone: string): boolean {
  if (!phone.startsWith('+1')) return false;
  const areaCode = phone.substring(2, 5);
  return CANADIAN_AREA_CODES.includes(areaCode);
}

/**
 * Validate phone number against allowed regions
 */
export async function validatePhone(phone: string): Promise<PhoneValidationResult> {
  const normalized = normalizePhone(phone);

  // Basic E.164 validation
  if (!isValidE164(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Invalid phone number format. Use E.164 format (e.g., +14731234567)',
    };
  }

  // Get citizen login settings
  const settings = await getCitizenLoginSettings();

  if (!settings.enabled) {
    return {
      valid: false,
      normalized,
      error: 'Citizen login is not enabled',
    };
  }

  const { allowedCountries, customCountryCodes } = settings;

  // Check custom country codes first
  if (customCountryCodes.length > 0) {
    if (customCountryCodes.some(code => normalized.startsWith(code))) {
      return { valid: true, normalized };
    }
  }

  // Check allowed regions
  for (const region of allowedCountries) {
    const prefixes = REGION_PREFIXES[region];
    if (!prefixes) continue;

    if (region === 'usa') {
      // USA: +1 but NOT Caribbean or Canadian area codes
      if (normalized.startsWith('+1') && !isCaribbean(normalized) && !isCanadian(normalized)) {
        return { valid: true, normalized };
      }
    } else if (region === 'canada') {
      // Canada: specific area codes
      if (isCanadian(normalized)) {
        return { valid: true, normalized };
      }
    } else {
      // Direct prefix match
      if (prefixes.some(prefix => normalized.startsWith(prefix))) {
        return { valid: true, normalized };
      }
    }
  }

  return {
    valid: false,
    normalized,
    error: 'Phone number is not from an allowed region. Please use a phone number from Grenada or other allowed countries.',
  };
}

// ============================================================================
// Twilio Verify Functions
// ============================================================================

/**
 * Send OTP code via SMS using Twilio Verify
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  try {
    // Validate phone number
    const validation = await validatePhone(phone);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || 'Invalid phone number',
      };
    }

    // Get Twilio settings
    const twilioSettings = await getTwilioSettings();

    if (!twilioSettings.accountSid || !twilioSettings.authToken || !twilioSettings.verifyServiceSid) {
      return {
        success: false,
        message: 'SMS service is not configured. Please contact support.',
      };
    }

    // Create Twilio client
    const client = twilio(twilioSettings.accountSid, twilioSettings.authToken);

    // Send verification code
    const verification = await client.verify.v2
      .services(twilioSettings.verifyServiceSid)
      .verifications.create({
        to: validation.normalized,
        channel: 'sms',
      });

    return {
      success: true,
      message: 'Verification code sent successfully',
      status: verification.status,
    };
  } catch (error: unknown) {
    console.error('Error sending OTP:', error);

    // Handle Twilio specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const twilioError = error as { code: number; message: string };

      const errorMessages: Record<number, string> = {
        21211: 'Invalid phone number',
        21614: 'Phone number is not a valid mobile number',
        60200: 'Invalid verification request',
        60203: 'Too many verification attempts. Please try again later.',
        60212: 'Too many requests. Please try again later.',
      };

      return {
        success: false,
        message: errorMessages[twilioError.code] || 'Failed to send verification code',
      };
    }

    return {
      success: false,
      message: 'Failed to send verification code. Please try again.',
    };
  }
}

/**
 * Verify OTP code via Twilio Verify
 */
export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  try {
    const normalized = normalizePhone(phone);

    if (!isValidE164(normalized)) {
      return {
        success: false,
        message: 'Invalid phone number format',
        valid: false,
      };
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return {
        success: false,
        message: 'Invalid verification code format. Please enter 6 digits.',
        valid: false,
      };
    }

    // Get Twilio settings
    const twilioSettings = await getTwilioSettings();

    if (!twilioSettings.accountSid || !twilioSettings.authToken || !twilioSettings.verifyServiceSid) {
      return {
        success: false,
        message: 'SMS service is not configured. Please contact support.',
        valid: false,
      };
    }

    // Create Twilio client
    const client = twilio(twilioSettings.accountSid, twilioSettings.authToken);

    // Verify the code
    const verification = await client.verify.v2
      .services(twilioSettings.verifyServiceSid)
      .verificationChecks.create({
        to: normalized,
        code: code,
      });

    if (verification.status === 'approved') {
      return {
        success: true,
        message: 'Phone number verified successfully',
        valid: true,
        status: verification.status,
      };
    } else {
      return {
        success: false,
        message: 'Invalid verification code. Please try again.',
        valid: false,
        status: verification.status,
      };
    }
  } catch (error: unknown) {
    console.error('Error verifying OTP:', error);

    // Handle Twilio specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const twilioError = error as { code: number; message: string };

      const errorMessages: Record<number, string> = {
        20404: 'Verification code has expired. Please request a new code.',
        60200: 'Invalid verification request',
        60202: 'Max verification attempts reached. Please request a new code.',
      };

      return {
        success: false,
        message: errorMessages[twilioError.code] || 'Failed to verify code',
        valid: false,
      };
    }

    return {
      success: false,
      message: 'Failed to verify code. Please try again.',
      valid: false,
    };
  }
}

/**
 * Get allowed country labels for display in UI
 */
export function getCountryLabels(): Record<string, string> {
  return {
    grenada: 'Grenada (+1-473)',
    antigua: 'Antigua & Barbuda (+1-268)',
    barbados: 'Barbados (+1-246)',
    dominica: 'Dominica (+1-767)',
    dominican_republic: 'Dominican Republic (+1-809/829/849)',
    jamaica: 'Jamaica (+1-876/658)',
    st_kitts: 'St Kitts & Nevis (+1-869)',
    st_lucia: 'St Lucia (+1-758)',
    st_vincent: 'St Vincent & Grenadines (+1-784)',
    trinidad: 'Trinidad & Tobago (+1-868)',
    usvi: 'US Virgin Islands (+1-340)',
    bvi: 'British Virgin Islands (+1-284)',
    bahamas: 'Bahamas (+1-242)',
    cayman: 'Cayman Islands (+1-345)',
    turks_caicos: 'Turks & Caicos (+1-649)',
    bermuda: 'Bermuda (+1-441)',
    anguilla: 'Anguilla (+1-264)',
    montserrat: 'Montserrat (+1-664)',
    guyana: 'Guyana (+592)',
    suriname: 'Suriname (+597)',
    usa: 'United States (+1)',
    uk: 'United Kingdom (+44)',
    canada: 'Canada (+1)',
  };
}

export default {
  normalizePhone,
  isValidE164,
  isCaribbean,
  isCanadian,
  validatePhone,
  sendOtp,
  verifyOtp,
  getCountryLabels,
};
