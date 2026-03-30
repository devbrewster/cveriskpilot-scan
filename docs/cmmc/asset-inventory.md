# CVERiskPilot Asset Inventory

| Field            | Value                                    |
|------------------|------------------------------------------|
| **Document**     | CVERiskPilot Asset Inventory             |
| **Version**      | 1.0                                      |
| **Date**         | 2026-03-30                               |
| **Classification** | CUI-Basic / FOUO                       |
| **Author**       | George Ontiveros, System Owner           |

---

## Purpose

This document provides a comprehensive inventory of all assets within the CVERiskPilot system boundary for CMMC Level 1 self-assessment. All assets are deployed on Google Cloud Platform (GCP) in the `us-central1` region unless otherwise noted.

---

## 1. COMPUTE

Cloud Run containerized services providing application compute.

| Asset ID  | Asset Name                             | Type         | Description                                                                                              | Owner          | Data Classification |
|-----------|----------------------------------------|--------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| CMP-001   | cveriskpilot-web-prod                  | Cloud Run    | Next.js web application (port 3000). 2-10 instances, 80 req concurrency, 2 vCPU / 1 GiB RAM per instance. Ingress restricted to internal load balancer in prod. Health check at `/api/health`. | G. Ontiveros   | CUI                 |
| CMP-002   | cveriskpilot-worker-prod               | Cloud Run    | Async job processor (port 8080). 0-5 instances, 1 vCPU / 1 GiB RAM. Processes scan pipeline, enrichment, and notification tasks via Pub/Sub push subscriptions. | G. Ontiveros   | CUI                 |
| CMP-003   | cveriskpilot-pgbouncer-prod            | Cloud Run    | PgBouncer connection pooler (port 6432, bitnami/pgbouncer:1). 1-3 instances, 1 vCPU / 256 MiB RAM. Transaction pooling mode, 200 max client connections, 25 default pool size. Internal-only ingress. | G. Ontiveros   | Internal            |

---

## 2. DATABASE

Managed database and cache services storing application data.

| Asset ID  | Asset Name                             | Type              | Description                                                                                              | Owner          | Data Classification |
|-----------|----------------------------------------|-------------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| DB-001    | cveriskpilot-prod                      | Cloud SQL         | PostgreSQL 16 Enterprise edition. Regional HA (prod), private IP only, disk autoresize. Automated backups at 03:00 UTC with PITR, 14 backup retention, 7-day transaction log retention. Maintenance: Sundays 04:00 UTC (stable track). Database flags: log_checkpoints, log_connections enabled. | G. Ontiveros   | CUI                 |
| DB-002    | cveriskpilot-prod-replica              | Cloud SQL         | PostgreSQL 16 Enterprise read replica. Zonal availability, private IP only, disk autoresize. Non-failover replica for read scaling. Deletion protection enabled. | G. Ontiveros   | CUI                 |
| DB-003    | cveriskpilot-prod (Redis)              | Memorystore       | Redis 7.2, BASIC tier, 1 GB memory. Eviction policy: allkeys-lru. Connected via authorized VPC network. Used for session cache, rate limiting, and feature flags. | G. Ontiveros   | Sensitive           |

---

## 3. STORAGE

Google Cloud Storage buckets for artifacts and static assets.

| Asset ID  | Asset Name                                       | Type   | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| STR-001   | {project_id}-artifacts-prod                      | GCS    | Scan artifacts bucket. Private access only (public access prevention enforced), uniform bucket-level access, versioning enabled. Lifecycle: transition to Nearline at 90 days, delete at 365 days. | G. Ontiveros   | CUI                 |
| STR-002   | {project_id}-static-assets-prod                  | GCS    | Static assets bucket (JS/CSS/images) served via Cloud CDN. Public read access for asset delivery. CORS configured for app.cveriskpilot.com. Lifecycle: delete after 90 days. No versioning. | G. Ontiveros   | Public              |

---

## 4. SECURITY

Encryption, secrets management, and web application firewall services.

| Asset ID  | Asset Name                                       | Type            | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|-----------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| SEC-001   | cveriskpilot-tenant-keys-prod                    | Cloud KMS       | KMS keyring for per-tenant encryption (BYOK support). Contains default-tenant-key (AES symmetric, SOFTWARE protection, 90-day / 7,776,000s rotation period). Prevent-destroy lifecycle. | G. Ontiveros   | CUI                 |
| SEC-002   | cveriskpilot-prod-* (13 secrets)                 | Secret Manager  | 13 application secrets with automatic replication: database-url, redis-url, auth-secret, google-oidc-client-secret, anthropic-api-key, stripe-secret-key, stripe-webhook-secret, nvd-api-key, master-encryption-key, smtp-pass, cron-secret, workos-api-key, workos-client-id. Additionally: db-password (defined in database.tf). | G. Ontiveros   | CUI                 |
| SEC-003   | cveriskpilot-waf-enterprise-prod                 | Cloud Armor     | Enterprise WAF policy with adaptive protection (L7 DDoS ML detection). 11 OWASP CRS v3.3 rules (SQLi, XSS, LFI, RFI, RCE, method enforcement, scanner detection, protocol attack, PHP injection, session fixation, Java/NodeJS attacks). Bot protection (CVE canary block, empty User-Agent block). Rate limiting: 200/min global, 20/min auth, 10/min API key creation, 100/min SCIM. Optional geo-blocking. | G. Ontiveros   | Internal            |

