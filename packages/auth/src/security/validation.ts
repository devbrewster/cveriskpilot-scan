// Input sanitization and validation helpers
// Lightweight, zero-dependency validators for common CVERiskPilot data types.

// ---------------------------------------------------------------------------
// HTML sanitisation
// ---------------------------------------------------------------------------

/**
 * Strip all HTML tags from the input string.
 * This is a simple regex-based approach — for rich-text inputs consider a
 * proper sanitisation library.
 */
export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

/**
 * Basic RFC 5322 email validation.
 * Covers the vast majority of real-world addresses without being overly
 * permissive.
 */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}

// ---------------------------------------------------------------------------
// Slug (e.g. organisation slugs)
// ---------------------------------------------------------------------------

// Rewritten to avoid nested quantifiers (ReDoS-safe).
// Matches lowercase alphanumeric with non-consecutive hyphens, no leading/trailing hyphen.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Validate a URL slug: lowercase alphanumeric with hyphens, 3-63 characters.
 */
export function validateSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 63) return false;
  // Reject consecutive hyphens (original nested quantifier enforced this)
  if (slug.includes('--')) return false;
  return SLUG_RE.test(slug);
}

// ---------------------------------------------------------------------------
// CVE ID
// ---------------------------------------------------------------------------

const CVE_RE = /^CVE-\d{4}-\d{4,}$/;

/**
 * Validate a CVE identifier (CVE-YYYY-NNNNN+).
 */
export function validateCveId(cveId: string): boolean {
  if (!cveId) return false;
  return CVE_RE.test(cveId);
}

// ---------------------------------------------------------------------------
// UUID v4
// ---------------------------------------------------------------------------

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUUID(id: string): boolean {
  if (!id) return false;
  return UUID_V4_RE.test(id);
}

// ---------------------------------------------------------------------------
// Filenames
// ---------------------------------------------------------------------------

/**
 * Sanitise a filename by removing path traversal sequences and control
 * characters.  Returns a safe filename (or "unnamed" if nothing remains).
 */
export function sanitizeFilename(filename: string): string {
  let safe = filename
    // Remove path separators and traversal
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Remove control characters (0x00-0x1F, 0x7F)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    // Remove leading dots (hidden files)
    .replace(/^\.+/, '')
    .trim();

  if (!safe) safe = 'unnamed';
  return safe;
}

// ---------------------------------------------------------------------------
// File size
// ---------------------------------------------------------------------------

/**
 * Check whether a file size (in bytes) is within the allowed maximum (in MB).
 */
export function validateFileSize(bytes: number, maxMB: number): boolean {
  if (bytes < 0 || maxMB <= 0) return false;
  return bytes <= maxMB * 1024 * 1024;
}

// ---------------------------------------------------------------------------
// MIME type
// ---------------------------------------------------------------------------

/**
 * Check whether a MIME type is in the allowed list.
 * Comparison is case-insensitive.
 */
export function validateMimeType(
  mimeType: string,
  allowed: string[],
): boolean {
  if (!mimeType || allowed.length === 0) return false;
  const lower = mimeType.toLowerCase();
  return allowed.some((a) => a.toLowerCase() === lower);
}
