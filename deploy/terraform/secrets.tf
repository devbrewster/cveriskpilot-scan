# -----------------------------------------------------------------------------
# Secret Manager — Application secrets
# -----------------------------------------------------------------------------

locals {
  secrets = [
    "database-url",
    "redis-url",
    "auth-secret",
    "google-oidc-client-secret",
    "anthropic-api-key",
    "stripe-secret-key",
    "stripe-webhook-secret",
    "nvd-api-key",
    "master-encryption-key",
    "smtp-pass",
    "cron-secret",
    "workos-api-key",
    "workos-client-id",
  ]
}

resource "google_secret_manager_secret" "app_secrets" {
  for_each  = toset(local.secrets)
  secret_id = "cveriskpilot-${var.environment}-${each.key}"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    app         = "cveriskpilot"
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "secret_ids" {
  description = "Map of secret short names to their full resource IDs"
  value = {
    for k, v in google_secret_manager_secret.app_secrets : k => v.id
  }
}
