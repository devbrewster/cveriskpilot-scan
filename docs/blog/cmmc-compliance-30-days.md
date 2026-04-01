# CMMC Level 2 in 30 Days: A Defense Contractor's Compliance Playbook

*The CMMC Level 2 deadline is November 10, 2026. Here is a week-by-week playbook to get from "we handle CUI somewhere" to "assessment-ready" in 30 days — with the tooling to automate most of it.*

---

## The Clock Is Ticking

On November 10, 2026, the Cybersecurity Maturity Model Certification (CMMC) Phase 2 rule takes effect. Every defense contractor handling Controlled Unclassified Information (CUI) will need a Level 2 assessment — either self-assessed or conducted by a certified C3PAO — before they can bid on or continue work on DoD contracts.

Level 2 maps directly to the 110 security practices in NIST SP 800-171 Rev 2. You need to implement all 110, document your compliance posture in a System Security Plan (SSP), generate Plans of Action and Milestones (POAMs) for any gaps, and calculate your Supplier Performance Risk System (SPRS) score.

Most contractors hire consultants at $5K-$50K to do this over 3-6 months. Here is how to do it in 30 days with a systematic approach and the right tooling.

---

## Understanding Your SPRS Score

Before diving into the playbook, you need to understand the scoring system. Your SPRS score ranges from **-203 to 110**.

- **110**: Perfect score. All 110 NIST 800-171 practices fully implemented.
- **0 to 110**: Reasonable posture. Some gaps but generally compliant.
- **Below 0**: Significant gaps. Many practices not implemented.
- **-203**: Worst possible score. Nothing implemented.

Each of the 110 practices carries a point value of 1, 3, or 5 depending on its security impact. Your SPRS score starts at 110 and is reduced by the value of each unimplemented practice. The DoD already requires you to submit your SPRS score to the SPRS portal — CMMC Level 2 formalizes the assessment behind that number.

For most contracts, you need a score of **110** (all practices met) or a documented POAM for every gap, with milestones and deadlines for closing them.

---

## Week 1: Scoping and Gap Analysis

### Day 1-2: Define Your CUI Boundary

Before scanning anything, you need to know what systems handle CUI. This is the scoping step that most contractors get wrong — they either scope too broadly (every system in the company) or too narrowly (just the file share).

Your CUI boundary includes:

- **Systems that process CUI**: workstations, servers, cloud instances, email systems
- **Systems that store CUI**: file servers, databases, backup systems, SaaS tools
- **Systems that transmit CUI**: VPNs, email gateways, file transfer tools
- **Security protection assets**: firewalls, SIEM, endpoint protection that protects the above

Document this boundary. It becomes part of your SSP.

### Day 3-4: Run Your Initial Scan

Point your scanner at everything inside the CUI boundary. You need visibility into:

- **Software dependencies**: What libraries and packages are installed? Are any vulnerable?
- **Infrastructure configuration**: Are cloud resources, containers, and servers hardened?
- **Secrets exposure**: Are API keys, credentials, or tokens committed to source code?

```bash
npx @cveriskpilot/scan --preset defense
```

This command runs three scanners in parallel — SBOM analysis (CVE/EPSS/KEV enrichment), IaC configuration checks, and secrets detection — then maps every finding to NIST 800-171 control families.

The output gives you a starting point: how many findings across which NIST 800-171 families, and which are critical vs. informational.

### Day 5-7: Categorize Findings by Control Family

NIST 800-171 organizes its 110 practices into 14 control families:

| Family | Practices | What It Covers |
|--------|-----------|---------------|
| Access Control (AC) | 22 | Who can access what, least privilege, remote access |
| Awareness & Training (AT) | 3 | Security training for personnel |
| Audit & Accountability (AU) | 9 | Logging, monitoring, audit trail protection |
| Configuration Management (CM) | 9 | Baseline configs, change control, least functionality |
| Identification & Authentication (IA) | 11 | User identity, MFA, password policies |
| Incident Response (IR) | 3 | Incident handling, reporting, testing |
| Maintenance (MA) | 6 | System maintenance controls |
| Media Protection (MP) | 9 | CUI on removable media, sanitization |
| Personnel Security (PS) | 2 | Screening, termination procedures |
| Physical Protection (PE) | 6 | Physical access controls, monitoring |
| Risk Assessment (RA) | 2 | Vulnerability scanning, risk assessments |
| Security Assessment (CA) | 4 | System security plans, assessments |
| System & Communications Protection (SC) | 16 | Encryption, boundary protection, session management |
| System & Information Integrity (SI) | 7 | Flaw remediation, monitoring, alerts |

