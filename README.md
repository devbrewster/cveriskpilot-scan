<a href="https://www.producthunt.com/products/cveriskpilot?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-cveriskpilot" target="_blank" rel="noopener noreferrer"><img alt="CVERiskPilot - CVE triage on autopilot. Compliance included | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1110874&theme=light&t=1774873023311"></a>

# @cveriskpilot/scan

Pipeline Compliance Scanner — scan your codebase for vulnerable dependencies, hardcoded secrets, and infrastructure-as-code misconfigurations, then automatically map findings to **6 compliance frameworks**.

**Zero config. Offline-first. Compliance mapping built in.**

## Quick Start

### Install from npm

```bash
# Run instantly (no install needed — always uses latest)
npx --package @cveriskpilot/scan@latest crp-scan

# Or install globally
npm install -g @cveriskpilot/scan@latest
crp-scan
cveriskpilot-scan   # full name also works
```

### Install from GitHub

```bash
git clone https://github.com/devbrewster/cveriskpilot-scan.git
cd cveriskpilot-scan
npm install
npm run build

# Scan any project
node dist/cli.js /path/to/your/project

# Or link globally
npm link
crp-scan /path/to/your/project
```

## What It Does

1. **Scans** your project for vulnerabilities across four dimensions:
   - **SBOM/SCA** — Detects vulnerable dependencies in `package-lock.json`, `yarn.lock`, `requirements.txt`, `Cargo.lock`, `go.sum`, and more
   - **Secrets** — Finds hardcoded API keys, passwords, private keys, and tokens using 30+ regex patterns + entropy detection
   - **IaC** — Checks Terraform, Dockerfile, Kubernetes YAML, and CloudFormation for security misconfigurations
   - **API Routes** — Detects missing authentication, CSRF protection, and input validation on API endpoints

2. **Maps** every finding to compliance controls via CWE:
   ```
   Finding → CWE → NIST 800-53 → SOC 2 / CMMC / FedRAMP / ASVS / SSDF
   ```

3. **Reports** which compliance controls are affected, so you know your audit impact immediately

## Supported Frameworks

| Framework | CLI ID | Aliases | Controls |
|-----------|--------|---------|----------|
| NIST 800-53 Rev 5 | `nist-800-53` | `nist`, `nist800` | 45 |
| SOC 2 Type II | `soc2-type2` | `soc2`, `soc` | 7 |
| CMMC Level 2 | `cmmc-level2` | `cmmc`, `cmmc2` | 33 |
| FedRAMP Moderate | `fedramp-moderate` | `fedramp` | 35 |
| OWASP ASVS 4.0 | `owasp-asvs` | `asvs`, `owasp` | 7 |
| NIST SSDF 1.1 | `nist-ssdf` | `ssdf` | 8 |

**135 total controls** mapped via 80+ CWE entries.

## Framework Presets

| Preset | Frameworks | For |
|--------|-----------|-----|
| `federal` | NIST 800-53 + FedRAMP + SSDF | Federal agencies |
| `defense` | NIST 800-53 + CMMC + SSDF | Defense contractors |
| `enterprise` | NIST 800-53 + SOC 2 + ASVS + SSDF | Enterprise / regulated |
| `startup` | SOC 2 + ASVS | SaaS startups |
| `devsecops` | ASVS + SSDF | DevSecOps teams |
| `all` | All 6 frameworks | Comprehensive |

## Usage

