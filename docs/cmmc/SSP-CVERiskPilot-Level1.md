# System Security Plan (SSP) — CMMC Level 1

| Field | Value |
|-------|-------|
| **Document** | CVERiskPilot System Security Plan |
| **CMMC Level** | 1 (Self-Assessment) |
| **Version** | 1.0 |
| **Date** | 2026-03-30 |
| **Classification** | CUI-Basic / FOUO |
| **Organization** | CVERiskPilot LLC |
| **Author / System Owner** | George Ontiveros |
| **CAGE Code** | *Pending* |
| **UEI** | *Pending* |
| **Review Cycle** | Annual (next: Q1 2027) |

---

## 1. System Identification

| Field | Value |
|-------|-------|
| System Name | CVERiskPilot SaaS Platform |
| Organization | CVERiskPilot LLC — 100% Veteran Owned, Texas-registered |
| System Owner / ISSO | George Ontiveros (sole proprietor) |
| System Type | Cloud-hosted SaaS (multi-tenant) |
| Data Classification | Federal Contract Information (FCI) — Low |
| Operational Status | Operational (v0.1.0-alpha) |
| Domain | cveriskpilot.com |

### 1.1 System Purpose

CVERiskPilot is a vulnerability management SaaS platform for GRC/compliance teams. It ingests scan results from 11 scanner formats, enriches CVE data via NVD/EPSS/KEV, performs AI-powered triage, and manages remediation lifecycle including POAM generation and compliance framework mapping (NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, SSDF).

### 1.2 Organizational Structure

CVERiskPilot LLC is a solo-founder company with no employees. George Ontiveros serves as System Owner, ISSO, System Administrator, and sole developer. This simplifies CMMC scoping — there is one authorized user with administrative access, and all personnel security controls are self-managed.

---

## 2. System Boundary

### 2.1 Cloud Infrastructure (GCP)

| Component | Resource Name | Region | Description |
|-----------|--------------|--------|-------------|
| **Compute — Web** | `cveriskpilot-web-prod` | us-central1 | Cloud Run, Next.js, port 3000, 2-10 instances |
| **Compute — Worker** | `cveriskpilot-worker-prod` | us-central1 | Cloud Run, async job processor, port 8080, 0-5 instances |
| **Compute — PgBouncer** | `cveriskpilot-pgbouncer-prod` | us-central1 | Cloud Run, connection pooler, internal-only ingress |
| **Database — Primary** | `cveriskpilot-prod` | us-central1 | Cloud SQL PostgreSQL 16, Enterprise, REGIONAL HA, private IP only |
| **Database — Replica** | `cveriskpilot-prod-replica` | us-central1 | Cloud SQL read replica, private IP only |
| **Cache** | `cveriskpilot-prod` | us-central1 | Memorystore Redis 7.2, 1 GB, BASIC tier |
| **Storage — Artifacts** | `{project}-artifacts-prod` | us-central1 | GCS bucket, versioned, public access prevented |
| **Storage — Static** | `{project}-static-assets-prod` | us-central1 | GCS bucket, CDN-served (JS/CSS/images only, no FCI) |
| **Encryption** | `cveriskpilot-tenant-keys-prod` | us-central1 | Cloud KMS keyring, AES-256 symmetric, 90-day rotation |
| **Secrets** | Secret Manager (13 secrets) | auto-replicated | database-url, redis-url, auth-secret, encryption keys, API keys |
| **WAF** | `cveriskpilot-waf-enterprise-prod` | global | Cloud Armor, OWASP CRS v3.3, rate limiting, geo-blocking |
| **Load Balancer** | Global HTTPS LB | global | Static IP, managed SSL cert, Cloud CDN |
| **Networking** | `crp-vpc-prod` | us-central1 | VPC connector (10.8.0.0/28), private VPC peering (/20) |
| **Messaging** | Pub/Sub (4 topics + 4 DLQs) | us-central1 | scan, enrichment, notification, connector-sync pipelines |
| **Task Queue** | `cveriskpilot-scan-pipeline-prod` | us-central1 | Cloud Tasks, 10 RPS, 5 concurrent |
| **CI/CD** | Cloud Build | us-central1 | CI (all branches), deploy (main) |
| **Logging** | Cloud Logging | global | 90-day retention bucket, log-based metrics, alert policies |
| **Monitoring** | Cloud Monitoring | global | Error rate + latency alerts, email notifications |

