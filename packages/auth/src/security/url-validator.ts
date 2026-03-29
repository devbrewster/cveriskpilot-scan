/**
 * Validates URLs to prevent SSRF attacks.
 * Blocks private IPs, loopback, link-local, GCP metadata server, and non-HTTPS schemes.
 */

const BLOCKED_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.goog',
  '169.254.169.254',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '::1',
]);

/**
 * Check whether an IPv4 address string falls within a private/reserved range.
 * Supports 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16,
 * 127.0.0.0/8, and 0.0.0.0.
 */
function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false; // Not a valid IPv4 — treat as non-private (hostname will be checked separately)
  }

  const [a, b] = parts;

  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 169 && b === 254) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 0.0.0.0
  if (a === 0 && b === 0 && parts[2] === 0 && parts[3] === 0) return true;

  return false;
}

/**
 * Check if a hostname looks like a raw IPv6 address (bracket notation) that
 * resolves to a loopback or link-local range.
 */
function isPrivateIpv6(host: string): boolean {
  // Strip brackets if present
  const raw = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  const lower = raw.toLowerCase();

  // Loopback
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // Unspecified
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
  // Link-local (fe80::/10)
  if (lower.startsWith('fe80:') || lower.startsWith('fe80')) return true;
  // Unique-local (fc00::/7)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  return false;
}

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate that a URL is safe to call from the server (SSRF protection).
 *
 * Rejects:
 * - Non-HTTPS schemes (unless `allowHttp` is set)
 * - Blocked hostnames (metadata servers, localhost)
 * - Private/reserved IPv4 and IPv6 ranges
 * - Hostnames containing numeric IP patterns that could bypass DNS checks
 *
 * @param url - The URL string to validate
 * @param options.allowHttp - If true, permits http:// in addition to https://
 */
export function validateExternalUrl(
  url: string,
  options?: { allowHttp?: boolean },
): UrlValidationResult {
  // 1. Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Malformed URL' };
  }

  // 2. Check scheme
  const allowedSchemes = options?.allowHttp
    ? ['https:', 'http:']
    : ['https:'];

  if (!allowedSchemes.includes(parsed.protocol)) {
    return {
      valid: false,
      reason: `Scheme "${parsed.protocol.replace(':', '')}" is not allowed. Use HTTPS.`,
    };
  }

  // 3. Check hostname against blocked list
  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    return { valid: false, reason: 'Hostname is blocked (internal/metadata address)' };
  }

  // 4. Check for raw IPv4 in private ranges
  if (isPrivateIp(hostname)) {
    return { valid: false, reason: 'Private/reserved IP addresses are not allowed' };
  }

  // 5. Check for raw IPv6 in private ranges
  if (isPrivateIpv6(hostname)) {
    return { valid: false, reason: 'Private/reserved IPv6 addresses are not allowed' };
  }

  // 6. DNS rebinding / obfuscation patterns
  //    Block numeric-only hostnames (e.g., "0x7f000001" = 127.0.0.1 in hex)
  //    and hostnames with embedded IPs like "evil.169.254.169.254.nip.io"
  if (/^0x[0-9a-f]+$/i.test(hostname) || /^[0-9]+$/.test(hostname)) {
    return { valid: false, reason: 'Numeric/hex-encoded hostnames are not allowed' };
  }

  // Block hostnames that embed metadata IPs
  if (hostname.includes('169.254.169.254') || hostname.includes('metadata.google')) {
    return { valid: false, reason: 'Hostname contains blocked address pattern' };
  }

  // 7. Block empty hostname
  if (!hostname || hostname.length === 0) {
    return { valid: false, reason: 'Empty hostname' };
  }

  return { valid: true };
}
