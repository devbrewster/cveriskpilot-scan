/**
 * @cveriskpilot/db-scale — Materialized view definitions and refresh logic.
 *
 * Provides SQL definitions for dashboard-critical aggregate views and
 * functions to create, refresh, and monitor their freshness.
 */

import type { MaterializedViewConfig, MaterializedViewName, ViewAge } from './types';

// ---------------------------------------------------------------------------
// SQL Definitions
// ---------------------------------------------------------------------------

const VIEW_CONFIGS: MaterializedViewConfig[] = [
  // -- mv_severity_summary: counts by severity per organisation, refreshed 5 min
  {
    name: 'mv_severity_summary',
    sql: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_severity_summary AS
      SELECT
        organization_id,
        severity,
        COUNT(*)::int                    AS case_count,
        COUNT(*) FILTER (WHERE status = 'OPEN')::int   AS open_count,
        COUNT(*) FILTER (WHERE status = 'CLOSED')::int  AS closed_count,
        NOW()                            AS computed_at
      FROM vulnerability_cases
      GROUP BY organization_id, severity
      WITH DATA;
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS mv_severity_summary_pk
         ON mv_severity_summary (organization_id, severity);`,
    ],
    refreshIntervalSec: 300, // 5 minutes
    concurrent: true,
  },

  // -- mv_sla_compliance: breach rate per tenant / severity
  {
    name: 'mv_sla_compliance',
    sql: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sla_compliance AS
      SELECT
        organization_id,
        severity,
        COUNT(*)::int                                              AS total_cases,
        COUNT(*) FILTER (WHERE due_at IS NOT NULL AND status != 'CLOSED' AND due_at < NOW())::int AS breached_cases,
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            (COUNT(*) FILTER (WHERE due_at IS NOT NULL AND status != 'CLOSED' AND due_at < NOW())::numeric
             / COUNT(*)::numeric) * 100, 2)
        END                                                       AS breach_rate_pct,
        CASE
          WHEN COUNT(*) = 0 THEN 100
          ELSE ROUND(
            (1 - COUNT(*) FILTER (WHERE due_at IS NOT NULL AND status != 'CLOSED' AND due_at < NOW())::numeric
             / COUNT(*)::numeric) * 100, 2)
        END                                                       AS compliance_rate_pct,
        NOW()                                                     AS computed_at
      FROM vulnerability_cases
      GROUP BY organization_id, severity
      WITH DATA;
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS mv_sla_compliance_pk
         ON mv_sla_compliance (organization_id, severity);`,
    ],
    refreshIntervalSec: 300,
    concurrent: true,
  },

  // -- mv_trending_cves: top CVEs by frequency across orgs (last 30 days)
  {
    name: 'mv_trending_cves',
    sql: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trending_cves AS
      SELECT
        cve_id,
        COUNT(DISTINCT organization_id)::int  AS affected_orgs,
        COUNT(*)::int                         AS total_cases,
        MAX(cvss_score)                       AS max_cvss,
        MAX(epss_score)                       AS max_epss,
        BOOL_OR(kev_listed)                   AS in_kev,
        NOW()                                 AS computed_at
      FROM vulnerability_cases,
           LATERAL unnest(cve_ids) AS cve_id
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY cve_id
      ORDER BY affected_orgs DESC, total_cases DESC
      LIMIT 500
      WITH DATA;
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS mv_trending_cves_pk
         ON mv_trending_cves (cve_id);`,
      `CREATE INDEX IF NOT EXISTS mv_trending_cves_orgs_idx
         ON mv_trending_cves (affected_orgs DESC);`,
    ],
    refreshIntervalSec: 600, // 10 minutes
    concurrent: true,
  },

  // -- mv_asset_risk_scores: aggregated risk per asset
  {
    name: 'mv_asset_risk_scores',
    sql: `
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_asset_risk_scores AS
      SELECT
        a.id                                  AS asset_id,
        a.organization_id,
        a.hostname,
        a.ip_address,
        COUNT(f.id)::int                      AS finding_count,
        MAX(vc.cvss_score)                    AS max_cvss,
        AVG(vc.cvss_score)                    AS avg_cvss,
        MAX(vc.epss_score)                    AS max_epss,
        COALESCE(
          MAX(vc.cvss_score) * 0.4
          + MAX(vc.epss_score) * 100 * 0.3
          + LEAST(COUNT(f.id), 50)::numeric / 50 * 100 * 0.3,
          0
        )                                     AS composite_risk_score,
        NOW()                                 AS computed_at
      FROM assets a
      LEFT JOIN findings f     ON f.asset_id = a.id
      LEFT JOIN vulnerability_cases vc ON vc.id = f.case_id
      GROUP BY a.id, a.organization_id, a.hostname, a.ip_address
      WITH DATA;
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS mv_asset_risk_scores_pk
         ON mv_asset_risk_scores (asset_id);`,
      `CREATE INDEX IF NOT EXISTS mv_asset_risk_scores_org_idx
         ON mv_asset_risk_scores (organization_id);`,
      `CREATE INDEX IF NOT EXISTS mv_asset_risk_scores_risk_idx
         ON mv_asset_risk_scores (composite_risk_score DESC);`,
    ],
    refreshIntervalSec: 600,
    concurrent: true,
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Raw SQL executor interface — callers inject a function that runs arbitrary
 * SQL (e.g. prisma.$executeRawUnsafe or pg Pool.query).
 */
export type SqlExecutor = (sql: string) => Promise<unknown>;

/**
 * Raw SQL query interface — like SqlExecutor but returns rows.
 */
export type SqlQuerier = <T = Record<string, unknown>>(sql: string) => Promise<T[]>;

// In-memory registry tracking last refresh timestamps.
const refreshTimestamps = new Map<MaterializedViewName, Date>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the config for all registered materialized views. */
export function getViewConfigs(): MaterializedViewConfig[] {
  return [...VIEW_CONFIGS];
}

/** Returns the config for a single view by name. */
export function getViewConfig(name: MaterializedViewName): MaterializedViewConfig | undefined {
  return VIEW_CONFIGS.find((v) => v.name === name);
}

/**
 * Runs CREATE MATERIALIZED VIEW + associated indexes for all views.
 * Safe to call repeatedly (IF NOT EXISTS).
 */
export async function createMaterializedViews(exec: SqlExecutor): Promise<void> {
  for (const view of VIEW_CONFIGS) {
    await exec(view.sql);
    for (const idx of view.indexes) {
      await exec(idx);
    }
  }
}

/**
 * Refreshes a single materialized view.
 * Uses CONCURRENTLY when the view config supports it so that reads are
 * not blocked during refresh.
 */
export async function refreshView(
  name: MaterializedViewName,
  exec: SqlExecutor,
): Promise<void> {
  const config = VIEW_CONFIGS.find((v) => v.name === name);
  if (!config) {
    throw new Error(`Unknown materialized view: ${name}`);
  }

  const concurrently = config.concurrent ? ' CONCURRENTLY' : '';
  await exec(`REFRESH MATERIALIZED VIEW${concurrently} ${name};`);

  refreshTimestamps.set(name, new Date());
}

/**
 * Refreshes all materialized views.
 */
export async function refreshAll(exec: SqlExecutor): Promise<void> {
  for (const view of VIEW_CONFIGS) {
    await refreshView(view.name, exec);
  }
}

/**
 * Returns freshness info for a single view.
 */
export function getViewAge(name: MaterializedViewName): ViewAge {
  const config = VIEW_CONFIGS.find((v) => v.name === name);
  if (!config) {
    throw new Error(`Unknown materialized view: ${name}`);
  }

  const lastRefreshedAt = refreshTimestamps.get(name) ?? null;
  const ageSec = lastRefreshedAt
    ? Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000)
    : null;
  const isStale = ageSec === null || ageSec > config.refreshIntervalSec;

  return { name, lastRefreshedAt, ageSec, isStale };
}

/**
 * Returns freshness info for all views.
 */
export function getAllViewAges(): ViewAge[] {
  return VIEW_CONFIGS.map((v) => getViewAge(v.name));
}

/**
 * Refreshes any views that are stale (age exceeds their configured interval).
 * Returns the names of views that were refreshed.
 */
export async function refreshStaleViews(exec: SqlExecutor): Promise<MaterializedViewName[]> {
  const refreshed: MaterializedViewName[] = [];

  for (const view of VIEW_CONFIGS) {
    const age = getViewAge(view.name);
    if (age.isStale) {
      await refreshView(view.name, exec);
      refreshed.push(view.name);
    }
  }

  return refreshed;
}

/**
 * Drops all materialized views (useful for migrations / teardown).
 */
export async function dropMaterializedViews(exec: SqlExecutor): Promise<void> {
  // Drop in reverse order to avoid dependency issues
  for (const view of [...VIEW_CONFIGS].reverse()) {
    await exec(`DROP MATERIALIZED VIEW IF EXISTS ${view.name} CASCADE;`);
    refreshTimestamps.delete(view.name);
  }
}
