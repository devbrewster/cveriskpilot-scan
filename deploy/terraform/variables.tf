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
