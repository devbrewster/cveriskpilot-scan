# Scanner API Connectors — Implementation Plan

## 1. Executive Summary

CVERiskPilot currently ingests vulnerability scan results exclusively via file upload through 11 parser formats. This plan adds API-based connectors that pull results directly from five scanner platforms (Tenable.io, Qualys VMDR, CrowdStrike Falcon Spotlight, Rapid7 InsightVM, and Snyk), reusing the existing `CanonicalFinding` / `ParseResult` pipeline and extending the `ScannerConnector` Prisma model that already exists in the schema.

The existing codebase provides strong foundations: a `ScannerConnector` model with auth/heartbeat/status, a connector-manager in `packages/integrations/src/connectors/`, Cloud Tasks + Pub/Sub infrastructure in Terraform, a job-consumer pipeline in `packages/storage/src/jobs/`, and a worker service in `apps/worker/`. The plan extends these without disrupting the current file-upload path.

---

## 2. Database Schema Changes

### 2.1 Extend `ScannerConnector` model

The existing `ScannerConnector` model (line 686 of `schema.prisma`) has `type` as a free-form `String`. This needs to be migrated to a proper enum and the model needs new fields for API connector configuration.

```
enum ConnectorType {
  NESSUS
  QUALYS
  OPENVAS
  GENERIC
  TENABLE_IO
  QUALYS_VMDR
  CROWDSTRIKE_SPOTLIGHT
  RAPID7_INSIGHTVM
  SNYK
}

enum SyncJobStatus {
  PENDING
  RUNNING
  POLLING
  DOWNLOADING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

**Changes to `ScannerConnector`:**
- Add `clientId String? @map("client_id")` — scopes results to a specific client
- Add `syncIntervalMinutes Int @default(360) @map("sync_interval_minutes")` — how often to pull
- Add `lastSyncAt DateTime? @map("last_sync_at")`
- Add `lastSyncError String? @map("last_sync_error")`
- Add `isApiConnector Boolean @default(false) @map("is_api_connector")` — distinguishes API connectors from agent-based ones
- Add `scannerConfig Json? @map("scanner_config")` — scanner-specific settings (e.g., Tenable export filters, Qualys asset groups, Snyk org IDs)
- Keep `type` as `String` for backward compatibility but validate against the `ConnectorType` enum values at the application layer
- Add relation to `SyncJob[]`

### 2.2 New `SyncJob` model

```prisma
model SyncJob {
  id                String        @id @default(cuid()) @map("id")
  connectorId       String        @map("connector_id")
  organizationId    String        @map("organization_id")
  clientId          String        @map("client_id")
  status            SyncJobStatus @default(PENDING) @map("status")
  trigger           String        @default("scheduled") @map("trigger") // "scheduled" | "manual" | "webhook"
  externalJobId     String?       @map("external_job_id") // e.g., Tenable export UUID
  totalChunks       Int           @default(0) @map("total_chunks")
  processedChunks   Int           @default(0) @map("processed_chunks")
  findingsReceived  Int           @default(0) @map("findings_received")
  findingsCreated   Int           @default(0) @map("findings_created")
  casesCreated      Int           @default(0) @map("cases_created")
  casesUpdated      Int           @default(0) @map("cases_updated")
  errorMessage      String?       @map("error_message")
  metadata          Json?         @map("metadata")
  startedAt         DateTime?     @map("started_at")
  completedAt       DateTime?     @map("completed_at")
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  connector         ScannerConnector @relation(fields: [connectorId], references: [id])
  logs              SyncLog[]

  @@index([connectorId])
  @@index([organizationId, createdAt])
  @@index([status])
  @@map("sync_jobs")
}
```

### 2.3 New `SyncLog` model

```prisma
model SyncLog {
  id         String   @id @default(cuid()) @map("id")
  syncJobId  String   @map("sync_job_id")
  level      String   @map("level") // "info" | "warn" | "error"
  message    String   @map("message")
  metadata   Json?    @map("metadata")
  createdAt  DateTime @default(now()) @map("created_at")

  syncJob    SyncJob  @relation(fields: [syncJobId], references: [id], onDelete: Cascade)

  @@index([syncJobId, createdAt])
  @@map("sync_logs")
}
```

### 2.4 Migration Notes

- Add `Organization` relation to `SyncJob` (for tenant scoping)
- Add `SyncJob[]` relation to `ScannerConnector`
- Add `ScannerConnector` relation back to `Organization` (currently missing — the model has `organizationId` but no relation defined)

---

## 3. Package Structure: `packages/connectors/`

A new dedicated package separate from `packages/integrations/` because the API connector logic (HTTP clients, rate limiters, streaming, per-scanner adapters) is substantially different from the existing agent-based connector approach. The existing `packages/integrations/src/connectors/` manages agent registration/heartbeat and will remain as-is for agent-based connectors.

```
packages/connectors/
  package.json
  tsconfig.json
  src/
    index.ts                          # Barrel exports
    types.ts                          # ScannerAdapter, ScannerAdapterConfig, etc.
    adapter-registry.ts               # Maps ConnectorType -> adapter factory
    http-client.ts                    # HttpClientWithRetry (rate limiting, retries, circuit breaker)
    rate-limiter.ts                   # Token bucket rate limiter
    credential-resolver.ts            # Decrypt authConfig using @cveriskpilot/auth encryption
    sync-orchestrator.ts              # Main entry: create SyncJob, run adapter, pipe to ParseResult pipeline
    adapters/
      tenable-io.ts                   # Tenable.io REST v3 adapter
      qualys-vmdr.ts                  # Qualys VMDR XML API v2 adapter
      crowdstrike-spotlight.ts        # CrowdStrike Falcon Spotlight adapter
      rapid7-insightvm.ts             # Rapid7 InsightVM REST v3 adapter
      snyk.ts                         # Snyk REST v1 adapter
    mappers/
      tenable-mapper.ts               # Tenable vuln -> CanonicalFinding
      qualys-mapper.ts                # Qualys host detection -> CanonicalFinding
      crowdstrike-mapper.ts           # CrowdStrike vuln -> CanonicalFinding
      rapid7-mapper.ts                # Rapid7 vuln -> CanonicalFinding
      snyk-mapper.ts                  # Snyk issue -> CanonicalFinding
    __tests__/
      fixtures/                       # Mock API responses per scanner
      tenable-io.test.ts
      qualys-vmdr.test.ts
      crowdstrike-spotlight.test.ts
      rapid7-insightvm.test.ts
      snyk.test.ts
      http-client.test.ts
      sync-orchestrator.test.ts
