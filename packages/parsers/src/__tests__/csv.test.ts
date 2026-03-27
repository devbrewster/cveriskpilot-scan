import { describe, it, expect } from 'vitest';
import { parseCsv } from '../parsers/csv.js';

const MINIMAL_CSV = `title,severity,cve,host,ip,port,description,cvss
SSL Certificate Expired,HIGH,CVE-2023-12345,webserver01,192.168.1.10,443,The SSL certificate has expired,7.5
Apache Info Disclosure,LOW,CVE-2023-67890,webserver01,192.168.1.10,80,Apache version disclosed,3.1`;

const TAB_DELIMITED = `Title\tSeverity\tCVE\tHostname\tIP_Address\tPort
Buffer Overflow\tCritical\tCVE-2024-00001\tdbserver\t10.0.0.5\t3306`;

describe('CSV Parser', () => {
  it('should parse CSV with correct number of findings', async () => {
    const result = await parseCsv(MINIMAL_CSV);
    expect(result.format).toBe('CSV');
    expect(result.scannerName).toBe('csv-import');
    expect(result.findings).toHaveLength(2);
    expect(result.metadata.totalFindings).toBe(2);
  });

  it('should extract CVE IDs correctly', async () => {
    const result = await parseCsv(MINIMAL_CSV);
    expect(result.findings[0]!.cveIds).toContain('CVE-2023-12345');
    expect(result.findings[1]!.cveIds).toContain('CVE-2023-67890');
  });

  it('should map severity correctly', async () => {
    const result = await parseCsv(MINIMAL_CSV);
    expect(result.findings[0]!.severity).toBe('HIGH');
    expect(result.findings[1]!.severity).toBe('LOW');
  });

  it('should extract asset info', async () => {
    const result = await parseCsv(MINIMAL_CSV);
    const f = result.findings[0]!;
    expect(f.assetName).toBe('webserver01');
    expect(f.ipAddress).toBe('192.168.1.10');
    expect(f.port).toBe(443);
  });

  it('should extract CVSS score', async () => {
    const result = await parseCsv(MINIMAL_CSV);
    expect(result.findings[0]!.cvssScore).toBe(7.5);
  });

  it('should handle tab-delimited data', async () => {
    const result = await parseCsv(TAB_DELIMITED);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.cveIds).toContain('CVE-2024-00001');
    expect(result.findings[0]!.severity).toBe('CRITICAL');
  });

  it('should set scannerType to VM', async () => {
    const result = await parseCsv(MINIMAL_CSV);
    expect(result.findings[0]!.scannerType).toBe('VM');
  });

  it('should handle empty CSV', async () => {
    const result = await parseCsv('title,severity\n');
    expect(result.findings).toHaveLength(0);
  });
});
