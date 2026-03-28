// @cveriskpilot/connectors — Feature gate for scanner API connectors

import { FeatureFlagService } from '@cveriskpilot/rollout';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Feature flag name — gates all scanner API connector functionality. */
export const CONNECTORS_FLAG = 'scanner-api-connectors';

// ---------------------------------------------------------------------------
// Singleton flag service (lazy-initialized)
// ---------------------------------------------------------------------------

let _flagService: FeatureFlagService | null = null;

function getFlagService(): FeatureFlagService {
  if (!_flagService) {
    _flagService = new FeatureFlagService();
  }
  return _flagService;
}

// ---------------------------------------------------------------------------
// Feature gate check
// ---------------------------------------------------------------------------

/**
 * Assert that the scanner API connectors feature is enabled for the given org.
 *
 * @throws {ConnectorsDisabledError} if the feature flag is not enabled
 *         for the organization's deployment ring.
 *
 * Usage:
 * ```ts
 * await assertConnectorsEnabled(session.organizationId);
 * // ... proceed with connector logic
 * ```
 */
export async function assertConnectorsEnabled(orgId: string): Promise<void> {
  const flagService = getFlagService();
  const enabled = await flagService.isEnabled(CONNECTORS_FLAG, orgId);

  if (!enabled) {
    throw new ConnectorsDisabledError(orgId);
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ConnectorsDisabledError extends Error {
  public readonly code = 'CONNECTORS_DISABLED';
  public readonly orgId: string;

  constructor(orgId: string) {
    super(
      `Scanner API connectors are not enabled for organization "${orgId}". ` +
        `Feature flag "${CONNECTORS_FLAG}" is disabled or the organization is not in an enabled deployment ring.`,
    );
    this.name = 'ConnectorsDisabledError';
    this.orgId = orgId;
  }
}

// ---------------------------------------------------------------------------
// Setup helper — registers the feature flag with progressive rollout rings.
// Call once during bootstrap or via an admin setup script.
// ---------------------------------------------------------------------------

/**
 * Register the `scanner-api-connectors` feature flag.
 *
 * Progressive rollout:
 * 1. `canary` — internal testing / design partners
 * 2. `early_adopter` — beta customers
 * 3. `ga` — general availability
 *
 * The flag starts with only `canary` enabled. Use `FeatureFlagService.setFlag()`
 * to promote to wider rings as confidence grows.
 */
export async function setupConnectorsFlag(): Promise<void> {
  const flagService = getFlagService();

  const existing = await flagService.getFlag(CONNECTORS_FLAG);
  if (existing) {
    // Flag already exists — do not overwrite ring assignments
    return;
  }

  await flagService.setFlag(CONNECTORS_FLAG, ['canary'], {
    description:
      'Scanner API connectors — pull vulnerability data directly from Tenable.io, Qualys VMDR, CrowdStrike Spotlight, Rapid7 InsightVM, and Snyk.',
    active: true,
  });
}
