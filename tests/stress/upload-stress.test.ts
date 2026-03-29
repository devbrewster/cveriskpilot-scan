/**
 * Upload Pipeline Stress Test
 *
 * Tests parser performance, memory usage, and correctness under load:
 *   - Synthetic file generation (Nessus XML, SARIF, CSV, CycloneDX, OpenVAS, Qualys)
 *   - Parser throughput with 10, 100, 1000, 5000 findings per file
 *   - Concurrent parsing (10 files in parallel)
 *   - Malformed / corrupt input handling
 *   - Memory usage tracking per parser
 *   - Deduplication stress with overlapping CVEs
 *
 * Usage:
 *   npx vitest run tests/stress/upload-stress.test.ts
 *   npx vitest run tests/stress/upload-stress.test.ts --reporter=verbose
 */

import { describe, it, expect } from 'vitest';
import { parseNessus } from '../../packages/parsers/src/parsers/nessus';
import { parseSarif } from '../../packages/parsers/src/parsers/sarif';
import { parseCsv } from '../../packages/parsers/src/parsers/csv';
import { parseCycloneDx } from '../../packages/parsers/src/parsers/cyclonedx';
import { parseOpenvas } from '../../packages/parsers/src/parsers/openvas';
import { parseQualys } from '../../packages/parsers/src/parsers/qualys';
import type { ParseResult } from '../../packages/parsers/src/types';

// ─── Synthetic File Generators ──────────────────────────────────────────────

const CVES = [
  'CVE-2024-3094', 'CVE-2024-21762', 'CVE-2023-44487', 'CVE-2023-4863',
  'CVE-2024-1709', 'CVE-2023-46805', 'CVE-2024-21887', 'CVE-2024-0204',
  'CVE-2023-22515', 'CVE-2023-34362', 'CVE-2024-27198', 'CVE-2023-20198',
  'CVE-2024-23897', 'CVE-2023-38545', 'CVE-2024-6387', 'CVE-2023-3519',
  'CVE-2023-27997', 'CVE-2023-36884', 'CVE-2023-28771', 'CVE-2024-2961',
];

const SEVERITIES = [0, 1, 2, 3, 4]; // Nessus severity levels
const HOSTS = Array.from({ length: 50 }, (_, i) => `192.168.1.${i + 1}`);
const PORTS = [22, 80, 443, 3306, 5432, 8080, 8443, 9200, 27017, 6379];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNessusXml(findingCount: number): string {
  const hostsNeeded = Math.min(Math.ceil(findingCount / 10), HOSTS.length);
  const findingsPerHost = Math.ceil(findingCount / hostsNeeded);

  let xml = `<?xml version="1.0" ?>\n<NessusClientData_v2>\n<Report name="stress-test">\n`;

  let remaining = findingCount;
  for (let h = 0; h < hostsNeeded && remaining > 0; h++) {
    const ip = HOSTS[h];
    xml += `<ReportHost name="${ip}">
<HostProperties><tag name="host-ip">${ip}</tag></HostProperties>\n`;

    const count = Math.min(findingsPerHost, remaining);
    for (let f = 0; f < count; f++) {
      const sev = SEVERITIES[f % 5];
      const pluginId = 10000 + h * 1000 + f;
      const cve = CVES[(h * count + f) % CVES.length];
      const port = PORTS[f % PORTS.length];

      xml += `<ReportItem pluginID="${pluginId}" pluginName="Plugin ${pluginId} — ${cve}" severity="${sev}" port="${port}" protocol="tcp" svc_name="general">
<synopsis>Test finding ${pluginId} on ${ip}:${port}</synopsis>
<description>Stress test vulnerability ${cve} detected on host ${ip} port ${port}. This is a synthetic finding for load testing the parser pipeline. The vulnerability requires immediate patching.</description>
<solution>Apply the latest vendor patch for ${cve}.</solution>
<cve>${cve}</cve>
<cwe>CWE-${79 + (f % 20)}</cwe>
<cvss3_base_score>${(5.0 + sev * 1.2).toFixed(1)}</cvss3_base_score>
<cvss3_vector>CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H</cvss3_vector>
</ReportItem>\n`;
      remaining--;
    }
    xml += `</ReportHost>\n`;
  }

  xml += `</Report>\n</NessusClientData_v2>`;
  return xml;
}

