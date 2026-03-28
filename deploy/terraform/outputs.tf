# -----------------------------------------------------------------------------
# Aggregated outputs
# -----------------------------------------------------------------------------

output "web_url" {
  description = "Cloud Run web service URL"
  value       = google_cloud_run_v2_service.web.uri
}

output "worker_url" {
  description = "Cloud Run worker service URL"
  value       = google_cloud_run_v2_service.worker.uri
}

output "db_connection" {
  description = "Cloud SQL connection string for Cloud Run"
  value       = google_sql_database_instance.main.connection_name
}

output "bucket_name" {
  description = "GCS artifacts bucket name"
  value       = google_storage_bucket.artifacts.name
}

output "waf_policy_name" {
  description = "Cloud Armor WAF security policy name"
  value       = google_compute_security_policy.waf_enterprise.name
}

output "cloudbuild_ci_trigger_id" {
  description = "Cloud Build CI trigger ID"
  value       = google_cloudbuild_trigger.ci.trigger_id
}

output "cloudbuild_deploy_trigger_id" {
  description = "Cloud Build deploy trigger ID"
  value       = google_cloudbuild_trigger.deploy.trigger_id
}
