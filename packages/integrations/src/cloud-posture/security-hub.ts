// ---------------------------------------------------------------------------
// AWS Security Hub Client (t112)
// ---------------------------------------------------------------------------

import type {
  ASFFinding,
  SecurityHubConfig,
  SecurityHubFilters,
  PostureFinding,
} from './types';
import type { CanonicalFinding } from '@cveriskpilot/parsers/types';

// ---------------------------------------------------------------------------
// Types for AWS SDK responses
// ---------------------------------------------------------------------------

interface GetFindingsCommandOutput {
  Findings: ASFFinding[];
  NextToken?: string;
}

interface STSCredentials {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  Expiration: Date;
}

// ---------------------------------------------------------------------------
// SecurityHubClient
// ---------------------------------------------------------------------------

export class SecurityHubClient {
  private readonly config: SecurityHubConfig;
  private assumedCredentials: STSCredentials | null = null;
  private credentialsExpiresAt: number = 0;

  constructor(config: SecurityHubConfig) {
    this.config = config;
  }

  /**
   * Query Security Hub findings via ASFF filters.
   */
  async getFindings(filters?: SecurityHubFilters): Promise<ASFFinding[]> {
    const allFindings: ASFFinding[] = [];
    let nextToken: string | undefined;

    do {
      const body = this.buildGetFindingsRequest(filters, nextToken);
      const result = await this.callSecurityHub<GetFindingsCommandOutput>(
        'GetFindings',
        body,
      );

      allFindings.push(...result.Findings);
      nextToken = result.NextToken;
    } while (nextToken);

    return allFindings;
  }

  /**
   * Pull findings from Security Hub and convert to PostureFinding format.
   */
  async importFindings(
    filters?: SecurityHubFilters,
  ): Promise<PostureFinding[]> {
    const asffFindings = await this.getFindings(filters);
    return asffFindings.map((f) => this.mapASFFToPosture(f));
  }

