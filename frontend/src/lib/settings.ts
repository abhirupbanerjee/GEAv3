/**
 * Settings Service
 *
 * Centralized settings management with database-first approach,
 * in-memory caching, and environment variable fallback.
 *
 * Usage:
 *   const siteName = await getSetting('SITE_NAME', 'GEA Portal');
 *   const settings = await getSettingsByCategory('SYSTEM');
 */

import { pool } from './db';
import { decryptValue, encryptValue, isEncrypted, maskSensitiveValue } from './settings-encryption';

// ============================================================================
// Types
// ============================================================================

export interface SystemSetting {
  setting_id: number;
  setting_key: string;
  setting_value: string | null;
  setting_type: 'string' | 'number' | 'boolean' | 'secret' | 'json' | 'select' | 'multiselect' | 'email' | 'url' | 'image';
  category: string;
  subcategory: string | null;
  display_name: string;
  description: string | null;
  is_sensitive: boolean;
  is_runtime: boolean;
  default_value: string | null;
  validation_regex: string | null;
  validation_message: string | null;
  min_value: number | null;
  max_value: number | null;
  options: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  last_modified_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SettingUpdateInput {
  value: string;
  changedBy: string;
  changeReason?: string;
  ipAddress?: string;
}

export interface CachedSetting {
  value: unknown;
  expires: number;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const settingsCache = new Map<string, CachedSetting>();

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get a single setting value
 * Resolution order: Cache -> Database -> Environment -> Default
 */
export async function getSetting<T = string>(
  key: string,
  defaultValue?: T
): Promise<T> {
  // 1. Check cache
  const cached = settingsCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value as T;
  }

  // 2. Query database
  try {
    const result = await pool.query<SystemSetting>(
      'SELECT setting_value, setting_type, is_sensitive FROM system_settings WHERE setting_key = $1 AND is_active = true',
      [key]
    );

    if (result.rows.length > 0) {
      const { setting_value, setting_type, is_sensitive } = result.rows[0];

      // Decrypt if sensitive
      let rawValue = setting_value || '';
      if (is_sensitive && rawValue) {
        rawValue = decryptValue(rawValue);
      }

      // Convert to appropriate type
      const typedValue = convertToType(rawValue, setting_type);

      // Cache result
      settingsCache.set(key, {
        value: typedValue,
        expires: Date.now() + CACHE_TTL,
      });

      return typedValue as T;
    }
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
  }

  // 3. Fallback to environment variable
  const envKey = key.toUpperCase().replace(/-/g, '_');
  const envValue = process.env[envKey] || process.env[`NEXT_PUBLIC_${envKey}`];

  if (envValue !== undefined) {
    return envValue as unknown as T;
  }

  // 4. Return default
  return defaultValue as T;
}

/**
 * Get multiple settings at once (batch query)
 */
export async function getSettings(keys: string[]): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  // Check cache first for all keys
  const uncachedKeys: string[] = [];
  for (const key of keys) {
    const cached = settingsCache.get(key);
    if (cached && cached.expires > Date.now()) {
      result[key] = cached.value;
    } else {
      uncachedKeys.push(key);
    }
  }

  // Query database for uncached keys
  if (uncachedKeys.length > 0) {
    try {
      const dbResult = await pool.query<SystemSetting>(
        'SELECT setting_key, setting_value, setting_type, is_sensitive FROM system_settings WHERE setting_key = ANY($1) AND is_active = true',
        [uncachedKeys]
      );

      for (const row of dbResult.rows) {
        let value = row.setting_value || '';
        if (row.is_sensitive && value) {
          value = decryptValue(value);
        }

        const typedValue = convertToType(value, row.setting_type);
        result[row.setting_key] = typedValue;

        // Cache the value
        settingsCache.set(row.setting_key, {
          value: typedValue,
          expires: Date.now() + CACHE_TTL,
        });
      }
    } catch (error) {
      console.error('Error fetching settings batch:', error);
    }
  }

