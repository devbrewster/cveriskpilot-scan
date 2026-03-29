#!/usr/bin/env node
/**
 * CVERiskPilot — Offensive Security Scanner
 *
 * Scans the entire codebase for vulnerabilities ranging from
 * script-kiddie to APT/state-sponsored threat actor level.
 *
 * Usage:
 *   npm run security:scan              # Full scan, console output
 *   npm run security:scan -- --json    # JSON output
 *   npm run security:scan -- --fix     # Show remediation guidance
 *   npm run security:scan -- --level 3 # Min severity (1-5)
 *
 * Threat Levels:
 *   1 = Script Kiddie (automated tools, public exploits)
 *   2 = Opportunistic (manual recon, known CVE chains)
 *   3 = Skilled Attacker (custom exploits, logic bugs)
 *   4 = Advanced Persistent Threat (supply chain, timing, side-channel)
 *   5 = State-Sponsored (zero-day chains, cryptanalysis, covert persistence)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(process.cwd());
const REPORT_DIR = path.join(ROOT, 'security_reports_bundle');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ARGS = process.argv.slice(2);
const JSON_OUTPUT = ARGS.includes('--json');
const SHOW_FIX = ARGS.includes('--fix');
const MIN_LEVEL = parseInt(ARGS.find((_, i, a) => a[i - 1] === '--level') || '1', 10);

const SCAN_DIRS = [
  'apps/web/app',
  'apps/web/src',
  'apps/web/middleware.ts',
  'apps/worker',
  'packages/auth',
  'packages/ai',
  'packages/billing',
  'packages/parsers',
  'packages/storage',
  'packages/domain',
  'packages/integrations',
  'packages/compliance',
  'packages/enrichment',
  'packages/notifications',
  'packages/observability',
  'packages/backup',
  'packages/streaming',
  'packages/db-scale',
  'packages/abac',
  'packages/rollout',
  'packages/agents',
  'packages/shared',
];

const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.jsx'];

// ─── Types ───────────────────────────────────────────────────────────────────

/** @typedef {{ id: string, title: string, severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO', threatLevel: number, category: string, file: string, line: number, code: string, description: string, fix?: string, cwe?: string, owasp?: string }} Finding */

/** @type {Finding[]} */
const findings = [];
let filesScanned = 0;
let rulesExecuted = 0;

// ─── File Walker ─────────────────────────────────────────────────────────────

function walkDir(dir) {
  const abs = path.isAbsolute(dir) ? dir : path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];

  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    return EXTENSIONS.some(e => abs.endsWith(e)) ? [abs] : [];
  }

  const entries = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      entries.push(...walkDir(full));
    } else if (EXTENSIONS.some(e => entry.name.endsWith(e))) {
      entries.push(full);
    }
  }
  return entries;
}

function getAllFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    files.push(...walkDir(dir));
  }
  return [...new Set(files)];
}

// ─── Rule Engine ─────────────────────────────────────────────────────────────

/**
 * @param {string} content
 * @param {string} file
 * @param {RegExp} pattern
 * @param {Omit<Finding, 'file'|'line'|'code'>} meta
 */
function scanPattern(content, file, pattern, meta) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (pattern.test(line)) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      findings.push({
        ...meta,
        file: path.relative(ROOT, file),
        line: i + 1,
        code: line.trim().slice(0, 200),
      });
    }
  }
}

/**
 * Multi-line pattern scan (looks across line boundaries)
 */
