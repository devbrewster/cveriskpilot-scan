# -----------------------------------------------------------------------------
# Cloud Run — Web (Next.js)
# -----------------------------------------------------------------------------

locals {
  image = var.image_tag != "" ? var.image_tag : "gcr.io/${var.project_id}/cveriskpilot-web:latest"

  # Map secret short names to the env var they populate
  secret_env_vars = {
    DATABASE_URL              = "cveriskpilot-${var.environment}-database-url"
    REDIS_URL                 = "cveriskpilot-${var.environment}-redis-url"
    AUTH_SECRET               = "cveriskpilot-${var.environment}-auth-secret"
    GOOGLE_OIDC_CLIENT_SECRET = "cveriskpilot-${var.environment}-google-oidc-client-secret"
    ANTHROPIC_API_KEY         = "cveriskpilot-${var.environment}-anthropic-api-key"
    STRIPE_SECRET_KEY         = "cveriskpilot-${var.environment}-stripe-secret-key"
    STRIPE_WEBHOOK_SECRET     = "cveriskpilot-${var.environment}-stripe-webhook-secret"
    NVD_API_KEY               = "cveriskpilot-${var.environment}-nvd-api-key"
  }
}

resource "google_cloud_run_v2_service" "web" {
  name     = "cveriskpilot-web-${var.environment}"
  location = var.region

  template {
    service_account = google_service_account.cloudrun.email

    scaling {
      min_instance_count = var.environment == "prod" ? 2 : 1
      max_instance_count = 10
    }

    max_instance_request_concurrency = 80

    vpc_access {
      connector = google_vpc_access_connector.cloudrun.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    containers {
      image = local.image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          memory = "1Gi"
          cpu    = "2"
        }
      }

      startup_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 12
        timeout_seconds       = 5
      }

      liveness_probe {
        http_get {
          path = "/api/health"
        }
        period_seconds = 30
      }

      # Plain environment variables
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "GCS_BUCKET_ARTIFACTS"
        value = google_storage_bucket.artifacts.name
      }

      env {
        name  = "GCS_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = var.app_url
      }

      env {
        name  = "APP_BASE_URL"
        value = var.app_url
      }

      env {
        name  = "WORKER_URL"
        value = "https://cveriskpilot-worker-${var.environment}-${var.region}.run.app"
      }

      env {
        name  = "CLOUD_TASKS_LOCATION"
        value = var.region
      }

      env {
        name  = "CLOUD_TASKS_QUEUE"
        value = google_cloud_tasks_queue.scan_pipeline.name
      }

      # Secret-backed environment variables
      dynamic "env" {
        for_each = local.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  # Allow traffic from the load balancer and internal sources
  # Use ALL for dev (no load balancer); switch to INTERNAL_LOAD_BALANCER for production
  ingress = var.environment == "prod" ? "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER" : "INGRESS_TRAFFIC_ALL"

  depends_on = [
    google_secret_manager_secret.app_secrets,
    google_service_networking_connection.private_vpc,
  ]
}

# -----------------------------------------------------------------------------
# Cloud Run — Worker (async job processor)
# -----------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "worker" {
  name     = "cveriskpilot-worker-${var.environment}"
  location = var.region

  template {
    service_account = google_service_account.cloudrun.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    vpc_access {
      connector = google_vpc_access_connector.cloudrun.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    containers {
      image = local.image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          memory = "1Gi"
          cpu    = "1"
        }
      }

      startup_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 12
        timeout_seconds       = 5
      }

      liveness_probe {
        http_get {
          path = "/api/health"
        }
        period_seconds = 30
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "SERVICE_ROLE"
        value = "worker"
      }

      env {
        name  = "GCS_BUCKET_ARTIFACTS"
        value = google_storage_bucket.artifacts.name
      }

      env {
        name  = "GCS_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "CLOUD_TASKS_LOCATION"
        value = var.region
      }

      env {
        name  = "CLOUD_TASKS_QUEUE"
        value = google_cloud_tasks_queue.scan_pipeline.name
      }

      dynamic "env" {
        for_each = local.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  depends_on = [
    google_secret_manager_secret.app_secrets,
    google_service_networking_connection.private_vpc,
  ]
}
