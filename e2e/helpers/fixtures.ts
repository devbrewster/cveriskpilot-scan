import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Minimal inline test data
// ---------------------------------------------------------------------------

/** A minimal .nessus XML file with one finding for upload testing. */
export const MINIMAL_NESSUS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NessusClientData_v2>
  <Report name="Test Scan" xmlns:cm="http://www.nessus.org/cm">
    <ReportHost name="192.168.1.10">
      <HostProperties>
        <tag name="HOST_START">Thu Mar 27 10:00:00 2026</tag>
        <tag name="HOST_END">Thu Mar 27 10:05:00 2026</tag>
        <tag name="host-ip">192.168.1.10</tag>
        <tag name="operating-system">Linux Kernel 5.15</tag>
      </HostProperties>
      <ReportItem port="443" svc_name="https" protocol="tcp"
                  severity="4" pluginID="12345" pluginName="Test Critical Finding"
                  pluginFamily="Web Servers">
        <description>A critical test vulnerability was found.</description>
        <cvss3_base_score>9.8</cvss3_base_score>
        <cve>CVE-2025-99999</cve>
        <solution>Apply the vendor patch.</solution>
        <risk_factor>Critical</risk_factor>
        <synopsis>Remote code execution vulnerability in test service.</synopsis>
      </ReportItem>
      <ReportItem port="22" svc_name="ssh" protocol="tcp"
                  severity="2" pluginID="12346" pluginName="Test Medium Finding"
                  pluginFamily="General">
        <description>An outdated SSH cipher is in use.</description>
        <cvss3_base_score>5.3</cvss3_base_score>
        <cve>CVE-2025-88888</cve>
        <solution>Disable weak ciphers in sshd_config.</solution>
        <risk_factor>Medium</risk_factor>
        <synopsis>Weak SSH cipher detected.</synopsis>
      </ReportItem>
    </ReportHost>
  </Report>
</NessusClientData_v2>`;

/** A minimal SARIF JSON report with one result. */
export const MINIMAL_SARIF_JSON = JSON.stringify(
  {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'TestScanner',
            version: '1.0.0',
            rules: [
              {
                id: 'TEST-001',
                shortDescription: { text: 'SQL Injection' },
                fullDescription: { text: 'SQL injection vulnerability found in query parameter.' },
                defaultConfiguration: { level: 'error' },
                properties: { 'security-severity': '9.1' },
              },
            ],
          },
        },
        results: [
          {
            ruleId: 'TEST-001',
            level: 'error',
            message: { text: 'SQL injection via user input in login endpoint.' },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: 'src/api/auth.ts', uriBaseId: '%SRCROOT%' },
                  region: { startLine: 42, startColumn: 10 },
                },
              },
            ],
          },
        ],
      },
    ],
  },
  null,
  2,
);

/** A minimal CSV vulnerability report. */
export const MINIMAL_CSV = `CVE ID,Severity,CVSS Score,Asset,Port,Description,Solution
CVE-2025-99999,Critical,9.8,192.168.1.10,443,Remote code execution in test service,Apply vendor patch
CVE-2025-88888,Medium,5.3,192.168.1.10,22,Weak SSH cipher detected,Disable weak ciphers
CVE-2025-77777,Low,2.1,192.168.1.20,80,Information disclosure via HTTP headers,Configure secure headers`;

// ---------------------------------------------------------------------------
// File creation helpers
// ---------------------------------------------------------------------------

/**
 * Write test fixture content to a temporary file and return the file path.
 * Useful for Playwright's `setInputFiles`.
 */
export function createTestFile(
  filename: string,
  content: string,
): string {
  const tmpDir = path.join(os.tmpdir(), 'cveriskpilot-e2e');
  fs.mkdirSync(tmpDir, { recursive: true });

  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/** Create a temporary .nessus test file and return its path. */
export function createNessusFile(): string {
  return createTestFile('test-scan.nessus', MINIMAL_NESSUS_XML);
}

/** Create a temporary SARIF test file and return its path. */
export function createSarifFile(): string {
  return createTestFile('test-scan.sarif', MINIMAL_SARIF_JSON);
}

/** Create a temporary CSV test file and return its path. */
export function createCsvFile(): string {
  return createTestFile('test-scan.csv', MINIMAL_CSV);
}

/**
 * Clean up temporary test fixture files.
 * Call in afterAll or globalTeardown.
 */
export function cleanupTestFiles(): void {
  const tmpDir = path.join(os.tmpdir(), 'cveriskpilot-e2e');
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
