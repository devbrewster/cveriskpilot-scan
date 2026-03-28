# CVERiskPilot Compliance Scan - GitHub Action

Scan your code for vulnerabilities and automatically map findings to compliance frameworks (NIST 800-53, CMMC, SOC2, FedRAMP). Results are uploaded to CVERiskPilot, and a compliance summary is posted directly to your pull request.

## Usage

```yaml
name: Compliance Scan

on:
  pull_request:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Run CVERiskPilot Compliance Scan
        uses: cveriskpilot/compliance-scan@v1
        with:
          api-key: ${{ secrets.CRP_API_KEY }}
          frameworks: 'nist-800-53,cmmc,soc2'
          fail-on-violation: 'true'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api-key` | Yes | — | CVERiskPilot API key (`crp_*`) |
| `api-url` | No | `https://app.cveriskpilot.com` | CVERiskPilot API base URL |
| `frameworks` | No | `nist-800-53,cmmc,soc2` | Comma-separated compliance frameworks to evaluate |
| `fail-on-violation` | No | `true` | Fail the check if critical/high violations are found |
| `scan-tools` | No | `semgrep,trivy` | Comma-separated scanners to run |
| `sarif-path` | No | — | Path to a pre-existing SARIF file (skips running SAST scanners) |
| `sbom-path` | No | — | Path to a pre-existing SBOM file (skips SBOM generation) |

## Outputs

| Output | Description |
|--------|-------------|
| `verdict` | Scan verdict: `PASS`, `FAIL`, or `WARN` |
| `scan-id` | Unique scan ID from CVERiskPilot |
| `dashboard-url` | URL to view the full scan results on the CVERiskPilot dashboard |
| `findings-count` | Total number of findings detected |

## Examples

### Minimal (defaults)

```yaml
- uses: cveriskpilot/compliance-scan@v1
  with:
    api-key: ${{ secrets.CRP_API_KEY }}
```

### FedRAMP with custom API URL

```yaml
- uses: cveriskpilot/compliance-scan@v1
  with:
    api-key: ${{ secrets.CRP_API_KEY }}
    api-url: 'https://fedramp.cveriskpilot.com'
    frameworks: 'nist-800-53,fedramp'
    fail-on-violation: 'true'
```

### Using pre-existing scan artifacts

If you already run scanners in a previous step, pass the output files directly:

```yaml
- name: Run my own SAST tool
  run: my-sast-tool --format sarif --output results.sarif

- uses: cveriskpilot/compliance-scan@v1
  with:
    api-key: ${{ secrets.CRP_API_KEY }}
    sarif-path: 'results.sarif'
    scan-tools: ''
```

### Trivy only (no Semgrep)

```yaml
- uses: cveriskpilot/compliance-scan@v1
  with:
    api-key: ${{ secrets.CRP_API_KEY }}
    scan-tools: 'trivy'
```

### Non-blocking (warn only)

```yaml
- uses: cveriskpilot/compliance-scan@v1
  with:
    api-key: ${{ secrets.CRP_API_KEY }}
    fail-on-violation: 'false'
```

### Using outputs in subsequent steps

```yaml
- name: Run compliance scan
  id: scan
  uses: cveriskpilot/compliance-scan@v1
  with:
    api-key: ${{ secrets.CRP_API_KEY }}

- name: Check results
  run: |
    echo "Verdict: ${{ steps.scan.outputs.verdict }}"
    echo "Findings: ${{ steps.scan.outputs.findings-count }}"
    echo "Dashboard: ${{ steps.scan.outputs.dashboard-url }}"
```

## How It Works

1. **Install scanners** -- Semgrep (via pip) and Trivy (via install script) are installed automatically based on `scan-tools`.
2. **Run scans** -- Semgrep performs SAST analysis (SARIF output). Trivy performs dependency/container vulnerability scanning (SARIF) and generates a CycloneDX SBOM.
3. **Upload to CVERiskPilot** -- Scan artifacts are uploaded via the `/api/pipeline/scan` endpoint, authenticated with your API key.
4. **Compliance mapping** -- CVERiskPilot maps findings to the selected compliance frameworks and generates POAM entries for critical items.
5. **PR comment** -- A formatted compliance summary is posted to the pull request. Subsequent pushes update the existing comment rather than creating duplicates.
6. **Verdict enforcement** -- If `fail-on-violation` is `true` and the verdict is `FAIL`, the action exits with a non-zero code, blocking the PR.

## Requirements

- The workflow must have `pull-requests: write` permission for PR comments.
- A valid CVERiskPilot API key is required. Generate one at **Settings > API Keys** in the CVERiskPilot dashboard.
- Python 3.x must be available on the runner (pre-installed on `ubuntu-latest`) for Semgrep installation.

## License

Copyright 2026 CVERiskPilot LLC. All rights reserved.
