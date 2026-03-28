#!/bin/sh
# Route to the correct service based on SERVICE_ROLE env var.
# Both services run on port 3000 (set via PORT env) to match Terraform/Cloud Run config.

# Append Prisma connection pool params to DATABASE_URL if not already set.
# Cloud Run concurrency = 80 requests/instance; pool_size = 20 gives headroom
# without exhausting Cloud SQL's max_connections (default 100).
# PgBouncer (transaction mode) handles the server-side pool.
if [ -n "$DATABASE_URL" ]; then
  case "$DATABASE_URL" in
    *connection_limit*) ;; # already configured
    *\?*) export DATABASE_URL="${DATABASE_URL}&connection_limit=20&pool_timeout=10" ;;
    *)    export DATABASE_URL="${DATABASE_URL}?connection_limit=20&pool_timeout=10" ;;
  esac
fi

if [ "$SERVICE_ROLE" = "worker" ]; then
  echo "[entrypoint] Starting worker service"
  exec node apps/worker/dist/index.js
else
  echo "[entrypoint] Starting web service"
  exec node apps/web/server.js
fi
