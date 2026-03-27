// ---------------------------------------------------------------------------
// AI Package — Shared Types
// ---------------------------------------------------------------------------

/** Severity levels matching the Prisma enum */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/** Asset context passed to the AI for more relevant remediation */
export interface AssetContext {
  name?: string;
  type?: string;
  environment?: string;
  criticality?: string;
  internetExposed?: boolean;
  tags?: string[];
}

/** Minimal finding data included in AI requests */
export interface FindingContext {
  scannerType?: string;
  scannerName?: string;
  observations?: Record<string, unknown>;
}

/** Input to the remediation generation pipeline */
export interface RemediationRequest {
  caseId: string;
  title: string;
  description?: string;
  cveIds: string[];
  cweIds: string[];
  severity: Severity;
  cvssScore: number | null;
  cvssVector: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  kevListed: boolean;
  kevDueDate: string | null;
  assets?: AssetContext[];
  findings?: FindingContext[];
  packageName?: string;
  packageVersion?: string;
}

/** Raw response wrapper returned by the Claude client */
export interface RemediationResponse {
  content: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

/** Parsed, structured remediation result */
export interface RemediationResult {
  riskAssessment: string;
  immediateActions: string[];
  permanentFix: {
    description: string;
    codeExample?: string;
    configChange?: string;
  };
  verificationSteps: string[];
  references: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: 'immediate' | 'short-term' | 'long-term';
  /** Original Claude response for debugging */
  raw: string;
  model: string;
  generatedAt: Date;
}

/** Input to the redaction system */
export interface RedactionInput {
  title: string;
  description?: string;
  observations?: Record<string, unknown>[];
  assetNames?: string[];
}

/** Output of the redaction system */
export interface RedactedInput {
  title: string;
  description?: string;
  observations?: string[];
  assetNames?: string[];
  redactionMap: Map<string, string>;
}

/** Rate-limit check result */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

/** Current AI usage stats for an organization */
export interface AiUsageStats {
  used: number;
  limit: number;
  resetAt: Date;
}

/** Subscription tiers with their AI call limits */
export const AI_TIER_LIMITS: Record<string, number> = {
  FREE: 50,
  PRO: 500,
  ENTERPRISE: 5000,
  MSSP: 10000,
};
