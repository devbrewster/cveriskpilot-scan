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
Beta milestone. All core flows functional end-to-end. Security hardened (13 findings remediated). Agentic tool-calling loop added to CVE triage agent (packages/agents/src/tools/ + loop.ts). Revenue Generation Plan (Waves R1-R5) fully implemented.

### Build Status: GREEN
`npm run build` passes. Worker healthy on Cloud Run.

### Repo Stats
- **76 pages** (app + portal + demo + public + pricing)
- **140+ API routes** (including health, cron, export, onboarding)
- **205+ components** in `apps/web/`
- **25 packages** in `packages/`
- **1171 tests** (unit + integration + security + revenue path)
- **11 scanner format parsers** (Nessus, SARIF, CSV, JSON, CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX)
- **5 scanner connectors** (Tenable, Qualys, CrowdStrike, Rapid7, Snyk)
- **10 RBAC roles** with granular permissions enforced on all mutation routes
- **7 agentic tools** for CVE triage (NVD, KEV, EPSS, CVSS, Compliance Map, Risk Score, Audit Log)
- **10 compliance frameworks** (NIST 800-53, CMMC, SOC2, FedRAMP, ASVS, GDPR, HIPAA, PCI DSS, ISO 27001, SSDF)
- **3 OAuth providers** (Google, GitHub, WorkOS SSO)

### Completed Waves (0-12 + R1-R5)
- **Waves 0-5** (commit `aa63986`): Full MVP scaffold — auth, upload, parsers, enrichment, dashboard, findings, cases, reports, compliance, POAM, portal, demo, billing, teams, clients, portfolio, settings, Terraform, Dockerfile, CI/CD
- **Wave 6**: Dashboard completeness — SLA widget, compliance scores, activity timeline, 6 stat cards + 5 widget rows
- **Wave 7**: Settings page completion — API keys, service accounts, IP allowlist, connector settings, notification prefs, webhook config, org profile
- **Wave 8**: RBAC enforcement in UI — role-aware sidebar, page guards, client switcher role checks
- **Wave 9**: Missing functional pages — billing, notifications, audit log, user management, asset inventory, risk exceptions
- **Wave 10**: Polish — security audit remediation (auth, RBAC, CSRF, MSSP isolation), CSP fix, build fixes
- **Wave 11**: Pipeline compliance scanner CLI (`@cveriskpilot/scan`) — 6 frameworks, offline-first, npx support
- **Wave 12**: Ops dashboard — internal staff monitoring, customer support tools
- **Wave R1**: Revenue blockers — RBAC enforced on 36+ routes, billing gates on AI endpoints, case approval workflow, session revocation
- **Wave R2**: Signup funnel — /pricing page, GitHub OAuth, onboarding checklist, trial extension admin endpoint
- **Wave R3**: Differentiation — AI triage UI on case detail, auto-triage on upload, compliance scores wired to dashboard, CVE digest cron
- **Wave R4**: Enterprise — SSO login button, CSV export (audit/cases/findings), connector wizard (already complete)
- **Wave R5**: Testing & hardening — 1171 tests, health check endpoints (live/ready/full), 8 DB indexes, 2FA backup codes

---

## Audit Findings — 2026-03-31

### Production Readiness: ~95%
All revenue-critical flows secured and tested. RBAC enforced on all mutation routes, billing gates on AI endpoints, approval workflow wired, session revocation available. Signup funnel complete with pricing page, 3 OAuth providers, and onboarding checklist.

### Critical Issues — ALL FIXED

| # | Issue | Status |
|---|-------|--------|
| 1 | RBAC not enforced on API routes | **FIXED** (Wave R1) — `requirePerm()` on 36+ routes |
| 2 | AI call billing gate not enforced | **FIXED** (Wave R1) — `checkBillingGate()` + 402 responses |
| 3 | Case approval workflow unchecked | **FIXED** (Wave R1) — `validateTransition()` with approval gates |
| 4 | No session revocation | **FIXED** (Wave R1) — `POST /api/auth/revoke-sessions` |

### High Priority Issues — ALL FIXED