function generateSarifJson(findingCount: number): string {
  const results = Array.from({ length: findingCount }, (_, i) => {
    const sev = ['error', 'warning', 'note'][i % 3];
    const cve = CVES[i % CVES.length];
    return {
      ruleId: `VULN-${1000 + i}`,
      level: sev,
      message: { text: `${cve}: Synthetic vulnerability ${i} for stress testing` },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: `src/app/module${i % 20}.ts` },
          region: { startLine: 10 + (i % 100), startColumn: 1 },
        },
      }],
      properties: {
        cveIds: [cve],
        cvssScore: 5.0 + (i % 5),
      },
    };
  });

  return JSON.stringify({
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'stress-scanner', version: '1.0.0', rules: [] } },
      results,
    }],
  });
}

function generateCsvFindings(findingCount: number): string {
  const headers = 'title,description,severity,cve_id,cwe_id,cvss_score,asset,hostname,ip_address,port,protocol';
  const rows = Array.from({ length: findingCount }, (_, i) => {
    const sev = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'][i % 5];
    const cve = CVES[i % CVES.length];
    const ip = HOSTS[i % HOSTS.length];
    const port = PORTS[i % PORTS.length];
    return `"Vuln ${i} — ${cve}","Stress test finding ${i} for ${cve} on ${ip}",${sev},${cve},CWE-${79 + (i % 20)},${(5.0 + (i % 5)).toFixed(1)},${ip},host-${i % 50},${ip},${port},tcp`;
  });
  return [headers, ...rows].join('\n');
}

function generateCycloneDxJson(findingCount: number): string {
  const vulnerabilities = Array.from({ length: findingCount }, (_, i) => {
    const cve = CVES[i % CVES.length];
    const sevMap = ['critical', 'high', 'medium', 'low', 'info'];
    return {
      id: cve,
      source: { name: 'NVD', url: `https://nvd.nist.gov/vuln/detail/${cve}` },
      ratings: [{
        score: 5.0 + (i % 5),
        severity: sevMap[i % 5],
        method: 'CVSSv3',
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      }],
      cwes: [79 + (i % 20)],
      description: `Stress test vulnerability ${cve} finding ${i}`,
      affects: [{
        ref: `pkg:npm/stress-pkg-${i % 30}@1.${i % 10}.0`,
      }],
    };
  });

  const components = Array.from({ length: Math.min(findingCount, 30) }, (_, i) => ({
    type: 'library',
    name: `stress-pkg-${i}`,
    version: `1.${i % 10}.0`,
    purl: `pkg:npm/stress-pkg-${i}@1.${i % 10}.0`,
    'bom-ref': `pkg:npm/stress-pkg-${i}@1.${i % 10}.0`,
  }));

  return JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'stress-test', name: 'generator', version: '1.0.0' }],
    },
    components,
    vulnerabilities,
  });
}

function generateOpenvasXml(findingCount: number): string {
  let xml = `<?xml version="1.0"?>\n<report>\n<results max="${findingCount}" start="1">\n`;

  for (let i = 0; i < findingCount; i++) {
    const sev = (1 + (i % 10)).toFixed(1);
    const cve = CVES[i % CVES.length];
    const ip = HOSTS[i % HOSTS.length];
    const port = PORTS[i % PORTS.length];

    xml += `<result id="result-${i}">
<name>Stress Vuln ${i} — ${cve}</name>
<host><ip>${ip}</ip><hostname>host-${i % 50}.local</hostname></host>
<port>${port}/tcp</port>
<nvt oid="1.3.6.1.4.1.25623.1.0.${10000 + i}">
<name>Stress Plugin ${i}</name>
<cvss_base>${sev}</cvss_base>
<cve>${cve}</cve>
<tags>cvss_base_vector=AV:N/AC:L/Au:N/C:C/I:C/A:C|summary=Synthetic stress finding ${i}</tags>
</nvt>
<threat>${['High', 'Medium', 'Low'][i % 3]}</threat>
<severity>${sev}</severity>
<description>Stress test vulnerability ${cve} on ${ip}:${port}</description>
</result>\n`;
  }

  xml += `</results>\n</report>`;
  return xml;
}

