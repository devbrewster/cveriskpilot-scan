# Two npm Supply Chain Attacks in One Day — Here's What Your Compliance Framework Says About It

*On March 31, 2026, both Axios (v1.14.1) and Claude Code shipped compromised npm packages. If you're tracking compliance, this is exactly the scenario your controls were designed for.*

---

## What Happened

**Axios v1.14.1** — the most popular HTTP client on npm (83 million weekly downloads) — was hijacked. A malicious `postinstall` script installed a remote access trojan. Anyone who ran `npm install` with axios in their dependency tree got backdoored.

The same day, **Claude Code** shipped its npm package with source maps still embedded — 512,000 lines of internal Anthropic code exposed in the published bundle.

Two different failure modes. One ecosystem. One day.

---

## Why This Is a Compliance Event, Not Just a Security Event

Most teams will treat these as security incidents: scan for the bad version, update, move on.

But if your organization is subject to SOC 2, NIST 800-53, CMMC, or FedRAMP, these incidents trigger specific compliance controls that require documented evidence of detection and response.

### The Axios Compromise Maps To:

| Framework | Control | Requirement |
|-----------|---------|-------------|
| NIST 800-53 | SA-12 | Supply Chain Protection — verify integrity of acquired software |
| NIST 800-53 | SI-7 | Software, Firmware, and Information Integrity |
| SOC 2 | CC6.8 | Vulnerability Management — identify and remediate vulnerabilities |
| SOC 2 | CC8.1 | Change Management — evaluate changes before deployment |
| CMMC L2 | SI.L2-3.14.1 | Identify, report, and correct system flaws in a timely manner |
| FedRAMP | SA-12 | Supply Chain Risk Management |
| SSDF | PO.1 | Define security requirements for software and its environment |

### The Claude Code Leak Maps To:

| Framework | Control | Requirement |
|-----------|---------|-------------|
| NIST 800-53 | SA-11 | Developer Security Testing — verify no sensitive data in releases |
| SOC 2 | CC6.1 | Logical Access Controls — prevent unauthorized information disclosure |
| CMMC L2 | SC.L2-3.13.16 | Protect confidentiality of CUI at rest |
| SSDF | PW.7 | Review and verify release artifacts before publishing |

---

## What Your Auditor Will Ask

If you're going through a SOC 2 Type II audit and these packages were in your dependency tree, your auditor will ask:

1. **When did you detect the compromised version?** (SA-12 / CC6.8)
2. **What automated controls flagged it?** (SI-7 / CC8.1)
3. **How long between disclosure and remediation?** (SI.L2-3.14.1)
4. **Where's the evidence trail?** (Audit log, POAM entry, ticket)

If your answer is "we ran `npm audit` a few days later," that's not evidence. That's hope.

---

## What Automated Detection Looks Like

A compliance-aware scanner in your CI/CD pipeline catches this automatically:

```bash
npx @cveriskpilot/scan --preset enterprise
```

The scan detects Axios 1.14.1 in your lockfile, classifies it as CWE-506 (Embedded Malicious Code), and maps it to every affected compliance control. The PR gets blocked. The finding gets a POAM entry. The audit trail writes itself.

**Before the developer even sees the PR comment**, the compliance evidence is generated:

- CWE classification
- Affected controls across all applicable frameworks
- Severity and exploit probability (EPSS)
- Remediation path (upgrade to 1.14.2)
- Auto-generated POAM milestone

No spreadsheet. No manual mapping. No Friday afternoon spent cross-referencing CVEs to controls.

---

## The Real Lesson

Supply chain attacks aren't new. But they're accelerating:

- **2024**: 55% increase in supply chain attacks via npm
- **2025**: 78% of organizations experienced at least one supply chain breach
- **2026**: Two major npm incidents in a single day

The question isn't whether you'll encounter a compromised dependency. It's whether your compliance posture can prove you caught it, when you caught it, and what you did about it.

If your scanner finds the CVE but can't tell you which SOC 2 or CMMC control is affected — you still have a compliance gap.

---

## Try It

```bash
# Scan your project right now
npx @cveriskpilot/scan --preset startup

# Check if axios 1.14.1 is in your lockfile
npx @cveriskpilot/scan --deps-only --severity CRITICAL
```

Free. Offline. No account. One command to close the gap between "we found it" and "we can prove we found it."

---

*[CVERiskPilot](https://cveriskpilot.com) is 100% Veteran Owned, built in Texas.*

*The Pipeline Compliance Scanner is free on [npm](https://npmjs.com/package/@cveriskpilot/scan).*

---

**Tags:** Supply Chain Security, npm, DevSecOps, Compliance, NIST 800-53, SOC 2, CMMC, Vulnerability Management, CI/CD
