# CVERiskPilot Deep Security Audit Report

**Date:** 2026-03-28
**Methodology:** White-box deep scan — auth, injection, crypto, access control
**Scope:** Full codebase (apps/web, all packages)

---

## Executive Summary

Deep scan found **31 additional vulnerabilities** beyond the 6 already patched.
**7 CRITICAL, 12 HIGH, 8 MEDIUM, 4 LOW.**

The most dangerous class of finding is **~20 API routes with NO authentication**, allowing unauthenticated access to export data, manage webhooks, delete users (GDPR endpoint), manage teams, and modify feature flags for any organization.

---

## CRITICAL FINDINGS

### D-001: MFA Verification Accepts Any 6-Digit Code
**File:** `apps/web/app/api/auth/mfa/verify/route.ts:46`
**CVSS:** 9.8

The MFA verify endpoint is a stub — it accepts ANY valid 6-digit code without checking TOTP secret:
```
// TODO: In production, look up the tempSessionId to retrieve the user,
// fetch their mfaSecret from the DB, and call verifyTOTPToken(token, secret).
// For now, accept any valid 6-digit code.
```
**Impact:** Complete MFA bypass. Any user with MFA enabled can be compromised with code `000000`.

---

### D-002: ~20 API Routes Missing Authentication Entirely
**CVSS:** 9.1

The following routes have NO `getServerSession()` call and accept `organizationId` from query/body params, enabling cross-tenant data access:

| Route | Methods | Risk |
|-------|---------|------|
| `/api/export/findings` | GET | Export any org's findings |
| `/api/export/bulk` | POST | Bulk export any org's data |
| `/api/export/bulk/[jobId]` | GET | Download any export |
| `/api/upload/[jobId]` | GET | Poll any job status |
| `/api/connectors` | GET, POST | List/register scanners for any org |
| `/api/webhooks/config` | GET, POST, DELETE | Manage webhooks for any org |
| `/api/webhooks/test` | POST | Test webhooks for any org |
| `/api/webhooks/deliveries` | GET | View delivery logs for any org |
| `/api/teams/[id]` | GET, PUT, DELETE | CRUD any team |
| `/api/teams/[id]/members` | POST, DELETE | Add/remove team members |
| `/api/stream` | GET | Subscribe to real-time scan data |
| `/api/users` | GET, POST | List users, send invites |
| `/api/audit-logs` | GET | Read any org's audit trail |
| `/api/ops/customers` | GET | List all customers with MRR |
| `/api/ops/flags` | GET, PUT | Read/modify feature flags |
| `/api/privacy/delete` | POST | GDPR-delete any user |

**Impact:** Full data exfiltration, account deletion, webhook hijacking.

---

### D-003: Path Traversal in Local File Download
**File:** `packages/storage/src/gcs/local-upload.ts:68`
**CVSS:** 8.6

```typescript
export async function downloadFromLocal(path: string): Promise<Buffer> {
  const fullPath = join(UPLOADS_ROOT, path);
  return readFile(fullPath);
}
```
No validation that resolved path stays within UPLOADS_ROOT. Attacker with crafted `gcsPath` (e.g., `../../../../etc/passwd`) reads arbitrary files.

---

### D-004: Session Fallback Creates Forgeable Cookies
**Files:** `login/route.ts:110`, `signup/route.ts:107`, `google/callback/route.ts:132`
**CVSS:** 8.1

When Redis is unavailable, auth routes set `crp_session` to the raw userId:
```typescript
response.cookies.set('crp_session', result.userId, { ... });
```
The middleware accepts ANY cookie value as a valid session. Attacker crafts `crp_session=<any-user-id>` to impersonate users.

---

### D-005: Dev Session Endpoint Available in Non-Production
**File:** `apps/web/app/api/auth/dev-session/route.ts`
**CVSS:** 7.8

`/api/auth/dev-session` creates arbitrary sessions with any role/email/org. Only gated by `NODE_ENV !== 'production'`. Accessible on staging or any env where NODE_ENV != exactly `'production'`.

---

### D-006: Predictable MFA Temp Session IDs
**File:** `apps/web/app/api/auth/login/route.ts:78`
**CVSS:** 7.5

```typescript
const tempSessionId = `mfa:${result.userId}:${Date.now()}`;
```
Contains predictable userId + millisecond timestamp. Combined with D-001 (MFA accepts any code), trivially exploitable.

---

### D-007: GDPR Delete Endpoint Has No Auth
**File:** `apps/web/app/api/privacy/delete/route.ts`
**CVSS:** 9.0

Unauthenticated POST accepts email and deletes the user. Attacker can delete any account.

---

## HIGH FINDINGS

### D-008: XML Parsers Vulnerable to Billion Laughs / XXE
**Files:** `packages/parsers/src/parsers/nessus.ts:39`, `qualys.ts:27`, `openvas.ts:28`

fast-xml-parser used with default config — no explicit entity expansion limits. Malicious XML upload causes memory exhaustion (DoS).

### D-009: Middleware Ops Gate Bypassable
**File:** `apps/web/middleware.ts:199`

