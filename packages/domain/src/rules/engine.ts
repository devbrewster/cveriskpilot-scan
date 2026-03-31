/**
 * Automation Rule Engine for CVERiskPilot
 *
 * Evaluates IF-condition-THEN-action rules against VulnerabilityCase data.
 * Pure functions throughout — no side effects, no mutations.
 * Callers are responsible for executing the returned action intents.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'exists';

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
}

export type ConditionLogic = 'AND' | 'OR';

export type ActionType =
  | 'set_status'
  | 'assign_user'
  | 'add_tag'
  | 'set_severity'
  | 'trigger_triage'
  | 'send_notification'
  | 'create_comment';

export interface RuleAction {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  conditionLogic: ConditionLogic;
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
}

export interface ActionResult {
  type: ActionType;
  success: boolean;
  description: string;
  params: Record<string, unknown>;
}

export interface MatchResult {
  rule: AutomationRule;
  matched: boolean;
  actions: ActionResult[];
}

export interface DryRunRuleResult {
  ruleId: string;
  ruleName: string;
  matchCount: number;
  sampleMatches: Record<string, unknown>[];
}

export interface DryRunResult {
  totalCases: number;
  matchedCases: number;
  ruleResults: DryRunRuleResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Attempt to coerce a value to a number for comparison operators. */
function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Core evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single condition against a data record.
 *
 * - Numeric operators (`gt`, `gte`, `lt`, `lte`) coerce both sides to numbers.
 * - `contains` works on arrays (element membership) and strings (substring).
 * - `exists` returns true when the field value is neither null nor undefined.
 * - `in` / `not_in` test whether the field value appears in the provided array.
 */
export function evaluateCondition(
  condition: RuleCondition,
  data: Record<string, unknown>,
): boolean {
  const fieldValue = data[condition.field];
  const { operator, value: condValue } = condition;

  switch (operator) {
    // --- Equality -----------------------------------------------------------
    case 'eq':
      // Loose comparison so "CRITICAL" === "CRITICAL" and 9.8 === 9.8
      // eslint-disable-next-line eqeqeq
      return fieldValue == condValue;

    case 'neq':
      // eslint-disable-next-line eqeqeq
      return fieldValue != condValue;

    // --- Numeric comparisons ------------------------------------------------
    case 'gt': {
      const a = toNumber(fieldValue);
      const b = toNumber(condValue);
      return a !== undefined && b !== undefined && a > b;
    }
    case 'gte': {
      const a = toNumber(fieldValue);
      const b = toNumber(condValue);
      return a !== undefined && b !== undefined && a >= b;
    }
    case 'lt': {
      const a = toNumber(fieldValue);
      const b = toNumber(condValue);
      return a !== undefined && b !== undefined && a < b;
    }
    case 'lte': {
      const a = toNumber(fieldValue);
      const b = toNumber(condValue);
      return a !== undefined && b !== undefined && a <= b;
    }

    // --- Set membership -----------------------------------------------------
    case 'in': {
      if (!Array.isArray(condValue)) return false;
      return condValue.includes(fieldValue as string);
    }
    case 'not_in': {
      if (!Array.isArray(condValue)) return true;
      return !condValue.includes(fieldValue as string);
    }

    // --- Contains -----------------------------------------------------------
    case 'contains': {
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condValue);
      }
      if (typeof fieldValue === 'string' && typeof condValue === 'string') {
        return fieldValue.includes(condValue);
      }
      return false;
    }

    // --- Exists -------------------------------------------------------------
    case 'exists':
      return fieldValue !== null && fieldValue !== undefined;

    default:
      return false;
  }
}

/**
 * Evaluate a full rule (all conditions combined with AND/OR logic).
 */
export function evaluateRule(
  rule: AutomationRule,
  data: Record<string, unknown>,
): boolean {
  if (rule.conditions.length === 0) return false;

  if (rule.conditionLogic === 'AND') {
    return rule.conditions.every((c) => evaluateCondition(c, data));
  }
  // OR
  return rule.conditions.some((c) => evaluateCondition(c, data));
}

// ---------------------------------------------------------------------------
// Action execution (pure — returns intent, never mutates)
// ---------------------------------------------------------------------------

const ACTION_DESCRIPTIONS: Record<ActionType, (p: Record<string, unknown>) => string> = {
  set_status: (p) => `Set case status to ${String(p.status)}`,
  assign_user: (p) =>
    p.userId
      ? `Assign case to user ${String(p.userId)}`
      : `Assign case to role ${String(p.role)}`,
  add_tag: (p) => `Add tag "${String(p.tag)}"`,
  set_severity: (p) => `Set severity to ${String(p.severity)}`,
  trigger_triage: () => 'Trigger AI triage',
  send_notification: (p) =>
    `Send notification: ${String(p.template ?? p.message ?? 'default')}`,
  create_comment: (p) => `Create comment: ${String(p.text ?? '')}`.slice(0, 120),
};

