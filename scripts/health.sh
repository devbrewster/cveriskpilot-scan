#!/usr/bin/env bash
# =============================================================================
# CVERiskPilot — Quick health check for all services
# Usage: ./scripts/health.sh
# =============================================================================
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-cveriskpilot-prod}"
REGION="${GCP_REGION:-us-central1}"

echo "━━━ CVERiskPilot Health Check ━━━"
echo ""

# Web service
WEB_URL=$(gcloud run services describe cveriskpilot-web-dev --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)' 2>/dev/null || echo "")
if [ -n "$WEB_URL" ]; then
  echo "Web: ${WEB_URL}"
  HEALTH=$(curl -s --max-time 10 "${WEB_URL}/api/health" 2>/dev/null || echo '{"status":"unreachable"}')
  echo "  ${HEALTH}"

  # Check demo page
  DEMO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${WEB_URL}/demo" 2>/dev/null || echo "000")
  echo "  /demo → ${DEMO_STATUS}"
else
  echo "Web: NOT FOUND"
fi

echo ""

# Worker service
WORKER_URL=$(gcloud run services describe cveriskpilot-worker-dev --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)' 2>/dev/null || echo "")
if [ -n "$WORKER_URL" ]; then
  WORKER_REV=$(gcloud run services describe cveriskpilot-worker-dev --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.latestReadyRevisionName)' 2>/dev/null || echo "unknown")
  echo "Worker: ${WORKER_URL}"
  echo "  Latest ready revision: ${WORKER_REV}"
else
  echo "Worker: NOT FOUND"
fi

echo ""

# Revisions
echo "Recent revisions:"
gcloud run revisions list --service=cveriskpilot-web-dev --region="${REGION}" --project="${PROJECT_ID}" --limit=5 --format="table(name,active,createTime)" 2>/dev/null || echo "  (unable to list)"

echo ""
echo "━━━ Done ━━━"
