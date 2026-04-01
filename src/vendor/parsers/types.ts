export type FindingVerdict = 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'NEEDS_REVIEW';

export interface CanonicalFinding {
  // Identity
  title: string;
  description: string;

  // Vulnerability IDs
  cveIds: string[];
  cweIds: string[];

  // Severity
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cvssScore?: number;
  cvssVector?: string;
  cvssVersion?: string;

  // Triage verdict (auto-classified by scanner heuristics)
  verdict?: FindingVerdict;
  verdictReason?: string;

  // Source
  scannerType: string;
  scannerName: string;
  runId?: string;

  // Asset context
  assetName: string;
  assetType?: string;
  hostname?: string;
  ipAddress?: string;
  port?: number;
  protocol?: string;

  // Package info (for SCA)
  packageName?: string;
  packageVersion?: string;
  packageEcosystem?: string;
  fixedVersion?: string;
  isSemVerMajor?: boolean;

  // Enrichment (paid add-on)
  advisoryUrl?: string;
  recommendation?: string;

  // Free enrichment (public data: EPSS, KEV)
  epssScore?: number;       // 0-1 probability
  epssPercentile?: number;  // 0-100 percentile rank
  kevListed?: boolean;      // On CISA KEV catalog
  kevDueDate?: string;      // ISO date string
  riskScore?: number;       // 0-100 composite risk score
  remediationEffort?: 'LOW' | 'MEDIUM' | 'HIGH'; // Heuristic effort estimate

  // Evidence
  filePath?: string;
  lineNumber?: number;
  snippet?: string;

  // Raw observations (parser-specific data preserved as JSON)
  rawObservations: Record<string, unknown>;

  // Timestamp
  discoveredAt: Date;
}

export interface ParseResult {
  format: string;
  scannerName: string;
  findings: CanonicalFinding[];
  metadata: {
    totalFindings: number;
    parseTimeMs: number;
    errors: ParseError[];
  };
}

export interface ParseError {
  line?: number;
  message: string;
  severity: 'warning' | 'error';
}

export type ParserFn = (content: string | Buffer) => Promise<ParseResult>;
