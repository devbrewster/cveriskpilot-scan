-- Migration: Wave R1-R5 (Revenue Generation)
-- Adds new columns, tables, indexes, and enums for Waves R1-R5

-- ============================================================================
-- New Enums
-- ============================================================================

CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'POLLING', 'DOWNLOADING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "SyncJobTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'WEBHOOK');
CREATE TYPE "PipelineScanType" AS ENUM ('SAST', 'SCA', 'CONTAINER', 'SECRETS');
CREATE TYPE "PipelineScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "PipelineScanTrigger" AS ENUM ('PUSH', 'PR', 'SCHEDULE', 'MANUAL');

-- ============================================================================
-- Alter existing tables — add new columns
-- ============================================================================

-- organizations: new columns
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_metered_item_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "ai_prompt_config" JSONB;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3);

-- clients: new columns
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contact_name" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contact_email" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- users: mfa backup codes
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_backup_codes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- vulnerability_cases: triage + approval fields
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "severity_override" "Severity";
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "triage_verdict" TEXT;
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "triage_confidence" DOUBLE PRECISION;
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "triage_model" TEXT;
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "triage_at" TIMESTAMP(3);
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "requires_approval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "approval_status" TEXT;
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "approved_by_id" TEXT;
ALTER TABLE "vulnerability_cases" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

-- comments: add organization_id (was missing in init)
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
-- Backfill organization_id from vulnerability_case
UPDATE "comments" c SET "organization_id" = vc."organization_id"
  FROM "vulnerability_cases" vc WHERE c."vulnerability_case_id" = vc."id"
  AND c."organization_id" IS NULL;

-- workflow_lineages: add organization_id
ALTER TABLE "workflow_lineages" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
UPDATE "workflow_lineages" wl SET "organization_id" = vc."organization_id"
  FROM "vulnerability_cases" vc WHERE wl."vulnerability_case_id" = vc."id"
  AND wl."organization_id" IS NULL;

-- risk_exceptions: add organization_id
ALTER TABLE "risk_exceptions" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
UPDATE "risk_exceptions" re SET "organization_id" = vc."organization_id"
  FROM "vulnerability_cases" vc WHERE re."vulnerability_case_id" = vc."id"
  AND re."organization_id" IS NULL;

-- tickets: add organization_id
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
UPDATE "tickets" t SET "organization_id" = vc."organization_id"
  FROM "vulnerability_cases" vc WHERE t."vulnerability_case_id" = vc."id"
  AND t."organization_id" IS NULL;

-- notifications: add organization_id
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

-- api_keys: new columns
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "rotation_required_by" TIMESTAMP(3);
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "request_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "error_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "last_error_at" TIMESTAMP(3);

-- scanner_connectors: new columns
ALTER TABLE "scanner_connectors" ADD COLUMN IF NOT EXISTS "client_id" TEXT;
ALTER TABLE "scanner_connectors" ADD COLUMN IF NOT EXISTS "sync_interval_minutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "scanner_connectors" ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMP(3);
ALTER TABLE "scanner_connectors" ADD COLUMN IF NOT EXISTS "last_sync_error" TEXT;
ALTER TABLE "scanner_connectors" ADD COLUMN IF NOT EXISTS "is_api_connector" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scanner_connectors" ADD COLUMN IF NOT EXISTS "scanner_config" JSONB;

-- ============================================================================
-- New Tables
-- ============================================================================

-- TriageFeedback
CREATE TABLE IF NOT EXISTS "triage_feedback" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "vulnerability_case_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "original_verdict" TEXT NOT NULL,
    "original_severity" "Severity" NOT NULL,
    "original_confidence" DOUBLE PRECISION NOT NULL,
    "corrected_verdict" TEXT,
    "corrected_severity" "Severity",
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_feedback_pkey" PRIMARY KEY ("id")
);

-- CaseApproval
CREATE TABLE IF NOT EXISTS "case_approvals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "vulnerability_case_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "requested_transition" TEXT NOT NULL,
    "approver_id" TEXT,
    "decision" TEXT,
    "reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "case_approvals_pkey" PRIMARY KEY ("id")
);

