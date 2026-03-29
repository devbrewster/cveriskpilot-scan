# Session Summary — 2026-03-28: Phase 10 Security Audit Remediation

**Commit:** `816b545` → pushed to `origin/main`
**Scope:** 133 files changed, +5,054 / -1,487 lines
**Build:** GREEN

---

## What Happened

Three parallel audit agents ran a comprehensive Phase 10 audit of the CVERiskPilot codebase. They found **18 security findings** across authentication, authorization, CSRF, webhook verification, package health, and GRC compliance. All 18 findings were remediated in 9 sequential waves (22a–22i), each approved by the user before execution.

---

## Audit Findings (18 total)

### CRITICAL (7)
| ID | Finding | Route(s) |
|----|---------|----------|
| F-01 | Ops analytics — zero auth | `/api/ops/analytics` |
| F-02 | Ops billing — zero auth | `/api/ops/billing` |
| F-03 | Ops health — zero auth | `/api/ops/health` |
| F-04 | Ops onboarding — zero auth | `/api/ops/onboarding` |
| F-05 | Ops customers — zero auth | `/api/ops/customers`, `/api/ops/customers/[id]` |
| F-06 | Ops announcements — zero auth | `/api/ops/announcements` |
| F-07 | User invite allows PLATFORM_ADMIN assignment | `/api/users` POST |

### HIGH (5)
| ID | Finding | Route(s) |
|----|---------|----------|
| F-08 | Cross-org data deletion | `/api/privacy/delete` |
| F-09 | Ops middleware domain gate broken for Redis sessions | `middleware.ts` |
| F-10 | 12+ mutation routes missing RBAC guards | assets, connectors, clients, settings, service-accounts |
| F-11 | CSRF only on 2 routes | middleware.ts |
| F-12 | Jira webhook accepts unsigned payloads | `/api/integrations/jira/webhook` |

### MEDIUM (5)
| ID | Finding | Route(s) |
|----|---------|----------|
| F-13 | Dev session route accessible in production | `/api/auth/dev-session` |
| F-14 | 8 packages have phantom dependencies | ai, enrichment, billing, integrations, storage, compliance, streaming, worker |
| F-15 | CMMC/FedRAMP assessors not registered | `/api/compliance/frameworks/[id]` |
| F-16 | Key mutations lack audit trail | cases, exceptions, uploads, connectors, settings |
| F-17 | No MSSP client-scoping on list endpoints | findings, cases, assets |

### LOW (1)
| ID | Finding | Route(s) |
|----|---------|----------|
| F-18 | db-scale missing composite tsconfig flag | `packages/db-scale/tsconfig.json` |

---

## Remediation Waves

### Wave 22a — CRITICAL: Unauthenticated Ops Routes
**Files:** 6 ops route files
**Fix:** Added `getServerSession()` + `@cveriskpilot.com` domain check to all ops API routes.

### Wave 22b — Middleware Ops Domain Gate Fix
**Files:** `apps/web/middleware.ts`
**Fix:** Added `isOpaqueToken` flag to handle Redis sessions (not just base64 cookies). Blocks ops page routes for non-staff, allows API routes through to route-level auth.

### Wave 22c — RBAC on Mutations + User Invite Lockdown
**Files:** 8 API route files
**Fix:** Added `requireRole()` guards with appropriate role lists:
- `ADMIN_ROLES` (PLATFORM_ADMIN, ORG_OWNER) → users, settings, service-accounts
- `MANAGE_ROLES` (+SECURITY_ADMIN) → connectors, clients
- `WRITE_ROLES` (+ANALYST) → assets
- Platform-only role lockdown on user invite (only PLATFORM_ADMIN can assign PLATFORM_ADMIN/PLATFORM_SUPPORT/ORG_OWNER)
- Cross-org deletion fix on privacy/delete

### Wave 22d — CSRF Middleware Expansion
**Files:** `apps/web/middleware.ts`
**Fix:** Added CSRF double-submit cookie enforcement for ALL `POST/PUT/PATCH/DELETE` requests on `/api/*`. Exempt paths: `/api/webhooks`, `/api/auth`, `/api/cron`, `/api/pipeline`, `/api/scim`, heartbeat routes.