### 2.2 Development Infrastructure

| Component | Description |
|-----------|-------------|
| Development Workstation | WSL2 Linux on Windows, home office, single user |

### 2.3 External Integrations

| Service | Purpose | Data Exchanged |
|---------|---------|----------------|
| NVD API | CVE enrichment | CVE IDs, CVSS scores (public data) |
| Anthropic Claude API | AI-powered triage | Finding summaries (no PII) |
| Stripe | Billing/payments | Payment tokens, plan metadata |
| WorkOS | Enterprise SSO (SAML/OIDC) | Auth tokens, user identity |
| SMTP (Resend) | Email notifications | Email addresses, notification content |
| GitHub | OAuth login, CI/CD | Auth tokens, source code |

### 2.4 Network Architecture

See [network-diagram.md](network-diagram.md) for the full network topology diagram.

### 2.5 Service Account & IAM

A dedicated Cloud Run service account (`cveriskpilot-run-prod`) is used instead of the default App Engine service account. It is granted least-privilege IAM roles:

| IAM Role | Purpose |
|----------|---------|
| `roles/cloudsql.client` | Connect to Cloud SQL via Unix socket |
| `roles/secretmanager.secretAccessor` | Read secrets injected as env vars |
| `roles/storage.objectAdmin` | Read/write scan artifacts to GCS |
| `roles/cloudtasks.enqueuer` | Enqueue scan processing jobs |
| `roles/cloudkms.cryptoKeyEncrypterDecrypter` | Envelope encryption for tenant data |
| `roles/logging.logWriter` | Write structured application logs |
| `roles/monitoring.metricWriter` | Write custom metrics |

---

## 3. Practice-by-Practice Compliance

### Domain: Access Control (AC)

#### AC.L1-3.1.1 — Limit information system access to authorized users, processes acting on behalf of authorized users, or devices

**Status: IMPLEMENTED**

**Implementation:**
- OAuth 2.0 login via Google and GitHub identity providers
- WorkOS SSO integration for enterprise customers (SAML/OIDC)
- 10-role RBAC hierarchy: PLATFORM_ADMIN, PLATFORM_SUPPORT, ORG_OWNER, SECURITY_ADMIN, ANALYST, DEVELOPER, VIEWER, SERVICE_ACCOUNT, CLIENT_ADMIN, CLIENT_VIEWER
- API key authentication for programmatic access with org-scoped isolation
- Session management with server-side validation
- Cloud Run production ingress restricted to `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` — no direct access bypassing the load balancer and WAF
- Dedicated IAM service account (`cveriskpilot-run-prod`) with least-privilege roles

**Evidence:**
- `packages/auth/src/rbac/permissions.ts` — Role-permission matrix
- `packages/auth/src/security/api-key-auth.ts` — API key validation
- `deploy/terraform/cloudrun.tf:182` — Ingress restriction
- `deploy/terraform/iam.tf` — Least-privilege IAM bindings

---

#### AC.L1-3.1.2 — Limit information system access to the types of transactions and functions that authorized users are permitted to execute

**Status: IMPLEMENTED**

**Implementation:**
- RBAC enforcement on all 116 API routes — role checked per request via auth middleware
- Granular permissions: cases, assets, scans, AI features, org management, risk exceptions, audit logs
- API key scoping — keys are bound to specific organizations
- Cloud Armor rate limiting enforces transaction limits:
  - 200 requests/minute global per IP
  - 20 requests/minute on auth endpoints
  - 10 requests/minute on API key creation
  - 100 requests/minute on SCIM endpoints
- Attribute-based access control (ABAC) package for fine-grained authorization

**Evidence:**
- `packages/auth/src/rbac/guard.ts` — Route-level authorization
- `packages/auth/src/rbac/middleware.ts` — Request-level permission checks
- `packages/abac/` — Attribute-based access control
- `deploy/terraform/cloud-armor.tf:228-322` — Rate limiting rules

---

#### AC.L1-3.1.20 — Verify and control/limit connections to and use of external information systems

**Status: IMPLEMENTED**

