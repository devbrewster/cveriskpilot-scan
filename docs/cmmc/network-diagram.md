# CVERiskPilot Network Architecture Diagram

| Field            | Value                                          |
|------------------|------------------------------------------------|
| **Document**     | CVERiskPilot Network Architecture Diagram      |
| **Version**      | 1.0                                            |
| **Date**         | 2026-03-30                                     |
| **Classification** | CUI-Basic / FOUO                             |
| **Author**       | George Ontiveros, System Owner                 |
| **Infrastructure** | Google Cloud Platform (GCP)                  |

---

## System Boundary Diagram

```
 INTERNET / EXTERNAL
 ====================================================================================

  +-------------+     +----------------+     +--------------+     +----------------+
  | End Users   |     | Vulnerability  |     | OAuth / SSO  |     | Payment        |
  | (Browsers)  |     | Scanners       |     | Providers    |     | Processing     |
  +------+------+     +-------+--------+     +------+-------+     +-------+--------+
         |                    |                      |                     |
         | HTTPS              | File Upload          | OAuth2/SAML        | HTTPS
         |                    | (Nessus, SARIF,      | (Google, GitHub,   | (Stripe API
         |                    |  Qualys, CycloneDX,  |  WorkOS SAML/OIDC) |  + Webhooks)
         |                    |  SPDX, OSV, etc.)    |                     |
         v                    v                      v                     v
 ====================================================================================

  +-----------------------------------------------------------------------------------+
  |                        CLOUDFLARE (DNS + Proxy)                                    |
  |  cveriskpilot.com / app.cveriskpilot.com                                          |
  |  - DNS resolution to GCP static IP                                                |
  |  - DDoS mitigation (L3/L4)                                                        |
  |  - TLS termination (edge)                                                         |
  +----------------------------------+------------------------------------------------+
                                     |
                                     | A Record -> GCP Global Static IP
                                     v
 ====================================================================================
  GCP PROJECT BOUNDARY
 ====================================================================================
                                     |
                     +---------------v-----------------+
                     |  GCP Global HTTPS Load Balancer  |
                     |  (External Managed)              |
                     |                                  |
                     |  - Static IP (global)            |
                     |  - Managed SSL Certificate       |
                     |    (app.cveriskpilot.com)         |
                     |  - HTTP->HTTPS redirect (301)    |
                     |  - Logging (100% sample rate)    |
                     +---------+----------+-------------+
                               |          |
                    +----------v--+   +---v-------------------+
                    | Cloud Armor  |   | Cloud CDN (prod)      |
                    | WAF Policy   |   |                       |
                    | (Enterprise) |   | URL Map Routing:      |
                    |              |   |  /_next/static/* --+  |
                    | OWASP CRS:   |   |  /images/*      --+->GCS Static Bucket
                    |  SQLi, XSS,  |   |  /favicon.ico  --+  |
                    |  LFI, RFI,   |   |  /* ------------->Cloud Run
                    |  RCE, PHP,   |   |                       |
                    |  NodeJS,     |   | Cache Policy:          |
                    |  Protocol,   |   |  Static: 1h TTL        |
                    |  Session     |   |  API: USE_ORIGIN_HDRS  |
                    |              |   +-----------+------------+
                    | Bot Defense: |               |
                    |  CVE canary  |               |
                    |  No UA block |               |
                    |              |               |
                    | Rate Limits: |               |
                    |  Global:     |               |
                    |   200/min/IP |               |
                    |  Auth:       |               |
                    |   20/min/IP  |               |
                    |  API Keys:   |               |
                    |   10/min/IP  |               |
                    |  SCIM:       |               |
                    |   100/min/IP |               |
                    |              |               |
                    | Adaptive     |               |
                    |  Protection  |               |
                    |  (ML DDoS)   |               |
                    +--------------+               |
                                                   |
                            Serverless NEG         |
                                                   |
 +-------------------+----------------------------v-----------------------------------+
 |                              PUBLIC ZONE (Cloud Run)                                |
 |                                                                                     |
 |  +-------------------------------------------------------------------+              |
 |  |  Cloud Run: cveriskpilot-web (Next.js 15, Port 3000)              |              |
 |  |                                                                   |              |
 |  |  - Min instances: 2 (prod) / 1 (dev)                             |              |
 |  |  - Max instances: 10                                              |              |
 |  |  - Concurrency: 80 req/instance                                  |              |
 |  |  - Memory: 1 GiB, CPU: 2 vCPU                                   |              |
 |  |  - Health: /api/health (startup + liveness)                      |              |
 |  |  - Ingress: INTERNAL_LOAD_BALANCER (prod) / ALL (dev)            |              |
 |  |  - Secrets via Secret Manager (13 secrets)                       |              |
 |  +----------+--------------+----------------+----------+------------+              |
 |             |              |                |          |                             |
 |             |              | Cloud SQL      |          | Pub/Sub                     |
 |             |              | Auth Proxy     |          | Publish                     |
 |             |              | (sidecar)      |          |                             |
 +-------------+--------------+----------------+----------+-----------------------------+
               |                               |          |
 ==============|===============================|==========|================================
               |   VPC ACCESS CONNECTOR        |          |
               |   (crp-vpc, 10.8.0.0/28)      |          |
               |   e2-micro, 2-3 instances     |          |
               |                               |          |
               | Egress: PRIVATE_RANGES_ONLY   |          |
 ==============|===============================|==========|================================
               |                               |          |
 +-------------v-------------------------------v----------v-----------------------------+
 |                            PRIVATE VPC ZONE                                          |
 |                                                                                      |
 |  +------------------------------------+    +-------------------------------------+   |
 |  |  Cloud SQL: PostgreSQL 16          |    |  Memorystore: Redis 7.2             |   |
 |  |  (Enterprise Edition)              |    |                                     |   |
 |  |                                    |    |  - Tier: BASIC                      |   |
 |  |  Primary Instance:                 |    |  - Policy: allkeys-lru              |   |
 |  |  - HA: REGIONAL (prod) /           |    |  - Private network only             |   |
 |  |        ZONAL (dev)                 |    |  - Session cache, rate limits,      |   |
 |  |  - Private IP only (no public)     |    |    feature flags                    |   |
 |  |  - Disk autoresize                 |    |                                     |   |
 |  |  - PITR enabled (prod)             |    +-------------------------------------+   |
 |  |  - Backups: daily 03:00 UTC        |                                              |
 |  |  - Retention: 14 backups           |    +-------------------------------------+   |
 |  |  - Maintenance: Sun 04:00 UTC      |    |  Cloud Run: PgBouncer               |   |
 |  |  - Logging: checkpoints +          |    |  (Internal Only, Port 6432)          |   |
 |  |    connections                     |    |                                     |   |
 |  |                                    |    |  - Image: bitnami/pgbouncer:1       |   |
 |  |  Read Replica (prod only):         |    |  - Pool mode: transaction           |   |
 |  |  - ZONAL availability             |    |  - Max client conn: 200             |   |
 |  |  - Private IP only                |    |  - Default pool: 25                 |   |
 |  |  - Failover target: false         |    |  - Min pool: 5, Reserve: 5          |   |
 |  |                                    |    |  - Scaling: 1-3 instances           |   |
 |  +------------------------------------+    |  - Ingress: INTERNAL_ONLY           |   |
 |                                            +-------------------------------------+   |
 |                                                                                      |
 |  +------------------------------------+    +-------------------------------------+   |
 |  |  Cloud Run: Worker                 |    |  Cloud Tasks                        |   |
 |  |  (Internal, Port 8080)             |    |  Queue: scan-pipeline               |   |
 |  |                                    |    |                                     |   |
 |  |  - SERVICE_ROLE=worker             |    |  - Dispatch rate: 10/sec            |   |
 |  |  - Min instances: 0 (scale to 0)  |    |  - Concurrent: 5                    |   |
 |  |  - Max instances: 5               |    |  - Retries: 3 attempts              |   |
 |  |  - Memory: 1 GiB, CPU: 1 vCPU    |    |  - Backoff: 10s-300s                |   |
 |  |  - Processes Pub/Sub push msgs    |    |  - Max doublings: 4                 |   |
 |  |  - Endpoint: /jobs/process        |    |                                     |   |
 |  +------------------------------------+    +-------------------------------------+   |
 |                                                                                      |
 +--------------------------------------------------------------------------------------+

 ====================================================================================
  GCP MANAGED SERVICES (within project boundary)
 ====================================================================================

  +-------------------------------+    +--------------------------------------------+
  |  Pub/Sub Topics (4 pipelines) |    |  Cloud Storage (GCS)                       |
  |                               |    |                                            |
  |  1. scan-pipeline             |    |  Artifacts Bucket (private):               |
  |     Parse, enrich, score      |    |  - Uniform bucket access                   |
  |                               |    |  - Public access prevention: enforced      |
  |  2. enrichment-pipeline       |    |  - Versioning: enabled                     |
  |     NVD, EPSS, KEV lookups    |    |  - Lifecycle: Nearline @ 90d, Delete @ 1y  |
  |                               |    |  - Scan uploads, exports, backups          |
  |  3. notification-events       |    |                                            |
  |     Email, webhook, in-app    |    |  Static Assets Bucket (prod, public CDN):  |
  |                               |    |  - CDN-enabled backend bucket              |
  |  4. connector-sync            |    |  - CORS: app.cveriskpilot.com              |
  |     Scanner connector sync    |    |  - Serves /_next/static/*, /images/*       |
  |                               |    |  - Lifecycle: Delete @ 90d                 |
  |  Each topic has:              |    |                                            |
  |  - Dead-letter topic (DLQ)    |    +--------------------------------------------+
  |  - Push sub -> Worker         |
  |  - 7-day retention            |    +--------------------------------------------+
  |  - OIDC auth to Worker        |    |  Cloud KMS                                 |
  |  - 5 max delivery attempts    |    |                                            |
  +-------------------------------+    |  Keyring: tenant-keys                      |
                                       |  - Default tenant key                      |
  +-------------------------------+    |  - Algorithm: AES-256 symmetric            |
  |  Secret Manager (13 secrets)  |    |  - Rotation: 90 days                       |
  |                               |    |  - Protection: SOFTWARE                    |
  |  - database-url               |    |  - BYOK support for enterprise tenants     |
  |  - redis-url                  |    +--------------------------------------------+
  |  - auth-secret                |
  |  - google-oidc-client-secret  |    +--------------------------------------------+
  |  - anthropic-api-key          |    |  Cloud Logging + Monitoring                |
  |  - stripe-secret-key          |    |                                            |
  |  - stripe-webhook-secret      |    |  Log-based Metrics:                        |
  |  - nvd-api-key                |    |  - Error count (severity >= ERROR)         |
  |  - master-encryption-key      |    |  - Request count (HTTP context)            |
  |  - smtp-pass                  |    |  - API latency distribution                |
  |  - cron-secret                |    |  - High latency (> 5s)                     |
  |  - workos-api-key             |    |                                            |
  |  - workos-client-id           |    |  Alert Policies:                           |
  |  - db-password                |    |  - Error rate > 1% over 5 min             |
  |                               |    |  - P95 latency > 5s over 5 min            |
  |  Auto-replication             |    |                                            |
  |  IAM: Cloud Run SA only       |    |  Log Retention:                            |
  +-------------------------------+    |  - Long-term bucket: 90 days               |
                                       |  - Sink: all Cloud Run revision logs       |
                                       +--------------------------------------------+

 ====================================================================================
  EXTERNAL API INTEGRATIONS (outbound HTTPS from Cloud Run)
 ====================================================================================

  +----------------+  +----------------+  +--------------+  +------------------+
  | NVD / NIST     |  | Anthropic      |  | Stripe       |  | WorkOS           |
  | (CVE + EPSS +  |  | Claude API     |  |              |  |                  |
  |  KEV data)     |  |                |  | - Checkout   |  | - SAML SSO       |
  |                |  | - AI Triage    |  | - Billing    |  | - OIDC SSO       |
  | - NVD 2.0 API  |  | - Remediation  |  | - Webhooks   |  | - Directory Sync |
  | - EPSS scores  |  |   guidance     |  | - Metering   |  | - SCIM           |
  | - KEV catalog  |  | - Risk scoring |  |              |  |                  |
  +----------------+  +----------------+  +--------------+  +------------------+

  +----------------+  +----------------+  +--------------+
  | SMTP           |  | Google OAuth   |  | GitHub OAuth |
  | (Email)        |  |                |  |              |
  |                |  | - User login   |  | - User login |
  | - Resend or    |  | - OIDC tokens  |  | - OAuth2     |
  |   nodemailer   |  |                |  |              |
  | - Notifications|  +----------------+  +--------------+
  | - Alerts       |
  +----------------+
```