```

---

## 4. TypeScript Interfaces

### 4.1 Core Adapter Interface

```typescript
// packages/connectors/src/types.ts

import type { CanonicalFinding } from '@cveriskpilot/parsers';

export interface ScannerAdapterConfig {
  connectorId: string;
  organizationId: string;
  clientId: string;
  endpoint: string;
  credentials: DecryptedCredentials;
  scannerConfig: Record<string, unknown>;
  /** ISO timestamp of last successful sync — adapters use this for incremental fetches */
  lastSyncAt: string | null;
}

export interface DecryptedCredentials {
  method: 'api_key' | 'basic' | 'oauth2' | 'token';
  apiKey?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
}

export interface SyncProgress {
  phase: 'authenticating' | 'exporting' | 'polling' | 'downloading' | 'mapping';
  totalChunks?: number;
  processedChunks?: number;
  findingsReceived?: number;
  message?: string;
}

export interface ScannerAdapter {
  /** Human-readable name for logging */
  readonly name: string;

  /** Validate that the credentials and endpoint are reachable */
  testConnection(config: ScannerAdapterConfig): Promise<{ ok: boolean; message: string }>;

  /**
   * Stream findings from the scanner API.
   * Uses AsyncGenerator to support backpressure and streaming processing
   * of large result sets without loading everything into memory.
   * Yields batches of CanonicalFinding for pipeline efficiency.
   */
  fetchFindings(
    config: ScannerAdapterConfig,
    onProgress: (progress: SyncProgress) => void,
  ): AsyncGenerator<CanonicalFinding[], void, undefined>;
}
```

### 4.2 HTTP Client with Retry

```typescript
export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  rateLimitPerMinute: number;
  maxRetries?: number;          // default 3
  retryBackoffMs?: number;      // default 1000
  timeoutMs?: number;           // default 30000
  circuitBreakerThreshold?: number; // consecutive failures before open, default 5
}

