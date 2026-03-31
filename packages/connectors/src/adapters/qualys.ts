import { XMLParser } from 'fast-xml-parser';
import type { CanonicalFinding } from '@cveriskpilot/parsers';
import { HttpClientWithRetry } from '../http-client';
import type {
  ScannerAdapter,
  ScannerAdapterConfig,
  DecryptedCredentials,
} from '../types';
import {
  mapQualysDetection,
  toArray,
  type QualysHostDetectionResponse,
  type QualysKBResponse,
  type QualysKBVuln,
} from '../mappers/qualys-mapper';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUALYS_RATE_LIMIT_PER_MINUTE = 30;
const QUALYS_PAGE_SIZE = 1000;

// ---------------------------------------------------------------------------
// Qualys Activity Log Response (for connection test)
// ---------------------------------------------------------------------------

interface QualysActivityLogResponse {
  ACTIVITY_LOG_LIST_OUTPUT?: {
    RESPONSE?: {
      DATETIME?: string;
      ACTIVITY_LOG_LIST?: unknown;
    };
  };
}

// ---------------------------------------------------------------------------
// Qualys VMDR Scanner Adapter
// ---------------------------------------------------------------------------

/**
 * Adapter for Qualys VMDR (Vulnerability Management, Detection & Response) API.
 *
 * Uses the Qualys XML API v2:
 * 1. Fetch QID Knowledge Base for vuln metadata (title, CVE, CVSS)
 * 2. Fetch host VM detections with cursor pagination (id_min)
 * 3. Parse XML responses and map to CanonicalFinding
 */
export class QualysAdapter implements ScannerAdapter {
  readonly scannerId = 'QUALYS_VMDR';
  readonly scannerName = 'Qualys VMDR';

