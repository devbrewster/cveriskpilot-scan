# Session Log — 2026-03-28

## Save Point: v0.1.0-alpha

Tagged `v0.1.0-alpha` at commit `39219b0` — first versioned checkpoint on GCP infrastructure.

### Stats at Tag
| Metric | Count |
|--------|-------|
| Commits | 14 |
| Pages | 74 |
| API Routes | 116 |
| Components | 90 |
| Packages | 25 |
| Waves Complete | 0-12 |

---

## Changes Made This Session

### 1. Version Tag Created
- Annotated git tag `v0.1.0-alpha` with full platform description
- Pushed to GitLab: `git@gitlab.com:tevarik/cveriskpilot.git`

### 2. Dynamic Version Badge in Marketing Footer
**Files changed:**
- `apps/web/next.config.js` — Added `NEXT_PUBLIC_APP_VERSION` env var, reads from root `package.json` at build time
- `apps/web/src/components/landing/footer.tsx` — Added styled version pill badge (`v0.1.0-alpha`) in footer bottom bar

**How it works:** `next.config.js` reads `../../package.json` version at build time and exposes it as `NEXT_PUBLIC_APP_VERSION`. The footer renders it as a styled badge. To bump the version, update `package.json` `version` field and it auto-propagates on next build.

**Commit:** `26b0e52` — `feat: dynamic version badge in marketing footer`

### 3. Cloud Build Deploy Fix — Artifact Registry Migration
**Problem:** `gcloud builds submit` was failing with exit code 125. Root causes:
1. GCR (`gcr.io`) deprecated — Docker image push was rejected
2. `$SHORT_SHA` substitution is empty when using `gcloud builds submit` (only populated by triggers)

**Fix:**
- Created Artifact Registry repo: `us-central1-docker.pkg.dev/cveriskpilot-prod/cveriskpilot`
- Updated `deploy/cloudbuild-deploy.yaml` to use Artifact Registry URLs instead of `gcr.io`
- Must pass `SHORT_SHA` explicitly for manual builds: `--substitutions=SHORT_SHA=$(git rev-parse --short HEAD)`

**IAM grants added:**
- `roles/artifactregistry.writer` → `642334918401-compute@developer.gserviceaccount.com`
- `roles/logging.logWriter` → `642334918401-compute@developer.gserviceaccount.com`

**Commit:** `3be85bd` — `fix: Cloud Build deploy — switch to Artifact Registry, fix empty SHORT_SHA`

### 4. Successful GCP Deploy
- Build ID: `70ce08d7-d449-40e8-8723-8bfe7d695b51`
- Duration: 6m10s
- Image: `us-central1-docker.pkg.dev/cveriskpilot-prod/cveriskpilot/web:26b0e52`
- Cloud Run services updated: `cveriskpilot-web-dev`, `cveriskpilot-worker-dev`

---

## Deploy Command Reference

```bash
# Manual deploy from local
SHORT_SHA=$(git rev-parse --short HEAD)
gcloud builds submit \
  --config=deploy/cloudbuild-deploy.yaml \
  --substitutions=_ENV=dev,_REGION=us-central1,SHORT_SHA=$SHORT_SHA .

# Push to GitLab
git push origin main --tags
```

---

## Git Log (all commits)
```
3be85bd fix: Cloud Build deploy — switch to Artifact Registry, fix empty SHORT_SHA
26b0e52 feat: dynamic version badge in marketing footer
7deaa37 chore: add marketing and terminal screenshot assets
39219b0 chore: save point v0.1.0-alpha — first versioned checkpoint on GCP
816b545 fix: Phase 10 security audit remediation — auth, RBAC, CSRF, MSSP isolation
1570e47 fix: white screen — remove CSP nonce (blocks inline scripts), fix JSX fragment errors
a4f6f98 fix: worker build — cast observations to any for Prisma Json field
cf04a6c fix: build errors — prisma import and redis null check in streaming/enrichment
5beefde feat: pipeline scanner CLI, security hardening, ops dashboard, demo pages, audit package
b815ce2 feat: pipeline compliance scanner CLI, marketing, demo pages, billing fixes, ops dashboard
043e7c4 feat: billing route auth, webhook tier fix, portal endpoint, settings UI
cee31e9 fix: Google OAuth redirect using correct origin on Cloud Run
63b83c7 feat: Wave 6-10 — dashboard widgets, security hardening, Google OAuth, deployment scripts
aa63986 feat: MVP scaffold Waves 0-5 — full platform build-out
62147dd feat: Complete MVP scaffold — Waves 0-5 (65/65 tasks)
da1092e Initial project scaffold with planning documents
```

---

## Next Steps
- **Wave 13:** Connectors package (`@cveriskpilot/connectors`)
- **Wave 14:** E2E tests (Playwright)
- **Wave 15:** Marketing public pages (port from legacy 2.0)
- **Wave 16:** Production hardening (Cloud Armor, PgBouncer, CDN, alerts)
- **Versioning:** Bump `package.json` version for each significant milestone, tag with `git tag -a vX.Y.Z-alpha`
