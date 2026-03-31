/**
 * API Route Security Scanner
 *
 * Static analysis scanner for Next.js API routes that detects common
 * security vulnerabilities: missing auth, missing RBAC, missing CSRF,
 * missing org scoping, mass assignment, info disclosure, and more.
 *
 * Maps findings to OWASP Top 10, NIST 800-53, and CWE IDs.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CanonicalFinding } from '../vendor/parsers/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiSecurityRule {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cweIds: string[];
  nistControls: string[];
  owaspCategory: string;
  description: string;
  check: (content: string, filePath: string, httpMethod: string) => ApiSecurityViolation[];
}

export interface ApiSecurityViolation {
  ruleId: string;
  filePath: string;
  lineNumber: number;
  httpMethod: string;
  detail: string;
  verdict?: 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'NEEDS_REVIEW';
  verdictReason?: string;
}

export interface ApiSecurityScanResult {
  findings: CanonicalFinding[];
  violations: ApiSecurityViolation[];
  routesScanned: number;
  rulesPassed: number;
  rulesFailed: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** Find line number of first match */
function findLine(content: string, pattern: RegExp | string): number {
  const lines = content.split('\n');
  const re = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : pattern;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i]!)) return i + 1;
  }
  return 1;
}

/** Detect which HTTP methods are exported from a route file */
function detectHttpMethods(content: string): string[] {
  const methods: string[] = [];
  if (/export\s+(?:async\s+)?function\s+GET\b/.test(content)) methods.push('GET');
  if (/export\s+(?:async\s+)?function\s+POST\b/.test(content)) methods.push('POST');
  if (/export\s+(?:async\s+)?function\s+PUT\b/.test(content)) methods.push('PUT');
  if (/export\s+(?:async\s+)?function\s+PATCH\b/.test(content)) methods.push('PATCH');
  if (/export\s+(?:async\s+)?function\s+DELETE\b/.test(content)) methods.push('DELETE');
  return methods;
}

/** Check if a route is a webhook/public endpoint (no session auth expected) */
function isPublicRoute(filePath: string, content: string): boolean {
  const publicIndicators = [
    /webhook/i,
    /\/api\/billing\/webhook/,
    /\/api\/auth\//,
    /\/api\/cron\//,
    /\/api\/health/,
    /\/api\/export\/compliance-whitepaper/,
    /\/api\/scim\//,
    /\/api\/pipeline\/scan/,
    /verifyWebhookSignature/,
    /CRON_SECRET/,
    /timingSafeEqual/,
    /getLoginLimiter|getSignupLimiter/,
  ];
  return publicIndicators.some((re) => re.test(filePath) || re.test(content));
}

