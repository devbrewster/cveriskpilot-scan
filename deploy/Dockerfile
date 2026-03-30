# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy ALL workspace package.json files so npm can resolve the workspaces
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/abac/package.json ./packages/abac/
COPY packages/agents/package.json ./packages/agents/
COPY packages/ai/package.json ./packages/ai/
COPY packages/api-docs/package.json ./packages/api-docs/
COPY packages/auth/package.json ./packages/auth/
COPY packages/backup/package.json ./packages/backup/
COPY packages/billing/package.json ./packages/billing/
COPY packages/compliance/package.json ./packages/compliance/
COPY packages/db-scale/package.json ./packages/db-scale/
COPY packages/domain/package.json ./packages/domain/
COPY packages/enrichment/package.json ./packages/enrichment/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/observability/package.json ./packages/observability/
COPY packages/parsers/package.json ./packages/parsers/
COPY packages/residency/package.json ./packages/residency/
COPY packages/rollout/package.json ./packages/rollout/
COPY packages/shared/package.json ./packages/shared/
COPY packages/stamps/package.json ./packages/stamps/
COPY packages/storage/package.json ./packages/storage/
COPY packages/streaming/package.json ./packages/streaming/
COPY packages/whitelabel/package.json ./packages/whitelabel/
COPY packages/audit/package.json ./packages/audit/
COPY packages/connectors/package.json ./packages/connectors/
COPY packages/scan/package.json ./packages/scan/

RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build the application
# =============================================================================
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The host .env.local symlink is invalid inside the container — replace with empty file
RUN rm -f apps/web/.env.local && touch apps/web/.env.local

# Generate Prisma client
RUN npx prisma generate --schema=packages/domain/prisma/schema.prisma

# Build the Next.js application
RUN npm run build

# Build the worker service
RUN npm run build --workspace=apps/worker

# =============================================================================
# Stage 3: Production runner
# =============================================================================
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from Next.js
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy Prisma schema + generated client for runtime
COPY --from=build --chown=nextjs:nodejs /app/packages/domain/prisma ./packages/domain/prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy worker build output + workspace packages it depends on
COPY --from=build --chown=nextjs:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=nextjs:nodejs /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@cveriskpilot ./node_modules/@cveriskpilot

# Copy entrypoint script that routes by SERVICE_ROLE
COPY --from=build --chown=nextjs:nodejs /app/deploy/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ops/health || exit 1

CMD ["./entrypoint.sh"]