```bash
# Scan current directory — all frameworks, colored table output
crp-scan

# Scan a specific project
crp-scan /path/to/your/project

# SOC 2 + ASVS only (startup preset)
crp-scan --preset startup

# CMMC + FedRAMP only (using aliases)
crp-scan --frameworks CMMC,FEDRAMP

# Only HIGH and CRITICAL findings
crp-scan --severity HIGH

# Dependencies only, JSON output
crp-scan --deps-only --format json

# Exclude test files and specific CWEs
crp-scan --exclude test/** --exclude-cwe CWE-79,CWE-89

# CI/CD mode (JSON output, exit code 1 on critical findings)
crp-scan --ci

# SARIF output for GitHub/GitLab integration
crp-scan --format sarif > results.sarif

# Upload results to CVERiskPilot dashboard
crp-scan --api-key $CRP_API_KEY

# List all frameworks, presets, and aliases
crp-scan --list-frameworks

# Defense contractor full scan
crp-scan --preset defense --fail-on high --verbose

# AI-powered remediation (requires local Ollama or llama.cpp)
crp-scan --ai

# AI with specific model
crp-scan --ai --ai-model mistral

# AI with explicit provider and URL
crp-scan --ai --ai-provider llamacpp --ai-url http://127.0.0.1:8080
```

> **Note:** `crp-scan` and `cveriskpilot-scan` are interchangeable. Use whichever you prefer.

## CLI Flags

### Scanner Control
| Flag | Description |
|------|-------------|
| `--deps-only` | Run SBOM/dependency scanner only |
| `--secrets-only` | Run secrets scanner only |
| `--iac-only` | Run IaC scanner only |

### Framework Selection
| Flag | Description |
|------|-------------|
| `--frameworks <list>` | Comma-separated framework IDs or aliases |
| `--preset <name>` | Framework preset: `federal`, `defense`, `enterprise`, `startup`, `devsecops`, `all` |
| `--list-frameworks` | Show all frameworks, presets, and aliases |

