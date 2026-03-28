-- =============================================================================
-- CVERiskPilot — Materialized Views for Dashboard & Reporting
-- =============================================================================
--
-- These views pre-compute expensive aggregations to keep dashboard queries fast.
-- They should be refreshed on a schedule (e.g., every 15 minutes) via:
--   - Cloud Scheduler -> Cloud Run worker endpoint
--   - Or a cron job in the worker service
--
-- All views use CONCURRENTLY so they do not block reads during refresh.
-- CONCURRENTLY requires a UNIQUE INDEX on each materialized view.
--
-- Usage:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_severity_distribution;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_cves_by_epss;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_dashboard_stats;
-- =============================================================================


-- -----------------------------------------------------------------------------
-- mv_severity_distribution
-- Count of findings by severity per organization, with case status breakdown.
-- -----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_severity_distribution AS
SELECT
    vc.organization_id,
    vc.severity,
    vc.status,
    COUNT(DISTINCT vc.id)  AS case_count,
    SUM(vc.finding_count)  AS finding_count,
    NOW()                  AS refreshed_at
FROM vulnerability_cases vc
GROUP BY
    vc.organization_id,
    vc.severity,
    vc.status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_severity_dist_unique
    ON mv_severity_distribution (organization_id, severity, status);

CREATE INDEX IF NOT EXISTS idx_mv_severity_dist_org
    ON mv_severity_distribution (organization_id);

-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_severity_distribution;


-- -----------------------------------------------------------------------------
-- mv_top_cves_by_epss
-- Top 50 CVEs by EPSS score per organization, with finding count.
-- Uses a window function to rank within each org, then filters to top 50.
-- -----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_cves_by_epss AS
SELECT
    ranked.organization_id,
    ranked.cve_id,
    ranked.title,
    ranked.severity,
    ranked.epss_score,
    ranked.epss_percentile,
    ranked.cvss_score,
    ranked.kev_listed,
    ranked.kev_due_date,
    ranked.finding_count,
    ranked.status,
    ranked.rank_in_org,
    NOW() AS refreshed_at
FROM (
    SELECT
        vc.organization_id,
        UNNEST(vc.cve_ids)    AS cve_id,
        vc.title,
        vc.severity,
        vc.epss_score,
        vc.epss_percentile,
        vc.cvss_score,
        vc.kev_listed,
        vc.kev_due_date,
        vc.finding_count,
        vc.status,
        ROW_NUMBER() OVER (
            PARTITION BY vc.organization_id
            ORDER BY vc.epss_score DESC NULLS LAST
        ) AS rank_in_org
    FROM vulnerability_cases vc
    WHERE vc.epss_score IS NOT NULL
) ranked
WHERE ranked.rank_in_org <= 50;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_cves_unique
    ON mv_top_cves_by_epss (organization_id, cve_id, rank_in_org);

CREATE INDEX IF NOT EXISTS idx_mv_top_cves_org
    ON mv_top_cves_by_epss (organization_id, epss_score DESC);

-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_cves_by_epss;


-- -----------------------------------------------------------------------------
-- mv_org_dashboard_stats
-- Pre-computed dashboard statistics per organization. One row per org.
-- -----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_org_dashboard_stats AS
SELECT
    o.id                                          AS organization_id,
    o.name                                        AS organization_name,

    -- Finding counts
    COALESCE(f_counts.total_findings, 0)          AS total_findings,

    -- Case counts by status
    COALESCE(c_all.total_cases, 0)                AS total_cases,
    COALESCE(c_open.open_cases, 0)                AS open_cases,
    COALESCE(c_closed.closed_cases, 0)            AS closed_cases,

    -- Severity breakdown (cases)
    COALESCE(c_crit.critical_cases, 0)            AS critical_cases,
    COALESCE(c_high.high_cases, 0)                AS high_cases,
    COALESCE(c_med.medium_cases, 0)               AS medium_cases,
    COALESCE(c_low.low_cases, 0)                  AS low_cases,

    -- KEV stats
    COALESCE(c_kev.kev_listed_cases, 0)           AS kev_listed_cases,
    c_kev.nearest_kev_due_date,

    -- EPSS stats
    c_epss.avg_epss_score,
    c_epss.max_epss_score,

    -- MTTR (Mean Time To Remediate) in days for closed cases
    c_mttr.mttr_days,

    -- Latest scan
    uj.last_scan_at,
    uj.last_scan_status,

    NOW()                                         AS refreshed_at

