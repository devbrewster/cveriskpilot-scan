import type { ParserFn, ParseResult } from './types';
import { parseNessus } from './parsers/nessus';
import { parseSarif } from './parsers/sarif';
import { parseCsv } from './parsers/csv';
import { parseJson } from './parsers/json';
import { parseCycloneDx } from './parsers/cyclonedx';
import { parseQualys } from './parsers/qualys';
import { parseOpenvas } from './parsers/openvas';
import { parseSpdx } from './parsers/spdx';
import { parseOsv } from './parsers/osv';
import { parseCsaf } from './parsers/csaf';
import { parseXlsx } from './parsers/xlsx';

export type ParserFormat =
  | 'NESSUS'
  | 'SARIF'
  | 'CSV'
  | 'JSON_FORMAT'
  | 'CYCLONEDX'
  | 'QUALYS'
  | 'OPENVAS'
  | 'SPDX'
  | 'OSV'
  | 'CSAF'
  | 'XLSX';

const PARSER_REGISTRY: Partial<Record<ParserFormat, ParserFn>> = {
  NESSUS: parseNessus,
  SARIF: parseSarif,
  CSV: parseCsv,
  JSON_FORMAT: parseJson,
  CYCLONEDX: parseCycloneDx,
  QUALYS: parseQualys,
  OPENVAS: parseOpenvas,
  SPDX: parseSpdx,
  OSV: parseOsv,
  CSAF: parseCsaf,
  XLSX: parseXlsx,
};

const EXTENSION_MAP: Record<string, ParserFormat> = {
  '.nessus': 'NESSUS',
  '.sarif': 'SARIF',
  '.sarif.json': 'SARIF',
  '.csv': 'CSV',
  '.tsv': 'CSV',
  '.cdx.json': 'CYCLONEDX',
  '.spdx.json': 'SPDX',
  '.xlsx': 'XLSX',
  '.xls': 'XLSX',
};

function getExtension(filename: string): string {
  const lower = filename.toLowerCase();
  // Check multi-part extensions first
  if (lower.endsWith('.sarif.json')) return '.sarif.json';
  if (lower.endsWith('.cdx.json')) return '.cdx.json';
  if (lower.endsWith('.spdx.json')) return '.spdx.json';
  const lastDot = lower.lastIndexOf('.');
  if (lastDot === -1) return '';
  return lower.slice(lastDot);
}

function sniffJsonFormat(content: string): ParserFormat {
  try {
    const data = JSON.parse(content) as Record<string, unknown>;

    // SARIF detection
    if (
      data['$schema']?.toString().includes('sarif') ||
      data['version']?.toString().startsWith('2.1') &&
      Array.isArray(data['runs'])
    ) {
      return 'SARIF';
    }

    // CycloneDX detection
    if (
      data['bomFormat'] === 'CycloneDX' ||
      (data['specVersion'] && Array.isArray(data['components']))
    ) {
      return 'CYCLONEDX';
    }

    // SPDX detection
    if (
      data['spdxVersion'] ||
      data['SPDXID'] ||
      (typeof data['name'] === 'string' && data['documentNamespace'])
    ) {
      return 'SPDX';
    }

    // OSV detection
    if (
      (data['id'] && data['affected']) ||
      (data['id'] && data['aliases']) ||
      (Array.isArray(data) && (data as unknown[])[0] && typeof (data as unknown[])[0] === 'object' && 'aliases' in ((data as unknown[])[0] as Record<string, unknown>)) ||
      (data['results'] && Array.isArray(data['results']))
    ) {
      return 'OSV';
    }

    // CSAF detection
    if (
      data['document'] &&
      typeof data['document'] === 'object' &&
      (data['vulnerabilities'] || (data['document'] as Record<string, unknown>)['category'])
    ) {
      return 'CSAF';
    }

    // Default to generic JSON
    return 'JSON_FORMAT';
  } catch {
    return 'JSON_FORMAT';
  }
}

function sniffXmlFormat(content: string): ParserFormat {
  const lower = content.toLowerCase();
  if (lower.includes('nessusclientdata') || lower.includes('nessusclientdata_v2')) {
    return 'NESSUS';
  }
  if (lower.includes('<scan') && lower.includes('<ip')) {
    return 'QUALYS';
  }
  if (lower.includes('<report') && (lower.includes('<results') || lower.includes('openvas'))) {
    return 'OPENVAS';
  }
  return 'NESSUS'; // Default XML to Nessus
}

/**
 * Auto-detect the parser format based on file extension and content sniffing.
 */
export function detectFormat(
  content: string | Buffer,
  filename?: string,
): ParserFormat {
  // Try extension-based detection first
  if (filename) {
    const ext = getExtension(filename);
    const format = EXTENSION_MAP[ext];
    if (format) return format;

    // For .json files, sniff the content
    if (ext === '.json') {
      const text =
        typeof content === 'string' ? content : content.toString('utf-8');
      return sniffJsonFormat(text);
    }

    // For .xml files, sniff the content
    if (ext === '.xml') {
      const text =
        typeof content === 'string' ? content : content.toString('utf-8');
      return sniffXmlFormat(text);
    }
  }

  // Content-based detection
  const text =
    typeof content === 'string' ? content : content.toString('utf-8');
  const trimmed = text.trimStart();

  // XML-based formats
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
    return sniffXmlFormat(text);
  }

  // JSON-based formats
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return sniffJsonFormat(text);
  }

  // Default to CSV for everything else
  return 'CSV';
}

/**
 * Parse content using the specified format.
 */
export async function parse(
  format: ParserFormat | string,
  content: string | Buffer,
): Promise<ParseResult> {
  const parser = PARSER_REGISTRY[format as ParserFormat];
  if (!parser) {
    throw new Error(
      `No parser registered for format: ${format}. Supported formats: ${Object.keys(PARSER_REGISTRY).join(', ')}`,
    );
  }
  return parser(content);
}

/**
 * Get all supported parser formats.
 */
export function getSupportedFormats(): ParserFormat[] {
  return Object.keys(PARSER_REGISTRY) as ParserFormat[];
}
