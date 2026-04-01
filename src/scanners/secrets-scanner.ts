/**
 * Secrets Detection Scanner
 *
 * Regex-based + entropy-based detection for leaked credentials, API keys,
 * tokens, and private keys. Maps findings to NIST 800-53 controls:
 * IA-5 (Authenticator Mgmt), SC-12 (Key Mgmt), SC-28 (Data at Rest).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import type { CanonicalFinding } from '../vendor/parsers/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cweIds: string[];
  nistControls: string[];
  description: string;
}

export type FindingVerdict = 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'NEEDS_REVIEW';

export interface SecretMatch {
  patternId: string;
  patternName: string;
  filePath: string;
  lineNumber: number;
  redactedPreview: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cweIds: string[];
  nistControls: string[];
  verdict: FindingVerdict;
  verdictReason: string;
}

export interface SecretsScanResult {
  findings: CanonicalFinding[];
  matches: SecretMatch[];
  filesScanned: number;
  filesSkipped: number;
}

// ---------------------------------------------------------------------------
// Pattern Library (30+ patterns)
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: SecretPattern[] = [
  // === AWS ===
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-798', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'AWS access key ID found in source code.',
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-798', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'AWS secret access key found in source code.',
  },
  {
    id: 'aws-mws-key',
    name: 'AWS MWS Key',
    pattern: /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'AWS Marketplace Web Service key found.',
  },

  // === GCP ===
  {
    id: 'gcp-api-key',
    name: 'GCP API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'Google Cloud Platform API key found.',
  },
  {
    id: 'gcp-service-account',
    name: 'GCP Service Account JSON',
    pattern: /"type"\s*:\s*"service_account"/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-798', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'GCP service account credential file found in repository.',
  },
  {
    id: 'gcp-oauth-secret',
    name: 'GCP OAuth Client Secret',
    pattern: /(?:client_secret|GOOGLE_CLIENT_SECRET)\s*[=:]\s*['"]?[A-Za-z0-9_-]{24,}['"]?/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'GCP OAuth client secret found.',
  },

  // === Azure ===
  {
    id: 'azure-connection-string',
    name: 'Azure Connection String',
    pattern: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[^;]+/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-798', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'Azure Storage connection string found.',
  },
  {
    id: 'azure-ad-secret',
    name: 'Azure AD Client Secret',
    pattern: /(?:AZURE_CLIENT_SECRET|azure_client_secret)\s*[=:]\s*['"]?[A-Za-z0-9~._-]{34,}['"]?/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'Azure Active Directory client secret found.',
  },

  // === Generic API Keys ===
  {
    id: 'stripe-secret-key',
    name: 'Stripe Secret Key',
    pattern: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-798', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'Stripe secret API key found.',
  },
  {
    id: 'stripe-publishable-key',
    name: 'Stripe Publishable Key',
    pattern: /pk_(?:live|test)_[0-9a-zA-Z]{24,}/g,
    severity: 'LOW',
    cweIds: ['CWE-200'],
    nistControls: ['SC-12'],
    description: 'Stripe publishable key found (low risk but should not be hardcoded).',
  },
  {
    id: 'crp-api-key',
    name: 'CVERiskPilot API Key',
    pattern: /crp_[0-9a-zA-Z]{32,}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'CVERiskPilot API key found in source code.',
  },
  {
    id: 'openai-api-key',
    name: 'OpenAI API Key',
    pattern: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'OpenAI API key found.',
  },
  {
    id: 'anthropic-api-key',
    name: 'Anthropic API Key',
    pattern: /sk-ant-[A-Za-z0-9_-]{86,}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'Anthropic API key found.',
  },
  {
    id: 'github-token',
    name: 'GitHub Token',
    pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'GitHub personal access token or app token found.',
  },
  {
    id: 'github-oauth',
    name: 'GitHub OAuth Secret',
    pattern: /(?:GITHUB_CLIENT_SECRET|github_client_secret)\s*[=:]\s*['"]?[0-9a-f]{40}['"]?/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'GitHub OAuth client secret found.',
  },
  {
    id: 'gitlab-token',
    name: 'GitLab Token',
    pattern: /glpat-[A-Za-z0-9\-_]{20,}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'GitLab personal access token found.',
  },
  {
    id: 'slack-token',
    name: 'Slack Token',
    pattern: /xox[bporas]-[0-9]{10,}-[A-Za-z0-9-]+/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'Slack API token found.',
  },
  {
    id: 'slack-webhook',
    name: 'Slack Webhook URL',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9]+\/B[A-Za-z0-9]+\/[A-Za-z0-9]+/g,
    severity: 'MEDIUM',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'Slack incoming webhook URL found.',
  },
  {
    id: 'twilio-key',
    name: 'Twilio API Key',
    pattern: /SK[0-9a-fA-F]{32}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'Twilio API key found.',
  },
  {
    id: 'sendgrid-key',
    name: 'SendGrid API Key',
    pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'SendGrid API key found.',
  },
  {
    id: 'mailgun-key',
    name: 'Mailgun API Key',
    pattern: /key-[0-9a-zA-Z]{32}/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'Mailgun API key found.',
  },

  // === Private Keys ===
  {
    id: 'rsa-private-key',
    name: 'RSA Private Key',
    pattern: /-----BEGIN RSA PRIVATE KEY-----/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-321', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'RSA private key found in repository.',
  },
  {
    id: 'ec-private-key',
    name: 'EC Private Key',
    pattern: /-----BEGIN EC PRIVATE KEY-----/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-321', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'EC private key found in repository.',
  },
  {
    id: 'openssh-private-key',
    name: 'OpenSSH Private Key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-321', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'OpenSSH private key found in repository.',
  },
  {
    id: 'pgp-private-key',
    name: 'PGP Private Key',
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-321', 'CWE-522'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'PGP private key block found in repository.',
  },

  // === Database Connection Strings ===
  {
    id: 'db-connection-password',
    name: 'Database Connection String with Password',
    pattern: /(?:mysql|postgres|postgresql|mongodb|redis|amqp):\/\/[^:]+:[^@\s]{8,}@[^\s'"]+/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-798', 'CWE-256'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'Database connection string with embedded password found.',
  },
  {
    id: 'db-password-env',
    name: 'Database Password Assignment',
    pattern: /(?:DB_PASSWORD|DATABASE_PASSWORD|MONGO_PASSWORD|REDIS_PASSWORD|PGPASSWORD)\s*[=:]\s*['"]?[^\s'"]{8,}['"]?/g,
    severity: 'HIGH',
    cweIds: ['CWE-798', 'CWE-256'],
    nistControls: ['IA-5', 'SC-28'],
    description: 'Database password assigned in configuration file.',
  },

  // === JWT ===
  {
    id: 'jwt-token',
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    severity: 'MEDIUM',
    cweIds: ['CWE-522'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'JWT token found hardcoded in source code.',
  },
  {
    id: 'jwt-secret',
    name: 'JWT Secret',
    pattern: /(?:JWT_SECRET|JWT_SIGNING_KEY|JWT_PRIVATE_KEY)\s*[=:]\s*['"]?[^\s'"]{16,}['"]?/g,
    severity: 'CRITICAL',
    cweIds: ['CWE-798', 'CWE-321'],
    nistControls: ['IA-5', 'SC-12', 'SC-28'],
    description: 'JWT signing secret found in source code.',
  },

  // === Generic Secrets ===
  {
    id: 'generic-secret-assign',
    name: 'Generic Secret Assignment',
    pattern: /(?:SECRET|PASSWORD|PASSWD|TOKEN|API_KEY|APIKEY|ACCESS_KEY|PRIVATE_KEY)\s*[=:]\s*['"][^\s'"]{12,}['"]/gi,
    severity: 'MEDIUM',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-28'],
    description: 'Potential secret value assigned in configuration.',
  },
  {
    id: 'bearer-token',
    name: 'Bearer Token in Header',
    pattern: /(?:Authorization|authorization)\s*[=:]\s*['"]Bearer\s+[A-Za-z0-9\-_.~+/]+=*['"]/g,
    severity: 'HIGH',
    cweIds: ['CWE-798'],
    nistControls: ['IA-5', 'SC-12'],
    description: 'Hardcoded Bearer token found in source code.',
  },
  {
    id: 'basic-auth-header',
    name: 'Basic Auth Header',
    pattern: /(?:Authorization|authorization)\s*[=:]\s*['"]Basic\s+[A-Za-z0-9+/]+=*['"]/g,
    severity: 'HIGH',
    cweIds: ['CWE-798', 'CWE-522'],
    nistControls: ['IA-5', 'SC-8'],
    description: 'Hardcoded Basic authentication header found.',
  },
  {
    id: 'encryption-key-assign',
    name: 'Encryption Key Assignment',
    pattern: /(?:ENCRYPTION_KEY|MASTER_KEY|AES_KEY|CIPHER_KEY)\s*[=:]\s*['"]?[A-Fa-f0-9]{32,}['"]?/gi,
    severity: 'CRITICAL',
    cweIds: ['CWE-321', 'CWE-798'],
    nistControls: ['SC-12', 'SC-28'],
    description: 'Encryption key found hardcoded in source code.',
  },
];

// ---------------------------------------------------------------------------
// File Exclusion
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  '.next-dev',
  '.open-next',
  'dist',
  'build',
  'out',
  '.cache',
  '.turbo',
  'vendor',
  '__pycache__',
  '.tox',
  '.venv',
  'venv',
  'coverage',
  '.nyc_output',
  '.wrangler',
  '.data',
  '.svn',
  '.hg',
  '.claude',
  'security_reports_bundle',
]);

const EXCLUDED_EXTENSIONS = new Set([
  '.min.js',
  '.min.css',
  '.map',
  '.lock',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp3',
  '.mp4',
  '.webm',
  '.webp',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.br',
  '.bz2',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.o',
  '.a',
  '.bin',
  '.dat',
  '.db',
  '.sqlite',
  '.wasm',
]);

const EXCLUDED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Cargo.lock',
  'Gemfile.lock',
  'Pipfile.lock',
  'go.sum',
  'composer.lock',
  '.env.example',
]);

/** Relative paths (from project root) that should never be scanned for secrets.
 *  Includes the scanner itself to avoid self-detection of its own regex patterns. */
