# CVERiskPilot Combined SaaS Plan

## 1. Executive Summary

This document analyzes two existing repositories -- **CVERiskPilot 1.x** and **CVERiskPilot 2.0** -- and proposes a plan to combine the best features of both into a single, unified SaaS platform, guided by the **Enterprise VM Reference Report** (the authoritative planning and roadmap source of truth found in both repos).

The enterprise reference report defines the platform as a **workflow and data-normalization layer** that unifies vulnerability signals (SAST/SCA/DAST/IAST, IaC misconfiguration, container/image, cloud posture, external VM scanners, and bug bounty) into a **single, auditable remediation system** aligned to engineering delivery practices and enterprise governance.

This combined plan inherits the enterprise-ready depth of 1.x, the modern edge-native architecture of 2.0, and aligns all decisions to the enterprise reference report's requirements for: normalized ingestion (SARIF, OSV, CycloneDX/SPDX, CSAF), defensible prioritization (CVSS + EPSS + KEV), tight SDLC/ITSM integration, and strong tenant isolation with verifiable logging and compliance readiness.

### Governing Documents

Two authoritative reference documents govern this plan:

1. **Enterprise VM Reference Report** (`enterprise-vm-reference-report.md`) -- sole authority for vulnerability management domain: enrichment, scoring, SDLC integration, workflow states, compliance mapping, and phased rollout criteria.

2. **MSSP Multi-Tenant Architecture Reference** (`mssp-multi-tenant-architecture-reference.md`) -- authority for MSSP-specific architecture: tenant hierarchy, tenant switching, control plane vs data plane, deployment stamps, cross-tenant APIs, provider management plane, and tenant isolation patterns. Grounded in documented patterns from CrowdStrike Flight Control, Tenable MSSP Portal, Rapid7 Insight, Splunk SOAR, and Palo Alto Networks multi-tenant management, plus AWS SaaS Lens, Azure Well-Architected, and GCP enterprise multi-tenancy guidance.

If any derived doc conflicts with these references, the references win.

---

## 2. Repository Comparison

### 2.1 Tech Stack

| Aspect | 1.x | 2.0 | Recommendation |
|--------|-----|-----|----------------|
| **Framework** | Next.js 16 (App Router) | Next.js 15 (App Router) | Next.js 16 (latest, from 1.x) |
| **React** | React 19 | React 19 | React 19 |
| **Language** | TypeScript 5.7 | TypeScript 5.9 | TypeScript 5.9 (latest, from 2.0) |
| **Styling** | Tailwind CSS 3.4 + Radix UI | Tailwind CSS 4.1 + Radix UI + Lucide | Tailwind CSS 4.x + Radix UI + Lucide |
| **Database** | PostgreSQL 16 (Supabase) + Prisma ORM | Cloudflare D1 (SQLite) + raw SQL | **Cloud SQL for PostgreSQL** + Prisma ORM |
| **File Storage** | Database BLOBs | Cloudflare R2 (S3-compatible) | **Google Cloud Storage (GCS)** |
| **Runtime** | Node.js 20 (Vercel) | Cloudflare Workers (Edge) | **Cloud Run** (Node.js 20, containerized) |
| **Auth** | NextAuth v5 + WorkOS | Custom session management + WorkOS | **Google Identity Platform** (OIDC) + custom sessions + WorkOS (SAML) |
| **AI** | Anthropic SDK (Claude Sonnet) | Anthropic SDK (Claude) | Anthropic SDK (via **Vertex AI** or direct API) |
| **Email** | Resend | Resend | Resend (or migrate to **Google Workspace SMTP** for company domain) |
| **Billing** | Stripe | Stripe | Stripe |
| **Caching** | None | Basic enrichment cache | **Memorystore for Redis** |
| **Job Queue** | Fire-and-forget | Async claim/process | **Cloud Tasks** + **Pub/Sub** |
| **Secret Management** | ENV vars + master key | ENV vars | **Secret Manager** |
| **Testing** | Vitest + Playwright | Node.js native test | Vitest + Playwright |
| **CI/CD** | GitHub Actions | GitLab CI | **Cloud Build** (or GitHub Actions with GCP deploy) |
| **Monitoring** | Sentry + Prometheus | Cloudflare Observability | **Cloud Monitoring** + **Cloud Logging** + **Cloud Trace** (OpenTelemetry) |
| **CDN/Edge** | None | Cloudflare | **Cloud CDN** + **Cloud Armor** (WAF/DDoS) |
| **Key Management** | AES-256-GCM master key | None | **Cloud KMS** (envelope encryption, per-tenant keys, BYOK) |
| **Package structure** | Monolith (single package) | Monorepo (npm workspaces) | Monorepo (from 2.0) |

### 2.2 Architecture Comparison

| Aspect | 1.x | 2.0 |
|--------|-----|-----|
| **Structure** | Monolithic full-stack | Monorepo with domain packages |
| **API routes** | 77 REST route handlers | 136 route handlers |
| **Multi-tenancy** | `orgId` FK + Prisma helpers | `organizationId` from session, enforced per store |
| **Background jobs** | Fire-and-forget async | Async job-based (claim/process/complete pattern) |
| **Deployment** | Docker + Vercel | Cloudflare Workers (opennextjs-cloudflare) |
| **State machines** | Implicit in code | Documented canonical workflows (WORKFLOWS.md) |

### 2.3 Feature Matrix

| Feature | 1.x | 2.0 | Best Source |
|---------|-----|-----|-------------|
| **Scan Parsers** | 10 formats (Nessus, Qualys, OpenVAS, SARIF, CycloneDX, OSV, SPDX, CSAF, CSV, JSON) | 5 formats (JSON, SARIF, CSV, XLSX, Nessus XML) | **1.x** (broader coverage) |
| **Parser architecture** | Registry pattern with auto-detection | Registered parsers with CanonicalFinding normalization | **Combine**: 1.x registry + 2.0 canonical type |
| **Vulnerability dedup** | By CVE+host+port or title+host+port | Replay-safe (same artifact = same findings) | **Combine both** |
| **Finding workflow** | 6 statuses | 10 statuses (richer lifecycle) | **2.0** (more granular) |
| **Risk scoring** | CVSS + EPSS + KEV + custom factors | CVSS v2/3.0/3.1 + EPSS + KEV + CWE | **Combine both** |
| **AI remediation** | Claude with redaction + structured output + batch + approval | Claude advisory generation (optional) | **1.x** (more mature) |
| **Reporting** | PDF, CSV, scheduled email reports | Executive summary, JSON, CloudEvents | **1.x** (more formats) + **2.0** CloudEvents |
| **Jira integration** | Bi-directional sync + status mapping + cron | Bi-directional sync + bulk ops | **1.x** (deeper) |
| **SIEM export** | Basic endpoint | Bug bounty + SIEM export | **Combine both** |
| **Webhooks** | CloudEvents format + retry logic | Svix-managed | **2.0** (Svix is production-grade) |
| **MFA** | TOTP + backup codes | Passkeys (WebAuthn) + TOTP + recovery codes | **2.0** (passkeys are modern) |
| **SSO** | Google + GitHub + WorkOS (SAML/OIDC) | Google OIDC + WorkOS | **1.x** (more providers) |
| **Session management** | JWT (NextAuth) | Server-side sessions (D1/JSON) | **2.0** (server-side is more secure) |
| **RBAC** | 4 roles (OWNER, ADMIN, MEMBER, VIEWER) | 5 roles (viewer, analyst, owner, admin, platform_owner) | **2.0** (analyst role is useful) |
| **Asset management** | Full asset inventory with criticality, environment, owner | Asset context on findings | **1.x** (standalone asset model) |
| **SLA policies** | Per-severity configurable due dates + breach detection | No formal SLA system | **1.x** |
| **Risk exceptions** | Request/approve/reject/expiry workflow | Accepted risk as workflow state | **1.x** (formal workflow) |
| **Comments** | Vulnerability comments with mentions | No comments system | **1.x** |
| **Notifications** | In-app + email + digest batching + preferences | Audit events only | **1.x** (comprehensive) |
| **Data retention** | Configurable per entity type + soft delete | Configurable retention policies | **1.x** (more granular) |
| **Audit logging** | Action/entity/user/IP/metadata | Comprehensive auth/billing/findings/tickets events | **2.0** (broader coverage) |
| **Scan artifacts** | Immutable BLOBs with SHA256 | Immutable R2 objects with checksums | **2.0** (object storage) |
| **API keys** | `crp_*` prefix, scoped to org, with expiry | Session-based only | **1.x** |
| **Connectors** | Scanner agent system (heartbeat, config, key rotation) | No connector system | **1.x** |
| **IP allowlist** | Per-org IP restrictions | No IP allowlist | **1.x** |
| **Password policies** | Expiry + history + HaveIBeenPwned | bcrypt hashing + rate limit + lockout | **Combine both** |
| **CSP** | Per-request nonce | Allows unsafe-inline/eval | **1.x** (nonce-based) |
| **CSRF** | Origin validation | Not documented | **1.x** |
| **Billing** | Stripe with webhooks | 3-tier plan + entitlements + usage counters | **2.0** (usage tracking) |
| **POAM** | Not present | NIST 800-171 mapping + remediation tracking | **2.0** |
| **Compliance dashboards** | Not present | SOC 2 / SSDF / ASVS evidence collection | **2.0** |
| **Demo workspace** | Not present | Read-only demo with deterministic data | **2.0** |
| **Agent system** | Not present | Agent packages (cve-triage, product-engineer, etc.) - planned | **2.0** (future capability) |
| **Release management** | Not present | Release readiness dashboard + gating | **2.0** |
| **Rate limiting** | Per-org with plan-based limits | Per-IP/email on auth endpoints | **1.x** (broader) + **2.0** auth-specific |
| **Metrics/observability** | Prometheus endpoint + Sentry + structured logging | Cloudflare Observability | **1.x** (Prometheus is portable) |
| **Docker** | Multi-stage Dockerfile + compose | No Docker (Cloudflare native) | **1.x** (for self-hosted option) |
| **Testing** | 40+ unit tests (Vitest) + 4 E2E specs (Playwright) | Integration tests (native node:test) + smoke tests | **1.x** (Vitest/Playwright) + **2.0** smoke tests |

---

## 3. Strengths to Carry Forward

### From 1.x (Enterprise Depth)
1. **10-format scanner parser library** -- the broadest coverage including CycloneDX, SPDX, CSAF, OSV, OpenVAS, Qualys
2. **AI remediation system** -- Claude integration with host redaction, structured output, batch processing, approval workflow
3. **SLA policies** -- per-severity due dates with automated breach detection and notification
4. **Risk exception workflow** -- formal request/approve/reject lifecycle with expiration
5. **Comments & collaboration** -- vulnerability-level comments with @mention notifications
6. **Notification system** -- in-app + email + digest batching + per-user preference control
7. **Scanner connector/agent system** -- remote scanner agents with heartbeat, config push, key rotation
8. **API key management** -- `crp_*` prefixed keys scoped to org with expiry and revocation
9. **IP allowlist** -- per-org network access control
10. **PDF/CSV report generation** -- including scheduled email delivery
11. **CSP with nonce** -- proper Content Security Policy implementation
12. **Prisma ORM** -- type-safe database access with migrations
13. **Docker support** -- enables self-hosted/on-prem deployment option
14. **Comprehensive security** -- CSRF, password history, HaveIBeenPwned, idle timeout, account lockout

### From 2.0 (Modern Architecture)
1. **Monorepo structure** -- `packages/domain` for shared types, clean separation of concerns
2. **CanonicalFinding type** -- well-defined domain contract for normalized findings
3. **Documented state machines** -- canonical workflow definitions in WORKFLOWS.md
4. **Server-side sessions** -- more secure than JWT-only approach
5. **Passkey/WebAuthn support** -- modern passwordless authentication
6. **Object storage (R2)** -- scan artifacts in object storage instead of database BLOBs
7. **Async job pipeline** -- claim/process/complete pattern for upload processing
8. **Billing entitlements + usage counters** -- plan-gated features with per-org usage tracking
9. **POAM tracking** -- Plan of Action & Milestones with NIST 800-171 framework mapping
10. **Compliance dashboards** -- SOC 2, SSDF, ASVS evidence collection and tracking
11. **Demo workspace** -- read-only demo mode with deterministic test data
12. **Agent architecture** -- packages for AI agent orchestration (cve-triage, product-engineer)
13. **HITL gates** -- human-in-the-loop approval framework for agent outputs
14. **5-role RBAC** -- analyst role fills gap between viewer and admin
15. **Workflow lineage** -- immutable audit trail for finding state transitions with authority tracking
16. **Release readiness tracking** -- deployment gating with evidence collection
17. **Enrichment caching with TTL** -- configurable cache for NVD/KEV/EPSS lookups
18. **Remote smoke tests** -- tenant isolation and support intake drills against live environments

