# We Scanned Ourselves: What 87 Findings Taught Us About Our Own Compliance Posture

*CVERiskPilot is a vulnerability management platform. So we pointed our own scanner at our own codebase. Here's what we found.*

---

## Why Dogfood a Security Scanner

Every compliance tool vendor says their product works. Few of them show you what it actually finds.

We decided to publish real scan data from our own codebase — not a curated demo, not synthetic data, but the actual output from running `npx @cveriskpilot/scan --preset startup` against CVERiskPilot v0.3.0-beta on March 31, 2026.

If the scanner is any good, it should find real issues in a real Next.js + PostgreSQL monorepo with 128 API routes and 25 internal packages.

It did.

---

## The Numbers

```bash
npx @cveriskpilot/scan --preset startup
```

**Duration:** 27.9 seconds. No API key. No account. Fully offline.

| What was scanned | Count |
|-----------------|-------|
| Dependencies (npm) | 897 |
| Files checked for secrets | 1,001 |
| IaC files (Terraform, Dockerfile, K8s) | 22 files, 29 rules |
| API routes analyzed | 129 |
| **Total findings** | **87** |

---

## Severity Distribution

| Severity | Count |
|----------|-------|
| CRITICAL | 10 |
| HIGH | 47 |
| MEDIUM | 26 |
| LOW | 4 |

87 findings sounds like a lot. But not all findings are equal — and that's where auto-triage matters.

---

## Auto-Triage: Separating Signal from Noise

The verdict engine automatically classified every finding:

| Verdict | Count | % | What it means |
|---------|-------|---|---------------|
| TRUE_POSITIVE | 48 | 55% | Real issues that need fixes |
| FALSE_POSITIVE | 26 | 30% | Test files, .gitignored secrets, variable interpolation |
| NEEDS_REVIEW | 13 | 15% | Intentional design choices (e.g., public API with no auth by design) |

**Without auto-triage:** Your security engineer reviews 87 findings.
**With auto-triage:** They review 61. 26 false positives never reach a human.

That's 30% noise reduction before anyone opens a ticket.

---

## What the Scanners Found

### API Security (47 findings)

The API route scanner was the most productive. It found 45 routes with missing authorization checks on mutation endpoints. In a Next.js App Router codebase with 129 routes, that's significant.

These weren't obscure edge cases. They were POST/PUT/DELETE handlers that called `requireAuth()` but skipped RBAC checks — meaning any authenticated user could call admin endpoints.

**CWE-862 (Missing Authorization)** appeared 45 times. This single CWE maps to:
- NIST 800-53: AC-3, AC-6
- SOC 2: CC6.1
- CMMC: AC.L2-3.1.1
- FedRAMP: AC-3

### Secrets (37 findings)

The secrets scanner found Stripe keys, Anthropic API keys, and database connection strings. All were in `.env.local` — properly .gitignored, never committed. The verdict engine classified these correctly:

- **TRUE_POSITIVE:** Secrets in `.env` without `.gitignore` coverage
- **FALSE_POSITIVE:** Secrets in test fixtures, variable interpolation (`${process.env.API_KEY}`), and .gitignored files
- **NEEDS_REVIEW:** API keys in configuration files that *are* gitignored but might be shared across environments

**CWE-798 (Hardcoded Credentials)** appeared 35 times — but 24 of those were auto-dismissed as false positives.

### Dependencies (3 findings)

Only 3 dependency vulnerabilities across 897 npm packages. All were transitive dependencies with known CVEs and available patches.

### IaC (0 findings)

22 Terraform files. 29 rules checked. Zero failures. Our infrastructure-as-code is clean.

---

## Compliance Impact

The scanner mapped all findings to **8 compliance controls** across our selected frameworks (startup preset = SOC 2 + OWASP ASVS):

### SOC 2 Type II — 4 Controls Affected

| Control | Title | Triggered By |
|---------|-------|-------------|
| CC6.1 | Logical and Physical Access Controls | CWE-862, CWE-798, CWE-200 |
| CC8.1 | Change Management | CWE-798 |
| CC7.2 | Incident and Change Management | CWE-200 |
| CC6.8 | Vulnerability Management | CWE-400 |

### OWASP ASVS 4.0 — 4 Controls Affected

| Control | Title | Triggered By |
|---------|-------|-------------|
| V1.2 | Authentication Architecture | CWE-862, CWE-798, CWE-200 |
| V14.2 | Dependency Security | CWE-798 |
| V1.1 | Secure Software Development Lifecycle | CWE-798 |
| V9.1 | Client Communication Security | CWE-522 |

---

## What We Did About It

Based on this scan, we fixed everything in a single session:

1. **Added RBAC middleware** to all 129 API routes — `withRole()` and `withPermission()` guards on every mutation endpoint
2. **Moved all secrets** to environment variables with AES-256-GCM encryption at rest
3. **Upgraded 3 vulnerable dependencies** to patched versions
4. **Added rate limiting** to all public endpoints
5. **Fixed 13 critical security findings** across auth, RBAC, CSRF, and session management

The scan-to-fix cycle took one session. The same work — manually mapping 87 findings to compliance controls using spreadsheets — would have taken 40+ hours.

---

## What This Proves

1. **Auto-triage works.** 30% of findings were correctly dismissed without human review.
2. **API route scanning finds what dependency scanners miss.** 47 of 87 findings came from API security analysis, not CVE databases.
3. **Compliance mapping is instant.** 8 affected controls across 2 frameworks, computed in under 30 seconds.
4. **Real codebases have real issues.** We build security software and still had 48 true positive findings. If we have them, you probably do too.

---

## Run It On Your Code

```bash
# Same scan we ran
npx @cveriskpilot/scan --preset startup

# Defense contractor? CMMC + NIST
npx @cveriskpilot/scan --preset defense

# All 6 frameworks
npx @cveriskpilot/scan --preset all

# JSON for CI/CD integration
npx @cveriskpilot/scan --preset startup --format json
```

Free. Offline. No account. No API key.

If a vulnerability management platform can find 87 issues in its own code, imagine what it'll find in yours.

---

*[CVERiskPilot](https://cveriskpilot.com) is 100% Veteran Owned, built in Texas.*

---

**Tags:** DevSecOps, Dogfooding, Security Scanning, Compliance, SOC 2, OWASP ASVS, RBAC, Vulnerability Management, Open Source
