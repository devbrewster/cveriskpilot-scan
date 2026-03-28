/**
 * IP allowlist checking with CIDR support.
 * Uses no external dependencies — just bit math for CIDR matching.
 */

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = (num << 8) | n;
  }
  return num >>> 0; // unsigned
}

function matchCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const ipNum = ipv4ToNumber(ip);
  const netNum = ipv4ToNumber(network);
  if (ipNum === null || netNum === null) return false;

  if (prefix === 0) return true;
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (netNum & mask);
}

/**
 * Check if an IP address is in the allowlist.
 * Supports individual IPs ("10.0.0.1") and CIDR notation ("10.0.0.0/8").
 * Empty allowlist = allow all.
 */
export function checkIpAllowlist(ip: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;

  // Normalize IPv4-mapped IPv6 (::ffff:10.0.0.1 → 10.0.0.1)
  const normalizedIp = ip.replace(/^::ffff:/, '');

  for (const entry of allowlist) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    if (trimmed.includes('/')) {
      if (matchCidr(normalizedIp, trimmed)) return true;
    } else {
      if (normalizedIp === trimmed.trim()) return true;
    }
  }

  return false;
}

/**
 * Validate a CIDR or IP entry. Returns null if valid, error message if invalid.
 */
export function validateIpEntry(entry: string): string | null {
  const trimmed = entry.trim();
  if (!trimmed) return 'Empty entry';

  if (trimmed.includes('/')) {
    const [network, prefixStr] = trimmed.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return `Invalid CIDR prefix: ${prefixStr}`;
    if (ipv4ToNumber(network) === null) return `Invalid network address: ${network}`;
    return null;
  }

  if (ipv4ToNumber(trimmed) === null) return `Invalid IP address: ${trimmed}`;
  return null;
}
