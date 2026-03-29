# -----------------------------------------------------------------------------
# Pub/Sub — Async event pipelines
# -----------------------------------------------------------------------------

locals {
  pubsub_topics = {
    scan-pipeline        = "Scan processing events (parse, enrich, score)"
    enrichment-pipeline  = "CVE enrichment (NVD, EPSS, KEV lookups)"
    notification-events  = "Notification delivery (email, webhook, in-app)"
    connector-sync       = "Scanner connector API sync events (schedule tick + sync jobs)"
  }
}

# -----------------------------------------------------------------------------
# Topics
# -----------------------------------------------------------------------------

resource "google_pubsub_topic" "pipeline" {
  for_each = local.pubsub_topics

  name    = "cveriskpilot-${each.key}-${var.environment}"
  project = var.project_id

  message_retention_duration = "604800s" # 7 days

  labels = {
    environment = var.environment
    app         = "cveriskpilot"
    pipeline    = each.key
  }
}

# -----------------------------------------------------------------------------
# Dead-letter topics
# -----------------------------------------------------------------------------

resource "google_pubsub_topic" "dead_letter" {
  for_each = local.pubsub_topics

  name    = "cveriskpilot-${each.key}-dlq-${var.environment}"
  project = var.project_id

  message_retention_duration = "604800s" # 7 days

  labels = {
    environment = var.environment
    app         = "cveriskpilot"
    pipeline    = "${each.key}-dlq"
  }
}

# -----------------------------------------------------------------------------
# Push subscriptions — route to worker service endpoints
# -----------------------------------------------------------------------------

resource "google_pubsub_subscription" "pipeline" {
  for_each = local.pubsub_topics

  name    = "cveriskpilot-${each.key}-sub-${var.environment}"
  topic   = google_pubsub_topic.pipeline[each.key].id
  project = var.project_id

  ack_deadline_seconds       = 600 # 10 min for large scans
  message_retention_duration = "604800s" # 7 days

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.worker.uri}/jobs/process"

    oidc_token {
      service_account_email = google_service_account.cloudrun.email
      audience              = google_cloud_run_v2_service.worker.uri
    }

    attributes = {
      x-goog-version = "v1"
    }
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter[each.key].id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  expiration_policy {
    ttl = "" # never expires
  }

  labels = {
    environment = var.environment
    app         = "cveriskpilot"
    pipeline    = each.key
  }
}

# Dead-letter subscriptions (pull-based for manual inspection/replay)
resource "google_pubsub_subscription" "dead_letter" {
  for_each = local.pubsub_topics

  name    = "cveriskpilot-${each.key}-dlq-sub-${var.environment}"
  topic   = google_pubsub_topic.dead_letter[each.key].id
  project = var.project_id

  ack_deadline_seconds       = 60
  message_retention_duration = "604800s" # 7 days

  expiration_policy {
    ttl = "" # never expires
  }

  labels = {
    environment = var.environment
    app         = "cveriskpilot"
    pipeline    = "${each.key}-dlq"
  }
}

# -----------------------------------------------------------------------------
# IAM — Allow Pub/Sub to invoke the worker service
# -----------------------------------------------------------------------------

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker" {
  name     = google_cloud_run_v2_service.worker.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Allow Pub/Sub to publish to dead-letter topics
resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  for_each = local.pubsub_topics

  topic  = google_pubsub_topic.dead_letter[each.key].id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Allow Pub/Sub SA to ack messages on source subscriptions (required for DLQ)
resource "google_pubsub_subscription_iam_member" "dlq_subscriber" {
  for_each = local.pubsub_topics

  subscription = google_pubsub_subscription.pipeline[each.key].id
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Data source for project number (needed for Pub/Sub service account)
data "google_project" "current" {
  project_id = var.project_id
}

# Allow Cloud Run SA to publish to topics
resource "google_pubsub_topic_iam_member" "cloudrun_publisher" {
  for_each = local.pubsub_topics

  topic  = google_pubsub_topic.pipeline[each.key].id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.cloudrun.email}"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "pubsub_topics" {
  description = "Map of pipeline names to Pub/Sub topic IDs"
  value = {
    for k, v in google_pubsub_topic.pipeline : k => v.id
  }
}

output "pubsub_subscriptions" {
  description = "Map of pipeline names to Pub/Sub subscription IDs"
  value = {
    for k, v in google_pubsub_subscription.pipeline : k => v.id
  }
}

output "pubsub_dead_letter_topics" {
  description = "Map of pipeline names to dead-letter topic IDs"
  value = {
    for k, v in google_pubsub_topic.dead_letter : k => v.id
  }
}
