# -----------------------------------------------------------------------------
# IAM — Service accounts and permissions for Cloud Run
# -----------------------------------------------------------------------------

# Dedicated service account for Cloud Run (instead of default App Engine SA)
resource "google_service_account" "cloudrun" {
  account_id   = "cveriskpilot-run-${var.environment}"
  display_name = "CVERiskPilot Cloud Run — ${var.environment}"
  project      = var.project_id
}

# Cloud SQL Client — connect via Unix socket
resource "google_project_iam_member" "cloudrun_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Secret Manager — read secrets injected as env vars
resource "google_secret_manager_secret_iam_member" "cloudrun_secrets" {
  for_each  = google_secret_manager_secret.app_secrets
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun.email}"
}

# GCS — read/write scan artifacts
resource "google_storage_bucket_iam_member" "cloudrun_gcs" {
  bucket = google_storage_bucket.artifacts.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Cloud Tasks — enqueue scan jobs
resource "google_project_iam_member" "cloudrun_tasks" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Cloud KMS — encrypt/decrypt tenant data
resource "google_kms_key_ring_iam_member" "cloudrun_kms" {
  key_ring_id = google_kms_key_ring.tenant_keys.id
  role        = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member      = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Cloud Logging — write structured logs
resource "google_project_iam_member" "cloudrun_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Cloud Monitoring — write metrics
resource "google_project_iam_member" "cloudrun_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "cloudrun_service_account" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloudrun.email
}
