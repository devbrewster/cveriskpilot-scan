# -----------------------------------------------------------------------------
# Cloud KMS — Per-tenant encryption key management (BYOK support)
# -----------------------------------------------------------------------------

# KMS keyring — one per environment
resource "google_kms_key_ring" "tenant_keys" {
  name     = "cveriskpilot-tenant-keys-${var.environment}"
  location = var.region
  project  = var.project_id
}

# Default encryption key for tenants without BYOK
resource "google_kms_crypto_key" "default_tenant_key" {
  name     = "default-tenant-key"
  key_ring = google_kms_key_ring.tenant_keys.id

  purpose = "ENCRYPT_DECRYPT"

  # 90-day rotation period
  rotation_period = "7776000s"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = var.environment == "prod" ? "HSM" : "SOFTWARE"
  }

  lifecycle {
    prevent_destroy = true
  }

  labels = {
    environment = var.environment
    service     = "cveriskpilot"
    purpose     = "tenant-encryption"
  }
}

# IAM binding moved to iam.tf — uses dedicated Cloud Run service account

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "kms_keyring_id" {
  description = "KMS keyring ID for tenant encryption keys"
  value       = google_kms_key_ring.tenant_keys.id
}

output "kms_default_key_id" {
  description = "Default KMS crypto key ID for tenant encryption"
  value       = google_kms_crypto_key.default_tenant_key.id
}

output "kms_default_key_name" {
  description = "Full resource name of the default KMS crypto key"
  value       = google_kms_crypto_key.default_tenant_key.id
}
