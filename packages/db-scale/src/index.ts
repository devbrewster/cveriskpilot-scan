/**
 * @cveriskpilot/db-scale — Database scaling utilities.
 *
 * Barrel exports for materialized views, read-replica routing,
 * connection pooling, and cursor-based pagination.
 */

// Types
export type {
  MaterializedViewName,
  MaterializedViewConfig,
  ViewAge,
  ReplicaRole,
  ReplicaNode,
  ReplicaConfig,
  BillingTier,
  PoolConfig,
  PoolHealthStatus,
  CursorColumn,
  CursorPage,
  CursorPaginationParams,
  PageInfo,
} from './types';

// Materialized views
export {
  getViewConfigs,
  getViewConfig,
  createMaterializedViews,
  refreshView,
  refreshAll,
  getViewAge,
  getAllViewAges,
  refreshStaleViews,
  dropMaterializedViews,
} from './materialized-views';
export type { SqlExecutor, SqlQuerier } from './materialized-views';

// Read-replica routing
export { ReadReplicaRouter, createReplicaRouterFromEnv } from './read-replica';

// Connection pool
export { PgBouncerPool, createPoolFromEnv } from './connection-pool';

// Cursor-based pagination
export {
  encodeCursor,
  decodeCursor,
  buildCursorQuery,
  CursorPaginator,
} from './cursor-pagination';
export type { CursorQueryResult } from './cursor-pagination';