**Implementation:**
- VPC connector with `PRIVATE_RANGES_ONLY` egress — Cloud Run can only reach private resources (Cloud SQL, Redis) via VPC; all other traffic goes through standard internet egress
- Cloud SQL configured with `ipv4_enabled = false` — no public IP, accessible only via private VPC peering
- Redis on authorized VPC network only
- Geo-blocking of 10 high-risk countries (CN, RU, IR, KP, CU, SY, BY, VE, MM, NI) via Cloud Armor
- Bot protection and scanner detection rules block unauthorized automated access
- URL validation middleware prevents SSRF attacks against internal resources
- No User-Agent header → blocked (Cloud Armor rule 3100)

**Evidence:**
- `deploy/terraform/networking.tf:28-39` — VPC connector (10.8.0.0/28)
- `deploy/terraform/database.tf:19` — `ipv4_enabled = false`
- `deploy/terraform/cloud-armor.tf:328-343` — Geo-blocking
- `deploy/terraform/cloud-armor.tf:209-221` — Bot/scanner protection
- `packages/auth/src/security/url-validator.ts` — SSRF prevention

---

#### AC.L1-3.1.22 — Control information posted or processed on publicly accessible information systems

**Status: IMPLEMENTED**

**Implementation:**
- Next.js route groups separate public `(public)` pages from authenticated `(app)` pages
- All API mutations require authentication + RBAC check + CSRF validation
- GCS artifacts bucket has `public_access_prevention = enforced` — scan results never publicly accessible
- CDN static assets bucket contains only JS/CSS/images — no FCI
- Audit logging with tamper-evident hash chain for all security-relevant actions
- Org-scoped tenant isolation on all database queries prevents cross-tenant data access

**Evidence:**
- `apps/web/app/(public)/` — Public route group (landing, login, signup only)
- `apps/web/app/(app)/` — Auth-gated application routes
- `deploy/terraform/storage.tf` — `public_access_prevention = "enforced"`
- `packages/auth/src/security/audit.ts` — Hash-chain audit logging

---

### Domain: Identification and Authentication (IA)

#### IA.L1-3.5.1 — Identify information system users, processes acting on behalf of users, or devices

**Status: IMPLEMENTED**

**Implementation:**
- OAuth identity providers (Google, GitHub) provide verified user identity
- Each user assigned a unique CUID (collision-resistant unique identifier)
- Service accounts identified by IAM service account email
- Pub/Sub uses OIDC tokens for service-to-service authentication — Cloud Run worker verifies publisher identity
- API keys are hashed and tied to specific organizations and users
- Audit log entries include user ID, organization ID, IP address, and action

**Evidence:**
- `packages/domain/prisma/schema.prisma` — User model with unique ID
- `packages/auth/src/security/api-key-auth.ts` — API key identity binding
- `packages/auth/src/security/audit.ts` — User identification in audit trail
- `deploy/terraform/pubsub.tf` — OIDC token authentication for Pub/Sub push

---

#### IA.L1-3.5.2 — Authenticate (verify) the identities of those users, processes, or devices, as a prerequisite to allowing access

**Status: IMPLEMENTED**

**Implementation:**
- Multi-factor authentication (MFA) support:
  - TOTP (Time-based One-Time Password) — works with any authenticator app
  - WebAuthn/passkeys — hardware security keys, biometric authenticators
- Password policy enforcement:
  - 90-day password expiry (configurable)
  - Password history/reuse prevention (5 previous passwords tracked)
  - HIBP breach checking via k-anonymity (SHA-1 prefix, never sends full hash)
  - Bcrypt hashing with configurable cost factor
- CSRF protection via `X-CSRF-Token` header and `crp_csrf` cookie
- Redis-backed rate limiting on authentication endpoints (20 req/min per IP)
- Session tokens signed with `AUTH_SECRET` stored in Secret Manager

**Evidence:**
- `packages/auth/src/mfa/totp.ts` — TOTP setup and verification
- `packages/auth/src/security/webauthn.ts` — WebAuthn registration and authentication
- `packages/auth/src/security/password-policy.ts` — Password rules, HIBP check
- `packages/auth/src/security/csrf-guard.ts` — CSRF token validation
- `packages/auth/src/security/rate-limit.ts` — Redis sliding-window rate limiter

---

### Domain: Media Protection (MP)

#### MP.L1-3.8.3 — Sanitize or destroy information system media containing Federal Contract Information before disposal or release for reuse

**Status: PARTIALLY IMPLEMENTED** *(POAM-001)*