| # | Issue | Status |
|---|-------|--------|
| 5 | Trial hard-coded to 14 days | **FIXED** (Wave R2) — `POST /api/admin/trials` for extensions |
| 6 | No SAML SSO | **FIXED** (Wave R4) — WorkOS SSO + OIDC + login button |
| 7 | No onboarding flow | **FIXED** (Wave R2) — onboarding checklist on dashboard |
| 8 | Missing pricing page | **FIXED** (Wave R2) — `/pricing` with plan cards + feature matrix |
| 9 | Test coverage at ~5% | **IMPROVED** (Wave R5) — 40 → 1171 tests |
| 10 | GitHub OAuth incomplete | **FIXED** (Wave R2) — full provider + routes + UI buttons |

### Minor Issues

| # | Issue | Status |
|---|-------|--------|
| 11 | `complianceScores` returns empty array | **FIXED** (Wave R3) — field name mismatch corrected |
| 12 | Demo route group `(demo)` duplicates dashboard logic | Open — shares components, low impact |
| 13 | Generic error messages on API routes | **FIXED** — specific messages on all revenue-critical routes |
| 14 | No 2FA backup codes implemented | **FIXED** (Wave R5) — generate, hash-store, verify, consume |
| 15 | Missing DB indexes | **FIXED** (Wave R5) — 8 indexes added |

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

## GTM Acceleration Plan — 2026-03-31

### Current GTM Assets (what's already built)

| Asset | Status | Sophistication |
|-------|--------|---------------|
| X automation (drafts + publish + schedule) | Live | High — Claude-powered research, ReACT autopilot, engagement feedback loop |
| Engagement analytics | Live | Medium — per-type metrics, best-hour tracking, 40 posts analyzed |
| Homepage + hero + social proof | Live | Medium — JSON-LD, structured data |
| Pricing page | Live | Medium — tier matrix, FAQ, JSON-LD |
| Government/CMMC vertical pages | Live | High — SDVOSB badge, CMMC countdown, NIST 800-171 mapping |
| Demo dashboard (no login) | Live | High — 27 sub-routes, realistic data, full product experience |
| CLI lead gen (`npx @cveriskpilot/scan`) | Live | High — offline, zero-config, 6 frameworks, npm ecosystem |
| Blog (4 posts) | Live | Medium — SEO metadata, OG tags, canonical URLs |
| Sitemap + robots.txt + SEO | Live | Medium — 17 pages indexed, AI crawlers blocked |
| Email templates (transactional) | Ready | Low — 4 templates built, no nurture sequences |
| API docs (OpenAPI spec) | Ready | Medium — spec exists, no public page |
| Content calendar (40 posts queued) | Live | High — 4 weeks pre-loaded, approval workflow |
| Brand voice guidelines | Live | High — detailed tone rules, forbidden phrases, platform-specific |

### GTM Gaps (money left on table)

#### Gap 1: CLI → Platform funnel is broken
The CLI (`npx @cveriskpilot/scan`) is a strong lead gen tool but has **no downstream conversion path**.
- No "upload these results to CVERiskPilot" CTA in CLI output
- No telemetry on CLI usage (how many runs/day?)
- No email capture at any point
- CLI findings aren't uploadable to the platform without manual reformatting

#### Gap 2: Email nurture doesn't exist
4 transactional templates built but **zero marketing/nurture sequences**:
- No welcome email after signup
- No "you haven't uploaded yet" re-engagement
- No weekly CVE digest (planned in R3.4 but not wired)
- No trial expiration warning emails
- No upgrade nudges when free-tier limits approached
- Blog has no subscribe CTA

#### Gap 3: Content amplification is single-channel
Social automation is sophisticated (X only) but:
- LinkedIn not automated (config exists but no publisher script)
- Blog posts not cross-posted to dev communities (HN, Reddit, dev.to, GitHub Discussions)
- No newsletter to distribute blog content
- No RSS feed for blog

#### Gap 4: No conversion tracking
- No analytics on signup → upload → paid funnel
- No A/B testing on pricing page or CTAs
- Engagement feedback tracks X metrics but not website conversions
- Can't answer "which X post drove the most signups?"

