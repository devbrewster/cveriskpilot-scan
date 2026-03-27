// ---------------------------------------------------------------------------
// AI Package — Host / Secret Redaction
// ---------------------------------------------------------------------------

import type { RedactionInput, RedactedInput } from './types';

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

/** IPv4 address */
const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/** FQDN — at least two labels, TLD 2-12 chars. Negative lookahead avoids
 *  matching version numbers like "1.2.3" or file extensions like ".json" */
const FQDN_RE =
  /\b(?!(?:\d+\.)+\d+\b)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,12}\b/g;

/** Internal-style URLs (http/https) */
const URL_RE = /https?:\/\/[^\s"'<>]+/g;

/** File paths with a username component (Unix or Windows) */
const UNIX_PATH_USER_RE = /\/(?:home|Users)\/([a-zA-Z0-9._-]+)/g;
const WIN_PATH_USER_RE = /C:\\Users\\([a-zA-Z0-9._-]+)/g;

/** AWS account IDs — exactly 12 digits surrounded by word boundaries */
const AWS_ACCOUNT_RE = /\b\d{12}\b/g;

/** Common API key / token patterns */
const SECRET_RE =
  /\b(?:sk_[a-zA-Z0-9_-]{10,}|key_[a-zA-Z0-9_-]{10,}|token_[a-zA-Z0-9_-]{10,}|ghp_[a-zA-Z0-9]{30,}|gho_[a-zA-Z0-9]{30,}|AKIA[A-Z0-9]{16})\b/g;

/** Patterns we want to preserve (never redact) */
const CVE_RE = /CVE-\d{4}-\d{4,}/g;
const CWE_RE = /CWE-\d+/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectPreserved(text: string): Set<string> {
  const preserved = new Set<string>();
  for (const m of text.matchAll(CVE_RE)) preserved.add(m[0]);
  for (const m of text.matchAll(CWE_RE)) preserved.add(m[0]);
  return preserved;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan text and build a deterministic redaction map.
 * Each unique sensitive value gets a consistent placeholder.
 */
export function buildRedactionMap(input: string): Map<string, string> {
  const map = new Map<string, string>();
  const preserved = collectPreserved(input);

  const counters = { ip: 0, host: 0, url: 0, user: 0, aws: 0 };

  function add(value: string, prefix: string, counterKey: keyof typeof counters): void {
    if (map.has(value) || preserved.has(value)) return;
    counters[counterKey] += 1;
    map.set(value, `[REDACTED-${prefix}-${counters[counterKey]}]`);
  }

  // Order matters: URLs first (they contain hosts/IPs)
  for (const m of input.matchAll(URL_RE)) {
    add(m[0], 'URL', 'url');
  }

  for (const m of input.matchAll(IP_RE)) {
    if (!preserved.has(m[0])) {
      add(m[0], 'IP', 'ip');
    }
  }

  for (const m of input.matchAll(FQDN_RE)) {
    if (!preserved.has(m[0])) {
      add(m[0], 'HOST', 'host');
    }
  }

  // File path usernames
  for (const re of [UNIX_PATH_USER_RE, WIN_PATH_USER_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      const username = m[1];
      if (username && !map.has(username)) {
        counters.user += 1;
        map.set(username, `[REDACTED-USER-${counters.user}]`);
      }
    }
  }

  // AWS account IDs
  for (const m of input.matchAll(AWS_ACCOUNT_RE)) {
    // Only match if really 12 digits (not part of a longer number)
    if (m[0].length === 12) {
      add(m[0], 'AWS-ACCOUNT', 'aws');
    }
  }

  // Secrets
  for (const m of input.matchAll(SECRET_RE)) {
    if (!map.has(m[0])) {
      map.set(m[0], '[REDACTED-SECRET]');
    }
  }

  return map;
}

/**
 * Apply a redaction map to a string, replacing all occurrences.
 * Replaces longer values first to avoid partial replacements.
 */
export function applyRedaction(text: string, map: Map<string, string>): string {
  if (map.size === 0) return text;

  // Sort by length descending so longer matches are replaced first
  const entries = [...map.entries()].sort((a, b) => b[0].length - a[0].length);

  let result = text;
  for (const [original, placeholder] of entries) {
    // Use split+join for literal replacement (no regex escaping needed)
    result = result.split(original).join(placeholder);
  }
  return result;
}

/**
 * Reverse a redaction map — replace placeholders with original values.
 */
export function reverseRedaction(text: string, map: Map<string, string>): string {
  if (map.size === 0) return text;

  let result = text;
  for (const [original, placeholder] of map) {
    result = result.split(placeholder).join(original);
  }
  return result;
}

/**
 * High-level: redact sensitive data from AI input.
 */
export function redactSensitiveData(input: RedactionInput): RedactedInput {
  // Concatenate everything to build a single consistent map
  const parts: string[] = [input.title];
  if (input.description) parts.push(input.description);
  if (input.assetNames) parts.push(...input.assetNames);
  if (input.observations) {
    for (const obs of input.observations) {
      parts.push(JSON.stringify(obs));
    }
  }

  const combined = parts.join('\n');
  const redactionMap = buildRedactionMap(combined);

  return {
    title: applyRedaction(input.title, redactionMap),
    description: input.description
      ? applyRedaction(input.description, redactionMap)
      : undefined,
    observations: input.observations
      ? input.observations.map((obs) => applyRedaction(JSON.stringify(obs), redactionMap))
      : undefined,
    assetNames: input.assetNames
      ? input.assetNames.map((n) => applyRedaction(n, redactionMap))
      : undefined,
    redactionMap,
  };
}
