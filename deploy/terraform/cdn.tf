# -----------------------------------------------------------------------------
# Cloud CDN — Static Asset Bucket + CDN Policies
# -----------------------------------------------------------------------------
# GCS bucket for static assets (JS/CSS/images) served via Cloud CDN.
# CDN caching policy applied to the existing Cloud Run backend service
# for cacheable API responses.
# All resources are prod-only (same gating as load balancer usage).
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# 1. GCS Bucket for Static Assets
# -----------------------------------------------------------------------------

resource "google_storage_bucket" "static_assets" {
  count    = var.environment == "prod" ? 1 : 0
  name     = "${var.project_id}-static-assets-${var.environment}"
  project  = var.project_id
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = false
  }

  # CORS for loading assets from app.cveriskpilot.com
  cors {
    origin          = ["https://app.cveriskpilot.com"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Cache-Control", "ETag"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 90 # Clean up old asset versions after 90 days
    }
    action {
      type = "Delete"
    }
  }
}

# Public read access for static assets bucket
resource "google_storage_bucket_iam_member" "static_assets_public" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = google_storage_bucket.static_assets[0].name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# -----------------------------------------------------------------------------
# 2. Backend Bucket for Static Assets (CDN-enabled)
# -----------------------------------------------------------------------------

resource "google_compute_backend_bucket" "static_assets" {
  count       = var.environment == "prod" ? 1 : 0
  name        = "cveriskpilot-static-cdn-${var.environment}"
  project     = var.project_id
  bucket_name = google_storage_bucket.static_assets[0].name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = 3600   # 1 hour default for static assets
    max_ttl           = 86400  # 1 day max
    client_ttl        = 3600   # 1 hour client-side cache
    serve_while_stale = 86400  # Serve stale for up to 1 day while revalidating

    negative_caching = true
    negative_caching_policy {
      code = 404
      ttl  = 10
    }

    cache_key_policy {
      include_http_headers = []
    }
  }

  compression_mode = "AUTOMATIC"
}

# -----------------------------------------------------------------------------
# 3. CDN Policy on Cloud Run Backend Service (API responses)
# -----------------------------------------------------------------------------
# This updates the existing backend service to enable CDN for cacheable
# API responses. Next.js sets Cache-Control headers; Cloud CDN respects them.
# Routes like /api/health, /api/dashboard (public data) can be cached briefly.
# Auth-gated routes set Cache-Control: no-store and won't be cached.
# -----------------------------------------------------------------------------

resource "google_compute_backend_service" "web_cdn" {
  count                 = var.environment == "prod" ? 1 : 0
  name                  = "cveriskpilot-backend-cdn-${var.environment}"
  project               = var.project_id
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  timeout_sec           = 30

  backend {
    group = google_compute_region_network_endpoint_group.web.id
  }

  security_policy = google_compute_security_policy.waf_enterprise.id

  enable_cdn = true

  cdn_policy {
    cache_mode  = "USE_ORIGIN_HEADERS"
    default_ttl = 60     # 60s default for API responses
    max_ttl     = 300    # 5 min max (API data should be fresh)
    client_ttl  = 60     # 60s client-side

    negative_caching = true
    negative_caching_policy {
      code = 404
      ttl  = 10
    }

    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = true
    }
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# -----------------------------------------------------------------------------
# 4. URL Map — Route static assets to GCS, everything else to Cloud Run
# -----------------------------------------------------------------------------
# Overrides the default URL map in prod to split traffic:
#   /_next/static/* → GCS backend bucket (immutable hashed assets)
#   /images/*       → GCS backend bucket
#   /favicon.ico    → GCS backend bucket
#   /*              → Cloud Run backend service (with CDN)
# -----------------------------------------------------------------------------

resource "google_compute_url_map" "web_cdn" {
  count           = var.environment == "prod" ? 1 : 0
  name            = "cveriskpilot-urlmap-cdn-${var.environment}"
  project         = var.project_id
  default_service = google_compute_backend_service.web_cdn[0].id

  host_rule {
    hosts        = ["app.cveriskpilot.com"]
    path_matcher = "cdn-routes"
  }

  path_matcher {
    name            = "cdn-routes"
    default_service = google_compute_backend_service.web_cdn[0].id

    # Next.js hashed static assets (JS, CSS chunks)
    path_rule {
      paths   = ["/_next/static/*"]
      service = google_compute_backend_bucket.static_assets[0].id
    }

    # Public images
    path_rule {
      paths   = ["/images/*"]
      service = google_compute_backend_bucket.static_assets[0].id
    }

    # Favicon and common static files
    path_rule {
      paths   = ["/favicon.ico", "/robots.txt", "/sitemap.xml"]
      service = google_compute_backend_bucket.static_assets[0].id
    }
  }
}

# -----------------------------------------------------------------------------
# 5. Wire CDN URL Map into HTTPS Proxy (prod override)
# -----------------------------------------------------------------------------
# In prod, the HTTPS proxy uses the CDN-enabled URL map instead of the
# default one. The default URL map (loadbalancer.tf) is still used for
# non-prod environments.
# -----------------------------------------------------------------------------

resource "google_compute_target_https_proxy" "web_cdn" {
  count            = var.environment == "prod" ? 1 : 0
  name             = "cveriskpilot-https-cdn-${var.environment}"
  project          = var.project_id
  url_map          = google_compute_url_map.web_cdn[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.web.id]
}

# In prod, the HTTPS forwarding rule points to the CDN-enabled proxy
resource "google_compute_global_forwarding_rule" "https_cdn" {
  count                 = var.environment == "prod" ? 1 : 0
  name                  = "cveriskpilot-https-cdn-fwd-${var.environment}"
  project               = var.project_id
  target                = google_compute_target_https_proxy.web_cdn[0].id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# -----------------------------------------------------------------------------
# 6. Cloud Run Service Account — GCS read access for static bucket
# -----------------------------------------------------------------------------

resource "google_storage_bucket_iam_member" "cloudrun_static_assets" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = google_storage_bucket.static_assets[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloudrun.email}"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "cdn_static_bucket" {
  description = "GCS bucket for CDN-served static assets"
  value       = var.environment == "prod" ? google_storage_bucket.static_assets[0].name : null
}

output "cdn_enabled" {
  description = "Whether Cloud CDN is active"
  value       = var.environment == "prod"
}
