import { describe, it, expect } from 'vitest';
import { buildRemediationPrompt } from '../prompt';
import type { RemediationRequest } from '../types';

function makeRequest(overrides: Partial<RemediationRequest> = {}): RemediationRequest {
  return {
    caseId: 'case-001',
    title: 'Critical RCE in Apache Log4j on 192.168.1.100',
    description: 'Remote code execution via JNDI injection on server 10.0.0.5',
    cveIds: ['CVE-2021-44228'],
    cweIds: ['CWE-917', 'CWE-502'],
    severity: 'CRITICAL',
    cvssScore: 10.0,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    epssScore: 0.975,
    epssPercentile: 0.999,
    kevListed: true,
    kevDueDate: '2024-01-01',
    assets: [
      {
        name: 'prod-db.internal.acme.com',
        type: 'SERVER',
        environment: 'PRODUCTION',
        criticality: 'CRITICAL',
        internetExposed: true,
      },
    ],
    findings: [
      {
        scannerType: 'DAST',
        scannerName: 'Qualys',
        observations: { host: '192.168.1.100', port: 443, path: '/api' },
      },
    ],
    ...overrides,
  };
}

describe('buildRemediationPrompt', () => {
  it('returns system and userMessage', () => {
    const { system, userMessage } = buildRemediationPrompt(makeRequest());
    expect(system).toBeTruthy();
    expect(userMessage).toBeTruthy();
  });

  it('system prompt instructs JSON output', () => {
    const { system } = buildRemediationPrompt(makeRequest());
    expect(system).toContain('valid JSON only');
    expect(system).toContain('riskAssessment');
    expect(system).toContain('immediateActions');
    expect(system).toContain('permanentFix');
  });

  it('includes CVE IDs in user message', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).toContain('CVE-2021-44228');
  });

  it('includes CWE IDs in user message', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).toContain('CWE-917');
    expect(userMessage).toContain('CWE-502');
  });

  it('includes severity and CVSS data', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).toContain('CRITICAL');
    expect(userMessage).toContain('10');
    expect(userMessage).toContain('CVSS:3.1');
  });

  it('includes EPSS score', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).toContain('0.975');
  });

  it('includes KEV status', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).toContain('KEV Listed');
    expect(userMessage).toContain('Yes');
  });

  it('redacts IP addresses in title', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).not.toContain('192.168.1.100');
    expect(userMessage).toContain('[REDACTED-');
  });

  it('redacts IP addresses in description', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).not.toContain('10.0.0.5');
  });

  it('redacts hostnames in asset names', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).not.toContain('prod-db.internal.acme.com');
  });

  it('redacts IPs in observations', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    // The observations section should not contain the raw IP
    expect(userMessage).not.toContain('"host":"192.168.1.100"');
  });

  it('includes asset context (type, environment, criticality)', () => {
    const { userMessage } = buildRemediationPrompt(makeRequest());
    expect(userMessage).toContain('SERVER');
    expect(userMessage).toContain('PRODUCTION');
    expect(userMessage).toContain('CRITICAL');
    expect(userMessage).toContain('Internet-exposed: Yes');
  });

  it('includes package info when provided', () => {
    const { userMessage } = buildRemediationPrompt(
      makeRequest({ packageName: 'log4j-core', packageVersion: '2.14.1' }),
    );
    expect(userMessage).toContain('log4j-core');
    expect(userMessage).toContain('2.14.1');
  });

  it('handles minimal request without optional fields', () => {
    const { userMessage } = buildRemediationPrompt({
      caseId: 'case-002',
      title: 'XSS in login form',
      cveIds: [],
      cweIds: [],
      severity: 'MEDIUM',
      cvssScore: null,
      cvssVector: null,
      epssScore: null,
      epssPercentile: null,
      kevListed: false,
      kevDueDate: null,
    });
    expect(userMessage).toContain('XSS in login form');
    expect(userMessage).toContain('MEDIUM');
    expect(userMessage).toContain('KEV Listed');
    expect(userMessage).toContain('No');
  });
});
