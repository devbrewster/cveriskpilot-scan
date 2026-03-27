import type { EnrichedFinding } from '@cveriskpilot/enrichment';

// ---------------------------------------------------------------------------
// Asset Resolver — upserts Asset records and returns a name → id lookup map
// ---------------------------------------------------------------------------

export interface ResolveAssetsParams {
  organizationId: string;
  clientId: string;
  findings: EnrichedFinding[];
  prisma: any;
}

/**
 * Derive an AssetType enum value from the finding context.
 * Falls back to HOST when we cannot determine a better match.
 */
function deriveAssetType(finding: EnrichedFinding): string {
  const explicit = finding.assetType?.toUpperCase();

  if (explicit === 'CONTAINER_IMAGE' || explicit === 'CONTAINER') {
    return 'CONTAINER_IMAGE';
  }
  if (explicit === 'REPOSITORY') return 'REPOSITORY';
  if (explicit === 'APPLICATION') return 'APPLICATION';
  if (explicit === 'CLOUD_ACCOUNT') return 'CLOUD_ACCOUNT';

  // Heuristic: SCA scanners typically target repositories
  if (finding.scannerType === 'SCA') return 'REPOSITORY';
  if (finding.scannerType === 'CONTAINER') return 'CONTAINER_IMAGE';
  if (finding.scannerType === 'DAST') return 'APPLICATION';

  return 'HOST';
}

/**
 * For each unique asset name across the provided findings, find-or-create an
 * Asset record and return a Map of assetName → assetId.
 */
export async function resolveAssets(
  params: ResolveAssetsParams,
): Promise<Map<string, string>> {
  const { organizationId, clientId, findings, prisma } = params;
  const assetMap = new Map<string, string>();

  // Collect unique asset names with a representative finding for type derivation
  const uniqueAssets = new Map<string, EnrichedFinding>();
  for (const finding of findings) {
    if (!uniqueAssets.has(finding.assetName)) {
      uniqueAssets.set(finding.assetName, finding);
    }
  }

  for (const [assetName, representativeFinding] of uniqueAssets) {
    // Try to find an existing asset
    const existing = await prisma.asset.findFirst({
      where: {
        organizationId,
        clientId,
        name: assetName,
        deletedAt: null,
      },
    });

    if (existing) {
      assetMap.set(assetName, existing.id);
    } else {
      const created = await prisma.asset.create({
        data: {
          organizationId,
          clientId,
          name: assetName,
          type: deriveAssetType(representativeFinding),
          environment: 'PRODUCTION',
          criticality: 'MEDIUM',
          tags: [],
        },
      });
      assetMap.set(assetName, created.id);
    }
  }

  return assetMap;
}
