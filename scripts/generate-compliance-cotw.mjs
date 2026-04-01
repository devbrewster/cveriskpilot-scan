#!/usr/bin/env node

/**
 * generate-compliance-cotw.mjs — Compliance Control of the Week
 *
 * Generates "NIST 800-53 Control of the Week" social media posts using Claude AI.
 * Produces both X/Twitter threads (3-5 tweets, 280 chars each) and LinkedIn posts
 * (600-1200 chars). Tracks history to avoid repeating controls.
 *
 * Usage:
 *   node scripts/generate-compliance-cotw.mjs                  # Next unposted control
 *   node scripts/generate-compliance-cotw.mjs --control SI-2   # Specific control
 *   node scripts/generate-compliance-cotw.mjs --list           # List all controls + status
 *   node scripts/generate-compliance-cotw.mjs --dry-run        # Preview without saving
 *   node scripts/generate-compliance-cotw.mjs --no-ai          # Skip Claude, use templates
 *
 * Env:
 *   ANTHROPIC_API_KEY — Required for AI-generated explanations (skip with --no-ai)
 *
 * Output:
 *   X drafts:        social/queue/x/cotw-{control-id}-{date}.json
 *   LinkedIn drafts:  social/queue/linkedin/cotw-{control-id}-{date}.json
 *   History tracking: state/marketing/cotw-history.json
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = "/home/gonti/cveriskpilot";
const X_QUEUE_DIR = path.join(ROOT, "social", "queue", "x");
const LI_QUEUE_DIR = path.join(ROOT, "social", "queue", "linkedin");
const HISTORY_FILE = path.join(ROOT, "state", "marketing", "cotw-history.json");

// ---------------------------------------------------------------------------
// NIST 800-53 Control Catalog
// Sourced from packages/compliance/src/mapping/nist-800-53.ts
// Duplicated here for zero-dependency script execution without TS build.
// ---------------------------------------------------------------------------

const FAMILY_LABELS = {
  AC: "Access Control",
  AU: "Audit & Accountability",
  CM: "Configuration Management",
  IA: "Identification & Authentication",
  RA: "Risk Assessment",
  SA: "System & Services Acquisition",
  SC: "System & Communications Protection",
  SI: "System & Information Integrity",
};

const CONTROLS = [
  // Access Control (AC) — 7 controls
  { id: "AC-3",  family: "AC", title: "Access Enforcement",
    description: "The system enforces approved authorizations for logical access to information and system resources." },
  { id: "AC-4",  family: "AC", title: "Information Flow Enforcement",
    description: "The system enforces approved authorizations for controlling the flow of information within the system and between connected systems." },
  { id: "AC-6",  family: "AC", title: "Least Privilege",
    description: "The organization employs the principle of least privilege, allowing only authorized accesses for users and processes." },
  { id: "AC-7",  family: "AC", title: "Unsuccessful Logon Attempts",
    description: "The system enforces a limit of consecutive invalid logon attempts by a user and takes action when the limit is exceeded." },
  { id: "AC-10", family: "AC", title: "Concurrent Session Control",
    description: "The system limits the number of concurrent sessions for each system account." },
  { id: "AC-12", family: "AC", title: "Session Termination",
    description: "The system automatically terminates a user session after defined conditions or trigger events." },
  { id: "AC-17", family: "AC", title: "Remote Access",
    description: "The organization establishes and documents usage restrictions, configuration/connection requirements, and implementation guidance for each type of remote access allowed." },

  // Audit & Accountability (AU) — 5 controls
  { id: "AU-2",  family: "AU", title: "Event Logging",
    description: "The organization identifies events that need to be logged and coordinates the audit function with other entities requiring audit-related information." },
  { id: "AU-3",  family: "AU", title: "Content of Audit Records",
    description: "The system generates audit records containing information about the type of event, when it occurred, where it occurred, the source and outcome." },
  { id: "AU-6",  family: "AU", title: "Audit Record Review, Analysis, and Reporting",
    description: "The organization reviews and analyzes audit records for indications of inappropriate or unusual activity." },
  { id: "AU-9",  family: "AU", title: "Protection of Audit Information",
    description: "The system protects audit information and audit logging tools from unauthorized access, modification, and deletion." },
  { id: "AU-12", family: "AU", title: "Audit Record Generation",
    description: "The system provides audit record generation capability for auditable events and generates audit records with defined content." },

  // Configuration Management (CM) — 5 controls
  { id: "CM-2",  family: "CM", title: "Baseline Configuration",
    description: "The organization develops, documents, and maintains a current baseline configuration of the system." },
  { id: "CM-3",  family: "CM", title: "Configuration Change Control",
    description: "The organization determines and documents types of changes to the system that are configuration-controlled." },
  { id: "CM-6",  family: "CM", title: "Configuration Settings",
    description: "The organization establishes and documents configuration settings for IT products employed within the system using security configuration checklists." },
  { id: "CM-7",  family: "CM", title: "Least Functionality",
    description: "The organization configures the system to provide only essential capabilities and prohibits or restricts the use of non-essential functions, ports, protocols, and services." },
  { id: "CM-8",  family: "CM", title: "System Component Inventory",
    description: "The organization develops and documents an inventory of system components that accurately reflects the system and is at the level of granularity deemed necessary for tracking." },

  // Identification & Authentication (IA) — 4 controls
  { id: "IA-2",  family: "IA", title: "Identification and Authentication (Organizational Users)",
    description: "The system uniquely identifies and authenticates organizational users or processes acting on behalf of organizational users." },
  { id: "IA-5",  family: "IA", title: "Authenticator Management",
    description: "The organization manages system authenticators by verifying identity, establishing initial content, ensuring sufficient strength, and distributing/storing/revoking authenticators." },
  { id: "IA-6",  family: "IA", title: "Authentication Feedback",
    description: "The system obscures feedback of authentication information during the authentication process to protect the information from possible exploitation." },
  { id: "IA-8",  family: "IA", title: "Identification and Authentication (Non-Organizational Users)",
    description: "The system uniquely identifies and authenticates non-organizational users or processes acting on behalf of non-organizational users." },

  // Risk Assessment (RA) — 3 controls
  { id: "RA-3",  family: "RA", title: "Risk Assessment",
    description: "The organization conducts assessments of risk including the likelihood and magnitude of harm from unauthorized access, use, disclosure, disruption, modification, or destruction." },
  { id: "RA-5",  family: "RA", title: "Vulnerability Monitoring and Scanning",
    description: "The organization monitors and scans for vulnerabilities in the system and hosted applications, and remediates vulnerabilities in accordance with an organizational assessment of risk." },
  { id: "RA-7",  family: "RA", title: "Risk Response",
    description: "The organization responds to findings from security and privacy assessments, monitoring, and audits in accordance with organizational risk tolerance." },

  // System & Services Acquisition (SA) — 5 controls
  { id: "SA-3",  family: "SA", title: "System Development Life Cycle",
    description: "The organization manages the system using a system development life cycle that incorporates information security and privacy considerations." },
  { id: "SA-8",  family: "SA", title: "Security and Privacy Engineering Principles",
    description: "The organization applies systems security and privacy engineering principles in the specification, design, development, implementation, and modification of the system." },
  { id: "SA-10", family: "SA", title: "Developer Configuration Management",
    description: "The organization requires the developer of the system to perform configuration management during design, development, implementation, and operation." },
  { id: "SA-11", family: "SA", title: "Developer Testing and Evaluation",
    description: "The organization requires the developer of the system to create and implement a security and privacy assessment plan and perform testing/evaluation at defined depth and coverage." },
  { id: "SA-15", family: "SA", title: "Development Process, Standards, and Tools",
    description: "The organization requires the developer of the system to follow a documented development process that explicitly addresses security and privacy requirements." },

  // System & Communications Protection (SC) — 8 controls
  { id: "SC-5",  family: "SC", title: "Denial-of-Service Protection",
    description: "The system protects against or limits the effects of denial-of-service attacks based on defined types." },
  { id: "SC-7",  family: "SC", title: "Boundary Protection",
    description: "The system monitors and controls communications at external managed interfaces and key internal boundaries." },
  { id: "SC-8",  family: "SC", title: "Transmission Confidentiality and Integrity",
    description: "The system protects the confidentiality and integrity of transmitted information." },
  { id: "SC-12", family: "SC", title: "Cryptographic Key Establishment and Management",
    description: "The organization establishes and manages cryptographic keys when cryptography is employed within the system." },
  { id: "SC-13", family: "SC", title: "Cryptographic Protection",
    description: "The system implements defined cryptographic uses and types of cryptography required for each use." },
  { id: "SC-18", family: "SC", title: "Mobile Code",
    description: "The organization defines acceptable and unacceptable mobile code and mobile code technologies and establishes usage restrictions and implementation guidance." },
  { id: "SC-23", family: "SC", title: "Session Authenticity",
    description: "The system protects the authenticity of communications sessions." },
  { id: "SC-28", family: "SC", title: "Protection of Information at Rest",
    description: "The system protects the confidentiality and integrity of information at rest." },

  // System & Information Integrity (SI) — 8 controls
  { id: "SI-2",  family: "SI", title: "Flaw Remediation",
    description: "The organization identifies, reports, and corrects system flaws; tests software and firmware updates related to flaw remediation for effectiveness and potential side effects; and installs security-relevant updates within defined time periods." },
  { id: "SI-3",  family: "SI", title: "Malicious Code Protection",
    description: "The organization employs malicious code protection mechanisms at system entry and exit points to detect and eradicate malicious code." },
  { id: "SI-4",  family: "SI", title: "System Monitoring",
    description: "The organization monitors the system to detect attacks and indicators of potential attacks, unauthorized connections, and unauthorized use." },
  { id: "SI-5",  family: "SI", title: "Security Alerts, Advisories, and Directives",
    description: "The organization receives system security alerts, advisories, and directives from external organizations on an ongoing basis and generates internal alerts as needed." },
  { id: "SI-7",  family: "SI", title: "Software, Firmware, and Information Integrity",
    description: "The organization employs integrity verification tools to detect unauthorized changes to software, firmware, and information." },
  { id: "SI-10", family: "SI", title: "Information Input Validation",
    description: "The system checks the validity of information inputs to prevent injection attacks, buffer overflows, and other input-based exploits." },
  { id: "SI-11", family: "SI", title: "Error Handling",
    description: "The system generates error messages that provide information necessary for corrective actions without revealing information exploitable by adversaries." },
  { id: "SI-16", family: "SI", title: "Memory Protection",
    description: "The system implements security safeguards to protect its memory from unauthorized code execution." },
];

// ---------------------------------------------------------------------------
// CWE-to-Control Reverse Mapping
// Sourced from packages/compliance/src/mapping/nist-800-53.ts CWE_TO_CONTROLS
// ---------------------------------------------------------------------------

const CWE_TO_CONTROLS = {
  "20":   ["SI-10"],
  "77":   ["SI-10", "SI-3"],
  "78":   ["SI-10", "SI-3", "CM-7"],
  "79":   ["SI-10", "SC-18"],
  "80":   ["SI-10", "SC-18"],
  "89":   ["SI-10", "SA-11"],
  "90":   ["SI-10", "IA-2"],
  "91":   ["SI-10"],
  "94":   ["SI-10", "SI-3", "SC-18"],
  "917":  ["SI-10", "SC-18"],
  "255":  ["IA-5", "SC-12"],
  "256":  ["IA-5", "SC-28"],
  "257":  ["IA-5", "SC-13"],
  "259":  ["IA-5", "CM-6"],
  "261":  ["IA-5", "SC-13"],
  "287":  ["IA-2", "IA-8"],
  "288":  ["IA-2", "AC-3"],
  "290":  ["IA-2", "SC-23"],
  "307":  ["AC-7", "IA-2"],
  "521":  ["IA-5"],
  "522":  ["IA-5", "SC-8", "SC-28"],
  "613":  ["AC-12", "SC-23"],
  "640":  ["IA-5", "IA-6"],
  "798":  ["IA-5", "CM-6", "SA-15"],
  "22":   ["AC-3", "CM-7"],
  "23":   ["AC-3", "CM-7"],
  "36":   ["AC-3"],
  "59":   ["AC-3", "CM-6"],
  "200":  ["AC-3", "SI-11", "AU-3"],
  "269":  ["AC-6"],
  "276":  ["AC-3", "AC-6"],
  "284":  ["AC-3", "AC-6"],
  "285":  ["AC-3"],
  "352":  ["SC-23", "SI-10"],
  "359":  ["AC-3", "SC-28"],
  "434":  ["CM-7", "SI-3"],
  "601":  ["SI-10", "CM-7"],
  "639":  ["AC-3"],
  "732":  ["AC-3", "AC-6"],
  "862":  ["AC-3"],
  "863":  ["AC-3"],
  "310":  ["SC-13", "SC-12"],
  "326":  ["SC-13"],
  "327":  ["SC-13", "SC-12"],
  "328":  ["SC-13"],
  "330":  ["SC-13"],
  "338":  ["SC-13"],
  "347":  ["SC-8", "SC-13", "SI-7"],
  "119":  ["SI-16", "SI-10"],
  "120":  ["SI-16", "SI-10"],
  "122":  ["SI-16"],
  "125":  ["SI-16"],
  "190":  ["SI-16", "SI-10"],
  "416":  ["SI-16"],
  "476":  ["SI-16"],
  "787":  ["SI-16", "SI-10"],
  "209":  ["SI-11"],
  "532":  ["AU-9", "SI-11"],
  "538":  ["AC-3", "CM-6"],
  "384":  ["SC-23", "AC-12"],
  "614":  ["SC-8", "SC-23"],
  "502":  ["SI-10", "SI-3"],
  "611":  ["SI-10", "CM-7"],
  "918":  ["SI-10", "SC-7", "AC-4"],
  "16":   ["CM-6", "CM-2"],
  "250":  ["AC-6"],
  "400":  ["SC-5"],
  "770":  ["SC-5", "CM-7"],
  "1021": ["SC-18", "SI-10"],
  "829":  ["SA-10", "SA-15", "SI-7"],
  "1104": ["SA-10", "CM-8"],
};

// ---------------------------------------------------------------------------
// Cross-Framework Bridge (subset)
// Sourced from packages/compliance/src/mapping/cross-framework.ts
// ---------------------------------------------------------------------------

const CROSS_FRAMEWORK_BRIDGE = {
  "AC-3":  { "SOC 2": "CC6.1", CMMC: "AC.L2-3.1.2", FedRAMP: "AC-3", HIPAA: "164.312(a)", "PCI DSS": "Req-7.2", "ISO 27001": "A.8.3" },
  "AC-4":  { "SOC 2": "CC6.1", CMMC: "SC.L2-3.13.1", FedRAMP: "SC-7", HIPAA: "164.312(a)", "ISO 27001": "A.8.20" },
  "AC-6":  { "SOC 2": "CC6.1", CMMC: "AC.L2-3.1.5", FedRAMP: "AC-6", HIPAA: "164.312(a)", "PCI DSS": "Req-7.2", "ISO 27001": "A.8.3" },
  "AC-7":  { "SOC 2": "CC6.1", CMMC: "IA.L2-3.5.2", FedRAMP: "IA-2", HIPAA: "164.312(d)", "PCI DSS": "Req-8.3", "ISO 27001": "A.8.5" },
  "AC-10": { "SOC 2": "CC6.1", CMMC: "AC.L2-3.1.1", FedRAMP: "AC-2", HIPAA: "164.312(a)", "PCI DSS": "Req-7.2" },
  "AC-12": { "SOC 2": "CC6.1", CMMC: "AC.L2-3.1.1", FedRAMP: "AC-2", HIPAA: "164.312(a)", "PCI DSS": "Req-8.6" },
  "AC-17": { "SOC 2": "CC6.1", CMMC: "AC.L2-3.1.1", FedRAMP: "AC-2", HIPAA: "164.312(a)", "PCI DSS": "Req-7.2", "ISO 27001": "A.8.20" },
  "AU-2":  { "SOC 2": "CC7.2", CMMC: "AU.L2-3.3.1", FedRAMP: "AU-2", HIPAA: "164.312(b)", "PCI DSS": "Req-10.2", "ISO 27001": "A.8.15" },
  "AU-3":  { "SOC 2": "CC7.2", CMMC: "AU.L2-3.3.1", FedRAMP: "AU-3", HIPAA: "164.312(b)", "PCI DSS": "Req-10.2", "ISO 27001": "A.8.15" },
  "AU-6":  { "SOC 2": "CC7.2", CMMC: "AU.L2-3.3.1", FedRAMP: "AU-6", HIPAA: "164.312(b)", "PCI DSS": "Req-10.7", "ISO 27001": "A.8.15" },
  "AU-9":  { "SOC 2": "CC7.2", CMMC: "AU.L2-3.3.1", FedRAMP: "AU-2", HIPAA: "164.312(b)", "PCI DSS": "Req-10.3", "ISO 27001": "A.8.15" },
  "AU-12": { "SOC 2": "CC7.2", CMMC: "AU.L2-3.3.1", FedRAMP: "AU-12", HIPAA: "164.312(b)", "PCI DSS": "Req-10.2" },
  "CM-2":  { CMMC: "CM.L2-3.4.1", FedRAMP: "CM-2" },
  "CM-3":  { CMMC: "CM.L2-3.4.4", FedRAMP: "CM-3" },
  "CM-6":  { "SOC 2": "CC8.1", CMMC: "CM.L2-3.4.2", FedRAMP: "CM-6" },
  "CM-7":  { CMMC: "CM.L2-3.4.6", FedRAMP: "CM-7" },
  "CM-8":  { "SOC 2": "CC8.1", CMMC: "CM.L2-3.4.1", FedRAMP: "CM-8" },
  "IA-2":  { "SOC 2": "CC6.1", CMMC: "IA.L2-3.5.3", FedRAMP: "IA-2", HIPAA: "164.312(d)", "PCI DSS": "Req-8.3" },
  "IA-5":  { "SOC 2": "CC6.1", CMMC: "IA.L2-3.5.7", FedRAMP: "IA-5", "PCI DSS": "Req-8.3" },
  "IA-6":  { FedRAMP: "IA-6" },
  "IA-8":  { FedRAMP: "IA-8" },
  "RA-3":  { CMMC: "RA.L2-3.11.1", FedRAMP: "RA-3" },
  "RA-5":  { "SOC 2": "CC7.1", CMMC: "RA.L2-3.11.2", FedRAMP: "RA-5", HIPAA: "164.308(a)(1)", "PCI DSS": "Req-6.1" },
  "RA-7":  { FedRAMP: "RA-7" },
  "SA-3":  { FedRAMP: "SA-3" },
  "SA-8":  { FedRAMP: "SA-8" },
  "SA-10": { CMMC: "SA.L2-3.13.2", FedRAMP: "SA-10" },
  "SA-11": { FedRAMP: "SA-11" },
  "SA-15": { FedRAMP: "SA-15" },
  "SC-5":  { FedRAMP: "SC-5" },
  "SC-7":  { "SOC 2": "CC6.6", CMMC: "SC.L2-3.13.1", FedRAMP: "SC-7", "ISO 27001": "A.8.20" },
  "SC-8":  { "SOC 2": "CC6.7", CMMC: "SC.L2-3.13.8", FedRAMP: "SC-8", HIPAA: "164.312(e)", "PCI DSS": "Req-4.1" },
  "SC-12": { "SOC 2": "CC6.1", FedRAMP: "SC-12", "PCI DSS": "Req-3.5" },
  "SC-13": { FedRAMP: "SC-13" },
  "SC-18": { FedRAMP: "SC-18" },
  "SC-23": { FedRAMP: "SC-23" },
  "SC-28": { "SOC 2": "CC6.7", CMMC: "SC.L2-3.13.16", FedRAMP: "SC-28", HIPAA: "164.312(a)(2)(iv)", "PCI DSS": "Req-3.4" },
  "SI-2":  { "SOC 2": "CC7.1", CMMC: "SI.L2-3.14.1", FedRAMP: "SI-2", HIPAA: "164.308(a)(1)", "PCI DSS": "Req-6.3", "ISO 27001": "A.8.8" },
  "SI-3":  { CMMC: "SI.L2-3.14.2", FedRAMP: "SI-3" },
  "SI-4":  { "SOC 2": "CC7.2", CMMC: "SI.L2-3.14.6", FedRAMP: "SI-4" },
  "SI-5":  { FedRAMP: "SI-5" },
  "SI-7":  { FedRAMP: "SI-7" },
  "SI-10": { CMMC: "SI.L2-3.14.1", FedRAMP: "SI-10", "PCI DSS": "Req-6.5" },
  "SI-11": { FedRAMP: "SI-11" },
  "SI-16": { FedRAMP: "SI-16" },
};

// ---------------------------------------------------------------------------
// Build reverse map: control ID -> list of CWE IDs that map to it
// ---------------------------------------------------------------------------

function buildControlToCweMap() {
  const map = {};
  for (const [cweNum, controlIds] of Object.entries(CWE_TO_CONTROLS)) {
    for (const controlId of controlIds) {
      if (!map[controlId]) map[controlId] = [];
      map[controlId].push(`CWE-${cweNum}`);
    }
  }
  return map;
}

const CONTROL_TO_CWES = buildControlToCweMap();

// ---------------------------------------------------------------------------
// CWE descriptions for context (top CWEs only — used in AI prompt)
// ---------------------------------------------------------------------------

const CWE_NAMES = {
  "CWE-20": "Improper Input Validation",
  "CWE-22": "Path Traversal",
  "CWE-77": "Command Injection",
  "CWE-78": "OS Command Injection",
  "CWE-79": "Cross-site Scripting (XSS)",
  "CWE-89": "SQL Injection",
  "CWE-94": "Code Injection",
  "CWE-119": "Buffer Overflow",
  "CWE-200": "Exposure of Sensitive Information",
  "CWE-250": "Execution with Unnecessary Privileges",
  "CWE-255": "Credentials Management Errors",
  "CWE-269": "Improper Privilege Management",
  "CWE-276": "Incorrect Default Permissions",
  "CWE-284": "Improper Access Control",
  "CWE-285": "Improper Authorization",
  "CWE-287": "Improper Authentication",
  "CWE-307": "Improper Restriction of Excessive Auth Attempts",
  "CWE-310": "Cryptographic Issues",
  "CWE-326": "Inadequate Encryption Strength",
  "CWE-327": "Use of Broken Crypto Algorithm",
  "CWE-330": "Insufficient Randomness",
  "CWE-347": "Improper Verification of Cryptographic Signature",
  "CWE-352": "Cross-Site Request Forgery (CSRF)",
  "CWE-384": "Session Fixation",
  "CWE-400": "Uncontrolled Resource Consumption",
  "CWE-416": "Use After Free",
  "CWE-434": "Unrestricted Upload of Dangerous File Type",
  "CWE-476": "NULL Pointer Dereference",
  "CWE-502": "Deserialization of Untrusted Data",
  "CWE-521": "Weak Password Requirements",
  "CWE-522": "Insufficiently Protected Credentials",
  "CWE-532": "Insertion of Sensitive Info into Log File",
  "CWE-601": "Open Redirect",
  "CWE-611": "XXE",
  "CWE-613": "Insufficient Session Expiration",
  "CWE-639": "Authorization Bypass (IDOR)",
  "CWE-787": "Out-of-bounds Write",
  "CWE-798": "Use of Hard-coded Credentials",
  "CWE-829": "Inclusion of Functionality from Untrusted Source",
  "CWE-862": "Missing Authorization",
  "CWE-863": "Incorrect Authorization",
  "CWE-918": "Server-Side Request Forgery (SSRF)",
  "CWE-1021": "Clickjacking",
  "CWE-1104": "Use of Unmaintained Third-Party Components",
};

// ---------------------------------------------------------------------------
// History tracking
// ---------------------------------------------------------------------------

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return { featured: [], generatedAt: [] };
  }
}

function saveHistory(history) {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { control: null, list: false, dryRun: false, noAi: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--control" && argv[i + 1]) { opts.control = argv[++i].toUpperCase(); continue; }
    if (arg === "--list")     { opts.list = true; continue; }
    if (arg === "--dry-run")  { opts.dryRun = true; continue; }
    if (arg === "--no-ai")    { opts.noAi = true; continue; }
    if (arg === "--help") {
      console.log([
        "Usage: node scripts/generate-compliance-cotw.mjs [options]",
        "",
        "Options:",
        "  --control ID   Generate for a specific control (e.g. SI-2)",
        "  --list         List all controls with featured/available status",
        "  --dry-run      Preview output without saving files",
        "  --no-ai        Skip Claude API, use template-based generation",
        "  --help         Show this help",
      ].join("\n"));
      process.exit(0);
    }
    console.warn(`Unknown argument: ${arg}`);
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todaySlug() {
  return new Date().toISOString().slice(0, 10);
}

function charCount(text) {
  // X counts URLs as 23 chars
  return text.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

// ---------------------------------------------------------------------------
// Claude AI generation
// ---------------------------------------------------------------------------

async function generateWithClaude(control, cwes, frameworkMap) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required. Use --no-ai to skip AI generation.");
  }

  const cweDescriptions = cwes
    .map((cwe) => `${cwe}: ${CWE_NAMES[cwe] || "Unknown"}`)
    .join("\n");

  const frameworkList = Object.entries(frameworkMap)
    .map(([fw, ctrlId]) => `${fw}: ${ctrlId}`)
    .join("\n");

  const prompt = `You are a compliance and cybersecurity expert writing social media content for CVERiskPilot, a veteran-owned compliance intelligence platform. Your audience is security engineers, GRC analysts, and DevSecOps practitioners.

NIST 800-53 Control: ${control.id} — ${control.title}
Family: ${FAMILY_LABELS[control.family]}
Official description: ${control.description}

Related CWEs (weaknesses this control mitigates):
${cweDescriptions || "No direct CWE mappings for this control."}

Cross-framework equivalents:
${frameworkList || "Limited cross-framework mappings available."}

BRAND VOICE RULES:
- Professional but accessible. Write like a security engineer explaining to a peer, not a vendor selling.
- No emojis. No rocket ships. No "game-changing" or "excited to announce."
- First person singular ("I" not "we") when referencing CVERiskPilot.
- Concrete examples over abstract claims.
- Slight dry humor is welcome. Self-aware about compliance being tedious.
- Never say "leveraging AI" or "revolutionizing."

Generate two outputs:

OUTPUT 1 — X/TWITTER THREAD (3-5 tweets)
Each tweet MUST be under 280 characters. The thread format:
- Tweet 1: Hook — "Compliance Control of the Week: ${control.id} — ${control.title}" then a plain-English explanation of what this control actually means in practice.
- Tweet 2: Why it matters — a concrete scenario or real-world consequence of failing this control.
- Tweet 3: CWE connection — which weakness types map to this control and why that matters for vulnerability management.
- Tweet 4: Cross-framework reach — how many frameworks share this requirement (show 3-4 specific framework mappings).
- Tweet 5 (optional, only if needed): CTA — "Map your vulnerabilities to compliance controls automatically. Free CLI: npx @cveriskpilot/scan" and link to https://cveriskpilot.com/signup?ref=x-cotw with hashtags #ComplianceAutomation #NIST80053

CRITICAL: Each tweet must be STRICTLY under 280 characters. Count carefully. URLs count as 23 characters. Do not exceed 270 characters to leave margin.

OUTPUT 2 — LINKEDIN POST (600-1200 characters)
Professional tone. Founder voice. Structure:
- Hook line (grab attention)
- 2-3 paragraphs explaining the control, its real-world impact, and cross-framework relevance
- Brief mention of how CVERiskPilot automates this mapping
- Call to action
- 2-3 hashtags at end

Return your response as JSON with this exact structure:
{
  "x_thread": ["tweet1", "tweet2", "tweet3", "tweet4"],
  "linkedin_post": "full linkedin post text",
  "plain_explanation": "2-3 sentence plain English explanation of this control for the history log"
}

Return ONLY the JSON object, no markdown fences, no extra text.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Empty response from Claude API");

  // Parse JSON — handle potential markdown fences
  const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Template-based fallback generation (--no-ai mode)
// ---------------------------------------------------------------------------

function generateFromTemplate(control, cwes, frameworkMap) {
  const familyLabel = FAMILY_LABELS[control.family];
  const fwEntries = Object.entries(frameworkMap);
  const fwCount = fwEntries.length;
  const fwList = fwEntries.slice(0, 4).map(([fw, id]) => `${fw}: ${id}`).join("\n");
  const cweShort = cwes.slice(0, 4).join(", ");

  const thread = [
    // Tweet 1: Hook
    `Compliance Control of the Week: ${control.id} -- ${control.title}\n\nFamily: ${familyLabel}\n\n${truncateForTweet(control.description, 180)}`,
    // Tweet 2: Cross-framework
    `${control.id} maps to ${fwCount} frameworks:\n\n${fwList}\n\nOne vulnerability can trigger findings across all of them.`,
    // Tweet 3: CWEs
    cwes.length > 0
      ? `Related weaknesses: ${cweShort}\n\nIf your scanner finds these CWEs, ${control.id} is the compliance control your auditor cares about.`
      : `${control.id} addresses systemic security requirements that span multiple weakness categories.\n\nThe compliance mapping matters because auditors ask about controls, not CVEs.`,
    // Tweet 4: CTA
    `Map vulnerabilities to ${control.id} and 40+ other controls automatically.\n\nFree CLI: npx @cveriskpilot/scan\nPlatform: https://cveriskpilot.com/signup?ref=x-cotw\n\n#ComplianceAutomation #NIST80053`,
  ];

  // Validate tweet lengths, trim if needed
  const validatedThread = thread.map((tweet) => {
    if (charCount(tweet) > 280) {
      return truncateForTweet(tweet, 275);
    }
    return tweet;
  });

  const linkedin = [
    `${control.id} -- ${control.title}`,
    "",
    `This week's compliance control spotlight: ${control.id} from the ${familyLabel} family in NIST 800-53.`,
    "",
    control.description,
    "",
    cwes.length > 0
      ? `This control mitigates ${cwes.length} weakness types including ${cwes.slice(0, 3).map((c) => CWE_NAMES[c] || c).join(", ")}. When your scanner flags these CWEs, this is the compliance control your auditor will ask about.`
      : `This control establishes foundational security requirements that map across multiple compliance frameworks.`,
    "",
    fwCount > 0
      ? `Cross-framework reach: ${fwEntries.slice(0, 5).map(([fw, id]) => `${fw} (${id})`).join(", ")}.`
      : "",
    "",
    "CVERiskPilot maps every vulnerability finding to the compliance controls it threatens -- automatically, across 13 frameworks.",
    "",
    "Free CLI: npx @cveriskpilot/scan",
    "https://cveriskpilot.com/signup?ref=li-cotw",
    "",
    "#ComplianceAutomation #NIST80053 #GRC",
  ].filter(Boolean).join("\n");

  const plainExplanation = `${control.id} (${control.title}) requires organizations to ${control.description.toLowerCase().replace(/^the (organization|system) /i, "")} This control maps to ${fwCount} frameworks and is related to ${cwes.length} CWE weakness types.`;

  return {
    x_thread: validatedThread,
    linkedin_post: linkedin,
    plain_explanation: plainExplanation,
  };
}

function truncateForTweet(text, maxLen) {
  if (charCount(text) <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + "...";
}

// ---------------------------------------------------------------------------
// Draft file creation
// ---------------------------------------------------------------------------

function createXDraft(control, thread, date) {
  const id = `cotw-${control.id.toLowerCase()}-${date}`;

  return {
    id,
    created_at: date,
    type: "compliance-control-of-week",
    status: "draft",
    source: {
      control_id: control.id,
      control_title: control.title,
      family: control.family,
      family_label: FAMILY_LABELS[control.family],
      reference: "NIST SP 800-53 Rev 5",
    },
    platforms: {
      x: {
        status: "draft",
        format: "thread",
        thread: thread.map((content, i) => ({
          position: i + 1,
          content,
          character_count: charCount(content),
        })),
        post_id: null,
        published_at: null,
      },
    },
    hashtags: ["#ComplianceAutomation", "#NIST80053", `#${control.family}`],
    approved_by: null,
    published_at: null,
  };
}

function createLinkedInDraft(control, content, date) {
  const id = `cotw-${control.id.toLowerCase()}-${date}-linkedin`;

  return {
    id,
    created_at: date,
    type: "compliance-control-of-week",
    status: "draft",
    source: {
      control_id: control.id,
      control_title: control.title,
      family: control.family,
      family_label: FAMILY_LABELS[control.family],
      reference: "NIST SP 800-53 Rev 5",
    },
    platforms: {
      linkedin: {
        status: "draft",
        content,
        character_count: content.length,
        post_id: null,
        published_at: null,
      },
    },
    hashtags: ["#ComplianceAutomation", "#NIST80053", "#GRC"],
    approved_by: null,
    published_at: null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const history = loadHistory();

  // --list mode
  if (opts.list) {
    console.log("\nNIST 800-53 Controls — Compliance Control of the Week\n");
    console.log(`${"Status".padEnd(12)} ${"ID".padEnd(8)} ${"Title".padEnd(50)} ${"CWEs".padEnd(6)} Frameworks`);
    console.log("-".repeat(95));

    for (const ctrl of CONTROLS) {
      const cwes = CONTROL_TO_CWES[ctrl.id] || [];
      const fws = CROSS_FRAMEWORK_BRIDGE[ctrl.id] || {};
      const fwCount = Object.keys(fws).length;
      const featured = history.featured.includes(ctrl.id);
      const status = featured ? "[FEATURED]" : "[AVAILABLE]";
      console.log(`  ${status.padEnd(12)} ${ctrl.id.padEnd(8)} ${ctrl.title.padEnd(50)} ${String(cwes.length).padEnd(6)} ${fwCount}`);
    }

    const remaining = CONTROLS.length - history.featured.length;
    console.log(`\n  ${CONTROLS.length} controls total, ${history.featured.length} featured, ${remaining} remaining`);
    console.log(`  Covers 8 control families across 64+ weeks of unique content\n`);
    process.exit(0);
  }

  // Select target control
  let target;
  if (opts.control) {
    target = CONTROLS.find((c) => c.id === opts.control);
    if (!target) {
      console.error(`Control ${opts.control} not found. Use --list to see available controls.`);
      process.exit(1);
    }
    if (history.featured.includes(target.id)) {
      console.warn(`Warning: ${target.id} has already been featured. Generating anyway.`);
    }
  } else {
    // Pick the next unfeatured control (round-robin through families for variety)
    const familyOrder = ["SI", "AC", "SC", "IA", "CM", "AU", "RA", "SA"];
    for (const family of familyOrder) {
      target = CONTROLS.find((c) => c.family === family && !history.featured.includes(c.id));
      if (target) break;
    }
    if (!target) {
      console.log("All 45 controls have been featured. Reset state/marketing/cotw-history.json to start a new cycle.");
      process.exit(0);
    }
  }

  const cwes = CONTROL_TO_CWES[target.id] || [];
  const frameworkMap = CROSS_FRAMEWORK_BRIDGE[target.id] || {};
  const date = todaySlug();

  console.log(`\nCompliance Control of the Week: ${target.id} -- ${target.title}`);
  console.log(`Family: ${FAMILY_LABELS[target.family]}`);
  console.log(`CWEs: ${cwes.length > 0 ? cwes.join(", ") : "none mapped"}`);
  console.log(`Frameworks: ${Object.keys(frameworkMap).join(", ") || "FedRAMP only"}`);
  console.log("");

  // Generate content
  let generated;
  if (opts.noAi) {
    console.log("Using template-based generation (--no-ai)...\n");
    generated = generateFromTemplate(target, cwes, frameworkMap);
  } else {
    console.log("Generating with Claude AI...\n");
    try {
      generated = await generateWithClaude(target, cwes, frameworkMap);
    } catch (err) {
      console.error(`AI generation failed: ${err.message}`);
      console.log("Falling back to template-based generation...\n");
      generated = generateFromTemplate(target, cwes, frameworkMap);
    }
  }

  // Validate X thread tweet lengths
  const threadIssues = [];
  for (let i = 0; i < generated.x_thread.length; i++) {
    const cc = charCount(generated.x_thread[i]);
    if (cc > 280) {
      threadIssues.push(`Tweet ${i + 1}: ${cc} chars (over by ${cc - 280})`);
    }
  }

  if (threadIssues.length > 0) {
    console.warn("Warning: Some tweets exceed 280 characters:");
    threadIssues.forEach((issue) => console.warn(`  ${issue}`));
    console.warn("Truncating to fit...\n");
    generated.x_thread = generated.x_thread.map((tweet) => {
      if (charCount(tweet) > 280) return truncateForTweet(tweet, 275);
      return tweet;
    });
  }

  // Preview output
  console.log("=".repeat(70));
  console.log("X/TWITTER THREAD");
  console.log("=".repeat(70));
  generated.x_thread.forEach((tweet, i) => {
    console.log(`\n--- Tweet ${i + 1} (${charCount(tweet)} chars) ---`);
    console.log(tweet);
  });

  console.log("\n" + "=".repeat(70));
  console.log("LINKEDIN POST");
  console.log("=".repeat(70));
  console.log(`\n${generated.linkedin_post}`);
  console.log(`\n(${generated.linkedin_post.length} characters)`);

  // Dry run — stop here
  if (opts.dryRun) {
    console.log("\n[DRY RUN] No files saved. Remove --dry-run to save drafts.\n");
    process.exit(0);
  }

  // Save X draft
  fs.mkdirSync(X_QUEUE_DIR, { recursive: true });
  const xDraft = createXDraft(target, generated.x_thread, date);
  const xPath = path.join(X_QUEUE_DIR, `${xDraft.id}.json`);
  fs.writeFileSync(xPath, JSON.stringify(xDraft, null, 2) + "\n");
  console.log(`\nX draft saved:        social/queue/x/${xDraft.id}.json`);

  // Save LinkedIn draft
  fs.mkdirSync(LI_QUEUE_DIR, { recursive: true });
  const liDraft = createLinkedInDraft(target, generated.linkedin_post, date);
  const liPath = path.join(LI_QUEUE_DIR, `${liDraft.id}.json`);
  fs.writeFileSync(liPath, JSON.stringify(liDraft, null, 2) + "\n");
  console.log(`LinkedIn draft saved: social/queue/linkedin/${liDraft.id}.json`);

  // Update history
  if (!history.featured.includes(target.id)) {
    history.featured.push(target.id);
  }
  history.generatedAt.push({
    controlId: target.id,
    date,
    aiGenerated: !opts.noAi,
    plainExplanation: generated.plain_explanation || "",
  });
  saveHistory(history);
  console.log(`History updated:      state/marketing/cotw-history.json`);

  const remaining = CONTROLS.length - history.featured.length;
  console.log(`\n${remaining} controls remaining (${CONTROLS.length} total, ${history.featured.length} featured)`);
  console.log("\nNext steps:");
  console.log("  1. Review the drafts in social/queue/x/ and social/queue/linkedin/");
  console.log("  2. Set approved_by and status to 'ready'");
  console.log("  3. Run: npm run social:publish:x");
  console.log("");
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
