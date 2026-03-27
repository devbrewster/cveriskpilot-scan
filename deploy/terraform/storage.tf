# -----------------------------------------------------------------------------
# GCS — Scan artifacts bucket
# -----------------------------------------------------------------------------

resource "google_storage_bucket" "artifacts" {
  name          = "${var.project_id}-artifacts-${var.environment}"
  location      = var.region
  force_destroy = var.environment != "prod"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    environment = var.environment
    app         = "cveriskpilot"
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "artifacts_bucket_name" {
  description = "GCS bucket name for scan artifacts"
  value       = google_storage_bucket.artifacts.name
}

output "artifacts_bucket_url" {
  description = "GCS bucket URL for scan artifacts"
  value       = google_storage_bucket.artifacts.url
}