export interface HttpClientWithRetry {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  getRaw(path: string, options?: RequestOptions): Promise<Buffer>;
}
```

This follows the same `fetch`-based pattern already used in `packages/integrations/src/jira/client.ts` and `packages/integrations/src/connectors/connector-manager.ts`, but adds rate limiting (token bucket), exponential backoff retry matching `webhook-sender.ts` patterns, and a circuit breaker.

---

## 5. Per-Scanner Implementation Notes

### 5.1 Tenable.io

- **Auth**: API key pair (`accessKey` + `secretKey`) sent as `X-ApiKeys` header
- **Flow**: Export-based. POST `/vulns/export` with filters -> returns `export_uuid` -> poll `GET /vulns/export/{uuid}/status` until `FINISHED` -> download chunks via `GET /vulns/export/{uuid}/chunks/{chunk_id}`
- **Rate limit**: 40 req/min global. Token bucket at 35 req/min (safety margin).
- **Pagination**: Chunk-based. Each chunk is a JSON array of vulns. Yields `CanonicalFinding[]` per chunk.
- **Incremental**: Filter by `last_found` >= `lastSyncAt` to get only new/updated vulns.
- **Mapping**: `plugin.name` -> title, `plugin.cve` -> cveIds, `plugin.cvss3_base_score` -> cvssScore, `asset.hostname` -> assetName, `severity` (0-4 int) -> severity enum. Scanner type: `VM`.

### 5.2 Qualys VMDR

- **Auth**: Basic auth (`username:password`) over HTTPS
- **Flow**: GET `/api/2.0/fo/asset/host/vm/detection/` with `action=list` + filters. Returns XML.
- **Rate limit**: Varies by subscription. Default token bucket at 100 req/min, configurable in `scannerConfig`.
- **Pagination**: Cursor-based via `id_min` parameter. Response XML contains `<WARNING><URL>` for next page.
- **Incremental**: Filter by `detection_updated_since` >= `lastSyncAt`.
- **Mapping**: `<DETECTION><QID>` -> title lookup, `<CVE_ID_LIST>` -> cveIds, `<SEVERITY>` (1-5 int) -> severity enum, `<HOST><IP>` -> assetName/ipAddress. Reuses `packages/parsers/src/parsers/qualys.ts` XML parsing patterns.
- **Note**: Qualys returns XML; use existing XML parsing patterns from the Qualys parser already in `packages/parsers/`.

### 5.3 CrowdStrike Falcon Spotlight

- **Auth**: OAuth2 client credentials. POST `/oauth2/token` with `client_id`+`client_secret` -> bearer token. Token cached until expiry.
- **Flow**: GET `/spotlight/combined/vulnerabilities/v1` with FQL filter queries.
- **Rate limit**: Per-route limits. Token bucket at 50 req/min.
- **Pagination**: Offset-based via `after` cursor + `limit` parameter (max 400 per page).
- **Incremental**: FQL filter `updated_timestamp:>'lastSyncAt'`.
- **Mapping**: `cve.id` -> cveIds, `cve.base_score` -> cvssScore, `host_info.hostname` -> assetName, `status` -> used for filtering active vulns only. Scanner type: `VM`.

### 5.4 Rapid7 InsightVM

- **Auth**: API key sent as `X-Api-Key` header.
- **Flow**: Two-step. GET `/api/3/assets` (paginated) to get asset inventory, then GET `/api/3/assets/{id}/vulnerabilities` per asset. Alternatively, use site-level vulnerability export.
- **Rate limit**: Moderate. Token bucket at 60 req/min.
- **Pagination**: Page-based (`page` + `size` parameters). Response includes `page.totalPages`.
- **Incremental**: Filter assets by `lastAssessedDate` >= `lastSyncAt`.
- **Mapping**: `vulnerability.title` -> title, `vulnerability.cves` -> cveIds, `vulnerability.cvss.v3.score` -> cvssScore, `asset.hostName` -> assetName. Scanner type: `VM`.
- **Note**: High asset count environments may need the asset-first approach with parallel vuln fetches, respecting rate limits.

### 5.5 Snyk

- **Auth**: API token as `Authorization: token {api_token}` header.
- **Flow**: GET `/rest/orgs/{org_id}/issues` (REST v1) with project filtering. Also supports webhook push for real-time.
- **Rate limit**: 1200 req/min (generous). Token bucket at 1000 req/min.
- **Pagination**: Cursor-based via `starting_after` parameter.
- **Incremental**: Filter by `created_after` >= `lastSyncAt` or use webhook for push.
- **Mapping**: `issue.title` -> title, `issue.identifiers.CVE` -> cveIds, `issue.priority.score` -> cvssScore (need to map Snyk priority to CVSS), `project.name` -> assetName. Scanner type: `SCA`.
- **Webhook support**: Snyk can push events via webhooks. The adapter will also support registering a webhook endpoint at `POST /api/connectors/webhook/snyk` that receives push notifications, triggering an immediate sync.

---

## 6. Sync Orchestrator Design

The `sync-orchestrator.ts` is the central coordinator. It:

1. Loads the `ScannerConnector` record from DB
2. Decrypts credentials using `packages/auth/src/security/encryption.ts` (the `decrypt` function, AES-256-GCM)
3. Creates a `SyncJob` record with `PENDING` status
4. Instantiates the correct adapter from the registry
5. Calls `adapter.fetchFindings()` which returns an `AsyncGenerator<CanonicalFinding[]>`
6. For each yielded batch, pipes through the existing pipeline:
   - `normalizeFindings()` from `packages/parsers/src/normalize.ts`
   - `deduplicateFindings()` from `packages/parsers/src/dedup.ts`
   - `enrichFindings()` from `packages/enrichment/`
   - `buildCases()` from `packages/storage/src/case-builder/case-builder.ts`
7. Updates `SyncJob` progress counters after each batch
8. Writes `SyncLog` entries for key events and errors
9. Sets `ScannerConnector.lastSyncAt` on completion

This reuses the exact same processing pipeline as `packages/storage/src/jobs/job-consumer.ts`, with the difference that findings come from an API adapter's AsyncGenerator instead of from a downloaded file.

---

## 7. Scheduling Design

### 7.1 Cloud Scheduler -> Pub/Sub -> Cloud Run Worker

Add a new Pub/Sub topic `connector-sync` to the existing `pubsub.tf`:

```
connector-sync = "Scanner connector API sync events"
```

This gets a push subscription to the worker service at `/api/jobs/connector-sync`.

**Cloud Scheduler** (new `scheduler.tf`): One Cloud Scheduler job per active connector, created/updated via a management API. Each job publishes a message to the `connector-sync` topic containing `{ connectorId, organizationId, clientId }`.

Alternatively (simpler, recommended for Phase 1): A single Cloud Scheduler job runs every 5 minutes, publishing a "tick" message. The worker handler queries all connectors where `isApiConnector = true AND status != 'offline' AND (lastSyncAt IS NULL OR lastSyncAt < NOW() - syncIntervalMinutes)` and enqueues individual sync tasks via Cloud Tasks (reusing the existing `tasks.tf` queue pattern from `job-producer.ts`).

### 7.2 Worker Handler

Add a new job type `SYNC_CONNECTOR` to `apps/worker/src/index.ts` alongside the existing job types. The handler calls `syncOrchestrator.runSync(connectorId)`.

### 7.3 Manual Sync Trigger

The `POST /api/connectors/[id]/sync` route creates a Cloud Task directly (same as `enqueueUploadJob` in `packages/storage/src/jobs/job-producer.ts`) instead of waiting for the scheduler.

---

## 8. API Routes

### 8.1 New Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/connectors` | **Extended**: Accept `isApiConnector: true` + `scannerConfig` for API connectors |
| `PUT` | `/api/connectors/[id]` | **Extended**: Update `scannerConfig`, `syncIntervalMinutes` |
| `POST` | `/api/connectors/[id]/test` | **New**: Test connection (calls `adapter.testConnection()`) |
| `POST` | `/api/connectors/[id]/sync` | **New**: Trigger manual sync (creates Cloud Task) |
| `GET` | `/api/connectors/[id]/sync-history` | **New**: List `SyncJob` records with pagination |
| `GET` | `/api/connectors/[id]/sync-history/[jobId]` | **New**: Get single `SyncJob` with `SyncLog` entries |
| `POST` | `/api/connectors/webhook/snyk` | **New**: Snyk webhook receiver (validates HMAC, triggers sync) |

