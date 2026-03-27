// ---------------------------------------------------------------------------
// ABAC Policy Engine — Type Definitions
// ---------------------------------------------------------------------------

/** Classification levels for data sensitivity, ordered least to most sensitive. */
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

/** Actions that can be performed on resources. */
export type Action = 'read' | 'write' | 'delete' | 'admin' | 'export' | 'share';

/** The decision outcome of a policy evaluation. */
export type Decision = 'allow' | 'deny';

/** Algorithm for combining multiple policy results. */
export type CombiningAlgorithm = 'deny-overrides' | 'permit-overrides' | 'first-applicable';

// ---------------------------------------------------------------------------
// Subject — the entity requesting access
// ---------------------------------------------------------------------------

export interface Subject {
  /** User ID */
  userId: string;
  /** Organization the user belongs to */
  orgId: string;
  /** Roles assigned to the user */
  roles: string[];
  /** Data classifications the user is allowed to access */
  allowedClassifications: DataClassification[];
  /** For MSSP users: IDs of clients they are assigned to */
  assignedClientIds?: string[];
  /** IP address of the request origin */
  ipAddress?: string;
  /** Additional subject attributes */
  attributes?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Resource — the object being accessed
// ---------------------------------------------------------------------------

export interface Resource {
  /** Resource type (e.g. 'vulnerability', 'report', 'scan') */
  type: string;
  /** Resource identifier */
  id: string;
  /** Organization that owns this resource */
  orgId: string;
  /** Data classification of this resource */
  classification: DataClassification;
  /** For MSSP: the client ID this resource belongs to */
  clientId?: string;
  /** Additional resource attributes */
  attributes?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Condition — a single evaluatable constraint
// ---------------------------------------------------------------------------

export type ConditionType =
  | 'tenant-boundary'
  | 'data-classification'
  | 'time-based'
  | 'ip-restriction'
  | 'mssp-client-boundary'
  | 'custom';

export interface Condition {
  type: ConditionType;
  /** For time-based: allowed hours in 24h format */
  allowedHoursStart?: number;
  allowedHoursEnd?: number;
  /** For time-based: timezone (IANA), defaults to UTC */
  timezone?: string;
  /** For IP restriction: allowed CIDR ranges or exact IPs */
  allowedIPs?: string[];
  /** For custom conditions: a key to look up in context */
  customKey?: string;
  /** For custom conditions: expected value */
  customValue?: unknown;
}

// ---------------------------------------------------------------------------
// Policy Rule & Policy
// ---------------------------------------------------------------------------

export interface PolicyRule {
  /** Actions this rule applies to. Empty means all actions. */
  actions: Action[];
  /** Resource types this rule applies to. Empty means all resource types. */
  resourceTypes: string[];
  /** Conditions that must all be satisfied for this rule to match. */
  conditions: Condition[];
  /** The decision if this rule matches. */
  decision: Decision;
}

export interface Policy {
  /** Unique policy identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this policy enforces */
  description: string;
  /** Priority (lower number = higher priority) */
  priority: number;
  /** Whether this policy is active */
  enabled: boolean;
  /** The rules within this policy */
  rules: PolicyRule[];
  /** Combining algorithm for rules within this policy */
  combiningAlgorithm: CombiningAlgorithm;
}

// ---------------------------------------------------------------------------
// Evaluation Context & Result
// ---------------------------------------------------------------------------

export interface EvaluationContext {
  /** Current timestamp (ISO 8601). Defaults to now if not provided. */
  timestamp?: string;
  /** Additional context attributes */
  attributes?: Record<string, unknown>;
}

export interface RuleEvaluationDetail {
  ruleIndex: number;
  decision: Decision;
  conditionResults: Array<{
    type: ConditionType;
    passed: boolean;
    reason: string;
  }>;
}

export interface PolicyEvaluationDetail {
  policyId: string;
  policyName: string;
  decision: Decision;
  ruleDetails: RuleEvaluationDetail[];
}

export interface EvaluationResult {
  /** Final access decision */
  decision: Decision;
  /** Human-readable reason for the decision */
  reason: string;
  /** Per-policy evaluation details */
  details: PolicyEvaluationDetail[];
  /** Timestamp of evaluation */
  evaluatedAt: string;
}
