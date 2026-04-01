# Changelog

## 0.1.17 (2026-04-01)

### Improvements

- **RBAC detection** — scanner now recognizes `requirePerm()` and `requireOpsAuth()` in addition to `requireRole()`, eliminating false positives on routes using the permission-based auth pattern
- **Raw SQL detection** — `$executeRawUnsafe` flagged as CRITICAL (CWE-89); `$executeRaw` with tagged templates treated as safe
- **Public endpoint detection** — routes with `/** public endpoint */` JSDoc or `// public endpoint` comments correctly classified as `NEEDS_REVIEW`

## 0.1.16 (2026-03-31)

### Features

- **Free risk intelligence** — every CVE enriched with EPSS score, CISA KEV status, and composite risk score (0-100) using free public APIs
- **Compliance scorecard** — visual progress bars per framework showing control coverage percentage
- **Risk priority table** — top 10 findings ranked by composite risk score with EPSS and KEV context
- **Remediation effort** — heuristic estimate (LOW/MEDIUM/HIGH) based on fix type (patch, minor, major)
- **POAM preview** — Plan of Action & Milestones for top findings with deadlines
- **Scan comparison** (`--compare`) — track delta between scans (new/fixed/unchanged)
- **Incremental scanning** (`--since <commit>`) — only scan files changed since a git commit
- **Streaming output** (`--stream`) — emit findings as NDJSON for piping to other tools
- **OSV response caching** — disk cache with 24h TTL (clean) / 1h TTL (vulnerable)
- **Platform upsell CTA** — actionable signup banner with finding-count context

## 0.1.15 (2026-03-31)

### Improvements

- **Expanded dist files** — `dist/**/*.js` and `dist/**/*.d.ts` globs ensure all nested modules (ai/, scanners/, vendor/) are included in the npm package

## 0.1.14 (2026-03-31)

### Features

- **Offline AI enrichment** (`--ai`) — local LLM integration via Ollama or llama.cpp for AI-powered remediation guidance, executive risk summaries, and priority ordering
- **Secured by design** — AI client enforces localhost-only connections (`validateLocalhostUrl()`), strips sensitive data before LLM inference, zero external dependencies
- **Auto-detection** — automatically discovers running Ollama or llama.cpp servers, no configuration needed
- **Time-budgeted** — AI phase runs within configurable time limit (default 120s), returns partial results on timeout
- **All output formats** — AI analysis rendered in table, JSON, markdown, and SARIF output
- **Zero overhead** — dynamic imports ensure no performance impact when `--ai` is not used

### CLI Flags

- `--ai` — enable offline AI enrichment
- `--ai-provider <name>` — force provider (ollama/llamacpp, auto-detected by default)
- `--ai-model <model>` — model name (default: llama3.2)
- `--ai-url <url>` — LLM endpoint URL (must be localhost)

## 0.1.13 (2026-03-31)

### Features

- **GitHub Action SARIF upload** — findings now auto-upload to GitHub Security > Code scanning tab via `github/codeql-action/upload-sarif@v3` (enabled by default with `upload-sarif: 'true'`)
- **Example workflows** — 3 ready-to-copy workflows: basic PR gate, defense/CMMC preset, weekly scheduled audit with auto-issue creation
- **Compliance badge API** — `/api/badge/:orgId` endpoint returns shields.io compliance status badge for READMEs
- **README overhaul** — full GitHub Action docs with input/output tables, badge usage, preset reference, example workflow links

## 0.1.12 (2026-03-31)

### Improvements

- **Secrets scanner — documentation FP reduction** — `postgres://` and `DATABASE_URL=` matches in `.md`/`.html` files containing `example` (case-insensitive) are now auto-dismissed as `FALSE_POSITIVE`
- **API security — tenant isolation variable tracking** — scanner now recognizes when `organizationId` is passed via named variables (e.g. `orgFilter`, `caseWhere`, `pipelineWhere`) spread into `where` clauses, eliminating false positives on already-scoped queries
- **API security — cross-org aggregate detection** — `organization.count`, `.aggregate`, and `.groupBy` queries are recognized as intentional cross-org operations and no longer flagged
- **API security — public endpoint awareness** — routes with `// no auth required`, `// public`, or `/** public endpoint */` JSDoc comments are classified as `NEEDS_REVIEW` instead of `TRUE_POSITIVE`

