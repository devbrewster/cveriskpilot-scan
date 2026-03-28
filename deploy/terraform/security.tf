# -----------------------------------------------------------------------------
# Cloud Armor — WAF security policy
# -----------------------------------------------------------------------------
# The comprehensive enterprise WAF policy is defined in cloud-armor.tf.
# This file previously held a duplicate basic policy that has been removed
# to avoid conflicts. All OWASP CRS, bot, and rate-limit rules live in
# cloud-armor.tf under the "waf_enterprise" resource.
# -----------------------------------------------------------------------------
