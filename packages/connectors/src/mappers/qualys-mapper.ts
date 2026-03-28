import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// Qualys VMDR API Response Types
// ---------------------------------------------------------------------------

/** A host detection from GET /api/2.0/fo/asset/host/vm/detection/ */
export interface QualysDetection {
  QID: number;
  TYPE: string;
  SEVERITY: number;
  PORT?: number;
  PROTOCOL?: string;
  FQDN?: string;
  SSL?: boolean;
  INSTANCE?: string;
  RESULTS?: string;
  STATUS: 'New' | 'Active' | 'Re-Opened' | 'Fixed';
  FIRST_FOUND_DATETIME?: string;
  LAST_FOUND_DATETIME?: string;
  LAST_TEST_DATETIME?: string;
  LAST_UPDATE_DATETIME?: string;
  LAST_PROCESSED_DATETIME?: string;
  TIMES_FOUND?: number;
  IS_IGNORED?: boolean;
  IS_DISABLED?: boolean;
  AFFECT_RUNNING_KERNEL?: boolean;
  AFFECT_RUNNING_SERVICE?: boolean;
  AFFECT_EXPLOITABLE_CONFIG?: boolean;
}

/** A host entry from the host detection response */
export interface QualysHost {
  ID: number;
  IP: string;
  TRACKING_METHOD?: string;
  DNS?: string;
  DNS_DATA?: {
    HOSTNAME?: string;
    DOMAIN?: string;
    FQDN?: string;
  };
  NETBIOS?: string;
  OS?: string;
  LAST_SCAN_DATETIME?: string;
  LAST_VM_SCANNED_DATE?: string;
  LAST_VM_AUTH_SCANNED_DATE?: string;
}

/** A vulnerability from the Qualys Knowledge Base */
export interface QualysKBVuln {
  QID: number;
  VULN_TYPE: string;
  SEVERITY_LEVEL: number;
  TITLE: string;
  CATEGORY?: string;
  LAST_SERVICE_MODIFICATION_DATETIME?: string;
  PUBLISHED_DATETIME?: string;
  PATCHABLE?: boolean;
  SOFTWARE_LIST?: {
    SOFTWARE?: QualysSoftware | QualysSoftware[];
  };
  VENDOR_REFERENCE_LIST?: {
    VENDOR_REFERENCE?: QualysVendorReference | QualysVendorReference[];
  };
  CVE_LIST?: {
    CVE?: QualysCVE | QualysCVE[];
  };
  DIAGNOSIS?: string;
  DIAGNOSIS_COMMENT?: string;
  CONSEQUENCE?: string;
  SOLUTION?: string;
  SOLUTION_COMMENT?: string;
  COMPLIANCE_LIST?: unknown;
  CORRELATION?: {
    EXPLOITS?: {
      EXPLT_SRC?: unknown;
    };
  };
  CVSS?: {
    BASE?: string;
    TEMPORAL?: string;
    VECTOR_STRING?: string;
    ACCESS?: Record<string, string>;
  };
  CVSS_V3?: {
    BASE?: string;
    TEMPORAL?: string;
    VECTOR_STRING?: string;
    ATTACK?: Record<string, string>;
  };
  BUGTRAQ_LIST?: {
    BUGTRAQ?: unknown;
  };
  DISCOVERY?: {
    REMOTE?: number;
    AUTH_TYPE_LIST?: unknown;
    ADDITIONAL_INFO?: string;
  };
}

export interface QualysSoftware {
  PRODUCT: string;
  VENDOR: string;
}

export interface QualysVendorReference {
  ID: string;
  URL: string;
}

export interface QualysCVE {
  ID: string;
  URL: string;
}

/** Parsed XML response wrapper for host detections */
export interface QualysHostDetectionResponse {
  HOST_LIST_VM_DETECTION_OUTPUT?: {
    RESPONSE?: {
      DATETIME?: string;
      HOST_LIST?: {
        HOST?: QualysHostDetectionEntry | QualysHostDetectionEntry[];
      };
      WARNING?: {
        CODE?: number;
        TEXT?: string;
        URL?: string;
      };
    };
  };
}

/** Host entry within the detection response (host + its detections) */
export interface QualysHostDetectionEntry {
  ID: number;
  IP: string;
  TRACKING_METHOD?: string;
  DNS?: string;
  DNS_DATA?: {
    HOSTNAME?: string;
    DOMAIN?: string;
    FQDN?: string;
  };
  NETBIOS?: string;
  OS?: string;
  LAST_SCAN_DATETIME?: string;
  DETECTION_LIST?: {
    DETECTION?: QualysDetection | QualysDetection[];
  };
}

