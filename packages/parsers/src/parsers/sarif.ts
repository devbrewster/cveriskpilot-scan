import type { CanonicalFinding, ParseResult, ParseError } from '../types';

interface SarifLog {
  $schema?: string;
  version?: string;
  runs?: SarifRun[];
}

interface SarifRun {
  tool?: {
    driver?: {
      name?: string;
      rules?: SarifRule[];
    };
  };
  results?: SarifResult[];
}

interface SarifRule {
  id?: string;
  name?: string;
  shortDescription?: { text?: string };
  fullDescription?: { text?: string };
  properties?: Record<string, unknown>;
  defaultConfiguration?: { level?: string };
}

interface SarifResult {
  ruleId?: string;
  ruleIndex?: number;
  message?: { text?: string };
  level?: string;
  locations?: SarifLocation[];
  fingerprints?: Record<string, string>;
  properties?: Record<string, unknown>;
}

interface SarifLocation {
  physicalLocation?: {
    artifactLocation?: { uri?: string };
    region?: {
      startLine?: number;
      snippet?: { text?: string };
    };
  };
}

const KNOWN_SAST_TOOLS = new Set([
  'semgrep',
  'codeql',
  'eslint',
  'sonarqube',
  'checkmarx',
  'fortify',
  'bandit',
  'gosec',
  'brakeman',
]);

const KNOWN_SCA_TOOLS = new Set([
  'snyk',
  'dependabot',
  'grype',
  'trivy',
  'npm audit',
]);

const KNOWN_DAST_TOOLS = new Set(['zap', 'burp', 'nuclei']);

const KNOWN_IAC_TOOLS = new Set([
  'checkov',
  'tfsec',
  'terrascan',
  'kics',
]);

function deriveScannerType(toolName: string): string {
  const lower = toolName.toLowerCase();
  if (KNOWN_SCA_TOOLS.has(lower)) return 'SCA';
  if (KNOWN_DAST_TOOLS.has(lower)) return 'DAST';
  if (KNOWN_IAC_TOOLS.has(lower)) return 'IAC';
  if (KNOWN_SAST_TOOLS.has(lower)) return 'SAST';
  return 'SAST';
}

const LEVEL_MAP: Record<string, CanonicalFinding['severity']> = {
  error: 'HIGH',
  warning: 'MEDIUM',
  note: 'LOW',
  none: 'INFO',
};

const CVE_REGEX = /CVE-\d{4}-\d{4,}/g;

export async function parseSarif(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const text =
    typeof content === 'string' ? content : content.toString('utf-8');

  let sarif: SarifLog;
  try {
    sarif = JSON.parse(text) as SarifLog;
  } catch (err) {
    errors.push({
      message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'SARIF',
      scannerName: 'sarif',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  const runs = sarif.runs ?? [];

  for (const run of runs) {
    const toolName = run.tool?.driver?.name ?? 'unknown';
    const rules = run.tool?.driver?.rules ?? [];
    const ruleMap = new Map<string, SarifRule>();
    for (const rule of rules) {
      if (rule.id) ruleMap.set(rule.id, rule);
    }

    const scannerType = deriveScannerType(toolName);
    const results = run.results ?? [];

    for (const result of results) {
      try {
        const ruleId = result.ruleId ?? 'unknown';
        const rule = ruleMap.get(ruleId);

        const messageText = result.message?.text ?? '';
        const ruleDescription =
          rule?.fullDescription?.text ??
          rule?.shortDescription?.text ??
          messageText;

        const title = rule?.name ?? rule?.shortDescription?.text ?? ruleId;

        // Determine severity
        const level =
          result.level ??
          rule?.defaultConfiguration?.level ??
          'warning';
        const severity = LEVEL_MAP[level] ?? 'MEDIUM';

        // Extract location info
        const loc = result.locations?.[0]?.physicalLocation;
        const filePath = loc?.artifactLocation?.uri;
        const lineNumber = loc?.region?.startLine;
        const snippet = loc?.region?.snippet?.text;

        // Extract CVEs from description and message
        const allText = `${title} ${ruleDescription} ${messageText}`;
        const cveIds = [...new Set(allText.match(CVE_REGEX) ?? [])];

        findings.push({
          title,
          description: ruleDescription,
          cveIds,
          cweIds: [],
          severity,
          scannerType,
          scannerName: toolName,
          assetName: filePath ?? 'unknown',
          filePath,
          lineNumber,
          snippet,
          rawObservations: {
            ruleId,
            fingerprints: result.fingerprints,
            properties: result.properties,
          },
          discoveredAt: new Date(),
        });
      } catch (err) {
        errors.push({
          message: `Error parsing SARIF result: ${err instanceof Error ? err.message : String(err)}`,
          severity: 'warning',
        });
      }
    }
  }

  const scannerName =
    runs[0]?.tool?.driver?.name ?? 'sarif';

  return {
    format: 'SARIF',
    scannerName,
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
