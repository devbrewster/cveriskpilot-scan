# Changelog

## 0.1.5 (2026-03-29)

### Features

- **Update notifier** — CLI checks npm registry for newer versions and shows an upgrade notice (suppressed in `--ci` mode and non-TTY environments)
- **Enterprise preset** — new `--preset enterprise` bundles NIST 800-53 + SOC 2 + ASVS + SSDF

### Fixes

- **Corrected framework control counts** — NIST 45 (was 39), SOC 2 7 (was 6), FedRAMP 35 (was 47), ASVS 7 (was 6), SSDF 8 (was 7)
- **Install docs** — all commands now recommend `@latest` suffix

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
