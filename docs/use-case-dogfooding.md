# Use Case: CVERiskPilot Scans Itself

## The Scenario

CVERiskPilot is a vulnerability management SaaS built with Next.js 15, PostgreSQL, and 26 internal packages. Before every release, we run our own compliance scanner against our own codebase.

This is real scan data from v0.3.0-beta, run on March 31, 2026.

## The Command

```bash
npx @cveriskpilot/scan --preset startup
```

**Preset:** `startup` (SOC 2 Type II + OWASP ASVS)
**Duration:** 27.9 seconds
**No API key. No account. Fully offline.**

## Scan Results

### Summary

| Metric | Value |
|--------|-------|
| Dependencies scanned | 897 (npm) |
| Files scanned (secrets) | 1,001 |
| IaC files checked | 22 |
| API routes analyzed | 129 |
| **Total findings** | **87** |

### Severity Distribution

| Severity | Count |
|----------|-------|
| CRITICAL | 10 |
| HIGH | 47 |
| MEDIUM | 26 |
| LOW | 4 |

### Auto-Triage Results

The verdict engine automatically classified all 87 findings:

| Verdict | Count | % | What it means |
|---------|-------|---|---------------|
| TRUE_POSITIVE | 48 | 55% | Real issues — fix these |
| FALSE_POSITIVE | 26 | 30% | Auto-dismissed (test files, .gitignored secrets, variable interpolation) |
| NEEDS_REVIEW | 13 | 15% | Likely intentional (e.g., public badge API has no auth by design) |

**Without auto-triage:** An analyst reviews 87 findings.
**With auto-triage:** An analyst reviews 61 findings. 26 false positives eliminated automatically.

### Scanner Breakdown

| Scanner | Findings | What it caught |
|---------|----------|----------------|
| API Security | 47 | Missing role checks on mutation endpoints, unauthenticated routes |
| Secrets | 37 | Stripe keys, Anthropic API key, DB connection strings in .env.local (all .gitignored) |
| SBOM/Dependencies | 3 | Known CVEs in transitive dependencies |
| IaC | 0 | 22 files checked, 29 rules passed, 0 failed |

### Top CWEs Found

| CWE | Description | Count |
|-----|-------------|-------|
| CWE-862 | Missing Authorization | 45 |
| CWE-798 | Hardcoded Credentials | 35 |
| CWE-306 | Missing Authentication | 2 |
| CWE-200 | Information Exposure | 2 |
| CWE-400 | Uncontrolled Resource Consumption | 1 |

### Compliance Impact

The scanner mapped findings to **8 compliance controls** across 2 frameworks (startup preset):

**SOC 2 Type II — 4 controls affected:**

| Control | Title | Triggered By |
|---------|-------|-------------|
| CC6.1 | Logical and Physical Access Controls | CWE-862, CWE-798, CWE-256, CWE-522, CWE-200 |
| CC8.1 | Change Management | CWE-798 |
| CC7.2 | Incident and Change Management | CWE-200 |
| CC6.8 | Vulnerability Management | CWE-400, CWE-770 |

**OWASP ASVS 4.0 — 4 controls affected:**

| Control | Title | Triggered By |
|---------|-------|-------------|
| V1.2 | Authentication Architecture | CWE-862, CWE-798, CWE-256, CWE-522, CWE-200 |
| V14.2 | Dependency Security | CWE-798 |
| V1.1 | Secure Software Development Lifecycle | CWE-798 |
| V9.1 | Client Communication Security | CWE-522 |

## What This Means for a SOC 2 Audit

An auditor reviewing this scan would see:

1. **CC6.1 (Access Controls)** — 45 API routes with missing authorization checks. These need RBAC middleware before the audit.
2. **CC8.1 (Change Management)** — Hardcoded credentials detected. Even though they're in .gitignored files, the auditor will ask about secrets management practices.
3. **CC6.8 (Vulnerability Management)** — Known dependency vulnerabilities exist. The auditor will ask for a remediation timeline.
4. **CC7.2 (Incident Management)** — Information exposure findings. The auditor will verify error handling doesn't leak stack traces.

**Without CVERiskPilot:** The security team runs `npm audit`, gets 3 dependency findings, and has no idea which SOC 2 controls are affected. They spend hours cross-referencing CVEs to CWEs to controls in a spreadsheet.

**With CVERiskPilot:** One command. 28 seconds. All 87 findings mapped to the exact SOC 2 controls the auditor will ask about. The GRC team knows exactly what to fix before the audit, not during it.

## Actions Taken

Based on this scan, we:

1. **Fixed 13 critical security findings** in Wave 10 (auth, RBAC, CSRF, session management)
2. **Added RBAC middleware** to 95 API routes in a single commit
3. **Moved all secrets** to environment variables with AES-256-GCM encryption at rest
4. **Upgraded 3 vulnerable dependencies** to patched versions
5. **Added rate limiting** to all public endpoints

The scan-to-fix cycle took one session. The same work would have taken 40+ hours of manual CVE-to-control mapping using spreadsheets.

## Reproducing This

Anyone can run the same scan on their own codebase:

```bash
# SOC 2 + ASVS (startup)
npx @cveriskpilot/scan --preset startup

# NIST + CMMC + SSDF (defense contractor)
npx @cveriskpilot/scan --preset defense

# All 6 frameworks
npx @cveriskpilot/scan --preset all

# JSON output for CI/CD
npx @cveriskpilot/scan --preset startup --format json

# GitHub Action (add to .github/workflows/compliance.yml)
# See: packages/scan/action/examples/
```

Free. Offline. No account. No API key.
