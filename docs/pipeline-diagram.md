# CVERiskPilot Pipeline — Architecture Diagram

## Pipeline Flow

```
                          CLI / GitHub Action / CI Runner
                          ================================

  +------------------+     +------------------+     +------------------+     +------------------+
  |   SBOM Scanner   |     | Secrets Scanner  |     |   IaC Scanner    |     | API Route Scanner|
  |                  |     |                  |     |                  |     |                  |
  | package-lock     |     | 30+ regex rules  |     | Terraform        |     | Next.js routes   |
  | yarn.lock        |     | entropy detect   |     | Dockerfile       |     | Express handlers |
  | requirements.txt |     | .env, config     |     | K8s YAML         |     | Auth checks      |
  | go.sum, Cargo    |     | private keys     |     | CloudFormation   |     | CSRF, input val  |
  +--------+---------+     +--------+---------+     +--------+---------+     +--------+---------+
           |                        |                        |                        |
           +------------------------+------------------------+------------------------+
                                    |
                              All run in parallel
                                    |
                                    v
                     +------------------------------+
                     |      Finding Aggregator       |
                     |                              |
                     |  87 findings detected        |
                     |  10 CRITICAL / 47 HIGH       |
                     |  26 MEDIUM / 4 LOW           |
                     +-------------+----------------+
                                   |
                                   v
                     +------------------------------+
                     |      Verdict Engine           |
                     |                              |
                     |  TRUE_POSITIVE:  48 (55%)     |
                     |  FALSE_POSITIVE: 26 (30%)     |
                     |  NEEDS_REVIEW:   13 (15%)     |
                     |                              |
                     |  Auto-dismiss:               |
                     |  - test fixtures             |
                     |  - .gitignored files         |
                     |  - variable interpolation    |
                     +-------------+----------------+
                                   |
                                   v
                     +------------------------------+
                     |     CWE Bridge                |
                     |                              |
                     |  Finding --> CWE ID          |
                     |  CWE-862 (Missing AuthZ)     |
                     |  CWE-798 (Hardcoded Creds)   |
                     |  CWE-306 (Missing AuthN)     |
                     |  CWE-200 (Info Exposure)     |
                     +-------------+----------------+
                                   |
                                   v
                     +------------------------------+
                     |  Compliance Mapping Engine    |
                     |                              |
                     |  CWE --> Control IDs         |
                     |  70+ CWEs mapped to          |
                     |  135 controls across          |
                     |  6 frameworks                 |
                     +-------------+----------------+
                                   |
                    +--------------+--------------+
                    |              |              |
                    v              v              v
          +----------------+ +----------+ +-------------+
          | NIST 800-53    | | SOC 2    | | CMMC L2     |
          | 45 controls    | | 7 ctrls  | | 33 controls |
          | SI-10, SA-11   | | CC6.1    | | SI.L2-3.14  |
          | AC-4, SC-28    | | CC8.1    | | AC.L2-3.1   |
          +----------------+ +----------+ +-------------+
                    |              |              |
                    v              v              v
          +----------------+ +----------+ +-------------+
          | FedRAMP Mod    | | ASVS 4.0 | | NIST SSDF   |
          | 35 controls    | | 7 ctrls  | | 8 controls  |
          | SI-2, SA-11    | | V1.2     | | PO.1, PS.1  |
          +----------------+ +----------+ +-------------+
                                   |
                                   v
                     +------------------------------+
                     |         Output Layer          |
                     +------------------------------+
                     |                              |
          +----------+----------+----------+--------+--------+
          |          |          |          |        |        |
          v          v          v          v        v        v
       Terminal    JSON      SARIF    Markdown   PR Bot   Dashboard
       (table)   (CI/CD)   (GitHub   (reports)  (GitHub  (paid tier)
                           Security)            Action)
                                                          |
                                                          v
                                                 +----------------+
                                                 | Paid Features  |
                                                 |                |
                                                 | CVSS + EPSS    |
                                                 | Fix versions   |
                                                 | AI remediation |
                                                 | Auto-POAM      |
                                                 | Jira sync      |
                                                 | PDF reports    |
                                                 +----------------+
```

## Data Flow Summary

```
Finding --> CWE --> NIST 800-53 --> SOC 2 / CMMC / FedRAMP / ASVS / SSDF
```

The CWE (Common Weakness Enumeration) acts as the Rosetta Stone:
- Every scanner speaks CWE
- Every compliance framework maps from CWE
- The bridge is fully automated — no manual mapping required


## Free vs Paid Boundary

```
+-------------------------------------------+-------------------------------------------+
|              FREE (CLI)                   |              PAID (API Key)               |
+-------------------------------------------+-------------------------------------------+
| 4 scanners (deps, secrets, IaC, API)      | All free features, plus:                  |
| 6 compliance frameworks                   | CVSS scores per finding                   |
| 135 control mappings                      | EPSS exploit probability                  |
| Verdict classification (TP/FP/Review)     | CISA KEV status                           |
| Terminal, JSON, SARIF, Markdown output    | Fix versions + advisory URLs              |
| PR comments via GitHub Action             | AI remediation guidance                   |
| SARIF upload to GitHub Security tab       | Dashboard upload + historical trends      |
| Offline-first, no network required        | Auto-POAM generation                      |
| No account, no credit card               | Jira / ServiceNow sync                    |
|                                           | Executive PDF reports                     |
+-------------------------------------------+-------------------------------------------+
```