function generateQualysXml(findingCount: number): string {
  // Qualys parser expects: SCAN > IP > VULNS > CAT > VULN
  let xml = `<?xml version="1.0"?>\n<SCAN>\n`;

  const hostsNeeded = Math.min(Math.ceil(findingCount / 10), HOSTS.length);
  const findingsPerHost = Math.ceil(findingCount / hostsNeeded);
  let remaining = findingCount;

  for (let h = 0; h < hostsNeeded && remaining > 0; h++) {
    const ip = HOSTS[h];
    xml += `<IP value="${ip}" hostname="host-${h}.local">\n<VULNS>\n<CAT value="General">\n`;

    const count = Math.min(findingsPerHost, remaining);
    for (let f = 0; f < count; f++) {
      const qid = 10000 + h * 1000 + f;
      const sev = 1 + (f % 5);
      const cve = CVES[(h * count + f) % CVES.length];
      const port = PORTS[f % PORTS.length];

      xml += `<VULN qid="${qid}" severity="${sev}">
<TITLE>Stress Vuln ${qid}</TITLE>
<DIAGNOSIS>Stress test finding for ${cve} on ${ip}:${port}</DIAGNOSIS>
<CVE_ID>${cve}</CVE_ID>
<CVSS3_BASE>${(5.0 + sev * 0.8).toFixed(1)}</CVSS3_BASE>
<PORT>${port}</PORT>
<PROTOCOL>tcp</PROTOCOL>
<SOLUTION>Apply latest patches for ${cve}</SOLUTION>
<RESULT>Detected ${cve}</RESULT>
</VULN>\n`;
      remaining--;
    }
    xml += `</CAT>\n</VULNS>\n</IP>\n`;
  }

  xml += `</SCAN>`;
  return xml;
}

// ─── Memory Tracking ────────────────────────────────────────────────────────

