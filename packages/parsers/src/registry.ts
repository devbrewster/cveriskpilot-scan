import type { ParserFn, ParseResult } from './types.js';
import { parseNessus } from './parsers/nessus.js';
import { parseSarif } from './parsers/sarif.js';
import { parseCsv } from './parsers/csv.js';
import { parseJson } from './parsers/json.js';
import { parseCycloneDx } from './parsers/cyclonedx.js';

export type ParserFormat =
  | 'NESSUS'
  | 'SARIF'
  | 'CSV'
  | 'JSON_FORMAT'
  | 'CYCLONEDX'
  | 'OSV'
  | 'SPDX'
  | 'CSAF'
  | 'QUALYS'
  | 'OPENVAS';

const PARSER_REGISTRY: Partial<Record<ParserFormat, ParserFn>> = {
  NESSUS: parseNessus,
  SARIF: parseSarif,
  CSV: parseCsv,
  JSON_FORMAT: parseJson,
  CYCLONEDX: parseCycloneDx,
};

const EXTENSION_MAP: Record<string, ParserFormat> = {
  '.nessus': 'NESSUS',
  '.sarif': 'SARIF',
  '.sarif.json': 'SARIF',
  '.csv': 'CSV',
  '.tsv': 'CSV',
  '.cdx.json': 'CYCLONEDX',
};

function getExtension(filename: string): string {
  const lower = filename.toLowerCase();
  // Check multi-part extensions first
  if (lower.endsWith('.sarif.json')) return '.sarif.json';
  if (lower.endsWith('.cdx.json')) return '.cdx.json';
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

    // Default to generic JSON
    return 'JSON_FORMAT';
  } catch {
    return 'JSON_FORMAT';
  }
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
  }

  // Content-based detection
  const text =
    typeof content === 'string' ? content : content.toString('utf-8');
  const trimmed = text.trimStart();

  // XML-based formats
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<NessusClientData')) {
    return 'NESSUS';
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
