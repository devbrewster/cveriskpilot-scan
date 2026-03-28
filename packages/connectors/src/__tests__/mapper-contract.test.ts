import { describe, it, expect } from 'vitest';
import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// Import mappers
// ---------------------------------------------------------------------------

import {
  mapTenableVuln,
  type TenableVulnerability,
} from '../mappers/tenable-mapper';

import {
  mapQualysDetection,
  type QualysDetection,
  type QualysHostDetectionEntry,
  type QualysKBVuln,
} from '../mappers/qualys-mapper';

import {
  mapCrowdStrikeVulnerability,
  mapCrowdStrikeBatch,
  type CrowdStrikeVulnerability,
} from '../mappers/crowdstrike-mapper';

import {
  mapRapid7Vulnerability,
  mapRapid7AssetVulnerabilities,
  type Rapid7Vulnerability,
  type Rapid7Asset,
} from '../mappers/rapid7-mapper';

import {
  mapSnykIssue,
  mapSnykBatch,
  type SnykIssue,
} from '../mappers/snyk-mapper';

// ---------------------------------------------------------------------------
// Import fixture data
// ---------------------------------------------------------------------------

import tenableFixture from './fixtures/tenable-response.json';
import crowdstrikeFixture from './fixtures/crowdstrike-response.json';
import rapid7Fixture from './fixtures/rapid7-response.json';
import snykFixture from './fixtures/snyk-response.json';

// ---------------------------------------------------------------------------
// Shared contract validation
// ---------------------------------------------------------------------------

const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

function assertValidCanonicalFinding(finding: CanonicalFinding, label: string): void {
  // Required string fields
  expect(finding.title, `${label}: title must be a non-empty string`).toBeTruthy();
  expect(typeof finding.title, `${label}: title type`).toBe('string');

  expect(finding.description, `${label}: description must be a non-empty string`).toBeTruthy();
  expect(typeof finding.description, `${label}: description type`).toBe('string');

  // Severity must be a valid enum value
  expect(
    VALID_SEVERITIES.includes(finding.severity as typeof VALID_SEVERITIES[number]),
    `${label}: severity "${finding.severity}" must be one of ${VALID_SEVERITIES.join(', ')}`,
  ).toBe(true);

  // Scanner fields
  expect(finding.scannerType, `${label}: scannerType must be set`).toBeTruthy();
  expect(finding.scannerName, `${label}: scannerName must be set`).toBeTruthy();

  // Asset name must be set
  expect(finding.assetName, `${label}: assetName must be set`).toBeTruthy();

  // Arrays must be arrays
  expect(Array.isArray(finding.cveIds), `${label}: cveIds must be an array`).toBe(true);
  expect(Array.isArray(finding.cweIds), `${label}: cweIds must be an array`).toBe(true);

  // CVE IDs should be properly formatted if present
  for (const cve of finding.cveIds) {
    expect(cve, `${label}: CVE ID format`).toMatch(/^CVE-\d{4}-\d{4,}$/);
  }

  // rawObservations must be an object
  expect(typeof finding.rawObservations, `${label}: rawObservations type`).toBe('object');

  // discoveredAt must be a Date
  expect(finding.discoveredAt, `${label}: discoveredAt must be a Date`).toBeInstanceOf(Date);

  // CVSS score, if present, must be a number between 0 and 10
  if (finding.cvssScore !== undefined) {
    expect(finding.cvssScore, `${label}: cvssScore`).toBeGreaterThanOrEqual(0);
    expect(finding.cvssScore, `${label}: cvssScore`).toBeLessThanOrEqual(10);
  }

  // Port, if present, must be a non-negative number
  if (finding.port !== undefined) {
    expect(finding.port, `${label}: port`).toBeGreaterThanOrEqual(0);
  }
}

// ===========================================================================
// Tenable Mapper Tests
// ===========================================================================