function getMemoryMB(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

async function measureParse(
  name: string,
  parser: (content: string | Buffer) => Promise<ParseResult>,
  content: string,
): Promise<{ result: ParseResult; memDeltaMB: number; wallMs: number }> {
  global.gc?.(); // Optional: trigger GC if --expose-gc
  const memBefore = getMemoryMB();
  const start = performance.now();
  const result = await parser(content);
  const wallMs = Math.round(performance.now() - start);
  const memDeltaMB = getMemoryMB() - memBefore;
  console.log(
    `  [${name}] ${result.metadata.totalFindings} findings in ${wallMs}ms ` +
    `(parse: ${Math.round(result.metadata.parseTimeMs)}ms, mem Δ${memDeltaMB > 0 ? '+' : ''}${memDeltaMB}MB)`,
  );
  return { result, memDeltaMB, wallMs };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Upload Pipeline Stress Tests', () => {
  // Increase timeout for stress tests
  const STRESS_TIMEOUT = 120_000;

  describe('Parser Throughput — Nessus XML', () => {
    it.each([10, 100, 500, 1000, 2500])('parses %i findings correctly', async (count) => {
      const xml = generateNessusXml(count);
      const { result } = await measureParse(`nessus-${count}`, parseNessus, xml);
      expect(result.findings.length).toBe(count);
      expect(result.format).toBe('NESSUS');
      expect(result.metadata.errors).toHaveLength(0);
      // Verify findings have required fields
      for (const f of result.findings.slice(0, 5)) {
        expect(f.title).toBeTruthy();
        expect(f.severity).toMatch(/^(CRITICAL|HIGH|MEDIUM|LOW|INFO)$/);
        expect(f.assetName).toBeTruthy();
      }
    }, STRESS_TIMEOUT);

    it('handles 5000 findings under 10 seconds', async () => {
      const xml = generateNessusXml(5000);
      const sizeMB = (Buffer.byteLength(xml) / 1024 / 1024).toFixed(1);
      console.log(`  Nessus 5000 findings: ${sizeMB} MB XML`);
      const { result, wallMs } = await measureParse('nessus-5000', parseNessus, xml);
      expect(result.findings.length).toBe(5000);
      expect(wallMs).toBeLessThan(10_000);
    }, STRESS_TIMEOUT);
  });

  describe('Parser Throughput — SARIF', () => {
    it.each([10, 100, 500, 1000])('parses %i findings correctly', async (count) => {
      const json = generateSarifJson(count);
      const { result } = await measureParse(`sarif-${count}`, parseSarif, json);
      // SARIF parser may produce slightly different counts depending on dedup
      expect(result.findings.length).toBeGreaterThanOrEqual(count * 0.9);
      expect(result.format).toBe('SARIF');
    }, STRESS_TIMEOUT);
  });

  describe('Parser Throughput — CSV', () => {
    it.each([10, 100, 500, 1000])('parses %i findings correctly', async (count) => {
      const csv = generateCsvFindings(count);
      const { result } = await measureParse(`csv-${count}`, parseCsv, csv);
      expect(result.findings.length).toBe(count);
      expect(result.format).toBe('CSV');
    }, STRESS_TIMEOUT);
  });

  describe('Parser Throughput — CycloneDX', () => {
    it.each([10, 100, 500, 1000])('parses %i findings correctly', async (count) => {
      const json = generateCycloneDxJson(count);
      const { result } = await measureParse(`cyclonedx-${count}`, parseCycloneDx, json);
      expect(result.findings.length).toBeGreaterThanOrEqual(count * 0.8);
    }, STRESS_TIMEOUT);
  });

  describe('Parser Throughput — OpenVAS', () => {
    it.each([10, 100, 500, 1000])('parses %i findings correctly', async (count) => {
      const xml = generateOpenvasXml(count);
      const { result } = await measureParse(`openvas-${count}`, parseOpenvas, xml);
      expect(result.findings.length).toBe(count);
      expect(result.format).toBe('OPENVAS');
    }, STRESS_TIMEOUT);
  });

  describe('Parser Throughput — Qualys', () => {
    it.each([10, 100, 500, 1000])('parses %i findings correctly', async (count) => {
      const xml = generateQualysXml(count);
      const { result } = await measureParse(`qualys-${count}`, parseQualys, xml);
      expect(result.findings.length).toBe(count);
    }, STRESS_TIMEOUT);
  });

  describe('Concurrent Parsing', () => {
    it('parses 10 files in parallel (mixed formats, 500 findings each)', async () => {
      const jobs: Array<{ name: string; fn: () => Promise<ParseResult> }> = [
        { name: 'nessus-1', fn: () => parseNessus(generateNessusXml(500)) },
        { name: 'nessus-2', fn: () => parseNessus(generateNessusXml(500)) },
        { name: 'sarif-1', fn: () => parseSarif(generateSarifJson(500)) },
        { name: 'sarif-2', fn: () => parseSarif(generateSarifJson(500)) },
        { name: 'csv-1', fn: () => parseCsv(generateCsvFindings(500)) },
        { name: 'csv-2', fn: () => parseCsv(generateCsvFindings(500)) },
        { name: 'cdx-1', fn: () => parseCycloneDx(generateCycloneDxJson(500)) },
        { name: 'cdx-2', fn: () => parseCycloneDx(generateCycloneDxJson(500)) },
        { name: 'openvas-1', fn: () => parseOpenvas(generateOpenvasXml(500)) },
        { name: 'qualys-1', fn: () => parseQualys(generateQualysXml(500)) },
      ];

      const memBefore = getMemoryMB();
      const start = performance.now();
      const results = await Promise.all(jobs.map((j) => j.fn()));
      const totalMs = Math.round(performance.now() - start);
      const memDelta = getMemoryMB() - memBefore;
      const totalFindings = results.reduce((s, r) => s + r.findings.length, 0);

      console.log(
        `  [concurrent-10] ${totalFindings} total findings across 10 files in ${totalMs}ms (mem Δ${memDelta > 0 ? '+' : ''}${memDelta}MB)`,
      );

      // All 10 should succeed
      expect(results).toHaveLength(10);
      for (const r of results) {
        expect(r.findings.length).toBeGreaterThan(0);
      }
      // Total should be ~5000 findings (10 × 500)
      expect(totalFindings).toBeGreaterThanOrEqual(4000);
      // Should complete in under 30 seconds
      expect(totalMs).toBeLessThan(30_000);
    }, STRESS_TIMEOUT);

    it('parses 20 files concurrently without memory explosion', async () => {
      const files = Array.from({ length: 20 }, (_, i) => {
        const format = i % 3;
        if (format === 0) return () => parseNessus(generateNessusXml(250));
        if (format === 1) return () => parseSarif(generateSarifJson(250));
        return () => parseCsv(generateCsvFindings(250));
      });

      const memBefore = getMemoryMB();
      const results = await Promise.all(files.map((fn) => fn()));
      const memAfter = getMemoryMB();
      const memDelta = memAfter - memBefore;

      console.log(`  [concurrent-20] mem: ${memBefore}MB → ${memAfter}MB (Δ${memDelta}MB)`);

      expect(results).toHaveLength(20);
      // Memory growth should be reasonable (< 500MB for 5000 findings)
      expect(memDelta).toBeLessThan(500);
    }, STRESS_TIMEOUT);
  });

  describe('Malformed Input Handling', () => {
    it('rejects empty string gracefully', async () => {
      const result = await parseNessus('');
      expect(result.findings).toHaveLength(0);
    });

    it('rejects random binary garbage', async () => {
      const garbage = Buffer.from(Array.from({ length: 1024 }, () => Math.floor(Math.random() * 256)));
      const result = await parseNessus(garbage);
      expect(result.findings).toHaveLength(0);
    });

    it('handles truncated XML (cut mid-tag)', async () => {
      const full = generateNessusXml(100);
      const truncated = full.slice(0, Math.floor(full.length * 0.6));
      // Should not throw — should return partial results or empty with errors
      const result = await parseNessus(truncated);
      // Truncated XML may parse partially or fail gracefully
      expect(result.format).toBe('NESSUS');
    });

    it('handles XML with special characters in text nodes', async () => {
      const xml = generateNessusXml(10).replace(
        /Test finding/g,
        'Finding with <special> & "chars" \' etc',
      );
      // fast-xml-parser should handle entity encoding
      const result = await parseNessus(xml);
      // May error but should not crash
      expect(result.format).toBe('NESSUS');
    });

    it('handles SARIF with missing required fields', async () => {
      const malformed = JSON.stringify({
        version: '2.1.0',
        runs: [{ tool: {}, results: [{ ruleId: 'test' }] }],
      });
      const result = await parseSarif(malformed);
      expect(result.format).toBe('SARIF');
    });

    it('handles CSV with mismatched columns', async () => {
      const csv = 'title,severity,cve\n"only two","HIGH"\n"three","LOW","CVE-2024-1234"';
      const result = await parseCsv(csv);
      expect(result.format).toBe('CSV');
    });

    it('rejects oversized XML (> 100MB)', async () => {
      // Generate a string just over 100MB
      const oversized = 'x'.repeat(101 * 1024 * 1024);
      await expect(parseNessus(oversized)).rejects.toThrow(/maximum allowed size/);
    }, STRESS_TIMEOUT);

    it('handles XXE attack payload safely', async () => {
      const xxe = `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<NessusClientData_v2><Report name="xxe">
<ReportHost name="&xxe;">
<ReportItem pluginID="1" pluginName="XXE" severity="4" port="0" protocol="tcp">
<description>&xxe;</description>
</ReportItem>
</ReportHost>
</Report></NessusClientData_v2>`;
      const result = await parseNessus(xxe);
      // Should not contain /etc/passwd content
      const allText = JSON.stringify(result);
      expect(allText).not.toContain('root:');
      expect(allText).not.toContain('/bin/bash');
    });

    it('handles billion laughs attack safely', async () => {
      const billionLaughs = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
]>
<NessusClientData_v2><Report name="test">
<ReportHost name="test"><ReportItem pluginID="1" pluginName="Test" severity="1" port="0" protocol="tcp">
<description>&lol4;</description>
</ReportItem></ReportHost>
</Report></NessusClientData_v2>`;
      // Should handle without OOM — DTD stripping prevents entity expansion
      const result = await parseNessus(billionLaughs);
      expect(result.format).toBe('NESSUS');
    });
  });

  describe('Large File Simulation', () => {
    it('processes a realistic 10,000-finding Nessus scan', async () => {
      const xml = generateNessusXml(10_000);
      const sizeMB = (Buffer.byteLength(xml) / 1024 / 1024).toFixed(1);
      console.log(`  Nessus 10K findings: ${sizeMB} MB`);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { result, wallMs, memDeltaMB: _memDeltaMB } = await measureParse('nessus-10k', parseNessus, xml);

      expect(result.findings.length).toBe(10_000);
      expect(result.metadata.errors).toHaveLength(0);
      expect(wallMs).toBeLessThan(30_000);
      console.log(`  Throughput: ${Math.round(10_000 / (wallMs / 1000))} findings/sec`);
    }, STRESS_TIMEOUT);

    it('processes a realistic 5,000-finding SARIF scan', async () => {
      const json = generateSarifJson(5000);
      const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
      console.log(`  SARIF 5K findings: ${sizeMB} MB`);

      const { result, wallMs } = await measureParse('sarif-5k', parseSarif, json);

      expect(result.findings.length).toBeGreaterThanOrEqual(4500);
      expect(wallMs).toBeLessThan(15_000);
    }, STRESS_TIMEOUT);

    it('processes sequential uploads (simulating queue drain)', async () => {
      const batches: Array<{ name: string; run: () => Promise<ParseResult> }> = [
        { name: 'nessus-1000', run: () => parseNessus(generateNessusXml(1000)) },
        { name: 'sarif-800', run: () => parseSarif(generateSarifJson(800)) },
        { name: 'csv-600', run: () => parseCsv(generateCsvFindings(600)) },
        { name: 'nessus-1200', run: () => parseNessus(generateNessusXml(1200)) },
        { name: 'openvas-500', run: () => parseOpenvas(generateOpenvasXml(500)) },
      ];

      const start = performance.now();
      let totalFindings = 0;

      for (const batch of batches) {
        const result = await batch.run();
        totalFindings += result.findings.length;
        console.log(`  ${batch.name}: ${result.findings.length} findings`);
      }

      const totalMs = Math.round(performance.now() - start);
      console.log(
        `  [sequential-5-batches] ${totalFindings} total findings in ${totalMs}ms ` +
        `(${Math.round(totalFindings / (totalMs / 1000))} findings/sec)`,
      );

      expect(totalFindings).toBeGreaterThan(3500);
      expect(totalMs).toBeLessThan(60_000);
    }, STRESS_TIMEOUT);
  });

  describe('Deduplication Data Generation', () => {
    it('generates overlapping CVEs across multiple scans for dedup testing', async () => {
      // Simulate 3 scanners finding the same CVEs on the same hosts
      const nessus = await parseNessus(generateNessusXml(200));
      const openvas = await parseOpenvas(generateOpenvasXml(200));
      const qualys = await parseQualys(generateQualysXml(200));

      // Extract unique CVEs from each
      const nessusCves = new Set(nessus.findings.flatMap((f) => f.cveIds));
      const openvasCves = new Set(openvas.findings.flatMap((f) => f.cveIds));
      const qualysCves = new Set(qualys.findings.flatMap((f) => f.cveIds));

      // There should be significant overlap since we use the same CVE pool
      const allCves = new Set([...nessusCves, ...openvasCves, ...qualysCves]);
      const overlap = [...nessusCves].filter((c) => openvasCves.has(c) && qualysCves.has(c));

      console.log(
        `  CVE overlap: ${overlap.length}/${allCves.size} shared across all 3 scanners`,
      );
      console.log(
        `  Nessus: ${nessusCves.size} unique CVEs, OpenVAS: ${openvasCves.size}, Qualys: ${qualysCves.size}`,
      );

      // Our 20-CVE pool should produce significant overlap
      expect(overlap.length).toBeGreaterThan(0);

      // Total findings across scanners
      const totalRaw = nessus.findings.length + openvas.findings.length + qualys.findings.length;
      console.log(
        `  Total raw findings: ${totalRaw} → dedup should reduce by ~${Math.round((overlap.length / allCves.size) * 100)}%`,
      );
    }, STRESS_TIMEOUT);
  });
});
