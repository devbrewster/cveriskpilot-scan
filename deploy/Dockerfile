# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files so npm can resolve the workspaces
COPY apps/web/package.json ./apps/web/
COPY packages/domain/package.json ./packages/domain/
COPY packages/auth/package.json ./packages/auth/
COPY packages/parsers/package.json ./packages/parsers/
COPY packages/enrichment/package.json ./packages/enrichment/
COPY packages/ai/package.json ./packages/ai/
COPY packages/storage/package.json ./packages/storage/

RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build the application
# =============================================================================
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=packages/domain/prisma/schema.prisma 2>/dev/null || true

# Build the Next.js application
RUN npm run build

# =============================================================================
# Stage 3: Production runner
# =============================================================================
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from Next.js
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
