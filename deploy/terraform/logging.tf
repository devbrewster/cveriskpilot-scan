# =============================================================================
# Cloud Logging metrics + Monitoring alert policies for CVERiskPilot
# Task t50: Cloud Logging and basic alerts
# =============================================================================

# ---------------------------------------------------------------------------
# Notification channel (email)
# ---------------------------------------------------------------------------

resource "google_monitoring_notification_channel" "email" {
  count        = var.alert_email != "" ? 1 : 0
  display_name = "CVERiskPilot Alert Email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }

  project = var.project_id
}

# ---------------------------------------------------------------------------
# Log-based metric: error count (severity >= ERROR)
# ---------------------------------------------------------------------------

resource "google_logging_metric" "cloud_run_error_count" {
  name    = "cloud-run-error-count"
  project = var.project_id
  filter  = "resource.type=\"cloud_run_revision\" AND severity>=ERROR"

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Cloud Run Error Count"
  }
}

# ---------------------------------------------------------------------------
# Log-based metric: total request count (from structured app logs)
# ---------------------------------------------------------------------------

resource "google_logging_metric" "cloud_run_request_count" {
  name    = "cloud-run-request-count"
  project = var.project_id
  filter  = "resource.type=\"cloud_run_revision\" AND jsonPayload.context=\"http\""

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Cloud Run Request Count"
  }
}

# ---------------------------------------------------------------------------
# Log-based metric: API latency distribution (from structured log field)
# ---------------------------------------------------------------------------

resource "google_logging_metric" "cloud_run_api_latency" {
  name    = "cloud-run-api-latency"
  project = var.project_id
  filter  = "resource.type=\"cloud_run_revision\" AND jsonPayload.context=\"http\" AND jsonPayload.duration_ms>0"

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "DISTRIBUTION"
    unit         = "ms"
    display_name = "Cloud Run API Latency"
  }

  value_extractor = "EXTRACT(jsonPayload.duration_ms)"

  bucket_options {
    exponential_buckets {
      num_finite_buckets = 20
      growth_factor      = 2.0
      scale              = 10.0 # buckets: 10, 20, 40, 80 ... up to ~10M ms
    }
  }
}

# ---------------------------------------------------------------------------
# Log-based metric: high latency requests (> 5s, for simple counter alerts)
# ---------------------------------------------------------------------------

resource "google_logging_metric" "cloud_run_high_latency" {
  name    = "cloud-run-high-latency"
  project = var.project_id
  filter  = "resource.type=\"cloud_run_revision\" AND jsonPayload.context=\"http\" AND jsonPayload.duration_ms>5000"

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Cloud Run High Latency (>5s)"
  }
}

# ---------------------------------------------------------------------------
# Alert policy: error rate > 1% over 5 minutes
# Uses MQL to compute the ratio of errors to total requests.
# ---------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "error_rate" {
  display_name = "CVERiskPilot - Error Rate > 1%"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Error rate exceeds 1% over 5 minutes"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.cloud_run_error_count.name}\" AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.alert_email != "" ? [google_monitoring_notification_channel.email[0].id] : []

  documentation {
    content   = "Error rate exceeded threshold. Check Cloud Run logs: https://console.cloud.google.com/run?project=${var.project_id}"
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

# ---------------------------------------------------------------------------
# Alert policy: API p95 latency > 5 seconds over 5 minutes
# ---------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "CVERiskPilot - P95 Latency > 5s"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "P95 latency exceeds 5s over 5 minutes"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.cloud_run_api_latency.name}\" AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 5000 # 5000 ms
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = var.alert_email != "" ? [google_monitoring_notification_channel.email[0].id] : []

  documentation {
    content   = "P95 API latency exceeded 5 seconds. Check Cloud Run logs: https://console.cloud.google.com/run?project=${var.project_id}"
    mime_type = "text/markdown"
  }

  alert_strategy {
    auto_close = "1800s"
  }
}

# ---------------------------------------------------------------------------
# Log sink: long-term retention bucket (90-day retention)
# ---------------------------------------------------------------------------

resource "google_logging_project_bucket_config" "long_term" {
  project        = var.project_id
  location       = "global"
  bucket_id      = "cveriskpilot-long-term"
  retention_days = 90
  description    = "Long-term log retention for CVERiskPilot audit and debugging"
}

resource "google_logging_project_sink" "long_term" {
  name        = "cveriskpilot-long-term-sink"
  project     = var.project_id
  destination = "logging.googleapis.com/projects/${var.project_id}/locations/global/buckets/${google_logging_project_bucket_config.long_term.bucket_id}"

  filter = "resource.type=\"cloud_run_revision\""

  description = "Route Cloud Run logs to long-term retention bucket"

  unique_writer_identity = true
}
