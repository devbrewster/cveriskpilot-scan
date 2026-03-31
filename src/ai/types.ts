export interface AiClientConfig {
  provider: 'ollama' | 'llamacpp';
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxTotalMs: number;
}

export interface SanitizedFinding {
  index: number;
  title: string;
  severity: string;
  cveIds: string[];
  cweIds: string[];
  scannerType: string;
  packageName?: string;
  packageVersion?: string;
  filePath?: string;
  lineNumber?: number;
  snippet?: string;
  verdict?: string;
}

export interface AiEnrichmentResult {
  remediations: Map<number, string>;
  complianceExplanations: Map<number, string>;
  riskSummary: string;
  priorityOrder: number[];
  errors: string[];
  durationMs: number;
}