---

## 4. Gaps in Both vs. Enterprise Reference Report

The enterprise reference report specifies capabilities that neither codebase fully implements. These represent **new work required** to meet the enterprise-ready baseline.

| Gap | Reference Report Requirement | Status in 1.x | Status in 2.0 |
|-----|------------------------------|----------------|----------------|
| **Two-object data model (Finding + VulnerabilityCase)** | Separate "detection event" (Finding) from "deduplicated remediation unit" (VulnerabilityCase) with explicit linkage | Partially: has Finding + Vulnerability but tightly coupled | Partially: CanonicalFinding exists but no formal VulnerabilityCase |
| **Canonical JSON schema with OpenAPI contracts** | Publish VulnerabilityCase + Finding schemas; OpenAPI v3.1 for all endpoints | No OpenAPI spec | No OpenAPI spec |
| **SCIM provisioning** | Automated user provisioning/deprovisioning for enterprise offboarding | Not present | Not present |
| **Customer-deployed connectors (hybrid model)** | On-prem/VPC connectors for private network scanning, outbound-only TLS | 1.x has connector/agent system (partial) | Not present |
| **Event bus / stream architecture** | Event-driven ingestion with CloudEvents-shaped metadata | Fire-and-forget async | Basic async jobs |
| **Background job queue** | Reliable async processing for ingestion, enrichment, reporting | Ad-hoc async | Claim/process/complete but no formal queue |
| **Analytics / search index** | Separate search index for FTS on findings, cases, assets | Not present | Not present |
| **Remediation campaigns** | One fix closes multiple findings across services | Not present | Not present |
| **Verification hooks** | Rerun scans, validate SBOM changes, or validate runtime posture after fix | Not present | Not present |
| **CVSS v4 support** | Reference report specifies "v4 where available; maintain v3.x compatibility" | v3.x only | v2/3.0/3.1 only |
| **CPE product matching** | CPE naming for asset-to-CVE matching | Not present | Not present |
| **Customer portal** | Tenant-scoped dashboard, evidence of handling, communications history | Dashboard exists but not customer-portal shaped | Demo workspace exists |
| **ABAC (attribute-based access control)** | Optional policy-based rules for environments/data classes beyond RBAC | Not present | Not present |
| **Customer-managed keys (CMK/BYOK)** | Per-tenant cryptographic boundaries with key separation | Master encryption key only | Not present |
| **WAF and DDoS protection** | Front-door WAF, bot protection, rate limits at edge | Basic rate limiting | Auth-only rate limiting |
| **SLSA/supply chain attestations** | Provenance, tamper resistance for build pipelines and connectors | Not present | Not present |
| **VEX/CSAF advisory publishing** | Declare affected/not affected status to reduce vuln noise | Parses CSAF inbound but doesn't publish | Not present |
| **ServiceNow integration** | Table API CRUD for ITSM ticket sync (in addition to Jira) | Jira only | Jira only |
| **Bug bounty platform ingestion** | HackerOne/Bugcrowd API integration | Not present | Not present |
| **Cloud posture ingestion** | AWS Security Hub ASFF, cloud resource findings | Not present | Not present |
| **EDR/endpoint signals** | CrowdStrike-style endpoint posture ingestion | Not present | Not present |
| **OpenTelemetry observability** | Standardized metrics/logs/traces collection | Prometheus + Sentry | Cloudflare Observability |
| **Auditor/read-only role** | Reference report specifies: Tenant Owner, Security Admin, Analyst, Engineer, Auditor, API-only service account | No auditor role | No separate auditor role |
| **API-only service accounts** | Machine-to-machine auth for automation | API keys exist but not service account model | Not present |
| **Internationalization** | Not explicit but implied for global enterprise | Not present | Not present |

---

## 5. Architecture Decisions for the Combined Platform

### 5.1 Tenant Hierarchy & Data Model

The platform serves a **3-tier multi-tenancy model** that supports enterprises, MSSPs, and consultancies:

```
┌─────────────────────────────────────────────────────────────────────┐
│  PLATFORM LEVEL (you)                                               │
│  Platform Owner + Internal Team                                     │
│  - Cross-org analytics, billing, platform health                    │
│  - Agent dispatch, HITL queue, feature flags                        │
│  - Global enrichment cache (NVD/EPSS/KEV)                          │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ORG LEVEL (your customers / buyers)                          │  │
│  │  Organization + Internal Teams                                │  │
│  │  - Billing entity (Stripe subscription)                       │  │
│  │  - SSO/SCIM configuration boundary                           │  │
│  │  - SLA policies, integrations, retention policies             │  │
│  │  - Usage counters and plan entitlements                       │  │
│  │                                                               │  │
│  │  ┌──────────────────────────┐  ┌──────────────────────────┐  │  │
│  │  │  CLIENT A               │  │  CLIENT B                │  │  │
│  │  │  (org's customer)       │  │  (org's customer)        │  │  │
│  │  │                         │  │                          │  │  │
│  │  │  ┌─────┐ ┌─────┐       │  │  ┌─────┐ ┌─────┐        │  │  │
│  │  │  │Asset│ │Asset│ ...   │  │  │Asset│ │Asset│ ...    │  │  │
│  │  │  └─────┘ └─────┘       │  │  └─────┘ └─────┘        │  │  │
│  │  │  Findings, Cases,       │  │  Findings, Cases,        │  │  │
│  │  │  Reports, Tickets       │  │  Reports, Tickets        │  │  │
│  │  └──────────────────────────┘  └──────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  (repeat for each org)                                              │
└─────────────────────────────────────────────────────────────────────┘
```

#### Entity Relationships

| Entity | Belongs To | Description |
|--------|-----------|-------------|
| **Platform** | -- | The CVERiskPilot system itself. You are the platform owner. |
| **Organization** | Platform | A paying customer (enterprise, MSSP, consultancy). Billing + SSO boundary. |
| **Team** | Organization | Internal team within an org (e.g., "AppSec", "Infrastructure", "Cloud Security"). Users belong to teams. |
| **User** | Organization (via Membership) | A person. Has role(s) scoped to org. Can be on multiple teams. |
| **Client** | Organization | An org's customer/business unit (for MSSPs: "Acme Corp"; for enterprises: "Payments Division"). Data isolation boundary within the org. |
| **Asset** | Client | A scannable target (host, repo, container image, cloud account, application). Has criticality, environment, data classification. |
| **Finding** | Client + Asset | A raw detection event from a scanner. Links to an asset and a vulnerability case. |
| **VulnerabilityCase** | Client | A deduplicated remediation unit. Aggregates findings across assets. Workflow-managed. |
| **Ticket** | VulnerabilityCase | An ITSM work item (Jira, ServiceNow) linked to a case. |

#### Why 3-tier matters

| Scenario | How it works |
|----------|-------------|
| **Enterprise** (single company) | 1 Org, 0-1 Clients (or Clients = business units), many Assets. Teams = internal security/dev teams. |
| **MSSP** (manages security for others) | 1 Org, many Clients (each is a customer), each Client has their own Assets. MSSP teams triage across clients. |
| **Consultancy** (pen test / audit firm) | 1 Org, many Clients (engagement-scoped), each Client has Assets from that engagement. Reports are per-client. |
| **Your internal use** | Platform-level: you see all orgs. Your own org: you eat your own dogfood. |

#### Data isolation rules

```
Platform Admin  → can see all orgs (read-only analytics, billing, health)
Org Owner       → can see all clients + teams + assets within their org
Team Member     → can see clients/assets assigned to their team
Client Viewer   → can see only their client's assets + findings + reports
                  (for customer portal / client-facing dashboards)
```

Every database query is scoped by `organization_id` AND `client_id`. A finding for Client A is never visible to Client B, even within the same org. This is enforced at the repository/store layer (not UI), with automated isolation tests.

#### MSSP-Specific Patterns (per MSSP Architecture Reference)

The MSSP reference identifies patterns from CrowdStrike Flight Control, Tenable MSSP Portal, Rapid7 Insight, Splunk SOAR, and Palo Alto Networks that CVERiskPilot must implement:

**1. Control Plane vs Data Plane Separation**

```
┌────────────────────────────────────────────────────┐
│  CONTROL PLANE (shared, global)                     │
│  - Tenant registry & hierarchy                      │
│  - Entitlements / tier management                   │
│  - Config + feature flags (per tenant/tier)          │
│  - Provisioning orchestrator (onboarding pipeline)  │
│  - Usage metering → billing integration             │
│  - Audit log service                                │
│  - Identity / SSO configuration per tenant          │
│  - Policy engine (RBAC + ABAC rules)               │
└─────────────────────┬──────────────────────────────┘
                      │ tenant context (signed token)
                      ▼
┌────────────────────────────────────────────────────┐
│  DATA PLANE (tenant-scoped, all operations)         │
│  - Ingestion pipeline (parsers, normalization)      │
│  - Enrichment (NVD, EPSS, KEV)                     │
│  - Risk scoring engine                              │
│  - Findings / VulnerabilityCase storage             │
│  - Search / query API                               │
│  - Reporting + export                               │
│  - Connectors (scanners, SIEM, EDR, cloud)          │
└────────────────────────────────────────────────────┘
```

The control plane owns tenant lifecycle. The data plane carries tenant context as a first-class invariant on every operation.

**2. Tenant Switching / Pivot Workflow (MSSP Analyst UX)**

An MSSP analyst signs in once and can switch between customer contexts without re-authenticating. This is the core MSSP workflow from Tenable MSSP Portal and CrowdStrike Flight Control:

```
Analyst signs in → sees org-level dashboard (cross-client rollup)
  → clicks "Acme Corp" → all views scoped to Acme Corp's findings/assets
  → clicks "Widgets Inc" → context switches, all views now Widgets Inc
  → clicks "Portfolio" → back to cross-client risk view
```

Implementation: session carries `current_client_id` (switchable) alongside `organization_id` (fixed). Every API call reads `current_client_id` from session. Switching only updates this value -- no re-auth, no page reload of entire app.

**3. Global Intelligence vs Tenant-Scoped Data**

The MSSP reference recommends separating shared vulnerability intelligence from tenant-specific exposure:

| Data Type | Scoping | Examples | Storage |
|-----------|---------|----------|---------|
| **Global intelligence** | Shared across all tenants (no `tenant_id`) | CVE records, CVSS metrics, EPSS scores, KEV catalog, CWE definitions | `global_cve`, `global_epss`, `global_kev` tables (append-only, versioned) |
| **Tenant exposure** | Always keyed by `organization_id` + `client_id` | Assets, findings, vulnerability cases, risk scores, tickets, reports | `tenant_*` tables (partitioned by org_id) |

This is critical because: NVD/EPSS/KEV data is the same for every tenant. Duplicating it per tenant wastes storage and creates cache invalidation complexity. One global cache serves all tenants.

**4. Automated Tenant Onboarding Pipeline**

Per MSSP reference, onboarding is not "create a row" -- it's a multi-step provisioning workflow:

```
1. Control-plane registration
   → Create org/client, set tier, region, compliance flags, default policies

2. Identity bootstrap
   → Configure tenant's IdP (SAML/OIDC), create admin user, set roles
   → Each client can connect to a DIFFERENT SSO provider (per-tenant SSO)

3. Data-plane provisioning
   → Allocate resources per placement (pooled vs dedicated stamp)
   → Create GCS prefix or dedicated bucket for bridge tenants
   → Initialize Cloud KMS key ring for enterprise tenants

4. Integration onboarding
   → Configure scanner connectors, validate permissions
   → Apply global baseline config + tenant-specific overrides

5. Metering setup
   → Initialize usage counters, set plan entitlements
   → Wire Stripe customer/subscription
```

