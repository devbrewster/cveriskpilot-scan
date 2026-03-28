# CVERiskPilot Security Audit Report

**Date:** 2026-03-28
**Target:** https://cveriskpilot.com (Cloud Run, v15-auth-guard)
**Methodology:** Black-box APT simulation against production endpoints
**Auditor:** Automated penetration test

---

## Executive Summary

13 tests passed. **6 vulnerabilities found**, 2 critical, 2 high, 2 medium.
The most dangerous finding is a **host header injection** that allows an attacker to redirect Google OAuth callbacks to an attacker-controlled domain, enabling full account takeover.

---

## CRITICAL

### V-001: Host Header Injection in OAuth Flow (Account Takeover)

**Severity:** CRITICAL
**CVSS:** 9.8
**Endpoint:** `GET /api/auth/google`
**Vector:** `X-Forwarded-Host: evil.com`

**Finding:**
The OAuth initiation route reads `x-forwarded-host` to build the `redirect_uri`. An attacker can inject `X-Forwarded-Host: evil.com` which causes the Google OAuth redirect_uri to become `https://evil.com/api/auth/google/callback`. If the attacker also controls a matching Google OAuth client (or if Google's loose matching allows it), the authorization code is sent to the attacker's server.

**Proof of Concept:**
```bash
curl -sI -H "X-Forwarded-Host: evil.com" \
  https://cveriskpilot.com/api/auth/google \
  | grep redirect_uri
# Returns: redirect_uri=https://evil.com/api/auth/google/callback
```

**Impact:** Full account takeover. Attacker intercepts the OAuth authorization code and exchanges it for a session on the legitimate application.

**How to Fix:**
In `apps/web/app/api/auth/google/route.ts` and `callback/route.ts`, **never trust `x-forwarded-host`**. Use a hardcoded allowlist of origins instead:

```typescript
// Replace the dynamic origin computation with:
const ALLOWED_ORIGINS = [
  process.env.APP_BASE_URL,                    // https://cveriskpilot.com
  'http://localhost:3000',                       // local dev
].filter(Boolean) as string[];

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const candidate = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : request.nextUrl.origin;

  // CRITICAL: Only allow known origins
  if (ALLOWED_ORIGINS.includes(candidate)) {
    return candidate;
  }
  return ALLOWED_ORIGINS[0] || 'https://cveriskpilot.com';
}
```

Apply this to both `route.ts` and `callback/route.ts`.

---

### V-002: Portal Session Forgery (Unauthenticated Portal Access)

**Severity:** CRITICAL
**CVSS:** 9.1
**Endpoint:** `GET /portal/*`
**Vector:** Forged `crp_portal_session` cookie

**Finding:**
The portal layout at `app/(portal)/layout.tsx` reads the session from a base64-encoded JSON cookie (`crp_portal_session`) with **no cryptographic signature verification**. Any user can forge a portal session by constructing a base64-encoded JSON payload.

**Proof of Concept:**
```bash
FAKE=$(echo -n '{"user":{"id":"u1","name":"Hacker","email":"h@test.com","clientName":"Target Corp"},"clientId":"real-client-id"}' | base64)
curl -b "crp_portal_session=$FAKE" https://cveriskpilot.com/portal
# Returns 200 with full portal access
```

**Impact:** Unauthenticated access to any client's portal. If the attacker knows or guesses a `clientId`, they can view findings, cases, and reports for that client.

**How to Fix:**
Replace the unsigned cookie with a signed/encrypted session or use the same Redis-backed session store as the main app:

**Option A (quick fix) - HMAC-sign the cookie:**
```typescript
// In portal login handler:
import crypto from 'node:crypto';

const SECRET = process.env.AUTH_SECRET!;

function signPortalSession(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

function verifyPortalSession(cookie: string): object | null {
  const [payload, signature] = cookie.split('.');
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
}
```

**Option B (recommended) - Use Redis sessions:**
Store portal sessions in Redis like the main app (`createSession()` from `@cveriskpilot/auth`) and validate via server-side lookup.

---

## HIGH

### V-003: `.env` and `.git` Paths Not Blocked (Information Disclosure Risk)

**Severity:** HIGH
**CVSS:** 7.5
**Endpoint:** `GET /.env`, `GET /.git/config`

**Finding:**
Requests to `/.env` and `/.git/config` return `307 Redirect` to `/login?callbackUrl=/.env`. While the files are not directly exposed (they don't exist in the Next.js standalone build), this behavior:
1. Confirms the application framework uses `.env` files (information leakage)
2. After authentication, the user would be redirected to `/.env` which returns a 404 — confusing but not exploitable
3. The `callbackUrl` parameter could be abused in combination with other attacks

**How to Fix:**
Block dotfile access in the middleware before any redirect logic:

```typescript
// Add to SKIP_PREFIXES or add a dedicated check:
const BLOCKED_PATHS = /^\/(\.env|\.git|\.svn|\.hg|\.DS_Store|wp-admin|wp-login)/;

// At the top of the middleware function:
if (BLOCKED_PATHS.test(pathname)) {
  return new NextResponse(null, { status: 404 });
}
```

---

### V-004: `/api/jobs/process` Accessible Without Authentication

**Severity:** HIGH
**CVSS:** 7.2
**Endpoint:** `POST /api/jobs/process`

**Finding:**
The job processing endpoint accepts requests without authentication and attempts to process jobs. While it fails gracefully when given invalid job IDs, an attacker with a valid `jobId` could trigger job reprocessing or cause resource exhaustion.

**Proof of Concept:**
```bash
curl -X POST https://cveriskpilot.com/api/jobs/process \
  -H 'Content-Type: application/json' \
  -d '{"jobId":"test"}'
# Returns: {"status":"failed","error":"UploadJob not found: test"}
# No 401 — endpoint is open
```

**Impact:** Job re-execution, potential resource exhaustion, information disclosure via error messages.

**How to Fix:**
This endpoint should only be callable by Cloud Tasks. Add a verification header check:

```typescript
// In apps/web/app/api/jobs/process/route.ts:
export async function POST(request: NextRequest) {
  // Cloud Tasks sends this header automatically
  const taskHeader = request.headers.get('x-cloudtasks-taskname');
  const queueHeader = request.headers.get('x-cloudtasks-queuename');

  if (!taskHeader || !queueHeader) {
    // Also accept requests with a valid session (for manual retries)
    const session = await getServerSession(request);
    if (!session || session.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ... rest of handler
}
```

Additionally, configure the Cloud Run service to reject external requests to this path via IAM or a shared secret.

---

## MEDIUM

### V-005: No Rate Limiting on Signup Endpoint

**Severity:** MEDIUM
**CVSS:** 5.3
**Endpoint:** `POST /api/auth/signup`

**Finding:**
15 rapid signup requests all returned `400` (validation errors) but none returned `429`. The login endpoint correctly rate-limits after 4 attempts, but the signup endpoint has no rate limiting. An attacker could:
1. Enumerate valid email addresses (different error for "already exists" vs validation)
2. Create mass accounts for spam or abuse
3. Exhaust database resources with org/user creation

**How to Fix:**
Add the same rate limiter used by the login endpoint:

```typescript
// In apps/web/app/api/auth/signup/route.ts:
import { getLoginLimiter } from '@cveriskpilot/auth';

// At the top of POST handler:
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
try {
  const limiter = getLoginLimiter();
  const rl = await limiter.check(`signup:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
    );
  }
} catch {
  // Redis not available — skip rate limiting
}
```

---

### V-006: OpenAPI Documentation Publicly Accessible

**Severity:** MEDIUM
**CVSS:** 5.3
**Endpoint:** `GET /api/docs`

**Finding:**
The OpenAPI specification is publicly accessible at `/api/docs`, returning the full API schema including all endpoint paths, request/response schemas, and parameter details. This gives attackers a complete map of the API surface.

**Proof of Concept:**
```bash
curl -s https://cveriskpilot.com/api/docs | head -c 500
# Returns full OpenAPI 3.1.0 spec
```

**Impact:** Accelerates reconnaissance. Attackers can discover all endpoints, required parameters, and data models without any guessing.

**How to Fix:**
Either require authentication or restrict to non-production environments:

```typescript
// In apps/web/app/api/docs/route.ts:
export async function GET(request: NextRequest) {
  // Only expose in development
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  // ... existing spec generation
}
```

Or gate behind auth:
```typescript
const session = await getServerSession(request);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## PASSED CHECKS