/** Parsed XML response wrapper for Knowledge Base */
export interface QualysKBResponse {
  KNOWLEDGE_BASE_VULN_LIST_OUTPUT?: {
    RESPONSE?: {
      DATETIME?: string;
      VULN_LIST?: {
        VULN?: QualysKBVuln | QualysKBVuln[];
      };
      WARNING?: {
        CODE?: number;
        TEXT?: string;
        URL?: string;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Severity Mapping (Qualys 1-5 scale)
// ---------------------------------------------------------------------------

const QUALYS_SEVERITY_MAP: Record<number, CanonicalFinding['severity']> = {
  1: 'INFO',
  2: 'LOW',
  3: 'MEDIUM',
  4: 'HIGH',
  5: 'CRITICAL',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize Qualys arrays — XML parser may return single item or array */
export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/**
 * Maps a Qualys VMDR host detection to a CanonicalFinding.
 * Requires a KB lookup map for enrichment (title, CVEs, CVSS, description).
 */
export function mapQualysDetection(
  detection: QualysDetection,
  host: QualysHost | QualysHostDetectionEntry,
  kbLookup: Map<number, QualysKBVuln>,
): CanonicalFinding {
  const kb = kbLookup.get(detection.QID);

  const severity =
    QUALYS_SEVERITY_MAP[detection.SEVERITY] ??
    (kb ? QUALYS_SEVERITY_MAP[kb.SEVERITY_LEVEL] : undefined) ??
    'MEDIUM';

  const title = kb?.TITLE ?? `QID ${detection.QID}`;

  // Build description from KB diagnosis + consequence
  const descriptionParts: string[] = [];
  if (kb?.DIAGNOSIS) descriptionParts.push(kb.DIAGNOSIS);
  if (kb?.CONSEQUENCE) descriptionParts.push(kb.CONSEQUENCE);
  const description = descriptionParts.join('\n\n') || title;

  // Extract CVE IDs from KB
  const cveIds: string[] = [];
  if (kb?.CVE_LIST?.CVE) {
    const cves = toArray(kb.CVE_LIST.CVE);
    for (const cve of cves) {
      if (cve.ID && /^CVE-\d{4}-\d{4,}$/.test(cve.ID)) {
        cveIds.push(cve.ID);
      }
    }
  }

  // CVSS — prefer v3, fall back to v2
  const cvss3Base = kb?.CVSS_V3?.BASE ? parseFloat(kb.CVSS_V3.BASE) : NaN;
  const cvss2Base = kb?.CVSS?.BASE ? parseFloat(kb.CVSS.BASE) : NaN;
  const cvssScore = !isNaN(cvss3Base)
    ? cvss3Base
    : !isNaN(cvss2Base)
      ? cvss2Base
      : undefined;

  const cvssVector =
    kb?.CVSS_V3?.VECTOR_STRING || kb?.CVSS?.VECTOR_STRING || undefined;

  const cvssVersion = kb?.CVSS_V3?.VECTOR_STRING
    ? '3.0'
    : kb?.CVSS?.VECTOR_STRING
      ? '2.0'
      : undefined;

  // Asset info
  const hostname =
    host.DNS_DATA?.HOSTNAME || host.DNS_DATA?.FQDN || host.DNS || undefined;
  const assetName = hostname || host.IP || 'unknown';
  const ipAddress = host.IP || undefined;

  return {
    title,
    description,
    cveIds,
    cweIds: [],
    severity,
    cvssScore,
    cvssVector,
    cvssVersion,
    scannerType: 'qualys',
    scannerName: 'Qualys VMDR',
    assetName,
    hostname,
    ipAddress,
    port: detection.PORT,
    protocol: detection.PROTOCOL,
    rawObservations: {
      qid: detection.QID,
      type: detection.TYPE,
      status: detection.STATUS,
      results: detection.RESULTS,
      solution: kb?.SOLUTION,
      category: kb?.CATEGORY,
      patchable: kb?.PATCHABLE,
      timesFound: detection.TIMES_FOUND,
      hostId: host.ID,
      os: host.OS,
    },
    discoveredAt: detection.FIRST_FOUND_DATETIME
      ? new Date(detection.FIRST_FOUND_DATETIME)
      : new Date(),
  };
}
