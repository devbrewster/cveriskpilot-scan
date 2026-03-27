import { describe, it, expect } from 'vitest';
import { parseNessus } from '../parsers/nessus.js';

const MINIMAL_NESSUS = `<?xml version="1.0" ?>
<NessusClientData_v2>
  <Report name="Test Scan">
    <ReportHost name="webserver01">
      <HostProperties>
        <tag name="host-ip">192.168.1.10</tag>
      </HostProperties>
      <ReportItem port="443" protocol="tcp" svc_name="https" pluginID="12345" pluginName="SSL Certificate Expired" severity="3">
        <synopsis>The SSL certificate has expired.</synopsis>
        <description>The remote host is using an expired SSL certificate.</description>
        <solution>Renew the SSL certificate.</solution>
        <cvss3_base_score>7.5</cvss3_base_score>
        <cvss3_vector>CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N</cvss3_vector>
        <cve>CVE-2023-12345</cve>
        <cwe>295</cwe>
      </ReportItem>
      <ReportItem port="80" protocol="tcp" svc_name="http" pluginID="67890" pluginName="Apache HTTP Server Info Disclosure" severity="1">
        <synopsis>The web server discloses information.</synopsis>
        <description>Apache httpd server version disclosure via Server header.</description>
        <solution>Disable the Server header.</solution>
        <cve>CVE-2023-67890</cve>
      </ReportItem>
    </ReportHost>
  </Report>
</NessusClientData_v2>`;

describe('Nessus Parser', () => {
  it('should parse a valid .nessus XML and return correct number of findings', async () => {
    const result = await parseNessus(MINIMAL_NESSUS);
    expect(result.format).toBe('NESSUS');
    expect(result.scannerName).toBe('nessus');
    expect(result.findings).toHaveLength(2);
    expect(result.metadata.totalFindings).toBe(2);
    expect(result.metadata.errors).toHaveLength(0);
  });

  it('should extract CVE IDs correctly', async () => {
    const result = await parseNessus(MINIMAL_NESSUS);
    expect(result.findings[0]!.cveIds).toContain('CVE-2023-12345');
    expect(result.findings[1]!.cveIds).toContain('CVE-2023-67890');
  });

  it('should map severity levels correctly', async () => {
    const result = await parseNessus(MINIMAL_NESSUS);
    expect(result.findings[0]!.severity).toBe('HIGH'); // severity=3
    expect(result.findings[1]!.severity).toBe('LOW'); // severity=1
  });

  it('should extract asset info correctly', async () => {
    const result = await parseNessus(MINIMAL_NESSUS);
    const f = result.findings[0]!;
    expect(f.assetName).toBe('192.168.1.10');
    expect(f.hostname).toBe('webserver01');
    expect(f.ipAddress).toBe('192.168.1.10');
    expect(f.port).toBe(443);
    expect(f.protocol).toBe('tcp');
  });

  it('should extract CVSS info', async () => {
    const result = await parseNessus(MINIMAL_NESSUS);
    const f = result.findings[0]!;
    expect(f.cvssScore).toBe(7.5);
    expect(f.cvssVector).toBe('CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N');
  });

  it('should extract CWE IDs', async () => {
    const result = await parseNessus(MINIMAL_NESSUS);
    expect(result.findings[0]!.cweIds).toContain('CWE-295');
  });

  it('should set scannerType to VM', async () => {
    const result = await parseNessus(MINIMAL_NESSUS);
    expect(result.findings[0]!.scannerType).toBe('VM');
  });

  it('should handle Buffer input', async () => {
    const buf = Buffer.from(MINIMAL_NESSUS, 'utf-8');
    const result = await parseNessus(buf);
    expect(result.findings).toHaveLength(2);
  });

  it('should handle invalid XML gracefully', async () => {
    const result = await parseNessus('<not valid xml>>>');
    expect(result.findings).toHaveLength(0);
  });
});
