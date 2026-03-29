# -----------------------------------------------------------------------------
# PgBouncer — Connection pooling via Cloud Run (production only)
# -----------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "pgbouncer" {
  count = var.environment == "prod" || var.environment == "dev" ? 1 : 0

  name     = "cveriskpilot-pgbouncer-${var.environment}"
  location = var.region

  template {
    service_account = google_service_account.cloudrun.email

    scaling {
      min_instance_count = 1
      max_instance_count = 3
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
      image = "bitnami/pgbouncer:1"

      ports {
        container_port = 6432
      }

      resources {
        limits = {
          memory = "256Mi"
          cpu    = "1"
        }
      }

      startup_probe {
        tcp_socket {
          port = 6432
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 10
        timeout_seconds       = 3
      }

      liveness_probe {
        tcp_socket {
          port = 6432
        }
        period_seconds = 30
      }

      # PgBouncer configuration via environment variables
      env {
        name  = "PGBOUNCER_POOL_MODE"
        value = "transaction"
      }

      env {
        name  = "PGBOUNCER_MAX_CLIENT_CONN"
        value = "200"
      }

      env {
        name  = "PGBOUNCER_DEFAULT_POOL_SIZE"
        value = "25"
      }

      env {
        name  = "PGBOUNCER_MIN_POOL_SIZE"
        value = "5"
      }

      env {
        name  = "PGBOUNCER_RESERVE_POOL_SIZE"
        value = "5"
      }

      env {
        name  = "PGBOUNCER_RESERVE_POOL_TIMEOUT"
        value = "3"
      }

      env {
        name  = "PGBOUNCER_SERVER_IDLE_TIMEOUT"
        value = "600"
      }

      env {
        name  = "PGBOUNCER_SERVER_LIFETIME"
        value = "3600"
      }

      env {
        name  = "POSTGRESQL_HOST"
        value = google_sql_database_instance.main.private_ip_address
      }

      env {
        name  = "POSTGRESQL_PORT"
        value = "5432"
      }

      env {
        name  = "POSTGRESQL_DATABASE"
        value = "cveriskpilot"
      }

      env {
        name  = "POSTGRESQL_USERNAME"
        value = "cveriskpilot"
      }

      # Database password from Secret Manager
      env {
        name = "POSTGRESQL_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = "cveriskpilot-${var.environment}-db-password"
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  # Internal only — no public access
  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  depends_on = [
    google_sql_database_instance.main,
    google_service_networking_connection.private_vpc,
  ]
}

# DB password secret is defined in database.tf (google_secret_manager_secret.db_password_main).
# PgBouncer reuses that secret — IAM access is granted there as well.

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "pgbouncer_url" {
  description = "PgBouncer Cloud Run service URL (production only)"
  value       = (var.environment == "prod" || var.environment == "dev") ? google_cloud_run_v2_service.pgbouncer[0].uri : null
}
