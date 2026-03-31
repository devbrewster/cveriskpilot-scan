---
title: I built a free compliance scanner because the enterprise ones cost more than my rent
published: true
tags: security, opensource, devops, beginners
canonical_url: https://cveriskpilot.com/blog/compliance-scanner
cover_image:
series:
description: An open-source CLI that scans your dependencies, secrets, IaC, and API routes — then maps every finding to NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF. One command. No account. Runs offline.
---

I'm a cybersecurity engineer — 7 years in. I started building a SaaS product on the side and immediately hit a wall: how do I prove this thing is compliant without spending $50k on GRC tooling?

So I built the compliance mapping myself. Then I realized it was more useful than the SaaS it was meant to protect.

## The problem

You run `npm audit`. You get 47 vulnerabilities. Now what?

Which ones violate SOC 2 controls? Which ones show up on a CMMC assessment? Which ones would a FedRAMP auditor flag? Nobody tells you that. You're supposed to figure it out by cross-referencing CVEs to CWEs to NIST controls to framework mappings — manually, in spreadsheets, on a Friday afternoon.

That's insane.

## What I built

```bash
npx @cveriskpilot/scan@latest --preset startup
```

One command. No account. No API key. Runs offline.

**Four scanners in one pass:**
- **Dependencies** — npm, yarn, pnpm, Go, pip, Poetry, Cargo, Gemfile, pom.xml, build.gradle
- **Secrets** — 30+ patterns + Shannon entropy detection
- **Infrastructure as Code** — Terraform, CloudFormation, Dockerfile, Kubernetes YAML
- **API Security** — Static analysis of Next.js API routes for missing auth, RBAC, CSRF, mass assignment, rate limiting

Every finding maps to **6 compliance frameworks**: NIST 800-53, SOC 2, CMMC, FedRAMP, OWASP ASVS, and SSDF. 135 controls checked.

Instead of just "lodash has CVE-2021-23337," you get:

- The CWE classification
- Which NIST 800-53 controls it violates
- The SOC 2, CMMC, and FedRAMP equivalents
- An auto-triage verdict (TRUE_POSITIVE, FALSE_POSITIVE, or NEEDS_REVIEW)
- Only true positives count toward your CI pass/fail

All in your terminal. JSON, SARIF, and Markdown output for CI/CD or reports.

## Why I'm posting this

I've been building in a vacuum. The scanner works, it's on npm, but I haven't gotten much feedback from the people who would actually use it.

**A few things I'd genuinely love input on:**

- Is the terminal output too dense, or do you want all that detail?
- What package managers should I support next? (Currently: npm, yarn, pnpm, pip, Poetry, Go, Cargo, Gemfile, pom.xml, build.gradle)
- Would you actually use a GitHub Action wrapper for this?
- Does compliance mapping even matter to you, or is that only a concern when a prospect asks?

## Try it

```bash
# scan current directory with startup preset
npx @cveriskpilot/scan@latest --preset startup

# just dependencies
npx @cveriskpilot/scan@latest --deps-only

# output as JSON
npx @cveriskpilot/scan@latest --preset startup --format json > results.json

# SARIF for GitHub Code Scanning
npx @cveriskpilot/scan@latest --format sarif > results.sarif

# filter by severity
npx @cveriskpilot/scan@latest --preset startup --severity HIGH
```

Zero dependencies. Works on Node 20+. Runs in seconds.

{% embed https://www.npmjs.com/package/@cveriskpilot/scan %}

**GitHub:** [devbrewster/cveriskpilot-scan](https://github.com/devbrewster/cveriskpilot-scan)

I'm a solo veteran founder building this bootstrapped from Texas. The CLI is free and open source — the platform behind it (AI triage, POAM generation, case management, dashboards) is in beta at [cveriskpilot.com](https://cveriskpilot.com).

If this is useful to even one person who would've otherwise spent a weekend in spreadsheet hell — that's a win.

Tear it apart. I can take it.
