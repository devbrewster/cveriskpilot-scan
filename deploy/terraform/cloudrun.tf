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
    scaling {
      min_instance_count = 0
      max_instance_count = 10
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
          memory = "512Mi"
          cpu    = "1"
        }
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

  depends_on = [google_secret_manager_secret.app_secrets]
}

# Allow unauthenticated access (public web app)
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  name     = google_cloud_run_v2_service.web.name
  location = google_cloud_run_v2_service.web.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# -----------------------------------------------------------------------------
# Cloud Run — Worker (async job processor)
# -----------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "worker" {
  name     = "cveriskpilot-worker-${var.environment}"
  location = var.region

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    containers {
      image   = local.image
      command = ["node"]
      args    = ["dist/worker.js"]

      resources {
        limits = {
          memory = "1Gi"
          cpu    = "1"
        }
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

  depends_on = [google_secret_manager_secret.app_secrets]
}