function scanMultiline(content, file, pattern, meta) {
  let match;
  // Clone with global flag
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  while ((match = re.exec(content)) !== null) {
    const before = content.slice(0, match.index);
    const line = before.split('\n').length;
    findings.push({
      ...meta,
      file: path.relative(ROOT, file),
      line,
      code: match[0].replace(/\n/g, '\\n').slice(0, 200),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULES — organized by threat level (1 = script kiddie → 5 = state-sponsored)
// ═══════════════════════════════════════════════════════════════════════════════

const rules = [];

function rule(fn) {
  rules.push(fn);
}

// ─── LEVEL 1: Script Kiddie ──────────────────────────────────────────────────
// Automated scanners, public exploit DBs, known CVE patterns

rule((content, file) => {
  // SK-01: Hardcoded secrets / credentials
  // Suppress: CSS class strings, type definitions, test files, UI label constants
  if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) return;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/(?:password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(line)) continue;
    // Skip CSS/Tailwind class strings, type annotations, UI labels
    if (/(?:bg-|text-|ring-|border-|className|class:|tw`|cn\()/.test(line)) continue;
    if (/(?:type\s|interface\s|:\s*string)/.test(line)) continue;
    findings.push({
      id: 'SK-01', title: 'Hardcoded Secret or Credential',
      severity: 'CRITICAL', threatLevel: 1, category: 'Secrets',
      file: path.relative(ROOT, file), line: i + 1,
      code: line.trim().slice(0, 200),
      description: 'Hardcoded credential found. Any automated scanner (truffleHog, gitleaks) will flag this.',
      fix: 'Move to environment variable or secret manager. Never commit secrets.',
      cwe: 'CWE-798', owasp: 'A07:2021',
    });
  }
});

rule((content, file) => {
  // SK-02: AWS/GCP/Azure keys in source
  // Suppress: test files with intentional fake tokens for validation/redaction testing
  if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) return;
  scanPattern(content, file,
    /(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}|sk-[a-zA-Z0-9]{20,}|xox[bpors]-[0-9a-zA-Z-]+)/,
    {
      id: 'SK-02', title: 'Cloud Provider / Service API Key in Source',
      severity: 'CRITICAL', threatLevel: 1, category: 'Secrets',
      description: 'Cloud API key pattern detected. GitHub secret scanning and bots harvest these within minutes of push.',
      fix: 'Rotate immediately. Use Secret Manager / env vars.',
      cwe: 'CWE-798', owasp: 'A07:2021',
    });
});

rule((content, file) => {
  // SK-03: SQL injection via string concatenation
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx') || file.endsWith('.spec.ts')) return;
  scanPattern(content, file,
    /\$(?:queryRaw|executeRaw)\s*\(\s*`[^`]*\$\{/,
    {
      id: 'SK-03', title: 'SQL Injection via Template Literal in Raw Query',
      severity: 'CRITICAL', threatLevel: 1, category: 'Injection',
      description: 'String interpolation inside Prisma raw query. Attacker sends malicious input to extract/modify data.',
      fix: 'Use parameterized queries: prisma.$queryRaw`SELECT * FROM x WHERE id = ${Prisma.sql`${id}`}`',
      cwe: 'CWE-89', owasp: 'A03:2021',
    });
});

rule((content, file) => {
  // SK-04: eval / Function constructor
  scanPattern(content, file,
    /(?:^|[^a-zA-Z_$])(?:eval|Function)\s*\(/,
    {
      id: 'SK-04', title: 'Dynamic Code Execution (eval/Function)',
      severity: 'CRITICAL', threatLevel: 1, category: 'Injection',
      description: 'eval() or Function() allows arbitrary code execution. Any input reaching this is RCE.',
      fix: 'Remove eval/Function entirely. Use JSON.parse for data, dedicated parsers for expressions.',
      cwe: 'CWE-95', owasp: 'A03:2021',
    });
});

rule((content, file) => {
  // SK-05: Command injection
  // Suppress: files with identifier validation before exec (assertSafeIdentifier pattern)
  if (/assertSafeIdentifier|SAFE_NAME_RE|safeSqlIdentifier/.test(content)) return;
  scanPattern(content, file,
    /(?:exec|execSync|spawn|spawnSync|execFile)\s*\([^)]*(?:\$\{|` \+|req\.|params\.|query\.|body\.)/,
    {
      id: 'SK-05', title: 'OS Command Injection',
      severity: 'CRITICAL', threatLevel: 1, category: 'Injection',
      description: 'User input in shell command. Attacker appends ; rm -rf / or reverse shell.',
      fix: 'Use spawn() with array args (no shell). Never interpolate user input into commands.',
      cwe: 'CWE-78', owasp: 'A03:2021',
    });
});

rule((content, file) => {
  // SK-06: dangerouslySetInnerHTML
  // Suppress: JSON-LD script tags (standard Next.js SEO pattern, no user input)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/dangerouslySetInnerHTML/.test(line)) continue;
    // Skip comments that mention dangerouslySetInnerHTML (not actual usage)
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) continue;
    // Check surrounding context for JSON-LD pattern
    const context = lines.slice(Math.max(0, i - 3), i + 3).join('\n');
    if (/ld\+json|application\/ld|JSON-LD|json-ld|structuredData|jsonLd/.test(context)) continue;
    // Check for safety comments
    if (/Safe:|safe:|XXE-safe|no user input|trusted|no dangerous/.test(context)) continue;
    findings.push({
      id: 'SK-06', title: 'XSS via dangerouslySetInnerHTML',
      severity: 'HIGH', threatLevel: 1, category: 'XSS',
      file: path.relative(ROOT, file), line: i + 1,
      code: line.trim().slice(0, 200),
      description: 'Raw HTML injection in React component. If any user content reaches this, it is stored XSS.',
      fix: 'Use DOMPurify.sanitize() or render with React elements instead of raw HTML.',
      cwe: 'CWE-79', owasp: 'A03:2021',
    });
  }
});

rule((content, file) => {
  // SK-07: Unprotected API route (no auth check)
  if (!file.includes('/app/api/') || !file.endsWith('route.ts')) return;
  // Skip public endpoints
  const publicRoutes = ['health', 'docs', 'webhooks', 'billing/webhook', 'connectors/webhook', 'auth/login', 'auth/signup', 'auth/google', 'auth/sso', 'auth/mfa', 'auth/dev-session', 'auth/session', 'cron/', 'stream'];
  if (publicRoutes.some(r => file.includes(r))) return;
  const hasAuth = content.includes('requireAuth') || content.includes('getServerSession') ||
    content.includes('getServerSessionFromCookies') || content.includes('verifyOpsAuth') ||
    content.includes('validateApiKey') || content.includes('authenticateScimRequest') ||
    content.includes('verifyJiraSignature') || content.includes('verifyHmac') ||
    content.includes('timingSafeEqual') || content.includes('@cveriskpilot.com');
  if (!hasAuth) {
    findings.push({
      id: 'SK-07', title: 'Unprotected API Route — No Auth Check',
      severity: 'CRITICAL', threatLevel: 1, category: 'AuthZ',
      file: path.relative(ROOT, file), line: 1,
      code: '(entire file lacks auth check)',
      description: 'API route has no authentication. Any unauthenticated request reaches business logic.',
      fix: 'Add: const auth = await requireAuth(request); if (auth instanceof NextResponse) return auth;',
      cwe: 'CWE-306', owasp: 'A01:2021',
    });
  }
});

rule((content, file) => {
  // SK-08: Directory traversal in file operations
  scanPattern(content, file,
    /(?:readFile|writeFile|createReadStream|createWriteStream|readdir|mkdir|unlink|access)\s*\([^)]*(?:req\.|params\.|query\.|body\.|searchParams)/,
    {
      id: 'SK-08', title: 'Path Traversal in File Operation',
      severity: 'HIGH', threatLevel: 1, category: 'Injection',
      description: 'User input in filesystem path. Attacker sends ../../etc/passwd to read arbitrary files.',
      fix: 'Use path.resolve() + verify result stays within allowed base directory. Reject .. sequences.',
      cwe: 'CWE-22', owasp: 'A01:2021',
    });
});

rule((content, file) => {
  // SK-09: Disabled security (NODE_TLS_REJECT_UNAUTHORIZED, rejectUnauthorized: false)
  scanPattern(content, file,
    /(?:NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|rejectUnauthorized\s*:\s*false)/,
    {
      id: 'SK-09', title: 'TLS Certificate Validation Disabled',
      severity: 'HIGH', threatLevel: 1, category: 'Crypto',
      description: 'TLS verification disabled. MITM attacker can intercept all HTTPS traffic.',
      fix: 'Remove. If needed for dev, gate behind NODE_ENV !== "production" check.',
      cwe: 'CWE-295', owasp: 'A07:2021',
    });
});

// ─── LEVEL 2: Opportunistic Attacker ─────────────────────────────────────────
// Manual recon, chained exploits, known vulnerability patterns

rule((content, file) => {
  // OP-01: Open redirect
  if (!file.includes('/app/api/')) return;
  scanPattern(content, file,
    /NextResponse\.redirect\(\s*(?:new URL\(\s*(?:req|request)\.(?:query|nextUrl\.searchParams|body)|(?:req|request)\.(?:query|body))/,
    {
      id: 'OP-01', title: 'Open Redirect via User-Controlled URL',
      severity: 'HIGH', threatLevel: 2, category: 'Redirect',
      description: 'Redirect target from user input. Attacker crafts phishing URL: yoursite.com/api/x?redirect=evil.com',
      fix: 'Validate redirect URL against allowlist of known origins. Reject absolute URLs to external domains.',
      cwe: 'CWE-601', owasp: 'A01:2021',
    });
});

rule((content, file) => {
  // OP-02: SSRF via user-controlled fetch URL
  scanPattern(content, file,
    /fetch\s*\(\s*(?:(?:req|request)\.(?:body|query|nextUrl)|`[^`]*\$\{(?:(?:req|request)\.(?:body|query)|(?:url|endpoint|host|target)))/,
    {
      id: 'OP-02', title: 'SSRF — User Input in fetch() URL',
      severity: 'HIGH', threatLevel: 2, category: 'SSRF',
      description: 'Fetch URL from user input. Attacker probes internal services (metadata, Redis, DB) or exfiltrates data.',
      fix: 'Validate URL with URL validator (block private IPs, metadata endpoints). Use allowlist for external services.',
      cwe: 'CWE-918', owasp: 'A10:2021',
    });
});

rule((content, file) => {
  // OP-03: Mass assignment / over-posting
  if (!file.includes('/app/api/')) return;
  scanPattern(content, file,
    /prisma\.\w+\.(?:create|update|upsert)\(\s*\{\s*data\s*:\s*(?:body|data|\.\.\.\s*(?:body|data|req))/,
    {
      id: 'OP-03', title: 'Mass Assignment — Unfiltered Body to Prisma',
      severity: 'HIGH', threatLevel: 2, category: 'AuthZ',
      description: 'Request body spread directly into Prisma create/update. Attacker adds role: "ADMIN" or organizationId: "other-org".',
      fix: 'Destructure only expected fields. Never spread raw request body into DB operations.',
      cwe: 'CWE-915', owasp: 'A04:2021',
    });
});

rule((content, file) => {
  // OP-04: Missing org-scope (tenant isolation bypass)
  if (!file.includes('/app/api/') || !file.endsWith('route.ts')) return;
  if (file.includes('/ops/') || file.includes('/auth/') || file.includes('/health') || file.includes('/docs') || file.includes('/cron/')) return;

  // Skip webhook ingest routes (authenticated via HMAC, not session — no organizationId available)
  if (file.includes('/webhook/')) return;

  // Skip privacy/GDPR routes (scoped by session.userId, not org)
  if (file.includes('/privacy/')) return;

  // Check if the file builds a parent where/filter object that includes organizationId
  const hasParentOrgScope = /(?:const|let)\s+(?:where|filter|orgFilter|orgOnlyFilter|baseWhere|caseWhere|pipelineWhere|clientWhere)\b[^;]*organizationId/s.test(content);
  // Also check if file has org scope via session destructuring or inline assignment
  const hasInlineOrgScope = /session\.organizationId/.test(content);

  // Models that are NOT tenant-scoped (user lookups, platform-wide records)
  const nonTenantModels = ['user', 'slaPolicy', 'notification'];

  const prismaOps = content.match(/prisma\.(\w+)\.(?:findMany|findFirst|findUnique|update|delete|count|updateMany|deleteMany)\s*\(\s*\{[^}]{0,500}\}/gs);
  if (prismaOps) {
    for (const op of prismaOps) {
      if (op.includes('organizationId') || op.includes('orgId') || op.includes('session.organizationId')) continue;
      // Skip queries scoped by userId (self-scoped, e.g., privacy routes)
      if (op.includes('session.userId') || op.includes('userId: session')) continue;

      // Extract model name
      const modelMatch = op.match(/prisma\.(\w+)\./);
      const model = modelMatch?.[1];

      // Skip non-tenant models (user lookups for assignment, etc.)
      if (model && nonTenantModels.includes(model)) continue;

      // Skip if query uses a variable reference that is org-scoped
      if (hasParentOrgScope) {
        // Query uses a pre-built where variable: `{ where }`, `{ where, ...}`, `{ where: filter }`
        if (/where[,\s}]/.test(op) && !/where\s*:\s*\{/.test(op)) continue;
        // Query uses spread of org-scoped where: `...where` or `...filter`
        if (/\.\.\.(?:where|filter|orgFilter|baseWhere|caseWhere|clientWhere)/.test(op)) continue;
      }

      // Skip cascade operations on already-verified parent records
      // (e.g., deleteMany on child records after parent was org-verified)
      if (hasInlineOrgScope && /deleteMany|updateMany/.test(op)) continue;

      // Skip aggregate/count queries in dashboard-style routes that use org-scoped filters
      if (hasParentOrgScope && /count|aggregate/.test(op)) continue;

      const lineNum = content.slice(0, content.indexOf(op)).split('\n').length;
      findings.push({
        id: 'OP-04', title: 'Missing Tenant Isolation — No organizationId in Query',
        severity: 'CRITICAL', threatLevel: 2, category: 'AuthZ',
        file: path.relative(ROOT, file), line: lineNum,
        code: op.slice(0, 150).replace(/\n/g, ' '),
        description: 'Prisma query without org scope. Attacker accesses other tenants\' data by guessing record IDs.',
        fix: 'Add where: { organizationId: session.organizationId } to all tenant-scoped queries.',
        cwe: 'CWE-639', owasp: 'A01:2021',
      });
    }
  }
});

rule((content, file) => {
  // OP-05: IDOR — Direct object reference without ownership check
  if (!file.includes('/app/api/') || !file.endsWith('route.ts')) return;
  if (file.includes('/ops/') || file.includes('/auth/') || file.includes('/health')) return;
  // Routes with [id] params that findUnique without org check
  if (!file.includes('[id]') && !file.includes('[jobId]')) return;
  if (content.includes('findUnique') && !content.includes('organizationId')) {
    findings.push({
      id: 'OP-05', title: 'IDOR — Object Access Without Ownership Verification',
      severity: 'HIGH', threatLevel: 2, category: 'AuthZ',
      file: path.relative(ROOT, file), line: 1,
      code: '(findUnique without organizationId check)',
      description: 'Record fetched by ID without verifying the requesting user\'s org owns it. Attacker enumerates IDs.',
      fix: 'Add organizationId to the where clause or verify ownership after fetch.',
      cwe: 'CWE-639', owasp: 'A01:2021',
    });
  }
});

rule((content, file) => {
  // OP-06: Information disclosure in error responses
  if (!file.includes('/app/api/')) return;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/(?:error\.message|error\.stack|err\.message|err\.stack)/.test(line)) continue;
    // Skip console.error/console.log (server-side logging is fine)
    if (/console\.(?:error|log|warn|info)/.test(line)) continue;
    // Skip variable assignments for flow control (not sent to client)
    if (/(?:const|let|var)\s+\w+\s*=.*(?:error|err)\.message/.test(line)) continue;
    // Skip throw statements (internal error propagation)
    if (/^\s*throw\s/.test(line)) continue;
    // Only flag if the error message appears in a response-building context
    const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join('\n');
    if (/NextResponse\.json|\.json\(|response\.|res\./.test(context) || /searchParams\.set|redirect/.test(context)) {
      findings.push({
        id: 'OP-06', title: 'Error Message Leakage to Client',
        severity: 'MEDIUM', threatLevel: 2, category: 'InfoLeak',
        file: path.relative(ROOT, file), line: i + 1,
        code: line.trim().slice(0, 200),
        description: 'Internal error details sent to client. Attacker uses stack traces to map internal architecture, library versions, file paths.',
        fix: 'Return generic error messages. Log details server-side only.',
        cwe: 'CWE-209', owasp: 'A04:2021',
      });
    }
  }
});

rule((content, file) => {
  // OP-07: Prototype pollution via object merge
  scanPattern(content, file,
    /Object\.assign\s*\(\s*\{\s*\}\s*,\s*(?:body|data|req|request|params|input)/,
    {
      id: 'OP-07', title: 'Prototype Pollution via Object.assign',
      severity: 'MEDIUM', threatLevel: 2, category: 'Injection',
      description: 'Merging user input with Object.assign. Attacker sends __proto__.isAdmin = true to escalate privileges.',
      fix: 'Use Object.create(null) as target, or validate/strip __proto__ and constructor keys.',
      cwe: 'CWE-1321', owasp: 'A03:2021',
    });
});

rule((content, file) => {
  // OP-08: JWT/session in URL (leaks via referrer, logs)
  scanPattern(content, file,
    /(?:token|session|jwt|api[_-]?key)\s*[:=]\s*(?:req|request)\.(?:nextUrl\.searchParams|query)\.get/i,
    {
      id: 'OP-08', title: 'Auth Token Passed via URL Query Parameter',
      severity: 'MEDIUM', threatLevel: 2, category: 'AuthN',
      description: 'Tokens in URL leak via Referer header, browser history, proxy logs, and server access logs.',
      fix: 'Pass tokens in Authorization header or httpOnly cookies.',
      cwe: 'CWE-598', owasp: 'A07:2021',
    });
});

// ─── LEVEL 3: Skilled Attacker ───────────────────────────────────────────────
// Custom exploit development, logic bugs, race conditions

rule((content, file) => {
  // SA-01: Race condition in check-then-act pattern
  if (!file.includes('/app/api/')) return;
  // Look for findFirst/findUnique followed by create/update without transaction
  if (content.includes('findFirst') && content.includes('.create(') && !content.includes('$transaction')) {
    scanPattern(content, file,
      /(?:findFirst|findUnique).*?\.create\(/s,
      {
        id: 'SA-01', title: 'TOCTOU Race Condition — Check-Then-Act Without Transaction',
        severity: 'HIGH', threatLevel: 3, category: 'Race',
        description: 'Read-then-write without DB transaction. Attacker sends concurrent requests to bypass uniqueness checks, double-spend credits, or create duplicate records.',
        fix: 'Wrap in prisma.$transaction() or use DB-level unique constraints with upsert.',
        cwe: 'CWE-367', owasp: 'A04:2021',
      });
  }
});

rule((content, file) => {
  // SA-02: Insecure random values for security purposes
  // Suppress: UI components, demo pages, mock data, ops analytics, sampling rates
  if (file.includes('/(demo)/') || file.includes('/(app)/pipelines')) return;
  if (file.includes('/ops/analytics')) return;  // Mock analytics data
  // Skip probabilistic sampling (not security-sensitive)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/Math\.random\s*\(\s*\)/.test(line)) continue;
    if (/sample|jitter|delay|animation|shuffle|demo|mock/i.test(line)) continue;
    // Check context for non-security usage
    const ctx = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 2)).join(' ');
    if (/sampleRate|probability|percentage|display|render|color|position/i.test(ctx)) continue;
    findings.push({
      id: 'SA-02', title: 'Insecure Randomness (Math.random) for Security Context',
      severity: 'MEDIUM', threatLevel: 3, category: 'Crypto',
      file: path.relative(ROOT, file), line: i + 1,
      code: line.trim().slice(0, 200),
      description: 'Math.random() is not cryptographically secure. If used for tokens/IDs, attacker predicts next value.',
      fix: 'Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive values.',
      cwe: 'CWE-330', owasp: 'A02:2021',
    });
  }
});

rule((content, file) => {
  // SA-03: Missing rate limiting on auth endpoints
  if (!file.includes('/app/api/auth/')) return;
  if (!file.endsWith('route.ts')) return;
  if (file.includes('session') || file.includes('dev-session') || file.includes('logout')) return;
  // Endpoints returning 501 (stubs) don't need rate limiting
  if (content.includes('not_implemented') || content.includes('status: 501')) return;
  // OAuth callbacks are rate-limited by the OAuth provider
  if (file.includes('/callback/')) return;
  if (!content.includes('rateLimi') && !content.includes('requireAuth') && !content.includes('authRateLimiter') && !content.includes('loginLimiter')) {
    findings.push({
      id: 'SA-03', title: 'Auth Endpoint Without Rate Limiting',
      severity: 'HIGH', threatLevel: 3, category: 'AuthN',
      file: path.relative(ROOT, file), line: 1,
      code: '(no rate limiter on auth endpoint)',
      description: 'Auth endpoint without rate limiting. Attacker brute-forces credentials or enumerates users.',
      fix: 'Add dedicated auth rate limiter (e.g., 5 attempts/min per IP+email combo).',
      cwe: 'CWE-307', owasp: 'A07:2021',
    });
  }
});

rule((content, file) => {
  // SA-04: Timing attack on comparison
  if (!file.includes('auth') && !file.includes('security') && !file.includes('webhook') && !file.includes('hmac') && !file.includes('csrf')) return;
  // Skip client-side components (timing attacks not exploitable client-side)
  if (file.endsWith('.tsx') && content.includes("'use client'")) return;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/(?:===?\s*(?:token|secret|hash|signature|key|hmac|digest|password)|(?:token|secret|hash|signature|key|hmac|digest|password)\s*===?)/i.test(line)) continue;
    // Skip typeof checks (not secret comparisons)
    if (/typeof\s/.test(line)) continue;
    // Skip null/undefined checks
    if (/(?:null|undefined|'string'|"string")/.test(line)) continue;
    findings.push({
      id: 'SA-04', title: 'Timing Attack — Non-Constant-Time Comparison',
      severity: 'MEDIUM', threatLevel: 3, category: 'Crypto',
      file: path.relative(ROOT, file), line: i + 1,
      code: line.trim().slice(0, 200),
      description: 'String comparison on secret value leaks character-by-character via response time. Attacker recovers secret with ~256*N requests.',
      fix: 'Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)).',
      cwe: 'CWE-208', owasp: 'A02:2021',
    });
  }
});

rule((content, file) => {
  // SA-05: Type confusion in auth/role checks
  if (!file.includes('/app/api/')) return;
  scanPattern(content, file,
    /(?:role|permission|isAdmin|isSuperAdmin)\s*==\s*[^=]/,
    {
      id: 'SA-05', title: 'Type Coercion in Authorization Check',
      severity: 'HIGH', threatLevel: 3, category: 'AuthZ',
      description: 'Loose equality (==) in auth check. Attacker exploits type coercion: 0 == "" == false == null.',
      fix: 'Always use strict equality (===) for authorization checks.',
      cwe: 'CWE-843', owasp: 'A04:2021',
    });
});

rule((content, file) => {
  // SA-06: ReDoS — catastrophic backtracking regex
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const regexMatch = lines[i].match(/new RegExp\(['"]([^'"]+)['"]\)|\/([^/]+)\/[gimsuy]*/);
    if (!regexMatch) continue;
    const pattern = regexMatch[1] || regexMatch[2];
    if (!pattern) continue;
    // Detect nested quantifiers: (a+)+ or (a*)*  or (a+|b)+
    if (/\([^)]*[+*]\)[+*]/.test(pattern) || /\([^)]*\|[^)]*\)[+*]{1,2}/.test(pattern)) {
      findings.push({
        id: 'SA-06', title: 'ReDoS — Catastrophic Backtracking Pattern',
        severity: 'HIGH', threatLevel: 3, category: 'DoS',
        file: path.relative(ROOT, file), line: i + 1,
        code: lines[i].trim().slice(0, 200),
        description: `Regex has nested quantifiers that cause exponential backtracking. Attacker sends crafted input to hang the event loop.`,
        fix: 'Rewrite regex to avoid nested quantifiers. Use atomic groups or possessive quantifiers if available.',
        cwe: 'CWE-1333', owasp: 'A06:2021',
      });
    }
  }
});