/**
 * Produce an array of action-result intents for the caller to execute.
 * This is a pure function — it does NOT mutate `caseData`.
 */
export function executeActions(
  actions: RuleAction[],
  _caseData: Record<string, unknown>,
): ActionResult[] {
  return actions.map((action) => {
    const describeFn = ACTION_DESCRIPTIONS[action.type];
    return {
      type: action.type,
      success: true,
      description: describeFn ? describeFn(action.params) : `Execute ${action.type}`,
      params: action.params,
    };
  });
}

// ---------------------------------------------------------------------------
// Rule matching
// ---------------------------------------------------------------------------

/**
 * Evaluate all enabled rules against a single data record.
 * Returns results sorted by priority descending (highest priority first).
 */
export function matchRules(
  rules: AutomationRule[],
  data: Record<string, unknown>,
): MatchResult[] {
  return rules
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority)
    .map((rule) => {
      const matched = evaluateRule(rule, data);
      return {
        rule,
        matched,
        actions: matched ? executeActions(rule.actions, data) : [],
      };
    });
}

// ---------------------------------------------------------------------------
// Dry run
// ---------------------------------------------------------------------------

const MAX_SAMPLE_MATCHES = 5;

/**
 * Run all rules against all cases and return aggregate statistics.
 * Useful for previewing the impact of rule changes before enabling them.
 */
export function dryRun(
  rules: AutomationRule[],
  cases: Record<string, unknown>[],
): DryRunResult {
  const enabledRules = rules.filter((r) => r.enabled);
  const matchedCaseSet = new Set<number>();

  const ruleResults: DryRunRuleResult[] = enabledRules.map((rule) => {
    let matchCount = 0;
    const sampleMatches: Record<string, unknown>[] = [];

    cases.forEach((caseData, idx) => {
      if (evaluateRule(rule, caseData)) {
        matchCount++;
        matchedCaseSet.add(idx);
        if (sampleMatches.length < MAX_SAMPLE_MATCHES) {
          sampleMatches.push(caseData);
        }
      }
    });

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matchCount,
      sampleMatches,
    };
  });

  return {
    totalCases: cases.length,
    matchedCases: matchedCaseSet.size,
    ruleResults,
  };
}

// ---------------------------------------------------------------------------
// Built-in rule templates
// ---------------------------------------------------------------------------

function template(
  overrides: Partial<AutomationRule> &
    Pick<AutomationRule, 'name' | 'conditions' | 'actions'>,
): AutomationRule {
  return {
    id: '',
    orgId: '',
    description: '',
    conditionLogic: 'AND',
    priority: 100,
    enabled: true,
    ...overrides,
  };
}

export const RULE_TEMPLATES: AutomationRule[] = [
  template({
    name: 'Auto-escalate KEV findings',
    description:
      'Automatically set severity to CRITICAL for any finding listed in CISA KEV.',
    conditions: [{ field: 'kevListed', operator: 'eq', value: true }],
    actions: [{ type: 'set_severity', params: { severity: 'CRITICAL' } }],
    priority: 200,
  }),

  template({
    name: 'Auto-triage high EPSS',
    description:
      'Trigger AI triage for findings with EPSS score >= 0.9 (top 10% exploitation probability).',
    conditions: [{ field: 'epssScore', operator: 'gte', value: 0.9 }],
    actions: [{ type: 'trigger_triage', params: {} }],
    priority: 190,
  }),

  template({
    name: 'Assign HIPAA findings to compliance',
    description:
      'Route findings tagged "hipaa" to the compliance officer for review.',
    conditions: [{ field: 'tags', operator: 'contains', value: 'hipaa' }],
    actions: [{ type: 'assign_user', params: { role: 'COMPLIANCE_OFFICER' } }],
    priority: 150,
  }),

  template({
    name: 'Notify on critical severity',
    description:
      'Send a notification when a case is classified as CRITICAL severity.',
    conditions: [{ field: 'severity', operator: 'eq', value: 'CRITICAL' }],
    actions: [
      {
        type: 'send_notification',
        params: { template: 'critical_finding', channel: 'email' },
      },
    ],
    priority: 180,
  }),

  template({
    name: 'Auto-close informational findings',
    description:
      'Set INFO-severity findings to NOT_APPLICABLE status automatically.',
    conditions: [{ field: 'severity', operator: 'eq', value: 'INFO' }],
    actions: [{ type: 'set_status', params: { status: 'NOT_APPLICABLE' } }],
    priority: 50,
  }),

  template({
    name: 'Tag high-risk combination',
    description:
      'Tag cases that are both KEV-listed and have CVSS >= 9.0 as "urgent-remediation".',
    conditions: [
      { field: 'kevListed', operator: 'eq', value: true },
      { field: 'cvssScore', operator: 'gte', value: 9.0 },
    ],
    conditionLogic: 'AND',
    actions: [{ type: 'add_tag', params: { tag: 'urgent-remediation' } }],
    priority: 210,
  }),
];
