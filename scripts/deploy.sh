#!/usr/bin/env bash
# =============================================================================
# CVERiskPilot — Build + Deploy to Cloud Run
# Usage: ./scripts/deploy.sh [TAG] [--web-only|--worker-only|--skip-build]
# =============================================================================
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-cveriskpilot-prod}"
REGION="${GCP_REGION:-us-central1}"
TAG="${1:-v$(date +%Y%m%d-%H%M%S)}"
WEB_SERVICE="cveriskpilot-web-dev"
WORKER_SERVICE="cveriskpilot-worker-dev"
IMAGE="gcr.io/${PROJECT_ID}/cveriskpilot-web:${TAG}"

DEPLOY_WEB=true
DEPLOY_WORKER=true
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --web-only) DEPLOY_WORKER=false ;;
    --worker-only) DEPLOY_WEB=false ;;
    --skip-build) SKIP_BUILD=true ;;
  esac
done

echo "━━━ CVERiskPilot Deploy ━━━"
echo "  Project:  ${PROJECT_ID}"
echo "  Region:   ${REGION}"
echo "  Tag:      ${TAG}"
echo "  Image:    ${IMAGE}"
echo ""

# ── Build ──────────────────────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  echo "▶ Building image..."
  cat > /tmp/cloudbuild-deploy-tmp.yaml << EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${IMAGE}', '-t', 'gcr.io/${PROJECT_ID}/cveriskpilot-web:latest', '-f', 'deploy/Dockerfile', '.']
images:
  - '${IMAGE}'
  - 'gcr.io/${PROJECT_ID}/cveriskpilot-web:latest'
timeout: '900s'
EOF
  gcloud builds submit --config /tmp/cloudbuild-deploy-tmp.yaml --timeout=900 --project="${PROJECT_ID}" 2>&1 | tail -5
  echo "✓ Build complete"
else
  echo "⏭ Skipping build (--skip-build)"
fi

# ── Deploy Web ─────────────────────────────────────────────────────────────
if [ "$DEPLOY_WEB" = true ]; then
  echo ""
  echo "▶ Deploying web service..."
  gcloud run deploy "${WEB_SERVICE}" \
    --image "${IMAGE}" \
    --region "${REGION}" \
    --platform managed \
    --ingress all \
    --project "${PROJECT_ID}" 2>&1 | tail -3
  echo "✓ Web deployed"
fi

# ── Deploy Worker ──────────────────────────────────────────────────────────
if [ "$DEPLOY_WORKER" = true ]; then
  echo ""
  echo "▶ Deploying worker service..."
  gcloud run deploy "${WORKER_SERVICE}" \
    --image "${IMAGE}" \
    --region "${REGION}" \
    --platform managed \
    --no-allow-unauthenticated \
    --project "${PROJECT_ID}" 2>&1 | tail -3
  echo "✓ Worker deployed"
fi

# ── Health Check ───────────────────────────────────────────────────────────
if [ "$DEPLOY_WEB" = true ]; then
  echo ""
  echo "▶ Health check..."
  WEB_URL=$(gcloud run services describe "${WEB_SERVICE}" --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)' 2>/dev/null)
  sleep 5
  HEALTH=$(curl -s "${WEB_URL}/api/health" 2>/dev/null || echo '{"status":"unreachable"}')
  echo "  ${HEALTH}"
fi

echo ""
echo "━━━ Deploy complete ━━━"