**Implementation:**
- Cloud-side lifecycle policies are in place:
  - GCS artifacts bucket: lifecycle rules auto-delete objects after 365 days
  - Cloud SQL: 14-day backup retention with auto-purge; deletion protection enabled in production
  - Redis: in-memory only — data lost on instance deletion
  - Secret Manager: 30-day soft-delete after version destruction
  - Cloud Logging: 90-day retention with auto-purge
- Media sanitization policy documented in [media-sanitization-policy.md](media-sanitization-policy.md)

**Gap:**
- No NIST 800-88-compliant disk wiping tool procured for development workstation
- Cloud resource decommissioning checklist not yet formalized

**Remediation:** See POAM-001 in [POAM-CVERiskPilot-Level1.md](POAM-CVERiskPilot-Level1.md)

**Evidence:**
- `deploy/terraform/storage.tf` — GCS lifecycle rules
- `deploy/terraform/database.tf:29-32` — Backup retention settings
- `deploy/terraform/database.tf:10` — Deletion protection
- `deploy/terraform/logging.tf:179-185` — 90-day log retention

---

### Domain: Physical Protection (PE)

#### PE.L1-3.10.1 — Limit physical access to organizational information systems, equipment, and the respective operating environments to authorized individuals

**Status: IMPLEMENTED** *(Inherited + Supplemental)*

**Implementation:**
- All production systems run on Google Cloud Platform, which maintains SOC 2 Type II and ISO 27001 certifications for physical data center security (biometric access, 24/7 security, video surveillance, mantrap entries)
- Development workstation is located in a private residence with keyed deadbolt locks on all exterior doors
- Solo founder — only one authorized individual has physical access to development systems
- Physical security policy documented in [physical-security-policy.md](physical-security-policy.md)

**Evidence:**
- GCP compliance certifications: cloud.google.com/security/compliance
- `docs/cmmc/physical-security-policy.md` — Home office physical controls

---

#### PE.L1-3.10.3 — Escort visitors and monitor visitor activity

**Status: IMPLEMENTED** *(N/A — simplified scoping)*

**Implementation:**
- GCP data centers handle all visitor escort and monitoring for production infrastructure
- Home office workspace: no visitors permitted access to systems area during working sessions
- If non-household visitors are present, workstation is locked and screens are not visible
- Solo founder with no employees — no regular visitor traffic to workspace

**Evidence:**
- `docs/cmmc/physical-security-policy.md` — Visitor policy

---

#### PE.L1-3.10.4 — Maintain audit logs of physical access

**Status: IMPLEMENTED** *(Inherited + Supplemental)*

**Implementation:**
- GCP maintains comprehensive physical access audit logs for all data centers
- Home office: informal visitor log maintained for any non-household member accessing workspace area
- Solo founder — physical access events are rare and self-documented

**Evidence:**
- GCP data center access logs (managed by Google)
- `docs/cmmc/physical-security-policy.md` — Visitor log procedure

---

#### PE.L1-3.10.5 — Control and manage physical access devices (e.g., keys, locks, combinations, card readers)

**Status: IMPLEMENTED**

**Implementation:**
- GCP manages all physical access devices for data center infrastructure
- Home office: standard residential keyed deadbolt locks, keys managed by system owner
- No electronic access control systems for home office (not required for FCI/Low)
- Development workstation has full-disk encryption enabled — physical theft does not expose data

**Evidence:**
- `docs/cmmc/physical-security-policy.md` — Physical access device controls

---

### Domain: System and Communications Protection (SC)

#### SC.L1-3.13.1 — Monitor, control, and protect organizational communications at the external boundaries and key internal boundaries of the information system

**Status: IMPLEMENTED**

**Implementation:**
- Cloud Armor WAF (enterprise policy) with 13 OWASP CRS v3.3 rules:
  - SQL Injection (sqli-v33-stable)
  - Cross-Site Scripting (xss-v33-stable)
  - Local File Inclusion (lfi-v33-stable)
  - Remote File Inclusion (rfi-v33-stable)
  - Remote Code Execution (rce-v33-stable)
  - Method Enforcement
  - Scanner Detection
  - Protocol Attack
  - PHP Injection
  - Session Fixation
  - Java Attack patterns
  - NodeJS Attack patterns
  - CVE exploit canaries
- ML-based adaptive L7 DDoS protection
- HTTPS-only (managed SSL certificate, HTTP → HTTPS redirect)
- Security headers on all responses:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- VPC private networking isolates database and cache from public internet
- AES-256-GCM encryption at rest with Cloud KMS envelope encryption

