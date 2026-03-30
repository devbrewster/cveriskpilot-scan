# CLI-to-Dashboard Integration Guide

Technical reference for integrating the `@cveriskpilot/scan` CLI scanner with the CVERiskPilot web dashboard. Covers the full pipeline from local scan to persisted findings, compliance mapping, and POAM generation.

## End-to-End Flow

```
npx @cveriskpilot/scan
        |
        v
  +-----------------+
  | 4 Scanners Run  |
  | (parallel)      |
  |  - SBOM         |
  |  - Secrets      |
  |  - IaC          |
  |  - API Security |
  +-----------------+
        |
        v
  Findings enriched (OSV, npm audit, compliance mapping)
        |
        v
  Results printed locally (table/json/markdown/sarif)
        |
        +--- --api-key provided? ---> POST /api/pipeline/scan
                                            |
                                            v
                                      Server validates API key (SHA-256 hash lookup)
                                            |
                                            v
                                      Maps findings to compliance controls
                                      (NIST 800-53, CMMC, SOC2, FedRAMP, ASVS, SSDF)
                                            |
                                            v
                                      Evaluates org pipeline policy -> verdict (pass/fail/warn)
                                            |
                                            v
                                      Auto-generates POAM entries for findings with CWEs
                                            |
                                            v
                                      Persists to pipeline_scan_results table
                                      Creates audit log entry
                                            |
                                            v
                                      Returns: { scanId, verdict, dashboardUrl }
                                            |
                                            v
                                      Dashboard /pipelines shows scan history
```

### Step-by-step

1. User runs `npx @cveriskpilot/scan` locally or in CI/CD.
2. The CLI runs 4 scanners in parallel: SBOM (dependencies), Secrets, IaC, and API Route Security.
3. Findings are enriched with data from the OSV API, npm audit, and compliance control mapping.
4. Results are printed to stdout in the requested format (table by default).
5. If `--api-key` is provided (and `--no-upload` / `--dry-run` are not set), findings are POSTed to `/api/pipeline/scan`.
6. The server validates the API key via `Authorization: Bearer` header. Keys are stored as SHA-256 hashes and looked up by the `validateApiKey()` function from `@cveriskpilot/auth`.
7. The server maps findings to compliance controls across up to 6 frameworks using `mapFindingsToComplianceImpact()`.
8. The org's pipeline policy is loaded (or defaults applied) and evaluated. The result is a verdict: `pass`, `fail`, or `warn`.
9. POAM entries are auto-generated for findings that have CWE IDs via `generatePipelinePOAM()`.
10. The scan result is persisted to the `pipelineScanResult` table (Prisma model).
11. An audit log entry is created (fire-and-forget).
12. The CLI receives a JSON response containing `scanId`, `verdict`, `summary`, `complianceImpact`, `poamEntriesCreated`, and `dashboardUrl`.
13. The dashboard at `/pipelines` queries `GET /api/pipeline/scans` (session auth) and displays scan history, trends, and repo breakdown.

## CLI Reference

### Installation

```bash
# One-off (no install)
npx @cveriskpilot/scan@latest

# Global install
npm install -g @cveriskpilot/scan
```

### Flags

| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `--api-key <key>` | `CRP_API_KEY` | (none) | API key for upload. Enables enriched output and server-side persistence. |
| `--api-url <url>` | `CRP_API_URL` | `https://app.cveriskpilot.com` | API endpoint URL. |
| `--no-upload` | | `false` | Run scan locally only, skip upload even if API key is set. |
| `--dry-run` | | `false` | Preview mode. No upload, no persistence. |
| `--format <fmt>` | | `table` | Output format: `table`, `json`, `markdown`, `sarif`. |
| `--frameworks <list>` | | all | Comma-separated framework IDs (e.g., `SOC2,CMMC`). |
| `--preset <name>` | | (none) | Framework preset: `federal`, `defense`, `enterprise`, `startup`, `devsecops`, `all`. |
| `--severity <level>` | | `INFO` | Minimum severity to display: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`. |
| `--fail-on <sev>` | | `CRITICAL` | Exit non-zero if findings exist at or above this severity. |
| `--deps-only` | | | Run SBOM/dependency scanner only. |
| `--secrets-only` | | | Run secrets scanner only. |
| `--iac-only` | | | Run IaC scanner only. |
| `--api-routes` | | | Run API route security scanner only (Next.js). |
| `--exclude <glob>` | | | Exclude paths (repeatable). |
| `--exclude-cwe <ids>` | | | Exclude CWE IDs, comma-separated (repeatable). |
| `--ci` | | | Shorthand for `--format json --fail-on critical`. |
| `--verbose` | | | Show detailed scanner output and upload progress. |
| `--list-frameworks` | | | List all supported frameworks, aliases, and presets. |

### Framework Presets

| Preset | Frameworks |
|--------|-----------|
| `federal` | NIST 800-53 + FedRAMP + SSDF |
| `defense` | NIST 800-53 + CMMC + SSDF |
| `enterprise` | NIST 800-53 + SOC 2 + ASVS + SSDF |
| `startup` | SOC 2 + ASVS |
| `devsecops` | ASVS + SSDF |
| `all` | All 6 frameworks |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | PASS -- no findings at or above `--fail-on` severity. |
| `1` | FAIL -- findings exist at or above `--fail-on` severity. |
| `2` | ERROR -- scanner crashed or invalid arguments. |

## API Key Setup

1. Sign in at `https://app.cveriskpilot.com`.
2. Navigate to **Settings > API Keys**.
3. Create a key with the `upload` or `pipeline` scope.
4. Key format: `crp_{orgSlug}_{random}`. The key is displayed once at creation and stored server-side as a SHA-256 hash.
5. Set the key as `CRP_API_KEY` in your environment or pass `--api-key` directly.

