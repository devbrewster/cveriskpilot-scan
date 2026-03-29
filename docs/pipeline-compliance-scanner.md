# CVERiskPilot Pipeline Compliance Scanner — Technical Architecture

**Version:** 1.0 Draft
**Date:** 2026-03-28
**Status:** Proposed
**Author:** CVERiskPilot Engineering

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Quick Start (5 Minutes)](#quick-start-5-minutes)
3. [Problem Statement](#problem-statement)
4. [Architecture Overview](#architecture-overview)
5. [System Components](#system-components)
6. [Scan Capabilities](#scan-capabilities)
7. [Dashboard & Reporting](#dashboard--reporting)
8. [API Reference](#api-reference)
9. [Example: Complete GitHub Actions Workflow](#example-complete-github-actions-workflow)
10. [Example: PR Comment Output](#example-pr-comment-output)
11. [Comparison: CVERiskPilot vs Alternatives](#comparison-cveriskpilot-vs-alternatives)
12. [Deployment Guide](#deployment-guide)

---

## Executive Summary

The CVERiskPilot Pipeline Compliance Scanner is a CI/CD-native integration that bridges
the gap between DevSecOps vulnerability scanning and compliance framework management.
When developers push code, the scanner ingests results from SAST, SCA, secrets detection,
and IaC analysis tools, then maps every finding through a CWE-to-compliance-control chain
covering NIST 800-53 rev5, CMMC Level 2, SOC2 Type II, FedRAMP Moderate, OWASP ASVS 4.0,
and NIST SSDF. The result is an automated compliance verdict delivered as a PR comment,
dashboard update, and — when violations are found — auto-generated POAM entries with full
audit trails linking back to the originating commit.

**The gap this fills:** Tools like Snyk, Semgrep, and GitHub Advanced Security scan code
and surface vulnerabilities, but none of them map findings to compliance frameworks or
generate POAM entries. On the other side, GRC platforms like Nucleus and Vulcan manage
vulnerability lifecycles and compliance posture but have no code-scanning capability and
no CI/CD pipeline presence. CVERiskPilot sits at the intersection — scanning code in the
pipeline and producing compliance-ready output that GRC teams can immediately use for
audits, POAMs, and framework scoring.

---

## Quick Start (5 Minutes)

Get compliance-aware scanning running on your GitHub repository in five steps.

### 1. Get an API Key

Sign up at [app.cveriskpilot.com](https://app.cveriskpilot.com) and create an API key
under **Settings > API Keys**. Local scans are free and unlimited.

### 2. Add the Secret to GitHub

In your repo: **Settings > Secrets and variables > Actions > New repository secret**

- Name: `CVERISKPILOT_API_KEY`
- Value: your `crp_sk_live_...` key

### 3. Create the Workflow

Add `.github/workflows/compliance-scan.yml`:

```yaml
name: Compliance Scan
on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          format: json
          output: trivy.json

      - name: CVERiskPilot Compliance Scan
        uses: cveriskpilot/compliance-scan-action@v1
        with:
          api-key: ${{ secrets.CVERISKPILOT_API_KEY }}
          frameworks: SOC2,CMMC
          trivy-file: trivy.json
          fail-on-compliance-violation: true
```

### 4. Open a Pull Request

Push a branch and open a PR. The workflow runs automatically.

### 5. Review the Compliance Report

CVERiskPilot Bot posts a PR comment with:
- Pass/fail/warn verdict per framework
- Every finding mapped to NIST 800-53, SOC 2, CMMC controls
- Auto-created POAM entries for critical/high findings
- Link to the full dashboard report

That is it. For GitLab CI setup, see [GitLab CI Component](#4-gitlab-ci-component).
For local scanning, run `npx @cveriskpilot/scan --help`.

---

## Problem Statement

### The Broken Compliance-in-CI/CD Workflow

Today's vulnerability-to-compliance pipeline is entirely manual:

1. **Developers** push code to a repository.
2. **Scanners** (Semgrep, Trivy, Snyk, etc.) run in CI/CD and find vulnerabilities.
3. **Security engineers** manually triage findings, classify by CWE, and determine severity.
4. **GRC analysts** manually map vulnerabilities to NIST 800-53 controls, SOC2 criteria,
   or CMMC practices — typically in spreadsheets.
5. **Compliance managers** manually create POAM entries, assign milestones, and track
   remediation through a separate system.
6. **Auditors** request evidence that the pipeline findings connect to compliance controls,
   requiring manual assembly of screenshots, exports, and narrative explanations.

### The Cost

| Metric                              | Current State                       |
|-------------------------------------|-------------------------------------|
| Time from scan to POAM entry        | 3-10 business days                  |
| Scanner tools per enterprise        | 3-5 average                         |
| Compliance frameworks per org       | 2-4 simultaneously                  |
| Manual mapping effort per finding   | 15-30 minutes                       |
| Audit evidence assembly             | 40+ hours per audit cycle           |
| Compliance automation in CI/CD      | Zero (no tool provides this today)  |

### What Organizations Need

- Scan results that arrive with compliance context already attached.
- Automatic POAM generation when pipeline findings affect compliance controls.
- A compliance verdict (pass/fail/warn) as a CI/CD gate.
- Per-repository compliance scorecards across multiple frameworks.
- Audit-ready evidence linking commits to controls to remediation.

---

## Architecture Overview

### End-to-End Flow

```
                                  CVERiskPilot Platform
                          +--------------------------------------+
                          |                                      |
Developer                 |  +-------------+   +---------------+ |
    |                     |  |  Pipeline    |   |  Compliance   | |     PR Comment
    |   git push          |  |  Scan API    |-->|  Mapping      | |---> (verdict +
    |       |             |  |  /api/       |   |  Engine       | |      controls)
    v       v             |  |  pipeline/   |   |  (CWE->NIST   | |
+--------+ +-----------+ |  |  scan        |   |   ->SOC2      | |     Dashboard
| GitHub | | GitLab CI | |  +------^-------+   |   ->CMMC      | |---> (scores +
| Action | | Pipeline  | |         |           |   ->FedRAMP)  | |      trends)
+---+----+ +-----+-----+ |         |           +-------+-------+ |
    |            |        |         |                   |         |     POAM
    v            v        |  +------+-------+   +------v-------+ |---> (auto-created
+------------------+      |  |  Parser      |   |  POAM        | |      entries)
| Semgrep (SARIF)  |----->|  |  Layer       |   |  Generator   | |
| Trivy (JSON)     |----->|  |  (SARIF,     |   |  (weakness,  | |     Audit Trail
| Trivy SBOM (CDX) |----->|  |   CycloneDX, |   |   control,   | |---> (commit-linked
+------------------+      |  |   Trivy JSON) |   |   milestone) | |      evidence)
                          |  +--------------+   +--------------+ |
                          |                                      |
                          |  +----------------------------------+|
                          |  |  Policy Engine                    ||
                          |  |  (severity gates, grace periods,  ||
                          |  |   auto-exceptions, org config)    ||
                          |  +----------------------------------+|
                          +--------------------------------------+
```

### Flow Description

1. **Trigger.** A developer opens a pull request or pushes to a branch configured for
   compliance scanning.

2. **Scan execution.** The GitHub Action or GitLab CI job runs one or more scanners
   (Semgrep for SAST, Trivy for SCA/container/IaC, custom scanners) and collects
   output in standard formats (SARIF, CycloneDX SBOM, Trivy JSON).

3. **Upload.** Scanner output is posted to `POST /api/pipeline/scan` with the
   organization's `crp_*` API key, target framework list, and repository metadata.

4. **Parsing.** The Pipeline Scan API normalizes input through CVERiskPilot's existing
   parser layer, which already supports 11 scanner formats (Nessus, SARIF, CSV, JSON,
   CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, XLSX).

5. **CWE classification.** Each finding is classified by CWE identifier. SARIF results
   typically include CWE tags; SCA results are mapped via CVE-to-CWE lookup through
   NVD data; IaC misconfigurations are mapped to CWE equivalents.

6. **Compliance mapping.** The CWE-to-Compliance Control Mapping Engine chains each CWE
   to the relevant NIST 800-53 controls, then maps those controls to the requested
   frameworks (SOC2, CMMC, FedRAMP, ASVS, SSDF).

7. **Policy evaluation.** The Pipeline Policy Engine evaluates the findings against the
   organization's configured policy (severity thresholds, framework-specific gates,
   grace periods, exception lists) and produces a verdict: `pass`, `fail`, or `warn`.

8. **POAM generation.** For findings that affect compliance controls and exceed the
   configured severity threshold, POAM entries are automatically created with weakness
   description, affected controls, milestone dates, and risk level — linked to the
   originating PR/commit.

9. **Response.** The API returns the verdict, findings with compliance context, affected
   controls, and POAM entry count. The CI/CD action posts a formatted comment to the
   PR/MR and optionally fails the pipeline.

10. **Dashboard update.** Scan results feed into the Pipeline Dashboard, updating
    per-repo compliance scores, control violation trends, and remediation velocity
    metrics.

---

## System Components

### 1. Pipeline Scan API (`POST /api/pipeline/scan`)

The primary ingestion endpoint for all CI/CD integrations.

#### Request

```http
POST /api/pipeline/scan
Authorization: Bearer crp_sk_live_a1b2c3d4e5f6...
Content-Type: multipart/form-data
```

| Field                    | Type       | Required | Description                                        |
|--------------------------|------------|----------|----------------------------------------------------|
| `scan_files`             | File[]     | Yes      | SARIF, CycloneDX SBOM, or Trivy JSON output files  |
| `frameworks`             | string     | Yes      | Comma-separated: `SOC2,CMMC,FEDRAMP,ASVS,SSDF`     |
| `repository`             | string     | Yes      | Repository identifier (e.g., `org/repo`)            |
| `branch`                 | string     | Yes      | Branch name                                         |
| `commit_sha`             | string     | Yes      | Full commit SHA                                     |
| `pr_number`              | string     | No       | Pull request / merge request number                 |
| `severity_threshold`     | string     | No       | Minimum severity to report: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` (default: `LOW`) |
| `fail_on_violation`      | boolean    | No       | Return HTTP 422 on compliance violation (default: `false`) |

#### Response (200 OK)

```json
{
  "scan_id": "scan_01JQXYZ123456",
  "verdict": "fail",
  "summary": {
    "total_findings": 12,
    "critical": 1,
    "high": 3,
    "medium": 5,
    "low": 3,
    "controls_affected": 8,
    "frameworks_evaluated": ["SOC2", "CMMC"],
    "poam_entries_created": 4
  },
  "findings": [
    {
      "id": "f_01JQXYZ789",
      "title": "SQL Injection in user input handler",
      "severity": "CRITICAL",
      "cwe": "CWE-89",
      "file": "src/api/users.ts",
      "line": 42,
      "scanner": "semgrep",
      "controls": [
        {
          "framework": "NIST 800-53",
          "control_id": "SI-10",
          "control_name": "Information Input Validation"
        },
        {
          "framework": "SOC2",
          "control_id": "CC6.1",
          "control_name": "Logical and Physical Access Controls"
        },
        {
          "framework": "CMMC",
          "control_id": "SI.L2-3.14.2",
          "control_name": "Malicious Code Protection — Inbound/Outbound"
        }
      ],
      "poam_entry_id": "poam_01JQXYZ456"
    }
  ],
  "controls_affected": [
    {
      "control_id": "SI-10",
      "framework": "NIST 800-53",
      "finding_count": 4,
      "max_severity": "CRITICAL"
    }
  ],
  "dashboard_url": "https://app.cveriskpilot.com/pipelines/scan_01JQXYZ123456",
  "created_at": "2026-03-28T14:30:00Z"
}
```

#### Response (422 — Compliance Violation, when `fail_on_violation=true`)

Returns the same body as 200 but with HTTP 422, causing the CI/CD pipeline to fail.

#### Rate Limits

| Tier             | Scans per Day | Max File Size | Concurrent Scans |
|------------------|---------------|---------------|-------------------|
| FREE             | 100           | 10 MB         | 2                 |
| FOUNDERS_BETA    | 500           | 50 MB         | 5                 |
| PRO              | 1,000         | 100 MB        | 10                |
| ENTERPRISE       | Unlimited     | 500 MB        | 50                |
| MSSP             | Unlimited     | 500 MB        | 100               |

#### Authentication

Uses the existing CVERiskPilot API key system. Keys are prefixed with `crp_sk_live_`
(production) or `crp_sk_test_` (sandbox). Keys are created in **Settings > API Keys**
and scoped to an organization. Each key can be restricted to specific endpoints via
the existing permission system.

---

### 2. CWE-to-Compliance Control Mapping Engine

The core of the Pipeline Compliance Scanner. This engine maintains a curated mapping
from CWE identifiers through NIST 800-53 rev5 controls to downstream frameworks.

#### Mapping Chain

```
CWE Identifier
    |
    v
NIST 800-53 rev5 Control (canonical intermediate)
    |
    +---> SOC2 Type II Criteria
    +---> CMMC Level 2 Practices
    +---> FedRAMP Moderate Controls
    +---> OWASP ASVS 4.0 Requirements
    +---> NIST SSDF Practices
```

#### Primary Mapping Table

| CWE | Weakness | NIST 800-53 | SOC2 | CMMC L2 | FedRAMP | ASVS 4.0 | SSDF |
|-----|----------|-------------|------|---------|---------|-----------|------|
| CWE-79 | Cross-Site Scripting (XSS) | SI-2 (Flaw Remediation), SI-3 (Malicious Code Protection) | CC6.1 | SI.L2-3.14.1 | SI-2, SI-3 | V5.3.3 | PW.5.1 |
| CWE-89 | SQL Injection | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.2 | SI-10 | V5.3.4 | PW.5.1 |
| CWE-798 | Hardcoded Credentials | IA-5 (Authenticator Management) | CC6.1, CC6.6 | IA.L2-3.5.10 | IA-5 | V2.10.4 | PO.5.2 |
| CWE-502 | Deserialization of Untrusted Data | SI-10 (Information Input Validation) | CC6.6 | SI.L2-3.14.6 | SI-10 | V5.5.3 | PW.5.1 |
| CWE-22 | Path Traversal | AC-4 (Information Flow Enforcement) | CC6.1 | AC.L2-3.1.3 | AC-4 | V12.3.1 | PW.5.1 |
| CWE-352 | Cross-Site Request Forgery (CSRF) | SC-23 (Session Authenticity) | CC6.1 | SC.L2-3.13.9 | SC-23 | V4.2.2 | PW.5.1 |
| CWE-78 | OS Command Injection | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.2 | SI-10 | V5.3.8 | PW.5.1 |
| CWE-287 | Improper Authentication | IA-2 (Identification and Authentication) | CC6.1, CC6.2 | IA.L2-3.5.1 | IA-2 | V2.1.1 | PW.5.1 |
| CWE-862 | Missing Authorization | AC-3 (Access Enforcement) | CC6.1, CC6.3 | AC.L2-3.1.1 | AC-3 | V4.1.1 | PW.5.1 |
| CWE-611 | XML External Entity (XXE) | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.6 | SI-10 | V5.5.2 | PW.5.1 |
| CWE-918 | Server-Side Request Forgery (SSRF) | SC-7 (Boundary Protection) | CC6.1, CC6.6 | SC.L2-3.13.1 | SC-7 | V12.6.1 | PW.5.1 |
| CWE-269 | Improper Privilege Management | AC-6 (Least Privilege) | CC6.3 | AC.L2-3.1.5 | AC-6 | V4.1.2 | PO.5.1 |
| CWE-434 | Unrestricted File Upload | SI-3 (Malicious Code Protection) | CC6.1 | SI.L2-3.14.1 | SI-3 | V12.1.1 | PW.5.1 |
| CWE-306 | Missing Authentication for Critical Function | IA-2 (Identification and Authentication) | CC6.1 | IA.L2-3.5.1 | IA-2 | V2.1.1 | PW.5.1 |
| CWE-732 | Incorrect Permission Assignment | AC-3 (Access Enforcement) | CC6.3 | AC.L2-3.1.2 | AC-3 | V4.1.3 | PO.5.1 |
| CWE-200 | Exposure of Sensitive Information | SC-28 (Protection of Information at Rest) | CC6.1, CC6.7 | SC.L2-3.13.16 | SC-28 | V8.3.4 | PW.5.1 |
| CWE-326 | Inadequate Encryption Strength | SC-12 (Cryptographic Key Establishment) | CC6.1, CC6.7 | SC.L2-3.13.11 | SC-12 | V6.2.1 | PO.5.2 |
| CWE-327 | Use of Broken Crypto Algorithm | SC-13 (Cryptographic Protection) | CC6.1 | SC.L2-3.13.11 | SC-13 | V6.2.5 | PO.5.2 |
| CWE-400 | Uncontrolled Resource Consumption | SC-5 (Denial of Service Protection) | CC6.1, A1.2 | SC.L2-3.13.1 | SC-5 | V11.2.1 | PW.5.1 |
| CWE-532 | Insertion of Sensitive Info into Log File | AU-9 (Protection of Audit Information) | CC7.2 | AU.L2-3.3.1 | AU-9 | V7.1.1 | PO.5.2 |
| CWE-77 | Command Injection | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.2 | SI-10 | V5.3.6 | PW.5.1 |
| CWE-94 | Code Injection | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.6 | SI-10 | V5.2.4 | PW.5.1 |
| CWE-119 | Buffer Overflow | SI-16 (Memory Protection) | CC6.1 | SI.L2-3.14.1 | SI-16 | V5.4.1 | PW.5.1 |
| CWE-125 | Out-of-Bounds Read | SI-16 (Memory Protection) | CC6.1 | SI.L2-3.14.1 | SI-16 | V5.4.2 | PW.5.1 |
| CWE-190 | Integer Overflow | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.2 | SI-10 | V5.4.3 | PW.5.1 |
| CWE-20 | Improper Input Validation | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.2 | SI-10 | V5.1.3 | PW.5.1 |
| CWE-264 | Permissions, Privileges, Access Controls | AC-3 (Access Enforcement) | CC6.1, CC6.3 | AC.L2-3.1.1 | AC-3 | V4.1.1 | PO.5.1 |
| CWE-284 | Improper Access Control | AC-3 (Access Enforcement) | CC6.1, CC6.3 | AC.L2-3.1.1 | AC-3 | V4.1.1 | PO.5.1 |
| CWE-295 | Improper Certificate Validation | SC-23 (Session Authenticity) | CC6.1, CC6.7 | SC.L2-3.13.8 | SC-23 | V9.2.1 | PO.5.2 |
| CWE-311 | Missing Encryption of Sensitive Data | SC-28 (Protection of Information at Rest) | CC6.1, CC6.7 | SC.L2-3.13.16 | SC-28 | V6.1.1 | PO.5.2 |
| CWE-312 | Cleartext Storage of Sensitive Information | SC-28 (Protection of Information at Rest) | CC6.1, CC6.7 | SC.L2-3.13.16 | SC-28 | V6.4.1 | PO.5.2 |
| CWE-319 | Cleartext Transmission of Sensitive Info | SC-8 (Transmission Confidentiality) | CC6.1, CC6.7 | SC.L2-3.13.8 | SC-8 | V9.1.1 | PO.5.2 |
| CWE-330 | Use of Insufficiently Random Values | SC-13 (Cryptographic Protection) | CC6.1 | SC.L2-3.13.11 | SC-13 | V6.3.1 | PO.5.2 |
| CWE-347 | Improper Verification of Crypto Signature | SC-13 (Cryptographic Protection) | CC6.1, CC6.7 | SC.L2-3.13.11 | SC-13 | V6.2.7 | PO.5.2 |
| CWE-362 | Race Condition | SI-16 (Memory Protection) | CC6.1 | SI.L2-3.14.1 | SI-16 | V11.1.6 | PW.5.1 |
| CWE-384 | Session Fixation | SC-23 (Session Authenticity) | CC6.1 | SC.L2-3.13.9 | SC-23 | V3.2.1 | PW.5.1 |
| CWE-416 | Use After Free | SI-16 (Memory Protection) | CC6.1 | SI.L2-3.14.1 | SI-16 | V5.4.1 | PW.5.1 |
| CWE-476 | NULL Pointer Dereference | SI-16 (Memory Protection) | CC6.1 | SI.L2-3.14.1 | SI-16 | V5.4.2 | PW.5.1 |
| CWE-522 | Insufficiently Protected Credentials | IA-5 (Authenticator Management) | CC6.1, CC6.6 | IA.L2-3.5.10 | IA-5 | V2.10.1 | PO.5.2 |
| CWE-601 | Open Redirect | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.2 | SI-10 | V5.1.5 | PW.5.1 |
| CWE-613 | Insufficient Session Expiration | AC-12 (Session Termination) | CC6.1 | AC.L2-3.1.10 | AC-12 | V3.3.1 | PW.5.1 |
| CWE-639 | Insecure Direct Object Reference (IDOR) | AC-3 (Access Enforcement) | CC6.1, CC6.3 | AC.L2-3.1.1 | AC-3 | V4.2.1 | PW.5.1 |
| CWE-706 | Use of Incorrectly-Resolved Name | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.2 | SI-10 | V5.1.3 | PW.5.1 |
| CWE-770 | Allocation of Resources Without Limits | SC-5 (Denial of Service Protection) | CC6.1, A1.2 | SC.L2-3.13.1 | SC-5 | V11.2.1 | PW.5.1 |
| CWE-776 | XML Entity Expansion (Billion Laughs) | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.6 | SI-10 | V5.5.2 | PW.5.1 |
| CWE-787 | Out-of-Bounds Write | SI-16 (Memory Protection) | CC6.1 | SI.L2-3.14.1 | SI-16 | V5.4.1 | PW.5.1 |
| CWE-829 | Inclusion of Untrusted Functionality | SC-18 (Mobile Code) | CC6.1 | SC.L2-3.13.13 | SC-18 | V14.2.1 | PW.5.1 |
| CWE-863 | Incorrect Authorization | AC-3 (Access Enforcement) | CC6.1, CC6.3 | AC.L2-3.1.1 | AC-3 | V4.1.2 | PW.5.1 |
| CWE-916 | Use of Password Hash With Insufficient Effort | IA-5 (Authenticator Management) | CC6.1 | IA.L2-3.5.10 | IA-5 | V2.4.1 | PO.5.2 |
| CWE-943 | Improper Neutralization of Data in Queries | SI-10 (Information Input Validation) | CC6.1 | SI.L2-3.14.2 | SI-10 | V5.3.4 | PW.5.1 |

#### IaC-Specific Mappings

| Misconfiguration | CIS Benchmark | NIST 800-53 | SOC2 | CMMC L2 |
|------------------|---------------|-------------|------|---------|
| Public S3 bucket / GCS bucket | CIS AWS 2.1.5 / CIS GCP 5.1 | AC-3, SC-7 | CC6.1, CC6.6 | AC.L2-3.1.3 |
| Unencrypted storage volume | CIS AWS 2.2.1 | SC-28 | CC6.1, CC6.7 | SC.L2-3.13.16 |
| Security group allows 0.0.0.0/0 | CIS AWS 5.2.1 | SC-7 | CC6.1, CC6.6 | SC.L2-3.13.1 |
| Logging disabled on resource | CIS AWS 3.1 | AU-2 (Audit Events) | CC7.1, CC7.2 | AU.L2-3.3.1 |
| IAM role with * permissions | CIS AWS 1.16 | AC-6 | CC6.3 | AC.L2-3.1.5 |
| No VPC flow logs | CIS AWS 3.9 | AU-12 (Audit Generation) | CC7.2 | AU.L2-3.3.1 |
| Pod running as root | CIS K8s 5.2.6 | AC-6, CM-7 | CC6.3, CC7.1 | AC.L2-3.1.5 |
| Missing network policy | CIS K8s 5.3.2 | SC-7, AC-4 | CC6.1 | SC.L2-3.13.1 |

#### Framework Coverage

| Framework | Version | Controls Mapped | Coverage |
|-----------|---------|-----------------|----------|
| NIST 800-53 | rev5 | 45 controls | Primary reference (canonical) |
| SOC2 Type II | 2017 | 7 criteria | CC6.x, CC7.x, CC8.x |
| CMMC Level 2 | v2.0 | 33 practices | AC, AU, IA, SC, SI families |
| FedRAMP Moderate | rev5 | 35 controls | Federal moderate baseline |
| OWASP ASVS | 4.0.3 | 7 requirements | V1, V5, V9, V10, V14 |
| NIST SSDF | 1.1 | 8 practices | PO, PW, RV groups |

---

### 3. GitHub Action (`cveriskpilot/compliance-scan-action`)

A composite GitHub Action that runs scanners and uploads results to CVERiskPilot.

#### Workflow YAML

```yaml
name: Compliance Scan
on:
  pull_request:
    branches: [main, develop]

permissions:
  contents: read
  pull-requests: write
  security-events: write

jobs:
  compliance-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Semgrep (SAST)
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/cwe-top-25
            p/security-audit
          generateSarif: true
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

      - name: Run Trivy (SCA + Container + IaC)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'json'
          output: 'trivy-results.json'
          severity: 'CRITICAL,HIGH,MEDIUM'

      - name: Generate SBOM (CycloneDX)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'cyclonedx'
          output: 'sbom.cdx.json'

      - name: Upload to CVERiskPilot
        uses: cveriskpilot/compliance-scan-action@v1
        with:
          api-key: ${{ secrets.CVERISKPILOT_API_KEY }}
          frameworks: 'SOC2,CMMC'
          severity-threshold: 'MEDIUM'
          fail-on-compliance-violation: true
          sarif-file: 'results.sarif'
          trivy-file: 'trivy-results.json'
          sbom-file: 'sbom.cdx.json'
          repository: ${{ github.repository }}
          branch: ${{ github.head_ref }}
          commit-sha: ${{ github.event.pull_request.head.sha }}
          pr-number: ${{ github.event.pull_request.number }}
```

#### Action Inputs

| Input                          | Required | Default   | Description                                |
|--------------------------------|----------|-----------|--------------------------------------------|
| `api-key`                      | Yes      | —         | CVERiskPilot API key (`crp_sk_live_*`)     |
| `frameworks`                   | Yes      | —         | Comma-separated framework list             |
| `severity-threshold`           | No       | `LOW`     | Minimum severity to include                |
| `fail-on-compliance-violation` | No       | `false`   | Fail the workflow on compliance violation   |
| `sarif-file`                   | No       | —         | Path to SARIF output file                  |
| `trivy-file`                   | No       | —         | Path to Trivy JSON output file             |
| `sbom-file`                    | No       | —         | Path to CycloneDX SBOM file                |
| `repository`                   | No       | auto      | Repository identifier                      |
| `branch`                       | No       | auto      | Branch name                                |
| `commit-sha`                   | No       | auto      | Commit SHA                                 |
| `pr-number`                    | No       | auto      | Pull request number                        |

---

### 4. GitLab CI Component

#### `.gitlab-ci.yml` Configuration

```yaml
include:
  - remote: 'https://app.cveriskpilot.com/ci/gitlab-template.yml'

variables:
  CVERISKPILOT_API_KEY: $CVERISKPILOT_API_KEY
  CVERISKPILOT_FRAMEWORKS: "SOC2,CMMC,FEDRAMP"
  CVERISKPILOT_SEVERITY_THRESHOLD: "MEDIUM"
  CVERISKPILOT_FAIL_ON_VIOLATION: "true"

stages:
  - test
  - security
  - compliance

semgrep:
  stage: security
  image: returntocorp/semgrep:latest
  script:
    - semgrep ci --sarif --output=results.sarif
  artifacts:
    paths:
      - results.sarif
    reports:
      sast: results.sarif

trivy-scan:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy fs --format json --output trivy-results.json .
    - trivy fs --format cyclonedx --output sbom.cdx.json .
  artifacts:
    paths:
      - trivy-results.json
      - sbom.cdx.json

compliance-scan:
  stage: compliance
  image: node:20-alpine
  needs: [semgrep, trivy-scan]
  script:
    - npx @cveriskpilot/scan
        --api-key "$CVERISKPILOT_API_KEY"
        --frameworks "$CVERISKPILOT_FRAMEWORKS"
        --severity-threshold "$CVERISKPILOT_SEVERITY_THRESHOLD"
        --sarif results.sarif
        --trivy trivy-results.json
        --sbom sbom.cdx.json
        --fail-on-violation "$CVERISKPILOT_FAIL_ON_VIOLATION"
        --gitlab-mr-note
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

#### GitLab MR Integration

When `--gitlab-mr-note` is passed, the CLI uses the GitLab MR Notes API
(`POST /api/v4/projects/:id/merge_requests/:iid/notes`) to post the compliance
report as a merge request comment. The `CI_JOB_TOKEN` or a `GITLAB_TOKEN` with
`api` scope is required.

---

### 5. CLI Tool (`npx @cveriskpilot/scan`)

A standalone CLI for local development, CI/CD pipelines, and git hook integration.

#### Installation

```bash
# Run directly (no install — always uses latest)
npx @cveriskpilot/scan@latest --help

# Global install
npm install -g @cveriskpilot/scan@latest

# Project dependency
npm install --save-dev @cveriskpilot/scan@latest
```

#### Usage Examples

```bash
# Basic scan with framework mapping
npx @cveriskpilot/scan \
  --api-key crp_sk_live_a1b2c3d4... \
  --frameworks SOC2,CMMC \
  --sarif results.sarif

# Full scan with multiple inputs
npx @cveriskpilot/scan \
  --api-key crp_sk_live_a1b2c3d4... \
  --frameworks SOC2,CMMC,FEDRAMP,SSDF \
  --severity-threshold HIGH \
  --sarif results.sarif \
  --trivy trivy-results.json \
  --sbom sbom.cdx.json \
  --fail-on-violation

# Using config file
npx @cveriskpilot/scan --config .cveriskpilotrc.json
```

#### Terminal Output Example

```
  CVERiskPilot Pipeline Compliance Scanner v1.0.0
  ================================================

  Uploading scan results...
    SARIF:     results.sarif (247 KB)
    Trivy:     trivy-results.json (89 KB)
    SBOM:      sbom.cdx.json (412 KB)

  Frameworks: SOC2 Type II, CMMC Level 2

  Scan Results
  ------------
  Total findings:       12
    CRITICAL:            1   ████
    HIGH:                3   ████████████
    MEDIUM:              5   ████████████████████
    LOW:                 3   ████████████

  Compliance Impact
  -----------------
  Controls affected:     8
  POAM entries created:  4

  Framework Verdicts
  ------------------
  SOC2 Type II:    FAIL   (3 controls violated: CC6.1, CC6.6, CC7.2)
  CMMC Level 2:    FAIL   (5 practices violated)

  Top Findings
  ------------
  CRITICAL  CWE-89   SQL Injection              src/api/users.ts:42
            Controls: SI-10, CC6.1, SI.L2-3.14.2

  HIGH      CWE-798  Hardcoded Credentials      src/config/db.ts:7
            Controls: IA-5, CC6.1, CC6.6, IA.L2-3.5.10

  HIGH      CWE-79   Cross-Site Scripting        src/views/profile.tsx:128
            Controls: SI-2, SI-3, CC6.1, SI.L2-3.14.1

  HIGH      CWE-22   Path Traversal              src/api/files.ts:91
            Controls: AC-4, CC6.1, AC.L2-3.1.3

  Full report: https://app.cveriskpilot.com/pipelines/scan_01JQXYZ123456

  VERDICT: FAIL (compliance violations detected)
  Exit code: 1
```

#### Configuration File (`.cveriskpilotrc.json`)

```json
{
  "apiKey": "${CVERISKPILOT_API_KEY}",
  "frameworks": ["SOC2", "CMMC"],
  "severityThreshold": "MEDIUM",
  "failOnViolation": true,
  "scanners": {
    "sarif": "results.sarif",
    "trivy": "trivy-results.json",
    "sbom": "sbom.cdx.json"
  },
  "exclude": {
    "paths": ["test/**", "docs/**", "vendor/**"],
    "cwes": []
  }
}
```

#### Git Hook Integration

```bash
# .git/hooks/pre-push
#!/bin/sh

echo "Running CVERiskPilot compliance scan..."

# Run Semgrep locally
semgrep --config auto --sarif --output /tmp/crp-sarif.json . 2>/dev/null

# Upload and check
npx @cveriskpilot/scan \
  --config .cveriskpilotrc.json \
  --sarif /tmp/crp-sarif.json \
  --fail-on-violation

exit_code=$?
if [ $exit_code -ne 0 ]; then
  echo ""
  echo "Push blocked: compliance violations detected."
  echo "Review findings at the URL above or run with --no-fail to override."
  exit 1
fi
```

---

### 6. Pipeline Policy Engine

Organizations configure compliance scanning policies that control verdict logic,
severity gates, grace periods, and automatic exceptions.

#### Policy Schema

```json
{
  "$schema": "https://app.cveriskpilot.com/schemas/pipeline-policy-v1.json",
  "version": "1",
  "orgId": "org_01JQXYZ...",
  "policies": [
    {
      "name": "Block CRITICAL findings affecting CMMC controls",
      "enabled": true,
      "action": "fail",
      "conditions": {
        "severity": ["CRITICAL"],
        "frameworks": ["CMMC"],
        "controlFamilies": ["*"]
      }
    },
    {
      "name": "Warn on HIGH findings affecting SOC2",
      "enabled": true,
      "action": "warn",
      "conditions": {
        "severity": ["HIGH"],
        "frameworks": ["SOC2"],
        "controlFamilies": ["CC6", "CC7"]
      }
    },
    {
      "name": "Grace period for new dependencies",
      "enabled": true,
      "action": "warn",
      "conditions": {
        "severity": ["CRITICAL", "HIGH"],
        "scannerType": ["SCA"],
        "ageInDays": { "lessThan": 7 }
      },
      "gracePeriod": {
        "days": 14,
        "escalateTo": "fail"
      }
    }
  ],
  "defaults": {
    "verdictOnNoFindings": "pass",
    "verdictOnParseError": "warn",
    "autoExceptions": {
      "testFiles": true,
      "vendoredCode": true,
      "documentationFiles": true
    },
    "severityMapping": {
      "CRITICAL": "fail",
      "HIGH": "fail",
      "MEDIUM": "warn",
      "LOW": "pass"
    }
  },
  "notifications": {
    "onFail": {
      "email": ["security-team@example.com"],
      "slack": "#security-alerts",
      "pagerduty": false
    },
    "onWarn": {
      "email": [],
      "slack": "#security-info"
    }
  }
}
```

#### Policy Evaluation Order

1. Check auto-exceptions (test files, vendor code, docs).
2. Apply grace periods for newly introduced dependencies.
3. Evaluate each policy rule in order (first match wins for each finding).
4. Apply default severity mapping for unmatched findings.
5. Aggregate verdicts: `fail` overrides `warn`, `warn` overrides `pass`.
6. Fire notifications based on aggregate verdict.

---

### 7. Auto-POAM Generation

When the Pipeline Compliance Scanner identifies findings that affect compliance controls
above the configured severity threshold, it automatically creates Plan of Action and
Milestones (POAM) entries.

#### POAM Entry Fields

| Field                    | Source                              | Example                              |
|--------------------------|-------------------------------------|--------------------------------------|
| Weakness ID              | Auto-generated                      | `POAM-2026-0342`                     |
| Weakness Name            | CWE title                           | SQL Injection                        |
| Weakness Description     | Finding title + file location        | SQL Injection in `src/api/users.ts:42` via unsanitized query parameter |
| Security Controls        | Mapping engine                       | SI-10, CC6.1, SI.L2-3.14.2          |
| Point of Contact         | Repository owner or assigned team    | @backend-team                        |
| Resources Required       | Auto-estimated by severity           | 4 engineering hours                  |
| Scheduled Completion     | SLA-based (configurable per org)     | 2026-04-11 (14 days for CRITICAL)   |
| Milestones               | Auto-generated from remediation type | 1. Fix input validation; 2. Deploy; 3. Rescan |
| Risk Level               | Severity + EPSS + KEV status         | Very High                            |
| Status                   | Initial                              | Open                                 |
| Source                   | Pipeline scan metadata               | PR #247, commit `a1b2c3d`, repo `org/api` |
| Evidence                 | Link to scan results                 | `https://app.cveriskpilot.com/pipelines/scan_01JQXYZ123456` |

#### SLA Defaults for POAM Milestones

| Severity  | Default Remediation Window | POAM Status if Overdue |
|-----------|---------------------------|------------------------|
| CRITICAL  | 14 days                   | Overdue — Escalated    |
| HIGH      | 30 days                   | Overdue                |
| MEDIUM    | 90 days                   | At Risk                |
| LOW       | 180 days                  | Tracking               |

#### Deduplication

POAM entries are deduplicated by the combination of (CWE, file path, control ID). If a
subsequent scan finds the same weakness in the same location affecting the same control,
the existing POAM entry is updated (last seen date, scan count) rather than creating a
duplicate.

#### Audit Trail

Every POAM entry maintains a timeline of events:

```
2026-03-28 14:30  Created by pipeline scan (PR #247, commit a1b2c3d)
2026-03-28 14:31  Assigned to @backend-team via repository CODEOWNERS
2026-03-29 09:15  Status changed to In Progress by @jane.doe
2026-04-02 16:40  Remediation deployed (PR #251, commit f8e9d0a)
2026-04-02 16:45  Rescan passed — finding resolved
2026-04-02 16:45  Status changed to Closed
```

---

## Scan Capabilities

### Dependency Scanning (SCA)

Software Composition Analysis identifies known vulnerabilities in third-party
dependencies.

**Input formats:** CycloneDX SBOM (JSON), Trivy JSON, OSV JSON

**Pipeline:**

```
SBOM / Trivy JSON
    |
    v
Parse dependency list (name, version, ecosystem)
    |
    v
CVE lookup (NVD API + CVERiskPilot enrichment cache)
    |
    v
CVE -> CWE mapping (NVD CWE classification)
    |
    v
CWE -> NIST 800-53 -> framework controls
    |
    v
EPSS score + KEV status enrichment
    |
    v
Risk-prioritized findings with compliance context
```

**NIST SSDF practice mapping for SCA:**

| SSDF Practice | Description | SCA Relevance |
|---------------|-------------|---------------|
| PO.1.1 | Identify and document governance and security requirements | Dependency policy enforcement |
| PS.1.1 | Acquire well-secured software components | SBOM analysis, known-vuln detection |
| PW.4.1 | Review and analyze human-readable code | Transitive dependency audit |
| PW.4.4 | Verify the integrity of acquired software | Hash verification, provenance |
| RV.1.1 | Identify vulnerabilities on an ongoing basis | Continuous SCA scanning |

### Static Analysis (SAST)

Static Application Security Testing analyzes source code for vulnerability patterns.

**Input format:** SARIF (Static Analysis Results Interchange Format)

**Supported SAST tools (via SARIF):**

| Tool | Rule Coverage | CWE Mapping Quality |
|------|--------------|---------------------|
| Semgrep | 3,000+ rules | Excellent (native CWE tags) |
| CodeQL | 2,500+ rules | Excellent (native CWE tags) |
| SonarQube | 5,000+ rules | Good (SARIF export with CWE) |
| ESLint (security plugins) | 200+ rules | Fair (requires CWE annotation) |
| Bandit (Python) | 150+ rules | Good (SARIF export with CWE) |
| Gosec (Go) | 100+ rules | Good (SARIF export with CWE) |

**CWE classification:**

SARIF results typically include CWE tags in the `rule.properties.tags` or
`rule.relationships` fields. When CWE tags are missing, the engine falls back to
rule-ID-to-CWE lookup tables maintained for each supported scanner.

### Secrets Detection

Detects hardcoded secrets, API keys, and credentials in source code.

**Detection methods:**

1. **Pattern-based:** Regular expressions for known secret formats.
2. **Entropy-based:** Shannon entropy analysis for high-randomness strings.
3. **Contextual:** Variable name analysis (`password`, `secret`, `api_key`, `token`).

**Supported secret patterns:**

| Pattern | Regex (simplified) | CWE | NIST Control |
|---------|-------------------|-----|-------------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | CWE-798 | IA-5, SC-12 |
| AWS Secret Key | `[A-Za-z0-9/+=]{40}` (in context) | CWE-798 | IA-5, SC-12 |
| GCP Service Account Key | `"type":\s*"service_account"` | CWE-798 | IA-5, SC-12 |
| GitHub Token | `gh[ps]_[A-Za-z0-9_]{36,}` | CWE-798 | IA-5, SC-12 |
| GitHub Fine-Grained Token | `github_pat_[A-Za-z0-9_]{82}` | CWE-798 | IA-5, SC-12 |
| GitLab Token | `glpat-[A-Za-z0-9\-_]{20,}` | CWE-798 | IA-5, SC-12 |
| Stripe Key | `sk_live_[A-Za-z0-9]{24,}` | CWE-798 | IA-5, SC-12 |
| Generic API Key | `[Aa]pi[_-]?[Kk]ey.*=.*[A-Za-z0-9]{20,}` | CWE-798 | IA-5, SC-12 |
| Private Key (PEM) | `-----BEGIN (RSA\|EC\|DSA) PRIVATE KEY-----` | CWE-321 | SC-12, SC-28 |
| JWT Secret | `jwt[_-]?secret.*=.*[A-Za-z0-9]{16,}` | CWE-798 | IA-5, SC-12 |
| Database URL | `(postgres\|mysql\|mongodb)://[^:]+:[^@]+@` | CWE-798 | IA-5, SC-28 |
| High Entropy String | Shannon entropy > 4.5 in assignment context | CWE-798 | IA-5, SC-12 |

**Compliance mapping for secrets:**

All secrets findings map to:
- **NIST 800-53:** IA-5 (Authenticator Management), SC-12 (Cryptographic Key Establishment and Management), SC-28 (Protection of Information at Rest)
- **SOC2:** CC6.1, CC6.6, CC6.7
- **CMMC:** IA.L2-3.5.10, SC.L2-3.13.10, SC.L2-3.13.16
- **ASVS:** V2.10.4, V6.4.1
- **SSDF:** PO.5.2 (Protect All Forms of Code)

### IaC Compliance Scanning

Infrastructure as Code scanning detects misconfigurations in deployment templates.

**Supported IaC formats:**

| Format | Tool | Rule Sets |
|--------|------|-----------|
| Terraform (HCL) | Trivy, tfsec (via SARIF) | CIS AWS, CIS GCP, CIS Azure, custom |
| Kubernetes YAML | Trivy, kubesec (via SARIF) | CIS Kubernetes, NSA hardening guide |
| CloudFormation | Trivy, cfn-nag (via SARIF) | CIS AWS, AWS Well-Architected |
| Dockerfile | Trivy | CIS Docker, Hadolint rules |
| Helm Charts | Trivy | CIS Kubernetes (rendered templates) |

**Example IaC finding with compliance context:**

```json
{
  "title": "Security group allows unrestricted inbound SSH",
  "severity": "HIGH",
  "file": "terraform/networking.tf",
  "line": 23,
  "cwe": "CWE-284",
  "cis_benchmark": "CIS AWS 5.2.2",
  "controls": [
    { "framework": "NIST 800-53", "control_id": "SC-7", "control_name": "Boundary Protection" },
    { "framework": "NIST 800-53", "control_id": "AC-4", "control_name": "Information Flow Enforcement" },
    { "framework": "SOC2", "control_id": "CC6.1" },
    { "framework": "SOC2", "control_id": "CC6.6" },
    { "framework": "CMMC", "control_id": "SC.L2-3.13.1" }
  ]
}
```

### SLSA Supply Chain Verification

Software Supply Chain Levels for Software Artifacts (SLSA) verification checks
build provenance and integrity.

**Checks performed:**

| Check | SLSA Level | SSDF Practice | NIST Control |
|-------|-----------|---------------|-------------|
| Build provenance exists | L1 | PW.6.1 | SA-10 |
| Provenance is signed | L2 | PW.6.2 | SA-10, SI-7 |
| Build ran on hosted service | L2 | PS.2.1 | SA-10 |
| Source is version-controlled | L2 | PS.1.1 | CM-2 |
| Build is reproducible | L3 | PW.6.2 | SA-10 |
| Two-person review | L4 | PW.4.1 | CM-3 |

---

## Dashboard & Reporting

### Pipeline Dashboard (`/pipelines`)

A dedicated dashboard view for CI/CD compliance scanning activity.

#### Widgets

| Widget | Description | Data Source |
|--------|-------------|-------------|
| **Scan History Timeline** | Chronological list of all pipeline scans with pass/fail/warn status, expandable to show findings | `GET /api/pipeline/scans` |
| **Pass/Fail Rate by Repository** | Stacked bar chart showing compliance scan outcomes per repo over time | Aggregated scan results |
| **Most-Violated Controls** | Ranked list of NIST 800-53 controls most frequently triggered across all repos | CWE-control mapping aggregation |
| **Compliance Score Trends** | Line chart showing per-framework compliance scores over 30/90/180 days | Rolling framework score calculation |
| **POAM Backlog** | Count of open pipeline-generated POAMs by severity and framework | POAM entries with `source=pipeline` |
| **Remediation Velocity** | Mean time from pipeline POAM creation to closure, trended weekly | POAM lifecycle timestamps |

### Developer Compliance Scorecard

Per-repository compliance scorecards accessible from the Pipeline Dashboard.

```
Repository: org/api-service
Last scan:  2026-03-28 14:30 UTC (PR #247)
Scanner:    Semgrep + Trivy

Framework Compliance Scores
---------------------------
SOC2 Type II:       87%  ██████████████████░░  (3 controls with open findings)
CMMC Level 2:       79%  ████████████████░░░░  (5 practices with open findings)
FedRAMP Moderate:   84%  █████████████████░░░  (4 controls with open findings)
NIST SSDF:          92%  ███████████████████░  (1 practice with open findings)

Control Coverage Gaps
---------------------
SI-10  Information Input Validation       4 open findings (CWE-89, CWE-78)
IA-5   Authenticator Management           2 open findings (CWE-798)
SC-7   Boundary Protection                2 open findings (CWE-918, IaC)
AC-4   Information Flow Enforcement       1 open finding  (CWE-22)
AU-2   Audit Events                       1 open finding  (IaC logging)

Remediation Velocity
--------------------
Avg time to fix CRITICAL:  3.2 days  (target: 14 days)
Avg time to fix HIGH:      8.7 days  (target: 30 days)
Avg time to fix MEDIUM:   22.1 days  (target: 90 days)
```

---

## API Reference

### Pipeline Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/pipeline/scan` | Submit scan results for compliance analysis | API Key |
| `GET` | `/api/pipeline/scans` | List scan history (paginated) | API Key or Session |
| `GET` | `/api/pipeline/scans/:scanId` | Get scan details with findings | API Key or Session |
| `GET` | `/api/pipeline/policies` | Get organization pipeline policies | Session (SECURITY_ADMIN+) |
| `PUT` | `/api/pipeline/policies` | Update organization pipeline policies | Session (SECURITY_ADMIN+) |
| `GET` | `/api/pipeline/controls/mapping` | Get CWE-to-control mapping reference | API Key or Session |
| `GET` | `/api/pipeline/repos` | List scanned repositories with scores | API Key or Session |
| `GET` | `/api/pipeline/repos/:repo/scorecard` | Get repository compliance scorecard | API Key or Session |

### `GET /api/pipeline/scans`

```http
GET /api/pipeline/scans?page=1&limit=20&repo=org/api&verdict=fail
Authorization: Bearer crp_sk_live_a1b2c3d4...
```

**Query Parameters:**

| Parameter  | Type   | Description                              |
|------------|--------|------------------------------------------|
| `page`     | number | Page number (default: 1)                 |
| `limit`    | number | Results per page (default: 20, max: 100) |
| `repo`     | string | Filter by repository                     |
| `verdict`  | string | Filter by verdict: `pass`, `fail`, `warn`|
| `framework`| string | Filter by framework                      |
| `since`    | string | ISO date — scans after this date         |
| `until`    | string | ISO date — scans before this date        |

**Response:**

```json
{
  "scans": [
    {
      "scan_id": "scan_01JQXYZ123456",
      "repository": "org/api-service",
      "branch": "feature/user-api",
      "commit_sha": "a1b2c3d4e5f6...",
      "pr_number": 247,
      "verdict": "fail",
      "total_findings": 12,
      "controls_affected": 8,
      "poam_entries_created": 4,
      "frameworks": ["SOC2", "CMMC"],
      "created_at": "2026-03-28T14:30:00Z"
    }
  ],
  "total": 156,
  "page": 1,
  "totalPages": 8,
  "pagination": "offset"
}
```

### `GET /api/pipeline/controls/mapping`

Returns the full CWE-to-compliance mapping table for reference and tooling integration.

```http
GET /api/pipeline/controls/mapping?cwe=CWE-89&framework=SOC2
Authorization: Bearer crp_sk_live_a1b2c3d4...
```

**Query Parameters:**

| Parameter   | Type   | Description                          |
|-------------|--------|--------------------------------------|
| `cwe`       | string | Filter by CWE ID (e.g., `CWE-89`)   |
| `framework` | string | Filter by framework                  |
| `family`    | string | Filter by NIST control family (e.g., `SI`) |

**Response:**

```json
{
  "mappings": [
    {
      "cwe_id": "CWE-89",
      "cwe_name": "SQL Injection",
      "controls": [
        {
          "nist_800_53": { "id": "SI-10", "name": "Information Input Validation", "family": "SI" },
          "soc2": [{ "id": "CC6.1", "name": "Logical and Physical Access Controls" }],
          "cmmc": [{ "id": "SI.L2-3.14.2", "name": "Malicious Code Protection" }],
          "fedramp": [{ "id": "SI-10", "baseline": "Moderate" }],
          "asvs": [{ "id": "V5.3.4", "level": 1 }],
          "ssdf": [{ "id": "PW.5.1", "name": "Validate All Inputs" }]
        }
      ]
    }
  ],
  "total": 1
}
```

---

## Example: Complete GitHub Actions Workflow

A production-ready workflow for a Node.js application:

```yaml
# .github/workflows/compliance-scan.yml
name: CVERiskPilot Compliance Scan

on:
  pull_request:
    branches: [main, release/*]
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write
  security-events: write

env:
  NODE_VERSION: '20'

jobs:
  compliance-scan:
    name: Compliance Scan
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      # ---------------------------------------------------------------
      # 1. Checkout
      # ---------------------------------------------------------------
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for accurate diff

      # ---------------------------------------------------------------
      # 2. SAST — Semgrep
      # ---------------------------------------------------------------
      - name: Run Semgrep
        id: semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/cwe-top-25
            p/typescript
            p/nodejs
            p/security-audit
            p/secrets
          generateSarif: true
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
        continue-on-error: true

      # ---------------------------------------------------------------
      # 3. SCA + IaC — Trivy
      # ---------------------------------------------------------------
      - name: Run Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'json'
          output: 'trivy-vuln.json'
          severity: 'CRITICAL,HIGH,MEDIUM,LOW'
          exit-code: '0'

      - name: Run Trivy IaC scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          format: 'json'
          output: 'trivy-iac.json'
          exit-code: '0'

      # ---------------------------------------------------------------
      # 4. SBOM Generation
      # ---------------------------------------------------------------
      - name: Generate CycloneDX SBOM
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'cyclonedx'
          output: 'sbom.cdx.json'

      # ---------------------------------------------------------------
      # 5. Upload to CVERiskPilot
      # ---------------------------------------------------------------
      - name: CVERiskPilot Compliance Scan
        id: crp-scan
        uses: cveriskpilot/compliance-scan-action@v1
        with:
          api-key: ${{ secrets.CVERISKPILOT_API_KEY }}
          frameworks: 'SOC2,CMMC,FEDRAMP'
          severity-threshold: 'MEDIUM'
          fail-on-compliance-violation: true
          sarif-file: 'results.sarif'
          trivy-file: 'trivy-vuln.json'
          trivy-iac-file: 'trivy-iac.json'
          sbom-file: 'sbom.cdx.json'

      # ---------------------------------------------------------------
      # 6. Upload SARIF to GitHub Security tab
      # ---------------------------------------------------------------
      - name: Upload SARIF to GitHub
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

      # ---------------------------------------------------------------
      # 7. Summary
      # ---------------------------------------------------------------
      - name: Write job summary
        if: always()
        run: |
          echo "## CVERiskPilot Compliance Scan Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Verdict:** ${{ steps.crp-scan.outputs.verdict }}" >> $GITHUB_STEP_SUMMARY
          echo "**Findings:** ${{ steps.crp-scan.outputs.total-findings }}" >> $GITHUB_STEP_SUMMARY
          echo "**Controls Affected:** ${{ steps.crp-scan.outputs.controls-affected }}" >> $GITHUB_STEP_SUMMARY
          echo "**POAM Entries Created:** ${{ steps.crp-scan.outputs.poam-entries-created }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "[View Full Report](${{ steps.crp-scan.outputs.dashboard-url }})" >> $GITHUB_STEP_SUMMARY
```

---

## Example: PR Comment Output

When the GitHub Action or GitLab CI component runs, it posts the following comment
to the pull request or merge request:

```markdown
## CVERiskPilot Compliance Scan — FAIL

**Repository:** org/api-service
**Branch:** feature/user-api
**Commit:** a1b2c3d
**Scan ID:** scan_01JQXYZ123456

### Summary

| Metric | Value |
|--------|-------|
| Total Findings | 12 |
| Critical | 1 |
| High | 3 |
| Medium | 5 |
| Low | 3 |
| Compliance Controls Affected | 8 |
| POAM Entries Created | 4 |

### Framework Verdicts

| Framework | Verdict | Violated Controls |
|-----------|---------|-------------------|
| SOC2 Type II | FAIL | CC6.1, CC6.6, CC7.2 |
| CMMC Level 2 | FAIL | SI.L2-3.14.1, SI.L2-3.14.2, IA.L2-3.5.10, AC.L2-3.1.3, SC.L2-3.13.1 |
| FedRAMP Moderate | FAIL | SI-10, IA-5, SC-7, AC-4 |

### Findings

| # | Severity | CWE | Finding | File | NIST Control | SOC2 | CMMC |
|---|----------|-----|---------|------|-------------|------|------|
| 1 | CRITICAL | CWE-89 | SQL Injection in query builder | `src/api/users.ts:42` | SI-10 | CC6.1 | SI.L2-3.14.2 |
| 2 | HIGH | CWE-798 | Hardcoded database password | `src/config/db.ts:7` | IA-5 | CC6.1, CC6.6 | IA.L2-3.5.10 |
| 3 | HIGH | CWE-79 | Reflected XSS in profile render | `src/views/profile.tsx:128` | SI-2, SI-3 | CC6.1 | SI.L2-3.14.1 |
| 4 | HIGH | CWE-22 | Path traversal in file download | `src/api/files.ts:91` | AC-4 | CC6.1 | AC.L2-3.1.3 |
| 5 | MEDIUM | CWE-352 | Missing CSRF token on form | `src/views/settings.tsx:45` | SC-23 | CC6.1 | SC.L2-3.13.9 |
| 6 | MEDIUM | CWE-532 | Password logged in debug output | `src/auth/login.ts:33` | AU-9 | CC7.2 | AU.L2-3.3.1 |
| 7 | MEDIUM | CWE-284 | Security group open to 0.0.0.0/0 | `terraform/sg.tf:23` | SC-7 | CC6.6 | SC.L2-3.13.1 |
| 8 | MEDIUM | CWE-311 | Unencrypted S3 bucket | `terraform/storage.tf:8` | SC-28 | CC6.7 | SC.L2-3.13.16 |
| 9 | MEDIUM | CWE-778 | CloudTrail logging disabled | `terraform/monitoring.tf:3` | AU-2 | CC7.2 | AU.L2-3.3.1 |
| 10 | LOW | CWE-400 | No rate limiting on API endpoint | `src/api/search.ts:12` | SC-5 | CC6.1 | SC.L2-3.13.1 |
| 11 | LOW | CWE-200 | Verbose error exposes stack trace | `src/middleware/error.ts:8` | SC-28 | CC6.1 | SC.L2-3.13.16 |
| 12 | LOW | CWE-326 | TLS 1.1 still enabled | `terraform/lb.tf:15` | SC-13 | CC6.1 | SC.L2-3.13.11 |

### POAM Entries Created

| POAM ID | Weakness | Controls | Due Date | Risk Level |
|---------|----------|----------|----------|------------|
| POAM-2026-0342 | SQL Injection (CWE-89) | SI-10, CC6.1, SI.L2-3.14.2 | 2026-04-11 | Very High |
| POAM-2026-0343 | Hardcoded Credentials (CWE-798) | IA-5, CC6.1, IA.L2-3.5.10 | 2026-04-11 | Very High |
| POAM-2026-0344 | Reflected XSS (CWE-79) | SI-2, CC6.1, SI.L2-3.14.1 | 2026-04-27 | High |
| POAM-2026-0345 | Path Traversal (CWE-22) | AC-4, CC6.1, AC.L2-3.1.3 | 2026-04-27 | High |

[View full report on CVERiskPilot Dashboard](https://app.cveriskpilot.com/pipelines/scan_01JQXYZ123456)

---
*CVERiskPilot Pipeline Compliance Scanner v1.0 — 100% Veteran Owned*
```

---

## Comparison: CVERiskPilot vs Alternatives

| Capability | CVERiskPilot Pipeline Scanner | Snyk | SonarQube | Semgrep | GitHub Advanced Security |
|------------|-------------------------------|------|-----------|---------|--------------------------|
| **Scans Code (SAST)** | Via Semgrep/CodeQL (SARIF ingestion) | Yes (proprietary) | Yes (proprietary) | Yes (open source + pro) | Yes (CodeQL) |
| **Scans Dependencies (SCA)** | Via Trivy/SBOM (CycloneDX ingestion) | Yes | Limited | No | Yes (Dependabot) |
| **Scans IaC** | Via Trivy (JSON ingestion) | Yes (IaC) | No | Yes (HCL rules) | No |
| **Secrets Detection** | Via Semgrep + built-in patterns | No | No | Yes | Yes |
| **NIST 800-53 Mapping** | Yes (45 controls) | No | No | No | No |
| **SOC2 Mapping** | Yes (7 criteria) | No | No | No | No |
| **CMMC Mapping** | Yes (33 practices) | No | No | No | No |
| **FedRAMP Mapping** | Yes (35 controls) | No | No | No | No |
| **OWASP ASVS Mapping** | Yes (7 requirements) | No | Partial | No | No |
| **NIST SSDF Mapping** | Yes (8 practices) | No | No | No | No |
| **Auto-POAM Generation** | Yes | No | No | No | No |
| **Compliance Verdict in CI/CD** | Yes (pass/fail/warn gate) | No (vuln count only) | Yes (quality gate, no compliance) | No (vuln count only) | No (alert count only) |
| **Multi-Framework Scoring** | Yes (per-repo scorecards) | No | No | No | No |
| **Pipeline Policy Engine** | Yes (per-org configurable) | Yes (policies) | Yes (quality profiles) | Yes (policies) | No |
| **PR/MR Comment with Controls** | Yes (full compliance table) | Yes (vuln list only) | Yes (quality only) | Yes (vuln list only) | Yes (vuln list only) |
| **Audit Trail to Commit** | Yes (POAM linked to PR/commit) | No | No | No | Partial |
| **Self-Serve Free Tier** | Yes (unlimited local, 3 uploads/month) | Yes (limited) | Yes (Community) | Yes (open source) | Yes (public repos) |
| **Pricing (Team)** | From $49/mo (Pro) | From $98/mo | From $150/mo | From $40/dev/mo | $49/user/mo |

**Key differentiator:** CVERiskPilot is the only tool that combines code scanning
results with compliance framework mapping and automatic POAM generation in a single
CI/CD workflow. Every other tool stops at vulnerability detection — CVERiskPilot
continues through to compliance posture management.

---

## Deployment Guide

### GitHub Actions

**Step 1: Create an API Key**

1. Log in to CVERiskPilot at `https://app.cveriskpilot.com`.
2. Navigate to **Settings > API Keys**.
3. Click **Create Key**, name it (e.g., `github-ci-pipeline`), and copy the key.
4. The key will be in the format `crp_sk_live_...`.

**Step 2: Add the Key to GitHub Secrets**

1. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
2. Click **New repository secret**.
3. Name: `CVERISKPILOT_API_KEY`, Value: your `crp_sk_live_...` key.
4. Optionally add `SEMGREP_APP_TOKEN` if using Semgrep App integration.

**Step 3: Add the Workflow**

Create `.github/workflows/compliance-scan.yml` using the complete example from the
[Example: Complete GitHub Actions Workflow](#example-complete-github-actions-workflow)
section above.

**Step 4: Configure Policy**

1. In CVERiskPilot, go to **Settings > Pipeline Policies**.
2. Configure which frameworks to evaluate, severity thresholds, and grace periods.
3. Alternatively, set policies via `PUT /api/pipeline/policies`.

**Step 5: Verify**

1. Open a pull request.
2. The workflow will run automatically.
3. Check the PR comment for compliance results.
4. View the full report on the Pipeline Dashboard.

---

### GitLab CI

**Step 1: Create an API Key**

Same as GitHub step 1 above.

**Step 2: Add CI/CD Variable**

1. In your GitLab project, go to **Settings > CI/CD > Variables**.
2. Add variable: Key = `CVERISKPILOT_API_KEY`, Value = your key.
3. Check **Mask variable** and **Protect variable**.

**Step 3: Add the Configuration**

Add the `include` and job definitions from the
[GitLab CI Component](#4-gitlab-ci-component) section to your `.gitlab-ci.yml`.

**Step 4: Configure MR Integration**

To post compliance results as MR notes, add a `GITLAB_TOKEN` CI/CD variable
with a token that has `api` scope, or use the built-in `CI_JOB_TOKEN` (requires
appropriate project permissions).

---

### CLI (Local / Custom CI)

**Step 1: Install**

```bash
npm install -g @cveriskpilot/scan@latest
```

**Step 2: Configure**

Create `.cveriskpilotrc.json` in your repository root:

```json
{
  "apiKey": "${CVERISKPILOT_API_KEY}",
  "frameworks": ["SOC2", "CMMC"],
  "severityThreshold": "MEDIUM",
  "failOnViolation": true,
  "scanners": {
    "sarif": "results.sarif",
    "trivy": "trivy-results.json",
    "sbom": "sbom.cdx.json"
  }
}
```

Set the environment variable:

```bash
export CVERISKPILOT_API_KEY=crp_sk_live_a1b2c3d4...
```

**Step 3: Run**

```bash
# Run scanners first
semgrep --config auto --sarif --output results.sarif .
trivy fs --format json --output trivy-results.json .
trivy fs --format cyclonedx --output sbom.cdx.json .

# Then upload and evaluate
npx @cveriskpilot/scan --config .cveriskpilotrc.json
```

**Step 4: Add Git Hook (optional)**

Copy the pre-push hook from the [Git Hook Integration](#git-hook-integration) section
to `.git/hooks/pre-push` and make it executable:

```bash
chmod +x .git/hooks/pre-push
```

For team-wide hooks, use a shared hooks directory:

```bash
git config core.hooksPath .githooks/
```

And commit the `.githooks/pre-push` script to the repository.

---

### Custom CI Systems (Jenkins, CircleCI, Azure Pipelines, etc.)

The CLI tool works in any environment with Node.js 20+. The general pattern is:

1. Run your preferred scanners and collect output files.
2. Install the CLI: `npm install -g @cveriskpilot/scan@latest`.
3. Set the `CVERISKPILOT_API_KEY` environment variable.
4. Run: `npx @cveriskpilot/scan --frameworks SOC2,CMMC --sarif results.sarif --fail-on-violation`.
5. Check the exit code: 0 = pass, 1 = fail (compliance violation), 2 = error.

---

## Appendix: Glossary

| Term | Definition |
|------|-----------|
| **CWE** | Common Weakness Enumeration — a taxonomy of software weakness types |
| **NIST 800-53** | Security and Privacy Controls for Information Systems (rev5) |
| **SOC2** | Service Organization Control 2 — trust services criteria for service providers |
| **CMMC** | Cybersecurity Maturity Model Certification — DoD contractor requirements |
| **FedRAMP** | Federal Risk and Authorization Management Program |
| **ASVS** | OWASP Application Security Verification Standard |
| **SSDF** | NIST Secure Software Development Framework |
| **POAM** | Plan of Action and Milestones — remediation tracking document |
| **SARIF** | Static Analysis Results Interchange Format (OASIS standard) |
| **CycloneDX** | OASIS SBOM standard for software bill of materials |
| **SBOM** | Software Bill of Materials |
| **SLSA** | Supply-chain Levels for Software Artifacts |
| **SCA** | Software Composition Analysis (dependency scanning) |
| **SAST** | Static Application Security Testing (source code analysis) |
| **IaC** | Infrastructure as Code |
| **KEV** | CISA Known Exploited Vulnerabilities catalog |
| **EPSS** | Exploit Prediction Scoring System |
