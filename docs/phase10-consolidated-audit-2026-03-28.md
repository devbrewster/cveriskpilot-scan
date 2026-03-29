# Phase 10 Consolidated Audit Report

**Date**: 2026-03-28
**Scope**: Full codebase — security, package health, GRC compliance
**Methodology**: 3 parallel audit agents, each with ~50+ tool invocations

---

## 1. Security Posture (Post-Wave 17)

**18 findings**: 4 CRITICAL, 5 HIGH, 5 MEDIUM, 4 LOW

### CRITICAL

#### F-01: Six ops API routes have NO authentication
**Files**:
- `apps/web/app/api/ops/analytics/route.ts`
- `apps/web/app/api/ops/billing/route.ts`
- `apps/web/app/api/ops/onboarding/route.ts`
- `apps/web/app/api/ops/health/route.ts`
- `apps/web/app/api/ops/customers/[id]/route.ts`
- `apps/web/app/api/ops/announcements/route.ts`

No `getServerSession()`, no `getStaffEmail()`, no role check. Middleware ops domain gate (line 228-263 in `middleware.ts`) fails silently for Redis-backed sessions because `JSON.parse(atob(...))` throws on opaque UUIDs, and the catch block allows API routes through.

#### F-02: `/api/uploads` route has no auth, accepts user-supplied organizationId
**File**: `apps/web/app/api/uploads/route.ts`

No `getServerSession()` call. Accepts `organizationId` as query parameter with no scoping — cross-tenant data leak.

#### F-03: `/api/teams/[id]/clients` has no auth — cross-tenant mutation
**File**: `apps/web/app/api/teams/[id]/clients/route.ts`

Both POST and DELETE handlers have zero authentication and no org-scoping.

#### F-04: `/api/connectors/[id]/heartbeat` has no authentication
**File**: `apps/web/app/api/connectors/[id]/heartbeat/route.ts`

Accepts arbitrary connector status updates without authentication.

### HIGH

#### F-05: Jira webhook has no signature verification
**File**: `apps/web/app/api/integrations/jira/webhook/route.ts`

Unlike the Snyk webhook (which verifies HMAC-SHA256), zero signature verification. Attacker can change case statuses via crafted Jira payloads.

#### F-06: CSRF protection on only 5 of ~70 state-changing routes
**Files**: Multiple

`checkCsrf()` only on: `settings/retention`, `billing/upgrade`, `teams`, `keys`, `webhooks/config`. Missing from upload, cases, privacy/delete, admin/onboard, users, connectors, ops/impersonate.

#### F-07: User invite allows privilege escalation to PLATFORM_ADMIN
**File**: `apps/web/app/api/users/route.ts`

POST validates role is a valid enum but doesn't check caller's role. A VIEWER can invite a PLATFORM_ADMIN.

#### F-08: Dev session endpoint relies solely on NODE_ENV check
**File**: `apps/web/app/api/auth/dev-session/route.ts`

Creates sessions for any email/role/tier. Only gate is `NODE_ENV !== 'development'`. Listed in `API_PUBLIC_PATHS`, bypassing all middleware auth.

#### F-09: Middleware ops domain gate bypassable with Redis sessions
**File**: `apps/web/middleware.ts` (lines 237-263)

The base64 JSON decode fails for opaque Redis session UUIDs. Catch block allows API routes through.

### MEDIUM

#### F-10: Error messages leak internal details
**Files**: 12+ API routes return raw `(error as Error).message` to clients.

#### F-11: Integration credentials stored plaintext when encryption unavailable
**Files**: Jira config, ServiceNow config, webhook config routes log warning but store secrets in plaintext.

#### F-12: Privacy/delete allows cross-org user deletion by PLATFORM_ADMIN
**File**: `apps/web/app/api/privacy/delete/route.ts`

No check that target user belongs to admin's org.

#### F-13: CSV export sanitization applied inconsistently
**File**: `apps/web/app/api/export/findings/route.ts`

`sanitizeCsvCell()` not applied to `f.id`, `f.scannerType`, dates, booleans.

#### F-14: Session not invalidated on password change
No password change route calls `destroyAllUserSessions()`.

### LOW

#### F-15: Ops overview uses custom cookie parsing instead of getServerSession
#### F-16: Impersonation uses in-memory store (lost on restart)
#### F-17: Test passwords hardcoded in fixtures
#### F-18: CSP uses 'unsafe-inline' for scripts (Next.js standalone limitation)

---

## 2. Package Health

**25 packages**: 5 GREEN, 12 YELLOW, 8 RED

### RED Packages

| Package | Issue |
|---------|-------|
| agents | Dead package; 2 unused declared deps |
| db-scale | Missing `composite: true` in tsconfig |
| enrichment | Missing `@cveriskpilot/shared` dep (5 files) |
| integrations | 33 files, 0 tests; 2 phantom deps |
| storage | 2 phantom deps |

### Phantom Dependencies (runtime imports without package.json declaration)

