# CVERiskPilot - Claude Code Instructions

## Project Overview
CVERiskPilot is a vulnerability management SaaS platform for GRC/compliance teams. It ingests scan results from multiple scanner formats, enriches CVE data, performs AI-powered triage, and manages the remediation lifecycle including POAM generation and compliance framework mapping.

**Business**: CVERiskPilot LLC, 100% Veteran Owned, Texas-registered
**Version**: 0.3.0-beta (ground-up rebuild, replacing legacy 2.0-beta on Cloudflare)
**Domain**: cveriskpilot.com

## Architecture

### Stack
- **Runtime**: Node.js 20, TypeScript 5.9
- **Frontend**: Next.js 15 (App Router, React 19, Tailwind CSS, Radix UI)
- **Database**: PostgreSQL (Cloud SQL) via Prisma 5.22 ORM
- **Cache**: Redis (Cloud Memorystore) via ioredis
- **AI**: Anthropic Claude API (@anthropic-ai/sdk)
- **Payments**: Stripe (billing, checkout, webhooks)
- **Auth**: Google/GitHub OAuth, WorkOS SSO (SAML/OIDC), MFA (TOTP)
- **Email**: Resend / SMTP (nodemailer)
- **Storage**: Google Cloud Storage (scan artifacts, exports, backups)

### Infrastructure (GCP)
- **Compute**: Cloud Run (containerized)
- **Database**: Cloud SQL PostgreSQL
- **Cache**: Cloud Memorystore Redis
- **Storage**: GCS buckets
- **Security**: Cloud Armor WAF, VPC Service Controls, KMS
- **CI/CD**: Cloud Build
- **IaC**: Terraform
- **Observability**: Cloud Logging, OpenTelemetry

### Monorepo Structure
```
apps/web/                    # Next.js frontend + API routes
packages/
  domain/                    # Prisma schema + DB models (source of truth)
  parsers/                   # 11 scanner format parsers
  enrichment/                # NVD/EPSS/KEV enrichment + risk scoring
  integrations/              # Jira, ServiceNow, HackerOne, SIEMs, webhooks
  auth/                      # Authentication providers + RBAC
  billing/                   # Stripe billing + usage metering
  compliance/                # SOC2, SSDF, ASVS frameworks + POAM
  ai/                        # Claude triage agent + remediation
  notifications/             # Email templates + delivery
  observability/             # Logging, metrics, tracing (OTEL)
  backup/                    # Backup/restore + retention
  storage/                   # GCS + Cloud Tasks
  streaming/                 # SSE streams + progress
  db-scale/                  # Query optimization + pagination
  abac/                      # Attribute-based access control
  rollout/                   # Feature flags + ring rollout
  stamps/                    # Multi-region deployment
  residency/                 # Data residency routing
  whitelabel/                # Multi-tenant branding
  agents/                    # Agent orchestration (4 agents: CVE triage, product eng, customer ops, growth)
  api-docs/                  # OpenAPI spec
  shared/                    # Logger + shared utilities
deploy/
  Dockerfile                 # Multi-stage production build
  cloudbuild*.yaml           # GCP Cloud Build configs
  terraform/                 # Full GCP IaC
  docker-compose/            # Local dev
scripts/                     # Automation (social media, marketing, deployment)
social/                      # Social media config, calendar, post lifecycle dirs
state/marketing/             # Marketing agent state + publishing policy
e2e/                         # Playwright E2E tests
tests/                       # Unit + security tests
```

## Legacy Repos (Reference Only)
Two prior codebases exist for reference when porting logic:
- `/home/gonti/cveriskpilot2.0` — Cloudflare Workers + D1 SQLite (2.0 beta, 136 API routes, 238 tests, 4 AI agents)
- `/home/gonti/new/cveriskpilot_1.x` — Next.js + Prisma + PostgreSQL (1.x, 77 API routes, Vercel deploy)

**Pull guidance**: 1.x is closest stack match (same Prisma/PostgreSQL). 2.0 has superior AI agent system and feature flags. See migration notes below.