Ops domain check parses base64 cookie client-side. Attacker crafts cookie with `email: "admin@cveriskpilot.com"` to bypass.

### D-010: Math.random() in Rate Limiter
**File:** `packages/auth/src/security/rate-limit.ts:73`

`Math.random()` is not cryptographically secure. Used for Redis sorted set member IDs.

### D-011: AI Prompt Injection via Custom System Prompt
**File:** `packages/ai/src/prompt.ts:30`

Org admins can set `customSystemPrompt` that's concatenated directly into the AI system prompt without sanitization.

### D-012: Jira Webhook Lacks Signature Verification
**File:** `apps/web/app/api/integrations/jira/webhook/route.ts`

Accepts POST without verifying Jira webhook signature. Fake events can modify case statuses.

### D-013: No Rate Limiting on MFA Verification
**File:** `apps/web/app/api/auth/mfa/verify/route.ts`

No rate limiting. 1M possible 6-digit codes brute-forceable in ~16 minutes at 1k req/s.

### D-014: Login Response Leaks organizationId
**File:** `apps/web/app/api/auth/login/route.ts:99`

Response includes `organizationId` — aids cross-tenant attacks.

### D-015: updateSession Allows Role Escalation
**File:** `packages/auth/src/session/redis-store.ts:154`

`updateSession()` accepts `role` in updates without validating authorization.

### D-016: Impersonation Audit Logs In-Memory Only
**File:** `apps/web/app/api/ops/impersonate/route.ts`

Audit logs stored in array, lost on restart. No persistent record of admin impersonation.

### D-017: Client Context Switch Not Role-Gated
**File:** `apps/web/app/api/session/client/route.ts`

Any authenticated user can switch to view any client in their org, bypassing team assignments.

### D-018: Cloud Tasks Headers Spoofable
**File:** `apps/web/app/api/jobs/process/route.ts`

`x-cloudtasks-taskname` and `x-cloudtasks-queuename` can be set by any HTTP client. No OIDC token verification.

### D-019: Webhook Config Exposes Secret Patterns
**File:** `apps/web/app/api/webhooks/config/route.ts:54`

Masks secrets as `****` + last 4 chars. Combined with no auth (D-002), leaks partial secrets.

---

## MEDIUM FINDINGS

### D-020: JSON Parsers No Schema Validation
**Files:** `packages/parsers/src/parsers/json.ts`, `sarif.ts`, `cyclonedx.ts`, `spdx.ts`, `csaf.ts`

`JSON.parse()` on untrusted uploads without schema validation. Deeply nested structures cause stack overflow.

### D-021: Missing CSRF on State-Changing Operations
Multiple POST/PUT/DELETE API routes lack CSRF token validation.

### D-022: No CSRF on Logout
**File:** `apps/web/app/api/auth/logout/route.ts`

Cross-site request can log out any user.

### D-023: Signup Missing Org Name Validation
**File:** `apps/web/app/api/auth/signup/route.ts`

No reserved word or homoglyph validation on org names.

### D-024: Session Cookie Deserialization Without Schema
**File:** `apps/web/app/api/auth/session/route.ts:30`

`JSON.parse(atob(cookie))` without Zod validation. Prototype pollution risk.

### D-025: AI Remediation No Role Check
**File:** `apps/web/app/api/ai/remediation/route.ts`

Any authenticated user can trigger expensive AI calls. No role gating.

### D-026: TOTP Uses SHA1
**File:** `packages/auth/src/mfa/totp.ts:31`

SHA1 is standards-compliant for TOTP but legacy.

### D-027: Hardcoded Superadmin Seed Passwords in .env.local
**File:** `.env.local:122-124`

`LOCALHOST_SUPERADMIN_PASSWORDS=superadmin-pass,demo-password` — if auto-seed runs in staging, creates known-password admin.

---

## LOW FINDINGS

### D-028: Console.error May Log Sensitive Data
Multiple catch blocks log full error objects that may contain connection strings.

### D-029: X-Powered-By Removed (Already Fixed)
Fixed in this session.

### D-030: OpenAPI Docs Gated (Already Fixed)
Fixed in this session.

### D-031: Dotfile Blocking (Already Fixed)
Fixed in this session.

---

## Remediation Priority

| Priority | IDs | Fix Effort | Description |
|----------|-----|-----------|-------------|
| 1 | D-002 | 60 min | Add auth to all 20+ unprotected API routes |
| 2 | D-001, D-006, D-013 | 30 min | Fix MFA (real TOTP verify, secure IDs, rate limit) |
| 3 | D-003 | 5 min | Path traversal fix in local-upload.ts |
| 4 | D-004 | 15 min | Remove insecure session fallback |
| 5 | D-005 | 5 min | Restrict dev-session to localhost |
| 6 | D-007 | 5 min | Auth-gate GDPR delete endpoint |
| 7 | D-008 | 10 min | XML parser hardening |
| 8 | D-009 | 10 min | Fix ops domain gate |
| 9 | D-010-D-019 | 45 min | HIGH severity fixes |
| 10 | D-020-D-027 | 30 min | MEDIUM severity fixes |

**Total estimated fix time: ~3.5 hours**
