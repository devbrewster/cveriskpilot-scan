# The Missing Link Between CI/CD Scanning and Compliance

*How one CLI command maps vulnerabilities to NIST, SOC 2, CMMC, FedRAMP, ASVS, and SSDF — so your GRC team stops living in spreadsheets.*

---

## The Compliance Gap Nobody Talks About

Your CI/CD pipeline catches vulnerabilities. Snyk finds a critical CVE in a transitive dependency. Semgrep flags an injection risk. Trivy surfaces a misconfigured Dockerfile.

Then what?

Someone exports the findings to CSV. Opens a spreadsheet. Spends the next two days manually mapping each CVE to NIST 800-53 controls. Then they build POAM entries by hand. Then they do it again next quarter.

**GRC teams spend 40+ hours every quarter on this.** That's a full work week gone — not finding problems, not fixing them — just translating between systems that should already be talking to each other.

The pipeline catches the vulnerability. The auditor needs the compliance impact. Nobody connects the two.

That's the gap.

---

## What If Your Scanner Already Knew?

Imagine this: your CI pipeline finds a SQL injection vulnerability (CWE-89). Instead of a Jira ticket that says "fix SQL injection," your team immediately sees:

| Framework | Affected Controls |
|-----------|-------------------|
| NIST 800-53 | SI-10 (Information Input Validation), SA-11 (Developer Testing) |
| SOC 2 Type II | CC8.1 (Change Management) |
| CMMC Level 2 | SI.L2-3.14.1 (Malicious Code Protection) |
| FedRAMP Moderate | SI-2 (Flaw Remediation), SA-11 |
| OWASP ASVS 4.0 | V5.1 (Input Validation), V1.1 (Architecture) |

No spreadsheet. No mapping exercise. No waiting until next quarter.

That's what Pipeline Compliance Scanner does.

---

## How It Works

`@cveriskpilot/scan` runs **four scanners in parallel** and maps every finding through the full compliance chain:

```
CWE weakness ID  -->  NIST 800-53 controls  -->  Cross-framework mapping
                      (canonical hub)              SOC 2, CMMC, FedRAMP,
                                                   ASVS, SSDF equivalents
```

One command. Four scanners. Six compliance frameworks. 135 controls checked.

```bash
npx @cveriskpilot/scan --preset startup
```

```
 CVERiskPilot Scanner v0.1.11

 Scanning /home/user/my-app ...

 [SBOM]     842 dependencies across 3 ecosystems
 [Secrets]  873 files checked (30+ patterns + entropy)
 [IaC]      22 templates (Terraform, Dockerfile, K8s)
 [API]      47 route handlers analyzed

 ──────────────────────────────────────────────
 FINDINGS SUMMARY
 ──────────────────────────────────────────────
  CRITICAL   3   [TP: 3]
  HIGH       7   [TP: 5  FP: 1  REVIEW: 1]
  MEDIUM    18   [TP: 12  FP: 4  REVIEW: 2]
  LOW        6   [TP: 2  FP: 3  REVIEW: 1]

 Verdicts: 22 actionable | 4 need review | 8 auto-dismissed

 COMPLIANCE IMPACT
 ──────────────────────────────────────────────
  SOC 2 Type II     4/7 controls affected
  OWASP ASVS 4.0    5/7 controls affected

 Exit: 1 (CRITICAL findings detected)
```

---

## The Four Scanners

### 1. Dependencies (SBOM)

Parses lock files and generates a CycloneDX 1.5 SBOM. Cross-references every package against known vulnerability advisories.

**Supported ecosystems:**
- **Node.js** — package-lock.json, yarn.lock, pnpm-lock.yaml
- **Python** — requirements.txt, Pipfile.lock, poetry.lock
- **Go** — go.sum
- **Rust** — Cargo.lock
- **Ruby** — Gemfile.lock
- **Java** — pom.xml, build.gradle

### 2. Secrets