| Package | Missing Declaration |
|---------|-------------------|
| ai | `@cveriskpilot/shared` |
| enrichment | `@cveriskpilot/shared` |
| billing | `@cveriskpilot/shared` |
| integrations | `@cveriskpilot/shared`, `@cveriskpilot/parsers` |
| compliance | `@cveriskpilot/parsers` |
| storage | `@cveriskpilot/shared`, `@cveriskpilot/enrichment` |
| streaming | `@cveriskpilot/domain` |

### Dead Packages (zero consumers in apps/)

agents, stamps, residency, whitelabel, backup, observability, abac

### `as any` Hotspots

- `auth` package: 38 instances (Prisma type erasure across providers, org, SCIM)
- `streaming/pipeline.ts`: 2 instances
- `storage/case-builder.ts`: 1 instance

### apps/worker Missing Dependencies

`@cveriskpilot/parsers`, `@cveriskpilot/enrichment`, `@cveriskpilot/notifications`

### Config Issues

- `db-scale/tsconfig.json` missing `composite: true`
- `@cveriskpilot/audit` missing from root tsconfig path mappings
- `@cveriskpilot/scan` listed in root `dependencies` (should be workspace ref)

### Test Coverage

16/25 packages have zero tests. Critical gaps: `compliance` (17 src files), `integrations` (33 src files).

---

## 3. GRC Compliance Features

### HIGH

1. **RBAC not consistently enforced in API routes** — Routes use `getServerSession()` but many don't call `requirePermission()`. (SOC2 CC6.1, CMMC AC.L2-3.1.2, FedRAMP AC-3)

2. **Client-scoping not enforced in API queries** — Most routes filter by `organizationId` but not `clientId` based on team-to-client assignments. MSSP tenant isolation broken. (Data privacy)

3. **Audit logging not wired to API routes** — `createAuditEntry()` exists but is not called from any of the 70 API routes. (SOC2 CC7.2, CMMC AU.L2-3.3.1, FedRAMP AU-2)

4. **CMMC and FedRAMP assessors not exposed via API** — Complete code exists but not registered in `/api/compliance/frameworks/[id]` route's `FRAMEWORKS`/`ASSESSORS` maps. One-line fix.

5. **Scan comparison uses hardcoded mock data** — `scan-compare.tsx` has inline mock objects, no API integration.

### MEDIUM

6. Asset criticality not wired into risk scoring pipeline
7. No persistent compliance score history (computed on-the-fly only)
8. Qualys/SARIF/SPDX/OSV parsers missing CWE extraction (4/11 parsers)
9. SLA breach notifications not implemented end-to-end
10. Scheduled report cron not executing
11. Webhook delivery tracker is in-memory only
12. Verification workflow lacks separation of duties
13. RBAC not enforced in UI navigation (Wave 8 pending)
14. Framework assessment counts-based, not finding-level
15. No XLSX export for findings
16. No compliance/reporting permission domain in RBAC

### LOW

17. Risk exception expiry not enforced by background job
18. No CVSS v4.0 support
19. SPDX only supports JSON format
20. POAM lacks XLSX/FedRAMP template export
21. No integration health monitoring
22. SIEM config not persisted per-tenant
23. No report watermarking/CUI markings
24. DEVELOPER role cannot self-report vulnerabilities
25. No audit log export endpoint
26. No parser-level CVE ID validation

---

## Domain Scorecard

| Domain | Rating | Notes |
|--------|--------|-------|
| Scanner Support | **Strong** | 11 parsers, consistent schema, XXE protection. CWE gaps in 4 parsers. |
| Enrichment | **Strong** | NVD/EPSS/KEV functional with caching. Asset criticality not connected. |
| Case Management | **Strong** | Full 10-state lifecycle, workflow lineage, risk exceptions. Enforcement gaps. |
| Compliance Frameworks | **Good** | 5 frameworks, cross-framework mapping. 2 not exposed via API. No score history. |
| Reporting | **Good** | PDF/CSV/bulk export functional. Scan compare mock-only. Scheduled reports not firing. |
| Integrations | **Good** | Jira, ServiceNow, 4 SIEMs, webhooks. In-memory tracker, missing config UIs. |
| RBAC | **Moderate** | Well-designed 10-role/26-permission system. Not enforced consistently. |
| Audit Trail | **Moderate** | Tamper-evident hash chain. Not wired to API routes. |

---

## Systemic Theme

The #1 pattern: **infrastructure is well-built but the "last mile" wiring is missing**. Auth middleware, RBAC permissions, audit logging, compliance assessors — all exist as code but aren't consistently connected to the API routes that need them.

## Remediation Priority

1. Auth on all unauthenticated routes (F-01 through F-04) — CRITICAL
2. RBAC enforcement in API routes (F-07, GRC #1) — HIGH
3. Middleware ops domain gate fix for Redis sessions (F-09) — HIGH
4. Audit logging wired to API routes (GRC #3) — HIGH
5. CMMC/FedRAMP assessor registration (GRC #4) — HIGH (one-line fix)
6. Phantom dependency declarations — HIGH (build correctness)
7. CSRF expansion to all state-changing routes (F-06) — HIGH
8. Jira webhook signature verification (F-05) — HIGH
9. Dev session endpoint hardening (F-08) — HIGH
10. Client-scoping for MSSP isolation (GRC #2) — HIGH