Map each finding to the control family it affects. CVERiskPilot does this automatically using its CWE-to-NIST mapping engine — every vulnerability with a CWE identifier gets mapped to the specific 800-171 practices it threatens.

By the end of Week 1, you should have:

- A documented CUI boundary
- A complete scan of systems within that boundary
- A gap analysis showing which control families have findings
- An estimated SPRS score

---

## Week 2: Remediate Critical Findings

### Priority 1: KEV Items (Days 8-9)

If any of your findings appear on CISA's Known Exploited Vulnerabilities (KEV) catalog, those are your top priority. KEV items are actively exploited in the wild. They represent immediate risk to your CUI, and assessors will flag them instantly.

CVERiskPilot enriches every CVE with KEV status automatically. Filter your findings by KEV = true, and patch or mitigate every one.

### Priority 2: High-EPSS Vulnerabilities (Days 10-11)

After KEV items, focus on vulnerabilities with high Exploit Prediction Scoring System (EPSS) scores. EPSS predicts the probability of exploitation in the next 30 days. A CVE with EPSS > 0.7 has a 70% chance of being exploited within a month — even if its CVSS score is only "Medium."

This is the intelligence layer that separates prioritized remediation from "fix everything at once" panic. Address the findings most likely to be exploited first.

### Priority 3: Secrets and Credential Exposure (Day 12)

Any secrets detected in your codebase — API keys, tokens, private keys, connection strings — need immediate rotation. This affects multiple NIST 800-171 families:

- **IA (Identification & Authentication)**: Authenticator management (3.5.1-3.5.11)
- **SC (System & Communications Protection)**: Cryptographic key management (3.13.10-3.13.11)
- **AC (Access Control)**: Account management and least privilege (3.1.1-3.1.2)

Rotate every exposed secret. Update your secret management practices to prevent recurrence. Use a vault or secrets manager, never hardcode credentials.

### Priority 4: Configuration Gaps (Days 13-14)

IaC scanner findings typically map to Configuration Management (CM) and System & Communications Protection (SC) families. Common issues:

- Docker containers running as root (CM-7, least functionality)
- Missing TLS configuration (SC-8, transmission confidentiality)
- Overly permissive IAM policies (AC-3, AC-6, access enforcement and least privilege)
- Missing logging configuration (AU-2, AU-3, event logging)

Fix these systematically. Each fix improves your SPRS score.

---

## Week 3: Build Evidence Packages

### Days 15-17: Generate POAMs

A Plan of Action and Milestones (POAM) documents every gap between your current state and full compliance. For each unmet practice, a POAM includes:

- **What** the gap is (which practice, what is missing)
- **Why** it is a risk (what CUI is affected)
- **How** you will close it (remediation plan)
- **When** it will be closed (milestone dates)
- **Who** is responsible (assigned personnel)

CVERiskPilot generates POAMs in FedRAMP Appendix A format, which is accepted by C3PAOs and DIBCAC assessors. Each POAM entry links back to the specific findings that triggered it, with the CWE-to-NIST mapping as evidence.

```bash
# In the CVERiskPilot dashboard:
# Findings → Select unresolved → Generate POAM → Export CSV/PDF
```

### Days 18-19: Document Your SSP Excerpts

Your System Security Plan (SSP) describes how you implement each of the 110 practices. For practices backed by scan evidence, your SSP excerpts can reference:

- Scan results showing the control is implemented (finding resolved or not detected)
- Dashboard screenshots showing compliance posture per family
- Remediation records showing when gaps were closed
- POAM entries for remaining gaps with milestone dates

### Days 20-21: Compile Audit Trail Evidence

Assessors want to see that your security practices are ongoing, not one-time activities. Export your:

- **Scan history**: When scans were run, what was found, what was remediated
- **Remediation timeline**: Date each finding was identified, assigned, and resolved
- **Approval records**: Who approved risk acceptances, with what justification
- **SPRS score trend**: How your score improved over the 30-day period

