# Changelog

## Unreleased

### Planned

- Connectors package (Tenable/Qualys/Rapid7 adapters)
- E2E Playwright test coverage
- Production hardening (Cloud Armor tuning, PgBouncer, CDN)

## 0.2.0-alpha — 2026-03-30

### Security Hardening (13 findings remediated)

- **CRITICAL**: Cloud Tasks route requires `CLOUD_TASKS_SECRET` bearer token — no longer trusts spoofable headers
- **HIGH**: SSO `redirectUri` validated against app origin to prevent open redirect
- **HIGH**: Login `callbackUrl` validated as relative path to prevent open redirect
- **HIGH**: Cron secret comparison uses `crypto.timingSafeEqual` instead of `!==`
- **HIGH**: Jira webhook rejects requests when no webhook secret is configured
- **HIGH**: Dev session cookie requires `DEV_SESSION_ENABLED=true` in addition to `NODE_ENV`
- **MEDIUM**: Privacy delete scopes user lookup by `organizationId` to prevent IDOR
- **MEDIUM**: Pipeline comment usage limit check is now atomic (`$transaction`)
- **MEDIUM**: Portal session cookies expire after 24 hours
- **MEDIUM**: Impersonation audit log persisted to database (was in-memory, lost on restart)
- **MEDIUM**: MFA temp session consumed before real session creation (closes replay window)
- **LOW**: Login error messages unified to prevent user enumeration
- **LOW**: Tenant SSO SSRF identified — dormant code, fix deferred until route is wired

### Security Headers

- `/api/health` returns minimal response for unauthenticated requests
- `robots.txt` and `sitemap.xml` served without auth redirect
- Removed `x-nonce` response header (leaked CSP nonce)
- HSTS aligned to `max-age=63072000; includeSubDomains; preload`
- Error boundaries no longer render `error.message` to users

### Landing Page

- Interactive animated hero — CLI scan flows into dashboard import (side-by-side)
- ICP section: DevSecOps Teams, GRC & Compliance, Federal & Defense
- Veteran Owned dedicated section with SDVOSB eligibility
- Pricing page: CLI features per tier, Free vs Paid comparison table
- Founders Beta urgency badge, annual discount always visible
- Removed fabricated testimonials — stats-only social proof
- CTA section with 3-step "what happens next" flow

### Platform

- Session route reads org tier from database instead of defaulting to FREE
- Founder emails (`gontiveros292@gmail.com`, `george.ontiveros@cveriskpilot.com`) granted ops dashboard access regardless of domain
- Middleware + 9 ops API routes updated with founder email bypass
- Version references unified — sbom-scanner reads VERSION dynamically

## 0.1.0 — 2026-03-27

- Initial MVP scaffold (Waves 0-5)
- Multi-tenant Prisma schema
- Next.js web application scaffold