describe('Tenable Mapper (Contract)', () => {
  const vulns = tenableFixture.vulnerabilities as unknown as TenableVulnerability[];

  it('maps all fixture vulnerabilities to valid CanonicalFindings', () => {
    for (let i = 0; i < vulns.length; i++) {
      const finding = mapTenableVuln(vulns[i]);
      assertValidCanonicalFinding(finding, `tenable[${i}]`);
    }
  });

  it('sets scannerType to "tenable" and scannerName to "Tenable.io"', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.scannerType).toBe('tenable');
    expect(finding.scannerName).toBe('Tenable.io');
  });

  it('extracts CVE IDs from plugin.cve array', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.cveIds).toContain('CVE-2024-5535');
  });

  it('maps severity_id 4 to CRITICAL', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.severity).toBe('CRITICAL');
  });

  it('maps severity_id 3 to HIGH', () => {
    const finding = mapTenableVuln(vulns[1]);
    expect(finding.severity).toBe('HIGH');
  });

  it('maps severity_id 0 to INFO', () => {
    const finding = mapTenableVuln(vulns[2]);
    expect(finding.severity).toBe('INFO');
  });

  it('prefers CVSS v3 score over v2', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.cvssScore).toBe(9.1);
    expect(finding.cvssVersion).toBe('3.0');
  });

  it('maps hostname from asset', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.hostname).toBe('web-server-01');
    expect(finding.assetName).toBe('web-server-01');
  });

  it('maps IP address from asset', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.ipAddress).toBe('10.0.1.25');
  });

  it('maps port and protocol', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.port).toBe(443);
    expect(finding.protocol).toBe('tcp');
  });

  it('handles findings with no CVEs (info-level)', () => {
    const finding = mapTenableVuln(vulns[2]);
    expect(finding.cveIds).toEqual([]);
    expect(finding.severity).toBe('INFO');
  });

  it('preserves raw observations with plugin details', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.rawObservations.pluginId).toBe(198765);
    expect(finding.rawObservations.exploitAvailable).toBe(true);
    expect(finding.rawObservations.hasPatch).toBe(true);
  });

  it('maps discoveredAt from first_found', () => {
    const finding = mapTenableVuln(vulns[0]);
    expect(finding.discoveredAt).toEqual(new Date('2024-07-01T12:00:00Z'));
  });
});

// ===========================================================================
// Qualys Mapper Tests
// ===========================================================================

describe('Qualys Mapper (Contract)', () => {
  const host: QualysHostDetectionEntry = {
    ID: 12345,
    IP: '192.168.1.100',
    DNS: 'webserver.corp.example.com',
    DNS_DATA: {
      HOSTNAME: 'webserver',
      DOMAIN: 'corp.example.com',
      FQDN: 'webserver.corp.example.com',
    },
    OS: 'Ubuntu Linux 22.04',
  };

  const detection: QualysDetection = {
    QID: 370876,
    TYPE: 'Vulnerability',
    SEVERITY: 5,
    PORT: 443,
    PROTOCOL: 'tcp',
    SSL: true,
    RESULTS: 'OpenSSL version 3.0.2 detected.',
    STATUS: 'Active',
    FIRST_FOUND_DATETIME: '2024-07-01T10:00:00Z',
    LAST_FOUND_DATETIME: '2024-08-15T14:00:00Z',
    TIMES_FOUND: 5,
    IS_IGNORED: false,
    IS_DISABLED: false,
  };

  const kbLookup = new Map<number, QualysKBVuln>([
    [
      370876,
      {
        QID: 370876,
        VULN_TYPE: 'Vulnerability',
        SEVERITY_LEVEL: 5,
        TITLE: 'OpenSSL 3.0.x Buffer Over-Read Vulnerability',
        DIAGNOSIS: 'The host is running a vulnerable version of OpenSSL.',
        CONSEQUENCE: 'An attacker could cause denial of service or data leakage.',
        SOLUTION: 'Upgrade to OpenSSL 3.0.14 or later.',
        CVE_LIST: {
          CVE: [
            { ID: 'CVE-2024-5535', URL: 'https://nvd.nist.gov/vuln/detail/CVE-2024-5535' },
          ],
        },
        CVSS_V3: {
          BASE: '9.1',
          VECTOR_STRING: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:H',
        },
        PATCHABLE: true,
        CATEGORY: 'Web Servers',
      },
    ],
  ]);

  it('maps a detection to a valid CanonicalFinding', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    assertValidCanonicalFinding(finding, 'qualys-detection');
  });

  it('sets scannerType to "qualys" and scannerName to "Qualys VMDR"', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    expect(finding.scannerType).toBe('qualys');
    expect(finding.scannerName).toBe('Qualys VMDR');
  });

  it('extracts CVE IDs from KB', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    expect(finding.cveIds).toContain('CVE-2024-5535');
  });

  it('maps severity 5 to CRITICAL', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    expect(finding.severity).toBe('CRITICAL');
  });

  it('maps severity 3 to MEDIUM', () => {
    const medDetection: QualysDetection = { ...detection, QID: 99999, SEVERITY: 3 };
    const finding = mapQualysDetection(medDetection, host, new Map());
    expect(finding.severity).toBe('MEDIUM');
  });

  it('maps hostname from DNS_DATA', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    expect(finding.hostname).toBe('webserver');
    expect(finding.assetName).toBe('webserver');
  });

  it('maps IP address from host', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    expect(finding.ipAddress).toBe('192.168.1.100');
  });

  it('uses KB title and CVSS v3 score', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    expect(finding.title).toBe('OpenSSL 3.0.x Buffer Over-Read Vulnerability');
    expect(finding.cvssScore).toBe(9.1);
    expect(finding.cvssVersion).toBe('3.0');
  });

  it('falls back to QID title when KB lookup misses', () => {
    const unknownDetection: QualysDetection = { ...detection, QID: 99999 };
    const finding = mapQualysDetection(unknownDetection, host, new Map());
    expect(finding.title).toBe('QID 99999');
  });

  it('maps port and protocol from detection', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    expect(finding.port).toBe(443);
    expect(finding.protocol).toBe('tcp');
  });

  it('preserves raw observations with QID and status', () => {
    const finding = mapQualysDetection(detection, host, kbLookup);
    expect(finding.rawObservations.qid).toBe(370876);
    expect(finding.rawObservations.status).toBe('Active');
    expect(finding.rawObservations.patchable).toBe(true);
  });
});