-- ReportSchedule
CREATE TABLE IF NOT EXISTS "report_schedules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_id" TEXT,
    "report_type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'csv',
    "frequency" TEXT NOT NULL,
    "recipients" TEXT[],
    "day_of_week" INTEGER,
    "hour_utc" INTEGER NOT NULL DEFAULT 0,
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- BrandConfig
CREATE TABLE IF NOT EXISTS "brand_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "app_name" TEXT NOT NULL DEFAULT 'CVERiskPilot',
    "tagline" TEXT NOT NULL DEFAULT '',
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#2563eb',
    "accent_color" TEXT NOT NULL DEFAULT '#7c3aed',
    "custom_css" TEXT,
    "email_from_name" TEXT,
    "email_logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_configs_pkey" PRIMARY KEY ("id")
);

-- SyncJob
CREATE TABLE IF NOT EXISTS "sync_jobs" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "trigger" "SyncJobTrigger" NOT NULL DEFAULT 'SCHEDULED',
    "external_job_id" TEXT,
    "total_chunks" INTEGER NOT NULL DEFAULT 0,
    "processed_chunks" INTEGER NOT NULL DEFAULT 0,
    "findings_received" INTEGER NOT NULL DEFAULT 0,
    "findings_created" INTEGER NOT NULL DEFAULT 0,
    "findings_deduplicated" INTEGER NOT NULL DEFAULT 0,
    "cases_created" INTEGER NOT NULL DEFAULT 0,
    "cases_updated" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- SyncLog
CREATE TABLE IF NOT EXISTS "sync_logs" (
    "id" TEXT NOT NULL,
    "sync_job_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- PipelineScan
CREATE TABLE IF NOT EXISTS "pipeline_scans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "scan_type" "PipelineScanType" NOT NULL,
    "status" "PipelineScanStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "findings_count" INTEGER NOT NULL DEFAULT 0,
    "critical_count" INTEGER NOT NULL DEFAULT 0,
    "high_count" INTEGER NOT NULL DEFAULT 0,
    "medium_count" INTEGER NOT NULL DEFAULT 0,
    "low_count" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" "PipelineScanTrigger" NOT NULL DEFAULT 'PUSH',
    "pr_number" INTEGER,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_scans_pkey" PRIMARY KEY ("id")
);

-- PipelinePolicy
CREATE TABLE IF NOT EXISTS "pipeline_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "frameworks" JSONB NOT NULL DEFAULT '["nist-800-53"]',
    "block_on_severity" TEXT NOT NULL DEFAULT 'CRITICAL',
    "block_on_control_violation" BOOLEAN NOT NULL DEFAULT false,
    "warn_only" BOOLEAN NOT NULL DEFAULT false,
    "auto_exception_rules" JSONB NOT NULL DEFAULT '[]',
    "grace_period_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_policies_pkey" PRIMARY KEY ("id")
);

-- PipelineScanResult
CREATE TABLE IF NOT EXISTS "pipeline_scan_results" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "repo_url" TEXT,
    "commit_sha" TEXT,
    "branch" TEXT,
    "pr_number" INTEGER,
    "verdict" TEXT NOT NULL,
    "total_findings" INTEGER NOT NULL DEFAULT 0,
    "critical_count" INTEGER NOT NULL DEFAULT 0,
    "high_count" INTEGER NOT NULL DEFAULT 0,
    "medium_count" INTEGER NOT NULL DEFAULT 0,
    "low_count" INTEGER NOT NULL DEFAULT 0,
    "info_count" INTEGER NOT NULL DEFAULT 0,
    "compliance_impact" JSONB NOT NULL DEFAULT '[]',
    "policy_reasons" JSONB NOT NULL DEFAULT '[]',
    "poam_entries_created" INTEGER NOT NULL DEFAULT 0,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_scan_results_pkey" PRIMARY KEY ("id")
);