### Wave 22e — Jira Webhook Signature + Dev Session Hardening
**Files:** `apps/web/app/api/integrations/jira/webhook/route.ts`, `apps/web/app/api/auth/dev-session/route.ts`
**Fix:**
- Jira webhook: HMAC-SHA256 signature verification using org's stored `webhookSecret`. Graceful degradation with warning if no secret configured. Fixed error message leak.
- Dev session: Double-gate requiring both `NODE_ENV === 'development'` AND `DEV_SESSION_ENABLED === 'true'`.

### Wave 22f — Phantom Dependency Declarations
**Files:** 8 `package.json` files + `packages/db-scale/tsconfig.json`
**Fix:** Added missing workspace dependency declarations:
- `packages/ai` → `@cveriskpilot/shared`
- `packages/enrichment` → `@cveriskpilot/shared`
- `packages/billing` → `@cveriskpilot/shared`
- `packages/integrations` → `@cveriskpilot/parsers`, `@cveriskpilot/shared`
- `packages/storage` → `@cveriskpilot/shared`, `@cveriskpilot/enrichment`
- `packages/compliance` → `@cveriskpilot/parsers`
- `packages/streaming` → `@cveriskpilot/domain`
- `apps/worker` → `@cveriskpilot/enrichment`, `@cveriskpilot/notifications`, `@cveriskpilot/parsers`
- `packages/db-scale/tsconfig.json` → added `"composite": true`

### Wave 22g — CMMC/FedRAMP Assessor Registration
**Files:** `apps/web/app/api/compliance/frameworks/[id]/route.ts`
**Fix:** Registered `cmmc-l2` (CMMC_FRAMEWORK) and `fedramp-moderate` (FEDRAMP_FRAMEWORK) in the FRAMEWORKS lookup map.

### Wave 22h — Audit Logging Wired to Key Routes
**Files:** `apps/web/src/lib/audit.ts` (created), 5 API route files
**Fix:** Created reusable `logAudit()` helper. Wired audit logging to:
- Cases PATCH (STATE_CHANGE / UPDATE)
- Exceptions approve/reject (RISK_EXCEPTION)
- Upload job creation (CREATE)
- Connectors PUT/DELETE (UPDATE / DELETE)
- Settings org-profile PUT (UPDATE)

### Wave 22i — Client-Scoping for MSSP Isolation
**Files:** `apps/web/src/lib/client-scope.ts` (created), 3 API route files
**Fix:** Created `resolveClientScope()` helper that resolves accessible client IDs based on role + team memberships. Wired into:
- `GET /api/findings`
- `GET /api/cases`
- `GET /api/assets`

---

## Key Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/lib/audit.ts` | `logAudit()` — fire-and-forget audit log writer |
| `apps/web/src/lib/client-scope.ts` | `resolveClientScope()` — MSSP tenant isolation helper |
| `docs/phase10-consolidated-audit-2026-03-28.md` | Full audit report from 3 agents |

---

## Patterns Established

1. **All new API mutations** must include: `getServerSession()` → `requireRole()` → business logic → `logAudit()`
2. **All new list endpoints** with `clientId` must use `resolveClientScope()` for MSSP isolation
3. **CSRF is automatic** via middleware — no per-route work needed (exempt webhooks/auth/cron)
4. **Ops routes** use `@cveriskpilot.com` domain check pattern
5. **Role hierarchy:** ADMIN_ROLES ⊂ MANAGE_ROLES ⊂ WRITE_ROLES

---

## Errors Encountered & Fixed During Session

1. **Heartbeat route variable collision** — auth check and heartbeat processing both declared `const connector`. Renamed auth check to `existing`.
2. **Org-profile syntax error** — extra closing paren in ternary. Fixed typo.
3. **Audit helper Prisma type** — `Record<string, unknown>` incompatible with Prisma's `Json` field. Fixed by using `Prisma.InputJsonValue` from `@cveriskpilot/domain`.