---

## 5. NETWORKING

Load balancing, VPC connectivity, CDN, and SSL certificate resources.

| Asset ID  | Asset Name                                       | Type                 | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|----------------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| NET-001   | cveriskpilot-lb-prod                             | Global HTTPS LB      | Global external Application Load Balancer with static IP address. HTTPS (443) with managed SSL; HTTP (80) redirects to HTTPS (301). Backend: serverless NEG (cveriskpilot-neg-prod) pointing to Cloud Run web service. Cloud Armor WAF attached. Full request logging enabled. | G. Ontiveros   | Internal            |
| NET-002   | crp-vpc-prod                                     | VPC Connector        | Serverless VPC Access Connector (10.8.0.0/28). 2-3 e2-micro instances. Enables Cloud Run private access to Cloud SQL and Redis. Egress: PRIVATE_RANGES_ONLY. | G. Ontiveros   | Internal            |
| NET-003   | cveriskpilot-static-cdn-prod                     | Cloud CDN            | CDN-enabled backend bucket for static assets. Cache mode: CACHE_ALL_STATIC (1h default TTL, 24h max, 24h stale-while-revalidate). Automatic compression. CDN-enabled backend service for API responses using USE_ORIGIN_HEADERS (60s default, 5min max). | G. Ontiveros   | Public              |
| NET-004   | cveriskpilot-ssl-prod                            | Managed SSL Cert     | Google-managed SSL certificate for app.cveriskpilot.com. Auto-renewal. | G. Ontiveros   | Internal            |
| NET-005   | cveriskpilot-private-ip-prod                     | VPC Peering          | Private services access for Cloud SQL. /20 internal address range peered with default VPC via servicenetworking.googleapis.com. | G. Ontiveros   | Internal            |

---

## 6. CI/CD

Continuous integration and deployment pipeline resources.

| Asset ID  | Asset Name                                       | Type          | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|---------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| CICD-001  | cveriskpilot-ci-prod                             | Cloud Build   | CI validation trigger. Fires on push to all branches and PRs. Runs type-check, lint, and test. Config: deploy/cloudbuild.yaml. Source: GitHub (cveriskpilot/cveriskpilot). | G. Ontiveros   | Internal            |
| CICD-002  | cveriskpilot-deploy-prod                         | Cloud Build   | Deploy trigger. Fires on push to `main` branch only. Builds container image and deploys to Cloud Run. Config: deploy/cloudbuild-deploy.yaml. Substitutions: _ENV=production, _REGION=us-central1. | G. Ontiveros   | Internal            |

---

## 7. MESSAGING

Asynchronous messaging and task queue infrastructure.

| Asset ID  | Asset Name                                       | Type             | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|------------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| MSG-001   | cveriskpilot-scan-pipeline-prod                  | Cloud Tasks      | Scan processing queue. Rate limit: 10 dispatches/sec, 5 concurrent. Retry: 3 attempts, 10s-300s backoff, 4 doublings. | G. Ontiveros   | CUI                 |
| MSG-002   | cveriskpilot-scan-pipeline-prod                  | Pub/Sub Topic    | Scan processing events (parse, enrich, score). 7-day message retention. Push subscription to worker /jobs/process endpoint with OIDC auth. DLQ: 5 max delivery attempts, 10s-600s retry backoff. | G. Ontiveros   | CUI                 |
| MSG-003   | cveriskpilot-enrichment-pipeline-prod            | Pub/Sub Topic    | CVE enrichment events (NVD, EPSS, KEV lookups). 7-day message retention. Push subscription with OIDC auth. Dead-letter topic with pull subscription for inspection/replay. | G. Ontiveros   | CUI                 |
| MSG-004   | cveriskpilot-notification-events-prod            | Pub/Sub Topic    | Notification delivery events (email, webhook, in-app). 7-day message retention. Push subscription with OIDC auth. Dead-letter topic with pull subscription. | G. Ontiveros   | Sensitive           |
| MSG-005   | cveriskpilot-connector-sync-prod                 | Pub/Sub Topic    | Scanner connector API sync events. 7-day message retention. Push subscription with OIDC auth. Dead-letter topic with pull subscription. | G. Ontiveros   | Internal            |
| MSG-006   | cveriskpilot-*-dlq-prod (4 topics)               | Pub/Sub DLQ      | Dead-letter topics for all 4 pipelines (scan-pipeline, enrichment-pipeline, notification-events, connector-sync). Pull-based subscriptions for manual inspection and replay. 7-day retention each. | G. Ontiveros   | CUI                 |
| MSG-007   | cveriskpilot-connector-sync-tick-prod            | Cloud Scheduler  | Triggers connector sync fan-out every 5 minutes (cron: */5 * * * *, UTC). Publishes TICK message to connector-sync Pub/Sub topic. 1 retry, 10-30s backoff. | G. Ontiveros   | Internal            |

