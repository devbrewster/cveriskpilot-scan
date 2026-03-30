# Patch Management Policy

| Field | Value |
|---|---|
| **Document ID** | CMMC-SI-001 |
| **Version** | 1.0 |
| **Date** | 2026-03-30 |
| **Classification** | CUI-Basic / FOUO |
| **Author** | George Ontiveros |
| **Organization** | CVERiskPilot LLC (100% Veteran Owned, Texas) |
| **CMMC Practice** | SI.L1-3.14.1 |
| **Review Cycle** | Annual |
| **Next Review** | Q1 2027 |

---

## 1. Purpose

This policy establishes requirements for timely identification and remediation of system and software vulnerabilities through flaw remediation (patching). It ensures that all components of the CVERiskPilot platform and supporting infrastructure are maintained at current patch levels to protect Federal Contract Information (FCI) from exploitation of known vulnerabilities.

## 2. Scope

This policy applies to all software and infrastructure components in the CVERiskPilot environment:

- **Application dependencies**: npm packages (Node.js 20 / TypeScript runtime)
- **Container images**: Docker base images used in Cloud Run deployments
- **Database**: Cloud SQL PostgreSQL 16 (Google-managed)
- **Cache**: Cloud Memorystore Redis (Google-managed)
- **WAF**: Cloud Armor security policies (OWASP CRS rulesets)
- **Infrastructure as Code**: Terraform providers and modules
- **Developer workstation**: Operating system (Windows/Linux) and development tools

## 3. Patch Timelines

Patches are prioritized based on CVSS v3.1 base score and CISA Known Exploited Vulnerabilities (KEV) catalog status:

| Severity | Criteria | Remediation Deadline |
|---|---|---|
| **Critical** | CVSS >= 9.0 or listed in CISA KEV catalog | **72 hours** |
| **High** | CVSS 7.0 -- 8.9 | **14 days** |
| **Medium** | CVSS 4.0 -- 6.9 | **30 days** |
| **Low** | CVSS < 4.0 | **Quarterly** (next scheduled maintenance window) |

Timelines begin from the date a patch or mitigation becomes available, not from vulnerability disclosure date. If a vulnerability is added to the CISA KEV catalog after initial assessment, it is re-prioritized to the Critical/72-hour timeline regardless of CVSS score.

## 4. Automated Patching

The following components receive patches automatically through Google-managed or CI/CD-driven processes:

### 4.1 Cloud SQL (PostgreSQL 16)

| Setting | Value |
|---|---|
| Maintenance window | Sunday at 04:00 UTC |
| Update track | `stable` |
| Managed by | Google Cloud (automatic minor version and security patches) |

Configured in Terraform (`database.tf`). Google applies security patches and minor version updates during the maintenance window. Major version upgrades require manual planning.

### 4.2 Cloud Run Container Images

Container images are rebuilt from the current base image on every deployment via Cloud Build. The multi-stage Dockerfile pulls the latest patched Node.js 20 base image at build time. Every `git push` to `main` that triggers a Cloud Build pipeline produces a fresh container with current OS-level and runtime patches.

### 4.3 Cloud Armor WAF Rules

| Setting | Value |
|---|---|
| Ruleset | OWASP ModSecurity CRS v33-stable |
| Update mechanism | Automatically updated by Google |
| Rules active | SQLi, XSS, LFI, RFI, RCE, method enforcement, scanner detection, protocol attack, PHP injection, session fixation, Java attack, NodeJS attack |

Configured in Terraform (`cloud-armor.tf`). The `v33-stable` preconfigured expressions are maintained and updated by Google. Rule updates do not require Terraform changes or redeployment.

### 4.4 Cloud Memorystore (Redis)

Google manages the Redis instance including security patches. No manual patching is required. Maintenance updates are applied automatically by GCP.

## 5. Manual Patching Procedures

The following components require manual review and patching:

| Component | Frequency | Procedure |
|---|---|---|
| **npm dependencies** | Weekly | Run `npm audit` across all workspace packages. Review advisories. Apply patches via `npm update` or targeted version bumps. Test with `npm run build` and `npm run test` before merging. |
| **Container base image** | Monthly | Review Node.js 20 LTS release notes for security fixes. Update `FROM` directive in `deploy/Dockerfile` if a new patch release is available. Rebuild and test. |
| **Terraform providers** | Quarterly | Review provider changelogs (google, google-beta). Update version constraints in `versions.tf`. Run `terraform plan` to verify no breaking changes. Apply. |
| **Developer workstation OS** | Monthly | Apply Windows Update / Linux package manager security updates. Reboot if required. Confirm full-disk encryption remains active post-update. |

## 6. Vulnerability Tracking

Identified vulnerabilities and their patch status are tracked through:

- **GitHub Issues / Pull Requests**: Each vulnerability requiring a code change is tracked as a GitHub Issue with severity label. The corresponding PR references the Issue and the CVE or advisory ID.
- **CVERiskPilot scan engine**: The platform's own dependency vulnerability scanning capability is used to track npm and container image vulnerabilities against NVD, EPSS, and KEV data sources.
- **npm audit output**: Weekly audit results are reviewed and any new findings are logged.

## 7. Exceptions

If a patch cannot be applied within the required timeline due to compatibility issues, operational risk, or vendor constraints:

1. **Document in a Plan of Action and Milestones (POAM)**: Record the vulnerability ID (CVE), affected component, reason the patch cannot be applied, compensating controls in place, and target remediation date.
2. **System Owner approval**: George Ontiveros (System Owner) must approve the exception and the compensating controls.
3. **Compensating controls**: Must be documented and implemented (e.g., WAF rule to block exploit vector, network segmentation, feature disable).
4. **Review**: POAM items are reviewed monthly until resolved.

## 8. Policy Review

This policy is reviewed annually by the System Owner. The next scheduled review is **Q1 2027**. Reviews are triggered earlier if there are significant changes to the technology stack, threat landscape, or CMMC requirements.

---

*CVERiskPilot LLC -- 100% Veteran Owned -- Texas*
