import { describe, it, expect } from 'vitest';
import { detectFormat, parse, getSupportedFormats } from '../registry.js';

describe('detectFormat', () => {
  it('should detect .nessus files', () => {
    expect(detectFormat('', 'scan.nessus')).toBe('NESSUS');
  });

  it('should detect .sarif files', () => {
    expect(detectFormat('', 'results.sarif')).toBe('SARIF');
  });

  it('should detect .sarif.json files', () => {
    expect(detectFormat('', 'results.sarif.json')).toBe('SARIF');
  });

  it('should detect .csv files', () => {
    expect(detectFormat('', 'findings.csv')).toBe('CSV');
  });

  it('should detect .tsv files', () => {
    expect(detectFormat('', 'findings.tsv')).toBe('CSV');
  });

  it('should detect .cdx.json files', () => {
    expect(detectFormat('', 'bom.cdx.json')).toBe('CYCLONEDX');
  });

  it('should detect SARIF from .json content', () => {
    const sarif = JSON.stringify({
      $schema: 'https://sarif.schema.json',
      version: '2.1.0',
      runs: [],
    });
    expect(detectFormat(sarif, 'results.json')).toBe('SARIF');
  });

  it('should detect CycloneDX from .json content', () => {
    const cdx = JSON.stringify({
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      components: [],
    });
    expect(detectFormat(cdx, 'bom.json')).toBe('CYCLONEDX');
  });

  it('should default to JSON_FORMAT for unknown .json content', () => {
    const json = JSON.stringify([{ title: 'test' }]);
    expect(detectFormat(json, 'data.json')).toBe('JSON_FORMAT');
  });

  it('should detect XML content as NESSUS', () => {
    expect(detectFormat('<?xml version="1.0"?><NessusClientData_v2></NessusClientData_v2>')).toBe('NESSUS');
  });

  it('should detect JSON content without filename', () => {
    const json = JSON.stringify([{ title: 'test' }]);
    expect(detectFormat(json)).toBe('JSON_FORMAT');
  });

  it('should default to CSV for non-JSON/XML content', () => {
    expect(detectFormat('col1,col2\nval1,val2')).toBe('CSV');
  });
});

describe('parse', () => {
  it('should parse using the correct parser', async () => {
    const csv = 'title,severity\nTest Finding,HIGH';
    const result = await parse('CSV', csv);
    expect(result.format).toBe('CSV');
    expect(result.findings).toHaveLength(1);
  });

  it('should throw for unsupported format', async () => {
    await expect(parse('QUALYS', '')).rejects.toThrow('No parser registered');
  });
});

describe('getSupportedFormats', () => {
  it('should return all registered formats', () => {
    const formats = getSupportedFormats();
    expect(formats).toContain('NESSUS');
    expect(formats).toContain('SARIF');
    expect(formats).toContain('CSV');
    expect(formats).toContain('JSON_FORMAT');
    expect(formats).toContain('CYCLONEDX');
  });
});