### 8.2 Zod Validation Schemas

```typescript
const createApiConnectorSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['TENABLE_IO', 'QUALYS_VMDR', 'CROWDSTRIKE_SPOTLIGHT', 'RAPID7_INSIGHTVM', 'SNYK']),
  endpoint: z.string().url(),
  authConfig: z.object({
    method: z.enum(['api_key', 'basic', 'oauth2', 'token']),
    // Credentials encrypted before storage
  }),
  scannerConfig: z.record(z.unknown()).optional(),
  clientId: z.string().cuid(),
  syncIntervalMinutes: z.number().int().min(15).max(1440).default(360),
  schedule: z.string().optional(),
});
```

---

## 9. UI Components

### 9.1 Extend `connector-settings.tsx`

The existing component handles agent-based connectors (Nessus, Qualys, OpenVAS, Generic). Extend it with:

- **Tabbed view**: "Agent Connectors" | "API Connectors" tabs
- **API Connector setup wizard**: Multi-step form
  - Step 1: Select scanner type (5 options with logos)
  - Step 2: Enter credentials (form adapts per scanner type)
  - Step 3: Configure scanner-specific options
  - Step 4: Test connection (calls `/api/connectors/[id]/test`)
  - Step 5: Set schedule (sync interval dropdown or cron)