rule((content, file) => {
  // SA-07: Unbounded data fetch (no pagination/limit)
  if (!file.includes('/app/api/')) return;
  scanPattern(content, file,
    /\.findMany\(\s*\{\s*where\b(?:(?!take|limit).)*\}\s*\)/s,
    {
      id: 'SA-07', title: 'Unbounded Query — No Pagination Limit',
      severity: 'MEDIUM', threatLevel: 3, category: 'DoS',
      description: 'findMany without take/limit. Attacker triggers full-table scan returning millions of rows, causing OOM or timeout.',
      fix: 'Add take: limit (max 100-500) and cursor/offset pagination.',
      cwe: 'CWE-400', owasp: 'A04:2021',
    });
});

rule((content, file) => {
  // SA-08: Improper null/undefined checks after auth
  if (!file.includes('/app/api/')) return;
  // Pattern: getServerSession returns null but check uses truthiness on nested prop
  scanPattern(content, file,
    /session\?\.\w+\s*&&/,
    {
      id: 'SA-08', title: 'Nullable Session Property Used as Authorization',
      severity: 'MEDIUM', threatLevel: 3, category: 'AuthZ',
      file: path.relative(ROOT, file),
      description: 'Optional chaining on session property for auth decision. If session is null, the entire check silently passes as falsy.',
      fix: 'Assert session existence first (requireAuth), then access properties directly.',
      cwe: 'CWE-476', owasp: 'A01:2021',
    });
});

