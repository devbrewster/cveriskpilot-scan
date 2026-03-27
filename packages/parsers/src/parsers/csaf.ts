import type { CanonicalFinding, ParseResult, ParseError } from '../types';

interface CsafDocument {
  document?: {
    title?: string;
    tracking?: {
      id?: string;
      current_release_date?: string;
      generator?: { engine?: { name?: string } };
    };
    publisher?: { name?: string };
    category?: string;
  };
  product_tree?: {
    branches?: CsafBranch[];
    full_product_names?: CsafProductName[];
  };
  vulnerabilities?: CsafVulnerability[];
}

interface CsafBranch {
  category?: string;
  name?: string;
  branches?: CsafBranch[];
  product?: CsafProductName;
}

interface CsafProductName {
  product_id?: string;
  name?: string;
}

interface CsafVulnerability {
  cve?: string;
  cwe?: { id?: string; name?: string };
  title?: string;
  notes?: Array<{
    category?: string;
    text?: string;
  }>;
  scores?: CsafScore[];
  product_status?: {
    known_affected?: string[];
    fixed?: string[];
    known_not_affected?: string[];
    first_affected?: string[];
    under_investigation?: string[];
  };
  remediations?: Array<{
    category?: string;
    details?: string;
    product_ids?: string[];
  }>;
  references?: Array<{
    url?: string;
    summary?: string;
    category?: string;
  }>;
  threats?: Array<{
    category?: string;
    details?: string;
    product_ids?: string[];
  }>;
}

interface CsafScore {
  cvss_v3?: {
    version?: string;
    vectorString?: string;
    baseScore?: number;
    baseSeverity?: string;
  };
  cvss_v2?: {
    version?: string;
    vectorString?: string;
    baseScore?: number;
  };
  products?: string[];
}

const SEVERITY_MAP: Record<string, CanonicalFinding['severity']> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  none: 'INFO',
  informational: 'INFO',
};

function buildProductMap(
  productTree: CsafDocument['product_tree'],
): Map<string, string> {
  const map = new Map<string, string>();
  if (!productTree) return map;

  // Direct full_product_names
  for (const p of productTree.full_product_names ?? []) {
    if (p.product_id && p.name) {
      map.set(p.product_id, p.name);
    }
  }

  // Recurse through branches
  function walkBranches(branches: CsafBranch[] | undefined): void {
    if (!branches) return;
    for (const branch of branches) {
      if (branch.product?.product_id && branch.product?.name) {
        map.set(branch.product.product_id, branch.product.name);
      }
      walkBranches(branch.branches);
    }
  }
  walkBranches(productTree.branches);

  return map;
}

export async function parseCsaf(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const text =
    typeof content === 'string' ? content : content.toString('utf-8');

  let doc: CsafDocument;
  try {
    doc = JSON.parse(text) as CsafDocument;
  } catch (err) {
    errors.push({
      message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'CSAF',
      scannerName: 'csaf',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  const productMap = buildProductMap(doc.product_tree);
  const scannerName =
    doc.document?.tracking?.generator?.engine?.name ?? 'csaf';

  for (const vuln of doc.vulnerabilities ?? []) {
    try {
      const cveId = vuln.cve;
      const cveIds = cveId ? [cveId] : [];
      const cweIds =
        vuln.cwe?.id
          ? [vuln.cwe.id.startsWith('CWE-') ? vuln.cwe.id : `CWE-${vuln.cwe.id}`]
          : [];

      const title =
        vuln.title ?? cveId ?? 'Unknown Vulnerability';

      // Extract description from notes
      let description = title;
      for (const note of vuln.notes ?? []) {
        if (
          note.category === 'description' ||
          note.category === 'summary'
        ) {
          description = note.text ?? description;
          break;
        }
      }
      // Fallback: use any note text
      if (description === title && vuln.notes && vuln.notes.length > 0) {
        description = vuln.notes[0].text ?? title;
      }

      // Extract severity and CVSS from scores
      let severity: CanonicalFinding['severity'] = 'MEDIUM';
      let cvssScore: number | undefined;
      let cvssVector: string | undefined;
      let cvssVersion: string | undefined;

      if (vuln.scores && vuln.scores.length > 0) {
        const score = vuln.scores[0];
        if (score.cvss_v3) {
          severity =
            SEVERITY_MAP[score.cvss_v3.baseSeverity?.toLowerCase() ?? ''] ??
            'MEDIUM';
          cvssScore = score.cvss_v3.baseScore;
          cvssVector = score.cvss_v3.vectorString;
          cvssVersion = score.cvss_v3.version ?? '3.1';
        } else if (score.cvss_v2) {
          cvssScore = score.cvss_v2.baseScore;
          cvssVector = score.cvss_v2.vectorString;
          cvssVersion = score.cvss_v2.version ?? '2.0';
          // Derive severity from v2 score
          if (cvssScore !== undefined) {
            if (cvssScore >= 9.0) severity = 'CRITICAL';
            else if (cvssScore >= 7.0) severity = 'HIGH';
            else if (cvssScore >= 4.0) severity = 'MEDIUM';
            else if (cvssScore > 0) severity = 'LOW';
            else severity = 'INFO';
          }
        }
      }

      // Extract solution from remediations
      let solution: string | undefined;
      for (const rem of vuln.remediations ?? []) {
        if (rem.details) {
          solution = rem.details;
          break;
        }
      }

      // Get affected products
      const affectedProductIds = vuln.product_status?.known_affected ?? [];

      if (affectedProductIds.length === 0) {
        // Create a single finding without product info
        findings.push({
          title,
          description,
          cveIds,
          cweIds,
          severity,
          cvssScore,
          cvssVector,
          cvssVersion,
          scannerType: 'ADVISORY',
          scannerName,
          assetName: doc.document?.title ?? 'unknown',
          rawObservations: {
            cve: cveId,
            solution,
            documentTitle: doc.document?.title,
            trackingId: doc.document?.tracking?.id,
          },
          discoveredAt: doc.document?.tracking?.current_release_date
            ? new Date(doc.document.tracking.current_release_date)
            : new Date(),
        });
      } else {
        // Create a finding per affected product
        for (const productId of affectedProductIds) {
          const productName = productMap.get(productId) ?? productId;

          findings.push({
            title,
            description,
            cveIds,
            cweIds,
            severity,
            cvssScore,
            cvssVector,
            cvssVersion,
            scannerType: 'ADVISORY',
            scannerName,
            assetName: productName,
            rawObservations: {
              cve: cveId,
              productId,
              solution,
              documentTitle: doc.document?.title,
              trackingId: doc.document?.tracking?.id,
            },
            discoveredAt: doc.document?.tracking?.current_release_date
              ? new Date(doc.document.tracking.current_release_date)
              : new Date(),
          });
        }
      }
    } catch (err) {
      errors.push({
        message: `Error parsing CSAF vulnerability: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'warning',
      });
    }
  }

  return {
    format: 'CSAF',
    scannerName,
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