#### Gap 5: Demo → signup friction
Demo is excellent (27 routes, realistic data) but:
- No "Start your own" CTA inside the demo
- No comparison ("You're viewing demo data — upload your real scans")
- No email gate on demo access (missed lead capture)

### GTM Acceleration Waves

#### Wave G1: CLI-to-Platform Bridge (High Impact, Low Effort)

**G1.1 — CLI upload CTA**
After scan results, print:
```
┌─────────────────────────────────────────────────────┐
│  Upload these results to CVERiskPilot for:           │
│  • AI-powered triage with source citations           │
│  • Compliance mapping across 10 frameworks           │
│  • POAM generation for auditors                      │
│  • Team collaboration and SLA tracking               │
│                                                      │
│  → https://cveriskpilot.com/upload?ref=cli           │
│  Free tier: 50 assets, 50 AI calls/month             │
└─────────────────────────────────────────────────────┘
```
- File: `packages/scan/` — add to report output
- Track `?ref=cli` UTM param in signup flow

**G1.2 — CLI JSON export for platform upload**
- Add `--output json` flag that produces platform-compatible upload format
- Users can drag-drop the JSON into `/upload` page
- Reduces friction from "CLI user" to "platform user"

**G1.3 — CLI usage telemetry (opt-in)**
- Anonymous: framework used, finding counts, scan duration
- With consent: email for follow-up
- Respect `DO_NOT_TRACK` env var
- Gives data on: how many people use the CLI, what frameworks they care about

#### Wave G2: Email Nurture Sequences (High Impact, Medium Effort)

**G2.1 — Welcome sequence (5 emails over 14 days)**
1. Day 0: "Welcome — here's how to upload your first scan" (link to upload page)
2. Day 1: "Your scan results explained" (link to findings + what CVSS/EPSS/KEV mean)
3. Day 3: "Set up compliance tracking" (link to compliance frameworks page)
4. Day 7: "See what AI triage found" (link to case detail with triage results)
5. Day 12: "Your trial ends in 2 days — here's what you'll lose" (upgrade CTA)
- Files: `packages/notifications/src/email/templates.ts`, new cron job

**G2.2 — Re-engagement emails**
- "You haven't uploaded a scan in 7 days" (triggered by activity check)
- "New CVEs affecting your stack" (weekly, based on last SBOM)
- "Your compliance score changed" (triggered by new findings)
- Gate: only for active accounts, respect unsubscribe

**G2.3 — Billing lifecycle emails**
- Trial expiration warning (3 days, 1 day, expired)
- Usage approaching limit (80%, 95%, 100%)
- Payment failed / card expiring
- Upgrade confirmation with feature unlock summary

**G2.4 — Blog subscribe CTA**
- Add email capture form to blog layout
- "Get weekly CVE intelligence + compliance tips"
- Store subscribers in `Notification` preferences
- Weekly digest cron: new blog posts + top KEV additions

#### Wave G3: Content Amplification (Medium Impact, Low Effort)

**G3.1 — LinkedIn automation**
- Config already exists in `social/config.json` for LinkedIn
- Build `scripts/publish-linkedin-posts.mjs` mirroring X publisher
- Repurpose X content with longer-form expansion (600-1200 chars)
- Target: GRC professionals, CISOs, compliance managers

**G3.2 — Blog RSS feed**
- Add `/blog/rss.xml` route (Next.js API route generating RSS 2.0)
- Submit to: Feedly, Inoreader, dev.to RSS import
- Enables: newsletter tools, aggregators, automatic syndication

**G3.3 — Dev community cross-posting**
- After each blog post: auto-create discussion on GitHub repo
- Script to format blog post for Hacker News submission
- dev.to cross-post via API (canonical URL back to cveriskpilot.com)

**G3.4 — "Compliance Control of the Week" series**
- Automated X thread: pick a NIST 800-53 control, explain in plain English, map to CWEs
- Source data from `packages/compliance/src/mapping/nist-800-53.ts`
- 16 control families × 4+ controls each = 64+ weeks of content
- Establishes authority in compliance space

