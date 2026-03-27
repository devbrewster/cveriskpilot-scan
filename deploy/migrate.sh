#!/usr/bin/env bash
# =============================================================================
# CVERiskPilot — GCP Migration Script
# =============================================================================
# Usage: ./deploy/migrate.sh
#
# Prerequisites:
#   - gcloud CLI authenticated (gcloud auth login)
#   - terraform >= 1.5 installed
#   - cloud-sql-proxy installed (https://cloud.google.com/sql/docs/postgres/connect-auth-proxy)
#   - Project ID set: gcloud config set project YOUR_PROJECT_ID
#
# This script NEVER stores secrets in files or logs.
# All sensitive values are passed via stdin or Secret Manager.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1" >&2; }
step() { echo -e "\n${GREEN}━━━ Phase $1: $2 ━━━${NC}"; }

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
step 0 "Preflight Checks"

command -v gcloud >/dev/null 2>&1 || { err "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"; exit 1; }
command -v terraform >/dev/null 2>&1 || { err "terraform not found. Install: https://developer.hashicorp.com/terraform/install"; exit 1; }
command -v cloud-sql-proxy >/dev/null 2>&1 || { err "cloud-sql-proxy not found. Install: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy#install"; exit 1; }

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  err "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi
log "GCP Project: $PROJECT_ID"

ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
  err "Not authenticated. Run: gcloud auth login"
  exit 1
fi
log "Authenticated as: $ACCOUNT"

# ---------------------------------------------------------------------------
# Phase 1: Enable required APIs
# ---------------------------------------------------------------------------
step 1 "Enabling GCP APIs"

APIS=(
  "sqladmin.googleapis.com"
  "run.googleapis.com"
  "secretmanager.googleapis.com"
  "cloudkms.googleapis.com"
  "cloudtasks.googleapis.com"
  "vpcaccess.googleapis.com"
  "servicenetworking.googleapis.com"
  "cloudbuild.googleapis.com"
  "containerregistry.googleapis.com"
  "redis.googleapis.com"
  "compute.googleapis.com"
)

for api in "${APIS[@]}"; do
  echo "  Enabling $api..."
  gcloud services enable "$api" --quiet 2>/dev/null || true
done
log "All APIs enabled"

# ---------------------------------------------------------------------------
# Phase 2: Create Terraform state bucket
# ---------------------------------------------------------------------------
step 2 "Terraform State Bucket"

TF_BUCKET="${PROJECT_ID}-tf-state"
if gsutil ls -b "gs://${TF_BUCKET}" &>/dev/null; then
  log "State bucket exists: gs://${TF_BUCKET}"
else
  warn "Creating state bucket: gs://${TF_BUCKET}"
  gsutil mb -l us-central1 "gs://${TF_BUCKET}"
  gsutil versioning set on "gs://${TF_BUCKET}"
  log "State bucket created with versioning"
fi

# ---------------------------------------------------------------------------
# Phase 3: Terraform Init + Plan
# ---------------------------------------------------------------------------
step 3 "Terraform Infrastructure"

cd "$(dirname "$0")/terraform"

if [ ! -f terraform.tfvars ]; then
  err "Missing terraform.tfvars. Copy terraform.tfvars.example and fill in values."
  err "  cp terraform.tfvars.example terraform.tfvars"
  exit 1
fi

log "Initializing Terraform..."
terraform init -backend-config="bucket=${TF_BUCKET}" -reconfigure

log "Planning infrastructure..."
terraform plan -out=tfplan

echo ""
warn "Review the plan above carefully."
read -r -p "Apply this plan? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  warn "Aborted. No changes made."
  exit 0
fi

terraform apply tfplan
rm -f tfplan

log "Infrastructure deployed"

# Capture outputs
WEB_URL=$(terraform output -raw web_url 2>/dev/null || echo "")
DB_CONNECTION=$(terraform output -raw db_connection 2>/dev/null || echo "")
BUCKET_NAME=$(terraform output -raw bucket_name 2>/dev/null || echo "")

cd - >/dev/null

# ---------------------------------------------------------------------------
# Phase 4: Populate Secret Manager
# ---------------------------------------------------------------------------
step 4 "Secret Manager"

SECRETS=(
  "database-url"
  "redis-url"
  "auth-secret"
  "google-oidc-client-secret"
  "anthropic-api-key"
  "stripe-secret-key"
  "stripe-webhook-secret"
  "nvd-api-key"
)

ENVIRONMENT=$(grep 'environment' deploy/terraform/terraform.tfvars 2>/dev/null | sed 's/.*= *"\(.*\)"/\1/' || echo "dev")