### 9.2 New Components

| Component | Location | Description |
|-----------|----------|-------------|
| `api-connector-wizard.tsx` | `src/components/settings/` | Multi-step setup wizard |
| `sync-history.tsx` | `src/components/settings/` | Table showing SyncJob records with status, duration, finding counts |
| `sync-job-detail.tsx` | `src/components/settings/` | Expandable detail view with SyncLog timeline |
| `connector-health-dashboard.tsx` | `src/components/dashboard/` | Dashboard widget: all connectors with status, last sync, next sync, error rate |

---

## 10. Testing Strategy

### 10.1 Unit Tests (per adapter)

Each adapter gets fixture files with recorded API responses (JSON/XML). Tests verify:
- Credential handling (OAuth2 token refresh, API key header injection)
- Pagination (cursor advancement, termination)
- Rate limit backoff behavior
- Error handling (401, 403, 429, 500, network timeout)
- Mapping accuracy: fixture response -> `CanonicalFinding[]` with exact field assertions

### 10.2 HTTP Client Tests

- Token bucket rate limiting (timing assertions)
- Exponential backoff retry (attempt counting)
- Circuit breaker (open after N failures, half-open probe)
- Timeout handling

### 10.3 Integration Tests

Use `msw` (Mock Service Worker) to simulate full scanner API servers. Test the complete flow: sync-orchestrator creates SyncJob -> adapter fetches paginated results -> findings flow through normalize/dedup/enrich/build-cases pipeline -> verify DB state.

### 10.4 Contract Tests

Validate that mapper output always conforms to `CanonicalFinding` interface using Zod runtime validation in tests. Catches drift between scanner API changes and our mapping.

### 10.5 E2E Tests

- Connector setup wizard flow
- Sync history page rendering
- Manual sync trigger

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1-2)

- Schema migration: Add `SyncJob`, `SyncLog` models; extend `ScannerConnector`
- `packages/connectors/` scaffold: Package setup, `types.ts`, `adapter-registry.ts`
- `http-client.ts`: Rate-limited HTTP client with retry and circuit breaker
- `rate-limiter.ts`: Token bucket implementation
- `credential-resolver.ts`: Decrypt credentials using existing `@cveriskpilot/auth` encryption
- `sync-orchestrator.ts`: Core orchestration loop (adapter -> normalize -> enrich -> build-cases)
- Unit tests: HTTP client, rate limiter, credential resolver

### Phase 2: First Two Adapters (Week 3-4)

- Tenable.io adapter: Export-based flow with polling
- Qualys VMDR adapter: XML API with cursor pagination
- Tenable mapper + Qualys mapper: Mapping to `CanonicalFinding`
- Fixtures: Recorded API responses for both scanners
- Unit tests: Adapter + mapper tests with fixtures
- Integration test: Full sync flow with `msw` mock server

### Phase 3: Remaining Adapters (Week 5-6)

- CrowdStrike Falcon Spotlight adapter: OAuth2 + FQL
- Rapid7 InsightVM adapter: API key + page-based pagination
- Snyk adapter: Token auth + cursor pagination
- Snyk webhook receiver: `POST /api/connectors/webhook/snyk`
- All mappers + fixtures + tests

