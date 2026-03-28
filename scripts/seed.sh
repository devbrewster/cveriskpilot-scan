#!/usr/bin/env bash
# =============================================================================
# CVERiskPilot — Seed database with test data
# Usage: ./scripts/seed.sh [--reset]
# =============================================================================
set -euo pipefail

RESET=false
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=true ;;
  esac
done

echo "━━━ Database Seed ━━━"

if [ "$RESET" = true ]; then
  echo "▶ Resetting database..."
  npx prisma db push --force-reset --schema=packages/domain/prisma/schema.prisma
fi

echo "▶ Generating Prisma client..."
npx prisma generate --schema=packages/domain/prisma/schema.prisma

echo "▶ Running seed..."
npx tsx packages/domain/prisma/seed.ts 2>/dev/null || echo "  (No seed file found — skipping)"

echo ""
echo "✓ Seed complete"
