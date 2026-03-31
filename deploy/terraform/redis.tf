# -----------------------------------------------------------------------------
# Memorystore — Redis 7.x
# -----------------------------------------------------------------------------

resource "google_redis_instance" "main" {
  count = var.enable_redis ? 1 : 0

  name           = "cveriskpilot-${var.environment}"
  tier           = "BASIC"
  memory_size_gb = var.redis_memory_size_gb
  region         = var.region
  redis_version  = "REDIS_7_2"

  authorized_network = "projects/${var.project_id}/global/networks/default"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  labels = {
    environment = var.environment
    app         = "cveriskpilot"
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "redis_host" {
  description = "Memorystore Redis host IP"
  value       = var.enable_redis ? google_redis_instance.main[0].host : null
}

output "redis_port" {
  description = "Memorystore Redis port"
  value       = var.enable_redis ? google_redis_instance.main[0].port : null
}