const EXCLUDED_RELATIVE_PATHS = new Set([
  'packages/scan/src/scanners/secrets-scanner.ts',
]);

function shouldScanFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  if (EXCLUDED_FILENAMES.has(basename)) return false;

  // Check excluded extensions (handle compound like .min.js)
  for (const ext of EXCLUDED_EXTENSIONS) {
    if (basename.endsWith(ext)) return false;
  }

  // Check if any parent directory is excluded
  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDED_DIRS.has(part)) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Entropy Detection
// ---------------------------------------------------------------------------

const HEX_CHARS = new Set('0123456789abcdefABCDEF');
const BASE64_CHARS = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=');

function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isHighEntropyString(token: string): boolean {
  if (token.length < 20) return false;

  // Check if it's hex-like
  const hexChars = [...token].filter((c) => HEX_CHARS.has(c)).length;
  const isHex = hexChars / token.length > 0.85;

  // Check if it's base64-like
  const b64Chars = [...token].filter((c) => BASE64_CHARS.has(c)).length;
  const isBase64 = b64Chars / token.length > 0.85;

  if (!isHex && !isBase64) return false;

  const entropy = shannonEntropy(token);
  return entropy > 4.5;
}

/** Extract high-entropy tokens from a line for entropy-based detection */
function extractHighEntropyMatches(line: string): string[] {
  const results: string[] = [];
  // Look for quoted strings and assignment values with high entropy
  const tokenRegex = /['"]([A-Za-z0-9+/=_-]{20,})['"]|=\s*([A-Fa-f0-9]{20,})\b/g;
  let match;
  while ((match = tokenRegex.exec(line)) !== null) {
    const token = match[1] ?? match[2];
    if (token && isHighEntropyString(token)) {
      results.push(token);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

function redact(value: string): string {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function redactLine(line: string, matchedText: string): string {
  const idx = line.indexOf(matchedText);
  if (idx === -1) return line.slice(0, 80);
  return line.slice(0, idx) + redact(matchedText) + line.slice(idx + matchedText.length);
}

// ---------------------------------------------------------------------------
// Gitignore Support
// ---------------------------------------------------------------------------

async function loadGitignorePatterns(projectDir: string): Promise<string[]> {
  try {
    const content = await fs.promises.readFile(path.join(projectDir, '.gitignore'), 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('!'));
  } catch {
    return [];
  }
}

function matchesGitignore(relativePath: string, patterns: string[]): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  for (const pattern of patterns) {
    // Exact filename match
    if (normalized === pattern || normalized.endsWith('/' + pattern)) return true;
    // Directory-prefixed (e.g., ".env.local" matches a file named .env.local anywhere)
    const basename = path.basename(normalized);
    if (basename === pattern) return true;
    // Glob-like: pattern ending with /* or /**
    if (pattern.endsWith('/*') || pattern.endsWith('/**')) {
      const dir = pattern.replace(/\/\*+$/, '');
      if (normalized.startsWith(dir + '/') || normalized === dir) return true;
    }
    // Pattern with directory prefix
    if (pattern.includes('/') && normalized.startsWith(pattern)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// File Walking
// ---------------------------------------------------------------------------

async function* walkFiles(dir: string, projectDir?: string, gitignorePatterns?: string[]): AsyncGenerator<string> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip gitignored directories early (avoid descending into them)
      if (projectDir && gitignorePatterns?.length) {
        const relDir = path.relative(projectDir, fullPath);
        if (matchesGitignore(relDir, gitignorePatterns)) continue;
      }
      yield* walkFiles(fullPath, projectDir, gitignorePatterns);
    } else if (entry.isFile()) {
      if (shouldScanFile(fullPath)) {
        yield fullPath;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Test File Heuristics
// ---------------------------------------------------------------------------

function isTestFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('__tests__/') ||
    lower.includes('__mocks__/') ||
    lower.includes('/test/') ||
    lower.includes('/tests/') ||
    lower.includes('/fixtures/') ||
    lower.includes('/e2e/') ||
    lower.includes('/testdata/')
  );
}

function isObviousTestValue(matchedText: string): boolean {
  const lower = matchedText.toLowerCase();
  return /(?:test|fake|mock|dummy|example|placeholder|xxxx|abcdef|abc123|my-secret|secret-\d|client-secret|token-\w{3,}|wrong|stress|invalid|expired)/.test(lower);
}

// ---------------------------------------------------------------------------
// File Scanner
// ---------------------------------------------------------------------------

// Concurrency for parallel file scanning
const SCAN_CONCURRENCY = 50;

async function scanFile(filePath: string, projectDir: string, gitignorePatterns: string[] = []): Promise<SecretMatch[]> {
  const matches: SecretMatch[] = [];

  // Skip large files (> 1MB likely binary or generated)
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    return matches;
  }
  if (stat.size > 1_048_576) return matches;

  // Cache per-file verdict context (computed once, not per-match)
  const basename = path.basename(filePath);
  const relativePath = path.relative(projectDir, filePath);
  const fileIsTest = isTestFile(filePath);
  const fileIsEnvExample = basename === '.env.example';
  const fileIsReport = /[_-]report[_.]|[_-]sample[_.]/.test(basename.toLowerCase());
  const fileIsGitignored = gitignorePatterns.length > 0 && matchesGitignore(relativePath, gitignorePatterns);

  // Quick binary check: read first 512 bytes
  let fd: fs.promises.FileHandle | undefined;
  try {
    fd = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(512);
    const { bytesRead } = await fd.read(buf, 0, 512, 0);
    await fd.close();
    fd = undefined;

    // If there are null bytes in first 512, it's likely binary
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return matches;
    }
  } catch {
    if (fd) await fd.close().catch(() => {});
    return matches;
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, 'utf-8'),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
      // Still scan comments -- secrets often appear there
    }

    // Regex-based detection (matchAll avoids shared lastIndex mutation)
    for (const pattern of SECRET_PATTERNS) {
      for (const regexMatch of line.matchAll(pattern.pattern)) {
        const matchedText = regexMatch[0];

        // Classify the finding with a verdict
        let verdict: FindingVerdict = 'TRUE_POSITIVE';
        let verdictReason = '';

        // Matches inside regex literals or RegExp constructors (e.g., scanner pattern definitions)
        const beforeMatch = line.lastIndexOf('/', regexMatch.index);
        const afterMatch = line.indexOf('/', regexMatch.index + matchedText.length);
        const isRegexLiteral = beforeMatch !== -1 && afterMatch !== -1 && line[afterMatch + 1]?.match(/[gimsuy]/);
        const isRegExpConstructor = /new\s+RegExp\s*\(/.test(line);
        const isPatternDefinition = /pattern\s*[:=]/.test(line) && /\/.*\/[gimsuy]*/.test(line);
        if (isRegexLiteral || isRegExpConstructor || isPatternDefinition) {
          verdict = 'FALSE_POSITIVE';
          verdictReason = 'Match appears inside a regex literal or pattern definition, not an actual secret';
        }

        // Test files: treat all findings as FP (test fixtures contain intentional fake secrets)
        if (verdict === 'TRUE_POSITIVE' && fileIsTest) {
          verdict = 'FALSE_POSITIVE';
          verdictReason = 'Secret pattern matched in a test/fixture file — test data, not a real credential';
        }

        // Shell/Terraform interpolation (not hardcoded)
        if (verdict === 'TRUE_POSITIVE' && (
          /\$\{[A-Za-z_]/.test(matchedText) ||
          /\$\{var\./.test(line) ||
          /\$\{google_/.test(line) ||
          /\$\{local\./.test(line) ||
          /\$\{data\./.test(line) ||
          /\$\{module\./.test(line) ||
          /\\\$\{/.test(line)
        )) {
          verdict = 'FALSE_POSITIVE';
          verdictReason = 'Value contains variable interpolation (shell ${VAR} or Terraform ${var.}), not a hardcoded secret';
        }

        // .env.example placeholder values (instructional, not real secrets)
        if (verdict === 'TRUE_POSITIVE' && fileIsEnvExample) {
          verdict = 'FALSE_POSITIVE';
          verdictReason = 'File is .env.example — contains placeholder/template values, not real secrets';
        }

        // Sample/report data files (contain example findings, not real secrets)
        if (verdict === 'TRUE_POSITIVE' && fileIsReport) {
          verdict = 'FALSE_POSITIVE';
          verdictReason = 'File is a sample/report data file containing example findings, not actual secrets';
        }

        // Example/placeholder connection strings in documentation files (.md, .html)
        if (verdict === 'TRUE_POSITIVE' && (pattern.id === 'db-connection-password' || pattern.id === 'db-password-env')) {
          const ext = path.extname(filePath).toLowerCase();
          if (ext === '.md' || ext === '.html') {
            if (/example/i.test(matchedText)) {
              verdict = 'FALSE_POSITIVE';
              verdictReason = 'Example/placeholder connection string in documentation';
            }
          }
        }

        // DATABASE_URL with example/placeholder values in documentation files
        if (verdict === 'TRUE_POSITIVE' && /DATABASE_URL\s*[=:]/.test(line)) {
          const ext = path.extname(filePath).toLowerCase();
          if (ext === '.md' || ext === '.html') {
            if (/example/i.test(line)) {
              verdict = 'FALSE_POSITIVE';
              verdictReason = 'Example/placeholder connection string in documentation';
            }
          }
        }

        // Gitignored file — real secret locally but not in version control
        if (verdict === 'TRUE_POSITIVE' && fileIsGitignored) {
          verdict = 'NEEDS_REVIEW';
          verdictReason = 'File is gitignored (not committed) — local-only secret, verify it is not checked in';
        }

        matches.push({
          patternId: pattern.id,
          patternName: pattern.name,
          filePath,
          lineNumber,
          redactedPreview: redactLine(line.trim(), matchedText).slice(0, 120),
          severity: pattern.severity,
          cweIds: pattern.cweIds,
          nistControls: pattern.nistControls,
          verdict,
          verdictReason,
        });
      }
    }

    // Entropy-based detection
    const entropyTokens = extractHighEntropyMatches(line);
    for (const token of entropyTokens) {
      // Skip if already caught by regex patterns
      const alreadyCaught = matches.some(
        (m) => m.filePath === filePath && m.lineNumber === lineNumber
      );
      if (alreadyCaught) continue;

      let verdict: FindingVerdict = 'TRUE_POSITIVE';
      let verdictReason = '';

      // Charset/alphabet constant definitions
      if (/(?:CHARS|CHARSET|ALPHABET|DIGITS)\b/i.test(line)) {
        verdict = 'FALSE_POSITIVE';
        verdictReason = 'High-entropy string is a character set/alphabet constant definition';
      }

      // Entropy hits in test files
      if (verdict === 'TRUE_POSITIVE' && fileIsTest) {
        verdict = 'FALSE_POSITIVE';
        verdictReason = 'High-entropy string in a test file — likely test data';
      }

      // .env.example
      if (verdict === 'TRUE_POSITIVE' && fileIsEnvExample) {
        verdict = 'FALSE_POSITIVE';
        verdictReason = 'High-entropy string in .env.example — placeholder value';
      }

      // Sample/report files
      if (verdict === 'TRUE_POSITIVE' && fileIsReport) {
        verdict = 'FALSE_POSITIVE';
        verdictReason = 'High-entropy string in sample/report file — example data';
      }

      matches.push({
        patternId: 'entropy-detection',
        patternName: 'High-Entropy String',
        filePath,
        lineNumber,
        redactedPreview: redactLine(line.trim(), token).slice(0, 120),
        severity: 'MEDIUM',
        cweIds: ['CWE-798'],
        nistControls: ['IA-5', 'SC-12'],
        verdict,
        verdictReason,
      });
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function scanSecrets(projectDir: string, opts?: { exclude?: string[]; onProgress?: (scanned: number) => void }): Promise<SecretsScanResult> {
  const allMatches: SecretMatch[] = [];
  let filesScanned = 0;
  let filesSkipped = 0;
  const now = new Date();
  const gitignorePatterns = await loadGitignorePatterns(projectDir);

  // Pre-compile exclude regexes once
  const excludeRegexes = (opts?.exclude ?? []).map(glob =>
    new RegExp('^' + glob.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
  );

  // Collect files then scan in concurrent batches
  const fileBatch: string[] = [];

  for await (const filePath of walkFiles(projectDir, projectDir, gitignorePatterns)) {
    const relativePath = path.relative(projectDir, filePath);

    // Skip --exclude patterns
    if (excludeRegexes.length > 0 && excludeRegexes.some(re => re.test(relativePath))) {
      filesSkipped++;
      continue;
    }

    // Skip files on the built-in exclusion list (e.g., the scanner itself)
    if (EXCLUDED_RELATIVE_PATHS.has(relativePath.replace(/\\/g, '/'))) {
      filesSkipped++;
      continue;
    }

    fileBatch.push(filePath);

    // Process in batches of SCAN_CONCURRENCY
    if (fileBatch.length >= SCAN_CONCURRENCY) {
      const results = await Promise.all(
        fileBatch.map(fp => scanFile(fp, projectDir, gitignorePatterns).catch(() => null))
      );
      for (const r of results) {
        if (r) { allMatches.push(...r); filesScanned++; }
        else { filesSkipped++; }
      }
      fileBatch.length = 0;
      if (opts?.onProgress) opts.onProgress(filesScanned);
    }
  }

  // Process remaining files
  if (fileBatch.length > 0) {
    const results = await Promise.all(
      fileBatch.map(fp => scanFile(fp, projectDir, gitignorePatterns).catch(() => null))
    );
    for (const r of results) {
      if (r) { allMatches.push(...r); filesScanned++; }
      else { filesSkipped++; }
    }
    if (opts?.onProgress) opts.onProgress(filesScanned);
  }

  const findings: CanonicalFinding[] = allMatches.map((match) => {
    const relativePath = path.relative(projectDir, match.filePath);
    return {
      title: `${match.patternName} detected in ${relativePath}`,
      description: `${match.patternName} found at line ${match.lineNumber}. Hardcoded secrets in source code violate NIST controls: ${match.nistControls.join(', ')}. Preview: ${match.redactedPreview}`,
      cveIds: [],
      cweIds: match.cweIds,
      severity: match.severity,
      verdict: match.verdict,
      verdictReason: match.verdictReason,
      scannerType: 'secrets',
      scannerName: 'cveriskpilot-scan/secrets',
      assetName: projectDir,
      assetType: 'repository',
      filePath: relativePath,
      lineNumber: match.lineNumber,
      snippet: match.redactedPreview,
      rawObservations: {
        patternId: match.patternId,
        patternName: match.patternName,
        nistControls: match.nistControls,
        filesScanned,
      },
      discoveredAt: now,
    };
  });

  return { findings, matches: allMatches, filesScanned, filesSkipped };
}
