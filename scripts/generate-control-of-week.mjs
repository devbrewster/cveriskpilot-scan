#!/usr/bin/env node
/**
 * Compliance Control of the Week — Content Generator
 *
 * Generates X thread content from NIST 800-53 control catalog.
 * Sources: packages/compliance/src/mapping/nist-800-53.ts + cross-framework.ts
 *
 * Usage:
 *   node scripts/generate-control-of-week.mjs                # Next unposted control
 *   node scripts/generate-control-of-week.mjs --control SI-2  # Specific control
 *   node scripts/generate-control-of-week.mjs --list          # List all available controls
 *
 * Output: Creates draft in social/calendar/control-of-week/drafts.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Control Data (sourced from packages/compliance — duplicated here for
// zero-dependency script execution without building TypeScript first)
// ---------------------------------------------------------------------------

const FAMILY_LABELS = {
  AC: 'Access Control',
  AU: 'Audit & Accountability',
  CM: 'Configuration Management',
  IA: 'Identification & Authentication',
  RA: 'Risk Assessment',
  SA: 'System & Services Acquisition',
  SC: 'System & Communications Protection',
  SI: 'System & Information Integrity',
};

const CONTROLS = [
  { id: 'AC-3', family: 'AC', title: 'Access Enforcement', plain: 'Only the right people can access the right things. Sounds obvious? 60% of breaches involve access control failures.', cwes: ['CWE-284', 'CWE-285', 'CWE-862'], frameworks: { 'SOC 2': 'CC6.1', CMMC: 'AC.L2-3.1.2', FedRAMP: 'AC-3', HIPAA: '164.312(a)', 'PCI-DSS': 'Req-7.2', 'ISO 27001': 'A.8.3' } },
  { id: 'AC-6', family: 'AC', title: 'Least Privilege', plain: 'Give users the minimum access they need. Not "admin because it was easier to set up."', cwes: ['CWE-269', 'CWE-250'], frameworks: { 'SOC 2': 'CC6.3', CMMC: 'AC.L2-3.1.5', FedRAMP: 'AC-6' } },
  { id: 'AU-2', family: 'AU', title: 'Event Logging', plain: 'If nobody logged it, it didn\'t happen. Your auditor will ask for evidence. "We don\'t log that" is not an answer.', cwes: ['CWE-778'], frameworks: { 'SOC 2': 'CC7.2', CMMC: 'AU.L2-3.3.1', FedRAMP: 'AU-2' } },
  { id: 'CM-6', family: 'CM', title: 'Configuration Settings', plain: 'Document your configs. "It works on my machine" fails audits. Security config baselines are the difference between compliant and compromised.', cwes: ['CWE-16', 'CWE-1188'], frameworks: { 'SOC 2': 'CC8.1', CMMC: 'CM.L2-3.4.2', FedRAMP: 'CM-6' } },
  { id: 'CM-8', family: 'CM', title: 'System Component Inventory', plain: 'You can\'t secure what you don\'t know you have. An SBOM is step one. Most teams skip it until an auditor asks.', cwes: ['CWE-1059'], frameworks: { 'SOC 2': 'CC8.1', CMMC: 'CM.L2-3.4.1', FedRAMP: 'CM-8' } },
  { id: 'IA-2', family: 'IA', title: 'Identification and Authentication', plain: 'Prove you are who you say you are. MFA isn\'t optional anymore — it\'s in every framework. CMMC, SOC 2, FedRAMP, HIPAA. All of them.', cwes: ['CWE-287', 'CWE-306'], frameworks: { 'SOC 2': 'CC6.1', CMMC: 'IA.L2-3.5.3', FedRAMP: 'IA-2', HIPAA: '164.312(d)' } },
  { id: 'IA-5', family: 'IA', title: 'Authenticator Management', plain: 'Hardcoded API keys in your repo? That\'s an IA-5 failure. Password rotation, credential storage, MFA tokens — all under this control.', cwes: ['CWE-798', 'CWE-521', 'CWE-522'], frameworks: { 'SOC 2': 'CC6.1', CMMC: 'IA.L2-3.5.7', FedRAMP: 'IA-5' } },
  { id: 'RA-5', family: 'RA', title: 'Vulnerability Monitoring and Scanning', plain: 'Scan your stuff. Regularly. And actually fix what you find. 74 days is the average time to remediate. Your SLA says 30. Do the math.', cwes: ['CWE-1035'], frameworks: { 'SOC 2': 'CC7.1', CMMC: 'RA.L2-3.11.2', FedRAMP: 'RA-5', HIPAA: '164.308(a)(1)', 'PCI-DSS': 'Req-6.1' } },
  { id: 'SA-10', family: 'SA', title: 'Developer Configuration Management', plain: 'Track what changed, who changed it, and why. Git blame is not a compliance tool (but it helps). This control is why you need code review policies.', cwes: ['CWE-1127'], frameworks: { CMMC: 'SA.L2-3.13.2', FedRAMP: 'SA-10' } },
  { id: 'SC-8', family: 'SC', title: 'Transmission Confidentiality and Integrity', plain: 'Encrypt data in transit. TLS everywhere. If your API accepts HTTP in 2026, that\'s not a finding — it\'s a confession.', cwes: ['CWE-319', 'CWE-311'], frameworks: { 'SOC 2': 'CC6.7', CMMC: 'SC.L2-3.13.8', FedRAMP: 'SC-8', HIPAA: '164.312(e)', 'PCI-DSS': 'Req-4.1' } },
  { id: 'SC-12', family: 'SC', title: 'Cryptographic Key Establishment and Management', plain: 'How do you manage your encryption keys? "They\'re in the .env file" is wrong. KMS, rotation, access control. Keys are the keys to the kingdom.', cwes: ['CWE-320', 'CWE-326'], frameworks: { 'SOC 2': 'CC6.1', FedRAMP: 'SC-12', 'PCI-DSS': 'Req-3.5' } },
  { id: 'SC-28', family: 'SC', title: 'Protection of Information at Rest', plain: 'Encrypt your database. Encrypt your backups. Encrypt your logs if they contain PII. "We\'ll add encryption later" is how breaches start.', cwes: ['CWE-312', 'CWE-311'], frameworks: { 'SOC 2': 'CC6.7', CMMC: 'SC.L2-3.13.16', FedRAMP: 'SC-28', HIPAA: '164.312(a)(2)(iv)', 'PCI-DSS': 'Req-3.4' } },
  { id: 'SI-2', family: 'SI', title: 'Flaw Remediation', plain: 'Patch your stuff. CISA KEV says "fix these now." Your POAM says "we\'ll get to it." Your auditor says "show me evidence." This is the control that ties them together.', cwes: ['CWE-1035'], frameworks: { 'SOC 2': 'CC7.1', CMMC: 'SI.L2-3.14.1', FedRAMP: 'SI-2', HIPAA: '164.308(a)(1)', 'PCI-DSS': 'Req-6.3', 'ISO 27001': 'A.8.8' } },
  { id: 'SI-3', family: 'SI', title: 'Malicious Code Protection', plain: 'Antivirus is the obvious one. But this also covers supply chain attacks — typosquatting, dependency confusion, hijacked packages. Your npm install is a threat vector.', cwes: ['CWE-506', 'CWE-507'], frameworks: { CMMC: 'SI.L2-3.14.2', FedRAMP: 'SI-3' } },
  { id: 'SI-4', family: 'SI', title: 'System Monitoring', plain: 'Watch your systems. Alerts on anomalies. Log aggregation. If someone exfils your database at 3am and nobody notices until Monday — that\'s an SI-4 failure.', cwes: ['CWE-778', 'CWE-223'], frameworks: { 'SOC 2': 'CC7.2', CMMC: 'SI.L2-3.14.6', FedRAMP: 'SI-4' } },
  { id: 'SI-10', family: 'SI', title: 'Information Input Validation', plain: 'Validate your inputs. SQL injection is 25 years old and still in the OWASP Top 10. XSS, command injection, path traversal — all SI-10.', cwes: ['CWE-20', 'CWE-79', 'CWE-89', 'CWE-78'], frameworks: { CMMC: 'SI.L2-3.14.1', FedRAMP: 'SI-10', 'PCI-DSS': 'Req-6.5' } },
];

// ---------------------------------------------------------------------------
// Thread Generator
// ---------------------------------------------------------------------------

function generateThread(control) {
  const familyLabel = FAMILY_LABELS[control.family];
  const fwList = Object.entries(control.frameworks)
    .map(([fw, ctrlId]) => `${fw}: ${ctrlId}`)
    .join('\n');
  const cweList = control.cwes.join(', ');
  const fwCount = Object.keys(control.frameworks).length;

  const thread = [
    // Tweet 1: Hook
    `Compliance Control of the Week: ${control.id} — ${control.title}\n\nFamily: ${familyLabel}\n\n${control.plain}`,
    // Tweet 2: Cross-framework mapping
    `${control.id} maps to ${fwCount} frameworks:\n\n${fwList}\n\nOne vulnerability can trigger findings across all of them. That\'s why mapping matters.`,
    // Tweet 3: CWE connection
    `Related weaknesses: ${cweList}\n\nIf your scanner finds any of these CWEs, ${control.id} is the compliance control your auditor cares about.\n\nMost tools show the CVE. We show which controls it threatens.`,
    // Tweet 4: CTA
    `Map your vulnerabilities to ${control.id} and ${CONTROLS.length * 4}+ other controls automatically.\n\nFree CLI: npx @cveriskpilot/scan@latest\nPlatform: https://cveriskpilot.com/signup?ref=x-cotw\n\n#ComplianceAutomation #${control.family} #NIST80053`,
  ];

  return thread;
}

// ---------------------------------------------------------------------------
// Draft Management
// ---------------------------------------------------------------------------

const DRAFTS_DIR = join(ROOT, 'social', 'calendar', 'control-of-week');
const DRAFTS_FILE = join(DRAFTS_DIR, 'drafts.json');
const POSTED_FILE = join(DRAFTS_DIR, 'posted.json');

function loadPosted() {
  try {
    return JSON.parse(readFileSync(POSTED_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function loadDrafts() {
  try {
    return JSON.parse(readFileSync(DRAFTS_FILE, 'utf-8'));
  } catch {
    return { campaign: 'Compliance Control of the Week', drafts: [] };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.includes('--list')) {
  console.log('\nAvailable NIST 800-53 Controls:\n');
  const posted = loadPosted();
  for (const ctrl of CONTROLS) {
    const status = posted.includes(ctrl.id) ? '[POSTED]' : '[AVAILABLE]';
    const fwCount = Object.keys(ctrl.frameworks).length;
    console.log(`  ${status} ${ctrl.id.padEnd(8)} ${ctrl.title.padEnd(45)} ${fwCount} frameworks  ${ctrl.cwes.join(', ')}`);
  }
  console.log(`\n  ${CONTROLS.length} controls total, ${CONTROLS.length - posted.length} remaining\n`);
  process.exit(0);
}

// Determine which control to generate
let targetControl;
const controlFlag = args.indexOf('--control');

if (controlFlag >= 0 && args[controlFlag + 1]) {
  const id = args[controlFlag + 1].toUpperCase();
  targetControl = CONTROLS.find((c) => c.id === id);
  if (!targetControl) {
    console.error(`Control ${id} not found. Use --list to see available controls.`);
    process.exit(1);
  }
} else {
  // Pick next unposted control
  const posted = loadPosted();
  targetControl = CONTROLS.find((c) => !posted.includes(c.id));
  if (!targetControl) {
    console.log('All controls have been posted! Reset posted.json to start over.');
    process.exit(0);
  }
}

// Generate thread
const thread = generateThread(targetControl);
const weekNum = Math.ceil((Date.now() - new Date('2026-03-31').getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

console.log(`\nCompliance Control of the Week #${weekNum}: ${targetControl.id} — ${targetControl.title}`);
console.log('='.repeat(70));

thread.forEach((tweet, i) => {
  console.log(`\n--- Tweet ${i + 1} (${tweet.length} chars) ---`);
  console.log(tweet);
});

// Save draft
mkdirSync(DRAFTS_DIR, { recursive: true });
const drafts = loadDrafts();
const draftId = `cotw-${targetControl.id.toLowerCase()}-${Date.now()}`;

drafts.drafts.push({
  id: draftId,
  status: 'draft',
  approved_by: null,
  type: 'compliance-control-of-week',
  control_id: targetControl.id,
  control_title: targetControl.title,
  created_at: new Date().toISOString(),
  platforms: {
    x: {
      status: 'draft',
      thread: thread.map((t, i) => ({
        position: i + 1,
        content: t,
        character_count: t.length,
      })),
    },
  },
  tags: ['compliance', 'nist-800-53', targetControl.family.toLowerCase(), 'education'],
  hashtags: ['#ComplianceAutomation', '#NIST80053', `#${targetControl.family}`, '#GRC'],
});

writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
console.log(`\nDraft saved to: social/calendar/control-of-week/drafts.json`);
console.log(`Draft ID: ${draftId}`);
console.log(`\nTo publish: npm run social:publish:x (after approval)\n`);