**5. Feature Flags per Tenant/Tier**

Both AWS and Azure recommend centralized feature flags over per-tenant code forks:

| Tier | Feature Flags |
|------|--------------|
| **Free** | Upload, basic dashboard, CSV export, 3 parser formats |
| **Pro** | All parsers, AI remediation, PDF reports, Jira integration, SLA policies |
| **Enterprise** | Dedicated resources (stamp), BYOK encryption, SCIM, ABAC, IP allowlist |
| **MSSP** | Multi-client, tenant switching, cross-client analytics, customer portal, white-label |

Flags stored in control-plane config, evaluated at API layer. No tenant-specific code branches.

### 5.2 Deployment Model: Google Cloud + Hybrid Isolation with Stamps

**Primary platform: Google Cloud Platform (GCP)**

The MSSP reference recommends a **hybrid isolation strategy**: pooled by default, with "deployment stamps" (dedicated infra) for enterprise/regulated tenants. This aligns with both the enterprise VM reference report's pool/bridge model and Azure's Deployment Stamps pattern:

#### Google Cloud Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Google Cloud Platform                           │
│                                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────────┐ │
│  │  Cloud CDN   │───►│ Cloud Armor   │───►│  Cloud Load Balancer       │ │
│  │  (static +   │    │ (WAF/DDoS/   │    │                            │ │
│  │   API cache) │    │  bot protect) │    └────────────┬───────────────┘ │
│  └─────────────┘    └──────────────┘                  │                  │
│                                                        ▼                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Cloud Run Services                              │  │
│  │                                                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│  │
│  │  │  Web App      │  │  API Gateway  │  │  WebSocket/SSE Gateway  ││  │
│  │  │  (Next.js)    │  │  (REST v1)    │  │  (scan progress, live   ││  │
│  │  │  Dashboard,   │  │  OpenAPI 3.1  │  │   dashboard updates)    ││  │
│  │  │  Portal       │  │  Cursor pag.  │  │                         ││  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘│  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                           │                                              │
│              ┌────────────┼────────────┐                                 │
│              ▼            ▼            ▼                                  │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────────────────────────┐   │
│  │  Cloud SQL    │ │ Memorystore│ │  Pipeline Workers (Cloud Run)    │   │
│  │  PostgreSQL   │ │  (Redis)   │ │                                  │   │
│  │  HA + read    │ │ Sessions,  │ │  Parser ──► Enrichment ──► Case  │   │
│  │  replicas     │ │ cache,     │ │  Worker     Workers      Builder │   │
│  │               │ │ rate limit │ │       ▲          ▲          ▲     │   │
│  │  PgBouncer    │ │            │ │       │          │          │     │   │
│  │  connection   │ └────────────┘ │  Cloud Tasks + Pub/Sub          │   │
│  │  pooling      │                │  (priority queues, fan-out,     │   │
│  └──────────────┘                │   DLQ, retry w/ backoff)        │   │
│                                   └──────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Cloud Storage │ │  Cloud KMS   │ │Secret Manager│ │  Cloud        │   │
│  │ (GCS)        │ │  Per-tenant  │ │ API keys,    │ │  Monitoring   │   │
│  │ Raw artifacts│ │  key rings,  │ │ credentials, │ │  + Logging    │   │
│  │ + reports    │ │  BYOK/CMK    │ │ auto-rotate  │ │  + Trace      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ │  (OTel)       │   │
│                                                      └──────────────┘   │
│  Identity Platform ◄── Google OIDC (primary auth)                       │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Deployment Tiers

| Tier | GCP Implementation | Use Case | Billing Tier |
|------|-------------------|----------|-------------|
| **Pooled (default)** | Shared Cloud SQL, shared GCS (prefix isolation), shared Cloud Run, RLS + `organization_id` | Free + Pro customers, long-tail tenants | Free, Pro |
| **Dedicated Stamp** | Dedicated Cloud SQL instance, dedicated GCS bucket, dedicated Cloud KMS key ring, shared Cloud Run | Regulated enterprise, government, financial services | Enterprise |
| **MSSP Stamp** | Shared Cloud SQL with schema-per-org option, dedicated GCS, per-client SSO config | MSSPs managing 10+ clients | MSSP |
| **Hybrid Connector** | Customer-deployed connector (Docker) communicates outbound to Cloud Run APIs over TLS | Private network scanners, air-gapped asset discovery | Enterprise, MSSP |
| **Self-hosted** | Docker Compose + PostgreSQL + S3-compatible storage (customer infra) | Air-gapped / extreme regulatory | Enterprise |

**Stamp scaling model** (per MSSP reference): Each stamp serves a predefined number of tenants. Scale by adding stamps. The control plane routes requests to the correct stamp based on tenant placement config. This contains blast radius -- a failure in one stamp doesn't affect tenants on other stamps.

#### Why Google Cloud

| Advantage | Detail |
|-----------|--------|
| **Google OIDC native** | Your company Google Workspace accounts work as the primary auth provider; Google Identity Platform handles OIDC flows, token verification, and session management natively |
| **API key management** | GCP API keys + Secret Manager for all service credentials; no custom key management infrastructure |
| **Streamlined billing** | Single GCP billing account; consolidated costs across compute, storage, database, networking |
| **Cloud SQL for PostgreSQL** | Managed PostgreSQL with automated backups, HA, read replicas, IAM-based auth |
| **Cloud KMS** | Per-tenant envelope encryption, BYOK/CMK support, HSM-backed keys for enterprise |
| **Cloud Armor** | WAF + DDoS protection at the edge (enterprise reference report requirement) |
| **Cloud Tasks + Pub/Sub** | Proper job queue for ingestion, enrichment, AI analysis, report generation |
| **Vertex AI** | Option to call Claude via Vertex AI (Google-managed billing, no separate Anthropic account needed) |
| **Data residency** | Multi-region and single-region configurations for compliance |
| **OpenTelemetry** | Cloud Monitoring + Logging + Trace with native OTel support (enterprise reference report requirement) |

### 5.2 Project Structure: Monorepo

Adopt 2.0's monorepo approach with clearer package boundaries:

```
/
├── apps/
│   ├── web/                    # Next.js SaaS application
│   │   ├── app/                # App Router pages + API routes
│   │   ├── src/
│   │   │   ├── features/       # Feature-organized React components
│   │   │   └── lib/            # App-specific utilities
│   │   └── tests/              # Integration + E2E tests
│   └── docs/                   # Documentation site (optional)
├── packages/
│   ├── domain/                 # Shared types, enums, contracts (CanonicalFinding, etc.)
│   ├── parsers/                # Scanner format parsers (all 10+ formats from 1.x)
│   ├── enrichment/             # NVD, EPSS, KEV enrichment with caching
│   ├── ai/                     # Claude integration (remediation, triage, advisory)
│   ├── agents/                 # Agent orchestration (from 2.0 packages)
│   ├── auth/                   # Auth logic (sessions, MFA, SSO, policies)
│   ├── storage/                # Storage adapters (D1/PostgreSQL, R2/S3)
│   ├── notifications/          # Notification engine (in-app, email, webhooks)
│   ├── billing/                # Stripe integration + entitlements + usage
│   ├── compliance/             # POAM, SOC 2, SSDF, ASVS tracking
│   └── shared/                 # Common utilities, validators, logger
├── deploy/
│   ├── cloud-run/              # Cloud Run service configs, Dockerfiles
│   ├── cloud-build/            # cloudbuild.yaml CI/CD pipelines
│   ├── terraform/              # GCP infrastructure as code (Cloud SQL, GCS, KMS, etc.)
│   └── docker-compose/         # Self-hosted deployment option
├── docs/                       # Architecture, workflows, compliance, operations
├── scripts/                    # Release, migration, seed scripts
└── security_reports_bundle/    # Test fixtures
```

### 5.4 Canonical Data Model (per Reference Report + 3-Tier Hierarchy)

The enterprise reference report mandates a **two-object data model** (Finding + VulnerabilityCase). Combined with the 3-tier tenant hierarchy:

#### Core Entities

```
Platform
 └── Organization (billing + SSO boundary)
      ├── Team (internal group)
      │    └── TeamMembership (user ↔ team)
      ├── Client (org's customer or business unit)
      │    ├── Asset (scannable target)
      │    │    └── Finding (raw detection event, tool-shaped)
      │    │         └── case_link → VulnerabilityCase
      │    ├── VulnerabilityCase (deduped remediation unit, org-shaped)
      │    │    ├── WorkflowLineage (immutable state transitions)
      │    │    ├── Ticket (Jira/ServiceNow link)
      │    │    ├── Remediation (AI-generated guidance)
      │    │    ├── Comment (team collaboration)
      │    │    └── RiskException (accepted risk with expiry)
      │    └── Report (executive, detail, remediation plan)
      ├── ScanArtifact (immutable raw file in GCS)
      ├── UploadJob (async pipeline state)
      ├── SlaPolicy (per-severity due dates)
      ├── IntegrationCredential (Jira, webhooks, etc.)
      ├── ApiKey (scoped to org, crp_* prefix)
      ├── Connector (scanner agent)
      └── AuditLog (tamper-resistant event trail)
```

#### Scoping Rules (enforced at repository layer)

| Query Scope | SQL Filter | Use Case |
|-------------|-----------|----------|
| **Platform-wide** | No org filter (platform_admin only) | Cross-org analytics, billing, health |
| **Org-wide** | `WHERE organization_id = ?` | Org owner sees all clients |
| **Client-scoped** | `WHERE organization_id = ? AND client_id = ?` | Team member sees assigned clients |
| **Asset-scoped** | `WHERE organization_id = ? AND client_id = ? AND asset_id = ?` | Drill into specific target |

#### VulnerabilityCase (per reference report)

```json
{
  "id": "vc_01J6S4J9KJ9KQG6P3W2KZC8Q9T",
  "organization_id": "org_4f2c1d",
  "client_id": "cli_8a3b2e",
  "title": "Outdated log4j in payments-service",
  "vuln_ids": { "cve": ["CVE-2021-44228"], "osv": [], "cwe": ["CWE-502"] },
  "severity": {
    "cvss": { "version": "4.0", "base_score": 9.3, "vector": "..." },
    "epss": { "score": 0.71, "as_of": "2026-03-27" },
    "kev": { "listed": true, "due_date": "2026-04-03", "source": "CISA_KEV" }
  },
  "asset_context": {
    "environment": "production",
    "internet_exposed": true,
    "business_criticality": "high",
    "data_classification": "confidential",
    "service": "payments-service",
    "deployment_refs": [{ "type": "kubernetes", "cluster": "prod-us-1", "namespace": "payments" }]
  },
  "workflow": {
    "status": "in_remediation",
    "owner": { "type": "team", "id": "team_appsec" },
    "assigned_to": "user_8321",
    "sla_policy_id": "sla_enterprise",
    "due_at": "2026-04-03T23:59:59Z",
    "exceptions": []
  },
  "remediation": {
    "recommended_action": "Upgrade dependency and rebuild image",
    "ai_advisory": { "model": "claude-sonnet", "generated_at": "...", "approved": true },
    "tickets": [{ "system": "Jira", "key": "SEC-1842", "url": "..." }],
    "verification": { "required": true, "evidence": [] }
  },
  "finding_count": 47,
  "first_seen_at": "2026-03-18T12:10:00Z",
  "last_seen_at": "2026-03-27T08:00:00Z"
}
```

#### Finding (per reference report)

```json
{
  "id": "fd_01J6S4M2Q2QJH9B3Q6K1Y5W1G7",
  "organization_id": "org_4f2c1d",
  "client_id": "cli_8a3b2e",
  "asset_id": "ast_payments_prod",
  "source": { "type": "SCA", "name": "trivy", "run_id": "scan_2026-03-27.001", "ingested_at": "..." },
  "artifact_id": "art_01J6S4...",
  "observations": {
    "package": { "name": "log4j-core", "version": "2.14.1", "ecosystem": "maven" },
    "vuln_ids": { "cve": ["CVE-2021-44228"], "cwe": ["CWE-502"] },
    "evidence": { "type": "sbom_match", "confidence": "high" }
  },
  "dedup_key": "sha256(org+client+cve+asset+port)",
  "case_link": { "vulnerability_case_id": "vc_01J6S4J9KJ9KQG6P3W2KZC8Q9T" }
}
```

