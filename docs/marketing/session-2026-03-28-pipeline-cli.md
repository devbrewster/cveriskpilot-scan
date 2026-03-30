# Session Log — 2026-03-28: Pipeline CLI Launch Posts + Docs Fix

## What Was Done

### 1. X Post — CLI Developer Post (Published)

**Post ID:** `w16-pipeline-05-developer-cli`
**Status:** Published
**URL:** https://x.com/cveriskpilot/status/2038049770233647251
**Media:** `social/assets/screenshot-crp-scan-terminal.png` (real scan output screenshot)

**Content (222 chars):**
```
npx crp-scan --preset startup

28 critical, 3 high, 23 medium across 842 dependencies, 873 files, and 22 IaC templates. SBOM, secrets, and infrastructure — one command.

Free tier. No credit card.

#CVERiskPilot #DevSecOps
```

**Files modified:**
- `social/calendar/wave16-pipeline/drafts.json` — Updated `w16-pipeline-05-developer-cli` with real scan numbers and media reference
- `social/drafts/pipeline-compliance-scanner/announcement-thread.md` — Updated Post 5/6 with real scan data and screenshot pairing
- `social/queue/w16-pipeline-05-cli.json` — Created queue file (archived to `social/published/` after posting)
- `social/assets/screenshot-crp-scan-terminal.png` — Copied from `docs/marketing/image.png`

**Source screenshot:** Terminal output of `npx crp-scan --preset startup` showing:
- 28 critical, 3 high, 23 medium, 3 low, 0 info (57 total findings)
- 842 npm dependencies scanned
- 873 files scanned for secrets
- 22 IaC files, 28 rules passed, 1 failed

---

### 2. Docs Pages Created (Bug Fix — Broken Buttons)

**Issue:** Landing page pipeline section had two buttons ("Set Up in 5 Minutes" and "View Documentation") linking to `/docs/pipeline` and `/docs` — both were dead links (404).

**Fix:** Created three new files:

**`apps/web/app/(docs)/layout.tsx`**
- Docs layout using NavBar + Footer from landing components
- Dark theme (slate-950 background), centered max-w-4xl content area

**`apps/web/app/(docs)/docs/page.tsx`** — Documentation hub at `/docs`
- 6-card grid linking to doc sections
- Pipeline Compliance Scanner card links through to `/docs/pipeline`
- 5 other cards (CLI, GitHub Action, Frameworks, API, POAM) show "Coming Soon" badge
- Styled to match landing page feature cards

**`apps/web/app/(docs)/docs/pipeline/page.tsx`** — Full setup guide at `/docs/pipeline`
- Prerequisites checklist (Node.js 20+, npm, GitHub/GitLab repo)
- 3-step quick start: install, scan, review
- CLI options table (--preset, --framework, --severity, --format, --ci)
- GitHub Actions YAML workflow example
- "What Gets Scanned" section (SBOM, Secrets, IaC)
- Compliance mapping table (CWE-89, CWE-79, CWE-798 with NIST/SOC2/CMMC mappings)
- Next steps links to demo, pricing, signup
- Breadcrumb navigation

**Build status:** Green — both routes render as static pages.

---

### 3. LinkedIn Post — CLI/npm Package (Draft, Not Published)

**Status:** Draft — approved by user, ready to queue

**Content (1,185 chars):**
```
npx crp-scan --preset startup

28 critical. 3 high. 23 medium. 842 dependencies. 873 files. 22 IaC templates.

One command. Three scanners. Six compliance frameworks.

We built @cveriskpilot/scan — a free npm package that scans your codebase for vulnerabilities and maps every finding to NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF controls automatically.

No spreadsheets. No manual mapping. No quarterly compliance sprints.

What gets scanned:
→ Dependencies (SBOM) — npm, yarn, pnpm lockfiles
→ Secrets — API keys, tokens, credentials in source
→ Infrastructure as Code — Terraform, Docker, CloudFormation

Every finding chains through CWE → NIST 800-53 → framework controls. POAM entries auto-generate with milestones and audit trails.

Install and scan in under 90 seconds:

npm install -g @cveriskpilot/scan@latest
crp-scan --preset startup

Or run without installing:
npx @cveriskpilot/scan@latest --preset startup

npmjs.com/package/@cveriskpilot/scan

Free tier. No credit card. No sales call.

100% Veteran Owned. Built in Texas.

#DevSecOps #Compliance #NIST #SOC2 #CMMC #FedRAMP #CyberSecurity #VeteranOwned #AppSec
```

**Recommended media:** Same terminal screenshot (`social/assets/screenshot-crp-scan-terminal.png`)
**Not yet queued** — no LinkedIn publishing script exists in the repo yet.

---

## Files Changed (Summary)

| File | Action |
|------|--------|
| `social/calendar/wave16-pipeline/drafts.json` | Modified — updated CLI post with real scan data |
| `social/drafts/pipeline-compliance-scanner/announcement-thread.md` | Modified — updated Post 5/6 |
| `social/assets/screenshot-crp-scan-terminal.png` | Created — copied from docs/marketing/image.png |
| `social/queue/w16-pipeline-05-cli.json` | Created then archived to published/ |
| `social/published/w16-pipeline-05-cli.json` | Created by publish script |
| `apps/web/app/(docs)/layout.tsx` | Created — docs layout |
| `apps/web/app/(docs)/docs/page.tsx` | Created — docs hub page |
| `apps/web/app/(docs)/docs/pipeline/page.tsx` | Created — pipeline setup guide |