```bash
# Environment variable (recommended for CI/CD)
export CRP_API_KEY=crp_myorg_abc123

# Or inline
npx @cveriskpilot/scan --api-key crp_myorg_abc123
```

## Server Endpoint: POST /api/pipeline/scan

**Source:** `apps/web/app/api/pipeline/scan/route.ts`

### Authentication

```
Authorization: Bearer crp_myorg_abc123
```

The server hashes the provided key with SHA-256 and looks it up in the database. The key must have either `pipeline` or `upload` scope.

### Request Body

The endpoint accepts two payload shapes:

**1. Pre-processed findings (from CLI)**

This is what the CLI sends. Findings are already parsed and enriched client-side.

```json
{
  "findings": [ { "title": "...", "severity": "HIGH", "cweIds": ["CWE-79"], ... } ],
  "frameworks": ["nist-800-53", "soc2-type2"],
  "source": "cli",
  "version": "0.1.7",
  "timestamp": "2026-03-29T12:00:00Z",
  "repoUrl": "https://github.com/org/repo",
  "commitSha": "abc123",
  "branch": "main",
  "prNumber": 42
}
```

Detection logic: the server identifies this shape by the presence of a `findings` array and a `source` field.

**2. Raw scan content (for CI/CD tools posting SARIF, CycloneDX, etc.)**

```json
{
  "format": "sarif",
  "content": "{ ... raw SARIF JSON ... }",
  "frameworks": ["cmmc-level2"],
  "repoUrl": "https://github.com/org/repo",
  "commitSha": "abc123"
}
```

Supported `format` values: `sarif`, `cyclonedx`, `trivy-json`, `generic-json`, `json`, `nessus`, `csv`, `qualys`, `openvas`, `osv`, `csaf`, `spdx`.

### Response

```json
{
  "scanId": "a1b2c3d4-...",
  "verdict": "fail",
  "summary": {
    "total": 173,
    "critical": 29,
    "high": 97,
    "medium": 42,
    "low": 5
  },
  "policyReasons": [
    "29 findings at CRITICAL severity (policy blocks on CRITICAL)"
  ],
  "complianceImpact": [
    {
      "framework": "NIST 800-53",
      "controlId": "SI-2",
      "controlTitle": "Flaw Remediation",
      "affectedBy": ["CWE-79", "CWE-89"]
    }
  ],
  "poamEntriesCreated": 144,
  "dashboardUrl": "https://app.cveriskpilot.com/pipelines/a1b2c3d4-..."
}
```

### Server Processing Pipeline

The server performs these steps in order:

1. **Validate API key** -- `validateApiKey()` from `@cveriskpilot/auth`.
2. **Check scope** -- key must have `pipeline` or `upload` scope.
3. **Parse input** -- detect CLI vs. raw payload. For raw payloads, the content is parsed through the appropriate format parser via `@cveriskpilot/parsers`.
4. **Map to compliance controls** -- `mapFindingsToComplianceImpact()` from `@cveriskpilot/compliance` maps CWEs to controls across the requested frameworks.
5. **Load pipeline policy** -- queries `pipelinePolicy` table for the org. Falls back to `getDefaultPolicy()` if none is configured.
6. **Evaluate policy** -- `evaluatePolicy()` produces a verdict (`pass`, `fail`, `warn`) with reasons.
7. **Generate POAM entries** -- `generatePipelinePOAM()` creates Plan of Action and Milestones entries for findings with CWE IDs.
8. **Persist scan result** -- writes to `pipelineScanResult` table via Prisma.
9. **Create audit log** -- fire-and-forget write to `auditLog` table.
10. **Return response** -- includes `scanId`, `verdict`, `dashboardUrl`, and all metadata.