// ===========================================================================
// CrowdStrike Mapper Tests
// ===========================================================================

describe('CrowdStrike Mapper (Contract)', () => {
  const vulns = crowdstrikeFixture.resources as unknown as CrowdStrikeVulnerability[];

  it('maps all fixture vulnerabilities to valid CanonicalFindings', () => {
    for (let i = 0; i < vulns.length; i++) {
      const finding = mapCrowdStrikeVulnerability(vulns[i]);
      assertValidCanonicalFinding(finding, `crowdstrike[${i}]`);
    }
  });

  it('sets scannerType to "crowdstrike" and scannerName correctly', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.scannerType).toBe('crowdstrike');
    expect(finding.scannerName).toBe('CrowdStrike Falcon Spotlight');
  });

  it('extracts CVE ID from cve.id', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.cveIds).toContain('CVE-2024-6387');
  });

  it('maps HIGH severity correctly', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.severity).toBe('HIGH');
  });

  it('maps CRITICAL severity correctly', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[1]);
    expect(finding.severity).toBe('CRITICAL');
  });

  it('maps MEDIUM severity correctly', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[2]);
    expect(finding.severity).toBe('MEDIUM');
  });

  it('maps hostname from host_info', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.hostname).toBe('prod-web-01');
    expect(finding.assetName).toBe('prod-web-01');
  });

  it('maps IP address from host_info.local_ip', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.ipAddress).toBe('10.10.1.50');
  });

  it('maps CVSS base score', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.cvssScore).toBe(8.1);
  });

  it('maps CVSS vector', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.cvssVector).toContain('CVSS:3.1');
  });

  it('includes package info in title', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.title).toContain('CVE-2024-6387');
    expect(finding.title).toContain('OpenSSH 9.6p1');
  });

  it('preserves raw observations', () => {
    const finding = mapCrowdStrikeVulnerability(vulns[0]);
    expect(finding.rawObservations.crowdstrikeVulnId).toBe('vuln_001_abc123');
    expect(finding.rawObservations.status).toBe('open');
  });

  it('batch mapper processes all vulnerabilities', () => {
    const findings = mapCrowdStrikeBatch(vulns);
    expect(findings).toHaveLength(3);
    for (let i = 0; i < findings.length; i++) {
      assertValidCanonicalFinding(findings[i], `crowdstrike-batch[${i}]`);
    }
  });
});

// ===========================================================================
// Rapid7 Mapper Tests
// ===========================================================================

