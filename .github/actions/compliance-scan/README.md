# CVERiskPilot Compliance Scan — GitHub Actions

Two GitHub Actions are available depending on your needs:

## Option 1: Standalone CLI Scan (No Account Required)

**Location:** `packages/scan/action/action.yml`
**Best for:** Free tier, open-source projects, quick compliance gates

Runs `@cveriskpilot/scan` directly in CI. Posts PR comments and uploads SARIF to GitHub Security tab. No API key or CVERiskPilot account needed.

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
          preset: startup         # startup, enterprise, defense, federal, devsecops, all
          fail-on: critical       # critical, high, medium, low
```

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `preset` | No | `all` | Framework preset: `federal`, `defense`, `enterprise`, `startup`, `devsecops`, `all` |
| `fail-on` | No | `critical` | Severity threshold to fail: `critical`, `high`, `medium`, `low` |
| `scanners` | No | all | Limit scanners: `deps`, `secrets`, `iac` (comma-separated) |
| `exclude` | No | — | Glob patterns to exclude (comma-separated) |
| `api-key` | No | — | CVERiskPilot API key for dashboard upload |
| `upload-sarif` | No | `true` | Upload SARIF to GitHub Security tab |
| `comment` | No | `true` | Post results as PR comment |
| `github-token` | No | `GITHUB_TOKEN` | Token for PR comments |

### Outputs

| Output | Description |
|--------|-------------|
| `exit-code` | 0=pass, 1=fail, 2=error |
| `total-findings` | Total findings count |
| `critical-count` | Critical severity count |
| `high-count` | High severity count |
| `controls-affected` | Compliance controls affected |
| `comment-id` | PR comment ID (if posted) |

### What It Does

1. Installs Node.js 20
2. Runs `npx @cveriskpilot/scan@latest --ci --preset <preset> --fail-on <threshold>`
3. Posts formatted PR comment with findings table + compliance impact
4. Uploads SARIF to GitHub Security tab (optional)
5. Fails the check if threshold exceeded

### Examples

**CMMC gate for defense contractors:**
```yaml
- uses: devbrewster/cveriskpilot-scan@main
  with:
    preset: defense
    fail-on: medium
```

**Startup SOC 2 check:**
```yaml
- uses: devbrewster/cveriskpilot-scan@main
  with:
    preset: startup
    fail-on: high
```

**Weekly audit with auto-issue creation:**
```yaml
name: Weekly Compliance Audit
on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
  issues: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run compliance scan
        id: scan
        uses: devbrewster/cveriskpilot-scan@main
        with:
          preset: enterprise
          fail-on: high
          comment: 'false'
      - name: Create issue on failure
        if: steps.scan.outputs.exit-code != '0'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[Compliance] Weekly audit: ${{ steps.scan.outputs.total-findings }} findings, ${{ steps.scan.outputs.controls-affected }} controls affected`,
              body: `## Weekly Compliance Audit\n\n- **Critical:** ${{ steps.scan.outputs.critical-count }}\n- **Controls affected:** ${{ steps.scan.outputs.controls-affected }}\n\nSee [Security tab](../../security/code-scanning) for details.`,
              labels: ['compliance', 'security']
            });
```

---

## Option 2: Full Platform Integration (API Key Required)

**Location:** `.github/actions/compliance-scan/action.yml`
**Best for:** Pro/Enterprise tier, dashboard integration, POAM generation

Runs Semgrep + Trivy, uploads results to CVERiskPilot API, gets compliance mapping + POAM entries back, posts server-rendered PR comment.

```yaml
name: Compliance Scan
on:
  pull_request:
    branches: [main]

permissions:
  pull-requests: write

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/compliance-scan
        with:
          api-key: ${{ secrets.CRP_API_KEY }}
          frameworks: 'nist-800-53,cmmc,soc2'
```

### Additional Capabilities (vs Option 1)

- Runs Semgrep SAST + Trivy dependency/container scanning
- Uploads results to CVERiskPilot dashboard
- Auto-generates POAM entries for critical findings
- Returns `dashboard-url` for full results view
- Supports pre-existing SARIF/SBOM files from other tools
- Server-side compliance mapping with enrichment (CVSS, EPSS, KEV)

---

## Which Should I Use?

| Need | Use |
|------|-----|
| Free, no account, quick PR gates | Option 1 (CLI scan) |
| Dashboard, POAM, enrichment | Option 2 (platform) |
| Open-source project | Option 1 |
| SOC 2 / CMMC audit evidence | Option 2 |
| Just want compliance mapping on PRs | Option 1 |
| Need historical trend tracking | Option 2 |

## Permissions

Both actions require these workflow permissions:

```yaml
permissions:
  contents: read          # checkout code
  pull-requests: write    # post PR comments
  security-events: write  # upload SARIF (Option 1 only)
```

Without `pull-requests: write`, PR comments will silently fail with a 403 error.

## License

Copyright 2026 CVERiskPilot LLC. All rights reserved.