FROM organizations o

-- Total findings
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_findings
    FROM findings f
    WHERE f.organization_id = o.id
) f_counts ON true

-- Total cases
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_cases
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id
) c_all ON true

-- Open cases (non-terminal statuses)
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS open_cases
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id
      AND vc.status NOT IN ('VERIFIED_CLOSED', 'FALSE_POSITIVE', 'NOT_APPLICABLE', 'DUPLICATE')
) c_open ON true

-- Closed cases
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS closed_cases
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id
      AND vc.status IN ('VERIFIED_CLOSED', 'FALSE_POSITIVE', 'NOT_APPLICABLE', 'DUPLICATE')
) c_closed ON true

-- Critical cases
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS critical_cases
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id AND vc.severity = 'CRITICAL'
) c_crit ON true

-- High cases
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS high_cases
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id AND vc.severity = 'HIGH'
) c_high ON true

-- Medium cases
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS medium_cases
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id AND vc.severity = 'MEDIUM'
) c_med ON true

-- Low cases
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS low_cases
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id AND vc.severity = 'LOW'
) c_low ON true

-- KEV stats
LEFT JOIN LATERAL (
    SELECT
        COUNT(*)                                AS kev_listed_cases,
        MIN(vc.kev_due_date)                    AS nearest_kev_due_date
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id
      AND vc.kev_listed = true
      AND vc.status NOT IN ('VERIFIED_CLOSED', 'FALSE_POSITIVE', 'NOT_APPLICABLE', 'DUPLICATE')
) c_kev ON true

-- EPSS stats
LEFT JOIN LATERAL (
    SELECT
        ROUND(AVG(vc.epss_score)::numeric, 4)  AS avg_epss_score,
        MAX(vc.epss_score)                      AS max_epss_score
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id
      AND vc.epss_score IS NOT NULL
) c_epss ON true

-- MTTR for closed cases (days between created_at and updated_at for terminal statuses)
LEFT JOIN LATERAL (
    SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (vc.updated_at - vc.created_at)) / 86400)::numeric, 1) AS mttr_days
    FROM vulnerability_cases vc
    WHERE vc.organization_id = o.id
      AND vc.status = 'VERIFIED_CLOSED'
) c_mttr ON true

-- Latest upload job
LEFT JOIN LATERAL (
    SELECT
        uj.completed_at     AS last_scan_at,
        uj.status::text     AS last_scan_status
    FROM upload_jobs uj
    WHERE uj.organization_id = o.id
    ORDER BY uj.created_at DESC
    LIMIT 1
) uj ON true

WHERE o.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_org_dashboard_unique
    ON mv_org_dashboard_stats (organization_id);

-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_dashboard_stats;


-- =============================================================================
-- Refresh scheduling note
-- =============================================================================
-- Schedule refresh via one of:
--
-- 1. Cloud Scheduler (recommended):
--    Create a Cloud Scheduler job that hits a worker endpoint every 15 minutes:
--      POST /api/jobs/refresh-materialized-views
--    The worker executes all three REFRESH MATERIALIZED VIEW CONCURRENTLY statements.
--
-- 2. pg_cron extension (if enabled on Cloud SQL):
--    SELECT cron.schedule('refresh-mv-severity',  '*/15 * * * *',
--           'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_severity_distribution');
--    SELECT cron.schedule('refresh-mv-top-cves',  '*/15 * * * *',
--           'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_cves_by_epss');
--    SELECT cron.schedule('refresh-mv-dashboard', '*/15 * * * *',
--           'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_dashboard_stats');
--
-- 3. Worker cron (in-app):
--    Use node-cron or a scheduled Cloud Tasks job in the worker service.
-- =============================================================================
