# -----------------------------------------------------------------------------
# Cloud Tasks — Scan pipeline queue
# -----------------------------------------------------------------------------

resource "google_cloud_tasks_queue" "scan_pipeline" {
  name     = "cveriskpilot-scan-pipeline-${var.environment}"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 10
    max_concurrent_dispatches = 5
  }

  retry_config {
    max_attempts       = 3
    min_backoff        = "10s"
    max_backoff        = "300s"
    max_retry_duration = "0s" # unlimited
    max_doublings      = 4
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "scan_pipeline_queue_name" {
  description = "Cloud Tasks queue name for the scan pipeline"
  value       = google_cloud_tasks_queue.scan_pipeline.name
}
