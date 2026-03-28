#!/usr/bin/env bash
# =============================================================================
# CVERiskPilot — Tail Cloud Run logs
# Usage: ./scripts/logs.sh [web|worker] [--errors]
# =============================================================================
set -euo pipefail

SERVICE="${1:-web}"
PROJECT_ID="${GCP_PROJECT_ID:-cveriskpilot-prod}"
REGION="${GCP_REGION:-us-central1}"

case "$SERVICE" in
  web) SERVICE_NAME="cveriskpilot-web-dev" ;;
  worker) SERVICE_NAME="cveriskpilot-worker-dev" ;;
  *) echo "Usage: $0 [web|worker] [--errors]"; exit 1 ;;
esac

FILTER="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE_NAME}\""

if [[ "${2:-}" == "--errors" ]]; then
  FILTER="${FILTER} AND severity>=ERROR"
fi

echo "━━━ Logs: ${SERVICE_NAME} ━━━"
echo "  (Ctrl+C to stop)"
echo ""

gcloud logging read "${FILTER}" \
  --project="${PROJECT_ID}" \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)" \
  --freshness=1h \
  --order=asc 2>/dev/null

echo ""
echo "▶ Tailing live..."
gcloud logging tail "${FILTER}" \
  --project="${PROJECT_ID}" \
  --format="table(timestamp,severity,textPayload)" 2>/dev/null