### Migration Status — Ported from Legacy
Track what has been pulled from legacy repos here:
- [x] IP allowlist (CIDR validation) from 1.x → packages/auth/src/security/ip-allowlist.ts
- [x] Password policies (expiry, HIBP, history) from 1.x → packages/auth/src/security/password-policy.ts
- [x] Agent orchestration (4 specialized agents) from 2.0 → packages/agents/src/
- [x] Webhook delivery tracking + event triggers from 1.x → packages/integrations/src/webhooks/
- [x] Social media automation suite from 2.0 → scripts/ + social/ + state/marketing/

Already existed in new repo (no port needed):
- [x] Encryption utils (AES-256-GCM + KMS BYOK) → packages/auth/src/security/encryption.ts
- [x] Webhook HMAC signing + retry → packages/integrations/src/webhooks/webhook-sender.ts
- [x] Audit logging (hash chain) → packages/auth/src/security/audit.ts
- [x] Data retention (per-org tiers) → packages/backup/src/retention.ts
- [x] Rate limiting (Redis sliding window) → packages/auth/src/security/rate-limit.ts
- [x] Feature flags (ring rollout) → packages/rollout/src/
- [x] Test fixtures → e2e/helpers/fixtures.ts
- [x] E2E test suites → e2e/*.spec.ts

Remaining (lower priority):
- [x] PDF export (react-pdf templates) from 1.x → apps/web/src/lib/export/pdf-export.tsx + apps/web/app/api/export/pdf/route.ts
- [x] Passkey/WebAuthn support from 2.0 → packages/auth/src/security/webauthn.ts + API routes
- [ ] Marketing public pages from 2.0 → apps/web

## Development

### Commands
```bash
npm run dev              # Start dev server (turbopack)
npm run build            # Production build
npm run lint             # ESLint
npm run format           # Prettier
npm run type-check       # TypeScript check
npm run test             # Vitest
npm run test:watch       # Vitest watch mode
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:push          # Push schema (dev)

# Social media automation
npm run social:generate          # Generate X drafts from KEV + news
npm run social:generate:kev      # KEV-only drafts
npm run social:generate:news     # News-only drafts
npm run social:autopilot         # Full pipeline (research → post)
npm run social:autopilot:dry-run # Preview without posting
npm run social:preflight:x       # Validate queued posts
npm run social:publish:x         # Publish to X
npm run social:publish:x:dry-run # Dry run publish
npm run social:push:x            # Validate + publish
```

### Database
- Schema lives at `packages/domain/prisma/schema.prisma`
- 25+ models with full relationships and indexes
- Enums: UserRole, Tier, Severity, CaseStatus, AssetType, ParserFormat, etc.

### Supported Scanner Formats (11)
Nessus, SARIF, CSV, JSON, CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX

### Billing Tiers
FREE, FOUNDERS_BETA, PRO, ENTERPRISE, MSSP

## Conventions

### Code Style
- TypeScript strict mode
- ESM modules (`"type": "module"`)
- Barrel exports from package index.ts
- Prisma for all DB access (no raw SQL unless performance-critical)
- Zod for input validation at API boundaries
- Server components by default; `"use client"` only when needed

### Security Requirements
- Never expose secrets/keys/credentials in code or context
- AES-256-GCM for secrets at rest (MASTER_ENCRYPTION_KEY env)
- All API mutations require auth + RBAC check
- Org-scoped tenant isolation on all queries
- Audit trail for security-relevant actions
- HTTPS-only for external redirects

### Working Style
- Act as code reviewer and tester; review, don't implement unsolicited changes
- Log all issues found during scans; don't fix unless asked (deferred until feature-complete)
- Delegate implementation to sub-agents when orchestrating large tasks
- Never expose secrets/keys/credentials in the context window

## Save Point — 2026-03-31

### Version: 0.3.0-beta
Beta milestone. All core flows functional end-to-end. Security hardened (13 findings remediated). Agentic tool-calling loop added to CVE triage agent (packages/agents/src/tools/ + loop.ts).

### Build Status: GREEN
`npm run build` passes. Worker healthy on Cloud Run.

### Repo Stats
- **74 pages** (app + portal + demo + public)
- **128 API routes**
- **201 components** in `apps/web/`
- **25 packages** in `packages/`
- **40 unit tests**, **4 E2E tests**, **2 integration tests**
- **11 scanner format parsers** (Nessus, SARIF, CSV, JSON, CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX)
- **5 scanner connectors** (Tenable, Qualys, CrowdStrike, Rapid7, Snyk)
- **10 RBAC roles** defined in schema + `packages/auth/src/rbac/permissions.ts`
- **7 agentic tools** for CVE triage (NVD, KEV, EPSS, CVSS, Compliance Map, Risk Score, Audit Log)
- **10 compliance frameworks** (NIST 800-53, CMMC, SOC2, FedRAMP, ASVS, GDPR, HIPAA, PCI DSS, ISO 27001, SSDF)

### Completed Waves (0-12)
- **Waves 0-5** (commit `aa63986`): Full MVP scaffold — auth, upload, parsers, enrichment, dashboard, findings, cases, reports, compliance, POAM, portal, demo, billing, teams, clients, portfolio, settings, Terraform, Dockerfile, CI/CD
- **Wave 6**: Dashboard completeness — SLA widget, compliance scores, activity timeline, 6 stat cards + 5 widget rows
- **Wave 7**: Settings page completion — API keys, service accounts, IP allowlist, connector settings, notification prefs, webhook config, org profile
- **Wave 8**: RBAC enforcement in UI — role-aware sidebar, page guards, client switcher role checks
- **Wave 9**: Missing functional pages — billing, notifications, audit log, user management, asset inventory, risk exceptions
- **Wave 10**: Polish — security audit remediation (auth, RBAC, CSRF, MSSP isolation), CSP fix, build fixes
- **Wave 11**: Pipeline compliance scanner CLI (`@cveriskpilot/scan`) — 6 frameworks, offline-first, npx support
- **Wave 12**: Ops dashboard — internal staff monitoring, customer support tools

---

## Audit Findings — 2026-03-31

### Production Readiness: 70-75%
Signup → billing → upload → dashboard flow is REAL and working. Revenue blockers are enforcement gaps, not missing features.

### Critical Issues (must fix before revenue)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **RBAC not enforced on API routes** — `withRole()`/`withPermission()` middleware defined but UNUSED; routes use `requireAuth()` only | `packages/auth/src/rbac/middleware.ts` (defined), `apps/web/app/api/admin/*` (missing) | Viewer-role users can call admin/billing/triage endpoints — compliance violation |
| 2 | **AI call billing gate not enforced** — upload limits gated but `/api/findings/[id]/enrich` has no tier check | `apps/web/app/api/findings/[id]/enrich/route.ts` | Free-tier users can exhaust AI quota without billing |
| 3 | **Case approval workflow unchecked** — `requiresApproval` field exists on VulnerabilityCase but status changes skip it | `apps/web/app/api/cases/[id]/route.ts` | Non-compliance with SOC 2 CC6.1 |
| 4 | **No session revocation** — no endpoint to invalidate sessions (password reset, security event) | `packages/auth/src/session/` | PCI DSS 8.1.4 violation |

### High Priority Issues

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 5 | **Trial hard-coded to 14 days** — no per-customer override or extension flow | `apps/web/app/api/cron/expire-trials/route.ts` | Can't extend trials for sales prospects |
| 6 | **No SAML SSO** — Enterprise tier advertises SSO but only Google OAuth implemented | `packages/auth/src/` | Enterprise sales blocked |
| 7 | **No onboarding flow** — after signup, user lands on empty dashboard with no guidance | `apps/web/app/(app)/dashboard/page.tsx` | High churn in first session |
| 8 | **Missing pricing page** — no public `/pricing` route found | `apps/web/app/(public)/` | Prospects can't self-serve compare tiers |
| 9 | **Test coverage at ~5%** — 40 unit tests for 128 routes and 201 components | `vitest.config.ts` targets 80% but actual is far below | Risky to ship changes; regressions likely |
| 10 | **GitHub OAuth incomplete** — only Google OAuth working | `packages/auth/src/` | Developer-audience signup friction |

### Minor Issues

| # | Issue | Location |
|---|-------|----------|
| 11 | `complianceScores` returns empty array (no compliance model in Prisma) | Schema gap |
| 12 | Demo route group `(demo)` duplicates dashboard logic | Could share components |
| 13 | Generic error messages on most API routes ("Internal server error") | Poor DX |
| 14 | ~~No 2FA backup codes implemented~~ FIXED | Security gap |
| 15 | Missing DB indexes: `Organization.createdAt`, `Finding.discoveredAt`, composite `(orgId, deletedAt)` | Query performance |

### What Works Well
- Stripe billing fully wired (webhooks, checkout, tier upgrades, usage metering)
- 11 scanner format parsers with magic-byte validation
- Enrichment pipeline (NVD + EPSS + KEV) with Redis caching
- Risk scoring with transparent breakdown
- 10 compliance frameworks with cross-framework CWE mapping
- POAM generation and export (CSV, PDF)
- Agentic CVE triage with tool-calling loop (7 tools, HITL gates, audit trail)
- Docker + Terraform + Cloud Run deploy pipeline
- RBAC permission matrix well-defined (10 roles, granular permissions)

---

## Revenue Generation Design & Build Plan

### Pricing Tiers (current)
| Tier | Price | Users | Assets | AI Calls | Key Features |
|------|-------|-------|--------|----------|-------------|
| FREE | $0 | 1 | 50 | 50/mo | Upload, dashboard, basic triage |
| FOUNDERS_BETA | $29/mo | 5 | 250 | 250/mo | API, Jira sync, custom SLA, webhooks |
| PRO | $149/mo | 10 | 1,000 | 1,000/mo | + scheduled reports, 14-day trial |
| ENTERPRISE | Custom | Unlimited | Unlimited | Unlimited | + SSO, custom parsers, multi-client |
| MSSP | Custom | Unlimited | Unlimited | Unlimited | + white label, usage billing |

### Revenue Strategy
**Target**: First 10 paying customers within 8 weeks. Focus on Founders Beta ($29/mo) and Pro ($149/mo).

**Audience**: Small-to-mid GRC teams (2-10 people) at companies with compliance requirements (SOC 2, HIPAA, PCI DSS, FedRAMP, CMMC). Veteran-owned businesses, defense contractors (CMMC), healthcare orgs (HIPAA), and SaaS companies (SOC 2).

### Build Plan — Revenue Waves

#### Wave R1: Revenue Blockers (Week 1-2) — SHIP OR DIE
Priority: Fix the 4 critical issues that prevent compliant operation.

**R1.1 — Enforce RBAC on all API routes**
- Wrap all `/api/admin/*` routes with `withRole('PLATFORM_ADMIN')`
- Wrap `/api/billing/*` mutations with `withPermission('org:manage_billing')`
- Wrap `/api/cases/[id]` mutations with `withPermission('cases:update')`
- Wrap `/api/findings/[id]/enrich` with `withPermission('ai:advisory')` + billing gate
- Add RBAC integration tests for each sensitive route
- Files: All routes in `apps/web/app/api/`, `packages/auth/src/rbac/middleware.ts`

**R1.2 — Enforce billing gates on AI endpoints**
- Add tier check to `/api/findings/[id]/enrich/route.ts`
- Add tier check to any agentic triage endpoints
- Return 402 with upgrade URL when limit exceeded
- File: `packages/billing/src/gate.ts`

**R1.3 — Wire case approval workflow**
- Check `requiresApproval` flag before status changes in `/api/cases/[id]/route.ts`
- If approval required, set status to `PENDING_APPROVAL` instead of final status
- Add `/api/cases/[id]/approve` endpoint with role check
- File: `apps/web/app/api/cases/[id]/route.ts`

**R1.4 — Session revocation endpoint**
- Add `/api/auth/revoke-sessions` to invalidate all sessions for a user
- Call on password change, security events
- File: `packages/auth/src/session/`

#### Wave R2: Signup Funnel (Week 2-3) — GET CUSTOMERS IN
Priority: Remove friction from the path to first upload.

**R2.1 — Public pricing page**
- Build `/pricing` with tier comparison table
- CTA buttons: "Start Free" → signup, "Start Trial" → Pro trial, "Contact Sales" → Enterprise
- Show feature matrix matching `packages/billing/src/config.ts` entitlements
- Highlight veteran-owned, compliance focus

**R2.2 — Onboarding flow**
- After first login, show guided wizard:
  1. "Upload your first scan" (drag-and-drop with format detection)
  2. "Review your findings" (link to findings page)
  3. "Set up compliance" (select frameworks: SOC 2, HIPAA, etc.)
  4. "Invite your team" (if tier allows)
- Store onboarding state in user preferences
- Dismissable, reachable from settings

**R2.3 — GitHub OAuth**
- Complete GitHub OAuth provider
- Developer audience expects GitHub login
- File: `packages/auth/src/`

**R2.4 — Trial extension admin flow**
- Add admin endpoint to extend/override trial dates per org
- Add UI in ops dashboard
- File: `apps/web/app/api/admin/`

#### Wave R3: Differentiation (Week 3-5) — WHY PAY FOR THIS
Priority: Features that justify $29-149/mo over free tools.

**R3.1 — Agentic triage reports**
- Expose the new tool-calling loop via UI: user clicks "AI Triage" on a case
- Show the agent's workflow: which tools it called, what data it gathered, confidence score
- Display compliance impact (affected controls per framework)
- Render risk score breakdown (base, EPSS multiplier, KEV boost, env factor)
- This is the primary differentiator vs competitors
- Files: `packages/agents/src/loop.ts`, `packages/agents/src/tools/`

**R3.2 — Automated triage on upload**
- After enrichment, auto-queue triage for CRITICAL/HIGH findings
- Show triage status on findings list (pending → complete → approved)
- Gate by tier: FREE gets manual triage only, FOUNDERS_BETA+ gets auto-triage

**R3.3 — Compliance dashboard with framework scores**
- Fix `complianceScores` returning empty array
- Compute real scores from finding data + framework assessments
- Show per-framework compliance posture (SOC 2: 78%, CMMC: 65%, etc.)
- Export as PDF for auditor handoff
- Files: `packages/compliance/src/frameworks/`, dashboard widgets

**R3.4 — Scheduled CVE intelligence digest**
- Daily/weekly email: new CVEs affecting your SBOM, KEV additions, EPSS score changes
- Gate by tier: PRO+ feature
- Uses enrichment pipeline + notification package
- Files: `packages/enrichment/`, `packages/notifications/`

#### Wave R4: Enterprise Sales Enablement (Week 5-7) — $$$
Priority: Features needed to close Enterprise/MSSP deals.

**R4.1 — SAML SSO**
- Implement SAML 2.0 provider (Okta, Azure AD, OneLogin)
- Enterprise tier gate
- Required for any org with >50 employees
- File: `packages/auth/src/`

**R4.2 — Multi-client portfolio view**
- MSSP customers manage multiple clients
- Portfolio dashboard: risk posture across all clients
- Per-client SLA tracking and compliance scores
- Files: `apps/web/app/(app)/portfolio/`, `packages/domain/`

**R4.3 — Scanner connector wizard**
- UI to configure Tenable/Qualys/Rapid7 API connections
- Test connection endpoint
- Auto-sync scheduling
- Files: `apps/web/app/(app)/settings/`, `packages/integrations/`

**R4.4 — Audit export for compliance evidence**
- Export audit log as PDF/CSV for SOC 2 / CMMC evidence packages
- Include: who triaged what, when, with what data, approval chain
- Leverages the new tool-call audit trail from agentic triage
- Files: `apps/web/app/api/export/`, `packages/agents/src/tools/audit-log.ts`

#### Wave R5: Testing & Hardening (Week 6-8) — DON'T BREAK IT
Priority: Protect revenue flows from regressions.

**R5.1 — API route tests for revenue paths**
- Test: signup → billing → upload → enrich → triage → export
- Test: RBAC enforcement (viewer can't triage, analyst can)
- Test: billing gates (free tier blocked from AI, pro tier allowed)
- Test: Stripe webhook processing (upgrade, downgrade, cancel)
- Target: 100% coverage on `/api/auth/`, `/api/billing/`, `/api/upload/`, `/api/cases/`

**R5.2 — E2E tests for critical flows**
- Expand Playwright suite:
  - Full onboarding flow
  - Scan upload → findings → AI triage → approval
  - Billing upgrade → feature unlock
  - Multi-user RBAC scenarios

**R5.3 — Production monitoring**
- Alert on: failed Stripe webhooks, upload processing errors, AI API failures
- Dashboard: conversion funnel (signup → upload → paid), MRR tracking
- Files: `packages/observability/`, `deploy/terraform/`

**R5.4 — Database index optimization**
- Add missing indexes: `Organization.createdAt`, `Finding.discoveredAt`, `(orgId, deletedAt)` composites
- Run EXPLAIN ANALYZE on top 10 queries
- File: `packages/domain/prisma/schema.prisma`

### Revenue Milestones

| Week | Milestone | Revenue Target |
|------|-----------|---------------|
| 2 | RBAC + billing gates enforced, safe to onboard users | $0 (foundation) |
| 3 | Pricing page live, onboarding flow, GitHub OAuth | First signups |
| 5 | AI triage in UI, compliance dashboard, auto-triage on upload | First paid conversions |
| 7 | SAML SSO, portfolio view, connector wizard | Enterprise pipeline |
| 8 | Test coverage on revenue flows, production monitoring | Stable MRR |

### Revenue Projections (Conservative)
- **Month 1**: 5 Founders Beta ($145/mo) + 2 Pro trials
- **Month 2**: 10 Founders Beta ($290/mo) + 3 Pro ($447/mo) = $737 MRR
- **Month 3**: 15 Founders Beta + 5 Pro + 1 Enterprise pipeline = $1,182 MRR + enterprise demo
- **Month 6**: Target $5K MRR (mix of Founders Beta, Pro, first Enterprise close)

### Go-To-Market Channels
1. **Content marketing**: Publish CVE intelligence on X (social automation already built), blog posts on compliance frameworks
2. **Veteran/defense networks**: CMMC compliance is mandatory for defense contractors — direct outreach
3. **Product Hunt / Hacker News**: Launch Founders Beta with "veteran-owned, AI-powered vulnerability management"
4. **Direct sales**: Enterprise/MSSP requires outbound — target GRC teams at SOC 2-compliant SaaS companies
5. **CLI as lead gen**: `@cveriskpilot/scan` (npx cveriskpilot-scan) → free CLI → upsell to platform

---

### Known Issues
- `complianceScores` returns empty array (scheduled for Wave R3.3)
- Demo route group `(demo)` duplicates dashboard logic — could share components better

### TODO
- **Verify security tool integration pipelines** — Confirm all connector adapters and integration pipelines are created, wired end-to-end, and functional for: Jira, JFrog, Trivy, Snyk, Nessus, Tenable, Qualys, CrowdStrike, Rapid7, ServiceNow, HackerOne, SIEMs (webhook). Includes: connector creation wizard, test endpoint, sync orchestration, webhook delivery, and scanner format parsers (11 formats: Nessus, SARIF, CSV, JSON, CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX).
