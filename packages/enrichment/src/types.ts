import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// NVD
// ---------------------------------------------------------------------------

export interface NvdCvssData {
  score: number;
  vector: string;
  version?: string;
}

export interface NvdCveData {
  cveId: string;
  title: string;
  description: string;
  cweIds: string[];
  cvssV3?: NvdCvssData;
  cvssV2?: NvdCvssData;
  publishedDate: string;
  lastModified: string;
}

// ---------------------------------------------------------------------------
// EPSS
// ---------------------------------------------------------------------------

export interface EpssData {
  cveId: string;
  score: number;
  percentile: number;
  date: string;
}

// ---------------------------------------------------------------------------
// KEV
// ---------------------------------------------------------------------------

export interface KevData {
  cveId: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: boolean;
}

export interface KevMatch {
  cveId: string;
  kevData: KevData;
}

// ---------------------------------------------------------------------------
// Risk Scoring
// ---------------------------------------------------------------------------

export type AssetCriticality = 'critical' | 'high' | 'medium' | 'low';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface RiskScoreInput {
  cvssScore?: number;
  epssScore?: number;
  kevListed?: boolean;
  assetCriticality?: AssetCriticality;
}

export interface RiskScoreBreakdown {
  base: number;
  epssMultiplier: number;
  kevBoost: number;
  envMultiplier: number;
}

export interface RiskScoreResult {
  score: number;
  breakdown: RiskScoreBreakdown;
  riskLevel: RiskLevel;
}

// ---------------------------------------------------------------------------
// Enriched Finding
// ---------------------------------------------------------------------------

export interface EnrichedFinding extends CanonicalFinding {
  nvdData?: NvdCveData;
  epssData?: EpssData;
  kevData?: KevData;
  riskScore: RiskScoreResult;
}

// ---------------------------------------------------------------------------
// Enrichment Stats
// ---------------------------------------------------------------------------

export interface EnrichmentStats {
  totalCves: number;
  nvdCacheHits: number;
  nvdApiCalls: number;
  epssCacheHits: number;
  epssApiCalls: number;
  kevMatches: number;
  enrichmentTimeMs: number;
}
