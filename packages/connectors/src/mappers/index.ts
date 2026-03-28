export {
  mapTenableVuln,
  type TenableVulnerability,
  type TenableAsset,
  type TenablePlugin,
  type TenablePort,
  type TenableScan,
  type TenableExportResponse,
  type TenableExportStatusResponse,
  type TenableServerProperties,
} from './tenable-mapper';

export {
  mapQualysDetection,
  toArray,
  type QualysDetection,
  type QualysHost,
  type QualysKBVuln,
  type QualysCVE,
  type QualysHostDetectionEntry,
  type QualysHostDetectionResponse,
  type QualysKBResponse,
} from './qualys-mapper';

export {
  mapCrowdStrikeVulnerability,
  mapCrowdStrikeBatch,
  type CrowdStrikeVulnerability,
  type CrowdStrikeCve,
  type CrowdStrikeHostInfo,
  type CrowdStrikeRemediation,
  type CrowdStrikeApp,
  type CrowdStrikeSpotlightResponse,
} from './crowdstrike-mapper';

export {
  mapRapid7Vulnerability,
  mapRapid7AssetVulnerabilities,
  type Rapid7Asset,
  type Rapid7Vulnerability,
  type Rapid7AssetsResponse,
  type Rapid7VulnerabilitiesResponse,
} from './rapid7-mapper';

export {
  mapSnykIssue,
  mapSnykBatch,
  type SnykIssue,
  type SnykIssueAttributes,
  type SnykProblem,
  type SnykCoordinate,
  type SnykSeverity,
  type SnykIssuesResponse,
  type SnykProject,
} from './snyk-mapper';