// ─── LEVEL 4: APT ────────────────────────────────────────────────────────────
// Supply chain, deserialization, side channels, persistence

rule((content, file) => {
  // APT-01: Unsafe deserialization
  // Suppress: server-set httpOnly cookie decode (portal sessions, middleware)
  // These cookies are set by our own auth system, not user-editable
  if (file.includes('/portal/') || file.includes('middleware')) {
    if (/sessionCookie|crp_session|crp_portal_session/.test(content)) return;
  }
  scanPattern(content, file,
    /JSON\.parse\s*\(\s*(?:Buffer\.from|atob|decodeURIComponent)\s*\(/,
    {
      id: 'APT-01', title: 'Deserialization of Encoded User Input',
      severity: 'HIGH', threatLevel: 4, category: 'Injection',
      description: 'Decoding + parsing user data. If object has __proto__ or constructor, attacker achieves prototype pollution or code execution.',
      fix: 'Validate decoded data with Zod schema before use. Strip __proto__/constructor keys.',
      cwe: 'CWE-502', owasp: 'A08:2021',
    });
});

rule((content, file) => {
  // APT-02: Weak key derivation
  scanPattern(content, file,
    /createHash\s*\(\s*['"](?:sha256|sha1|md5)['"]\s*\)\.update\s*\([^)]*(?:key|secret|password)/i,
    {
      id: 'APT-02', title: 'Weak Key Derivation — Hash Instead of KDF',
      severity: 'MEDIUM', threatLevel: 4, category: 'Crypto',
      description: 'Using raw hash for key derivation instead of proper KDF. Attacker with access to ciphertext can brute-force the key faster.',
      fix: 'Use scrypt, argon2id, or PBKDF2 with high iteration count for key derivation.',
      cwe: 'CWE-916', owasp: 'A02:2021',
    });
});

rule((content, file) => {
  // APT-03: Dependency confusion / typosquatting indicators
  if (!file.endsWith('package.json')) return;
  try {
    const pkg = JSON.parse(content);
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(allDeps)) {
      // Check for git/URL dependencies (supply chain risk)
      if (typeof version === 'string' && (version.startsWith('git') || version.startsWith('http') || version.includes('github'))) {
        findings.push({
          id: 'APT-03', title: `Supply Chain Risk — Git/URL Dependency: ${name}`,
          severity: 'HIGH', threatLevel: 4, category: 'Supply Chain',
          file: path.relative(ROOT, file), line: 1,
          code: `"${name}": "${version}"`,
          description: 'Dependency installed from git URL instead of npm registry. Attacker compromises repo to inject malicious code.',
          fix: 'Publish to npm with integrity hashes. Use lockfile-lint to enforce registry-only installs.',
          cwe: 'CWE-829', owasp: 'A08:2021',
        });
      }
      // Check for wildcard versions
      if (typeof version === 'string' && (version === '*' || version === 'latest')) {
        findings.push({
          id: 'APT-03b', title: `Supply Chain Risk — Wildcard Version: ${name}`,
          severity: 'HIGH', threatLevel: 4, category: 'Supply Chain',
          file: path.relative(ROOT, file), line: 1,
          code: `"${name}": "${version}"`,
          description: 'Wildcard version allows any future version including compromised ones.',
          fix: 'Pin exact version or use caret range (^x.y.z).',
          cwe: 'CWE-829', owasp: 'A08:2021',
        });
      }
    }
  } catch { /* not valid JSON */ }
});

rule((content, file) => {
  // APT-04: Subdomain/host header injection
  if (!file.includes('/app/api/')) return;
  // Suppress: x-forwarded-for used only for IP logging (not URL construction)
  // Suppress: x-forwarded-host validated against ALLOWED_ORIGINS allowlist
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/request\.headers\.get\s*\(\s*['"](?:host|x-forwarded-host|x-forwarded-for|origin)['"]\s*\)/i.test(line)) continue;
    // x-forwarded-for for IP logging is standard practice behind load balancers
    if (/x-forwarded-for/i.test(line) && /ip\s*[:=]|clientIp|remoteIp|audit/i.test(line)) continue;
    // x-forwarded-host validated against allowlist
    if (/x-forwarded-host/i.test(line) && /ALLOWED_ORIGINS|allowlist|allowedHosts/i.test(content)) continue;
    // origin header used for CORS validation
    if (/origin/i.test(line) && /ALLOWED_ORIGINS|cors/i.test(content)) continue;
    findings.push({
      id: 'APT-04', title: 'Host Header Used in Application Logic',
      severity: 'MEDIUM', threatLevel: 4, category: 'Injection',
      file: path.relative(ROOT, file), line: i + 1,
      code: line.trim().slice(0, 200),
      description: 'Host/forwarded headers are attacker-controlled. If used for URL construction, enables cache poisoning, password reset poisoning, or SSRF.',
      fix: 'Validate against allowlist of known hosts. Never use raw Host header for redirects or URL construction.',
      cwe: 'CWE-644', owasp: 'A05:2021',
    });
  }
});

rule((content, file) => {
  // APT-05: Insecure session fixation
  scanPattern(content, file,
    /(?:set|setCookie|cookies\.set)\s*\([^)]*session[^)]*(?:req|request)\.(?:query|body|nextUrl)/i,
    {
      id: 'APT-05', title: 'Session Fixation — Session ID from User Input',
      severity: 'CRITICAL', threatLevel: 4, category: 'AuthN',
      description: 'Session ID set from user input. Attacker forces victim to use known session ID, then hijacks it.',
      fix: 'Always generate session IDs server-side with crypto.randomUUID(). Regenerate on login.',
      cwe: 'CWE-384', owasp: 'A07:2021',
    });
});

rule((content, file) => {
  // APT-06: XML External Entity (XXE) via parser
  // Suppress: files that already disable entity processing or have XXE-safe comments
  if (/processEntities\s*:\s*false/.test(content) || /XXE-safe|xxe.safe|entities.*disabled/i.test(content)) return;
  scanPattern(content, file,
    /(?:DOMParser|xml2js|parseString|XMLParser|sax\.parser|fast-xml-parser)/,
    {
      id: 'APT-06', title: 'XML Parser — Potential XXE',
      severity: 'MEDIUM', threatLevel: 4, category: 'Injection',
      description: 'XML parser detected. If external entity processing is not disabled, attacker reads local files or triggers SSRF.',
      fix: 'Disable DTD processing and external entities. For fast-xml-parser: { processEntities: false }.',
      cwe: 'CWE-611', owasp: 'A05:2021',
    });
});

rule((content, file) => {
  // APT-07: Webhook/callback URL SSRF
  if (!file.includes('/app/api/')) return;
  scanPattern(content, file,
    /(?:callbackUrl|webhookUrl|notifyUrl|endpoint)\s*(?:=|:)\s*(?:body|data)\./,
    {
      id: 'APT-07', title: 'SSRF via Webhook/Callback URL Registration',
      severity: 'HIGH', threatLevel: 4, category: 'SSRF',
      description: 'User registers callback URL. Attacker points it at internal services (metadata, DB, Redis) to exfiltrate data on every event.',
      fix: 'Validate URL with SSRF protection (block private IPs, metadata endpoints). Re-validate on each delivery.',
      cwe: 'CWE-918', owasp: 'A10:2021',
    });
});

rule((content, file) => {
  // APT-08: Insecure postMessage / CORS misconfiguration
  scanPattern(content, file,
    /Access-Control-Allow-Origin['":\s]*\*/,
    {
      id: 'APT-08', title: 'CORS Wildcard — Access-Control-Allow-Origin: *',
      severity: 'HIGH', threatLevel: 4, category: 'CORS',
      description: 'Wildcard CORS allows any origin to read API responses. If combined with credentials, attacker\'s site reads user data.',
      fix: 'Set specific allowed origins. Never use * with credentials: true.',
      cwe: 'CWE-942', owasp: 'A05:2021',
    });
});

// ─── LEVEL 5: State-Sponsored ────────────────────────────────────────────────
// Zero-day chains, cryptanalysis, covert channels, long-term persistence

rule((content, file) => {
  // SS-01: Encryption without authentication (ECB, CBC without HMAC)
  scanPattern(content, file,
    /(?:createCipheriv|createCipher)\s*\(\s*['"](?:aes-\d+-(?:ecb|cbc)|des|rc4|blowfish)/i,
    {
      id: 'SS-01', title: 'Unauthenticated Encryption Mode (ECB/CBC without HMAC)',
      severity: 'HIGH', threatLevel: 5, category: 'Crypto',
      description: 'ECB leaks patterns. CBC without HMAC enables padding oracle attacks (POODLE-like). State actor with network position decrypts data.',
      fix: 'Use AES-256-GCM (authenticated encryption). Already available in codebase — ensure all encryption paths use it.',
      cwe: 'CWE-327', owasp: 'A02:2021',
    });
});

rule((content, file) => {
  // SS-02: Hardcoded IV or nonce reuse
  scanPattern(content, file,
    /(?:createCipheriv|createDecipheriv)\s*\([^,]+,\s*[^,]+,\s*(?:Buffer\.from\s*\(\s*['"][^'"]+['"]|new Uint8Array\s*\(\s*\[)/,
    {
      id: 'SS-02', title: 'Hardcoded IV / Nonce — Encryption Catastrophe',
      severity: 'CRITICAL', threatLevel: 5, category: 'Crypto',
      description: 'Static IV/nonce with same key breaks confidentiality completely. For GCM, nonce reuse = authentication bypass + plaintext recovery.',
      fix: 'Generate random IV with crypto.randomBytes(12) for each encryption operation.',
      cwe: 'CWE-329', owasp: 'A02:2021',
    });
});

rule((content, file) => {
  // SS-03: Downgrade attack surface (HTTP fallback)
  // Suppress: GCP metadata endpoint (HTTP required), schema URIs (not fetched),
  //           documentation/comments, UI display strings
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01]))/.test(line)) continue;
    // GCP metadata endpoint — HTTP is mandatory (HTTPS not supported)
    if (/metadata\.google\.internal/.test(line)) continue;
    // Schema URIs — not fetched at runtime, just identifiers
    if (/\$schema|schema\.org|schemas\/|xmlns|doctype|DTD/i.test(line)) continue;
    // Comments and documentation
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) continue;
    // UI display strings (not actual HTTP calls)
    if (/(?:href|placeholder|label|title|description|example|docs?:)/.test(line)) continue;
    findings.push({
      id: 'SS-03', title: 'Plaintext HTTP to External Service',
      severity: 'MEDIUM', threatLevel: 5, category: 'Crypto',
      file: path.relative(ROOT, file), line: i + 1,
      code: line.trim().slice(0, 200),
      description: 'HTTP (not HTTPS) to external service. State actor with network tap reads all data in transit including tokens.',
      fix: 'Use HTTPS for all external connections. Add HSTS headers. Consider certificate pinning for critical services.',
      cwe: 'CWE-319', owasp: 'A02:2021',
    });
  }
});

rule((content, file) => {
  // SS-04: DNS rebinding surface (hostname validation bypass)
  if (!file.includes('url-validator') && !file.includes('ssrf')) return;
  if (content.includes('validateExternalUrl') || content.includes('isPrivateIp')) {
    // Check if it resolves DNS and re-checks
    if (!content.includes('dns.resolve') && !content.includes('dns.lookup') && !content.includes('getaddrinfo')) {
      findings.push({
        id: 'SS-04', title: 'DNS Rebinding — URL Validated Before Resolution',
        severity: 'MEDIUM', threatLevel: 5, category: 'SSRF',
        file: path.relative(ROOT, file), line: 1,
        code: '(URL validation without DNS re-resolution)',
        description: 'URL validated at check time, but DNS may rebind to internal IP at fetch time. State actor uses DNS rebinding to bypass SSRF protection.',
        fix: 'Resolve DNS, validate IP, then connect to the resolved IP directly (pin the resolution).',
        cwe: 'CWE-350', owasp: 'A10:2021',
      });
    }
  }
});

rule((content, file) => {
  // SS-05: Covert channel via timing (variable-time ops on secrets)
  if (!file.includes('auth') && !file.includes('security') && !file.includes('crypto')) return;
  // Check for early returns based on secret comparisons
  scanPattern(content, file,
    /if\s*\(\s*!?(?:token|secret|key|password|hash)\s*(?:!==|===|!=|==)\s*(?:null|undefined|''|""|false)\s*\)\s*(?:return|throw)/,
    {
      id: 'SS-05', title: 'Timing Side-Channel — Early Return on Secret Check',
      severity: 'LOW', threatLevel: 5, category: 'Crypto',
      description: 'Early return based on secret existence leaks whether the secret exists via response timing. Nation-state attacker with network proximity measures nanosecond differences.',
      fix: 'Perform all validation steps regardless of intermediate results. Return at a consistent point.',
      cwe: 'CWE-208', owasp: 'A02:2021',
    });
});

rule((content, file) => {
  // SS-06: Audit log integrity (tampering detection)
  if (!file.includes('audit') && !file.includes('log')) return;
  scanPattern(content, file,
    /(?:auditLog|audit_log|AuditLog).*(?:delete|update|remove|truncate)/i,
    {
      id: 'SS-06', title: 'Audit Log Modification Capability',
      severity: 'HIGH', threatLevel: 5, category: 'Integrity',
      description: 'Code that can modify/delete audit logs. APT with DB access covers tracks by tampering with logs.',
      fix: 'Audit logs should be append-only. Use hash chains or forward to immutable external SIEM.',
      cwe: 'CWE-779', owasp: 'A09:2021',
    });
});

rule((content, file) => {
  // SS-07: Env var / config injection via shared hosting
  scanPattern(content, file,
    /process\.env\[\s*(?:body|data|params|query|req)/,
    {
      id: 'SS-07', title: 'Dynamic Environment Variable Access from User Input',
      severity: 'CRITICAL', threatLevel: 5, category: 'Injection',
      description: 'User input used as env var name. Attacker reads DATABASE_URL, STRIPE_SECRET_KEY, or any secret in environment.',
      fix: 'Never use user input to access process.env. Use a static allowlist of config keys.',
      cwe: 'CWE-15', owasp: 'A05:2021',
    });
});

// ─── Cross-cutting: Dependency Audit ─────────────────────────────────────────

async function auditDependencies() {
  try {
    const result = execSync('npm audit --json 2>/dev/null', { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 }).toString();
    const audit = JSON.parse(result);
    if (audit.vulnerabilities) {
      for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
        const sev = /** @type {string} */ (vuln.severity);
        const severity = sev === 'critical' ? 'CRITICAL' : sev === 'high' ? 'HIGH' : sev === 'moderate' ? 'MEDIUM' : 'LOW';
        findings.push({
          id: 'DEP-01',
          title: `Vulnerable Dependency: ${name} (${sev})`,
          severity,
          threatLevel: severity === 'CRITICAL' ? 1 : severity === 'HIGH' ? 2 : 3,
          category: 'Supply Chain',
          file: 'package-lock.json',
          line: 0,
          code: `${name}@${vuln.range || 'unknown'} — ${vuln.via?.[0]?.title || vuln.via?.[0] || 'see npm audit'}`,
          description: `Known vulnerability in ${name}. Automated scanners and bots exploit known CVEs in dependencies.`,
          fix: vuln.fixAvailable ? `Run: npm audit fix or upgrade ${name}` : 'No fix available — evaluate if vulnerable code path is reachable.',
          cwe: vuln.via?.[0]?.cwe?.[0] || 'CWE-1035',
          owasp: 'A06:2021',
        });
      }
    }
  } catch {
    // npm audit returns non-zero exit on findings — parse stderr
    try {
      const result = execSync('npm audit --json 2>&1 || true', { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 }).toString();
      const audit = JSON.parse(result);
      if (audit.vulnerabilities) {
        const count = Object.keys(audit.vulnerabilities).length;
        if (count > 0) {
          findings.push({
            id: 'DEP-00',
            title: `${count} Vulnerable Dependencies Found (run npm audit for details)`,
            severity: 'HIGH', threatLevel: 1, category: 'Supply Chain',
            file: 'package-lock.json', line: 0,
            code: `${count} vulnerabilities detected`,
            description: 'npm audit found known vulnerabilities in dependencies.',
            fix: 'Run npm audit fix. Review unfixable vulnerabilities for reachability.',
            cwe: 'CWE-1035', owasp: 'A06:2021',
          });
        }
      }
    } catch { /* truly no npm audit available */ }
  }
}

// ─── Cross-cutting: Secrets in Git History ───────────────────────────────────

function scanGitSecrets() {
  try {
    // Check for .env files committed
    const tracked = execSync('git ls-files 2>/dev/null', { cwd: ROOT }).toString();
    const envFiles = tracked.split('\n').filter(f => /\.env(?:\.|$)/.test(f) && !f.endsWith('.example') && !f.endsWith('.template'));
    for (const envFile of envFiles) {
      if (!envFile) continue;
      findings.push({
        id: 'GIT-01', title: `Secret File Tracked in Git: ${envFile}`,
        severity: 'CRITICAL', threatLevel: 1, category: 'Secrets',
        file: envFile, line: 0,
        code: `${envFile} is tracked in git history`,
        description: 'Environment file with secrets committed to git. Even after .gitignore, it persists in history.',
        fix: 'Remove from git: git rm --cached <file>. Rotate all secrets in the file. Use git-filter-repo to purge from history.',
        cwe: 'CWE-538', owasp: 'A07:2021',
      });
    }

    // Check for large files that might be binaries with embedded secrets
    const largeBlobs = execSync('git ls-files -z 2>/dev/null | xargs -0 ls -la 2>/dev/null | awk \'$5 > 1048576 {print $NF}\' || true', { cwd: ROOT }).toString().trim();
    if (largeBlobs) {
      for (const blob of largeBlobs.split('\n').filter(Boolean)) {
        findings.push({
          id: 'GIT-02', title: `Large File in Git (>1MB): ${blob}`,
          severity: 'LOW', threatLevel: 4, category: 'InfoLeak',
          file: blob, line: 0,
          code: `Large file may contain embedded secrets or sensitive data`,
          description: 'Large files in git may contain embedded credentials, certificates, or sensitive data.',
          fix: 'Review file contents. Use git-lfs for legitimate large files.',
          cwe: 'CWE-538', owasp: 'A07:2021',
        });
      }
    }
  } catch { /* git not available */ }
}

// ─── Cross-cutting: Infrastructure Security ──────────────────────────────────

function scanInfrastructure() {
  // Check Dockerfile for security issues
  const dockerfilePath = path.join(ROOT, 'deploy/Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');

    if (dockerfile.includes('FROM') && !dockerfile.includes('USER') && !dockerfile.includes('user ')) {
      findings.push({
        id: 'INFRA-01', title: 'Docker Container Runs as Root',
        severity: 'HIGH', threatLevel: 2, category: 'Container',
        file: 'deploy/Dockerfile', line: 1,
        code: '(no USER directive found)',
        description: 'Container runs as root. Container escape gives attacker root on the host.',
        fix: 'Add USER directive: RUN adduser --disabled-password appuser && USER appuser',
        cwe: 'CWE-250', owasp: 'A05:2021',
      });
    }

    if (/COPY\s+\.env/.test(dockerfile)) {
      findings.push({
        id: 'INFRA-02', title: 'Secrets Baked into Docker Image',
        severity: 'CRITICAL', threatLevel: 1, category: 'Secrets',
        file: 'deploy/Dockerfile', line: 1,
        code: 'COPY .env into image',
        description: '.env file copied into Docker image. Anyone with image access reads all secrets.',
        fix: 'Use runtime environment variables or Secret Manager. Never COPY .env into images.',
        cwe: 'CWE-798', owasp: 'A07:2021',
      });
    }
  }

  // Check Terraform for security issues
  const tfDir = path.join(ROOT, 'deploy/terraform');
  if (fs.existsSync(tfDir)) {
    for (const tfFile of fs.readdirSync(tfDir).filter(f => f.endsWith('.tf'))) {
      const content = fs.readFileSync(path.join(tfDir, tfFile), 'utf-8');

      if (content.includes('0.0.0.0/0') && !content.includes('Cloud Armor') && !content.includes('WAF')) {
        findings.push({
          id: 'INFRA-03', title: `Wide-Open Firewall Rule in ${tfFile}`,
          severity: 'MEDIUM', threatLevel: 2, category: 'Network',
          file: `deploy/terraform/${tfFile}`, line: 1,
          code: '0.0.0.0/0 ingress without WAF',
          description: 'Network rule allows traffic from any IP. Without WAF, attacker directly reaches services.',
          fix: 'Ensure Cloud Armor WAF is in front of all public-facing endpoints.',
          cwe: 'CWE-284', owasp: 'A01:2021',
        });
      }

      if (/deletion_protection\s*=\s*false/.test(content)) {
        findings.push({
          id: 'INFRA-04', title: `Deletion Protection Disabled in ${tfFile}`,
          severity: 'MEDIUM', threatLevel: 3, category: 'Integrity',
          file: `deploy/terraform/${tfFile}`, line: 1,
          code: 'deletion_protection = false',
          description: 'Database or resource deletion protection is off. Compromised CI/CD or admin account can destroy data.',
          fix: 'Set deletion_protection = true for production databases.',
          cwe: 'CWE-693', owasp: 'A05:2021',
        });
      }
    }
  }
}

// ─── Cross-cutting: Middleware/CSP/Headers ────────────────────────────────────

function scanMiddleware() {
  const mwPath = path.join(ROOT, 'apps/web/middleware.ts');
  if (!fs.existsSync(mwPath)) {
    findings.push({
      id: 'MW-01', title: 'No Middleware File Found',
      severity: 'HIGH', threatLevel: 2, category: 'Config',
      file: 'apps/web/middleware.ts', line: 0,
      code: '(file not found)',
      description: 'No Next.js middleware. Auth checks, CSP headers, and rate limiting may be bypassed.',
      fix: 'Create middleware.ts with auth validation and security headers.',
      cwe: 'CWE-284', owasp: 'A01:2021',
    });
    return;
  }

  const mw = fs.readFileSync(mwPath, 'utf-8');

  if (!mw.includes('Content-Security-Policy') && !mw.includes('content-security-policy') && !mw.includes('csp')) {
    findings.push({
      id: 'MW-02', title: 'No Content-Security-Policy Header',
      severity: 'MEDIUM', threatLevel: 2, category: 'XSS',
      file: 'apps/web/middleware.ts', line: 1,
      code: '(no CSP header found)',
      description: 'No CSP header. XSS payloads can load external scripts, exfiltrate data to attacker servers.',
      fix: "Add Content-Security-Policy header with restrictive default-src 'self'.",
      cwe: 'CWE-1021', owasp: 'A05:2021',
    });
  }

  if (!mw.includes('X-Frame-Options') && !mw.includes('x-frame-options') && !mw.includes('frame-ancestors')) {
    findings.push({
      id: 'MW-03', title: 'No Clickjacking Protection',
      severity: 'MEDIUM', threatLevel: 2, category: 'UI',
      file: 'apps/web/middleware.ts', line: 1,
      code: '(no X-Frame-Options or frame-ancestors)',
      description: 'No clickjacking protection. Attacker iframes your app and tricks users into clicking hidden buttons.',
      fix: "Add X-Frame-Options: DENY or CSP frame-ancestors 'none'.",
      cwe: 'CWE-1021', owasp: 'A05:2021',
    });
  }
}

// ─── Cross-cutting: .env.example audit ───────────────────────────────────────

function scanEnvExample() {
  const envExample = path.join(ROOT, '.env.example');
  if (!fs.existsSync(envExample)) return;
  const content = fs.readFileSync(envExample, 'utf-8');

  // Check for real-looking values in example
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#') || !line.includes('=')) continue;
    const value = line.split('=').slice(1).join('=').trim();
    // Check for real API keys, tokens, URLs with credentials
    if (/^(?:sk-|pk_|rk_|whsec_|AIza|AKIA|ghp_|gho_)/.test(value)) {
      findings.push({
        id: 'ENV-01', title: 'Real Secret in .env.example',
        severity: 'CRITICAL', threatLevel: 1, category: 'Secrets',
        file: '.env.example', line: i + 1,
        code: line.replace(/=.*/, '=<REDACTED>'),
        description: 'Real API key or secret in .env.example. This file is committed and public.',
        fix: 'Replace with placeholder values (e.g., sk-your-key-here).',
        cwe: 'CWE-798', owasp: 'A07:2021',
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();

  console.log('\n' + '═'.repeat(72));
  console.log('  CVERiskPilot — Offensive Security Scanner');
  console.log('  Threat Model: Script Kiddie → APT → State-Sponsored');
  console.log('═'.repeat(72) + '\n');

  // Gather files
  const files = getAllFiles();
  console.log(`  Scanning ${files.length} files across ${SCAN_DIRS.length} directories...`);
  console.log(`  Rules: ${rules.length} code patterns + 4 cross-cutting checks\n`);

  // Run code rules
  for (const file of files) {
    filesScanned++;
    const content = fs.readFileSync(file, 'utf-8');
    for (const ruleFn of rules) {
      rulesExecuted++;
      try {
        ruleFn(content, file);
      } catch (e) {
        // Rule error — don't crash the scan
      }
    }
  }

  // Run cross-cutting scans
  console.log('  Running dependency audit...');
  await auditDependencies();
  console.log('  Scanning git for leaked secrets...');
  scanGitSecrets();
  console.log('  Checking infrastructure config...');
  scanInfrastructure();
  console.log('  Auditing middleware & headers...');
  scanMiddleware();
  console.log('  Checking .env.example...');
  scanEnvExample();

  // Filter by minimum threat level
  const filtered = findings.filter(f => f.threatLevel >= MIN_LEVEL);

  // Deduplicate (same id + same file)
  const seen = new Set();
  const deduped = filtered.filter(f => {
    const key = `${f.id}:${f.file}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: severity (CRITICAL > HIGH > MEDIUM > LOW > INFO), then threat level desc
  const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  deduped.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || b.threatLevel - a.threatLevel);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ─── Output ──────────────────────────────────────────────────────────────

  if (JSON_OUTPUT) {
    const report = {
      scanner: 'CVERiskPilot Security Scanner',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      scan_duration_seconds: parseFloat(elapsed),
      files_scanned: filesScanned,
      rules_executed: rulesExecuted,
      total_findings: deduped.length,
      summary: {
        CRITICAL: deduped.filter(f => f.severity === 'CRITICAL').length,
        HIGH: deduped.filter(f => f.severity === 'HIGH').length,
        MEDIUM: deduped.filter(f => f.severity === 'MEDIUM').length,
        LOW: deduped.filter(f => f.severity === 'LOW').length,
        INFO: deduped.filter(f => f.severity === 'INFO').length,
      },
      threat_level_breakdown: {
        'Level 1 — Script Kiddie': deduped.filter(f => f.threatLevel === 1).length,
        'Level 2 — Opportunistic': deduped.filter(f => f.threatLevel === 2).length,
        'Level 3 — Skilled Attacker': deduped.filter(f => f.threatLevel === 3).length,
        'Level 4 — APT': deduped.filter(f => f.threatLevel === 4).length,
        'Level 5 — State-Sponsored': deduped.filter(f => f.threatLevel === 5).length,
      },
      findings: deduped,
    };

    const outFile = path.join(REPORT_DIR, `security-scan-${TIMESTAMP}.json`);
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`\n  Report saved: ${outFile}`);
    process.stdout.write(JSON.stringify(report, null, 2));
  } else {
    // Console output
    console.log('\n' + '─'.repeat(72));
    console.log(`  SCAN COMPLETE — ${elapsed}s | ${filesScanned} files | ${rulesExecuted} rule checks`);
    console.log('─'.repeat(72));

    const counts = {
      CRITICAL: deduped.filter(f => f.severity === 'CRITICAL').length,
      HIGH: deduped.filter(f => f.severity === 'HIGH').length,
      MEDIUM: deduped.filter(f => f.severity === 'MEDIUM').length,
      LOW: deduped.filter(f => f.severity === 'LOW').length,
    };

    console.log(`\n  CRITICAL: ${counts.CRITICAL}  |  HIGH: ${counts.HIGH}  |  MEDIUM: ${counts.MEDIUM}  |  LOW: ${counts.LOW}`);
    console.log(`  Total: ${deduped.length} findings\n`);

    // Group by threat level
    const levels = [
      [1, 'LEVEL 1 — Script Kiddie (automated tools, public exploits)'],
      [2, 'LEVEL 2 — Opportunistic (manual recon, known CVE chains)'],
      [3, 'LEVEL 3 — Skilled Attacker (custom exploits, logic bugs)'],
      [4, 'LEVEL 4 — APT (supply chain, timing, side-channel)'],
      [5, 'LEVEL 5 — State-Sponsored (zero-day chains, cryptanalysis)'],
    ];

    for (const [level, label] of levels) {
      const levelFindings = deduped.filter(f => f.threatLevel === level);
      if (levelFindings.length === 0) continue;

      console.log('\n' + '═'.repeat(72));
      console.log(`  ${label}`);
      console.log('═'.repeat(72));

      for (const f of levelFindings) {
        const sev = f.severity.padEnd(8);
        const color = f.severity === 'CRITICAL' ? '\x1b[91m' : f.severity === 'HIGH' ? '\x1b[93m' : f.severity === 'MEDIUM' ? '\x1b[33m' : '\x1b[90m';
        const reset = '\x1b[0m';

        console.log(`\n  ${color}[${sev}]${reset} ${f.id}: ${f.title}`);
        console.log(`  ${f.file}:${f.line}`);
        console.log(`  > ${f.code}`);
        if (f.cwe) console.log(`  ${f.cwe} | ${f.owasp || ''}`);

        if (SHOW_FIX && f.fix) {
          console.log(`  FIX: ${f.fix}`);
        }
      }
    }

    // Save report
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const outFile = path.join(REPORT_DIR, `security-scan-${TIMESTAMP}.json`);
    const report = {
      scanner: 'CVERiskPilot Security Scanner',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      scan_duration_seconds: parseFloat(elapsed),
      files_scanned: filesScanned,
      rules_executed: rulesExecuted,
      total_findings: deduped.length,
      findings: deduped,
    };
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('\n' + '─'.repeat(72));
    console.log(`  Report saved: ${path.relative(ROOT, outFile)}`);
    console.log('─'.repeat(72) + '\n');
  }

  // Exit code: non-zero if any CRITICAL findings
  const criticals = deduped.filter(f => f.severity === 'CRITICAL');
  if (criticals.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Scanner error:', err);
  process.exit(2);
});