-- PipelineUsage
CREATE TABLE IF NOT EXISTS "pipeline_usage" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "pr_comments_used" INTEGER NOT NULL DEFAULT 0,
    "uploads_used" INTEGER NOT NULL DEFAULT 0,
    "scans_run" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_usage_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- New Unique Constraints
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "brand_configs_organization_id_key" ON "brand_configs"("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_policies_organization_id_key" ON "pipeline_policies"("organization_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_usage_organization_id_month_key" ON "pipeline_usage"("organization_id", "month");

-- ============================================================================
-- New Indexes on EXISTING tables
-- ============================================================================

-- organizations
CREATE INDEX IF NOT EXISTS "organizations_created_at_idx" ON "organizations"("created_at");

-- clients
CREATE INDEX IF NOT EXISTS "clients_organization_id_deleted_at_idx" ON "clients"("organization_id", "deleted_at");

-- users
CREATE INDEX IF NOT EXISTS "users_organization_id_deleted_at_idx" ON "users"("organization_id", "deleted_at");

-- assets
CREATE INDEX IF NOT EXISTS "assets_organization_id_type_idx" ON "assets"("organization_id", "type");
CREATE INDEX IF NOT EXISTS "assets_organization_id_environment_idx" ON "assets"("organization_id", "environment");
CREATE INDEX IF NOT EXISTS "assets_organization_id_deleted_at_idx" ON "assets"("organization_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "assets_client_id_idx" ON "assets"("client_id");

-- findings
CREATE INDEX IF NOT EXISTS "findings_organization_id_scanner_type_idx" ON "findings"("organization_id", "scanner_type");
CREATE INDEX IF NOT EXISTS "findings_discovered_at_idx" ON "findings"("discovered_at");
CREATE INDEX IF NOT EXISTS "findings_client_id_idx" ON "findings"("client_id");
CREATE INDEX IF NOT EXISTS "findings_asset_id_idx" ON "findings"("asset_id");

-- vulnerability_cases
CREATE INDEX IF NOT EXISTS "vulnerability_cases_organization_id_status_idx" ON "vulnerability_cases"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "vulnerability_cases_organization_id_severity_idx" ON "vulnerability_cases"("organization_id", "severity");
CREATE INDEX IF NOT EXISTS "vulnerability_cases_organization_id_severity_status_idx" ON "vulnerability_cases"("organization_id", "severity", "status");
CREATE INDEX IF NOT EXISTS "vulnerability_cases_organization_id_triage_verdict_idx" ON "vulnerability_cases"("organization_id", "triage_verdict");
CREATE INDEX IF NOT EXISTS "vulnerability_cases_organization_id_due_at_idx" ON "vulnerability_cases"("organization_id", "due_at");
CREATE INDEX IF NOT EXISTS "vulnerability_cases_client_id_idx" ON "vulnerability_cases"("client_id");
CREATE INDEX IF NOT EXISTS "vulnerability_cases_organization_id_approval_status_idx" ON "vulnerability_cases"("organization_id", "approval_status");

-- comments
CREATE INDEX IF NOT EXISTS "comments_organization_id_idx" ON "comments"("organization_id");

-- workflow_lineages
CREATE INDEX IF NOT EXISTS "workflow_lineages_organization_id_idx" ON "workflow_lineages"("organization_id");

-- risk_exceptions
CREATE INDEX IF NOT EXISTS "risk_exceptions_organization_id_idx" ON "risk_exceptions"("organization_id");

-- tickets
CREATE INDEX IF NOT EXISTS "tickets_organization_id_idx" ON "tickets"("organization_id");

-- upload_jobs
CREATE INDEX IF NOT EXISTS "upload_jobs_organization_id_status_idx" ON "upload_jobs"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "upload_jobs_organization_id_created_at_idx" ON "upload_jobs"("organization_id", "created_at");

-- audit_logs
CREATE INDEX IF NOT EXISTS "audit_logs_organization_id_action_idx" ON "audit_logs"("organization_id", "action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- notifications
CREATE INDEX IF NOT EXISTS "notifications_organization_id_idx" ON "notifications"("organization_id");

-- ============================================================================
-- New Indexes on NEW tables
-- ============================================================================

-- triage_feedback
CREATE INDEX IF NOT EXISTS "triage_feedback_organization_id_idx" ON "triage_feedback"("organization_id");
CREATE INDEX IF NOT EXISTS "triage_feedback_vulnerability_case_id_idx" ON "triage_feedback"("vulnerability_case_id");
CREATE INDEX IF NOT EXISTS "triage_feedback_organization_id_outcome_idx" ON "triage_feedback"("organization_id", "outcome");

-- case_approvals
CREATE INDEX IF NOT EXISTS "case_approvals_organization_id_idx" ON "case_approvals"("organization_id");
CREATE INDEX IF NOT EXISTS "case_approvals_vulnerability_case_id_idx" ON "case_approvals"("vulnerability_case_id");
CREATE INDEX IF NOT EXISTS "case_approvals_organization_id_decision_idx" ON "case_approvals"("organization_id", "decision");

-- report_schedules
CREATE INDEX IF NOT EXISTS "report_schedules_organization_id_idx" ON "report_schedules"("organization_id");
CREATE INDEX IF NOT EXISTS "report_schedules_next_run_at_enabled_idx" ON "report_schedules"("next_run_at", "enabled");

-- sync_jobs
CREATE INDEX IF NOT EXISTS "sync_jobs_connector_id_idx" ON "sync_jobs"("connector_id");
CREATE INDEX IF NOT EXISTS "sync_jobs_organization_id_created_at_idx" ON "sync_jobs"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "sync_jobs_status_idx" ON "sync_jobs"("status");

-- sync_logs
CREATE INDEX IF NOT EXISTS "sync_logs_sync_job_id_created_at_idx" ON "sync_logs"("sync_job_id", "created_at");

-- pipeline_scans
CREATE INDEX IF NOT EXISTS "pipeline_scans_organization_id_repository_idx" ON "pipeline_scans"("organization_id", "repository");
CREATE INDEX IF NOT EXISTS "pipeline_scans_organization_id_status_idx" ON "pipeline_scans"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "pipeline_scans_organization_id_created_at_idx" ON "pipeline_scans"("organization_id", "created_at");

-- pipeline_scan_results
CREATE INDEX IF NOT EXISTS "pipeline_scan_results_organization_id_created_at_idx" ON "pipeline_scan_results"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "pipeline_scan_results_organization_id_verdict_idx" ON "pipeline_scan_results"("organization_id", "verdict");
CREATE INDEX IF NOT EXISTS "pipeline_scan_results_organization_id_repo_url_idx" ON "pipeline_scan_results"("organization_id", "repo_url");

-- pipeline_usage
CREATE INDEX IF NOT EXISTS "pipeline_usage_organization_id_month_idx" ON "pipeline_usage"("organization_id", "month");

-- ============================================================================
-- Foreign Keys — new tables
-- ============================================================================

-- vulnerability_cases.approved_by_id -> users
ALTER TABLE "vulnerability_cases" ADD CONSTRAINT "vulnerability_cases_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- triage_feedback
ALTER TABLE "triage_feedback" ADD CONSTRAINT "triage_feedback_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "triage_feedback" ADD CONSTRAINT "triage_feedback_vulnerability_case_id_fkey" FOREIGN KEY ("vulnerability_case_id") REFERENCES "vulnerability_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "triage_feedback" ADD CONSTRAINT "triage_feedback_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- case_approvals
ALTER TABLE "case_approvals" ADD CONSTRAINT "case_approvals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_approvals" ADD CONSTRAINT "case_approvals_vulnerability_case_id_fkey" FOREIGN KEY ("vulnerability_case_id") REFERENCES "vulnerability_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_approvals" ADD CONSTRAINT "case_approvals_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_approvals" ADD CONSTRAINT "case_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- report_schedules
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- brand_configs
ALTER TABLE "brand_configs" ADD CONSTRAINT "brand_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- sync_jobs
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "scanner_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- sync_logs
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_sync_job_id_fkey" FOREIGN KEY ("sync_job_id") REFERENCES "sync_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pipeline_scans
ALTER TABLE "pipeline_scans" ADD CONSTRAINT "pipeline_scans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pipeline_policies
ALTER TABLE "pipeline_policies" ADD CONSTRAINT "pipeline_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pipeline_scan_results
ALTER TABLE "pipeline_scan_results" ADD CONSTRAINT "pipeline_scan_results_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pipeline_usage
ALTER TABLE "pipeline_usage" ADD CONSTRAINT "pipeline_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- comments, workflow_lineages, risk_exceptions, tickets, notifications -> organizations (new FK for org_id column)
ALTER TABLE "comments" ADD CONSTRAINT "comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_lineages" ADD CONSTRAINT "workflow_lineages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "risk_exceptions" ADD CONSTRAINT "risk_exceptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
