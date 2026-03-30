# Physical Security Policy

| Field | Value |
|---|---|
| **Document ID** | CMMC-PE-001 |
| **Version** | 1.0 |
| **Date** | 2026-03-30 |
| **Classification** | CUI-Basic / FOUO |
| **Author** | George Ontiveros |
| **Organization** | CVERiskPilot LLC (100% Veteran Owned, Texas) |
| **CMMC Practices** | PE.L1-3.10.1, PE.L1-3.10.2, PE.L1-3.10.3, PE.L1-3.10.4, PE.L1-3.10.5 |
| **Review Cycle** | Annual |
| **Next Review** | Q1 2027 |

---

## 1. Purpose

This policy defines physical security controls to limit physical access to organizational information systems, equipment, and operating environments to authorized individuals. It addresses both cloud-hosted infrastructure (GCP data centers, where controls are inherited) and the home office workspace used by the sole founder for development and system administration.

## 2. Scope

This policy applies to all physical locations where FCI is processed, stored, or transmitted:

- **Google Cloud Platform data centers**: All production infrastructure (Cloud Run, Cloud SQL, Memorystore, GCS, Secret Manager) is hosted in GCP data centers. Physical security controls are inherited from Google.
- **Home office workspace**: The primary development and administration environment for CVERiskPilot LLC, located in a private residence in Texas.

## 3. GCP Inherited Controls

All CVERiskPilot production systems run on Google Cloud Platform. Google maintains the following physical security controls for its data centers, validated by independent third-party audits:

| Control | Implementation |
|---|---|
| **SOC 2 Type II** | Annual audit covering security, availability, and confidentiality |
| **ISO 27001** | Certified information security management system |
| **Biometric access** | Multi-factor physical access including biometric verification at all entry points |
| **24/7 security** | On-site security personnel at all facilities around the clock |
| **Video surveillance** | Continuous CCTV monitoring of all facility entry points, server floors, and perimeters |
| **Mantrap entries** | Multi-stage physical entry points preventing tailgating |
| **Environmental controls** | Fire suppression, climate control, redundant power, UPS, and generators |
| **Media destruction** | On-site media sanitization and destruction per NIST SP 800-88 |

Google's compliance reports are available via the Google Cloud Compliance Reports Manager. CVERiskPilot reviews these annually during policy review to confirm continued coverage.

## 4. Home Office Controls

CVERiskPilot LLC is a solo-founder company operating from a private residence. The following controls protect the home office workspace:

### 4.1 Physical Access (PE.L1-3.10.1)

- **Dedicated workspace**: A designated area within the private residence is used exclusively for CVERiskPilot work.
- **Exterior security**: All exterior doors are secured with keyed deadbolt locks.
- **Access limited to**: Authorized individual (George Ontiveros, System Owner) and household residents.

### 4.2 Workstation Protection (PE.L1-3.10.2, PE.L1-3.10.3)

- **Screen lock**: Automatic screen lock activates after 5 minutes of inactivity.
- **Full-disk encryption**: All workstation drives use full-disk encryption (BitLocker on Windows, LUKS on Linux).
- **Workstation locked**: When stepping away, workstation is manually locked (Win+L / screen lock shortcut).

### 4.3 Visitor Controls (PE.L1-3.10.3, PE.L1-3.10.4)

- **No visitors in workspace during active work**: When FCI is displayed or accessible, no visitors are permitted in the workspace area.
- **Workstation secured when visitors present**: If visitors are present elsewhere in the residence, the workstation is locked and the workspace door (if applicable) is closed.
- **Informal visitor log**: A record of any non-household visitors to the residence is maintained noting name, date, and whether they entered the workspace area. This log is retained for 1 year.

### 4.4 Display and Visibility (PE.L1-3.10.5)

- **Screen positioning**: Workstation monitors are positioned so they are not visible from windows or common areas.
- **No FCI visible from outside**: Blinds or curtains are used to prevent visual observation from exterior windows.

## 5. Prohibited Activities

The following activities are prohibited to prevent unauthorized disclosure of FCI:

| Prohibition | Rationale |
|---|---|
| **No FCI printed** | CVERiskPilot operates paperless. Printing FCI creates uncontrolled physical media. |
| **No FCI on removable media** | USB drives, external drives, and optical media are not approved for FCI storage without written System Owner approval. See Media Sanitization Policy (CMMC-MP-001). |
| **No FCI visible from outside** | Monitors must not display FCI in a manner observable through windows or by unauthorized persons. |
| **No public workspace use** | FCI must not be accessed from public locations (coffee shops, coworking spaces) without VPN and privacy screen. |

## 6. Policy Review

This policy is reviewed annually by the System Owner. The next scheduled review is **Q1 2027**. Reviews are triggered earlier if there are changes to the workspace location, household composition, or CMMC requirements.

---

*CVERiskPilot LLC -- 100% Veteran Owned -- Texas*
