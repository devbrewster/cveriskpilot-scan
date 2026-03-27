// ---------------------------------------------------------------------------
// Cloud Posture Types (t112)
// ---------------------------------------------------------------------------

/**
 * AWS Security Finding Format (ASFF) — subset of fields relevant to CVERiskPilot.
 * See: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format.html
 */
export interface ASFFinding {
  SchemaVersion: string;
  Id: string;
  ProductArn: string;
  GeneratorId: string;
  AwsAccountId: string;
  Types: string[];
  FirstObservedAt?: string;
  LastObservedAt?: string;
  CreatedAt: string;
  UpdatedAt: string;
  Severity: {
    Label: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    Normalized: number; // 0-100
    Original?: string;
  };
  Title: string;
  Description: string;
  Remediation?: {
    Recommendation?: {
      Text?: string;
      Url?: string;
    };
  };
  ProductFields?: Record<string, string>;
  Resources: Array<{
    Type: string;
    Id: string;
    Partition?: string;
    Region?: string;
    Tags?: Record<string, string>;
    Details?: Record<string, unknown>;
  }>;
  Compliance?: {
    Status: 'PASSED' | 'WARNING' | 'FAILED' | 'NOT_AVAILABLE';
    RelatedRequirements?: string[];
    SecurityControlId?: string;
  };
  Vulnerabilities?: Array<{
    Id: string;
    VulnerablePackages?: Array<{
      Name: string;
      Version: string;
      Epoch?: string;
      Release?: string;
      Architecture?: string;
      PackageManager?: string;
      FilePath?: string;
      FixedInVersion?: string;
      Remediation?: string;
    }>;
    Cvss?: Array<{
      Version: string;
      BaseScore: number;
      BaseVector?: string;
    }>;
    Vendor?: {
      Name: string;
      Url?: string;
      VendorSeverity?: string;
      VendorCreatedAt?: string;
      VendorUpdatedAt?: string;
    };
    ReferenceUrls?: string[];
    ExploitAvailable?: 'YES' | 'NO';
    LastKnownExploitAt?: string;
    FixAvailable?: 'YES' | 'NO' | 'PARTIAL';
  }>;
  WorkflowState?: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'DEFERRED' | 'RESOLVED';
  RecordState?: 'ACTIVE' | 'ARCHIVED';
  [key: string]: unknown;
}

export interface SecurityHubConfig {
  region: string;
  accountId?: string;
  /** For cross-account access */
  roleArn?: string;
  externalId?: string;
  /** Maximum findings per request (default 100) */
  maxResults?: number;
}

export interface SecurityHubFilters {
  severityLabel?: string[];
  complianceStatus?: string[];
  recordState?: string[];
  workflowState?: string[];
  productName?: string[];
  resourceType?: string[];
  updatedAfter?: string;
  updatedBefore?: string;
}

/**
 * GCP Security Command Center finding (subset).
 */
export interface SCCFinding {
  name: string;
  parent: string;
  resourceName: string;
  state: 'ACTIVE' | 'INACTIVE';
  category: string;
  externalUri?: string;
  sourceProperties: Record<string, unknown>;
  securityMarks?: {
    marks: Record<string, string>;
  };
  eventTime: string;
  createTime: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  canonicalName?: string;
  findingClass: 'THREAT' | 'VULNERABILITY' | 'MISCONFIGURATION' | 'OBSERVATION' | 'SCC_ERROR' | 'POSTURE_VIOLATION';
  indicator?: {
    ipAddresses?: string[];
    domains?: string[];
    signatures?: Array<{ memoryHashSignature?: unknown; yaraRuleSignature?: unknown }>;
  };
  vulnerability?: {
    cve?: {
      id: string;
      references?: Array<{ source: string; uri: string }>;
      cvssv3?: {
        baseScore: number;
        attackVector: string;
        attackComplexity: string;
        privilegesRequired: string;
        userInteraction: string;
        scope: string;
        confidentialityImpact: string;
        integrityImpact: string;
        availabilityImpact: string;
      };
    };
  };
  compliances?: Array<{
    standard: string;
    version: string;
    ids: string[];
  }>;
  [key: string]: unknown;
}

export interface SCCConfig {
  organizationId: string;
  projectId?: string;
  /** Service account key JSON path or inline JSON */
  credentials?: string;
}

export interface SCCFilters {
  state?: 'ACTIVE' | 'INACTIVE';
  severity?: string[];
  category?: string;
  findingClass?: string;
  readTime?: string;
  filter?: string; // Raw SCC filter string
}

export interface PostureFinding {
  source: 'aws_security_hub' | 'gcp_scc';
  sourceId: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cveIds: string[];
  resourceId: string;
  resourceType: string;
  region?: string;
  accountId?: string;
  complianceStatus?: string;
  complianceFrameworks?: string[];
  remediationText?: string;
  remediationUrl?: string;
  firstObservedAt: Date;
  lastObservedAt: Date;
  rawData: Record<string, unknown>;
}