  // Fill in missing keys with defaults from env
  for (const key of keys) {
    if (!(key in result)) {
      const envKey = key.toUpperCase().replace(/-/g, '_');
      result[key] = process.env[envKey] || process.env[`NEXT_PUBLIC_${envKey}`] || null;
    }
  }

  return result;
}

/**
 * Get all settings by category
 */
export async function getSettingsByCategory(
  category?: string,
  includeSensitive: boolean = false
): Promise<SystemSetting[]> {
  try {
    const query = category
      ? 'SELECT * FROM system_settings WHERE category = $1 AND is_active = true ORDER BY category, subcategory, sort_order'
      : 'SELECT * FROM system_settings WHERE is_active = true ORDER BY category, subcategory, sort_order';

    const result = await pool.query<SystemSetting>(query, category ? [category] : []);

    // Mask sensitive values unless explicitly requested
    return result.rows.map((setting) => {
      if (setting.is_sensitive && setting.setting_value && !includeSensitive) {
        return {
          ...setting,
          setting_value: maskSensitiveValue(decryptValue(setting.setting_value)),
        };
      }
      return setting;
    });
  } catch (error) {
    console.error('Error fetching settings by category:', error);
    return [];
  }
}

/**
 * Get all settings grouped by category
 */
export async function getAllSettingsGrouped(): Promise<Record<string, SystemSetting[]>> {
  const settings = await getSettingsByCategory();

  return settings.reduce(
    (acc, setting) => {
      const cat = setting.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(setting);
      return acc;
    },
    {} as Record<string, SystemSetting[]>
  );
}

/**
 * Update a single setting
 */
