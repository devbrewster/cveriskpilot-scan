// @cveriskpilot/rollout — shared type definitions

/** Ordered deployment rings: canary is first, ga is last. */
export type DeploymentRing = 'canary' | 'early_adopter' | 'ga';

/** Global rollout configuration controlling ring percentages. */
export interface RolloutConfig {
  /** Percentage of tenants in canary ring (0-100) */
  canaryPercent: number;
  /** Percentage of tenants in early_adopter ring (0-100) */
  earlyAdopterPercent: number;
  /** Auto-promote after N hours without errors */
  autoPromoteAfterHours: number;
  /** Whether auto-promotion is enabled */
  autoPromoteEnabled: boolean;
}

/** Feature flag definition controlling which rings see a feature. */
export interface FeatureFlag {
  /** Unique flag name, e.g. "new-dashboard-v2" */
  name: string;
  /** Human-readable description */
  description: string;
  /** Rings where this flag is enabled */
  enabledRings: DeploymentRing[];
  /** Whether the flag is globally active (master kill switch) */
  active: boolean;
  /** ISO timestamp when the flag was created */
  createdAt: string;
  /** ISO timestamp when the flag was last updated */
  updatedAt: string;
}

/** Mapping of a tenant to its deployment ring. */
export interface RingAssignment {
  tenantId: string;
  ring: DeploymentRing;
  /** ISO timestamp when the tenant was assigned to this ring */
  assignedAt: string;
  /** ISO timestamp when the tenant was last promoted */
  promotedAt: string | null;
  /** Who or what triggered the assignment */
  assignedBy: string;
}
