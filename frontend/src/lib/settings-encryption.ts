/**
 * Settings Encryption Library
 *
 * Provides AES-256-GCM encryption for sensitive settings stored in the database.
 * Uses NEXTAUTH_SECRET as the encryption key source.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment
 * Uses NEXTAUTH_SECRET or ADMIN_SESSION_SECRET as the key source
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error('Encryption key not configured. Set NEXTAUTH_SECRET in environment.');
  }

  // Create a 32-byte key from the secret using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a sensitive value
 * @param plaintext The value to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptValue(plaintext: string): string {
  if (!plaintext) return '';

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt a sensitive value
 * @param encrypted The encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decryptValue(encrypted: string): string {
  if (!encrypted) return '';

  // Check if value is actually encrypted (has the expected format)
  if (!encrypted.includes(':')) {
    // Value might be stored unencrypted (legacy), return as-is
    return encrypted;
  }

  try {
    const parts = encrypted.split(':');

    if (parts.length !== 3) {
      // Invalid format, return as-is (might be unencrypted)
      return encrypted;
    }

    const [ivHex, authTagHex, ciphertext] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, the value might be unencrypted or corrupted
    // Return empty string to avoid exposing potentially sensitive data
    return '';
  }
}

/**
 * Check if a value is encrypted
 * @param value The value to check
 * @returns true if the value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;

  const parts = value.split(':');
  if (parts.length !== 3) return false;

  const [ivHex, authTagHex, ciphertext] = parts;

  // Check if all parts are valid hex strings of expected lengths
  const hexRegex = /^[0-9a-f]+$/i;

  return (
    ivHex.length === IV_LENGTH * 2 &&
    authTagHex.length === AUTH_TAG_LENGTH * 2 &&
    hexRegex.test(ivHex) &&
    hexRegex.test(authTagHex) &&
    hexRegex.test(ciphertext)
  );
}

/**
 * Mask a sensitive value for display
 * @param value The value to mask
 * @param visibleChars Number of characters to show at start and end (default: 4)
 * @returns Masked string like "SG.N***...***uw"
 */
export function maskSensitiveValue(value: string, visibleChars: number = 4): string {
  if (!value) return '';

  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length);
  }

  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);

  return `${start}***...***${end}`;
}

/**
 * Generate a secure random string
 * @param length Length of the string to generate
 * @returns Random hex string
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
