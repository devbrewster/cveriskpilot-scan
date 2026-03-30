# Media Sanitization Policy

| Field | Value |
|---|---|
| **Document ID** | CMMC-MP-001 |
| **Version** | 1.0 |
| **Date** | 2026-03-30 |
| **Classification** | CUI-Basic / FOUO |
| **Author** | George Ontiveros |
| **Organization** | CVERiskPilot LLC (100% Veteran Owned, Texas) |
| **CMMC Practice** | MP.L1-3.8.3 |
| **NIST Reference** | NIST SP 800-88 Rev 1 |
| **Review Cycle** | Annual |
| **Next Review** | Q1 2027 |

---

## 1. Purpose

This policy establishes requirements for sanitizing information system media before disposal, release, or reuse to prevent unauthorized disclosure of Federal Contract Information (FCI). All sanitization activities follow NIST SP 800-88 Rev 1 guidelines and are proportional to the sensitivity of the data stored on the media.

## 2. Scope

This policy applies to all media containing FCI processed by CVERiskPilot LLC systems:

- **Cloud storage**: Google Cloud Storage (GCS) buckets, Cloud SQL PostgreSQL databases, Cloud Memorystore Redis instances, Secret Manager secrets, and Cloud Logging log sinks
- **Developer workstation**: Local SSD (development laptop)
- **Removable media**: USB drives, external hard drives, optical media (policy: prohibited for FCI)

## 3. Cloud Resource Sanitization

### 3.1 Google Cloud Storage (GCS)

GCS buckets are configured via Terraform with automated lifecycle management:

| Rule | Age | Action |
|---|---|---|
| Archive transition | 90 days | Transition to Nearline storage class |
| Expiration | 365 days | Delete objects |

Additional controls:
- **Versioning**: Enabled on all buckets. Lifecycle rules apply to all object versions.
- **force_destroy**: Set to `false` for production buckets, preventing accidental bucket deletion with objects still present. Non-production buckets allow force_destroy for environment teardown.
- **Public access prevention**: Enforced (`public_access_prevention = "enforced"`).
- **Uniform bucket-level access**: Enabled (no per-object ACLs).

**Decommission procedure**: Before deleting a GCS bucket, export all required data, confirm retention obligations are met, then delete all object versions. Production buckets require Terraform `force_destroy` override with change approval.

### 3.2 Cloud SQL (PostgreSQL 16)

Cloud SQL instances are configured with the following backup and retention settings:

| Setting | Value |
|---|---|
| Backup schedule | Daily at 03:00 UTC |
| Point-in-time recovery | Enabled (production) |
| Transaction log retention | 7 days |
| Backup retention | 14 backups (count-based) |
| Deletion protection | Enabled (production) |
| Auto-purge | Backups beyond retention count are automatically deleted by GCP |

**Decommission procedure**: Export database via `gcloud sql export sql` or `pg_dump` to a GCS bucket under retention policy. Disable deletion protection via Terraform. Delete the Cloud SQL instance. GCP automatically purges all associated backups and transaction logs. Document the export location and deletion date.

### 3.3 Cloud Memorystore (Redis)

Redis is an in-memory data store. No data persists to disk in the managed service configuration.

**Decommission procedure**: Execute `FLUSHALL` command to clear all keys before instance deletion. Delete the Memorystore instance via Terraform or `gcloud`. In-memory data is irrecoverable after instance termination. Document the flush and deletion date.

### 3.4 Secret Manager

Secrets are stored with Google-managed encryption at rest.

**Decommission procedure**: Destroy all secret versions using `gcloud secrets versions destroy`. The secret metadata can then be deleted. GCP enforces a 30-day soft-delete window during which destroyed versions cannot be accessed but are retained internally before permanent purge. Document which secrets were destroyed and the destruction date.

### 3.5 Cloud Logging

Cloud Logging is configured with a 90-day default retention period.

**Auto-purge**: Logs older than the retention period are automatically and permanently deleted by GCP. No manual sanitization is required for routine operations.

**Decommission procedure**: If exporting logs before project shutdown, use log sinks to GCS. After export confirmation, no additional sanitization is needed as GCP purges logs upon project deletion.

## 4. Physical Media Sanitization

### 4.1 Developer Workstation SSD

Per NIST SP 800-88 Rev 1, the following methods apply based on disposition:

| Method | Technique | Use Case |
|---|---|---|
| **Clear** | Single-pass overwrite (all addressable locations) | Reuse within organization; adequate for FCI / Low categorization |
| **Purge** | ATA Secure Erase (manufacturer firmware-level erase) | Reuse outside organization or transfer |
| **Destroy** | Physical destruction (shredding, disintegration, incineration) | End of life; media is non-functional after |

SSD-specific note: Due to wear-leveling and over-provisioning in SSDs, Clear may not reach all data blocks. For media leaving organizational control, Purge (ATA Secure Erase) or Destroy is required.

### 4.2 Removable Media

**Policy: No FCI shall be stored on removable media (USB drives, external drives, optical media).**

If an exception is required for operational necessity:
1. System Owner (George Ontiveros) must approve in writing
2. Media must use full-disk encryption (AES-256)
3. Media must be sanitized via Destroy method after use
4. Exception must be documented with justification, approval date, and destruction record

## 5. Verification and Record Keeping

All sanitization events must be documented with:

| Field | Description |
|---|---|
| Asset identifier | Cloud resource name, serial number, or asset tag |
| Media type | SSD, GCS bucket, Cloud SQL instance, etc. |
| Sanitization method | Clear, Purge, Destroy, or cloud lifecycle auto-purge |
| Date performed | Date of sanitization or confirmed auto-purge |
| Performed by | Name of person who executed or verified the action |
| Verification method | Visual confirmation, tool output, GCP audit log, or certificate of destruction |

Records are maintained in the CVERiskPilot asset inventory and retained for a minimum of **3 years** from the sanitization date.

For cloud resources, GCP Cloud Audit Logs provide an immutable record of resource deletion events and serve as supplemental verification.

## 6. Policy Review

This policy is reviewed annually by the System Owner. The next scheduled review is **Q1 2027**. Reviews are triggered earlier if there are significant changes to infrastructure, data classification, or CMMC requirements.

---

*CVERiskPilot LLC -- 100% Veteran Owned -- Texas*