Scans your entire codebase for hardcoded credentials using 30+ regex patterns plus Shannon entropy detection.

**What it catches:**
- AWS access keys, Azure client secrets, GCP service account keys
- GitHub/GitLab tokens, Slack webhooks, Stripe/Twilio secrets
- Private keys (RSA, EC, Ed25519), database connection strings
- JWT secrets, API keys, basic auth credentials

**Smart verdicts:** Automatically dismisses findings in test files, `.env.example`, regex literals, charset constants, and sample/report files. Flags gitignored files with secrets as `NEEDS_REVIEW`.

### 3. Infrastructure as Code

Checks your deployment configurations against CIS benchmarks and NIST 800-53 controls. 29 rules across four template types.

**Supported formats:**
- Terraform (`.tf`)
- AWS CloudFormation (JSON/YAML)
- Kubernetes manifests
- Dockerfiles

**What it catches:** Public S3 buckets, missing encryption at rest, overprivileged IAM policies, exposed ports, disabled logging, running containers as root, missing resource limits.

### 4. API Security *(new)*

Static analysis of Next.js API routes. Catches the security gaps that code review misses.

**What it catches:**
- Missing authentication checks on protected endpoints
- Missing RBAC (role-based access control) enforcement
- Missing CSRF protection on mutation routes (POST/PUT/PATCH/DELETE)
- Missing organization scoping (tenant isolation gaps)
- Mass assignment vulnerabilities (accepting raw request body without validation)
- Missing rate limiting on sensitive endpoints
- Missing input validation

Maps every finding to OWASP Top 10 categories, NIST 800-53 controls, and CWE IDs.

---

## Six Compliance Frameworks, 135 Controls

Every finding maps through NIST 800-53 as the canonical hub, then cross-references to equivalent controls in five other frameworks:

| Framework | Controls | Use Case |
|-----------|----------|----------|
| **NIST 800-53 Rev 5** | 45 | Federal systems, FedRAMP, general security baseline |
| **CMMC Level 2** | 33 | Defense contractors, DIB supply chain |
| **FedRAMP Moderate** | 35 | Cloud services for federal agencies |
| **NIST SSDF 1.1** | 8 | Secure software development lifecycle |
| **SOC 2 Type II** | 7 | SaaS, startups, enterprise sales |
| **OWASP ASVS 4.0** | 7 | Application security verification |

**Coming soon:** HIPAA, PCI-DSS, ISO 27001, GDPR. Pass them now and the CLI accepts with a warning — mapping is in progress.

---

## Auto-Triage: Not Every Finding Is Actionable

Security scanners are noisy. A secrets scanner that flags `const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"` as a hardcoded credential wastes everyone's time.

Every finding gets a **verdict**:

| Verdict | Meaning | Action |
|---------|---------|--------|
| `TRUE_POSITIVE` | Real, actionable vulnerability | Fix it |
| `FALSE_POSITIVE` | Auto-dismissed by heuristics | Ignored in exit code |
| `NEEDS_REVIEW` | Uncertain — requires human judgment | Review it |