**Evidence:**
- `deploy/terraform/cloud-armor.tf` — Full WAF policy (13 rules + rate limiting + geo-blocking)
- `apps/web/next.config.js:21-58` — Security headers
- `deploy/terraform/networking.tf` — VPC connector and private peering
- `deploy/terraform/kms.tf` — KMS keyring with 90-day rotation
- `packages/auth/src/security/encryption.ts` — AES-256-GCM + KMS envelope encryption

---

#### SC.L1-3.13.5 — Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks

**Status: IMPLEMENTED**

**Implementation:**
- VPC connector (`crp-vpc-prod`, 10.8.0.0/28) logically separates Cloud Run from private resources
- Cloud SQL and Redis reside on private VPC peering (/20 range) — no public IP addresses
- Cloud Run production ingress set to `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` — only the load balancer (behind Cloud Armor) can reach the application
- PgBouncer Cloud Run service set to `INTERNAL_ONLY` ingress — accessible only from within the VPC
- Cloud Run worker accessible only via Cloud Tasks and Pub/Sub (OIDC-authenticated push)
- CDN serves only static assets (JS/CSS/images) — no dynamic content or FCI

**Evidence:**
- `deploy/terraform/networking.tf:28-39` — VPC connector configuration
- `deploy/terraform/networking.tf:12-18` — Private IP range (/20) for VPC peering
- `deploy/terraform/cloudrun.tf:182` — `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`
- `deploy/terraform/pgbouncer.tf` — `INTERNAL_ONLY` ingress
- `deploy/terraform/database.tf:19` — `ipv4_enabled = false`

---

### Domain: System and Information Integrity (SI)

#### SI.L1-3.14.1 — Identify, report, and correct information system flaws in a timely manner

**Status: IMPLEMENTED** *(POAM-003 for formal cadence documentation)*

**Implementation:**
- Cloud Build CI runs type-check, lint, and test on all branches before merge
- Cloud Build deploy triggers on push to main — automated deployment pipeline
- `@cveriskpilot/scan` CLI performs dependency vulnerability scanning with CWE-to-compliance mapping
- Security audit process: 3-agent audit identified 18 findings, all remediated (commit `816b545`)
- npm audit for dependency vulnerability checking
- Patch management policy documented in [patch-management-policy.md](patch-management-policy.md)

**Gap:**
- Formal patch management cadence (weekly npm audit, monthly base image update, quarterly review) documented in policy but not yet fully automated (Dependabot not yet configured)

**Remediation:** See POAM-003 in [POAM-CVERiskPilot-Level1.md](POAM-CVERiskPilot-Level1.md)

**Evidence:**
- `deploy/terraform/cloudbuild.tf` — CI/CD pipeline
- `packages/scan/` — Pipeline compliance scanner
- `docs/security-audit-2026-03-28.md` — Security audit findings
- `docs/session-2026-03-28-phase10-remediation.md` — Remediation tracking

---

#### SI.L1-3.14.2 — Provide protection from malicious code at appropriate locations within organizational information systems

**Status: IMPLEMENTED**

**Implementation:**
- Cloud Armor WAF blocks injection attacks (SQLi, XSS, LFI, RFI, RCE) using OWASP CRS v3.3 stable rules
- Input validation using Zod schemas at all API boundaries
- CSRF protection (token validation via `X-CSRF-Token` header and `crp_csrf` cookie)
- Container images built from verified base images in CI/CD pipeline
- GCS buckets use `uniform_bucket_level_access` — no ACL-based permission bypass
- Rate limiting prevents brute-force and credential-stuffing attacks

**Evidence:**
- `deploy/terraform/cloud-armor.tf:24-189` — OWASP CRS rules
- `packages/auth/src/security/csrf-guard.ts` — CSRF protection
- `deploy/Dockerfile` — Container build from Node.js LTS base image

---

#### SI.L1-3.14.4 — Update malicious code protection mechanisms when new releases are available

**Status: IMPLEMENTED**

**Implementation:**
- Cloud Armor WAF uses OWASP CRS v33-stable rule sets — Google-managed, automatically updated when new stable versions are released
- Cloud SQL maintenance window configured: Sunday 04:00 UTC, stable update track — Google applies security patches automatically
- Container base images updated via CI/CD pipeline on each deployment
- Redis managed by Google (Memorystore) — patches applied automatically