#### Workflow states (from reference report state machine)

```
New -> Triage -> In_Remediation -> Fixed_Pending_Verification -> Verified_Closed
                                                              -> Reopened -> In_Remediation
       Triage -> Accepted_Risk -> Review_At_Expiry -> Triage
       Triage -> False_Positive
       Triage -> Not_Applicable (with VEX rationale)
       Triage -> Duplicate (link to canonical case)
```

#### API contract (OpenAPI v3.1, per reference report)

```
POST   /v1/orgs/{orgId}/clients/{clientId}/findings:ingest    (idempotent batch)
GET    /v1/orgs/{orgId}/clients/{clientId}/vulnerability-cases (cursor pagination)
GET    /v1/orgs/{orgId}/vulnerability-cases                    (cross-client view)
PATCH  /v1/orgs/{orgId}/vulnerability-cases/{caseId}           (triage actions)
POST   /v1/orgs/{orgId}/webhooks                               (CloudEvents subscriptions)
GET    /v1/orgs/{orgId}/clients                                (list clients)
GET    /v1/orgs/{orgId}/clients/{clientId}/assets              (list assets)
GET    /v1/orgs/{orgId}/teams                                  (list teams)
POST   /v1/orgs/{orgId}/exports                                (async export job)
GET    /v1/orgs/{orgId}/dashboard/summary                      (materialized view)
```

### 5.5 Database Strategy (Industry Patterns for Scale)

Patterns below are drawn from how Tenable, Snyk, Wiz, Datadog, and CrowdStrike handle multi-tenant security data at scale.

#### Primary Database: Cloud SQL for PostgreSQL 16

| Pattern | Implementation | Why |
|---------|---------------|-----|
| **Prisma ORM** | Type-safe queries + managed migrations | From 1.x; eliminates 2.0's ad-hoc ALTER TABLE pattern |
| **Composite indexes** | `(organization_id, client_id)` as leading columns on all tables | Partition pruning; every query scoped to tenant |
| **Row-level security** | PostgreSQL RLS policies set via `SET app.current_org` per connection | Defense-in-depth; even a SQL injection can't cross tenants |
| **Table partitioning** | Range-partition findings by quarter: `findings_2026_q1`, `findings_2026_q2` | 8K+ CVEs per scan * multiple clients * weekly scans = millions of rows fast |
| **Connection pooling** | PgBouncer in transaction mode (200-500 pool, per-org budgets) | Prevents connection exhaustion from concurrent scans |
| **Read replicas** | Reporting and dashboard queries hit replica; writes go to primary | Heavy report generation for 8K CVE scans doesn't block API |
| **Lag-aware routing** | After scan completion, route user reads to primary for 30s | Read-your-writes consistency for "my scan just finished" |
| **JSONB columns** | `evidence`, `enrichment`, `asset_context`, `observations` | Flexible schema for scanner-specific fields without schema migrations |
| **Full-text search** | GIN-indexed `tsvector` on vulnerability title, description, CVE ID | Searching across 8K+ findings in a client; graduate to Elasticsearch later if needed |
| **Materialized views** | Pre-computed dashboard aggregates, refreshed every 5-15 min | Dashboard for 8K CVEs can't do live aggregation on every page load |

```sql
-- Materialized view pattern (how Tenable/Qualys serve dashboards)
CREATE MATERIALIZED VIEW vulnerability_summary AS
SELECT
  organization_id, client_id, severity, status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE first_seen_at > NOW() - INTERVAL '7 days') as new_7d,
  COUNT(*) FILTER (WHERE sla_breached) as sla_breached,
  AVG(EXTRACT(EPOCH FROM (resolved_at - first_seen_at))/86400)
    FILTER (WHERE resolved_at IS NOT NULL) as mttr_days
FROM vulnerability_cases
GROUP BY organization_id, client_id, severity, status;

-- Concurrent refresh doesn't lock reads
REFRESH MATERIALIZED VIEW CONCURRENTLY vulnerability_summary;
```

#### Caching: Memorystore for Redis (5-layer pattern)

| Layer | What | TTL | Invalidation |
|-------|------|-----|-------------|
| **L1: In-process** | Severity mappings, CVSS vector defs, KEV catalog (small lookups) | App lifetime | Restart on deploy |
| **L2: Redis - sessions** | Server-side sessions, CSRF tokens | Configurable (1-24h) | Explicit logout/expiry |
| **L3: Redis - enrichment** | NVD CVE data, EPSS scores | 24h (NVD), 24h (EPSS daily) | TTL-based; bulk refresh cron |
| **L4: Redis - dashboard** | Materialized view results, stats counters | 5-15 min | Event-driven invalidation on scan completion |
| **L5: Redis - rate limiting** | Per-org, per-user, per-IP counters | Sliding window | Auto-expire |

**Critical for 8K+ CVE scans**: An 8K finding scan with 200 unique CVEs hits the NVD cache, not the NVD API. Second scan of same environment: **zero NVD calls**.

#### File Storage: Google Cloud Storage (GCS)

| Bucket | Content | Isolation | Retention |
|--------|---------|-----------|-----------|
| `{env}-scan-artifacts` | Immutable raw scan files (Nessus XML, SARIF, CSV) | Prefix: `orgs/{orgId}/clients/{clientId}/` | 90-180 days (configurable) |
| `{env}-reports` | Generated PDF/CSV reports | Prefix: `orgs/{orgId}/clients/{clientId}/` | 1-3 years |
| `{env}-exports` | Async bulk export files | Prefix: `orgs/{orgId}/` | 7 days (auto-delete) |

- Signed URLs for secure download (no direct GCS access)
- Lifecycle policies enforce retention per-bucket
- Bridge tenants get dedicated buckets
- SHA-256 checksums for immutable artifact integrity

#### Schema: Combined Entity List

**From 1.x** (25 models): Organization, User, Membership, Scan, Vulnerability, Finding, ScanArtifact, Asset, Remediation, Comment, Report, AuditLog, RiskException, Notification, NotificationPreference, WebhookEndpoint, WebhookDelivery, IntegrationCredential, JiraStatusMapping, SlaPolicy, ApiKey, Connector, PasswordHistory, ReportSchedule, Account/Session/VerificationToken.

**Added from 2.0**: WorkflowLineage, POAMRecord, NistControl, UsageCounter, BillingAuditEvent, TenantAlert, Passkey, AuthAuditEvent.

**New for 3-tier model**: Client, TeamMembership, ClientTeamAssignment (which teams can see which clients).

**Enhanced**: Finding model gains 2.0's CanonicalFinding fields (evidence, enrichment, analysis as JSONB). VulnerabilityCase replaces Vulnerability with reference report schema. 10-state workflow replaces 6-state.

### 5.6 Ingestion Pipeline (designed for 8K+ CVE reports)

Industry pattern: streaming pipeline with fan-out enrichment, inspired by how Tenable, Qualys, and Snyk process millions of findings.

