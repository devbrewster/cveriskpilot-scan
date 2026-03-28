# @cveriskpilot/scan

Pipeline Compliance Scanner — scan your codebase for vulnerable dependencies, hardcoded secrets, and infrastructure-as-code misconfigurations, then automatically map findings to **6 compliance frameworks**.

**Zero config. Offline-first. Compliance mapping built in.**

```bash
npx @cveriskpilot/scan
```

## What It Does

1. **Scans** your project for vulnerabilities across three dimensions:
   - **SBOM/SCA** — Detects vulnerable dependencies in `package-lock.json`, `yarn.lock`, `requirements.txt`, `Cargo.lock`, `go.sum`, and more
   - **Secrets** — Finds hardcoded API keys, passwords, private keys, and tokens using 30+ regex patterns + entropy detection
   - **IaC** — Checks Terraform, Dockerfile, Kubernetes YAML, and CloudFormation for security misconfigurations

2. **Maps** every finding to compliance controls via CWE:
   ```
   Finding → CWE → NIST 800-53 → SOC 2 / CMMC / FedRAMP / ASVS / SSDF
   ```

3. **Reports** which compliance controls are affected, so you know your audit impact immediately

## Supported Frameworks

| Framework | CLI ID | Aliases | Controls |
|-----------|--------|---------|----------|
| NIST 800-53 Rev 5 | `nist-800-53` | `nist`, `nist800` | 39 |
| SOC 2 Type II | `soc2-type2` | `soc2`, `soc` | 6 |
| CMMC Level 2 | `cmmc-level2` | `cmmc`, `cmmc2` | 33 |
| FedRAMP Moderate | `fedramp-moderate` | `fedramp` | 47 |
| OWASP ASVS 4.0 | `owasp-asvs` | `asvs`, `owasp` | 6 |
| NIST SSDF 1.1 | `nist-ssdf` | `ssdf` | 7 |

**138 total controls** mapped via 80+ CWE entries.

## Framework Presets

| Preset | Frameworks | For |
|--------|-----------|-----|
| `federal` | NIST 800-53 + FedRAMP + SSDF | Federal agencies |
| `defense` | NIST 800-53 + CMMC + SSDF | Defense contractors |
| `startup` | SOC 2 + ASVS | SaaS startups |
| `devsecops` | ASVS + SSDF | DevSecOps teams |
| `all` | All 6 frameworks | Comprehensive |

## Usage

```bash
# Scan current directory — all frameworks, colored table output
npx @cveriskpilot/scan

# SOC 2 + ASVS only (startup preset)
npx @cveriskpilot/scan --preset startup

# CMMC + FedRAMP only (using aliases)
npx @cveriskpilot/scan --frameworks CMMC,FEDRAMP

# Only HIGH and CRITICAL findings
npx @cveriskpilot/scan --severity HIGH

# Dependencies only, JSON output
npx @cveriskpilot/scan --deps-only --format json

# Exclude test files and specific CWEs
npx @cveriskpilot/scan --exclude test/** --exclude-cwe CWE-79,CWE-89

# CI/CD mode (JSON output, exit code 1 on critical findings)
npx @cveriskpilot/scan --ci

# SARIF output for GitHub/GitLab integration
npx @cveriskpilot/scan --format sarif > results.sarif

# Upload results to CVERiskPilot dashboard
npx @cveriskpilot/scan --api-key $CRP_API_KEY

# List all frameworks, presets, and aliases
npx @cveriskpilot/scan --list-frameworks

# Defense contractor full scan
npx @cveriskpilot/scan --preset defense --fail-on high --verbose
```

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
| `--preset <name>` | Framework preset: `federal`, `defense`, `startup`, `devsecops`, `all` |
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

### Upload (Optional)
| Flag | Description |
|------|-------------|
| `--api-key <key>` | CVERiskPilot API key (or `CRP_API_KEY` env) |
| `--api-url <url>` | API endpoint (or `CRP_API_URL` env) |
| `--no-upload` | Skip upload even if API key is set |

## Output Formats

### Table (default)
Colored terminal output with severity badges, findings list, and compliance impact breakdown.

### JSON (`--format json`)
Structured output with findings, severity summary, and compliance impact per framework.

### SARIF (`--format sarif`)
SARIF 2.1.0 for GitHub Code Scanning, GitLab SAST, and other SARIF-compatible tools.

### Markdown (`--format markdown`)
Markdown tables for PR comments and documentation.

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

## About

Built by [CVERiskPilot LLC](https://cveriskpilot.com) — 100% Veteran Owned, Texas.

Apache-2.0 License.