/** Check if route is behind API-key auth instead of session auth */
function hasApiKeyAuth(content: string): boolean {
  // Direct use of validateApiKey helper (hashing happens inside the function)
  if (/validateApiKey\s*\(/.test(content)) return true;
  // Manual API key auth pattern (Bearer + hash lookup)
  return /Bearer.*token|apiKey|api_key|Authorization.*Bearer/.test(content) &&
    /sha256|hash|findFirst.*key/.test(content);
}

// ---------------------------------------------------------------------------
// Security Rules
// ---------------------------------------------------------------------------

const rules: ApiSecurityRule[] = [
  // ---- AUTH ----
  {
    id: 'API-AUTH-001',
    title: 'Missing Authentication on API Route',
    severity: 'CRITICAL',
    cweIds: ['CWE-306'],
    nistControls: ['AC-3', 'IA-2'],
    owaspCategory: 'A07:2021 – Identification and Authentication Failures',
    description: 'API route handler does not call requireAuth() or equivalent authentication check.',
    check(content, filePath, httpMethod) {
      if (isPublicRoute(filePath, content)) return [];
      if (hasApiKeyAuth(content)) return [];
      if (httpMethod === 'GET' && /\/api\/health/.test(filePath)) return [];

      const methodRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${httpMethod}\\b`);
      if (!methodRegex.test(content)) return [];

      // Extract the function body for this method
      const hasAuth = /requireAuth\s*\(/.test(content);
      if (hasAuth) return [];

      // If the route has an explicit comment indicating it's intentionally public, downgrade
      // (these routes aren't in the isPublicRoute() list but are documented as public)
      const hasPublicComment = /\/\*\*[\s\S]*?(?:no\s+auth\s+required|public\s+endpoint|public\s+route|unauthenticated)[\s\S]*?\*\/|\/\/\s*(?:no\s+auth\s+required|public\b)/i.test(content);
      if (hasPublicComment) {
        return [{
          ruleId: 'API-AUTH-001',
          filePath,
          lineNumber: findLine(content, methodRegex),
          httpMethod,
          detail: `${httpMethod} handler missing requireAuth() but has public/no-auth comment — verify intentional`,
          verdict: 'NEEDS_REVIEW',
          verdictReason: 'Route has explicit public/no-auth comment — likely intentionally unauthenticated',
        }];
      }

      return [{
        ruleId: 'API-AUTH-001',
        filePath,
        lineNumber: findLine(content, methodRegex),
        httpMethod,
        detail: `${httpMethod} handler missing requireAuth() call — unauthenticated access possible`,
      }];
    },
  },

  // ---- RBAC ----
  {
    id: 'API-RBAC-001',
    title: 'Missing Role Check on Mutation Endpoint',
    severity: 'HIGH',
    cweIds: ['CWE-862'],
    nistControls: ['AC-3', 'AC-6'],
    owaspCategory: 'A01:2021 – Broken Access Control',
    description: 'State-changing API handler (POST/PUT/PATCH/DELETE) has auth but no role-based access control check.',
    check(content, filePath, httpMethod) {
      if (!MUTATION_METHODS.includes(httpMethod)) return [];
      if (isPublicRoute(filePath, content)) return [];
      if (!(/requireAuth/.test(content))) return [];

      const methodRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${httpMethod}\\b`);
      if (!methodRegex.test(content)) return [];

      // Detect role checks: requireRole(), inline role comparisons, ADMIN check
      const hasRbac = /requireRole\s*\(|session\.role\s*[!=]==?\s*['"]|PLATFORM_ADMIN|ADMIN_ROLES|MANAGE_ROLES|WRITE_ROLES|APPROVER_ROLES/.test(content);
      if (hasRbac) return [];

      return [{
        ruleId: 'API-RBAC-001',
        filePath,
        lineNumber: findLine(content, methodRegex),
        httpMethod,
        detail: `${httpMethod} handler has auth but no requireRole() — any authenticated user can mutate`,
      }];
    },
  },

  // ---- CSRF ----
  {
    id: 'API-CSRF-001',
    title: 'Missing CSRF Protection on State-Changing Endpoint',
    severity: 'HIGH',
    cweIds: ['CWE-352'],
    nistControls: ['SC-23', 'SI-10'],
    owaspCategory: 'A01:2021 – Broken Access Control',
    description: 'State-changing endpoint missing checkCsrf() call, vulnerable to cross-site request forgery.',
    check(content, filePath, httpMethod) {
      if (!MUTATION_METHODS.includes(httpMethod)) return [];
      if (isPublicRoute(filePath, content)) return [];
      if (hasApiKeyAuth(content)) return [];
      if (!(/requireAuth/.test(content))) return [];

      const methodRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${httpMethod}\\b`);
      if (!methodRegex.test(content)) return [];

      const hasCsrf = /checkCsrf\s*\(/.test(content);
      if (hasCsrf) return [];

      return [{
        ruleId: 'API-CSRF-001',
        filePath,
        lineNumber: findLine(content, methodRegex),
        httpMethod,
        detail: `${httpMethod} handler missing checkCsrf() — vulnerable to CSRF attacks`,
      }];
    },
  },

  // ---- ORG SCOPING ----
  {
    id: 'API-TENANT-001',
    title: 'Missing Organization Scoping on Data Access',
    severity: 'CRITICAL',
    cweIds: ['CWE-639'],
    nistControls: ['AC-3', 'AC-4'],
    owaspCategory: 'A01:2021 – Broken Access Control',
    description: 'Database query does not include organizationId from session, enabling cross-tenant data access.',
    check(content, filePath, httpMethod) {
      if (isPublicRoute(filePath, content)) return [];
      // Internal staff ops routes intentionally access cross-org data (gated by @cveriskpilot.com domain auth)
      if (/\/api\/ops\//.test(filePath)) return [];
      if (!(/prisma\.\w+\.find|prisma\.\w+\.update|prisma\.\w+\.delete/.test(content))) return [];

      const methodRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${httpMethod}\\b`);
      if (!methodRegex.test(content)) return [];

      // Check for org scoping patterns (dot access, destructuring, or local variable)
      const hasOrgScope = /session\.organizationId|\{\s*organizationId\s*\}\s*=\s*session|resolveClientScope|orgId|onboardTenant|const organizationId\s*=/.test(content);
      if (hasOrgScope) return [];

      // Check for org scoping via a variable that contains organizationId used in where clauses
      // e.g., const orgFilter = { organizationId ... } then prisma.model.findMany({ where: orgFilter })
      const orgFilterVarMatch = content.match(/const\s+(\w+(?:Filter|Scope|Where|Condition)\w*)\s*=\s*\{[^}]*organizationId/);
      if (orgFilterVarMatch) {
        const varName = orgFilterVarMatch[1]!;
        // Verify the variable is used in a where clause
        const whereUsage = new RegExp(`where\\s*:\\s*(?:\\{[^}]*\\.\\.\\.\\s*${varName}|${varName}\\b)`);
        if (whereUsage.test(content)) return [];
      }

      // Cross-org aggregate queries (e.g., billing counts) are intentional
      if (/organization\.count|organization\.aggregate|organization\.groupBy/.test(content)) return [];

      return [{
        ruleId: 'API-TENANT-001',
        filePath,
        lineNumber: findLine(content, /prisma\.\w+\.find/),
        httpMethod,
        detail: `Database query may not be scoped to session.organizationId — cross-tenant data access risk`,
      }];
    },
  },

  // ---- MASS ASSIGNMENT ----
  {
    id: 'API-MASS-001',
    title: 'Potential Mass Assignment via Spread Operator',
    severity: 'HIGH',
    cweIds: ['CWE-915'],
    nistControls: ['AC-3', 'SI-10'],
    owaspCategory: 'A08:2021 – Software and Data Integrity Failures',
    description: 'Request body spread directly into Prisma create/update — attacker may set unintended fields.',
    check(content, filePath, httpMethod) {
      if (!MUTATION_METHODS.includes(httpMethod)) return [];

      // Detect: prisma.model.create({ data: { ...body } }) or prisma.model.update({ data: body })
      const spreadPattern = /(?:create|update)\s*\(\s*\{[\s\S]*?data\s*:\s*(?:\{\s*\.\.\.(?:body|req|data)|body\b)/;
      if (!spreadPattern.test(content)) return [];

      return [{
        ruleId: 'API-MASS-001',
        filePath,
        lineNumber: findLine(content, spreadPattern),
        httpMethod,
        detail: `Request body spread into Prisma data — potential mass assignment vulnerability`,
      }];
    },
  },

  // ---- RATE LIMITING ----
  {
    id: 'API-RATE-001',
    title: 'Missing Rate Limiting on Sensitive Endpoint',
    severity: 'MEDIUM',
    cweIds: ['CWE-770'],
    nistControls: ['SC-5', 'SI-10'],
    owaspCategory: 'A04:2021 – Insecure Design',
    description: 'Sensitive endpoint (auth, AI, export, key management) lacks rate limiting.',
    check(content, filePath, httpMethod) {
      if (!MUTATION_METHODS.includes(httpMethod)) return [];

      // Only flag sensitive endpoints
      const sensitivePatterns = [
        /\/api\/auth\//,
        /\/api\/ai\//,
        /\/api\/export\//,
        /\/api\/keys\//,
        /\/api\/admin\//,
      ];
      const isSensitive = sensitivePatterns.some((re) => re.test(filePath));
      if (!isSensitive) return [];

      const hasRateLimit = /getLimiter|getLoginLimiter|getExportLimiter|getSensitiveWriteLimiter|checkAuthRateLimit|limiter\.check/.test(content);
      if (hasRateLimit) return [];

      return [{
        ruleId: 'API-RATE-001',
        filePath,
        lineNumber: findLine(content, new RegExp(`function\\s+${httpMethod}`)),
        httpMethod,
        detail: `Sensitive endpoint lacks rate limiting — vulnerable to brute force/abuse`,
      }];
    },
  },

  // ---- INPUT VALIDATION ----
  {
    id: 'API-INPUT-001',
    title: 'Missing Input Validation on Request Body',
    severity: 'MEDIUM',
    cweIds: ['CWE-20'],
    nistControls: ['SI-10'],
    owaspCategory: 'A03:2021 – Injection',
    description: 'POST/PUT handler reads request.json() without validating required fields.',
    check(content, filePath, httpMethod) {
      if (!MUTATION_METHODS.includes(httpMethod)) return [];
      if (isPublicRoute(filePath, content)) return [];

      const readsBody = /request\.json\(\)|await\s+request\.json\(\)/.test(content);
      if (!readsBody) return [];

      // Check for any validation pattern
      const hasValidation = /if\s*\(\s*!(?:body|data)\.|typeof\s+\w+\s*[!=]==|\.length\s*[<>=]|Zod|\.parse\(|\.safeParse\(|status:\s*400|\.includes\(|\.has\(|Array\.isArray/.test(content);
      if (hasValidation) return [];

      return [{
        ruleId: 'API-INPUT-001',
        filePath,
        lineNumber: findLine(content, /request\.json\(\)/),
        httpMethod,
        detail: `Request body read without input validation — potential injection or type confusion`,
      }];
    },
  },

  // ---- INFO DISCLOSURE ----
  {
    id: 'API-DISC-001',
    title: 'Error Response May Leak Internal Details',
    severity: 'LOW',
    cweIds: ['CWE-209'],
    nistControls: ['SI-11'],
    owaspCategory: 'A05:2021 – Security Misconfiguration',
    description: 'Error handler includes error message or stack trace in HTTP response.',
    check(content, filePath, httpMethod) {
      // Check for error.message or error.stack in response
      const leakPattern = /(?:error\.message|error\.stack|err\.message|err\.stack).*(?:json|Response)/;
      if (!leakPattern.test(content)) return [];

      return [{
        ruleId: 'API-DISC-001',
        filePath,
        lineNumber: findLine(content, leakPattern),
        httpMethod,
        detail: `Error response may include internal error details — information disclosure risk`,
      }];
    },
  },

  // ---- SSRF ----
  {
    id: 'API-SSRF-001',
    title: 'External URL Fetch Without SSRF Validation',
    severity: 'HIGH',
    cweIds: ['CWE-918'],
    nistControls: ['SC-7', 'SI-10'],
    owaspCategory: 'A10:2021 – Server-Side Request Forgery',
    description: 'User-supplied URL passed to fetch/http without SSRF validation.',
    check(content, filePath, httpMethod) {
      // Detect fetch() or http.get() with user-controlled URLs
      const hasFetch = /fetch\s*\(|https?\.get\s*\(|https?\.request\s*\(|axios\.\w+\s*\(/.test(content);
      if (!hasFetch) return [];

      // Check if URL comes from user input (request body, params, query)
      const hasUserUrl = /(?:body|params|query|data)\.\w*(?:url|endpoint|host|target|callback)/i.test(content);
      if (!hasUserUrl) return [];

      // Check for SSRF protection
      const hasSsrfProtection = /validateExternalUrl|validateUrl|isAllowedUrl|allowedHosts/.test(content);
      if (hasSsrfProtection) return [];

      return [{
        ruleId: 'API-SSRF-001',
        filePath,
        lineNumber: findLine(content, /fetch\s*\(/),
        httpMethod,
        detail: `User-supplied URL passed to fetch() without SSRF validation`,
      }];
    },
  },

  // ---- SQL/PRISMA INJECTION ----
  {
    id: 'API-INJ-001',
    title: 'Raw SQL Query or Dynamic Prisma Query',
    severity: 'CRITICAL',
    cweIds: ['CWE-89'],
    nistControls: ['SI-10'],
    owaspCategory: 'A03:2021 – Injection',
    description: 'Raw SQL query ($queryRaw, $executeRaw) or dynamic field names in Prisma query.',
    check(content, filePath, httpMethod) {
      const rawSqlPattern = /\$queryRaw|\$executeRaw|\$queryRawUnsafe|\$executeRawUnsafe/;
      if (!rawSqlPattern.test(content)) return [];

      // Check if the raw query uses template literals (safe) vs string concat (unsafe)
      const unsafePattern = /\$(?:query|execute)RawUnsafe/;
      if (unsafePattern.test(content)) {
        return [{
          ruleId: 'API-INJ-001',
          filePath,
          lineNumber: findLine(content, unsafePattern),
          httpMethod,
          detail: `Unsafe raw SQL query detected — SQL injection risk`,
        }];
      }

      return [];
    },
  },
];

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

function findRouteFiles(dir: string): string[] {
  const routeFiles: string[] = [];

  function walk(currentDir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .next, etc.
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'route.ts') {
        routeFiles.push(fullPath);
      }
    }
  }

  // Look for app/api directory
  const apiDir = path.join(dir, 'app', 'api');
  if (fs.existsSync(apiDir)) {
    walk(apiDir);
  }

  // Also check apps/web/app/api in monorepos
  const monoApiDir = path.join(dir, 'apps', 'web', 'app', 'api');
  if (fs.existsSync(monoApiDir) && monoApiDir !== apiDir) {
    walk(monoApiDir);
  }

  return routeFiles;
}

/**
 * Scan API routes for security vulnerabilities.
 */
export async function scanApiSecurity(
  dir: string,
): Promise<ApiSecurityScanResult> {
  const routeFiles = findRouteFiles(dir);
  const violations: ApiSecurityViolation[] = [];
  const ruleResults = new Set<string>();

  for (const filePath of routeFiles) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const methods = detectHttpMethods(content);

    for (const method of methods) {
      for (const rule of rules) {
        const ruleViolations = rule.check(content, filePath, method);
        if (ruleViolations.length > 0) {
          violations.push(...ruleViolations);
          ruleResults.add(`${rule.id}:fail`);
        } else {
          ruleResults.add(`${rule.id}:pass`);
        }
      }
    }
  }

  // Deduplicate: count unique rules that failed vs passed
  const failedRules = new Set<string>();
  const passedRules = new Set<string>();
  for (const result of ruleResults) {
    const [ruleId, status] = result.split(':');
    if (status === 'fail') failedRules.add(ruleId!);
    else passedRules.add(ruleId!);
  }
  // Remove from passed if also in failed
  for (const id of failedRules) passedRules.delete(id);

  // Convert violations to CanonicalFindings
  const findings: CanonicalFinding[] = violations.map((v) => {
    const rule = rules.find((r) => r.id === v.ruleId)!;
    const relativePath = path.relative(dir, v.filePath);

    return {
      title: rule.title,
      description: v.detail,
      cveIds: [],
      cweIds: rule.cweIds,
      severity: rule.severity,
      scannerType: 'api-security',
      scannerName: 'CVERiskPilot API Security Scanner',
      filePath: relativePath,
      lineNumber: v.lineNumber,
      assetName: relativePath,
      rawObservations: { ruleId: v.ruleId, httpMethod: v.httpMethod },
      discoveredAt: new Date(),
      recommendation: `Fix ${rule.owaspCategory}: ${rule.description}`,
      ...(v.verdict && { verdict: v.verdict }),
      ...(v.verdictReason && { verdictReason: v.verdictReason }),
    };
  });

  return {
    findings,
    violations,
    routesScanned: routeFiles.length,
    rulesPassed: passedRules.size,
    rulesFailed: failedRules.size,
  };
}