describe('Rapid7 Mapper (Contract)', () => {
  const asset1: Rapid7Asset = rapid7Fixture.assets.resources[0] as unknown as Rapid7Asset;
  const asset2: Rapid7Asset = rapid7Fixture.assets.resources[1] as unknown as Rapid7Asset;
  const vulns1 = rapid7Fixture.vulnerabilities.asset_1001.resources as unknown as Rapid7Vulnerability[];
  const vulns2 = rapid7Fixture.vulnerabilities.asset_1002.resources as unknown as Rapid7Vulnerability[];

  it('maps all fixture vulnerabilities to valid CanonicalFindings', () => {
    for (let i = 0; i < vulns1.length; i++) {
      const finding = mapRapid7Vulnerability(vulns1[i], asset1);
      assertValidCanonicalFinding(finding, `rapid7-asset1[${i}]`);
    }
    for (let i = 0; i < vulns2.length; i++) {
      const finding = mapRapid7Vulnerability(vulns2[i], asset2);
      assertValidCanonicalFinding(finding, `rapid7-asset2[${i}]`);
    }
  });

  it('sets scannerType to "rapid7" and scannerName to "Rapid7 InsightVM"', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.scannerType).toBe('rapid7');
    expect(finding.scannerName).toBe('Rapid7 InsightVM');
  });

  it('extracts CVE IDs from cves array', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.cveIds).toContain('CVE-2024-38063');
  });

  it('extracts CVE IDs from references', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    // CVE-2024-38063 should appear from both cves and references
    expect(finding.cveIds).toContain('CVE-2024-38063');
  });

  it('extracts CWE IDs from references', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.cweIds).toContain('CWE-191');
  });

  it('maps Critical severity correctly', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.severity).toBe('CRITICAL');
  });

  it('maps Severe severity to HIGH', () => {
    const finding = mapRapid7Vulnerability(vulns2[0], asset2);
    expect(finding.severity).toBe('HIGH');
  });

  it('maps Moderate severity to MEDIUM', () => {
    const finding = mapRapid7Vulnerability(vulns1[1], asset1);
    expect(finding.severity).toBe('MEDIUM');
  });

  it('maps hostname from asset', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.hostname).toBe('mail-server-01');
    expect(finding.assetName).toBe('mail-server-01');
  });

  it('maps IP address from asset', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.ipAddress).toBe('172.16.0.10');
  });

  it('prefers CVSS v3 score over v2', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.cvssScore).toBe(9.8);
    expect(finding.cvssVersion).toBe('3.x');
  });

  it('maps port and protocol from results', () => {
    const finding = mapRapid7Vulnerability(vulns1[1], asset1);
    expect(finding.port).toBe(445);
    expect(finding.protocol).toBe('tcp');
  });

  it('maps proof as snippet', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.snippet).toContain('Windows TCP/IP stack');
  });

  it('preserves raw observations', () => {
    const finding = mapRapid7Vulnerability(vulns1[0], asset1);
    expect(finding.rawObservations.rapid7VulnId).toBe('msft-cve-2024-38063');
    expect(finding.rawObservations.rapid7AssetId).toBe(1001);
  });

  it('batch mapper processes all vulns for an asset', () => {
    const findings = mapRapid7AssetVulnerabilities(vulns1, asset1);
    expect(findings).toHaveLength(2);
    for (let i = 0; i < findings.length; i++) {
      assertValidCanonicalFinding(findings[i], `rapid7-batch[${i}]`);
    }
  });
});

// ===========================================================================
// Snyk Mapper Tests
// ===========================================================================

describe('Snyk Mapper (Contract)', () => {
  const issues = snykFixture.data as unknown as SnykIssue[];

  it('maps all fixture issues to valid CanonicalFindings', () => {
    for (let i = 0; i < issues.length; i++) {
      const finding = mapSnykIssue(issues[i]);
      assertValidCanonicalFinding(finding, `snyk[${i}]`);
    }
  });

  it('sets scannerType to "snyk" and scannerName to "Snyk"', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.scannerType).toBe('snyk');
    expect(finding.scannerName).toBe('Snyk');
  });

  it('extracts CVE IDs from problems', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.cveIds).toContain('CVE-2021-23337');
  });

  it('extracts CWE IDs from problems', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.cweIds).toContain('CWE-1321');
  });

  it('maps high severity correctly', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.severity).toBe('HIGH');
  });

  it('maps critical severity correctly', () => {
    const finding = mapSnykIssue(issues[1]);
    expect(finding.severity).toBe('CRITICAL');
  });

  it('maps low severity correctly', () => {
    const finding = mapSnykIssue(issues[2]);
    expect(finding.severity).toBe('LOW');
  });

  it('extracts CVSS v3 score from severities', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.cvssScore).toBe(7.2);
    expect(finding.cvssVector).toContain('CVSS:3.1');
    expect(finding.cvssVersion).toBe('3.x');
  });

  it('extracts package name and version from coordinates', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.packageName).toBe('lodash');
    expect(finding.packageVersion).toBe('4.17.20');
  });

  it('extracts fixed version from coordinates remedies', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.fixedVersion).toBe('lodash@4.17.21');
  });

  it('uses project name as assetName when provided', () => {
    const finding = mapSnykIssue(issues[0], 'my-frontend-app');
    expect(finding.assetName).toBe('my-frontend-app');
  });

  it('falls back to packageName or key for assetName', () => {
    const finding = mapSnykIssue(issues[0]);
    // Should fall back to packageName since no projectName given
    expect(finding.assetName).toBe('lodash');
  });

  it('sets assetType based on issue type', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.assetType).toBe('package');
  });

  it('preserves raw observations with Snyk-specific data', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.rawObservations.snykIssueId).toBe('snyk-issue-001-abc');
    expect(finding.rawObservations.issueType).toBe('package_vulnerability');
    expect(finding.rawObservations.tool).toBe('snyk-sca');
  });

  it('maps discoveredAt from created_at', () => {
    const finding = mapSnykIssue(issues[0]);
    expect(finding.discoveredAt).toEqual(new Date('2024-06-01T10:00:00Z'));
  });

  it('batch mapper processes all issues', () => {
    const findings = mapSnykBatch(issues, 'test-project');
    expect(findings).toHaveLength(3);
    for (let i = 0; i < findings.length; i++) {
      assertValidCanonicalFinding(findings[i], `snyk-batch[${i}]`);
      expect(findings[i].assetName).toBe('test-project');
    }
  });
});