#### Wave G4: Conversion Optimization (Medium Impact, Medium Effort)

**G4.1 — Demo-to-signup bridge**
- Add persistent banner in demo: "This is sample data. Upload your real scans →"
- Add "Start Free" button to every demo page header
- Track demo page visits → signup conversion rate

**G4.2 — Pricing page A/B testing**
- Test: "Start Free" vs "Start 14-Day Pro Trial" as primary CTA
- Test: showing annual pricing first vs monthly
- Test: highlighting Founders Beta scarcity ("12 of 50 spots remaining")
- Use feature flags (`packages/rollout/`) for variant assignment

**G4.3 — Signup-to-upload analytics**
- Track funnel: visit → signup → first upload → first triage → paid conversion
- Add events at each step (use existing `packages/observability/`)
- Weekly report: where users drop off, time-to-first-upload, conversion rate by source

**G4.4 — UTM tracking across all channels**
- CLI: `?ref=cli`
- X posts: `?ref=x&post={id}`
- LinkedIn: `?ref=linkedin`
- Blog: `?ref=blog&slug={slug}`
- Demo: `?ref=demo`
- Store UTM source on Organization record for attribution

#### Wave G5: Vertical GTM (High Impact, High Effort)

**G5.1 — CMMC compliance package**
- Bundle: CLI scan + platform triage + POAM export + SPRS score
- Target: defense contractors with CMMC Level 2 deadline (Nov 10, 2026)
- Outreach: CMMC-AB marketplace listing, defense industry events, PTAC offices
- Content: "CMMC compliance in 30 days with CVERiskPilot" blog post + landing page
- Price: Pro tier ($149/mo) positioned as "fraction of consultant cost ($5K-50K)"

**G5.2 — SOC 2 readiness report**
- Free tool: upload scan → get SOC 2 gap analysis PDF
- Email-gated: requires signup to download
- Shows: which controls are affected, what to fix, estimated effort
- Upsell: "Track remediation progress with CVERiskPilot Pro"

**G5.3 — Healthcare compliance package**
- HIPAA-focused landing page (similar to /government and /cmmc)
- Highlight: PHI/ePHI risk assessment, HIPAA control mapping, breach notification workflow
- Target: healthcare IT teams, HIPAA security officers

**G5.4 — Partner/reseller program**
- For MSSPs and security consultants
- White-label option (MSSP tier already supports it)
- Revenue share: 20% recurring commission
- Onboarding: dedicated partner portal, co-branded reports

### GTM Priority Matrix

| Wave | Effort | Revenue Impact | Timeline |
|------|--------|---------------|----------|
| G1 (CLI bridge) | Low | High — converts existing CLI users | Week 1 |
| G2 (Email nurture) | Medium | High — reduces churn, drives upgrades | Week 1-2 |
| G3 (Content amplification) | Low | Medium — expands reach 3-5x | Week 2-3 |
| G4 (Conversion optimization) | Medium | High — improves funnel efficiency | Week 3-4 |
| G5 (Vertical GTM) | High | Very High — opens enterprise pipeline | Week 4-8 |

### Immediate Actions (this week)
1. Add CLI upload CTA to scan output (G1.1) — 30 min
2. Add blog email subscribe CTA (G2.4) — 1 hour
3. Add demo-to-signup banner (G4.1) — 1 hour
4. Add UTM tracking to signup route (G4.4) — 2 hours
5. Publish "Compliance Control of the Week" first post on X (G3.4) — use existing autopilot

---

### Known Issues
- `complianceScores` returns empty array (scheduled for Wave R3.3)
- Demo route group `(demo)` duplicates dashboard logic — could share components better

### TODO
- **Verify security tool integration pipelines** — Confirm all connector adapters and integration pipelines are created, wired end-to-end, and functional for: Jira, JFrog, Trivy, Snyk, Nessus, Tenable, Qualys, CrowdStrike, Rapid7, ServiceNow, HackerOne, SIEMs (webhook). Includes: connector creation wizard, test endpoint, sync orchestration, webhook delivery, and scanner format parsers (11 formats: Nessus, SARIF, CSV, JSON, CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX).