## Dashboard Integration

**Pages:**
- `/pipelines` -- scan history table, compliance trends, repo breakdown, top violated controls (`apps/web/app/(app)/pipelines/page.tsx`)
- `/pipelines/[repo]` -- per-repo scan detail (`apps/web/app/(app)/pipelines/[repo]/page.tsx`)

**API:** `GET /api/pipeline/scans` (session auth, not API key auth)

Each scan entry in the dashboard shows:
- Verdict badge (pass/fail/warn)
- Findings broken down by severity
- Frameworks evaluated
- POAM entries created
- Link to scan detail

When no scans have been uploaded yet, the pipelines page renders an empty state.

## CI/CD Examples

### GitHub Actions

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run CVERiskPilot scan
        run: npx @cveriskpilot/scan@latest --ci --api-key ${{ secrets.CRP_API_KEY }}
        env:
          CRP_API_URL: https://app.cveriskpilot.com
```

### GitLab CI

```yaml
security-scan:
  image: node:20
  script:
    - npx @cveriskpilot/scan@latest --ci --api-key $CRP_API_KEY
  variables:
    CRP_API_URL: https://app.cveriskpilot.com
```

### Local Development

```bash
# Full scan, local only (no upload)
npx @cveriskpilot/scan

# Preview what would upload
npx @cveriskpilot/scan --dry-run --api-key crp_myorg_abc123

# Upload to dashboard, federal preset only
npx @cveriskpilot/scan --api-key crp_myorg_abc123 --preset federal

# Deps only, SARIF output for IDE integration
npx @cveriskpilot/scan --deps-only --format sarif > results.sarif

# Suppress known false positives
npx @cveriskpilot/scan --exclude-cwe CWE-79,CWE-89 --exclude "test/**"
```

## Tested Output

Running `npx @cveriskpilot/scan --api-key crp_xxx` against the CVERiskPilot codebase itself produced:

- 173 findings (29 CRITICAL, 97 HIGH, 42 MEDIUM, 5 LOW)
- 41 compliance controls affected across 5 frameworks
- 144 POAM entries auto-generated
- Verdict: FAIL

## Free vs. Paid Tier Behavior

Without an API key, the CLI still runs all scanners but **redacts enriched fields** from the output:
- CVE IDs, CWE IDs, CVSS scores/vectors
- Fixed versions, advisory URLs, remediation recommendations

These fields are populated in the scan but stripped before display. Providing an `--api-key` unlocks the full enriched output.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Upload failed: 401` | Invalid or expired API key. | Regenerate the key at Settings > API Keys. |
| `Upload failed: 403` | API key missing required scope. | Key must have `upload` or `pipeline` scope. |
| `Upload failed: 500` | Server-side error. | Check server logs. Ensure DB schema is current (`npx prisma db push`). |
| No data on `/pipelines` | Scan ran without `--api-key`. | Re-run with `--api-key` to upload results. |
| Findings count differs from dashboard | Severity filter active. | CLI applies `--severity` filter before upload. Dashboard shows what was uploaded. |
| `Error: Directory not found` | Target path does not exist. | Pass a valid directory as the positional argument. |

## Key Source Files

| File | Purpose |
|------|---------|
| `packages/scan/src/cli.ts` | CLI entry point, argument parsing, scanner orchestration, upload logic |
| `packages/scan/src/output.ts` | Output formatting (table, json, markdown, sarif) |
| `packages/scan/src/scanners/sbom-scanner.ts` | Dependency/SBOM scanner |
| `packages/scan/src/scanners/secrets-scanner.ts` | Secrets detection scanner |
| `packages/scan/src/scanners/iac-scanner.ts` | Infrastructure-as-code scanner |
| `packages/scan/src/scanners/api-security-scanner.ts` | API route security scanner (Next.js) |
| `apps/web/app/api/pipeline/scan/route.ts` | Server endpoint for scan upload |
| `apps/web/app/api/pipeline/scans/route.ts` | Dashboard query endpoint |
| `apps/web/app/(app)/pipelines/page.tsx` | Dashboard pipelines page |
