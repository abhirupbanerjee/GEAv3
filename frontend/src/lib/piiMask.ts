/**
 * PII Masking Utilities for External API
 *
 * These functions mask personally identifiable information (PII)
 * for external bot/integration access while preserving some context.
 *
 * Examples:
 *   maskName("John Doe") => "J*** D***"
 *   maskEmail("john.doe@example.com") => "j***@example.com"
 */

/**
 * Mask a person's name
 * Shows first letter of each word followed by ***
 *
 * @param name - Full name to mask
 * @returns Masked name or null if input is null/undefined
 *
 * @example
 * maskName("John Doe") // "J*** D***"
 * maskName("Mary Jane Watson") // "M*** J*** W***"
 * maskName(null) // null
 */
export function maskName(name: string | null | undefined): string | null {
  if (!name) return null;

  const trimmed = name.trim();
  if (trimmed.length === 0) return null;

  const parts = trimmed.split(/\s+/);
  return parts
    .map(part => {
      if (part.length === 0) return '';
      return part[0].toUpperCase() + '***';
    })
    .join(' ');
}

/**
 * Mask an email address
 * Shows first character of local part, hides rest, preserves domain
 *
 * @param email - Email address to mask
 * @returns Masked email or null if input is null/undefined
 *
 * @example
 * maskEmail("john.doe@example.com") // "j***@example.com"
 * maskEmail("a@test.org") // "a***@test.org"
 * maskEmail(null) // null
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const trimmed = email.trim();
  if (trimmed.length === 0) return null;

  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1) {
    // Not a valid email, mask entire string
    return trimmed[0] + '***';
  }

  const localPart = trimmed.substring(0, atIndex);
  const domain = trimmed.substring(atIndex);

  if (localPart.length === 0) {
    return '***' + domain;
  }

  return localPart[0].toLowerCase() + '***' + domain;
}

/**
 * Mask a phone number
 * Shows last 4 digits only
 *
 * @param phone - Phone number to mask
 * @returns Masked phone or null if input is null/undefined
 *
 * @example
 * maskPhone("1234567890") // "***-7890"
 * maskPhone("+1 (555) 123-4567") // "***-4567"
 * maskPhone(null) // null
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (trimmed.length === 0) return null;

  // Extract only digits
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 4) {
    return '***';
  }

  return '***-' + digits.slice(-4);
}

/**
 * Mask PII in an object
 * Convenience function to mask common PII fields
 *
 * @param data - Object containing potential PII fields
 * @param fields - Object mapping field names to mask function types
 * @returns New object with PII fields masked
 *
 * @example
 * maskPIIFields(
 *   { name: "John Doe", email: "john@example.com", id: 123 },
 *   { name: 'name', email: 'email' }
 * )
 * // { name: "J*** D***", email: "j***@example.com", id: 123 }
 */
export function maskPIIFields<T extends Record<string, any>>(
  data: T,
  fields: Record<string, 'name' | 'email' | 'phone'>
): T {
  const result = { ...data };

  for (const [fieldName, maskType] of Object.entries(fields)) {
    if (fieldName in result) {
      switch (maskType) {
        case 'name':
          result[fieldName as keyof T] = maskName(result[fieldName]) as any;
          break;
        case 'email':
          result[fieldName as keyof T] = maskEmail(result[fieldName]) as any;
          break;
        case 'phone':
          result[fieldName as keyof T] = maskPhone(result[fieldName]) as any;
          break;
      }
    }
  }

  return result;
}