---

## Data Flow Descriptions

### 1. User Request Flow (North-South)

```
User Browser
  -> Cloudflare DNS (cveriskpilot.com -> GCP static IP)
  -> GCP Global HTTPS Load Balancer (TLS, managed cert)
  -> Cloud Armor WAF (OWASP CRS inspection, rate limiting, bot detection)
  -> Cloud CDN (cache hit for static assets, pass-through for API)
  -> Serverless NEG
  -> Cloud Run Web (Next.js 15, port 3000)
  -> VPC Connector (10.8.0.0/28, private ranges only)
  -> Cloud SQL PostgreSQL 16 (private IP, via Cloud SQL Auth Proxy sidecar)
  -> Memorystore Redis 7.2 (session, cache, rate limit)
```

### 2. Scan Upload and Processing Flow

```
User uploads scan file (Nessus, SARIF, Qualys, CycloneDX, etc.)
  -> Cloud Run Web receives file via API route
  -> File stored in GCS Artifacts Bucket (private, versioned)
  -> Cloud Tasks queue: scan-pipeline (rate: 10/sec, concurrency: 5)
  -> Pub/Sub: scan-pipeline topic
  -> Push subscription -> Cloud Run Worker (/jobs/process)
  -> Worker: parse -> enrich (NVD/EPSS/KEV) -> score -> store in Cloud SQL
  -> Failed messages -> Dead-letter topic (DLQ) after 5 attempts
```

