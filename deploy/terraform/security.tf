# -----------------------------------------------------------------------------
# Cloud Armor — WAF security policy
# -----------------------------------------------------------------------------

resource "google_compute_security_policy" "waf" {
  name        = "cveriskpilot-waf-${var.environment}"
  description = "WAF policy for CVERiskPilot — SQLi, XSS, and rate limiting"

  # Rule 1: Block SQL injection
  rule {
    action   = "deny(403)"
    priority = 1000

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }

    description = "Block SQL injection attempts"
  }

  # Rule 2: Block XSS
  rule {
    action   = "deny(403)"
    priority = 2000

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }

    description = "Block cross-site scripting attempts"
  }

  # Rule 3: Rate limiting — 100 requests per minute per IP
  rule {
    action   = "throttle"
    priority = 3000

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }

    description = "Rate limit: 100 requests per minute per IP"
  }

  # Default rule: allow all other traffic
  rule {
    action   = "allow"
    priority = 2147483647

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    description = "Default: allow all traffic"
  }
}