### Filtering
| Flag | Description |
|------|-------------|
| `--severity <level>` | Minimum severity: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO` |
| `--exclude <glob>` | Exclude paths (repeatable) |
| `--exclude-cwe <ids>` | Exclude CWE IDs, comma-separated (repeatable) |

### Output
| Flag | Description |
|------|-------------|
| `--format <fmt>` | `table` (default), `json`, `markdown`, `sarif` |
| `--fail-on <sev>` | Exit 1 if findings at or above severity (default: `critical`) |
| `--ci` | Shorthand for `--format json --fail-on critical` |
| `--verbose` | Show detailed scanner output |

### AI Enrichment (Offline LLM)
| Flag | Description |
|------|-------------|
| `--ai` | Enable AI-powered remediation via local LLM |
| `--ai-provider <name>` | Force provider: `ollama`, `llamacpp` (auto-detected by default) |
| `--ai-model <model>` | Model name (default: `llama3.2`) |
| `--ai-url <url>` | LLM endpoint URL (must be localhost) |

### Upload (Optional)
| Flag | Description |
|------|-------------|
| `--api-key <key>` | CVERiskPilot API key (or `CRP_API_KEY` env) |
| `--api-url <url>` | API endpoint (or `CRP_API_URL` env) |
| `--no-upload` | Skip upload even if API key is set |

## Offline AI Enrichment

The `--ai` flag enables local LLM-powered analysis. **No data leaves your machine.**

### What It Does

- **Remediation guidance** — actionable fix suggestions per finding
- **Executive risk summary** — CISO-ready security posture assessment
- **Priority ordering** — findings ranked by remediation urgency

### Security Architecture

- **Localhost-only** — the client validates that all requests go to `127.0.0.1`, `localhost`, or `::1`. Non-loopback URLs are rejected.
- **Data minimization** — findings are sanitized before LLM inference (paths stripped to basename, raw observations removed, snippets truncated)
- **Zero dependencies** — uses native `fetch()` (Node.js 20+), no third-party HTTP libraries
- **Time-budgeted** — AI phase has a 120-second time limit, returns partial results on timeout
- **Zero overhead** — dynamic imports ensure no performance impact when `--ai` is not used

### Supported LLM Servers

| Server | Install | Default URL |
|--------|---------|-------------|
| [Ollama](https://ollama.com) | `curl -fsSL https://ollama.com/install.sh \| sh && ollama pull llama3.2` | `http://127.0.0.1:11434` |
| [llama.cpp](https://github.com/ggerganov/llama.cpp) | Build from source, run `./llama-server -m model.gguf` | `http://127.0.0.1:8080` |

### Example

```bash
# Install and start Ollama
ollama pull llama3.2

# Scan with AI enrichment
crp-scan --ai --verbose

# Use a different model
crp-scan --ai --ai-model mistral

# Force llama.cpp on a custom port
crp-scan --ai --ai-provider llamacpp --ai-url http://127.0.0.1:9090
```

## Output Formats

All formats print to **stdout**. Redirect to a file to save results:

```bash
# Save JSON results
crp-scan --preset startup --format json > scan-results.json

# Save SARIF for GitHub Code Scanning upload
crp-scan --format sarif > results.sarif

# Save Markdown for PR comments
crp-scan --format markdown > compliance-report.md

# Pipe JSON to jq for quick queries
crp-scan --format json | jq '.complianceImpact.frameworkSummary'
```

### Table (default)
Colored terminal output with severity badges, per-finding compliance control mapping, and compliance impact summary. Automatically adapts to your terminal width — no information gets cut off.

Each finding shows:
- Severity badge, verdict, and title
- File location, CWE ID, and scanner type
- Triage verdict reason
- Mapped compliance controls (e.g., `SOC 2 Type II:CC6.1, OWASP ASVS:V1.2`)

### JSON (`--format json`)
Structured output with full finding details (including CWE/CVE IDs), severity summary, verdict breakdown, and complete compliance impact per framework. Ideal for CI/CD integration, dashboards, and programmatic analysis.

### SARIF (`--format sarif`)
SARIF 2.1.0 for GitHub Code Scanning, GitLab SAST, Azure DevOps, and other SARIF-compatible tools.

### Markdown (`--format markdown`)
Markdown tables with findings, compliance impact, and summary — suitable for PR comments, wiki pages, and documentation.

## How Compliance Mapping Works

The scanner uses a **CWE-to-compliance bridge** architecture:

1. Each finding is tagged with CWE IDs during scanning
2. CWEs map to NIST 800-53 controls (80+ mappings)
3. NIST 800-53 acts as the canonical hub, bridging to all other frameworks
4. The bridge table maps ~30 key NIST controls to their CMMC, SOC 2, FedRAMP, and ASVS equivalents

This means a single SQL injection finding (CWE-89) automatically surfaces as:
- **NIST 800-53**: SI-10, SA-11
- **SOC 2**: CC8.1
- **CMMC**: SI.L2-3.14.1, CA.L2-3.12.1
- **FedRAMP**: SI-2, SA-11
- **ASVS**: V5.1, V1.1

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | PASS — No findings at or above fail threshold |
| `1` | FAIL — Findings found at or above fail threshold |
| `2` | ERROR — Scanner error (bad args, missing directory, etc.) |

## Requirements

- Node.js 20+
- No external dependencies — everything runs locally

## GitHub Action

```yaml
# .github/workflows/compliance.yml
name: Compliance Scan
on: [pull_request]

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

### Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `preset` | Framework preset: `federal`, `defense`, `enterprise`, `startup`, `devsecops`, `all` | `all` |
| `fail-on` | Severity threshold: `critical`, `high`, `medium`, `low` | `critical` |
| `scanners` | Limit scanners: `deps`, `secrets`, `iac` (comma-separated) | all |
| `comment` | Post results as PR comment | `true` |
| `upload-sarif` | Upload SARIF to GitHub Security tab | `true` |
| `exclude` | Glob patterns to exclude (comma-separated) | |
| `api-key` | CVERiskPilot API key for dashboard upload | |
| `github-token` | Token for PR comments (auto-provided) | `GITHUB_TOKEN` |

### Action Outputs

| Output | Description |
|--------|-------------|
| `exit-code` | `0` = pass, `1` = fail |
| `total-findings` | Total findings count |
| `critical-count` | Critical severity count |
| `controls-affected` | Compliance controls impacted |
| `comment-id` | PR comment ID (if posted) |

## GitHub Security Tab (SARIF)

Findings automatically appear in your repo's **Security > Code scanning** tab when `upload-sarif` is enabled. No additional setup required.

## Compliance Badge

Add a real-time compliance status badge to your project README. The badge queries your organization's scan results and shows pass/fail status.

### Example Badges

| Status | Badge | Markdown |
|--------|-------|----------|
| Passing | ![compliance-passing](https://img.shields.io/badge/compliance-passing-4caf50?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAxTDMgNXY2YzAgNS41NSAzLjg0IDEwLjc0IDkgMTIgNS4xNi0xLjI2IDktNi40NSA5LTEyVjVsLTktNHoiLz48L3N2Zz4=&logoColor=white) | `![Compliance](https://cveriskpilot.com/api/badge/YOUR_ORG_ID)` |
| 3 high | ![compliance-high](https://img.shields.io/badge/compliance-3%20high-ff9800?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAxTDMgNXY2YzAgNS41NSAzLjg0IDEwLjc0IDkgMTIgNS4xNi0xLjI2IDktNi40NSA5LTEyVjVsLTktNHoiLz48L3N2Zz4=&logoColor=white) | `![Compliance](https://cveriskpilot.com/api/badge/YOUR_ORG_ID)` |
| 5 critical | ![compliance-critical](https://img.shields.io/badge/compliance-5%20critical-e53935?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAxTDMgNXY2YzAgNS41NSAzLjg0IDEwLjc0IDkgMTIgNS4xNi0xLjI2IDktNi40NSA5LTEyVjVsLTktNHoiLz48L3N2Zz4=&logoColor=white) | `![Compliance](https://cveriskpilot.com/api/badge/YOUR_ORG_ID)` |

### Usage

```markdown
<!-- Basic badge -->
![Compliance](https://cveriskpilot.com/api/badge/YOUR_ORG_ID)

<!-- CMMC-specific badge -->
![CMMC](https://cveriskpilot.com/api/badge/YOUR_ORG_ID?framework=cmmc)

<!-- Large style -->
![Compliance](https://cveriskpilot.com/api/badge/YOUR_ORG_ID?style=for-the-badge)

<!-- Combine with other badges -->
![Build](https://github.com/your-org/your-repo/actions/workflows/ci.yml/badge.svg)
![Compliance](https://cveriskpilot.com/api/badge/YOUR_ORG_ID)
```

### Query Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `framework` | `nist`, `soc2`, `cmmc`, `fedramp`, `asvs`, `ssdf` | `all` | Filter to a specific framework |
| `style` | `flat`, `flat-square`, `for-the-badge`, `plastic` | `flat` | Badge visual style |

### How It Works

1. The badge endpoint queries your org's unresolved findings by severity
2. Returns a 302 redirect to a shields.io SVG badge
3. Badge is cached for 5 minutes for performance
4. Only exposes pass/fail status — no finding details are leaked

## Presets

| Preset | Frameworks |
|--------|-----------|
| `federal` | NIST 800-53, FedRAMP |
| `defense` | NIST 800-53, CMMC, FedRAMP |
| `enterprise` | NIST 800-53, SOC 2, ASVS, SSDF |
| `startup` | SOC 2, ASVS |
| `devsecops` | ASVS, SSDF |
| `all` | All 6 frameworks |

## Example Workflows

See [`action/examples/`](./action/examples/) for ready-to-use workflow files:
- **compliance-scan.yml** — Basic PR compliance gate
- **defense-contractor.yml** — CMMC/defense preset with strict thresholds
- **scheduled-audit.yml** — Weekly audit with auto-issue creation

## Documentation

For a complete deep-dive into architecture, scanners, compliance mapping, CI/CD patterns, and FAQ, see the **[Complete Guide](./docs/GUIDE.md)**.

## About

Built by [CVERiskPilot LLC](https://cveriskpilot.com) — 100% Veteran Owned, Texas.

Apache-2.0 License.
