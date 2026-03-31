# CVERiskPilot Scanner — Complete Guide

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Scanners](#scanners)
- [Compliance Mapping Deep Dive](#compliance-mapping-deep-dive)
- [Finding Verdicts & Triage](#finding-verdicts--triage)
- [GitHub Action](#github-action)
- [SARIF Integration](#sarif-integration)
- [Compliance Badge](#compliance-badge)
- [CI/CD Integration Patterns](#cicd-integration-patterns)
- [Configuration Reference](#configuration-reference)
- [FAQ](#faq)

## Overview

CVERiskPilot Scanner (`@cveriskpilot/scan`) is a zero-dependency compliance scanner that runs locally or in CI/CD. It scans four dimensions — dependencies (SBOM/SCA), hardcoded secrets, infrastructure-as-code, and API routes — then maps every finding to 6 compliance frameworks through CWE bridging.

**Key design principles:**
- **Offline-first** — no API keys or network access required for scanning
- **Zero config** — works out of the box on any Node.js 20+ project
- **Framework-agnostic** — scans npm, pip, cargo, go, gem, maven, gradle ecosystems
- **Compliance-native** — every finding maps to NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Entry Point                        │
│  npx @cveriskpilot/scan --preset defense --fail-on high  │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │   SBOM   │ │ Secrets  │ │   IaC    │
   │ Scanner  │ │ Scanner  │ │ Scanner  │
   └────┬─────┘ └────┬─────┘ └────┬─────┘
        │             │             │
        └──────┬──────┘─────┬──────┘
               ▼            ▼
        ┌─────────────────────────┐
        │   CWE Tagging Engine    │
        │  Finding → CWE-XXX     │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  Compliance Mapper      │
        │  CWE → NIST → All 6    │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  Verdict Engine         │
        │  TP / FP / Review       │
        └───────────┬─────────────┘
                    ▼
        ┌─────────────────────────┐
        │  Output Formatter       │
        │  table/json/sarif/md    │
        └─────────────────────────┘
```

## Scanners

### SBOM/SCA Scanner (`--deps-only`)

Parses lock files to build a software bill of materials, then checks each package against known vulnerability databases.

**Supported ecosystems:**
| Lock File | Ecosystem |
|-----------|-----------|
| `package-lock.json` | npm |
| `yarn.lock` | Yarn |
| `pnpm-lock.yaml` | pnpm |
| `requirements.txt` / `Pipfile.lock` | Python/pip |
| `Cargo.lock` | Rust/Cargo |
| `go.sum` | Go |
| `Gemfile.lock` | Ruby |
| `pom.xml` / `build.gradle` | Java/Maven/Gradle |

**How it works:**
1. Walks the project directory for lock files
2. Parses each lock file to extract package names and versions
3. Checks against an offline advisory database bundled with the scanner
4. Tags each vulnerable package with CVE IDs and CWE categories
5. Classifies verdicts: TRUE_POSITIVE for confirmed matches, FALSE_POSITIVE for substring-only matches, NEEDS_REVIEW for unknown versions

### Secrets Scanner (`--secrets-only`)

Detects hardcoded credentials using 30+ regex patterns plus Shannon entropy analysis.

**Detection patterns include:**
- AWS access keys, secret keys, session tokens
- Google Cloud service account keys
- Stripe, Twilio, SendGrid, Slack tokens
- Database connection strings (PostgreSQL, MySQL, MongoDB, Redis)
- Private keys (RSA, ECDSA, ED25519, PGP)
- JWT tokens, Basic auth headers
- Generic high-entropy strings (API keys, secrets)

**Smart triage:**
- Auto-dismisses matches in test files, fixtures, `.env.example`, README samples
- Flags `.gitignored` files as NEEDS_REVIEW (not committed but worth checking)
- Recognizes documentation placeholders containing "example", "sample", "test"

### IaC Scanner (`--iac-only`)

Checks infrastructure-as-code files against 29 security rules.

**Supported formats:**
| Format | File Patterns |
|--------|--------------|
| Terraform | `*.tf`, `*.tfvars` |
| Dockerfile | `Dockerfile*` |
| Kubernetes | `*.yaml`, `*.yml` (with apiVersion) |
| CloudFormation | `*.yaml`, `*.yml`, `*.json` (with AWSTemplateFormatVersion) |

**Rule categories:**
- Encryption at rest and in transit
- Public access and network exposure
- IAM and privilege escalation
- Logging and monitoring
- Container security (root user, privileged mode, capabilities)
- Resource limits and quotas

## Compliance Mapping Deep Dive

### The CWE Bridge Architecture

Rather than maintaining separate mappings for each framework, the scanner uses NIST 800-53 as a canonical hub:

```
Finding → CWE-798 (Hardcoded Credentials)
  → NIST 800-53: IA-5 (Authenticator Management)
    → SOC 2: CC6.1 (Logical Access Security)
    → CMMC: IA.L2-3.5.3 (Authenticator Management)
    → FedRAMP: IA-5 (same as NIST)
    → ASVS: V1.2 (Authentication Architecture)
    → SSDF: PO.5 (Protect Software)
```

### Control Counts by Framework

| Framework | Controls Mapped | Example Controls |
|-----------|:--------------:|-----------------|
| NIST 800-53 | 45 | AC-3, IA-5, SC-28, SI-10 |
| SOC 2 Type II | 7 | CC6.1, CC6.8, CC7.2, CC8.1 |
| CMMC Level 2 | 33 | AC.L2-3.1.2, IA.L2-3.5.3, SC.L2-3.13.8 |
| FedRAMP Moderate | 35 | AC-3, IA-5, SC-8, SI-2 |
| OWASP ASVS 4.0 | 7 | V1.1, V1.2, V5.1, V9.1 |
| NIST SSDF 1.1 | 8 | PO.5, PS.1, PW.6, RV.1 |

### Why This Matters

Most scanners stop at "you have a vulnerability." CVERiskPilot tells you:
- **Which compliance controls are affected** — so you know the audit impact
- **How many frameworks are impacted** — a single SQL injection can affect 5+ frameworks
- **What to prioritize** — findings affecting more controls are higher compliance risk

## Finding Verdicts & Triage

Every finding is automatically classified:

| Verdict | Label | Meaning |
|---------|-------|---------|
| `TRUE_POSITIVE` | `[TP]` | Confirmed real finding. Requires action. |
| `NEEDS_REVIEW` | `[REVIEW]` | Ambiguous — human review needed. |
| `FALSE_POSITIVE` | `[FP]` | Auto-dismissed. Test data, examples, known-safe patterns. |

**Triage rules:**
- Test files, fixtures, and sample data → `FALSE_POSITIVE`
- `.gitignored` secrets → `NEEDS_REVIEW` (not committed, but verify)
- Documentation placeholders (`EXAMPLE`, `your-key-here`) → `FALSE_POSITIVE`
- Substring-only package matches → `FALSE_POSITIVE`
- Direct vulnerability matches with confirmed CVE → `TRUE_POSITIVE`

## GitHub Action

### Basic Setup

Add to `.github/workflows/compliance.yml`:

```yaml
name: Compliance Scan
on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write
  security-events: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: devbrewster/cveriskpilot-scan@main
        with:
          preset: all
          fail-on: critical
```

### What Happens

1. **Scan** — runs `npx @cveriskpilot/scan --ci` against your repo
2. **PR Comment** — posts a formatted compliance report as a PR comment (updates on re-push, no spam)
3. **SARIF Upload** — findings appear in GitHub Security > Code scanning tab
4. **Exit Code** — fails the check if findings exceed your threshold

### PR Comment Example

The action posts a comment like this on every PR:

> ## CVERiskPilot Compliance Scan
>
> > **PASS** — No findings at or above **CRITICAL** severity.
>
> **0** Critical  **2** High  **5** Medium  **1** Low  **0** Info
>
> **Triage:** 2 actionable · 1 needs review · 5 auto-dismissed
>
> <sub>884 dependencies (npm) · Scanners: sbom, secrets, iac · Duration: 3200ms</sub>
>
> <details>
> <summary><strong>3 Findings Requiring Attention</strong></summary>
>
> | Severity | Verdict | Finding | CWE | Location |
> |----------|---------|---------|-----|----------|
> | HIGH | Review | Anthropic API Key detected | CWE-798 | `.env.local:24` |
> | MEDIUM | TP | Entity Expansion Limits Bypassed | CWE-1284 | `fast-xml-parser` |
> | MEDIUM | Review | Generic Secret Assignment | CWE-798 | `config/defaults.ts:15` |
>
> </details>
>
> <details>
> <summary><strong>Compliance Impact — 10 controls affected</strong></summary>
>
> | Framework | Controls Affected | Control IDs |
> |-----------|:-----------------:|-------------|
> | **NIST 800-53** | 4 | IA-5, CM-6, SC-28, SA-15 |
> | **SOC 2 Type II** | 2 | CC6.1, CC8.1 |
> | **CMMC Level 2** | 2 | IA.L2-3.5.3, CM.L2-3.4.2 |
> | **FedRAMP Moderate** | 2 | IA-5, CM-6 |
>
> </details>
>
> ---
> <sub>Scanned by CVERiskPilot · CLI · Setup Guide</sub>

### Advanced: Conditional Checks

```yaml
- uses: devbrewster/cveriskpilot-scan@main
  id: scan
  with:
    preset: defense
    fail-on: high

- name: Block merge if CMMC controls affected
  if: steps.scan.outputs.controls-affected > 0
  run: |
    echo "::error::${{ steps.scan.outputs.controls-affected }} compliance controls affected"
    exit 1
```

## SARIF Integration

### GitHub Security Tab

When `upload-sarif: 'true'` (default), findings appear in your repo's **Security > Code scanning** tab. This gives you:

- Persistent finding tracking across PRs
- Dismissal workflow (dismiss with reason)
- Alert history and trends
- Integration with GitHub's security overview for organizations

### GitLab SAST

```bash
crp-scan --format sarif > gl-sast-report.json
```

Add to `.gitlab-ci.yml`:
```yaml
compliance-scan:
  script:
    - npx @cveriskpilot/scan@latest --format sarif > gl-sast-report.json
  artifacts:
    reports:
      sast: gl-sast-report.json
```

### Azure DevOps

```yaml
- script: npx @cveriskpilot/scan@latest --format sarif > $(Build.ArtifactStagingDirectory)/compliance.sarif
- task: PublishBuildArtifacts@1
  inputs:
    PathtoPublish: $(Build.ArtifactStagingDirectory)/compliance.sarif
    ArtifactName: CodeAnalysisLogs
```

## Compliance Badge

### Setup

After creating a CVERiskPilot account, add this to your README:

```markdown
![Compliance](https://cveriskpilot.com/api/badge/YOUR_ORG_ID)
```

Replace `YOUR_ORG_ID` with your organization ID from the CVERiskPilot dashboard.

### How It Works

1. Badge endpoint receives request with your org ID
2. Queries unresolved findings by severity from your latest scans
3. Returns a 302 redirect to shields.io with the appropriate color:
   - **Green** — no critical or high findings ("passing")
   - **Orange** — high-severity findings present ("N high")
   - **Red** — critical findings present ("N critical")
   - **Gray** — org not found or error
4. Response cached for 5 minutes
5. **Privacy:** only exposes pass/fail status, never finding details

### Badge Styles

| Style | Example |
|-------|---------|
| `flat` (default) | ![flat](https://img.shields.io/badge/compliance-passing-4caf50?style=flat) |
| `flat-square` | ![flat-square](https://img.shields.io/badge/compliance-passing-4caf50?style=flat-square) |
| `for-the-badge` | ![for-the-badge](https://img.shields.io/badge/compliance-passing-4caf50?style=for-the-badge) |
| `plastic` | ![plastic](https://img.shields.io/badge/compliance-passing-4caf50?style=plastic) |

## CI/CD Integration Patterns

### GitHub Actions (recommended)
See [GitHub Action](#github-action) section above.

### GitLab CI
```yaml
stages:
  - compliance

compliance-scan:
  stage: compliance
  image: node:20-slim
  script:
    - npx @cveriskpilot/scan@latest --ci --preset enterprise --fail-on high
  rules:
    - if: $CI_MERGE_REQUEST_ID
  allow_failure: false
```

### Jenkins
```groovy
pipeline {
  agent { docker { image 'node:20-slim' } }
  stages {
    stage('Compliance') {
      steps {
        sh 'npx @cveriskpilot/scan@latest --ci --preset enterprise --fail-on high'
      }
    }
  }
}
```

### CircleCI
```yaml
jobs:
  compliance:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: npx @cveriskpilot/scan@latest --ci --preset all --fail-on critical
```

### Pre-commit Hook
```bash
# .husky/pre-commit or .git/hooks/pre-commit
npx @cveriskpilot/scan@latest --secrets-only --fail-on high --no-upload
```

## Configuration Reference

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CRP_API_KEY` | API key for dashboard upload (alternative to `--api-key`) |
| `CRP_API_URL` | Custom API endpoint (alternative to `--api-url`) |
| `NO_COLOR` | Disable colored output |
| `CI` | Auto-detected; enables CI mode behavior |

### Exit Code Behavior

The `--fail-on` flag controls exit codes:

```bash
# Only fail on critical (default)
crp-scan --fail-on critical    # exits 1 if any CRITICAL findings

# Fail on high or above
crp-scan --fail-on high        # exits 1 if HIGH or CRITICAL

# Fail on medium or above (strictest practical threshold)
crp-scan --fail-on medium      # exits 1 if MEDIUM, HIGH, or CRITICAL

# Never fail (audit mode)
crp-scan --fail-on info        # always exits 0 (unless scanner error)
```

## FAQ

**Q: Does it need internet access?**
No. All scanning and compliance mapping runs locally. Internet is only needed for `--upload` (optional) and update notifications.

**Q: Can I use it on non-Node.js projects?**
Yes. The SBOM scanner supports pip, cargo, go, gem, and maven/gradle. The secrets and IaC scanners are language-agnostic.

**Q: How is this different from Snyk/Trivy/Checkov?**
Those are excellent detection tools. CVERiskPilot adds the compliance mapping layer on top — every finding maps to 6 frameworks. You can use both together.

**Q: What if I only need CMMC?**
Use `--preset defense` or `--frameworks cmmc` to only see CMMC-relevant controls.

**Q: Can I add custom rules?**
Not yet. Custom rule engine (`.crp-rules.yml`) is on the roadmap.

**Q: Does the badge expose my vulnerabilities?**
No. The badge only shows pass/fail status and a count. No finding details, file paths, or CVE IDs are exposed.