**Evidence:**
- `deploy/terraform/cloud-armor.tf` — All rules reference `v33-stable` (Google-managed updates)
- `deploy/terraform/database.tf:35-39` — Maintenance window (Sunday 04:00, stable track)

---

#### SI.L1-3.14.5 — Perform periodic scans of the information system and real-time scans of files from external sources as files are downloaded, opened, or executed

**Status: IMPLEMENTED**

**Implementation:**
- Cloud Logging with log-based metrics provides continuous monitoring:
  - Error count (severity >= ERROR)
  - Request count
  - API latency distribution (p95, p99)
  - High latency detection (>5s)
- Alert policies with automatic email notification:
  - Error rate > 1% over 5 minutes
  - P95 latency > 5 seconds over 5 minutes
- 90-day log retention for forensic analysis
- `@cveriskpilot/scan` CLI provides on-demand dependency and secret scanning
- Uploaded scan files are parsed through validated parsers (11 formats) — malformed input rejected

**Evidence:**
- `deploy/terraform/logging.tf` — Log metrics, alert policies, 90-day retention
- `packages/scan/` — Pipeline compliance scanner
- `packages/parsers/` — 11 validated scanner format parsers

---

## 4. Roles and Responsibilities

| Role | Person | Responsibilities |
|------|--------|-----------------|
| System Owner | George Ontiveros | Overall system security, risk acceptance, CMMC self-assessment |
| ISSO | George Ontiveros | Security monitoring, incident response, POAM management |
| System Administrator | George Ontiveros | Infrastructure management, patching, access control |
| Developer | George Ontiveros | Application development, security testing, CI/CD |

*Note: As a solo-founder company, all roles are held by a single individual. This is documented and accepted for CMMC Level 1 scoping.*

---

## 5. Continuous Monitoring Strategy

| Activity | Frequency | Method |
|----------|-----------|--------|
| Cloud Logging review | Continuous | Automated alert policies (error rate, latency) |
| WAF rule updates | Automatic | Google-managed OWASP CRS stable releases |
| Cloud SQL patching | Weekly | Automatic maintenance window (Sunday 04:00 UTC) |
| npm dependency audit | Weekly | Manual `npm audit` + planned Dependabot automation |
| Container base image | Monthly | Update Dockerfile, full CI/CD validation |
| Terraform providers | Quarterly | Manual review of hashicorp/google provider releases |
| CMMC self-assessment | Annual | Full 17-practice review, SPRS score update |
| POAM review | Quarterly | Review open items, update milestones and dates |
| Security audit | Semi-annual | Multi-agent code audit (auth, RBAC, API security) |

---

## 6. Related Documents

| Document | Description |
|----------|-------------|
| [POAM-CVERiskPilot-Level1.md](POAM-CVERiskPilot-Level1.md) | Plan of Action & Milestones (3 open items) |
| [asset-inventory.md](asset-inventory.md) | System boundary asset inventory |
| [network-diagram.md](network-diagram.md) | Network architecture diagram |
| [media-sanitization-policy.md](media-sanitization-policy.md) | Media sanitization procedures (MP.L1-3.8.3) |
| [physical-security-policy.md](physical-security-policy.md) | Physical security controls (PE.L1-3.10.x) |
| [patch-management-policy.md](patch-management-policy.md) | Patch management cadence (SI.L1-3.14.1) |

---

## 7. Assessment Summary

| Domain | Practices | Implemented | Partial | Not Implemented |
|--------|-----------|-------------|---------|-----------------|
| Access Control (AC) | 4 | 4 | 0 | 0 |
| Identification & Authentication (IA) | 2 | 2 | 0 | 0 |
| Media Protection (MP) | 1 | 0 | 1 | 0 |
| Physical Protection (PE) | 4 | 4 | 0 | 0 |
| System & Communications Protection (SC) | 2 | 2 | 0 | 0 |
| System & Information Integrity (SI) | 4 | 3 | 1 | 0 |
| **Total** | **17** | **15** | **2** | **0** |

**SPRS Score Estimate:** 108 / 110

*Two practices are partially implemented with active POAM items. All gaps are documentation/tooling gaps — no technical control deficiencies.*

---

*Prepared by George Ontiveros, System Owner, CVERiskPilot LLC*
*Date: 2026-03-30*
*Next review: Q1 2027*
