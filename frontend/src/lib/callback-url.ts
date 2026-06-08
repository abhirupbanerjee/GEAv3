/**
 * Safe callbackUrl validation utilities
 *
 * Prevents open-redirect vulnerabilities by ensuring post-login redirects
 * only target known-safe paths on the same site.
 */

/**
 * Validates a callback URL and returns a safe version.
 *
 * Rules:
 * - Relative paths starting with '/' are allowed (but not '//')
 * - Absolute URLs are allowed only if they match the current origin
 * - Everything else falls back to the default
 *
 * @param url - The raw callbackUrl value (from query param, etc.)
 * @param defaultUrl - Safe fallback if validation fails
 * @returns A validated safe URL string
 */
export function validateCallbackUrl(url: string | null, defaultUrl: string): string {
  if (!url || typeof url !== 'string') {
    return defaultUrl;
  }

  const trimmed = url.trim();

  // Block empty strings
  if (trimmed.length === 0) {
    return defaultUrl;
  }

  // Allow relative paths starting with '/' but not '//'
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) {
      return defaultUrl;
    }
    // Block scheme-like paths: /javascript:alert(1), /data:text/html,...
    // A colon after the first slash is suspicious
    const afterSlash = trimmed.slice(1);
    if (afterSlash.includes(':')) {
      return defaultUrl;
    }
    return trimmed;
  }

  // For absolute URLs, only allow same origin
  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

    if (currentOrigin && parsed.origin === currentOrigin) {
      return trimmed;
    }
  } catch {
    // Invalid URL — fall through to default
  }

  return defaultUrl;
}

/**
 * Server-side version of callback URL validation.
 * Use this in middleware, API routes, or server components where
 * `window.location.origin` is not available.
 *
 * @param url - The raw callbackUrl value
 * @param defaultUrl - Safe fallback if validation fails
 * @param allowedOrigin - The expected origin (e.g. from request URL or env)
 * @returns A validated safe URL string
 */
export function validateCallbackUrlServer(
  url: string | null,
  defaultUrl: string,
  allowedOrigin: string
): string {
  if (!url || typeof url !== 'string') {
    return defaultUrl;
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return defaultUrl;
  }

  // Allow relative paths starting with '/' but not '//'
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) {
      return defaultUrl;
    }
    const afterSlash = trimmed.slice(1);
    if (afterSlash.includes(':')) {
      return defaultUrl;
    }
    return trimmed;
  }

  // For absolute URLs, only allow same origin
  try {
    const parsed = new URL(trimmed);
    const allowed = new URL(allowedOrigin);

    if (parsed.origin === allowed.origin) {
      return trimmed;
    }
  } catch {
    // Invalid URL — fall through to default
  }

  return defaultUrl;
}
