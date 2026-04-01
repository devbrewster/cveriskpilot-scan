// @cveriskpilot/rollout — A/B testing for anonymous visitors
//
// Lightweight, cookie-based A/B testing that doesn't require Redis or tenant
// assignment. Uses a deterministic hash of a visitor ID (stored in a cookie)
// to assign consistent variants.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ABExperiment<V extends string = string> {
  /** Unique experiment name, e.g. "pricing_cta_variant" */
  name: string;
  /** Human-readable description */
  description: string;
  /** Ordered list of variants with traffic weights (must sum to 100) */
  variants: Array<{ value: V; weight: number }>;
  /** Whether the experiment is active. Inactive experiments return the first variant (control). */
  active: boolean;
}

export interface ABAssignment {
  /** Experiment name */
  experiment: string;
  /** Assigned variant value */
  variant: string;
}

// ---------------------------------------------------------------------------
// Experiment registry — add new experiments here
// ---------------------------------------------------------------------------

export const AB_EXPERIMENTS = {
  pricing_cta_variant: {
    name: 'pricing_cta_variant',
    description: 'Controls primary CTA text on pricing page: "start-free" (control) vs "start-trial" (variant)',
    variants: [
      { value: 'start-free', weight: 50 },
      { value: 'start-trial', weight: 50 },
    ],
    active: true,
  } satisfies ABExperiment<'start-free' | 'start-trial'>,

  pricing_show_annual: {
    name: 'pricing_show_annual',
    description: 'Whether to default the billing toggle to annual (true) or monthly (false, control)',
    variants: [
      { value: 'false', weight: 50 },
      { value: 'true', weight: 50 },
    ],
    active: true,
  } satisfies ABExperiment<'true' | 'false'>,

  pricing_founders_scarcity: {
    name: 'pricing_founders_scarcity',
    description: 'Whether to show "X of 50 spots remaining" scarcity indicator',
    variants: [
      { value: 'false', weight: 50 },
      { value: 'true', weight: 50 },
    ],
    active: true,
  } satisfies ABExperiment<'true' | 'false'>,
} as const;

export type ABExperimentName = keyof typeof AB_EXPERIMENTS;

// ---------------------------------------------------------------------------
// Deterministic variant assignment
// ---------------------------------------------------------------------------

/**
 * Deterministic hash that maps a string to a value in [0, 100).
 * Uses DJB2 — same approach as the ring assignment in rings.ts.
 * The salt parameter ensures different experiments get different assignments
 * for the same visitor.
 */
function hashToBucket(input: string, salt: string): number {
  const combined = `${salt}:${input}`;
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash + combined.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Assign a visitor to a variant for a given experiment.
 * Returns the control (first variant) if the experiment is inactive.
 */
export function assignVariant(
  experimentName: ABExperimentName,
  visitorId: string,
): string {
  const experiment = AB_EXPERIMENTS[experimentName];
  if (!experiment || !experiment.active) {
    return experiment?.variants[0]?.value ?? '';
  }

  const bucket = hashToBucket(visitorId, experiment.name);

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.value;
    }
  }

  // Fallback to last variant (shouldn't happen if weights sum to 100)
  return experiment.variants[experiment.variants.length - 1]!.value;
}

/**
 * Assign a visitor to all active experiments at once.
 * Returns a map of experiment name -> variant value.
 */
export function assignAllVariants(
  visitorId: string,
): Record<ABExperimentName, string> {
  const result: Record<string, string> = {};
  for (const name of Object.keys(AB_EXPERIMENTS) as ABExperimentName[]) {
    result[name] = assignVariant(name, visitorId);
  }
  return result as Record<ABExperimentName, string>;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/** Cookie name for the visitor ID used in A/B assignment */
export const AB_VISITOR_COOKIE = 'crp_ab_vid';

/** Cookie name for cached variant assignments */
export const AB_VARIANTS_COOKIE = 'crp_ab_variants';

/**
 * Generate a random visitor ID (UUID v4-like).
 * Used when no visitor cookie exists yet.
 */
export function generateVisitorId(): string {
  // Simple random hex string — no crypto dependency needed for A/B bucketing
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) => {
      let s = '';
      for (let i = 0; i < len; i++) {
        s += Math.floor(Math.random() * 16).toString(16);
      }
      return s;
    })
    .join('-');
}

/**
 * Serialize variant assignments to a compact cookie value.
 * Format: "exp1=val1,exp2=val2"
 */
export function serializeVariants(variants: Record<string, string>): string {
  return Object.entries(variants)
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
}

/**
 * Deserialize variant assignments from a cookie value.
 */
export function deserializeVariants(cookie: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookie) return result;
  for (const pair of cookie.split(',')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      result[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
    }
  }
  return result;
}

/**
 * Build a URL query parameter string for A/B variant attribution.
 * Returns e.g. "&ab=pricing_cta_variant:start-trial"
 */
export function buildABParam(experimentName: string, variant: string): string {
  return `${experimentName}:${variant}`;
}