  /**
   * Map an ASFF finding to CanonicalFinding format for the parsers pipeline.
   */
  mapASFFToCanonical(asff: ASFFinding): CanonicalFinding {
    const cveIds: string[] = [];
    let cvssScore: number | undefined;
    let cvssVector: string | undefined;
    let cvssVersion: string | undefined;
    let packageName: string | undefined;
    let packageVersion: string | undefined;
    let fixedVersion: string | undefined;

    if (asff.Vulnerabilities && asff.Vulnerabilities.length > 0) {
      for (const vuln of asff.Vulnerabilities) {
        if (vuln.Id && !cveIds.includes(vuln.Id)) {
          cveIds.push(vuln.Id);
        }

        if (vuln.Cvss && vuln.Cvss.length > 0) {
          const cvss = vuln.Cvss[0]!;
          cvssScore = cvss.BaseScore;
          cvssVector = cvss.BaseVector;
          cvssVersion = cvss.Version;
        }

        if (vuln.VulnerablePackages && vuln.VulnerablePackages.length > 0) {
          const pkg = vuln.VulnerablePackages[0]!;
          packageName = pkg.Name;
          packageVersion = pkg.Version;
          fixedVersion = pkg.FixedInVersion;
        }
      }
    }

    const resource = asff.Resources[0];

    return {
      title: asff.Title,
      description: asff.Description,
      cveIds,
      cweIds: [],
      severity: this.mapASFFSeverity(asff.Severity.Label),
      cvssScore,
      cvssVector,
      cvssVersion,
      scannerType: 'cloud_posture',
      scannerName: 'AWS Security Hub',
      runId: asff.Id,
      assetName: resource?.Id ?? 'unknown',
      assetType: resource?.Type,
      packageName,
      packageVersion,
      fixedVersion,
      rawObservations: {
        asff_id: asff.Id,
        product_arn: asff.ProductArn,
        generator_id: asff.GeneratorId,
        aws_account_id: asff.AwsAccountId,
        compliance_status: asff.Compliance?.Status,
        workflow_state: asff.WorkflowState,
        record_state: asff.RecordState,
        resource_region: resource?.Region,
      },
      discoveredAt: new Date(asff.FirstObservedAt ?? asff.CreatedAt),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapASFFToPosture(asff: ASFFinding): PostureFinding {
    const cveIds: string[] = [];
    if (asff.Vulnerabilities) {
      for (const v of asff.Vulnerabilities) {
        if (v.Id) cveIds.push(v.Id);
      }
    }

    const resource = asff.Resources[0];
    const complianceFrameworks: string[] = [];
    if (asff.Compliance?.RelatedRequirements) {
      complianceFrameworks.push(...asff.Compliance.RelatedRequirements);
    }

    return {
      source: 'aws_security_hub',
      sourceId: asff.Id,
      title: asff.Title,
      description: asff.Description,
      severity: this.mapASFFSeverity(asff.Severity.Label),
      cveIds,
      resourceId: resource?.Id ?? 'unknown',
      resourceType: resource?.Type ?? 'unknown',
      region: resource?.Region,
      accountId: asff.AwsAccountId,
      complianceStatus: asff.Compliance?.Status,
      complianceFrameworks:
        complianceFrameworks.length > 0 ? complianceFrameworks : undefined,
      remediationText: asff.Remediation?.Recommendation?.Text,
      remediationUrl: asff.Remediation?.Recommendation?.Url,
      firstObservedAt: new Date(asff.FirstObservedAt ?? asff.CreatedAt),
      lastObservedAt: new Date(asff.LastObservedAt ?? asff.UpdatedAt),
      rawData: asff as unknown as Record<string, unknown>,
    };
  }

  private mapASFFSeverity(
    label: string,
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
    switch (label) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      case 'INFORMATIONAL':
      default:
        return 'INFO';
    }
  }

  private buildGetFindingsRequest(
    filters?: SecurityHubFilters,
    nextToken?: string,
  ): Record<string, unknown> {
    const request: Record<string, unknown> = {
      MaxResults: this.config.maxResults ?? 100,
    };

    if (nextToken) {
      request['NextToken'] = nextToken;
    }

    if (filters) {
      const asffFilters: Record<string, unknown> = {};

      if (filters.severityLabel) {
        asffFilters['SeverityLabel'] = filters.severityLabel.map((v) => ({
          Value: v,
          Comparison: 'EQUALS',
        }));
      }
      if (filters.complianceStatus) {
        asffFilters['ComplianceStatus'] = filters.complianceStatus.map((v) => ({
          Value: v,
          Comparison: 'EQUALS',
        }));
      }
      if (filters.recordState) {
        asffFilters['RecordState'] = filters.recordState.map((v) => ({
          Value: v,
          Comparison: 'EQUALS',
        }));
      }
      if (filters.workflowState) {
        asffFilters['WorkflowStatus'] = filters.workflowState.map((v) => ({
          Value: v,
          Comparison: 'EQUALS',
        }));
      }
      if (filters.productName) {
        asffFilters['ProductName'] = filters.productName.map((v) => ({
          Value: v,
          Comparison: 'EQUALS',
        }));
      }
      if (filters.resourceType) {
        asffFilters['ResourceType'] = filters.resourceType.map((v) => ({
          Value: v,
          Comparison: 'EQUALS',
        }));
      }
      if (filters.updatedAfter) {
        asffFilters['UpdatedAt'] = [
          { Start: filters.updatedAfter, DateRange: undefined },
        ];
      }

      if (Object.keys(asffFilters).length > 0) {
        request['Filters'] = asffFilters;
      }
    }

    return request;
  }

  /**
   * Call AWS Security Hub API. Uses IAM role assumption for cross-account if configured.
   */
  private async callSecurityHub<T>(
    action: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `SecurityHubService.${action}`,
    };

    // If role ARN is configured, get assumed credentials
    if (this.config.roleArn) {
      const creds = await this.getAssumedCredentials();
      headers['X-Amz-Security-Token'] = creds.SessionToken;
    }

    const endpoint = `https://securityhub.${this.config.region}.amazonaws.com`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Security Hub API error (${action}): ${res.status} - ${errorText}`,
      );
    }

    return (await res.json()) as T;
  }

  /**
   * Assume IAM role for cross-account access.
   */
  private async getAssumedCredentials(): Promise<STSCredentials> {
    if (
      this.assumedCredentials &&
      Date.now() < this.credentialsExpiresAt
    ) {
      return this.assumedCredentials;
    }

    const stsEndpoint = `https://sts.${this.config.region}.amazonaws.com`;

    const params = new URLSearchParams({
      Action: 'AssumeRole',
      RoleArn: this.config.roleArn!,
      RoleSessionName: 'cveriskpilot-security-hub',
      DurationSeconds: '3600',
      Version: '2011-06-15',
    });

    if (this.config.externalId) {
      params.set('ExternalId', this.config.externalId);
    }

    const res = await fetch(`${stsEndpoint}?${params.toString()}`, {
      method: 'POST',
    });

    if (!res.ok) {
      throw new Error(
        `STS AssumeRole failed: ${res.status} - ${await res.text()}`,
      );
    }

    const xml = await res.text();
    // Parse credentials from XML response
    const accessKeyId = this.extractXml(xml, 'AccessKeyId');
    const secretAccessKey = this.extractXml(xml, 'SecretAccessKey');
    const sessionToken = this.extractXml(xml, 'SessionToken');
    const expiration = this.extractXml(xml, 'Expiration');

    this.assumedCredentials = {
      AccessKeyId: accessKeyId,
      SecretAccessKey: secretAccessKey,
      SessionToken: sessionToken,
      Expiration: new Date(expiration),
    };
    // Refresh 5 minutes before expiry
    this.credentialsExpiresAt =
      this.assumedCredentials.Expiration.getTime() - 5 * 60 * 1000;

    return this.assumedCredentials;
  }

  private extractXml(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
    return match?.[1] ?? '';
  }
}
