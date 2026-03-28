# -----------------------------------------------------------------------------
# Global Load Balancer → Cloud Run (Serverless NEG)
# -----------------------------------------------------------------------------
# Cloudflare DNS → Static IP → HTTPS LB → Cloud Run
# -----------------------------------------------------------------------------

# Static external IP for the load balancer
resource "google_compute_global_address" "lb" {
  name    = "cveriskpilot-lb-${var.environment}"
  project = var.project_id
}

# Serverless NEG pointing to the Cloud Run web service
resource "google_compute_region_network_endpoint_group" "web" {
  name                  = "cveriskpilot-neg-${var.environment}"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.web.name
  }
}

# Backend service
resource "google_compute_backend_service" "web" {
  name                  = "cveriskpilot-backend-${var.environment}"
  project               = var.project_id
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  timeout_sec           = 30

  backend {
    group = google_compute_region_network_endpoint_group.web.id
  }

  # Attach Cloud Armor WAF policy
  security_policy = google_compute_security_policy.waf_enterprise.id

  log_config {
    enable    = true
    sample_rate = 1.0
  }
}

# URL map — route all traffic to the backend
resource "google_compute_url_map" "web" {
  name            = "cveriskpilot-urlmap-${var.environment}"
  project         = var.project_id
  default_service = google_compute_backend_service.web.id
}

# Managed SSL certificate for app.cveriskpilot.com
resource "google_compute_managed_ssl_certificate" "web" {
  name    = "cveriskpilot-ssl-${var.environment}"
  project = var.project_id

  managed {
    domains = ["app.cveriskpilot.com"]
  }
}

# HTTPS proxy (non-prod only; prod uses CDN-enabled proxy in cdn.tf)
resource "google_compute_target_https_proxy" "web" {
  count            = var.environment != "prod" ? 1 : 0
  name             = "cveriskpilot-https-${var.environment}"
  project          = var.project_id
  url_map          = google_compute_url_map.web.id
  ssl_certificates = [google_compute_managed_ssl_certificate.web.id]
}

# HTTP proxy (redirect to HTTPS)
resource "google_compute_target_http_proxy" "redirect" {
  name    = "cveriskpilot-http-redirect-${var.environment}"
  project = var.project_id
  url_map = google_compute_url_map.redirect.id
}

resource "google_compute_url_map" "redirect" {
  name    = "cveriskpilot-redirect-${var.environment}"
  project = var.project_id

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

# Forwarding rules — HTTPS (443) and HTTP (80 → redirect)
# In prod, the HTTPS forwarding rule is managed by cdn.tf (CDN-enabled proxy)
resource "google_compute_global_forwarding_rule" "https" {
  count                 = var.environment != "prod" ? 1 : 0
  name                  = "cveriskpilot-https-fwd-${var.environment}"
  project               = var.project_id
  target                = google_compute_target_https_proxy.web[0].id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "cveriskpilot-http-fwd-${var.environment}"
  project               = var.project_id
  target                = google_compute_target_http_proxy.redirect.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "lb_ip_address" {
  description = "Load balancer static IP — point Cloudflare DNS here"
  value       = google_compute_global_address.lb.address
}

output "lb_ssl_status" {
  description = "Managed SSL certificate status"
  value       = google_compute_managed_ssl_certificate.web.managed[0]
}