CVERiskPilot maintains a hash-chain audit log for all security-relevant actions. Every triage decision, approval, and remediation is recorded with timestamps and user attribution. This is exactly the evidence package assessors expect.

---

## Week 4: Mock Assessment and Final Remediation

### Days 22-24: Self-Assess Against All 110 Practices

Walk through each of the 110 practices one by one. For each practice, you should be able to answer:

1. **Is it implemented?** (Met / Partially Met / Not Met)
2. **What is the evidence?** (Scan results, policy documents, system configs)
3. **If not met, is there a POAM?** (With milestones and responsible party)

Use the NIST 800-171A assessment objectives as your checklist. Each practice has specific assessment objectives that define what "implemented" means.

### Days 25-27: Close Remaining Gaps

By now, your POAM should be shrinking. Focus on closing any gaps that can be resolved before the assessment:

- Implement missing technical controls (configuration changes, tool deployments)
- Document missing policy controls (create or update written policies)
- Test implemented controls (verify they work as documented)

### Days 28-29: Recalculate SPRS Score

Run a fresh scan. Compare your current findings to the Week 1 baseline:

- How many findings were resolved?
- Which control families improved?
- What is your new SPRS score?

```bash
npx @cveriskpilot/scan --preset defense
```

Your SPRS score should be significantly higher. Any remaining gaps should have POAMs with realistic milestones.

### Day 30: Package and Submit

Compile your assessment package:

1. **SPRS Score**: Submit to the SPRS portal (https://www.sprs.csd.disa.mil/)
2. **SSP**: Complete System Security Plan with all 110 practices addressed
3. **POAMs**: Plans of Action and Milestones for every unmet practice
4. **Evidence Package**: Scan reports, remediation records, audit trail exports

If you are pursuing a self-assessment (Level 2, for select contracts), this package is your deliverable. If you need a C3PAO assessment, this package is what you hand to your assessor on day one.

---

## How CVERiskPilot Automates Each Step

| Week | Manual Approach | With CVERiskPilot |
|------|----------------|-------------------|
| Week 1: Gap Analysis | Spreadsheets, manual control mapping, consultant interviews | CLI scan maps findings to 110 practices automatically, calculates SPRS estimate |
| Week 2: Remediation | CVSS-only prioritization, no exploit intelligence | AI triage with EPSS + KEV + compliance impact prioritization |
| Week 3: Evidence | Manual PDF assembly, screenshots, email trails | One-click POAM export, hash-chain audit trail, dashboard evidence |
| Week 4: Assessment | Paper-based checklist, re-scan and hope | Automated re-scan, score comparison, assessment-ready export |

### The CLI: Free, Offline, Zero-Config

Start with the free CLI scanner. No account required, no data leaves your machine:

```bash
npx @cveriskpilot/scan --preset defense
```

This gives you:

- SBOM analysis with CVE enrichment (EPSS scores, KEV status, NVD data)
- IaC configuration checks against NIST 800-171 control families
- Secrets detection in source code and configuration files
- NIST 800-171 control family mapping for every finding

### The Platform: Collaboration, AI Triage, Evidence Export

When you are ready for team collaboration, AI-powered triage, and audit evidence export, the platform adds:

- **AI triage**: Claude-powered risk analysis with source citations, explaining why each finding matters for CMMC specifically
- **POAM generation**: FedRAMP Appendix A format, auto-populated from findings
- **Team workflow**: Assign findings, set SLAs, track remediation progress
- **Evidence export**: PDF and CSV exports formatted for assessor handoff
- **SPRS tracking**: Watch your score improve as findings are resolved

---

## The Bottom Line

CMMC Level 2 compliance is not a mystery. It is 110 well-documented security practices. The challenge is mapping your current security posture to those practices, closing the gaps systematically, and documenting everything for an assessor.

The contractors who start now — with 7+ months before the deadline — have time to do this methodically. The contractors who wait until September will be scrambling, overpaying consultants, and cutting corners.

Run the scan. Know your score. Close the gaps. Document everything.

```bash
npx @cveriskpilot/scan --preset defense
```

---

*CVERiskPilot is a 100% veteran-owned compliance intelligence platform. Built by people who have lived the mission. [Start your CMMC assessment now](/cmmc?ref=blog).*
