# -----------------------------------------------------------------------------
# Cloud Scheduler — Connector Sync Tick
# -----------------------------------------------------------------------------
# Fires every 5 minutes into the connector-sync Pub/Sub topic.
# The worker service performs fan-out: queries all active API connectors
# whose sync interval has elapsed and enqueues individual SYNC_CONNECTOR
# Cloud Tasks for each.
# -----------------------------------------------------------------------------

resource "google_cloud_scheduler_job" "connector_sync_tick" {
  name        = "cveriskpilot-connector-sync-tick-${var.environment}"
  description = "Triggers connector sync fan-out every 5 minutes"
  project     = var.project_id
  region      = var.region

  schedule  = "*/5 * * * *"
  time_zone = "UTC"

  pubsub_target {
    topic_name = google_pubsub_topic.pipeline["connector-sync"].id

    data = base64encode(jsonencode({
      type      = "TICK"
      timestamp = "$${now()}"
    }))

    attributes = {
      source = "cloud-scheduler"
    }
  }

  retry_config {
    retry_count          = 1
    max_backoff_duration = "30s"
    min_backoff_duration = "10s"
  }

  depends_on = [
    google_pubsub_topic.pipeline,
  ]
}

# -----------------------------------------------------------------------------
# IAM — Allow Cloud Scheduler SA to publish to the connector-sync topic
# -----------------------------------------------------------------------------

resource "google_pubsub_topic_iam_member" "scheduler_publisher" {
  topic  = google_pubsub_topic.pipeline["connector-sync"].id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.cloudrun.email}"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "scheduler_connector_sync_tick" {
  description = "Cloud Scheduler job ID for connector sync tick"
  value       = google_cloud_scheduler_job.connector_sync_tick.id
}