  // Reusable XML parser instance matching the existing qualys.ts parser config
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: true,
    processEntities: false,
  });

  // -------------------------------------------------------------------------
  // Test Connection
  // -------------------------------------------------------------------------

  async testConnection(
    credentials: DecryptedCredentials,
  ): Promise<{ ok: boolean; message: string }> {
    const client = this.createClient(credentials);

    try {
      const rawXml = await client.get<string>(
        '/api/2.0/fo/activity_log/',
        {
          params: {
            action: 'list',
            truncation_limit: '1',
          },
          parseXml: true,
        },
      );

      // Parse to verify it's valid Qualys XML
      const parsed = this.xmlParser.parse(rawXml) as QualysActivityLogResponse;
      const hasResponse =
        !!parsed.ACTIVITY_LOG_LIST_OUTPUT?.RESPONSE?.DATETIME;

      if (hasResponse) {
        return {
          ok: true,
          message: 'Connected to Qualys VMDR API successfully',
        };
      }

      return {
        ok: true,
        message: 'Connected to Qualys API (activity log response received)',
      };
    } catch (error) {
      return {
        ok: false,
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Fetch Findings (AsyncGenerator)
  // -------------------------------------------------------------------------

  async *fetchFindings(
    config: ScannerAdapterConfig,
  ): AsyncGenerator<CanonicalFinding[], void, undefined> {
    const { credentials, scannerConfig, lastSyncAt, onProgress } = config;
    const client = this.createClient(credentials);

    // Phase 1: Fetch Knowledge Base for QID enrichment
    onProgress('Fetching Qualys Knowledge Base...');
    const kbLookup = await this.fetchKnowledgeBase(
      client,
      scannerConfig,
      onProgress,
    );
    onProgress(`Knowledge Base loaded: ${kbLookup.size} QIDs cached`);

    // Phase 2: Fetch host VM detections with cursor pagination
    onProgress('Fetching host vulnerability detections...');

    let idMin = 0;
    let pageNumber = 0;
    let totalFindings = 0;
    let hasMore = true;

    while (hasMore) {
      pageNumber++;
      onProgress(`Fetching detection page ${pageNumber} (id_min=${idMin})...`);

      const params: Record<string, string> = {
        action: 'list',
        show_igs: '1',
        status: 'New,Active,Re-Opened,Fixed',
        truncation_limit: String(
          (scannerConfig['pageSize'] as number) ?? QUALYS_PAGE_SIZE,
        ),
        output_format: 'XML',
      };

      // Cursor-based pagination
      if (idMin > 0) {
        params['id_min'] = String(idMin);
      }

      // Incremental sync filter
      if (lastSyncAt) {
        params['detection_updated_since'] = lastSyncAt.toISOString();
      }

      // Optional asset group filter
      if (scannerConfig['assetGroupIds']) {
        params['ag_ids'] = String(scannerConfig['assetGroupIds']);
      }

      // Optional severity filter (Qualys 1-5)
      if (scannerConfig['severityFilter']) {
        params['severities'] = String(scannerConfig['severityFilter']);
      }

      const rawXml = await client.get<string>(
        '/api/2.0/fo/asset/host/vm/detection/',
        { params, parseXml: true },
      );

      // Parse XML response
      const parsed = this.parseDetectionResponse(rawXml);
      const response = parsed.HOST_LIST_VM_DETECTION_OUTPUT?.RESPONSE;

      if (!response) {
        onProgress('No response element in Qualys XML — ending pagination');
        break;
      }

      // Extract hosts and their detections
      const hosts = toArray(response.HOST_LIST?.HOST);

      if (hosts.length === 0) {
        onProgress('No hosts in response — ending pagination');
        break;
      }

      // Map all detections across all hosts in this page
      const findings: CanonicalFinding[] = [];
      let maxHostId = 0;

      for (const host of hosts) {
        const detections = toArray(host.DETECTION_LIST?.DETECTION);

        // Track max host ID for cursor advancement
        if (host.ID > maxHostId) {
          maxHostId = host.ID;
        }

        for (const detection of detections) {
          try {
            findings.push(mapQualysDetection(detection, host, kbLookup));
          } catch {
            onProgress(
              `Warning: Failed to map detection QID ${detection.QID} on host ${host.IP}`,
            );
          }
        }
      }

      totalFindings += findings.length;
      onProgress(
        `Page ${pageNumber}: ${hosts.length} hosts, ${findings.length} findings (${totalFindings} total)`,
      );

      if (findings.length > 0) {
        yield findings;
      }

      // Check for more pages
      // Qualys indicates truncation via a WARNING element with a next URL
      const warning = response.WARNING;
      if (warning?.URL) {
        // Extract id_min from the next URL
        const nextIdMin = this.extractIdMinFromUrl(warning.URL);
        if (nextIdMin !== null && nextIdMin > idMin) {
          idMin = nextIdMin;
        } else {
          // Fallback: advance past the max host ID we saw
          idMin = maxHostId + 1;
        }
      } else if (hosts.length < QUALYS_PAGE_SIZE) {
        // Fewer results than the page size — last page
        hasMore = false;
      } else {
        // No WARNING and full page — advance cursor manually
        idMin = maxHostId + 1;
      }
    }

    onProgress(
      `Qualys VMDR sync complete: ${totalFindings} findings across ${pageNumber} page(s)`,
    );
  }

  // -------------------------------------------------------------------------
  // Private: Knowledge Base Fetch
  // -------------------------------------------------------------------------

  /**
   * Fetch the Qualys Knowledge Base to enrich detections with titles, CVEs, CVSS.
   * Paginates through the KB using the same WARNING/URL cursor pattern.
   */
  private async fetchKnowledgeBase(
    client: HttpClientWithRetry,
    scannerConfig: Record<string, unknown>,
    onProgress: (msg: string) => void,
  ): Promise<Map<number, QualysKBVuln>> {
    const kbLookup = new Map<number, QualysKBVuln>();
    let hasMore = true;
    let lastId = 0;
    let pageNumber = 0;

    while (hasMore) {
      pageNumber++;
      const params: Record<string, string> = {
        action: 'list',
        details: 'All',
      };

      if (lastId > 0) {
        params['id_min'] = String(lastId);
      }

      // Optional: limit KB fetch to specific QIDs or date range
      if (scannerConfig['kbLastModified']) {
        params['last_modified_after'] = String(
          scannerConfig['kbLastModified'],
        );
      }

      const rawXml = await client.post<string>(
        '/api/2.0/fo/knowledge_base/vuln/',
        undefined,
        { params, parseXml: true },
      );

      const parsed = this.parseKBResponse(rawXml);
      const response = parsed.KNOWLEDGE_BASE_VULN_LIST_OUTPUT?.RESPONSE;

      if (!response) {
        break;
      }

      const vulns = toArray(response.VULN_LIST?.VULN);

      if (vulns.length === 0) {
        break;
      }

      let maxQid = 0;
      for (const vuln of vulns) {
        kbLookup.set(vuln.QID, vuln);
        if (vuln.QID > maxQid) maxQid = vuln.QID;
      }

      onProgress(`KB page ${pageNumber}: ${vulns.length} QIDs loaded (${kbLookup.size} total)`);

      // Check for more pages
      const warning = response.WARNING;
      if (warning?.URL) {
        const nextId = this.extractIdMinFromUrl(warning.URL);
        if (nextId !== null && nextId > lastId) {
          lastId = nextId;
        } else {
          lastId = maxQid + 1;
        }
      } else {
        hasMore = false;
      }
    }

    return kbLookup;
  }

  // -------------------------------------------------------------------------
  // Private: XML Parsing
  // -------------------------------------------------------------------------

  private parseDetectionResponse(rawXml: string): QualysHostDetectionResponse {
    const sanitized = rawXml.replace(/<!DOCTYPE[^>]*>/gi, '');
    return this.xmlParser.parse(sanitized) as QualysHostDetectionResponse;
  }

  private parseKBResponse(rawXml: string): QualysKBResponse {
    const sanitized = rawXml.replace(/<!DOCTYPE[^>]*>/gi, '');
    return this.xmlParser.parse(sanitized) as QualysKBResponse;
  }

  // -------------------------------------------------------------------------
  // Private: URL Parsing
  // -------------------------------------------------------------------------

  /**
   * Extract the id_min parameter from a Qualys pagination URL.
   * Qualys returns URLs like: https://qualysapi.qualys.com/api/2.0/fo/...&id_min=12345
   */
  private extractIdMinFromUrl(url: string): number | null {
    try {
      const urlObj = new URL(url);
      const idMin = urlObj.searchParams.get('id_min');
      if (idMin) {
        const parsed = parseInt(idMin, 10);
        return isNaN(parsed) ? null : parsed;
      }

      // Also try extracting from the raw string (Qualys sometimes uses non-standard formats)
      const match = url.match(/id_min=(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    } catch {
      // URL might not be a full URL — try regex
      const match = url.match(/id_min=(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }
  }

  // -------------------------------------------------------------------------
  // Private: Client Factory
  // -------------------------------------------------------------------------

  private createClient(credentials: DecryptedCredentials): HttpClientWithRetry {
    // SSRF protection: re-validate baseUrl at invocation time (not just creation time)
    const { validateExternalUrl } = require('@cveriskpilot/auth');
    const urlCheck = validateExternalUrl(credentials.baseUrl);
    if (!urlCheck.valid) {
      throw new Error(`Blocked SSRF attempt on Qualys baseUrl: ${urlCheck.reason}`);
    }

    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    const username = credentials.username ?? '';
    const password = credentials.password ?? '';

    if (!username || !password) {
      throw new Error(
        'Qualys VMDR requires username and password (Basic auth) credentials',
      );
    }

    const basicAuth = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );

    return new HttpClientWithRetry({
      baseUrl,
      defaultHeaders: {
        Authorization: `Basic ${basicAuth}`,
        'X-Requested-With': 'CVERiskPilot',
        Accept: 'application/xml',
      },
      rateLimitPerMinute: QUALYS_RATE_LIMIT_PER_MINUTE,
      maxRetries: 3,
      retryBackoffMs: 2_000,
      timeoutMs: 120_000, // Qualys XML responses can be large
      circuitBreakerThreshold: 5,
    });
  }
}