export async function updateSetting(
  key: string,
  input: SettingUpdateInput
): Promise<{ success: boolean; message: string; requiresRestart?: boolean }> {
  try {
    // Get current setting
    const currentResult = await pool.query<SystemSetting>(
      'SELECT * FROM system_settings WHERE setting_key = $1',
      [key]
    );

    if (currentResult.rows.length === 0) {
      return { success: false, message: 'Setting not found' };
    }

    const setting = currentResult.rows[0];

    // Validate value
    const validation = validateSettingValue(setting, input.value);
    if (!validation.valid) {
      return { success: false, message: validation.message || 'Invalid value' };
    }

    // Encrypt if sensitive
    let storedValue = input.value;
    if (setting.is_sensitive && input.value) {
      storedValue = encryptValue(input.value);
    }

    // Update setting
    await pool.query(
      `UPDATE system_settings
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP, last_modified_by = $2
       WHERE setting_key = $3`,
      [storedValue, input.changedBy, key]
    );

    // Log to audit
    await pool.query(
      `INSERT INTO settings_audit_log (setting_key, old_value, new_value, changed_by, change_reason, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        key,
        setting.is_sensitive ? '[ENCRYPTED]' : setting.setting_value,
        setting.is_sensitive ? '[ENCRYPTED]' : storedValue,
        input.changedBy,
        input.changeReason || null,
        input.ipAddress || null,
      ]
    );

    // Invalidate cache
    invalidateSettingsCache(key);

    const requiresRestart = !setting.is_runtime;

    return {
      success: true,
      message: requiresRestart
        ? 'Setting updated. Application restart required for changes to take effect.'
        : 'Setting updated successfully.',
      requiresRestart,
    };
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    return { success: false, message: 'Failed to update setting' };
  }
}

/**
 * Get setting audit history
 */
export async function getSettingAuditHistory(
  key?: string,
  limit: number = 50
): Promise<
  Array<{
    audit_id: number;
    setting_key: string;
    old_value: string | null;
    new_value: string | null;
    changed_by: string;
    change_reason: string | null;
    changed_at: Date;
  }>
> {
  try {
    const query = key
      ? 'SELECT * FROM settings_audit_log WHERE setting_key = $1 ORDER BY changed_at DESC LIMIT $2'
      : 'SELECT * FROM settings_audit_log ORDER BY changed_at DESC LIMIT $1';

    const result = await pool.query(query, key ? [key, limit] : [limit]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return [];
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Invalidate cache for a specific key or all keys
 */
export function invalidateSettingsCache(key?: string): void {
  if (key) {
    settingsCache.delete(key);
  } else {
    settingsCache.clear();
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: settingsCache.size,
    keys: Array.from(settingsCache.keys()),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a string value to the appropriate type
 */
function convertToType(value: string | null, type: string): unknown {
  if (value === null || value === '') {
    return type === 'boolean' ? false : type === 'number' ? 0 : null;
  }

  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;

    case 'boolean':
      return value === 'true' || value === '1' || value === 'yes';

    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }

    case 'multiselect':
      return value.split(',').map((v) => v.trim());

    default:
      return value;
  }
}

/**
 * Validate a setting value against its rules
 */
function validateSettingValue(
  setting: SystemSetting,
  value: string
): { valid: boolean; message?: string } {
  // Type-specific validation
  switch (setting.setting_type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        return { valid: false, message: 'Invalid email format' };
      }
      break;

    case 'url':
      if (value) {
        try {
          new URL(value);
        } catch {
          return { valid: false, message: 'Invalid URL format' };
        }
      }
      break;

    case 'number':
      const num = parseFloat(value);
      if (isNaN(num)) {
        return { valid: false, message: 'Must be a number' };
      }
      if (setting.min_value !== null && num < setting.min_value) {
        return { valid: false, message: `Minimum value is ${setting.min_value}` };
      }
      if (setting.max_value !== null && num > setting.max_value) {
        return { valid: false, message: `Maximum value is ${setting.max_value}` };
      }
      break;

    case 'json':
      if (value) {
        try {
          JSON.parse(value);
        } catch {
          return { valid: false, message: 'Invalid JSON format' };
        }
      }
      break;
  }

  // Custom regex validation
  if (setting.validation_regex && value) {
    const regex = new RegExp(setting.validation_regex);
    if (!regex.test(value)) {
      return {
        valid: false,
        message: setting.validation_message || 'Invalid format',
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Convenience Functions for Common Settings
// ============================================================================

/**
 * Get the service request entity ID (DTA)
 */
export async function getServiceRequestEntityId(): Promise<string> {
  return getSetting('SERVICE_REQUEST_ENTITY_ID', 'AGY-005');
}

/**
 * Get the DTA admin role code
 */
export async function getDTAAdminRoleCode(): Promise<string> {
  return getSetting('DTA_ADMIN_ROLE_CODE', 'admin_dta');
}

/**
 * Get rate limit settings
 */
export async function getRateLimitSettings(): Promise<{
  feedbackLimit: number;
  grievanceLimit: number;
  eaServiceLimit: number;
  windowSeconds: number;
}> {
  const settings = await getSettings([
    'FEEDBACK_RATE_LIMIT',
    'GRIEVANCE_RATE_LIMIT',
    'EA_SERVICE_RATE_LIMIT',
    'RATE_LIMIT_WINDOW_SECONDS',
  ]);

  return {
    feedbackLimit: Number(settings['FEEDBACK_RATE_LIMIT']) || 5,
    grievanceLimit: Number(settings['GRIEVANCE_RATE_LIMIT']) || 2,
    eaServiceLimit: Number(settings['EA_SERVICE_RATE_LIMIT']) || 10,
    windowSeconds: Number(settings['RATE_LIMIT_WINDOW_SECONDS']) || 3600,
  };
}

/**
 * Get threshold settings
 */
export async function getThresholdSettings(): Promise<{
  lowRating: number;
  dtaAlert: number;
  priorityUrgent: number;
  priorityHigh: number;
  priorityMedium: number;
}> {
  const settings = await getSettings([
    'LOW_RATING_THRESHOLD',
    'DTA_ALERT_THRESHOLD',
    'PRIORITY_URGENT_THRESHOLD',
    'PRIORITY_HIGH_THRESHOLD',
    'PRIORITY_MEDIUM_THRESHOLD',
  ]);

  return {
    lowRating: Number(settings['LOW_RATING_THRESHOLD']) || 2.5,
    dtaAlert: Number(settings['DTA_ALERT_THRESHOLD']) || 2,
    priorityUrgent: Number(settings['PRIORITY_URGENT_THRESHOLD']) || 1.5,
    priorityHigh: Number(settings['PRIORITY_HIGH_THRESHOLD']) || 2.5,
    priorityMedium: Number(settings['PRIORITY_MEDIUM_THRESHOLD']) || 3.5,
  };
}

/**
 * Get SendGrid settings
 */
export async function getSendGridSettings(): Promise<{
  apiKey: string;
  fromEmail: string;
  fromName: string;
}> {
  // For sensitive settings, we need to get the full value
  try {
    const result = await pool.query<SystemSetting>(
      `SELECT setting_key, setting_value, is_sensitive
       FROM system_settings
       WHERE setting_key IN ('SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'SENDGRID_FROM_NAME')
       AND is_active = true`
    );

    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      let value = row.setting_value || '';
      if (row.is_sensitive && value) {
        value = decryptValue(value);
      }
      settings[row.setting_key] = value;
    }

    return {
      apiKey: settings['SENDGRID_API_KEY'] || process.env.SENDGRID_API_KEY || '',
      fromEmail: settings['SENDGRID_FROM_EMAIL'] || process.env.SENDGRID_FROM_EMAIL || '',
      fromName: settings['SENDGRID_FROM_NAME'] || process.env.SENDGRID_FROM_NAME || 'GEA Portal',
    };
  } catch (error) {
    console.error('Error fetching SendGrid settings:', error);
    return {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
      fromName: process.env.SENDGRID_FROM_NAME || 'GEA Portal',
    };
  }
}

/**
 * Get footer link settings
 */
export async function getFooterLinks(): Promise<{
  gogUrl: string;
  eservicesUrl: string;
  constitutionUrl: string;
}> {
  const settings = await getSettings(['GOG_URL', 'ESERVICES_URL', 'CONSTITUTION_URL']);

  return {
    gogUrl: (settings['GOG_URL'] as string) || 'https://www.gov.gd/',
    eservicesUrl: (settings['ESERVICES_URL'] as string) || 'https://eservice.gov.gd/',
    constitutionUrl: (settings['CONSTITUTION_URL'] as string) || 'https://grenadaparliament.gd/ova_doc/',
  };
}

/**
 * Get analytics cache settings
 * Configurable via Admin → Settings
 */
export async function getAnalyticsCacheSettings(): Promise<{
  enabled: boolean;
  ttlSeconds: number;
}> {
  const settings = await getSettings([
    'ANALYTICS_CACHE_ENABLED',
    'ANALYTICS_CACHE_TTL',
  ]);

  return {
    enabled: settings['ANALYTICS_CACHE_ENABLED'] !== 'false',
    // Clamp TTL between 60 and 600 seconds (1-10 minutes)
    ttlSeconds: Math.min(600, Math.max(60, Number(settings['ANALYTICS_CACHE_TTL']) || 300)),
  };
}

/**
 * Get Twilio Verify settings
 * Used for SMS OTP authentication
 */
export async function getTwilioSettings(): Promise<{
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
}> {
  // For sensitive settings, we need to get the full value
  try {
    const result = await pool.query<SystemSetting>(
      `SELECT setting_key, setting_value, is_sensitive
       FROM system_settings
       WHERE setting_key IN ('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID')
       AND is_active = true`
    );

    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      let value = row.setting_value || '';
      if (row.is_sensitive && value) {
        value = decryptValue(value);
      }
      settings[row.setting_key] = value;
    }

    return {
      accountSid: settings['TWILIO_ACCOUNT_SID'] || process.env.TWILIO_ACCOUNT_SID || '',
      authToken: settings['TWILIO_AUTH_TOKEN'] || process.env.TWILIO_AUTH_TOKEN || '',
      verifyServiceSid: settings['TWILIO_VERIFY_SERVICE_SID'] || process.env.TWILIO_VERIFY_SERVICE_SID || '',
    };
  } catch (error) {
    console.error('Error fetching Twilio settings:', error);
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
    };
  }
}

/**
 * Get citizen login configuration settings
 * Used for citizen portal authentication
 */
export async function getCitizenLoginSettings(): Promise<{
  enabled: boolean;
  allowedCountries: string[];
  customCountryCodes: string[];
  otpExpiryMinutes: number;
  maxOtpAttempts: number;
  sessionHours: number;
  deviceTrustDays: number;
}> {
  try {
    const result = await pool.query<SystemSetting>(
      `SELECT setting_key, setting_value, is_sensitive
       FROM system_settings
       WHERE setting_key IN (
         'CITIZEN_LOGIN_ENABLED',
         'CITIZEN_ALLOWED_COUNTRIES',
         'CITIZEN_CUSTOM_COUNTRY_CODES',
         'CITIZEN_OTP_EXPIRY_MINUTES',
         'CITIZEN_MAX_OTP_ATTEMPTS',
         'CITIZEN_SESSION_HOURS',
         'CITIZEN_DEVICE_TRUST_DAYS'
       )
       AND is_active = true`
    );

    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      let value = row.setting_value || '';
      if (row.is_sensitive && value) {
        value = decryptValue(value);
      }
      settings[row.setting_key] = value;
    }

    // Parse allowed countries (JSON array)
    let allowedCountries: string[] = ['grenada'];
    try {
      const parsed = JSON.parse(settings['CITIZEN_ALLOWED_COUNTRIES'] || '["grenada"]');
      if (Array.isArray(parsed)) {
        allowedCountries = parsed;
      }
    } catch {
      // Use default if parsing fails
    }

    // Parse custom country codes (comma-separated)
    // Supports two formats: "Name:+XX" (e.g., "India:+91") or just "+XX"
    const customCodes = settings['CITIZEN_CUSTOM_COUNTRY_CODES'] || '';
    const customCountryCodes = customCodes
      .split(',')
      .map(c => c.trim())
      .filter(c => c.startsWith('+') || c.includes(':+'));

    return {
      enabled: settings['CITIZEN_LOGIN_ENABLED'] === 'true',
      allowedCountries,
      customCountryCodes,
      otpExpiryMinutes: Number(settings['CITIZEN_OTP_EXPIRY_MINUTES']) || 5,
      maxOtpAttempts: Number(settings['CITIZEN_MAX_OTP_ATTEMPTS']) || 3,
      sessionHours: Number(settings['CITIZEN_SESSION_HOURS']) || 24,
      deviceTrustDays: Number(settings['CITIZEN_DEVICE_TRUST_DAYS']) || 30,
    };
  } catch (error) {
    console.error('Error fetching citizen login settings:', error);
    return {
      enabled: false,
      allowedCountries: ['grenada'],
      customCountryCodes: [],
      otpExpiryMinutes: 5,
      maxOtpAttempts: 3,
      sessionHours: 24,
      deviceTrustDays: 30,
    };
  }
}

export default {
  getSetting,
  getSettings,
  getSettingsByCategory,
  getAllSettingsGrouped,
  updateSetting,
  getSettingAuditHistory,
  invalidateSettingsCache,
  getCacheStats,
  // Convenience functions
  getServiceRequestEntityId,
  getDTAAdminRoleCode,
  getRateLimitSettings,
  getThresholdSettings,
  getSendGridSettings,
  getFooterLinks,
  getAnalyticsCacheSettings,
  getTwilioSettings,
  getCitizenLoginSettings,
};