| Test | Result |
|------|--------|
| Session cookie forgery (main app) | PASS - Redis-backed sessions cannot be forged |
| XSS (reflected) | PASS - No script reflection detected |
| XSS (javascript: URL) | PASS - Not reflected |
| SQL injection | PASS - Prisma ORM parameterizes all queries |
| NoSQL injection | PASS - Type checking rejects non-string inputs |
| CORS | PASS - No Access-Control headers returned for foreign origins |
| IDOR on API routes | PASS - All return 401 without session |
| File upload without auth | PASS - Returns 401 |
| Login brute force | PASS - Rate limited after 4 attempts |
| Open redirect | PASS - callbackUrl not used in redirect response |
| Admin onboard | PASS - Returns 401 without PLATFORM_ADMIN session |
| Source maps | PASS - Not exposed (404) |
| X-Powered-By | INFO - Reveals "Next.js" (low risk, but removable) |

---

## Remediation Priority

| Priority | ID | Fix Effort | Description |
|----------|------|-----------|-------------|
| 1 | V-001 | 15 min | Origin allowlist in OAuth routes |
| 2 | V-002 | 30 min | Sign or replace portal session cookie |
| 3 | V-004 | 10 min | Auth check on /api/jobs/process |
| 4 | V-003 | 5 min | Block dotfile paths in middleware |
| 5 | V-005 | 5 min | Rate limit signup endpoint |
| 6 | V-006 | 5 min | Gate /api/docs behind auth or env check |

**Total estimated fix time: ~70 minutes**

---

## Additional Recommendations

1. **Remove `X-Powered-By: Next.js`** header — add `poweredByHeader: false` to `next.config.ts`
2. **Add `Cache-Control: no-store`** to all API responses to prevent sensitive data caching
3. **Add CSRF protection** to state-changing POST endpoints (login, signup, settings updates)
4. **Implement account lockout** after repeated failed logins (currently only rate-limited by IP)
5. **Add Stripe webhook IP allowlist** — only accept webhooks from Stripe's published IP ranges
6. **Log failed authentication attempts** with IP, user agent, and email for threat detection
