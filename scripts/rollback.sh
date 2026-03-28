#!/usr/bin/env bash
# =============================================================================
# CVERiskPilot — Rollback to a previous Cloud Run revision
# Usage: ./scripts/rollback.sh [REVISION_NAME]
#   If no revision name given, lists recent revisions to pick from.
# =============================================================================
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-cveriskpilot-prod}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="cveriskpilot-web-dev"
REVISION="${1:-}"

if [ -z "$REVISION" ]; then
  echo "━━━ Recent Revisions ━━━"
  gcloud run revisions list \
    --service="${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --limit=10 \
    --format="table(name,active,createTime)" 2>/dev/null
  echo ""
  echo "Usage: $0 <revision-name>"
  exit 0
fi

echo "━━━ Rolling back to ${REVISION} ━━━"
gcloud run services update-traffic "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --to-revisions="${REVISION}=100" 2>&1 | tail -5

echo ""
echo "✓ Traffic routed to ${REVISION}"
echo ""

# Health check
WEB_URL=$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)' 2>/dev/null)
sleep 3
HEALTH=$(curl -s --max-time 10 "${WEB_URL}/api/health" 2>/dev/null || echo '{"status":"unreachable"}')
echo "Health: ${HEALTH}"
