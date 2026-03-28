#!/usr/bin/env bash
# =============================================================================
# CVERiskPilot — Run Prisma migrations via Cloud Build
# Usage: ./scripts/migrate.sh [ENV]
# =============================================================================
set -euo pipefail

ENV="${1:-dev}"
PROJECT_ID="${GCP_PROJECT_ID:-cveriskpilot-prod}"

echo "━━━ Database Migration (${ENV}) ━━━"
echo "  Project: ${PROJECT_ID}"
echo ""

gcloud builds submit \
  --config deploy/cloudbuild-migrate.yaml \
  --substitutions="_ENV=${ENV}" \
  --project="${PROJECT_ID}" \
  --timeout=300 2>&1 | tail -10

echo ""
echo "✓ Migration complete"
