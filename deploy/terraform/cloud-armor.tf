# -----------------------------------------------------------------------------
# Cloud Armor — Full OWASP CRS + bot protection + rate limiting
# Replaces the basic WAF policy with comprehensive enterprise rules
# -----------------------------------------------------------------------------

resource "google_compute_security_policy" "waf_enterprise" {
  name        = "cveriskpilot-waf-enterprise-${var.environment}"
  description = "Enterprise WAF policy — full OWASP CRS, bot protection, rate limiting, adaptive protection"

  # ---------------------------------------------------------------------------
  # Adaptive Protection (ML-based anomaly detection)
  # ---------------------------------------------------------------------------
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }

  # ---------------------------------------------------------------------------
  # OWASP ModSecurity CRS Rules
  # ---------------------------------------------------------------------------

  # Rule 1000: SQL Injection (SQLi)
  rule {
    action   = "deny(403)"
    priority = 1000

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }

    description = "OWASP CRS: Block SQL injection attempts"
  }

  # Rule 1100: Cross-Site Scripting (XSS)
  rule {
    action   = "deny(403)"
    priority = 1100

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }

    description = "OWASP CRS: Block cross-site scripting attempts"
  }

  # Rule 1200: Local File Inclusion (LFI)
  rule {
    action   = "deny(403)"
    priority = 1200

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('lfi-v33-stable')"
      }
    }

    description = "OWASP CRS: Block local file inclusion attempts"
  }

  # Rule 1300: Remote File Inclusion (RFI)
  rule {
    action   = "deny(403)"
    priority = 1300

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('rfi-v33-stable')"
      }
    }

    description = "OWASP CRS: Block remote file inclusion attempts"
  }

  # Rule 1400: Remote Code Execution (RCE)
  rule {
    action   = "deny(403)"
    priority = 1400

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('rce-v33-stable')"
      }
    }

    description = "OWASP CRS: Block remote code execution attempts"
  }

  # Rule 1500: Method Enforcement
  rule {
    action   = "deny(403)"
    priority = 1500

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('methodenforcement-v33-stable')"
      }
    }

    description = "OWASP CRS: Method enforcement"
  }

  # Rule 1600: Scanner Detection
  rule {
    action   = "deny(403)"
    priority = 1600

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('scannerdetection-v33-stable')"
      }
    }

    description = "OWASP CRS: Block known vulnerability scanners"
  }

  # Rule 1700: Protocol Attack
  rule {
    action   = "deny(403)"
    priority = 1700

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('protocolattack-v33-stable')"
      }
    }

    description = "OWASP CRS: Block protocol attacks"
  }

  # Rule 1800: PHP Injection
  rule {
    action   = "deny(403)"
    priority = 1800

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('php-v33-stable')"
      }
    }

    description = "OWASP CRS: Block PHP injection attempts"
  }

  # Rule 1900: Session Fixation
  rule {
    action   = "deny(403)"
    priority = 1900

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sessionfixation-v33-stable')"
      }
    }

    description = "OWASP CRS: Block session fixation attempts"
  }

  # Rule 2000: Java Attack
  rule {
    action   = "deny(403)"
    priority = 2000

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('java-v33-stable')"
      }
    }

    description = "OWASP CRS: Block Java/Spring attack patterns"
  }

  # Rule 2100: NodeJS Attack
  rule {
    action   = "deny(403)"
    priority = 2100

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('nodejs-v33-stable')"
      }
    }

    description = "OWASP CRS: Block NodeJS attack patterns"
  }

  # ---------------------------------------------------------------------------
  # Bot Protection Rules
  # ---------------------------------------------------------------------------

  # Rule 3000: Block known bad bots and crawlers
  rule {
    action   = "deny(403)"
    priority = 3000

    match {
      expr {
        expression = "evaluatePreconfiguredExpr('cve-canary')"
      }
    }

    description = "Bot protection: Block CVE exploit canaries"
  }

  # Rule 3100: Block requests with no User-Agent (likely bots/scripts)
  rule {
    action   = "deny(403)"
    priority = 3100

    match {
      expr {
        expression = "!has(request.headers['user-agent']) || request.headers['user-agent'] == ''"
      }
    }

    description = "Bot protection: Block requests without User-Agent header"
  }

  # ---------------------------------------------------------------------------
  # Rate Limiting Rules
  # ---------------------------------------------------------------------------

  # Rule 4000: Global rate limit — 200 requests per minute per IP
  rule {
    action   = "throttle"
    priority = 4000

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
        count        = 200
        interval_sec = 60
      }
    }

    description = "Rate limit: 200 requests per minute per IP"
  }

  # Rule 4100: Auth endpoint rate limit — 20 requests per minute per IP
  rule {
    action   = "throttle"
    priority = 4100

    match {
      expr {
        expression = "request.path.matches('/api/auth/.*')"
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      rate_limit_threshold {
        count        = 20
        interval_sec = 60
      }
    }

    description = "Rate limit: 20 auth requests per minute per IP"
  }

  # Rule 4200: API key creation rate limit — 10 per minute per IP
  rule {
    action   = "throttle"
    priority = 4200

    match {
      expr {
        expression = "request.path.matches('/api/keys') && request.method == 'POST'"
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      rate_limit_threshold {
        count        = 10
        interval_sec = 60
      }
    }

    description = "Rate limit: 10 API key creations per minute per IP"
  }

  # Rule 4300: SCIM endpoint rate limit — 100 per minute per IP
  rule {
    action   = "throttle"
    priority = 4300

    match {
      expr {
        expression = "request.path.matches('/api/scim/.*')"
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

    description = "Rate limit: 100 SCIM requests per minute per IP"
  }

  # ---------------------------------------------------------------------------
  # Geo-based Rules (optional — configurable via variable)
  # ---------------------------------------------------------------------------

  dynamic "rule" {
    for_each = length(var.blocked_countries) > 0 ? [1] : []

    content {
      action   = "deny(403)"
      priority = 5000

      match {
        expr {
          expression = "origin.region_code.matches('${join("|", var.blocked_countries)}')"
        }
      }

      description = "Geo-blocking: Deny traffic from blocked countries"
    }
  }

  # ---------------------------------------------------------------------------
  # Default Rule: Allow all other traffic
  # ---------------------------------------------------------------------------

  rule {
    action   = "allow"
    priority = 2147483647

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    description = "Default: allow all other traffic"
  }
}