### 3. Enrichment Pipeline

```
New CVE discovered during scan parsing
  -> Pub/Sub: enrichment-pipeline topic
  -> Worker fetches NVD 2.0 API (CVSS scores, references)
  -> Worker fetches EPSS scores (exploitation probability)
  -> Worker checks KEV catalog (known exploited)
  -> Anthropic Claude API: AI triage + remediation guidance
  -> Results stored in Cloud SQL, cache in Redis
```

### 4. Notification Flow

```
Event trigger (finding created, SLA breach, case update)
  -> Pub/Sub: notification-events topic
  -> Worker processes notification
  -> Email via SMTP (Resend/nodemailer)
  -> Webhook delivery to customer endpoints (HMAC signed)
  -> In-app notification stored in Cloud SQL
```

### 5. Billing Flow

```
User action triggers billing check
  -> Cloud Run Web -> Stripe API (checkout, subscription, metering)
  -> Stripe Webhook -> Cloud Run Web (/api/billing/webhook)
  -> Subscription state stored in Cloud SQL
```

### 6. Authentication Flow

```
Login request
  -> Cloud Run Web
  -> Google OAuth (OIDC) / GitHub OAuth / WorkOS (SAML/OIDC)
  -> Session token issued, stored in Redis
  -> MFA check (TOTP) if enabled
  -> RBAC enforcement (10 roles) on every API call
```