## 0.1.7 (2026-03-29)

### Fixes

- **VERSION constant** — fixed hardcoded `0.1.0` in CLI so update notifier compares correctly
- **README accuracy** — corrected all framework control counts and added enterprise preset to docs

## 0.1.6 (2026-03-29)

### Features

- **Update notifier** — CLI checks npm registry for newer versions and shows an upgrade notice (suppressed in `--ci` mode and non-TTY environments)
- **Enterprise preset** — new `--preset enterprise` bundles NIST 800-53 + SOC 2 + ASVS + SSDF

### Fixes

- **Corrected framework control counts** — NIST 45 (was 39), SOC 2 7 (was 6), FedRAMP 35 (was 47), ASVS 7 (was 6), SSDF 8 (was 7)
- **Install docs** — all commands now recommend `@latest` suffix
- **npm README** — restored package README on npmjs.com

## 0.1.4 (2026-03-29)

### Performance

- **Concurrent file scanning** — secrets scanner now processes 50 files in parallel instead of one at a time
- **Gitignore-aware directory walking** — skips gitignored directories at walk time (avoids descending into ignored trees entirely)
- **Expanded exclusion list** — added `.open-next`, `.next-dev`, `.wrangler`, `.data`, `.svn`, `.hg`, `coverage`, `out` to default excluded directories
- **Pre-compiled exclude regexes** — `--exclude` glob patterns compiled once instead of per-file
- **Cached per-file verdict context** — test file detection, basename checks, and gitignore status computed once per file instead of per-match
- **Parallel lock file parsing** — SBOM scanner parses all detected lock files concurrently

### Features

- **Live progress spinner** — shows scanner status (`deps: 842 pkgs`, `secrets: 4500 files...`, `iac: scanning...`) in TTY terminals during scan
- Progress updates automatically disabled in CI mode (`--ci`) and non-TTY environments

## 0.1.3 (2026-03-29)

### Features

- **Finding verdict triage** — every finding now classified as `TRUE_POSITIVE`, `FALSE_POSITIVE`, or `NEEDS_REVIEW`
- **Secrets scanner verdicts** — auto-dismisses test files, `.env.example`, regex literals, charset constants, report/sample files; flags gitignored files as `NEEDS_REVIEW`
- **SBOM scanner verdicts** — marks substring-matched packages as `FALSE_POSITIVE`, unknown versions as `NEEDS_REVIEW`
- **IaC scanner verdicts** — tags direct rule matches as `TRUE_POSITIVE`
- **Verdict output** — verdict tags (`[TP]`, `[FP]`, `[REVIEW]`) and reason lines in table, JSON, markdown, and SARIF formats
- **Verdict summary** — actionable / review / auto-dismissed counts in summary line
- **Gitignore support** — secrets and IaC scanners respect `.gitignore` patterns
- **Exclude propagation** — `--exclude` CLI flag now applies to secrets and IaC scanners (was SBOM only)

## 0.1.2 (2026-03-29)

- Add Ko-fi funding link
- Add `crp-scan` binary alias

## 0.1.1 (2026-03-28)

- Fix README install instructions
- Add `crp-scan` shorthand to docs

## 0.1.0 (2026-03-28)

- Initial release
- SBOM scanner (npm, yarn, pnpm, pip, go, cargo, gem, maven, gradle)
- Secrets scanner (30+ regex patterns + entropy detection)
- IaC scanner (Terraform, CloudFormation, Kubernetes, Dockerfile — 29 rules)
- Cross-framework compliance mapping (NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, SSDF)
- Output formats: table, JSON, markdown, SARIF
- Presets: federal, defense, startup, devsecops, all
- CI mode (`--ci`) with JSON output and non-zero exit codes
- Offline fallback advisory database