### Phase 4: Scheduling and Worker (Week 7)

- Terraform: New `scheduler.tf` with Cloud Scheduler, extend `pubsub.tf` with `connector-sync` topic
- Worker handler: Add `SYNC_CONNECTOR` job type to `apps/worker/`
- Enqueue logic: Extend job-producer with `enqueueSyncJob()`
- API routes: `/api/connectors/[id]/sync`, `/test`, `/sync-history`
- Manual sync trigger: Test in local dev mode

### Phase 5: UI (Week 8-9)

- API connector wizard: Multi-step form with scanner-specific credential fields
- Sync history table: Paginated, filterable
- Sync job detail: Log timeline
- Connector health dashboard widget: Status overview
- Extend `connector-settings.tsx`: Tabbed layout for agent vs API connectors
- E2E tests: Wizard flow, sync history rendering

### Phase 6: Hardening (Week 10)

- Rate limit tuning: Load test each adapter against sandbox environments
- Circuit breaker validation: Failure cascade testing
- Credential rotation: Verify re-encryption on key rotation
- Error alerting: SyncJob failure -> notification pipeline
- Documentation: API connector setup guides per scanner
- Feature flag: Gate behind `packages/rollout/` feature flag `scanner-api-connectors`

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scanner API breaking changes (v3 -> v4) | Medium | High | Adapter version pinning, contract tests catch drift early |
| Rate limit exhaustion on shared tenant scanners | Medium | Medium | Configurable rate limits per connector in `scannerConfig`, token bucket with safety margins |
| Credential leakage in logs/errors | Low | Critical | All credentials decrypted only in-memory, never logged; existing AES-256-GCM encryption |
| Large export volumes (100K+ vulns) exhausting worker memory | Medium | High | AsyncGenerator streaming with batch processing (500 findings/batch) |
| OAuth2 token expiry mid-sync (CrowdStrike) | Medium | Low | Auto-refresh before expiry; token cache with TTL |
| Qualys XML response parsing failures on edge cases | Medium | Medium | Reuse battle-tested Qualys XML parser; add defensive error handling |
| Sync job hangs (scanner API unresponsive) | Low | Medium | Per-request timeouts (30s), overall sync timeout (30min), Cloud Tasks retry config |
| Terraform state drift on scheduler resources | Low | Medium | Manage scheduler jobs via API instead of per-connector Terraform resources |

---

## 13. Dependencies and Sequencing

```
Phase 1 (Foundation)
  |
  +-- Phase 2 (Tenable + Qualys adapters)
  |     |
  |     +-- Phase 3 (CrowdStrike + Rapid7 + Snyk adapters)
  |
  +-- Phase 4 (Scheduling + Worker) -- depends on at least one adapter from Phase 2
        |
        +-- Phase 5 (UI) -- depends on API routes from Phase 4
              |
              +-- Phase 6 (Hardening) -- depends on everything above
```

Phases 2 and 4 can overlap if different engineers work in parallel. Phase 3 adapters are independent of each other and can be parallelized.

---

## 14. Environment Variables

New environment variables (added to `deploy/terraform/secrets.tf`):

```
CLOUD_SCHEDULER_LOCATION   # e.g., us-central1
CONNECTOR_SYNC_QUEUE       # Cloud Tasks queue name for sync jobs
CONNECTOR_SYNC_TOPIC       # Pub/Sub topic for scheduler ticks
```

Scanner credentials are stored encrypted in the `ScannerConnector.authConfig` JSON field, not as environment variables.

---

## 15. Critical Files for Implementation

- `packages/domain/prisma/schema.prisma` — Schema changes: new SyncJob/SyncLog models, ScannerConnector extensions
- `packages/integrations/src/connectors/connector-manager.ts` — Reference for extending connector management
- `packages/parsers/src/types.ts` — The `CanonicalFinding` and `ParseResult` interfaces that all adapters must map to
- `packages/storage/src/jobs/job-consumer.ts` — The existing processing pipeline (normalize -> enrich -> buildCases) that sync-orchestrator will reuse
- `deploy/terraform/pubsub.tf` — Terraform infrastructure for adding the `connector-sync` topic and Cloud Scheduler resources
