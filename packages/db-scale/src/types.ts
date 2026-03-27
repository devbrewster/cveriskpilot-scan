/**
 * @cveriskpilot/db-scale — Type definitions for materialized views,
 * read replicas, and connection pool configuration.
 */

// ---------------------------------------------------------------------------
// Materialized Views
// ---------------------------------------------------------------------------

export type MaterializedViewName =
  | 'mv_severity_summary'
  | 'mv_sla_compliance'
  | 'mv_trending_cves'
  | 'mv_asset_risk_scores';

export interface MaterializedViewConfig {
  /** View name in the database */
  name: MaterializedViewName;
  /** SQL definition (CREATE MATERIALIZED VIEW ... AS ...) */
  sql: string;
  /** Indexes to create on the view */
  indexes: string[];
  /** Refresh interval in seconds */
  refreshIntervalSec: number;
  /** Whether the view supports CONCURRENTLY refresh (requires unique index) */
  concurrent: boolean;
}

export interface ViewAge {
  name: MaterializedViewName;
  /** Timestamp of last successful refresh (null if never refreshed) */
  lastRefreshedAt: Date | null;
  /** Age in seconds since last refresh */
  ageSec: number | null;
  /** Whether the view is stale (age exceeds refreshIntervalSec) */
  isStale: boolean;
}

// ---------------------------------------------------------------------------
// Read Replicas
// ---------------------------------------------------------------------------

export type ReplicaRole = 'primary' | 'replica';

export interface ReplicaNode {
  /** Unique identifier for this node */
  id: string;
  /** Role of this node */
  role: ReplicaRole;
  /** PostgreSQL connection string */
  connectionString: string;
  /** Whether the node is currently healthy */
  healthy: boolean;
  /** Last health-check timestamp */
  lastCheckedAt: Date | null;
  /** Optional region/zone label */
  region?: string;
}

export interface ReplicaConfig {
  /** Primary (read-write) node */
  primary: ReplicaNode;
  /** Read-only replica nodes */
  replicas: ReplicaNode[];
  /** Health-check interval in milliseconds */
  healthCheckIntervalMs: number;
  /** Timeout for health-check queries in milliseconds */
  healthCheckTimeoutMs: number;
  /** Number of consecutive failures before marking a node unhealthy */
  failureThreshold: number;
}

// ---------------------------------------------------------------------------
// Connection Pool (PgBouncer)
// ---------------------------------------------------------------------------

export type BillingTier = 'free' | 'pro' | 'enterprise';

export interface PoolConfig {
  /** PgBouncer host */
  host: string;
  /** PgBouncer port (default 6432) */
  port: number;
  /** Pool mode: session | transaction | statement */
  poolMode: 'session' | 'transaction' | 'statement';
  /** Maximum connections per tier */
  maxConnectionsByTier: Record<BillingTier, number>;
  /** Default pool size when tier is unknown */
  defaultPoolSize: number;
  /** Server-side connection idle timeout in seconds */
  serverIdleTimeoutSec: number;
  /** Client-side connection idle timeout in seconds */
  clientIdleTimeoutSec: number;
  /** How long to wait for a connection before failing (ms) */
  connectionTimeoutMs: number;
}

export interface PoolHealthStatus {
  /** Whether the pool is accepting connections */
  accepting: boolean;
  /** Current number of active connections */
  activeConnections: number;
  /** Current number of idle connections */
  idleConnections: number;
  /** Current number of waiting clients */
  waitingClients: number;
  /** Total connections available in the pool */
  totalPool: number;
  /** Timestamp of this health check */
  checkedAt: Date;
}

// ---------------------------------------------------------------------------
// Cursor Pagination
// ---------------------------------------------------------------------------

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
  totalCount?: number;
}

export interface CursorPaginationParams {
  /** Base64-encoded cursor to paginate from */
  cursor?: string;
  /** Direction: 'forward' fetches after cursor, 'backward' fetches before */
  direction: 'forward' | 'backward';
  /** Number of items to return */
  take: number;
  /** Columns that form the cursor (must match orderBy) */
  cursorColumns: CursorColumn[];
}

export interface CursorColumn {
  /** Column name */
  field: string;
  /** Sort direction for this column */
  order: 'asc' | 'desc';
}

export interface CursorPage<T> {
  items: T[];
  pageInfo: PageInfo;
}
