-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'ORG_OWNER', 'SECURITY_ADMIN', 'ANALYST', 'DEVELOPER', 'VIEWER', 'SERVICE_ACCOUNT', 'CLIENT_ADMIN', 'CLIENT_VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED', 'PENDING_INVITE');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('NEW', 'TRIAGE', 'IN_REMEDIATION', 'FIXED_PENDING_VERIFICATION', 'VERIFIED_CLOSED', 'REOPENED', 'ACCEPTED_RISK', 'FALSE_POSITIVE', 'NOT_APPLICABLE', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "UploadJobStatus" AS ENUM ('QUEUED', 'PARSING', 'ENRICHING', 'BUILDING_CASES', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('HOST', 'REPOSITORY', 'CONTAINER_IMAGE', 'CLOUD_ACCOUNT', 'APPLICATION');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ScannerType" AS ENUM ('SCA', 'SAST', 'DAST', 'IAC', 'CONTAINER', 'VM', 'BUG_BOUNTY');

-- CreateEnum
CREATE TYPE "ParserFormat" AS ENUM ('NESSUS', 'SARIF', 'CSV', 'JSON_FORMAT', 'CYCLONEDX', 'OSV', 'SPDX', 'CSAF', 'QUALYS', 'OPENVAS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATE_CHANGE', 'RISK_EXCEPTION', 'EXPORT', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('ACCEPTED_RISK', 'FALSE_POSITIVE', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "entitlements" JSONB,
    "logo_url" TEXT,
    "domain" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_id" TEXT,
    "github_id" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_INVITE',
    "last_login_at" TIMESTAMP(3),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "account_locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_team_assignments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "internet_exposed" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "deployment_refs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "scanner_type" "ScannerType" NOT NULL,
    "scanner_name" TEXT NOT NULL,
    "run_id" TEXT,
    "observations" JSONB NOT NULL,
    "dedup_key" TEXT NOT NULL,
    "vulnerability_case_id" TEXT,
    "artifact_id" TEXT,
    "discovered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerability_cases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cve_ids" TEXT[],
    "cwe_ids" TEXT[],
    "severity" "Severity" NOT NULL,
    "cvss_score" DOUBLE PRECISION,
    "cvss_vector" TEXT,
    "cvss_version" TEXT,
    "epss_score" DOUBLE PRECISION,
    "epss_percentile" DOUBLE PRECISION,
    "kev_listed" BOOLEAN NOT NULL DEFAULT false,
    "kev_due_date" TIMESTAMP(3),
    "status" "CaseStatus" NOT NULL DEFAULT 'NEW',
    "assigned_to_id" TEXT,
    "sla_policy_id" TEXT,
    "due_at" TIMESTAMP(3),
    "ai_advisory" JSONB,
    "remediation_notes" TEXT,
    "finding_count" INTEGER NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerability_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_artifacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "gcs_bucket" TEXT NOT NULL,
    "gcs_path" TEXT NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "parser_format" "ParserFormat" NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "artifact_id" TEXT NOT NULL,
    "status" "UploadJobStatus" NOT NULL DEFAULT 'QUEUED',
    "total_findings" INTEGER NOT NULL DEFAULT 0,
    "parsed_findings" INTEGER NOT NULL DEFAULT 0,
    "unique_cves_found" INTEGER NOT NULL DEFAULT 0,
    "unique_cves_enriched" INTEGER NOT NULL DEFAULT 0,
    "findings_created" INTEGER NOT NULL DEFAULT 0,
    "cases_created" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "upload_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "vulnerability_case_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_lineages" (
    "id" TEXT NOT NULL,
    "vulnerability_case_id" TEXT NOT NULL,
    "from_status" "CaseStatus" NOT NULL,
    "to_status" "CaseStatus" NOT NULL,
    "changed_by_id" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_lineages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_exceptions" (
    "id" TEXT NOT NULL,
    "vulnerability_case_id" TEXT NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "decided_by_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "approved_by_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "vex_rationale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "vulnerability_case_id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "ticket_key" TEXT NOT NULL,
    "ticket_url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignee" TEXT,
    "due_date" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL,
    "last_sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "critical_days" INTEGER NOT NULL,
    "high_days" INTEGER NOT NULL,
    "medium_days" INTEGER NOT NULL,
    "low_days" INTEGER NOT NULL,
    "kev_critical_days" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "assigned_clients" TEXT[],
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_ip" TEXT,
    "details" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "previous_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_cve_records" (
    "id" TEXT NOT NULL,
    "cve_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cwe_ids" TEXT[],
    "cvss_v2" JSONB,
    "cvss_v3" JSONB,
    "cvss_v4" JSONB,
    "published_date" TIMESTAMP(3) NOT NULL,
    "last_modified" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_cve_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_epss_scores" (
    "id" TEXT NOT NULL,
    "cve_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "percentile" DOUBLE PRECISION NOT NULL,
    "as_of_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_epss_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_kev_records" (
    "id" TEXT NOT NULL,
    "cve_id" TEXT NOT NULL,
    "known_ransomware_campaign" BOOLEAN NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_kev_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scanner_connectors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "auth_config" JSONB NOT NULL,
    "auth_key_hash" TEXT NOT NULL,
    "schedule" TEXT,
    "last_heartbeat" TIMESTAMP(3),
    "last_heartbeat_data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scanner_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "clients_organization_id_idx" ON "clients"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organization_id_slug_key" ON "clients"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");

-- CreateIndex
CREATE INDEX "teams_organization_id_idx" ON "teams"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_user_id_team_id_key" ON "team_memberships"("user_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_team_assignments_team_id_client_id_key" ON "client_team_assignments"("team_id", "client_id");

-- CreateIndex
CREATE INDEX "assets_organization_id_client_id_idx" ON "assets"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "findings_organization_id_client_id_created_at_idx" ON "findings"("organization_id", "client_id", "created_at");

-- CreateIndex
CREATE INDEX "findings_dedup_key_idx" ON "findings"("dedup_key");

-- CreateIndex
CREATE INDEX "findings_vulnerability_case_id_idx" ON "findings"("vulnerability_case_id");

-- CreateIndex
CREATE INDEX "findings_artifact_id_idx" ON "findings"("artifact_id");

-- CreateIndex
CREATE INDEX "vulnerability_cases_organization_id_client_id_idx" ON "vulnerability_cases"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "vulnerability_cases_organization_id_client_id_status_idx" ON "vulnerability_cases"("organization_id", "client_id", "status");

-- CreateIndex
CREATE INDEX "vulnerability_cases_assigned_to_id_idx" ON "vulnerability_cases"("assigned_to_id");

-- CreateIndex
CREATE INDEX "vulnerability_cases_sla_policy_id_idx" ON "vulnerability_cases"("sla_policy_id");

-- CreateIndex
CREATE INDEX "scan_artifacts_organization_id_client_id_idx" ON "scan_artifacts"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "upload_jobs_organization_id_client_id_idx" ON "upload_jobs"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "upload_jobs_artifact_id_idx" ON "upload_jobs"("artifact_id");

-- CreateIndex
CREATE INDEX "comments_vulnerability_case_id_idx" ON "comments"("vulnerability_case_id");

-- CreateIndex
CREATE INDEX "workflow_lineages_vulnerability_case_id_idx" ON "workflow_lineages"("vulnerability_case_id");

-- CreateIndex
CREATE INDEX "risk_exceptions_vulnerability_case_id_idx" ON "risk_exceptions"("vulnerability_case_id");

-- CreateIndex
CREATE INDEX "tickets_vulnerability_case_id_idx" ON "tickets"("vulnerability_case_id");

-- CreateIndex
CREATE INDEX "sla_policies_organization_id_idx" ON "sla_policies"("organization_id");

-- CreateIndex
CREATE INDEX "api_keys_organization_id_idx" ON "api_keys"("organization_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_entity_type_entity_id_idx" ON "audit_logs"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "global_cve_records_cve_id_key" ON "global_cve_records"("cve_id");

-- CreateIndex
CREATE INDEX "global_cve_records_cve_id_idx" ON "global_cve_records"("cve_id");

-- CreateIndex
CREATE INDEX "global_epss_scores_cve_id_idx" ON "global_epss_scores"("cve_id");

-- CreateIndex
CREATE INDEX "global_epss_scores_cve_id_as_of_date_idx" ON "global_epss_scores"("cve_id", "as_of_date");

-- CreateIndex
CREATE UNIQUE INDEX "global_kev_records_cve_id_key" ON "global_kev_records"("cve_id");

-- CreateIndex
CREATE INDEX "global_kev_records_cve_id_idx" ON "global_kev_records"("cve_id");

-- CreateIndex
CREATE INDEX "scanner_connectors_organization_id_idx" ON "scanner_connectors"("organization_id");

-- CreateIndex
CREATE INDEX "scanner_connectors_auth_key_hash_idx" ON "scanner_connectors"("auth_key_hash");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_team_assignments" ADD CONSTRAINT "client_team_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_team_assignments" ADD CONSTRAINT "client_team_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_vulnerability_case_id_fkey" FOREIGN KEY ("vulnerability_case_id") REFERENCES "vulnerability_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "scan_artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_cases" ADD CONSTRAINT "vulnerability_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_cases" ADD CONSTRAINT "vulnerability_cases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_cases" ADD CONSTRAINT "vulnerability_cases_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_cases" ADD CONSTRAINT "vulnerability_cases_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_artifacts" ADD CONSTRAINT "scan_artifacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_artifacts" ADD CONSTRAINT "scan_artifacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_artifacts" ADD CONSTRAINT "scan_artifacts_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "scan_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_vulnerability_case_id_fkey" FOREIGN KEY ("vulnerability_case_id") REFERENCES "vulnerability_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_lineages" ADD CONSTRAINT "workflow_lineages_vulnerability_case_id_fkey" FOREIGN KEY ("vulnerability_case_id") REFERENCES "vulnerability_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_lineages" ADD CONSTRAINT "workflow_lineages_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_exceptions" ADD CONSTRAINT "risk_exceptions_vulnerability_case_id_fkey" FOREIGN KEY ("vulnerability_case_id") REFERENCES "vulnerability_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_exceptions" ADD CONSTRAINT "risk_exceptions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_exceptions" ADD CONSTRAINT "risk_exceptions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_vulnerability_case_id_fkey" FOREIGN KEY ("vulnerability_case_id") REFERENCES "vulnerability_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