for secret in "${SECRETS[@]}"; do
  SECRET_NAME="cveriskpilot-${ENVIRONMENT}-${secret}"
  EXISTING=$(gcloud secrets versions list "$SECRET_NAME" --limit=1 --format="value(name)" 2>/dev/null || echo "")

  if [ -n "$EXISTING" ]; then
    log "Secret ${secret} already has a version — skipping"
  else
    echo ""
    warn "Enter value for: ${secret}"
    warn "(input is hidden, press Enter when done)"
    read -r -s SECRET_VALUE
    echo ""

    if [ -z "$SECRET_VALUE" ]; then
      warn "Skipped ${secret} (empty)"
    else
      echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=-
      log "Secret ${secret} stored"
      unset SECRET_VALUE
    fi
  fi
done

log "Secrets configured"

# ---------------------------------------------------------------------------
# Phase 5: Database Schema
# ---------------------------------------------------------------------------
step 5 "Database Migration"

if [ -z "$DB_CONNECTION" ]; then
  warn "Skipping DB migration — no Cloud SQL connection found in Terraform output"
  warn "You can run this manually after the proxy is set up"
else
  log "Starting Cloud SQL Auth Proxy..."
  cloud-sql-proxy "$DB_CONNECTION" --port=5433 &
  PROXY_PID=$!
  sleep 3

  if ! kill -0 $PROXY_PID 2>/dev/null; then
    err "Cloud SQL Auth Proxy failed to start"
    exit 1
  fi

  log "Proxy running on localhost:5433 (PID: $PROXY_PID)"

  # Read the database password from tfvars (it's marked sensitive but we need it for the URL)
  warn "Enter the Cloud SQL database password (same as db_password in tfvars):"
  read -r -s DB_PASS
  echo ""

  export DATABASE_URL="postgresql://cveriskpilot:${DB_PASS}@127.0.0.1:5433/cveriskpilot"

  log "Pushing Prisma schema to Cloud SQL..."
  npx prisma db push --schema=packages/domain/prisma/schema.prisma --accept-data-loss

  log "Generating Prisma client..."
  npx prisma generate --schema=packages/domain/prisma/schema.prisma

  warn "Do you want to seed the database with demo data? (yes/no)"
  read -r -p "> " SEED_CONFIRM
  if [ "$SEED_CONFIRM" = "yes" ]; then
    npx prisma db seed --schema=packages/domain/prisma/schema.prisma
    log "Database seeded"
  fi

  # Clean up
  unset DATABASE_URL DB_PASS
  kill $PROXY_PID 2>/dev/null || true
  log "Database migration complete"
fi

# ---------------------------------------------------------------------------
# Phase 6: Build & Deploy Container
# ---------------------------------------------------------------------------
step 6 "Build & Deploy"

warn "Build and deploy to Cloud Run? (yes/no)"
read -r -p "> " BUILD_CONFIRM

if [ "$BUILD_CONFIRM" = "yes" ]; then
  log "Submitting build to Cloud Build..."
  gcloud builds submit --config=deploy/cloudbuild.yaml --timeout=1200

  log "Build and deploy complete"
  log "Web URL: ${WEB_URL:-'check Cloud Run console'}"
else
  warn "Skipped build. Run manually:"
  warn "  gcloud builds submit --config=deploy/cloudbuild.yaml"
fi

# ---------------------------------------------------------------------------
# Phase 7: DNS instructions
# ---------------------------------------------------------------------------
step 7 "DNS Configuration"

echo ""
log "Infrastructure is deployed. Final step — DNS:"
echo ""
echo "  In Cloudflare Dashboard:"
echo "    1. Set cveriskpilot.com → CNAME → ${WEB_URL:-'YOUR_CLOUD_RUN_URL'}"
echo "    2. Proxy status: Proxied (orange cloud)"
echo "    3. SSL/TLS → Full (Strict)"
echo ""
echo "  Then map the domain in Cloud Run:"
echo "    gcloud run domain-mappings create \\"
echo "      --service=cveriskpilot-web-${ENVIRONMENT} \\"
echo "      --domain=cveriskpilot.com \\"
echo "      --region=us-central1"
echo ""

# ---------------------------------------------------------------------------
# Phase 8: Verification
# ---------------------------------------------------------------------------
step 8 "Verification"

if [ -n "$WEB_URL" ]; then
  log "Testing health endpoint..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${WEB_URL}/api/health" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    log "Health check passed (HTTP $HTTP_CODE)"
  else
    warn "Health check returned HTTP $HTTP_CODE — check Cloud Run logs:"
    warn "  gcloud run services logs read cveriskpilot-web-${ENVIRONMENT} --region=us-central1 --limit=50"
  fi
fi

echo ""
log "Migration complete."