**How it works:**
- Secrets in test files, example configs, and regex literals → `FALSE_POSITIVE`
- Secrets in gitignored files → `NEEDS_REVIEW` (not exploitable in most cases, but worth checking)
- SBOM substring-matched packages (e.g., "express" matching a vulnerability in "express-validator") → `FALSE_POSITIVE`
- Unknown package versions → `NEEDS_REVIEW` (can't determine if vulnerable without version)
- Direct IaC rule matches → `TRUE_POSITIVE`

**The exit code only counts TRUE_POSITIVE findings.** Your CI pipeline won't fail because of a dismissed false positive.

---

## Presets: Zero Config for Common Stacks

Don't want to think about which frameworks apply to you? Pick a preset:

```bash
# SOC 2 + ASVS (getting enterprise-ready)
crp-scan --preset startup

# NIST 800-53 + FedRAMP + SSDF (federal cloud)
crp-scan --preset federal

# NIST 800-53 + CMMC + SSDF (defense contractors)
crp-scan --preset defense

# NIST 800-53 + SOC 2 + ASVS + SSDF (large org)
crp-scan --preset enterprise

# ASVS + SSDF (developer-focused)
crp-scan --preset devsecops

# All 6 frameworks
crp-scan --preset all
```

Or pick exactly the frameworks you need:

```bash
crp-scan --frameworks soc2,cmmc,asvs
```

Aliases work too — `soc2`, `soc`, `soc-2` all resolve to SOC 2 Type II. Run `crp-scan --list-frameworks` to see everything.

---

## Output Formats

### Terminal (default)

Colored severity badges, compliance impact summary, verdict tags. Respects `NO_COLOR` and adapts to terminal width.

```bash
crp-scan --preset startup
```

### JSON

Machine-readable output with full compliance impact report. Pipe to `jq`, feed to your own tooling, or upload to CVERiskPilot.

```bash
crp-scan --format json | jq '.complianceImpact'
```

### Markdown

GitHub-flavored markdown tables — ready to paste into a PR comment or documentation.

```bash
crp-scan --format markdown >> SECURITY.md
```

### SARIF 2.1.0

Standard format for static analysis results. Integrates with VS Code, GitHub Code Scanning, and any SARIF-compatible tool.

```bash
crp-scan --format sarif > results.sarif
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Compliance Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run compliance scan
        run: |
          npx @cveriskpilot/scan@latest \
            --preset enterprise \
            --api-routes \
            --ci \
            --fail-on critical
```

The `--ci` flag is shorthand for `--format json --fail-on critical` with color disabled. The exit code tells your pipeline whether to pass or fail:

| Exit Code | Meaning |
|-----------|---------|
| `0` | No findings at or above `--fail-on` severity |
| `1` | Findings detected at or above threshold |
| `2` | Scanner error (config issue, missing files) |

### GitLab CI

```yaml
compliance-scan:
  image: node:20
  script:
    - npm ci
    - npx @cveriskpilot/scan@latest --preset startup --ci --fail-on high
  allow_failure: false
```

### PR Comments

Generate a markdown compliance report and post it as a PR comment:

```bash
npx @cveriskpilot/scan --format markdown > scan-report.md
```

The scanner exports a `formatPrComment()` function for custom integrations:

```javascript
import { scanDependencies, scanSecrets, scanIaC } from '@cveriskpilot/scan';
```

---

## Advanced Usage

### Filter by Severity

Skip the noise. Only show HIGH and CRITICAL findings:

```bash
crp-scan --severity HIGH --preset startup
```

### Exclude Known Accepted Risks

Already accepted CWE-79 (XSS) in your risk register? Exclude it:

```bash
crp-scan --exclude-cwe CWE-79,CWE-89 --preset enterprise
```

### Exclude Paths

Skip generated code, vendor directories, or test fixtures:

```bash
crp-scan --exclude "generated/**" --exclude "vendor/**"
```

### Scan Specific Scanners Only

```bash
# Dependencies only (fastest)
crp-scan --deps-only

# Secrets only
crp-scan --secrets-only

# IaC only
crp-scan --iac-only

# API routes only (Next.js)
crp-scan --api-routes
```

### Upload to CVERiskPilot Platform

Connect your scans to the full platform for POAM generation, AI triage, case management, and executive reports:

```bash
crp-scan --preset enterprise --api-key $CRP_API_KEY
```

Use `--no-upload` to force local-only scans even when an API key is set. Use `--dry-run` to preview results without persisting anything.

---

## Library API

`@cveriskpilot/scan` also works as a Node.js library. Embed scanning into your own tools, custom CI scripts, or internal dashboards:

```javascript
import { scanDependencies, scanSecrets, scanIaC, formatOutput } from '@cveriskpilot/scan';

const deps = await scanDependencies('/path/to/project');
const secrets = await scanSecrets('/path/to/project');
const iac = await scanIaC('/path/to/project');

const allFindings = [...deps, ...secrets, ...iac];
const output = formatOutput(allFindings, { format: 'json', frameworks: ['soc2-type2'] });
console.log(output);
```

---

## What It Doesn't Do

Clarity matters. Here's what the CLI does **not** do:

- **POAM generation** — The CLI maps findings to controls. The [CVERiskPilot platform](https://cveriskpilot.com) generates POAMs, tracks remediation, and produces audit-ready reports.
- **AI triage** — Automated verdict classification (TP/FP/REVIEW) uses heuristics, not AI. AI-powered deep triage is a platform feature.
- **Zero-day detection** — The tool maps *known* CVEs and CWEs. It doesn't discover new vulnerabilities.
- **Real-time monitoring** — The CLI runs on-demand. Continuous monitoring is a platform feature.
- **SOC 2 certification** — The tool maps findings *to* SOC 2 controls. It doesn't certify your compliance.

---

## Installation & Requirements

```bash
# Run without installing (recommended)
npx @cveriskpilot/scan@latest --preset startup

# Or install globally
npm install -g @cveriskpilot/scan
crp-scan --preset startup
```

**Requirements:**
- Node.js 20 or later
- Zero external dependencies (no native modules, no build step)
- Works offline — no network required for local scans
- Apache 2.0 license

---

## Pricing

| Feature | Free | Platform ($29/mo) |
|---------|------|-------------------|
| Local scans | Unlimited | Unlimited |
| 4 scanners (SBOM, Secrets, IaC, API) | Yes | Yes |
| 6 compliance frameworks | Yes | Yes |
| 135 control mappings | Yes | Yes |
| Auto-triage verdicts | Yes | Yes |
| All output formats (table, JSON, markdown, SARIF) | Yes | Yes |
| Enriched data (CVSS, fix versions, recommendations) | - | Yes |
| POAM auto-generation | - | Yes |
| AI-powered deep triage | - | Yes |
| Dashboard & case management | - | Yes |
| Executive reports & CSV export | - | Yes |
| Connector sync (Tenable, Qualys, CrowdStrike, Rapid7, Snyk) | - | Yes |

The CLI is free. The platform is where compliance becomes continuous.

---

## What's New in v0.1.11

Since the initial launch, the scanner has shipped 10 releases:

- **API Security Scanner** — Static analysis of Next.js API routes for missing auth, RBAC, CSRF, org scoping, mass assignment, rate limiting, and input validation
- **SARIF 2.1.0 output** — Integrates with VS Code, GitHub Code Scanning, and any SARIF-compatible tool
- **Enterprise preset** — NIST 800-53 + SOC 2 + ASVS + SSDF in one flag
- **Auto-triage verdicts** — Every finding classified as TRUE_POSITIVE, FALSE_POSITIVE, or NEEDS_REVIEW with heuristic reasoning
- **Parallel scanning** — 50 files at a time, gitignore-aware directory walking
- **Live progress spinner** — Real-time scan status in terminal (auto-disabled in CI)
- **Severity filtering** — `--severity HIGH` skips medium/low noise
- **CWE exclusions** — `--exclude-cwe CWE-79` for known accepted risks
- **Framework explorer** — `--list-frameworks` shows all controls, aliases, and presets
- **Update notifier** — Non-blocking check for newer versions on npm
- **Verdict-aware exit codes** — Only TRUE_POSITIVE findings count toward CI pass/fail

---

## Get Started

```bash
npx @cveriskpilot/scan@latest --preset startup
```

Three seconds. Four scanners. Six frameworks. 135 controls.

Your auditor will thank you.

---

*Built by [CVERiskPilot LLC](https://cveriskpilot.com) — 100% Veteran Owned, Texas*

*[GitHub](https://github.com/devbrewster/cveriskpilot-scan) | [npm](https://npmjs.com/package/@cveriskpilot/scan) | [Platform](https://cveriskpilot.com)*