---

## Network Segmentation Summary

| Zone             | Resources                                         | Access Control                          |
|------------------|---------------------------------------------------|-----------------------------------------|
| **Internet**     | End users, scanners, external APIs                | Cloudflare DDoS, Cloud Armor WAF        |
| **Edge**         | Global LB, Cloud Armor, Cloud CDN                 | TLS termination, OWASP CRS, rate limits |
| **Public Run**   | Cloud Run Web (Next.js)                           | LB-only ingress (prod), IAM auth        |
| **Private VPC**  | Cloud SQL, Redis, PgBouncer, Worker               | VPC connector, private IP only, no public IP |
| **Managed**      | Pub/Sub, Cloud Tasks, GCS, KMS, Secret Manager   | IAM service account bindings            |
| **Logging**      | Cloud Logging, Cloud Monitoring                   | 90-day retention, alert policies        |

---

## IP Addressing

| Component            | CIDR / Address     | Notes                              |
|----------------------|--------------------|------------------------------------|
| VPC Connector        | 10.8.0.0/28        | Cloud Run -> private resources     |
| Private Services     | /20 block (auto)   | VPC peering for Cloud SQL + Redis  |
| Load Balancer        | Global static IP   | Cloudflare A record target         |
| Cloud SQL Primary    | Private IP only    | No public IPv4                     |
| Cloud SQL Replica    | Private IP only    | Production only                    |
| Redis                | Private IP only    | Authorized network: default VPC    |

---

## Encryption

| Layer              | Method                                             |
|--------------------|----------------------------------------------------|
| **In Transit**     | TLS 1.2+ (Cloudflare edge, GCP managed cert)       |
| **At Rest (DB)**   | Google-managed encryption (Cloud SQL default)       |
| **At Rest (GCS)**  | Google-managed encryption (GCS default)             |
| **At Rest (App)**  | AES-256-GCM (MASTER_ENCRYPTION_KEY via Secret Mgr) |
| **Tenant Keys**    | Cloud KMS keyring, 90-day rotation, BYOK support   |
| **Secrets**        | Secret Manager (auto-replicated, IAM-gated)         |

---

*End of document.*
