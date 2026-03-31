variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_password" {
  description = "Password for the Cloud SQL cveriskpilot user"
  type        = string
  sensitive   = true
}

variable "redis_memory_size_gb" {
  description = "Memorystore Redis instance memory in GB"
  type        = number
  default     = 1
}

variable "image_tag" {
  description = "Container image tag for Cloud Run services"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email for monitoring alerts"
  type        = string
  default     = ""
}

variable "app_url" {
  description = "Public-facing URL for the application (used for auth callbacks, Stripe redirects, etc.)"
  type        = string
  default     = ""
}

variable "blocked_countries" {
  description = "List of ISO 3166-1 alpha-2 country codes to block via Cloud Armor geo-blocking"
  type        = list(string)
  default     = []
}

variable "enable_read_replica" {
  description = "Enable Cloud SQL read replica (adds ~$50/mo). Disable to save costs at low traffic."
  type        = bool
  default     = false
}

variable "cloudrun_min_instances" {
  description = "Minimum always-on Cloud Run web instances. 2 for HA, 1 to save costs."
  type        = number
  default     = 2
}

variable "enable_redis" {
  description = "Enable Cloud Memorystore Redis (~$35/mo). Disable to use in-app caching."
  type        = bool
  default     = true
}

variable "vertex_project_id" {
  description = "GCP project ID for Vertex AI (Claude via Vertex). Defaults to the main project_id if not set."
  type        = string
  default     = ""
}

variable "vertex_region" {
  description = "GCP region for Vertex AI endpoint"
  type        = string
  default     = "us-central1"
}

variable "google_oidc_client_id" {
  description = "Google OAuth client ID for OIDC login"
  type        = string
  default     = ""
}

variable "smtp_host" {
  description = "SMTP server hostname for outbound email"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP server port"
  type        = string
  default     = "587"
}

variable "smtp_user" {
  description = "SMTP authentication username"
  type        = string
  default     = ""
}

variable "smtp_from" {
  description = "Default sender address for outbound email"
  type        = string
  default     = "noreply@cveriskpilot.com"
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "cveriskpilot"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "cveriskpilot"
}