---

## 8. MONITORING

Logging, metrics, and alerting infrastructure.

| Asset ID  | Asset Name                                       | Type               | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|--------------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| MON-001   | cveriskpilot-long-term                           | Cloud Logging      | Long-term log retention bucket (90-day retention). Receives all Cloud Run revision logs via dedicated log sink (cveriskpilot-long-term-sink). Global location. | G. Ontiveros   | CUI                 |
| MON-002   | CVERiskPilot - Error Rate > 1%                   | Cloud Monitoring   | Alert policy: fires when Cloud Run error count exceeds 10 errors (rate-aligned) over 5 minutes. 30-minute auto-close. Email notification channel. | G. Ontiveros   | Internal            |
| MON-003   | CVERiskPilot - P95 Latency > 5s                  | Cloud Monitoring   | Alert policy: fires when P95 API latency exceeds 5,000ms over 5 minutes. 30-minute auto-close. Email notification channel. | G. Ontiveros   | Internal            |
| MON-004   | cloud-run-error-count                            | Log-based Metric   | Delta counter of Cloud Run log entries with severity >= ERROR. | G. Ontiveros   | Internal            |
| MON-005   | cloud-run-request-count                          | Log-based Metric   | Delta counter of HTTP requests (jsonPayload.context="http"). | G. Ontiveros   | Internal            |
| MON-006   | cloud-run-api-latency                            | Log-based Metric   | Distribution metric of API latency (ms). Exponential buckets: 20 buckets, 2x growth, 10ms scale. | G. Ontiveros   | Internal            |
| MON-007   | cloud-run-high-latency                           | Log-based Metric   | Delta counter of requests exceeding 5,000ms latency. | G. Ontiveros   | Internal            |

---

## 9. DEVELOPMENT

Development workstation and tooling used for system administration and code development.

| Asset ID  | Asset Name                                       | Type               | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|--------------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| DEV-001   | Development Workstation                          | Endpoint           | WSL2 (Linux) on Windows host. Used for development, deployment, and system administration. Runs Node.js 20, Terraform, gcloud CLI, and development tooling. Single authorized administrator workstation. | G. Ontiveros   | CUI                 |

---

## 10. DOMAINS

DNS domains and subdomains used by the system.

| Asset ID  | Asset Name                                       | Type               | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|--------------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| DOM-001   | cveriskpilot.com                                 | Domain             | Primary domain. Marketing site and DNS root. DNS managed externally (Cloudflare). | G. Ontiveros   | Public              |
| DOM-002   | app.cveriskpilot.com                             | Domain             | Application subdomain. Points to GCP global load balancer static IP. Google-managed SSL certificate. Serves all authenticated application traffic. | G. Ontiveros   | CUI                 |

---

## 11. SERVICE ACCOUNTS

GCP service accounts used for workload identity and inter-service authentication.

| Asset ID  | Asset Name                                       | Type               | Description                                                                                              | Owner          | Data Classification |
|-----------|--------------------------------------------------|--------------------|----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| SA-001    | cveriskpilot-run-prod                            | Service Account    | Dedicated Cloud Run service account (replaces default App Engine SA). Display name: "CVERiskPilot Cloud Run -- prod". Used by web, worker, and pgbouncer services. IAM roles: `roles/cloudsql.client` (Cloud SQL socket connection), `roles/secretmanager.secretAccessor` (13 app secrets + DB password), `roles/storage.objectAdmin` (artifacts + static assets buckets), `roles/cloudtasks.enqueuer` (scan pipeline queue), `roles/cloudkms.cryptoKeyEncrypterDecrypter` (tenant keyring), `roles/logging.logWriter` (structured logs), `roles/monitoring.metricWriter` (custom metrics), `roles/run.invoker` (Pub/Sub push to worker), `roles/pubsub.publisher` (publish to all 4 pipeline topics + scheduler). | G. Ontiveros   | Internal            |

---

## Revision History

| Version | Date       | Author          | Changes         |
|---------|------------|-----------------|-----------------|
| 1.0     | 2026-03-30 | G. Ontiveros    | Initial release |
