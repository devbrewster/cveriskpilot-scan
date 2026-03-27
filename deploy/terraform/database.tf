# -----------------------------------------------------------------------------
# Cloud SQL — PostgreSQL 16
# -----------------------------------------------------------------------------

resource "google_sql_database_instance" "main" {
  name             = "cveriskpilot-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  deletion_protection = var.environment == "prod" ? true : false

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/${var.project_id}/global/networks/default"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "prod" ? true : false
      start_time                     = "03:00"
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 14
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4
      update_track = "stable"
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    user_labels = {
      environment = var.environment
      app         = "cveriskpilot"
    }
  }
}

resource "google_sql_database" "cveriskpilot" {
  name     = "cveriskpilot"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "cveriskpilot" {
  name     = "cveriskpilot"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "db_connection_name" {
  description = "Cloud SQL connection name for Cloud Run"
  value       = google_sql_database_instance.main.connection_name
}

output "db_private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.main.private_ip_address
}
