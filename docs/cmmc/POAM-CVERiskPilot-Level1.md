# Plan of Action & Milestones (POA&M)

| Field            | Value                                              |
|------------------|----------------------------------------------------|
| **Document**     | CVERiskPilot Plan of Action & Milestones (POAM)    |
| **CMMC Level**   | 1 (Self-Assessment)                                |
| **Version**      | 1.0                                                |
| **Date**         | 2026-03-30                                         |
| **Organization** | CVERiskPilot LLC                                   |
| **CAGE Code**    | [Pending]                                          |
| **UEI**          | [Pending]                                          |
| **Assessor**     | George Ontiveros (Self-Assessment)                 |
| **Classification** | CUI-Basic / FOUO                                 |

---

## POA&M Items

| # | POAM ID | Practice | Title | Weakness Description | Milestones | Scheduled Completion | Risk Level | Resources Required | Status |
|---|---------|----------|-------|----------------------|------------|----------------------|------------|--------------------|--------|
| 1 | POAM-001 | MP.L1-3.8.3 | Media Sanitization | No formal documented media sanitization procedure for development workstation. Cloud-side has lifecycle policies but no documented end-of-life decommissioning procedure. | (1) Publish media-sanitization-policy.md [COMPLETE - 2026-03-30] (2) Procure NIST 800-88 compliant disk wiping tool [Q2 2026] (3) Document cloud resource decommissioning checklist [Q2 2026] | 2026-06-30 | Low (FCI only, cloud-primary architecture minimizes physical media) | System Owner time, disk wiping software (~$0) | In Progress |
| 2 | POAM-002 | PE.L1-3.10.1 / PE.L1-3.10.4 | Physical Access Controls | Home office physical security controls not formally documented. No formal visitor access log. | (1) Publish physical-security-policy.md [COMPLETE - 2026-03-30] (2) Install lockable cabinet for any physical media [Q2 2026] (3) Create and begin using visitor log template [Q2 2026] | 2026-06-30 | Low (solo founder, no employees, GCP handles data center security) | System Owner time, lockable cabinet (~$50) | In Progress |
| 3 | POAM-003 | SI.L1-3.14.1 | Patch Management | No formal documented patch management cadence. Patching occurs ad-hoc via npm audit and Cloud SQL automatic maintenance windows. | (1) Publish patch-management-policy.md [COMPLETE - 2026-03-30] (2) Configure automated Dependabot PRs on GitHub [Q2 2026] (3) Establish and document quarterly manual review cadence [Q2 2026] | 2026-06-30 | Medium (timely patching critical for FCI protection) | System Owner time, GitHub Dependabot (free) | In Progress |

---

## POAM Item Details

### POAM-001: Media Sanitization (MP.L1-3.8.3)

**Weakness:** No formal documented media sanitization procedure for development workstation. Cloud-side has lifecycle policies but no documented end-of-life decommissioning procedure.

**Milestones:**

| # | Milestone | Target Date | Status |
|---|-----------|-------------|--------|
| 1 | Publish media-sanitization-policy.md | 2026-03-30 | COMPLETE |
| 2 | Procure NIST 800-88 compliant disk wiping tool | Q2 2026 | Planned |
| 3 | Document cloud resource decommissioning checklist | Q2 2026 | Planned |

- **Scheduled Completion:** 2026-06-30
- **Risk Level:** Low (FCI only, cloud-primary architecture minimizes physical media)
- **Resources Required:** System Owner time, disk wiping software (~$0)
- **Status:** In Progress

---

### POAM-002: Physical Access Controls (PE.L1-3.10.1 / PE.L1-3.10.4)

**Weakness:** Home office physical security controls not formally documented. No formal visitor access log.

**Milestones:**

| # | Milestone | Target Date | Status |
|---|-----------|-------------|--------|
| 1 | Publish physical-security-policy.md | 2026-03-30 | COMPLETE |
| 2 | Install lockable cabinet for any physical media | Q2 2026 | Planned |
| 3 | Create and begin using visitor log template | Q2 2026 | Planned |

- **Scheduled Completion:** 2026-06-30
- **Risk Level:** Low (solo founder, no employees, GCP handles data center security)
- **Resources Required:** System Owner time, lockable cabinet (~$50)
- **Status:** In Progress

---

### POAM-003: Patch Management (SI.L1-3.14.1)

**Weakness:** No formal documented patch management cadence. Patching occurs ad-hoc via npm audit and Cloud SQL automatic maintenance windows.

**Milestones:**

| # | Milestone | Target Date | Status |
|---|-----------|-------------|--------|
| 1 | Publish patch-management-policy.md | 2026-03-30 | COMPLETE |
| 2 | Configure automated Dependabot PRs on GitHub | Q2 2026 | Planned |
| 3 | Establish and document quarterly manual review cadence | Q2 2026 | Planned |

- **Scheduled Completion:** 2026-06-30
- **Risk Level:** Medium (timely patching critical for FCI protection)
- **Resources Required:** System Owner time, GitHub Dependabot (free)
- **Status:** In Progress

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-03-30 | George Ontiveros | Initial POA&M for CMMC Level 1 self-assessment |
