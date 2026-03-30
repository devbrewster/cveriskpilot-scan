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

## Save Point — 2026-03-30

### Version: 0.3.0-beta
Beta milestone. All core flows functional end-to-end. Security hardened (13 findings remediated).

### Build Status: GREEN
`npm run build` passes. Worker healthy on Cloud Run.

### Repo Stats
- **74 pages** (app + portal + demo + public)
- **116 API routes**
- **90 components** in `apps/web/src/components/`
- **25 packages** in `packages/`
- **43 E2E tests** (core flow, billing, AI remediation, demo)
- **5 scanner connectors** (Tenable, Qualys, CrowdStrike, Rapid7, Snyk)
- **10 RBAC roles** defined in schema + `packages/auth/src/rbac/permissions.ts`

### Completed Waves (0-12)
- **Waves 0-5** (commit `aa63986`): Full MVP scaffold — auth, upload, parsers, enrichment, dashboard, findings, cases, reports, compliance, POAM, portal, demo, billing, teams, clients, portfolio, settings, Terraform, Dockerfile, CI/CD
- **Wave 6**: Dashboard completeness — SLA widget, compliance scores, activity timeline, 6 stat cards + 5 widget rows
- **Wave 7**: Settings page completion — API keys, service accounts, IP allowlist, connector settings, notification prefs, webhook config, org profile
- **Wave 8**: RBAC enforcement in UI — role-aware sidebar, page guards, client switcher role checks
- **Wave 9**: Missing functional pages — billing, notifications, audit log, user management, asset inventory, risk exceptions
- **Wave 10**: Polish — security audit remediation (auth, RBAC, CSRF, MSSP isolation), CSP fix, build fixes
- **Wave 11**: Pipeline compliance scanner CLI (`@cveriskpilot/scan`) — 6 frameworks, offline-first, npx support
- **Wave 12**: Ops dashboard — internal staff monitoring, customer support tools

### Next Waves (pending)
- **Wave 13: Connectors Package** — Scanner adapter framework (`@cveriskpilot/connectors`), Tenable/Qualys/Rapid7 adapters, connector test endpoint, creation wizard
- **Wave 14: E2E Tests** — Playwright test coverage for critical flows (auth, upload, findings, cases)
- **Wave 15: Marketing Public Pages** — Port from legacy 2.0 repo
- **Wave 16: Production Hardening** — Cloud Armor tuning, PgBouncer, CDN, monitoring alerts

### Known Issues
- `complianceScores` returns empty array (no compliance model in Prisma schema yet)
- Demo route group `(demo)` duplicates dashboard logic — could share components better