#### Pipeline Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│  UPLOAD (immediate response, < 2s)                                    │
│  POST /v1/orgs/{orgId}/clients/{clientId}/findings:ingest             │
│  1. Validate file (MIME, size ≤ 100MB, extension)                     │
│  2. Store raw artifact → GCS (immutable, SHA-256)                     │
│  3. Create UploadJob record (status: queued)                          │
│  4. Publish to Pub/Sub topic: "scan-ingestion" (priority P1)         │
│  5. Return { upload_id, job_id, status: "queued" }                    │
│  6. Open SSE stream for progress (optional)                           │
└──────────────────────────┬────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STAGE 1: PARSE (Cloud Run Job, auto-scaled)                          │
│  Triggered by: Pub/Sub message                                        │
│  Concurrency: 1 per upload, max 20 concurrent across platform         │
│                                                                       │
│  1. Stream file from GCS (don't load 80MB into memory)                │
│  2. Detect format (registry pattern from 1.x)                         │
│  3. Parse in chunks of 500 findings                                   │
│  4. Extract unique CVE set (8K findings → ~200-500 unique CVEs)       │
│  5. Batch-insert Findings to PostgreSQL (1000/batch, COPY command)    │
│  6. Publish to Pub/Sub: "enrichment-needed" with unique CVE list      │
│  7. Update job status: "parsed" + emit SSE progress event             │
│                                                                       │
│  Performance: 8K findings parsed in ~8-15s                            │
└──────────────────────────┬────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STAGE 2: ENRICH (Cloud Run workers, fan-out, 10-50 concurrent)       │
│  Triggered by: Pub/Sub message with CVE list                          │
│                                                                       │
│  ┌─────────────────────┐  All run in PARALLEL per unique CVE batch:  │
│  │ Check Redis cache   │  ← most CVEs already cached (24h TTL)       │
│  │ for each CVE        │                                              │
│  └────────┬────────────┘                                              │
│           │ cache miss                                                │
│           ▼                                                           │
│  ┌─────────────────────┐ ┌──────────────┐ ┌────────────────────────┐ │
│  │ NVD API             │ │ EPSS bulk    │ │ KEV catalog            │ │
│  │ (50 req/s with key) │ │ (single call │ │ (local cache,          │ │
│  │ CVSS v2/3.x/4.0    │ │  for all     │ │  refreshed daily)      │ │
│  │ Batched by 20 CVEs  │ │  CVEs)       │ │                        │ │
│  └─────────────────────┘ └──────────────┘ └────────────────────────┘ │
│           │                     │                    │                │
│           └─────────────────────┴────────────────────┘                │
│                                 │                                     │
│                                 ▼                                     │
│  Write enrichment → PostgreSQL + Redis cache                          │
│  Update job status: "enriched" + emit SSE progress event              │
│                                                                       │
│  Performance (500 unique CVEs):                                       │
│    Cache hit: ~1s | Cache miss: ~10s (NVD) + ~2s (EPSS) = ~12s      │
└──────────────────────────┬────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STAGE 3: CASE BUILDER (Cloud Run Job)                                │
│  Triggered by: enrichment completion event                            │
│                                                                       │
│  1. Group findings → VulnerabilityCases (dedup by CVE+asset+client)  │
│  2. Merge with existing open cases (idempotent upsert)                │
│  3. Compute risk scores (CVSS + EPSS + KEV + asset criticality)       │
│  4. Apply SLA policies → set due dates                                │
│  5. Detect SLA breaches on existing cases                             │
│  6. Refresh materialized views (dashboard aggregates)                 │
│  7. Trigger notifications (new critical, SLA breach, etc.)            │
│  8. Update job status: "completed" + emit SSE event                   │
│                                                                       │
│  Performance: ~10-20s for 8K findings → 500 cases                    │
└──────────────────────────┬────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STAGE 4: AI ANALYSIS (Cloud Tasks, throttled, async)                 │
│  Triggered by: Cloud Tasks scheduled messages                         │
│  NOT blocking -- user sees findings immediately after Stage 3         │
│                                                                       │
│  1. Filter: only Critical + High severity with KEV or EPSS ≥ 0.5    │
│     (typically 100-300 of 8K findings)                                │
│  2. Batch 5 CVEs per Claude API call                                  │
│  3. Rate-limited: max 10 concurrent calls across platform             │
│  4. Structured output: risk assessment, actions, fix, verification    │
│  5. Host info redacted before sending to Claude                       │
│  6. Results saved as draft → require approval before visible          │
│                                                                       │
│  Performance: ~5-15 min for 200 critical CVEs (async, non-blocking)  │
└───────────────────────────────────────────────────────────────────────┘
```

#### End-to-End Timing for 8K+ CVE Report

| Scenario | Parse | Enrich | Build Cases | Total (user sees results) | AI (async) |
|----------|-------|--------|-------------|---------------------------|------------|
| **Repeat scan** (all CVEs cached) | 8-15s | ~1s | 10-20s | **~30s** | 5-15 min |
| **New scan** (500 unique CVEs, cold) | 8-15s | ~12s | 10-20s | **~45s** | 5-15 min |
| **First-ever massive scan** (2000 unique CVEs) | 8-15s | ~45s | 15-30s | **~90s** | 10-20 min |

#### Progressive UI (how Datadog/CrowdStrike show live data)

Users don't stare at a spinner for 90 seconds. The UI updates progressively:

```
Upload received ✓                          (immediate)
Parsing: 3,247 / 8,000 findings...         (SSE stream, updates every 500)
Parsing complete: 8,127 findings found ✓   (~10s)
Enriching: 347 / 512 unique CVEs...        (SSE stream)
Enrichment complete ✓                      (~25s)
Building cases: 489 cases created ✓        (~40s)
Dashboard ready — 23 Critical, 89 High     (navigable now)
AI analysis: 45 / 156 critical CVEs...     (background, non-blocking)
```

#### Queue Design (industry patterns)

| Queue (Pub/Sub Topic) | Priority | Max Concurrent | DLQ | Retry |
|----------------------|----------|----------------|-----|-------|
| `scan-ingestion` | P1 (interactive) | 20 per platform | Yes | 3x exponential + jitter |
| `scan-ingestion-bulk` | P3 (scheduled/API) | 10 per platform | Yes | 5x exponential |
| `enrichment` | P2 | 50 per platform, 5 per org | Yes | 5x exponential |
| `case-building` | P2 | 20 per platform | Yes | 3x exponential |
| `ai-analysis` | P3 | 10 per platform, 2 per org | Yes | 3x exponential |
| `notifications` | P2 | 30 per platform | Yes | 5x exponential |
| `report-generation` | P3 | 5 per platform, 1 per org | Yes | 3x exponential |
| `webhook-delivery` | P2 | 20 per platform | Yes | 7x (1s,5s,30s,2m,15m,1h,6h) |

**Weighted fair queuing**: Each org gets a fair share of worker capacity. An MSSP uploading 50 client scans simultaneously doesn't starve a single-client enterprise running one scan.

**Tenant-aware concurrency**: Redis-based distributed semaphores limit concurrent jobs per org (e.g., max 5 concurrent scan pipelines per org on Pro plan, 20 on Enterprise).

#### Idempotent Ingestion (per reference report)

Every finding gets a deterministic dedup key:
```
dedup_key = SHA-256(organization_id + client_id + cve_id + asset_id + port)
```

Re-uploading the same scan file produces the same findings and dedup keys. Existing cases get their `last_seen_at` updated and `occurrence_count` incremented -- no duplicates created. This enables safe retry and at-least-once delivery.

### 5.7 Authentication Architecture

**Primary auth: Google Identity Platform** -- leverages your existing Google Workspace accounts and OIDC infrastructure.

| Method | Provider | Use Case |
|--------|----------|----------|
| **Google OIDC** (primary) | Google Identity Platform | Company users, Google Workspace customers |
| **SAML/OIDC federation** | WorkOS | Enterprise customers with their own IdP (Okta, Azure AD, etc.) |
| **Email/password** (fallback) | Custom (server-side sessions in Redis) | Customers without SSO |
| **GitHub OAuth** | Direct | Developer-focused onboarding |
| **SCIM provisioning** | WorkOS or Google Cloud Identity | Automated user lifecycle (enterprise reference report requirement) |
| **Service accounts** | GCP IAM service accounts + API keys | Machine-to-machine / CI/CD automation |

**MFA** (layered on all methods):
- Passkeys/WebAuthn (2.0) -- modern passwordless
- TOTP (both) -- standard authenticator apps
- Backup/recovery codes (both)

**Session management**: Server-side sessions stored in Memorystore (Redis), replacing both 1.x's JWT-only and 2.0's D1/JSON approach.

**Security policies** (from 1.x): Password expiry + history, HaveIBeenPwned breach check, rate limiting (per-org + per-user + per-IP via Redis), account lockout, IP allowlist per org, CSRF protection with nonce-based CSP, idle session timeout.

**Key simplification**: Using Google as the primary IdP means your team authenticates with existing Google Workspace credentials -- no separate account management. API keys for service integrations are managed via GCP Secret Manager.

### 5.8 RBAC Model (3-Tier, per Reference Report)

Roles are scoped to levels within the tenant hierarchy:

#### Platform Level (your internal team)

| Role | Scope | Capabilities |
|------|-------|-------------|
| **platform_admin** | All orgs | Cross-org analytics, billing oversight, feature flags, agent dispatch, system health |
| **platform_support** | Assigned orgs | View org data for support cases (read-only, audit-logged) |

#### Organization Level (your customers' teams)

| Role | Scope | Capabilities |
|------|-------|-------------|
| **org_owner** | Entire org | Billing, SSO/SCIM config, team management, client management, API keys, data retention, compliance dashboards |
| **security_admin** | Entire org | SLA policies, integrations (Jira/ServiceNow), scanner connectors, enrichment config, all clients visible |
| **analyst** | Assigned clients | Triage, assign, comment, create tickets, run AI analysis, manage risk exceptions |
| **developer** | Assigned clients | View assigned findings, comment, mark as fixed, view remediation guidance |
| **viewer** | Assigned clients | Read-only access to findings, tickets, reports, audit logs |
| **service_account** | Org-wide or client-scoped | Machine-to-machine auth for CI/CD scanners and automation (no UI) |

#### Client Level (customer portal access)

| Role | Scope | Capabilities |
|------|-------|-------------|
| **client_admin** | Single client | View all findings/reports for their client, manage client-level settings |
| **client_viewer** | Single client | Read-only dashboard, reports, SLA status for their client |

#### How scoping works

```
User "alice@mssp.com" has role "analyst" assigned to clients ["acme-corp", "widgets-inc"]
  → Alice can triage findings for Acme Corp and Widgets Inc
  → Alice CANNOT see findings for "bigbank" (not assigned)
  → Alice CANNOT change org billing (not org_owner)

User "bob@acme.com" has role "client_viewer" for client "acme-corp"
  → Bob sees only Acme Corp's dashboard via customer portal
  → Bob CANNOT see other clients, org settings, or team data

Service account "ci-scanner@mssp.iam" has scope "client:acme-corp"
  → Can POST findings only for Acme Corp assets
  → Cannot read/write any other client's data
```

#### Team-based assignment

Teams group users and are assigned to clients. This determines what data team members can see:

```
Team "AppSec" → assigned to clients ["acme-corp", "widgets-inc"]
  → All members of AppSec team can see findings for those two clients
  → When "bigbank" is onboarded, assign the team to the new client

Team "Infrastructure" → assigned to clients ["acme-corp"]
  → Only see infrastructure-related findings for Acme Corp
```

#### Authorization Model: RBAC + ABAC (per MSSP Reference)

**RBAC** handles product roles (who can do what). **ABAC** encodes tenant boundary rules and contextual constraints:

| ABAC Constraint | Rule | Example |
|----------------|------|---------|
| **Tenant scope** | `resource.org_id == subject.org_id` | Prevent cross-org access |
| **Client scope** | `resource.client_id IN subject.managed_clients` | MSSP analyst sees only assigned clients |
| **Provider cross-tenant** | `subject.role == 'platform_admin' AND action == 'read'` | Platform-level read-only analytics |
| **Tier entitlement** | `org.tier >= feature.required_tier` | Pro features blocked for Free tier |
| **Data classification** | `subject.clearance >= resource.data_classification` | Restrict access to "confidential" assets |
| **Environment** | `resource.environment IN subject.allowed_environments` | Analyst restricted to production findings |

Per MSSP reference: cross-tenant API operations for provider roles require explicit privileged scopes (`managed_tenants` list), ABAC constraints, and mandatory audit logging of every cross-tenant action.

**Tenant context propagation**: Tenant context is established at the API gateway from the authenticated principal + tenant selection (switching). Propagated through services via signed token claims (`tenant_id`, `provider_id`, `managed_tenants`) and non-sensitive correlation tags in tracing/logging (`tenant_hash`, `tenant_tier`). Enforced at every data access path.

---

## 6. SDLC Integration Points (per Reference Report)

The platform must "meet developers where they work" while preserving governance. High-value control points:

| CI/CD Stage | Integration | Format | Implementation Source |
|-------------|-------------|--------|----------------------|
| **Pre-commit / pre-push** | Secrets scanning (Gitleaks) | JSON | New |
| **Pull request / merge request** | SAST, SCA, IaC scanning; policy gates on severity/KEV | SARIF | 1.x parsers |
| **Build** | Container scanning (Trivy/Grype), SBOM generation | CycloneDX/SPDX | 1.x parsers |
| **Deploy** | Admission policies, config drift checks | JSON + policy metadata | New |
| **Post-deploy** | DAST (ZAP), continuous VM, cloud posture, bug bounty intake | Various | Partially 1.x |

### Standard formats to support (per Reference Report)

| Format | Purpose | Current Support |
|--------|---------|-----------------|
| **SARIF 2.1.0** | Static analysis results interchange (SAST) | 1.x + 2.0 parsers |
| **OSV** | Open source vulnerability records | 1.x parser |
| **CycloneDX** (ECMA-424) | SBOM component inventories | 1.x parser |
| **SPDX** | SBOM component inventories | 1.x parser |
| **CSAF/VEX** | Security advisories, affected/not-affected declarations | 1.x parser (inbound); publish capability needed |

### Integration Matrix (per Reference Report)

| Category | Target Tools | Mechanism | Status |
|----------|-------------|-----------|--------|
| **SAST** | SARIF-producing tools, GitHub code scanning | Push (CI upload) | 1.x parser exists |
| **SCA / dependency** | OWASP Dependency-Check, Dependency-Track | Push or pull | 1.x parsers (CycloneDX/OSV) |
| **DAST** | OWASP ZAP automation | Push (pipeline) | New work needed |
| **IaC** | Checkov, tfsec | Push (pipeline) | New work needed |
| **Secrets scanning** | Gitleaks | Push (pre-commit/CI) | New work needed |
| **Container/image** | Trivy, Grype | Push or pull | 1.x parsers exist |
| **Infrastructure VM** | Tenable, Qualys, Rapid7, Nessus | Pull (scheduled export) | 1.x parsers (Nessus, Qualys, OpenVAS) |
| **Cloud posture** | AWS Security Hub ASFF | Pull/push | New work needed |
| **Bug bounty** | HackerOne, Bugcrowd APIs | Pull + webhook | New work needed |
| **SIEM / log pipelines** | Splunk HEC | Push (CloudEvents) | Partial (1.x SIEM endpoint + 2.0 CloudEvents) |
| **EDR / endpoint** | CrowdStrike APIs | Pull | New work needed |
| **ITSM / change mgmt** | Jira REST, ServiceNow Table API | Bi-directional | 1.x (Jira); ServiceNow is new |

## 7. Compliance Requirements Mapping (per Reference Report)

| Control Theme | SOC 2 | ISO 27001 | PCI DSS | HIPAA | GDPR |
|--------------|-------|-----------|---------|-------|------|
| **Governance & risk** | Trust Services Criteria | ISMS continual improvement | Operational + technical baselines | Administrative safeguards | Accountability, privacy by design |
| **Identity & access** | Logical access, least privilege, SSO | Access control policies | Strong access controls | Technical safeguards | Risk-based access controls |
| **Audit logging** | Evidence of control monitoring | Monitoring/logging controls | Logging/monitoring | Audit controls | Incident documentation |
| **Encryption & key mgmt** | Confidentiality controls | Cryptography controls | Protect account data | Encrypt ePHI (risk-based) | Security measures |
| **Vuln mgmt & patching** | Demonstrable process | Managed security processes | Ongoing vuln management | Risk management | Security of processing |
| **Incident response** | Operational readiness | Incident procedures | IR for payment environments | Breach notification (unsecured PHI) | 72-hour notification |
| **Data retention & deletion** | Confidentiality commitments | Lifecycle controls | Evidence retention | Record retention | Storage limitation principle |
| **Vendor/subprocessor** | Common expectation | Supplier controls | Third-party management | Business associate obligations | Processor/subprocessor contracting |

### Privacy, Data Retention, and Anonymization (per Reference Report)

**Data classes** (separate retention per class):
- **Raw evidence** (scanner output, request/response, code excerpts) -- highest sensitivity; 90-180 day default
- **Normalized case metadata** (IDs, titles, severity, timestamps) -- lower sensitivity; 1-3 year default
- **Aggregated metrics** (counts, MTTR, SLA attainment) -- lowest sensitivity but tenant-sensitive; 1-7 year default
- **Audit logs** -- 1-7 years (SOX/HIPAA compliance); from 1.x: 2555 days (7 years)

**Anonymization patterns**:
- Tokenize user identifiers in raw findings
- Hash hostnames/URLs for aggregate reporting (reversible only for tenant admins)
- Redact secrets and credentials during ingestion (integrate secret detection)

### Sample SLA Policy (per Reference Report)

| Severity | Criteria | Remediation Target |
|----------|----------|-------------------|
| **Critical** | KEV-listed OR (EPSS >= 0.5 AND CVSS >= 9.0) | **7 days** |
| **High** | CVSS >= 7.0 | **30 days** |
| **Medium** | CVSS 4.0-6.9 | **90 days** |
| **Low** | CVSS < 4.0 | **180 days** |

Exceptions: documented accepted risk with expiry + re-review; false positives require evidence; "not applicable" requires VEX-style rationale.

## 8. MVP Shipping Plan

### 8.1 MVP Philosophy

**Ship the core value loop first. Gate everything else behind "Coming Soon."**

The core value loop is:
> Upload scan → See prioritized findings (EPSS/KEV enrichment) → Triage → Export report

Users pay for this because their scanner gives them 8,000 CVEs with no prioritization. CVERiskPilot tells them **which 50 matter this week** and gives them an AI-written remediation plan and an executive report they can hand to leadership.

**What the MVP is NOT:**
- Not the full enterprise reference report (that's the 12-month roadmap)
- Not multi-client/MSSP (that's growth -- start with single-org)
- Not AI agents (that's differentiation for v2)
- Not ServiceNow/SCIM/ABAC (that's enterprise upsell)

### 8.2 MVP Scope: What Ships

**Target: 6-8 weeks to first paying users**

#### Auth & Onboarding (week 1-2)

| Feature | Detail | Source |
|---------|--------|--------|
| Google OIDC sign-in | Primary auth -- your users already have Google accounts | 2.0 + GCP |
| Email/password fallback | For users without Google | 2.0 |
| TOTP MFA | Standard 2FA (passkeys can wait) | Both |
| Org creation on signup | Auto-create org for new user | Both |
| Invite team members | Email invite with role assignment | 1.x |
| 3 roles: Owner, Analyst, Viewer | Simple RBAC (expand later) | Simplified |
| Session management (Redis) | Server-side sessions | 2.0 |

#### Upload & Parse (week 2-4)

| Feature | Detail | Source |
|---------|--------|--------|
| Scan upload (drag & drop) | Accept files up to 100MB | Both |
| **5 parsers** (not 10): Nessus XML, SARIF, CSV, JSON, CycloneDX | Most common formats; others "Coming Soon" | 1.x + 2.0 |
| Streaming parse via Pub/Sub | Handles 8K+ CVEs without timeout | New |
| Progress indicator | Simple polling (SSE is nice-to-have for MVP) | Simplified |
| CanonicalFinding normalization | All formats → same schema | 2.0 |
| Dedup by CVE+asset | Idempotent upsert with dedup key | Both |
| Finding → VulnerabilityCase grouping | Two-object model from reference report | Reference report |
| Raw artifact stored in GCS | Immutable, SHA-256 checksum | 2.0 |

#### Enrichment (week 3-4)

| Feature | Detail | Source |
|---------|--------|--------|
| NVD lookup (CVSS v3.x) | Batch by unique CVEs, not per-finding | Both |
| Bulk EPSS scoring | Single API call for all unique CVEs | Both |
| CISA KEV check | Download catalog daily, match locally | Both |
| Redis enrichment cache (24h TTL) | Repeat scans are instant | New |
| Risk score computation | CVSS + EPSS + KEV combined score | Both |

#### Dashboard & Findings (week 3-5)

| Feature | Detail | Source |
|---------|--------|--------|
| Dashboard: severity breakdown, KEV count, EPSS top-10, SLA status | Single page with key metrics | Both |
| Findings list with filters | Severity, status, KEV, EPSS threshold, CVE search | Both |
| Finding detail view | CVSS vector, EPSS score, KEV status, affected assets, raw evidence | Both |
| Vulnerability case detail | Aggregated findings, timeline, status | New |
| Status workflow (simplified) | New → Triaged → In Remediation → Fixed → Verified + Accepted Risk / False Positive | Reference report (simplified) |
| Bulk status update | Select multiple → change status | 1.x |
| Basic text search on CVE ID, title | PostgreSQL `LIKE` or `tsvector` | New |

#### AI Remediation (week 4-5)

| Feature | Detail | Source |
|---------|--------|--------|
| "Get Remediation" button on case detail | On-demand, not automatic | 1.x |
| Claude API call with host redaction | Structured output: risk, actions, fix, verification | 1.x |
| Results shown inline on case | No approval workflow for MVP -- just display | Simplified |
| Rate limit: 50 AI calls/day (Free), 500 (Pro) | Usage counter in Redis | New |

#### Reporting (week 5-6)

| Feature | Detail | Source |
|---------|--------|--------|
| CSV export of findings (filtered) | Download current view as CSV | 1.x |
| Executive summary PDF | One-page: severity counts, KEV exposure, top risks, EPSS highlights | 1.x |
| Per-scan comparison | "What's new since last scan" diff view | 1.x |

#### Billing (week 5-7)

| Feature | Detail | Source |
|---------|--------|--------|
| 2 tiers: Free + Pro | Keep it simple; Enterprise/MSSP tiers later | Simplified |
| Free: 3 uploads/month, 1 user, 50 AI calls | Enough to evaluate | New |
| Pro: unlimited uploads, 10 users, 500 AI calls, $49/mo | Price to validate | New |
| Stripe Checkout + customer portal | Self-service upgrade/cancel | Both |
| Usage counter: uploads, AI calls | Enforce limits at API layer | 2.0 |

#### Infrastructure (week 1-2, parallel)

| Component | MVP Implementation | Full Version Later |
|-----------|-------------------|-------------------|
| **Compute** | Cloud Run (single service + 1 worker) | Multiple workers, SSE gateway |
| **Database** | Cloud SQL PostgreSQL (single instance, no replica) | HA + read replicas + PgBouncer |
| **Cache** | Memorystore Redis (basic tier) | Standard tier + connection pooling |
| **Storage** | GCS (single bucket with org prefix) | Per-tier buckets + lifecycle policies |
| **Queue** | Cloud Tasks (single queue) | Pub/Sub + priority queues + DLQ |
| **Secrets** | Secret Manager | Same |
| **CI/CD** | Cloud Build (single pipeline) | Staged rollout (dev/staging/prod) |
| **Monitoring** | Cloud Logging + basic alerts | Full OTel + Cloud Monitoring SLOs |
| **WAF** | Cloud Armor (basic rules) | Full OWASP + bot protection |
| **IaC** | Terraform (core resources) | Full infra-as-code |

### 8.3 Coming Soon: What's Visible but Not Available

These features appear in the UI with a "Coming Soon" badge or locked icon. They signal product direction and create upgrade motivation.

#### Coming Soon (next 2-3 months after MVP)

| Feature | UI Indicator | Why It Waits |
|---------|-------------|-------------|
| **Jira Integration** | Settings → Integrations → "Jira (Coming Soon)" | Needs bi-directional sync done right; high support burden if buggy |
| **SLA Policies** | Settings → "SLA Policies (Coming Soon)" | Core value works without it; add when users ask for accountability |
| **Client Management** (multi-client / MSSP) | Sidebar → "Clients (Coming Soon)" | Only matters for MSSP users; validate single-org first |
| **Team Management** | Settings → "Teams (Coming Soon)" | 3 roles + invite is enough for MVP |
| **Scheduled Reports** | Reports → "Schedule (Coming Soon)" | Manual export works; automation is growth |
| **Email Notifications** | Profile → "Notification Preferences (Coming Soon)" | In-app is fine for small teams |
| **Webhooks** | Settings → Integrations → "Webhooks (Coming Soon)" | API-first users need this but it's not day-1 |
| **API Keys** | Settings → "API Access (Coming Soon)" | Session auth works; API keys unlock CI/CD integration |
| **Passkeys/WebAuthn** | Profile → Security → "Passkeys (Coming Soon)" | TOTP is good enough; passkeys are polish |
| **Additional Parsers** (Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX) | Upload → format selector shows locked formats | Shows breadth of vision; ship most common 5 first |
| **Risk Exceptions** | Case detail → "Request Exception (Coming Soon)" | Workflow complexity; not needed until orgs have policies |
| **Comments** | Case detail → "Discussion (Coming Soon)" | Single-user and small teams don't need it day 1 |
| **AI Remediation Batching** | Findings list → "Batch AI Analysis (Coming Soon)" | Per-case AI works; batch is optimization |

#### Coming Later (3-6 months)

| Feature | UI Indicator | Why It Waits |
|---------|-------------|-------------|
| **Customer Portal** | N/A (no UI yet) | Requires client model; MSSP-tier feature |
| **POAM / Compliance Dashboards** | N/A or top-nav "Compliance (Coming Soon)" | Enterprise feature; needs customer demand signal |
| **ServiceNow Integration** | Settings → Integrations → "ServiceNow (Coming Soon)" | Enterprise only; Jira first |
| **SCIM Provisioning** | Settings → SSO → "SCIM (Coming Soon)" | Enterprise SSO feature |
| **Bug Bounty Ingestion** | Upload → "Connect HackerOne (Coming Soon)" | Niche; needs API partnership |
| **Cloud Posture** | Upload → "Connect AWS Security Hub (Coming Soon)" | Requires cloud-specific adapter |
| **SIEM Export** | Settings → Integrations → "SIEM (Coming Soon)" | Enterprise feature |
| **AI Agents** | N/A | Differentiation feature; needs HITL infrastructure |
| **Scanner Connectors** | Settings → "Scanners (Coming Soon)" | Requires agent deployment model |

#### Coming Later (6-12 months, MSSP + Enterprise roadmap, per MSSP Architecture Reference)

| Feature | Category | Notes |
|---------|----------|-------|
| **MSSP multi-client model** with client switching workflow | MSSP | Full 3-tier hierarchy; analyst signs in once, pivots between clients (CrowdStrike Flight Control pattern) |
| **Cross-client portfolio dashboard** | MSSP | Aggregated risk view across all managed clients |
| **Per-tenant SSO** (each client gets own IdP) | MSSP | Each managed client connects to their own SAML/OIDC provider |
| **Customer portal** (client_viewer role) | MSSP | Client's own staff see their scoped dashboard |
| **White-labeling** (brand customization per org) | MSSP | UI/brand theming via control-plane config, not code forks |
| **Automated tenant onboarding pipeline** | MSSP | Multi-step provisioning: identity bootstrap → data-plane allocation → integration setup → metering |
| **Enterprise + MSSP billing tiers** | Billing | Usage-based pricing per-client; metered by assets, findings, AI calls |
| **Deployment stamps** (dedicated infra per enterprise) | Enterprise | Dedicated Cloud SQL + GCS + KMS key ring per tenant stamp |
| **Per-tenant encryption (Cloud KMS BYOK)** | Enterprise | Customer-managed keys for regulated tenants |
| **ABAC policy engine** | Enterprise | Attribute-based access control for tenant boundaries, data classification, environment scoping |
| **Data residency controls** | Enterprise | Regional Cloud SQL instances; tenant placement in control plane |
| **Deployment rings** (canary → early adopter → GA) | Operations | Progressive rollout with feature flags per tenant/tier |
| **Materialized views + read replicas + PgBouncer** | Scale | Required when single-org findings exceed 50K |
| **Full streaming pipeline with SSE progress** | Scale | Performance at high concurrent scan volume |
| **OpenAPI v3.1 interactive docs** | DX | Developer experience for API consumers |
| **Tenant-aware observability** (dashboards by tenant/tier) | Operations | Cloud Monitoring SLOs, per-tenant health views |
| **Cursor-based pagination** | Scale | Offset is fine for MVP; cursor needed at >100K findings |
| **Per-tenant backup/restore** | Enterprise | PITR per stamp; tenant-scoped export for pooled model |

### 8.4 MVP Cut Decisions (and why)

These are the hard calls -- things from the full plan that are explicitly OUT of MVP:

| Cut | Why | Risk of Cutting | Mitigation |
|-----|-----|-----------------|------------|
| **3-tier hierarchy → single org** | MSSP model adds 3-4 weeks of schema, RBAC, and UI complexity | Can't serve MSSPs at launch | Add client model in month 2-3; schema supports it from day 1 (add `client_id` column nullable, default to "default" client) |
| **10 parsers → 5 parsers** | Each parser needs testing with real-world files; diminishing returns past top 5 | Users with Qualys/OpenVAS/SPDX can't upload | "Coming Soon" + accept CSV as universal fallback (any scanner can export CSV) |
| **Streaming SSE progress → polling** | SSE gateway is extra infrastructure; polling is 10 lines of code | Less polished UX for large uploads | Poll `/api/jobs/{id}/status` every 2s; show progress bar |
| **5-layer cache → 2-layer cache** | Full caching is premature optimization for < 100 orgs | Slightly slower enrichment on cold cache | Redis for enrichment + sessions. Add layers when needed. |
| **PgBouncer → direct connections** | Not needed at MVP scale (< 50 concurrent connections) | None at MVP scale | Add when concurrent connections > 100 |
| **Materialized views → live queries** | With < 10 orgs, live dashboard queries are fine (< 50ms) | None at MVP scale | Add when single-org findings exceed 50K |
| **Priority queues + DLQ → single queue** | One Cloud Tasks queue handles MVP volume | No priority differentiation | Split when interactive vs batch contention appears |
| **Read replicas → single instance** | Reporting load is negligible at MVP scale | None | Add when reporting queries slow down writes |
| **Row-level security → app-level scoping** | RLS is defense-in-depth; app-level `WHERE org_id = ?` is sufficient with good middleware | Slightly less defense-in-depth | Add RLS when onboarding enterprise customers |
| **Remediation approval workflow → direct display** | Approval adds UX complexity; users want answers fast | AI output shown without review | Add "accuracy" feedback button; track quality |
| **SLA policies → no SLAs** | SLAs require policy engine, cron jobs, breach detection | Users can't track remediation deadlines | Manual "due date" field on cases; formalize in month 2 |

### 8.5 Schema Strategy: Build for Growth, Ship for MVP

The database schema should support the full 3-tier model from day 1, but the MVP UI only uses part of it:

```prisma
// Ship in MVP schema, but UI only shows simplified version
model Organization {
  id          String   @id @default(cuid())
  name        String
  plan        Plan     @default(FREE)
  // ... billing fields
}

model Client {
  id              String       @id @default(cuid())
  organizationId  String
  name            String       @default("Default")  // MVP: auto-created "Default" client
  // ... client fields
  organization    Organization @relation(...)
}

model Asset {
  id        String @id @default(cuid())
  clientId  String
  // ... asset fields
  client    Client @relation(...)
}

model Finding {
  id              String @id @default(cuid())
  organizationId  String  // Denormalized for query performance
  clientId        String  // Points to "Default" client in MVP
  assetId         String
  // ... finding fields
}

model VulnerabilityCase {
  id              String @id @default(cuid())
  organizationId  String
  clientId        String  // Points to "Default" client in MVP
  // ... case fields
}
```

**Why this matters**: When you add multi-client support in month 3, you don't need a schema migration. You just:
1. Let users create additional clients
2. Show the client selector in the UI
3. The `client_id` column already exists on every table

### 8.6 MVP Feature Map (what users see)

```
┌─────────────────────────────────────────────────────────────┐
│  CVERiskPilot                              [user] [org] [?] │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ Dashboard│  ┌─ Severity Breakdown ──┐  ┌─ KEV Exposure ──┐ │
│          │  │ Critical: 23          │  │ 12 KEV-listed   │ │
│ Findings │  │ High:     89          │  │ 3 overdue       │ │
│          │  │ Medium:   312         │  │                  │ │
│ Reports  │  │ Low:      1,847       │  └─────────────────┘ │
│          │  └───────────────────────┘                       │
│ Upload   │  ┌─ EPSS Top 10 ────────┐  ┌─ Recent Scans ──┐ │
│          │  │ CVE-2024-... 0.97     │  │ scan_mar27  8127 │ │
│ Settings │  │ CVE-2023-... 0.89     │  │ scan_mar20  7934 │ │
│          │  │ ...                   │  │ scan_mar13  8201 │ │
│ ──────── │  └───────────────────────┘  └─────────────────┘ │
│ Clients  │                                                   │
│ (Soon)   │                                                   │
│ Teams    │                                                   │
│ (Soon)   │                                                   │
│          │                                                   │
├──────────┼──────────────────────────────────────────────────┤
│          │  Findings (8,127)  [Filter ▾] [Search CVE...]    │
│          │  ┌────────────────────────────────────────────┐  │
│          │  │ ● CVE-2024-3094  Critical  EPSS:0.97  KEV │  │
│          │  │   xz-utils 5.6.0  │  14 assets  │ New     │  │
│          │  │                                            │  │
│          │  │ ● CVE-2021-44228  Critical  EPSS:0.97  KEV│  │
│          │  │   log4j-core 2.14  │  47 assets │ Triaged │  │
│          │  │                                            │  │
│          │  │ ● CVE-2023-44487  High  EPSS:0.82         │  │
│          │  │   http/2 rapid reset │ 8 assets │ New     │  │
│          │  └────────────────────────────────────────────┘  │
│          │  [◀ Prev]  Page 1 of 34  [Next ▶]               │
│          │                                                   │
│          │  Case Detail: CVE-2021-44228                      │
│          │  ┌────────────────────────────────────────────┐  │
│          │  │ Status: [Triaged ▾]   Assigned: [@alice ▾] │  │
│          │  │ Due: (manual date picker)                   │  │
│          │  │                                            │  │
│          │  │ CVSS: 10.0  EPSS: 0.971  KEV: Yes (due 4/3)│ │
│          │  │ CWE: CWE-502  Assets: 47                   │  │
│          │  │                                            │  │
│          │  │ [Get AI Remediation]  ← on-demand button   │  │
│          │  │                                            │  │
│          │  │ 💬 Discussion (Coming Soon)                 │  │
│          │  │ 📋 Link to Jira (Coming Soon)              │  │
│          │  │ ⚠️  Request Exception (Coming Soon)         │  │
│          │  └────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

### 8.7 MVP Timeline

```
Week 1-2:  Auth + GCP infra + Prisma schema + basic UI shell
Week 2-4:  Upload + 5 parsers + dedup + pipeline (Cloud Tasks)
Week 3-4:  Enrichment (NVD + EPSS + KEV) + Redis cache
Week 3-5:  Dashboard + findings list + case detail + workflow
Week 4-5:  AI remediation (on-demand Claude calls)
Week 5-6:  CSV export + PDF report + scan comparison
Week 5-7:  Stripe billing (Free + Pro) + usage limits
Week 6-8:  Polish, "Coming Soon" badges, landing page, deploy

Parallel:  Terraform, CI/CD, monitoring, security hardening
```

### 8.8 MVP Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Time to first upload** | < 2 min from signup | Analytics event |
| **Scan processing time** | < 90s for 8K CVE report | Job completion timestamp |
| **Users who upload > 1 scan** | > 40% in first week | Repeat upload tracking |
| **Free → Pro conversion** | > 5% within 30 days | Stripe events |
| **AI remediation usage** | > 60% of users try it | Usage counter |
| **Report export** | > 30% of users export PDF/CSV | Download tracking |

---

## 8B. Post-MVP Roadmap (Full Feature Phases)

After MVP ships and validates with real users, the full enterprise roadmap kicks in. These phases from the original plan remain the target:

### Phase 2: Collaboration & Integrations (Month 2-3)

Jira bi-directional sync, SLA policies with breach detection, comments with @mentions, case assignment with notifications, email notifications, risk exception workflow, webhooks via Svix.

### Phase 3: MSSP Foundation (Month 3-4)

Activate 3-tier hierarchy (Client model), team management with client assignment, **tenant switching workflow** (analyst pivots between clients without re-auth), client-scoped views, remaining 5 parsers (Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX), cross-client portfolio dashboard, **feature flags per tenant/tier** via control-plane config.

### Phase 4: Reporting & Compliance (Month 4-5)

Scheduled reports per-client, POAM tracking (NIST 800-171), compliance dashboards (SOC 2, SSDF, ASVS), async bulk export API, data retention policies (per reference report data classes), GDPR/CCPA per-client deletion flows, **customer portal** (client_viewer role for client's own staff).

### Phase 5: Enterprise & MSSP Billing (Month 5-7)

Enterprise + MSSP billing tiers with **per-client usage metering**, API key management, SCIM provisioning, WorkOS SAML SSO, **per-tenant SSO** (each client gets own IdP), service accounts for CI/CD, per-tenant encryption (Cloud KMS BYOK), IP allowlist, Cloud Armor full rules, scanner connector system, **automated tenant onboarding pipeline**.

### Phase 6: Scale, Stamps & AI Agents (Month 6-12)

**Deployment stamps** for enterprise tier (dedicated Cloud SQL/GCS/KMS per stamp), full streaming pipeline with SSE, materialized views + read replicas + PgBouncer, cursor-based pagination, **ABAC policy engine**, **deployment rings** (canary → early adopter → GA), AI triage agent, HITL approval gates, ServiceNow integration, SIEM export, bug bounty ingestion, cloud posture (ASFF), OpenAPI v3.1 docs, **tenant-aware observability** (per-tenant/tier dashboards via OpenTelemetry), **white-labeling** (brand customization per org), **per-tenant backup/restore** runbooks.

---

## 9. Enterprise Phased Rollout (per Reference Report)

The enterprise reference report specifies a concrete 4-phase rollout with acceptance criteria and resource estimates. The feature integration phases above (Phases 1-6) map into this enterprise timeline:

| Phase | Duration | Deliverables | Acceptance Criteria | Maps to Feature Phases |
|-------|----------|-------------|---------------------|----------------------|
| **Development** | 8-12 weeks | Canonical schema + ingestion service; initial dedup; basic UI; baseline RBAC; initial integrations (1 CI scanner + 1 VM scanner); audit log MVP | End-to-end ingest -> case creation -> ticket creation; idempotent ingestion; basic tenant isolation tests; raw artifacts stored immutably | Phase 1 + Phase 2 |
| **Staging** | 6-10 weeks | Multi-tenant hardening; SSO integration; SCIM (optional early); retention policies; performance testing; parser fuzzing; security testing; observability | SLOs defined and measured; load tests meet targets; audit logs cover critical actions; retention enforcement verified; pentest findings triaged | Phase 1 hardening + Phase 3 |
| **Pilot** | 8-12 weeks | Customer portal MVP; SLA policy/metrics; additional integrations (bug bounty + SIEM export); onboarding automation; support playbooks | Pilot tenants can self-serve; SLA dashboards correct; ticket sync reliability >= threshold; customer security review issues addressed | Phase 3 + Phase 4 + Phase 5 |
| **Production Enterprise-Ready** | 12-20 weeks | Compliance evidence pack; dedicated/bridge deployment option; data residency controls; IR runbooks; billing/usage metering | Enterprise checklist satisfied: SSO/SCIM, audit logs, retention, encryption, IR playbooks executed in tabletop; operational on-call in place | Phase 5 + Phase 6 |

**Total timeline**: ~34-54 weeks from kickoff to enterprise-ready production.

### Resource Estimate (per Reference Report)

| Role | Count |
|------|-------|
| Product manager | 1 |
| Architect / tech lead | 1 |
| Backend engineers (ingestion, workflow, data) | 4-6 |
| Frontend engineers (portal, dashboards) | 2 |
| Platform / SRE engineers | 1-2 |
| QA / security engineers (automation + testing) | 2 |
| Security / compliance lead | 1 (part-time early, full-time near production) |

### Key Risks and Mitigations (per Reference Report)

| Risk | Mitigation |
|------|------------|
| Normalization complexity and false positives | Start with high-value formats (SARIF + CycloneDX + 1-2 VM exports); preserve raw artifacts; sampling-based QA on dedup logic |
| Tenant isolation failures | Adopt explicit tenancy models (pool vs bridge); automated isolation tests; document model for customer security reviews |
| Connector supply chain risk | Treat connectors as signed, provenance-attested deliverables; align with SSDF/SLSA practices |
| Breach/incident readiness gaps | Run tabletop exercises; align IR processes to incident handling guidance |

### SLO/KPI Targets (per Reference Report)

| Metric | Target |
|--------|--------|
| API availability | 99.9% monthly uptime |
| P95 latency (core queries) | < 500ms |
| Ingestion freshness (scanner completion -> case creation) | < 30s for 100 findings |
| Dedup accuracy | Sampling-based QA rate defined per release |
| SLA breach rate | Tracked per tenant and severity |
| Ticket sync lag and error rate | < 5 min lag, < 1% error |
| Connector health (heartbeat uptime) | > 99% per connector |

## 10. Technical Debt to Avoid

Lessons learned from both codebases:

1. **Do not store scan artifacts as database BLOBs** (1.x mistake) -- use object storage from day one
2. **Do not use fire-and-forget async for critical operations** (both) -- implement a proper job queue
3. **Do not allow `unsafe-inline`/`unsafe-eval` in CSP** (2.0 mistake) -- use nonce-based CSP
4. **Do not let store files grow to 2000+ LOC** (2.0 issue) -- enforce module boundaries early
5. **Do not skip schema migrations** (2.0's runtime ALTER TABLE) -- use Prisma migrations from the start
6. **Do not mix demo/marketing with production routes** (2.0 issue) -- separate concerns clearly
7. **Do not hardcode demo values in UI components** (2.0 issue) -- use feature flags and data-driven UI
8. **Do not rely solely on JWT without server-side session validation** (1.x) -- server-side sessions are safer
9. **Do not defer E2E testing** (2.0) -- set up Playwright from the start

---

## 11. Non-Functional Requirements

| Requirement | Target | GCP Service | Scale Context |
|-------------|--------|-------------|---------------|
| **API latency (p50)** | < 200ms | Cloud Run + Redis cache | Tenable/Snyk target |
| **API latency (p99)** | < 2s for list endpoints | Cloud Run + read replicas | Cursor pagination required |
| **Page load** | < 2s | Cloud CDN + materialized views | Dashboard with 8K+ findings |
| **8K CVE scan processing** | < 90s to dashboard-ready | Streaming pipeline + Pub/Sub workers | Repeat scans < 30s (cached) |
| **Ingestion freshness** | P99 < 5 min (scan complete → cases visible) | Pipeline + SSE progress | Industry SLI |
| **Max upload size** | 100MB per file | GCS resumable uploads | 8K+ CVE Nessus XML can be 50-80MB |
| **Availability** | 99.9% monthly uptime | Cloud Run multi-region + Cloud SQL HA | Enterprise SLA |
| **Org isolation** | Zero cross-org data leakage | RLS + `organization_id` scoping + CI tests | Automated drills |
| **Client isolation** | Zero cross-client leakage within org | `client_id` scoping + CI tests | MSSP requirement |
| **Concurrent orgs** | 500+ orgs, 50+ clients per org | PgBouncer pooling, per-org connection budgets | MSSP scale |
| **Concurrent scans** | 20 per platform, 5 per org (Pro) | Redis semaphores + weighted fair queuing | Noisy neighbor prevention |
| **Audit log retention** | 1-7 years (configurable, SOX/HIPAA) | Cloud SQL + GCS archival | Per-org policy |
| **Data encryption** | At rest + in transit, per-org keys | Cloud KMS key rings + TLS 1.3 | Enterprise requirement |
| **Rate limiting** | Tiered: Free 100/min, Pro 1K/min, Enterprise 10K/min | Cloud Armor + Redis | Per-org + per-user + per-IP |
| **WAF/DDoS** | OWASP Top 10 + bot protection | Cloud Armor security policies | Enterprise reference report |
| **Webhook delivery** | P99 < 30s, at-least-once, HMAC-SHA256 signed | Cloud Tasks + DLQ | Industry standard |
| **Test coverage** | 80% lines, 80% functions, 65% branches | Cloud Build CI | From 2.0 targets |
| **Observability** | SLOs with SLIs, tenant-tagged traces | Cloud Monitoring + OTel | Per-org dashboards |

---

## 12. Security Controls (per Reference Report)

Beyond what exists in 1.x and 2.0, the enterprise reference report mandates:

| Control | Requirement | Current Status |
|---------|-------------|----------------|
| **OAuth 2.0 / OIDC** | Modern auth flows for API authorization | Both: partial (Google OIDC, WorkOS) |
| **SAML 2.0** | Enterprise SSO federation | 1.x: via WorkOS; 2.0: via WorkOS |
| **SCIM provisioning** | Automated provisioning/deprovisioning | Neither: **new work** |
| **Envelope encryption** | Key lifecycle: rotation, access controls, separation of duties | 1.x: AES-256-GCM master key; **use Cloud KMS key rings with per-tenant DEKs** |
| **CMK/BYOK** | Customer-managed keys for regulated tenants | Neither: **use Cloud KMS BYOK / Cloud EKM** |
| **WAF + DDoS** | Front-door protections, bot protection | Neither has WAF: **use Cloud Armor** |
| **SSDF alignment** | Secure development practices integrated into SDLC | 2.0: evidence collection exists; needs formalization |
| **SLSA provenance** | Build pipeline tamper resistance, signed releases | Neither: **new work** |
| **VEX/CSAF publishing** | Declare affected/not-affected status for advisories | 1.x parses inbound; **publishing is new work** |
| **Parser fuzzing** | Fuzz testing on all ingestion parsers | Neither: **new work** |
| **Secrets management** | Centralized, rotated, never embedded in connector configs | 1.x: encrypted credentials; **use Secret Manager with automatic rotation** |

## 13. Migration & Data Strategy

### From 1.x
- Export Prisma schema as the baseline for the combined schema
- Port all 10 parsers to the `packages/parsers` package
- Port AI remediation logic to `packages/ai`
- Port notification engine to `packages/notifications`
- Port SLA, risk exception, and comment logic to respective packages

### From 2.0
- Adopt monorepo structure and `packages/domain` types as contracts
- Port CanonicalFinding type as the universal finding representation
- Port billing store logic (entitlements, usage counters) to `packages/billing`
- Port POAM and compliance tracking to `packages/compliance`
- Port auth store (sessions, passkeys, MFA) to `packages/auth`
- Port workflow lineage to the core finding lifecycle
- Adopt documented workflows (WORKFLOWS.md) as canonical references

### New
- Implement storage adapter layer for dual-target deployment
- Set up job queue infrastructure
- Build full-text search on findings
- Create comprehensive API documentation (OpenAPI)

---

## 14. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep combining all features | High | High | Phase-based delivery; P0 only in Phase 1 |
| Database abstraction complexity (D1 vs PostgreSQL) | Medium | Medium | Start PostgreSQL-only; add D1 adapter later |
| Parser compatibility across formats | Medium | Low | Port 1.x parsers with existing test suites |
| AI cost scaling (Claude API calls) | Medium | Medium | Usage counters + plan-based limits + caching |
| Performance with large scan files | High | Medium | Job queue + streaming parser + progressive UI |
| Tenant isolation regression | Critical | Low | Automated isolation tests in CI (from 2.0) |

---

## 15. Success Criteria

### Core Platform
1. 3-tier tenant hierarchy (Platform → Org → Client) with zero cross-tenant data leakage
2. 8K+ CVE scan processed to dashboard-ready in < 90s (< 30s for repeat scans)
3. Progressive UI showing pipeline status via SSE (not a spinner)
4. All 10+ scanner formats parsed and normalized to CanonicalFinding
5. Two-object data model (Finding + VulnerabilityCase) with canonical JSON schema
6. End-to-end flow: upload → parse → enrich → build cases → triage → remediate → report
7. Idempotent ingestion with deterministic dedup keys and safe retry

### Auth & Multi-Tenancy
8. Google OIDC primary auth + WorkOS SAML + email/password fallback
9. Passkey + TOTP MFA working
10. 3-tier RBAC with team-to-client assignment scoping
11. Client-level customer portal for org's customers
12. Service account auth for CI/CD scanner automation
13. Automated tenant isolation tests (org + client level) in CI

### Scale & Performance
14. Materialized views serving dashboard queries (not live aggregation)
15. 5-layer caching operational (in-process, Redis sessions, Redis enrichment, Redis dashboard, Redis rate limits)
16. Per-org concurrency limits preventing noisy neighbors
17. Cursor-based pagination on all list endpoints
18. API rate limiting with X-RateLimit-* response headers
19. Sub-200ms p50 API latency, sub-2s p99

### Enrichment & AI
20. NVD (CVSS v2/3.x/4.0) + bulk EPSS + local KEV cache pipeline
21. Enrichment cache hit rate > 90% for repeat scans
22. AI remediation (Claude) generating actionable guidance for Critical/High findings
23. AI analysis throttled and non-blocking (users see findings before AI completes)

### Integrations & Workflow
24. Jira bi-directional sync with status mapping
25. SLA policies with breach detection and alerting
26. Webhooks via Svix with HMAC-SHA256, exponential retry, DLQ
27. Stripe billing with 4-tier plans and usage-based entitlements
28. OpenAPI v3.1 contracts for all public endpoints

### Reporting & Compliance
29. Per-client PDF/CSV reports with async generation for large datasets
30. Scheduled reports with email delivery
31. Tamper-resistant audit logs with configurable retention (1-7 years)
32. POAM tracking + compliance dashboards (SOC 2, SSDF, ASVS)
33. GDPR/CCPA per-client data deletion flows
34. 80% test coverage with E2E Playwright suite

---

## 16. Summary Decision Matrix

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Cloud platform** | **Google Cloud Platform** | Existing Google OIDC, Workspace email, API keys; unified billing; native services for all enterprise requirements |
| **Compute** | **Cloud Run** (containerized Next.js) | Serverless scaling, pay-per-use, no cluster management; Docker containers for portability |
| **Database** | **Cloud SQL for PostgreSQL 16** + Prisma | Managed HA, automated backups, IAM auth, FTS, JSONB, read replicas |
| **File storage** | **Google Cloud Storage (GCS)** | Immutable scan artifacts, signed URLs, lifecycle policies, per-tenant isolation |
| **Caching** | **Memorystore for Redis** | Sessions, enrichment cache, rate limiting, dashboard stats |
| **Job queue** | **Cloud Tasks + Pub/Sub** | Reliable async for ingestion, enrichment, AI analysis, reports |
| **Encryption** | **Cloud KMS** | Per-tenant key rings, envelope encryption, BYOK/CMK, HSM-backed |
| **Secrets** | **Secret Manager** | Centralized, auto-rotation, IAM-scoped, audit logged |
| **WAF/DDoS** | **Cloud Armor** | Enterprise reference report requirement; bot protection, rate limiting at edge |
| **Auth** | **Google Identity Platform** (OIDC) + WorkOS (SAML) + Redis sessions | Native Google Workspace login; enterprise SSO via WorkOS |
| **Monitoring** | **Cloud Monitoring + Logging + Trace** (OpenTelemetry) | Enterprise reference report requires OTel; native GCP integration |
| **CI/CD** | **Cloud Build** (+ optional GitHub Actions) | Native GCP deployment; staged rollout (dev/staging/pilot/production) |
| **CDN** | **Cloud CDN** | Global edge caching for static assets and API responses |
| Base architecture | 2.0 monorepo | Better separation of concerns, shared types |
| Parsers | All 10+ from 1.x + XLSX from 2.0 | Maximum scanner coverage |
| Finding model | Enterprise reference report two-object model (Finding + VulnerabilityCase) | Canonical schema per reference report |
| Workflow | Enterprise reference report state machine | Aligns with reference report + 2.0's granular lifecycle |
| AI | 1.x remediation engine (via Vertex AI or direct Anthropic) | More mature with redaction + batching |
| Tenant model | 3-tier: Platform → Org → Client | Supports enterprise, MSSP, and consultancy use cases |
| Billing | 4-tier (Free/Pro/Enterprise/MSSP) + Stripe | Usage-based; MSSP tier supports unlimited clients |
| Ingestion pipeline | Streaming 4-stage pipeline (parse → enrich → build → AI) | Handles 8K+ CVE reports in < 90s |
| Compliance | 2.0 POAM + dashboards + reference report compliance mapping | Enterprise differentiator |
| Notifications | 1.x full system | Comprehensive in-app + email + digest |
| Testing | Vitest + Playwright + 2.0 smoke tests | Best coverage strategy from both |
| Self-hosted option | Docker Compose + PostgreSQL + S3-compatible | For air-gapped / on-prem customers |
