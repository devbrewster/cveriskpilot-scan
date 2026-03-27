# -----------------------------------------------------------------------------
# VPC & Networking — Private connectivity for Cloud SQL and Redis
# -----------------------------------------------------------------------------

# Use the default VPC (or create a custom one for prod)
data "google_compute_network" "default" {
  name    = "default"
  project = var.project_id
}

# Private services access — required for Cloud SQL private IP
resource "google_compute_global_address" "private_ip_range" {
  name          = "cveriskpilot-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = data.google_compute_network.default.id
  project       = var.project_id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = data.google_compute_network.default.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# VPC connector for Cloud Run → private resources (Cloud SQL, Redis)
resource "google_vpc_access_connector" "cloudrun" {
  name          = "crp-vpc-${var.environment}"
  project       = var.project_id
  region        = var.region
  network       = data.google_compute_network.default.name
  ip_cidr_range = "10.8.0.0/28"

  min_instances = 2
  max_instances = 3

  machine_type = "e2-micro"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vpc_connector_id" {
  description = "VPC access connector for Cloud Run"
  value       = google_vpc_access_connector.cloudrun.id
}
