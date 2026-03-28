#!/usr/bin/env bash
# =============================================================================
# CVERiskPilot — Proxy Cloud Run service to localhost
# Usage: ./scripts/proxy.sh [web|worker] [PORT]
# =============================================================================
set -euo pipefail

SERVICE="${1:-web}"
PORT="${2:-8080}"
PROJECT_ID="${GCP_PROJECT_ID:-cveriskpilot-prod}"
REGION="${GCP_REGION:-us-central1}"

case "$SERVICE" in
  web) SERVICE_NAME="cveriskpilot-web-dev" ;;
  worker) SERVICE_NAME="cveriskpilot-worker-dev" ;;
  *) echo "Usage: $0 [web|worker] [PORT]"; exit 1 ;;
esac

echo "━━━ Proxying ${SERVICE_NAME} → localhost:${PORT} ━━━"
echo "  Open http://localhost:${PORT} in your browser"
echo "  (Ctrl+C to stop)"
echo ""

gcloud run services proxy "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --port="${PORT}"
