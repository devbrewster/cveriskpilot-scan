// ---------------------------------------------------------------------------
// ABAC Policy Engine — Core Evaluation Engine
// ---------------------------------------------------------------------------

import { createLogger } from '@cveriskpilot/shared';
import type {
  Action,
  CombiningAlgorithm,
  Condition,
  DataClassification,
  Decision,
  EvaluationContext,
  EvaluationResult,
  Policy,
  PolicyEvaluationDetail,
  PolicyRule,
  Resource,
  RuleEvaluationDetail,
  Subject,
} from './types';

const logger = createLogger('abac:engine');

/** Ordered classification levels for comparison. */
const CLASSIFICATION_ORDER: Record<DataClassification, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

// ---------------------------------------------------------------------------
// Condition evaluators
// ---------------------------------------------------------------------------

interface ConditionResult {
  passed: boolean;
  reason: string;
}

function evaluateTenantBoundary(
  subject: Subject,
  _action: Action,
  resource: Resource,
): ConditionResult {
  const passed = subject.orgId === resource.orgId;
  return {
    passed,
    reason: passed
      ? 'Tenant boundary satisfied'
      : `Tenant mismatch: subject org ${subject.orgId} !== resource org ${resource.orgId}`,
  };
}

function evaluateDataClassification(
  subject: Subject,
  _action: Action,
  resource: Resource,
): ConditionResult {
  const allowed = subject.allowedClassifications.some(
    (c) => CLASSIFICATION_ORDER[c] >= CLASSIFICATION_ORDER[resource.classification],
  );
  return {
    passed: allowed,
    reason: allowed
      ? `Subject may access ${resource.classification} data`
      : `Subject lacks clearance for ${resource.classification} data (allowed: ${subject.allowedClassifications.join(', ')})`,
  };
}

function evaluateMsspClientBoundary(
  subject: Subject,
  _action: Action,
  resource: Resource,
): ConditionResult {
  if (!resource.clientId) {
    return { passed: true, reason: 'Resource has no clientId; MSSP boundary not applicable' };
  }
  if (!subject.assignedClientIds || subject.assignedClientIds.length === 0) {
    return { passed: false, reason: 'Subject has no assigned clients' };
  }
  const passed = subject.assignedClientIds.includes(resource.clientId);
  return {
    passed,
    reason: passed
      ? `Subject is assigned to client ${resource.clientId}`
      : `Subject is not assigned to client ${resource.clientId}`,
  };
}

function evaluateTimeBased(
  _subject: Subject,
  _action: Action,
  _resource: Resource,
  condition: Condition,
  context: EvaluationContext,
): ConditionResult {
  const start = condition.allowedHoursStart ?? 0;
  const end = condition.allowedHoursEnd ?? 24;
  const tz = condition.timezone ?? 'UTC';

  const now = context.timestamp ? new Date(context.timestamp) : new Date();
  let currentHour: number;
  try {
    const formatted = now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
    currentHour = parseInt(formatted, 10);
  } catch {
    // Fallback to UTC if timezone is invalid
    currentHour = now.getUTCHours();
  }

  const passed = currentHour >= start && currentHour < end;
  return {
    passed,
    reason: passed
      ? `Current hour ${currentHour} is within allowed range [${start}, ${end})`
      : `Current hour ${currentHour} is outside allowed range [${start}, ${end})`,
  };
}

function evaluateIpRestriction(
  subject: Subject,
  _action: Action,
  _resource: Resource,
  condition: Condition,
): ConditionResult {
  if (!subject.ipAddress) {
    return { passed: false, reason: 'No IP address on subject' };
  }
  const allowedIPs = condition.allowedIPs ?? [];
  if (allowedIPs.length === 0) {
    return { passed: true, reason: 'No IP restrictions configured' };
  }

  // Simple exact-match and CIDR prefix check
  const passed = allowedIPs.some((allowed) => {
    if (allowed.includes('/')) {
      return ipMatchesCIDR(subject.ipAddress!, allowed);
    }
    return subject.ipAddress === allowed;
  });

  return {
    passed,
    reason: passed
      ? `IP ${subject.ipAddress} is in the allowed list`
      : `IP ${subject.ipAddress} is not in the allowed list`,
  };
}

/** Basic CIDR matching for IPv4. */
function ipMatchesCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  if (!range || !bits) return false;
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1) >>> 0;
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  if (ipNum === null || rangeNum === null) return false;
  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) | octet;
  }
  return num >>> 0;
}

function evaluateCondition(
  condition: Condition,
  subject: Subject,
  action: Action,
  resource: Resource,
  context: EvaluationContext,
): ConditionResult {
  switch (condition.type) {
    case 'tenant-boundary':
      return evaluateTenantBoundary(subject, action, resource);
    case 'data-classification':
      return evaluateDataClassification(subject, action, resource);
    case 'mssp-client-boundary':
      return evaluateMsspClientBoundary(subject, action, resource);
    case 'time-based':
      return evaluateTimeBased(subject, action, resource, condition, context);
    case 'ip-restriction':
      return evaluateIpRestriction(subject, action, resource, condition);
    case 'custom': {
      const contextVal = context.attributes?.[condition.customKey ?? ''];
      const passed = contextVal === condition.customValue;
      return {
        passed,
        reason: passed
          ? `Custom condition ${condition.customKey} matched`
          : `Custom condition ${condition.customKey} did not match (expected ${String(condition.customValue)}, got ${String(contextVal)})`,
      };
    }
    default:
      return { passed: false, reason: `Unknown condition type: ${condition.type}` };
  }
}

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------

function ruleAppliesToAction(rule: PolicyRule, action: Action): boolean {
  return rule.actions.length === 0 || rule.actions.includes(action);
}

function ruleAppliesToResourceType(rule: PolicyRule, resourceType: string): boolean {
  return rule.resourceTypes.length === 0 || rule.resourceTypes.includes(resourceType);
}

function evaluateRule(
  rule: PolicyRule,
  ruleIndex: number,
  subject: Subject,
  action: Action,
  resource: Resource,
  context: EvaluationContext,
): RuleEvaluationDetail | null {
  if (!ruleAppliesToAction(rule, action)) return null;
  if (!ruleAppliesToResourceType(rule, resource.type)) return null;

  const conditionResults = rule.conditions.map((cond) => {
    const result = evaluateCondition(cond, subject, action, resource, context);
    return { type: cond.type, passed: result.passed, reason: result.reason };
  });

  const allPassed = conditionResults.every((c) => c.passed);
  return {
    ruleIndex,
    decision: allPassed ? rule.decision : (rule.decision === 'allow' ? 'deny' : 'allow'),
    conditionResults,
  };
}

// ---------------------------------------------------------------------------
// Policy combining algorithms
// ---------------------------------------------------------------------------

function combineRuleResults(
  details: RuleEvaluationDetail[],
  algorithm: CombiningAlgorithm,
): Decision {
  if (details.length === 0) return 'deny';

  switch (algorithm) {
    case 'deny-overrides':
      return details.some((d) => d.decision === 'deny') ? 'deny' : 'allow';
    case 'permit-overrides':
      return details.some((d) => d.decision === 'allow') ? 'allow' : 'deny';
    case 'first-applicable':
      return details[0]?.decision ?? 'deny';
    default:
      return 'deny';
  }
}

function combinePolicyResults(
  details: PolicyEvaluationDetail[],
  algorithm: CombiningAlgorithm,
): { decision: Decision; reason: string } {
  if (details.length === 0) {
    return { decision: 'deny', reason: 'No applicable policies found' };
  }

  let decision: Decision;
  switch (algorithm) {
    case 'deny-overrides': {
      const denied = details.find((d) => d.decision === 'deny');
      decision = denied ? 'deny' : 'allow';
      return {
        decision,
        reason: denied
          ? `Denied by policy "${denied.policyName}"`
          : 'All applicable policies permitted access',
      };
    }
    case 'permit-overrides': {
      const allowed = details.find((d) => d.decision === 'allow');
      decision = allowed ? 'allow' : 'deny';
      return {
        decision,
        reason: allowed
          ? `Permitted by policy "${allowed.policyName}"`
          : 'No policy permitted access',
      };
    }
    case 'first-applicable': {
      const first = details[0]!;
      return {
        decision: first.decision,
        reason: `First applicable policy "${first.policyName}" decided: ${first.decision}`,
      };
    }
    default:
      return { decision: 'deny', reason: 'Unknown combining algorithm' };
  }
}

// ---------------------------------------------------------------------------
// ABACEngine
// ---------------------------------------------------------------------------

export class ABACEngine {
  private policies: Map<string, Policy> = new Map();
  private combiningAlgorithm: CombiningAlgorithm;

  constructor(combiningAlgorithm: CombiningAlgorithm = 'deny-overrides') {
    this.combiningAlgorithm = combiningAlgorithm;
  }

  /** Register a policy with the engine. */
  addPolicy(policy: Policy): void {
    if (this.policies.has(policy.id)) {
      logger.warn(`Replacing existing policy: ${policy.id}`);
    }
    this.policies.set(policy.id, policy);
    logger.debug(`Policy registered: ${policy.id} (${policy.name})`);
  }

  /** Remove a policy by ID. */
  removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /** Retrieve all registered policies. */
  getPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /** Set the top-level combining algorithm. */
  setCombiningAlgorithm(algorithm: CombiningAlgorithm): void {
    this.combiningAlgorithm = algorithm;
  }

  /**
   * Evaluate access request against all enabled policies.
   * Returns a detailed result with final decision and per-policy breakdown.
   */
  evaluate(
    subject: Subject,
    action: Action,
    resource: Resource,
    context: EvaluationContext = {},
  ): EvaluationResult {
    const evaluatedAt = new Date().toISOString();
    if (!context.timestamp) {
      context.timestamp = evaluatedAt;
    }

    const sortedPolicies = Array.from(this.policies.values())
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (sortedPolicies.length === 0) {
      logger.warn('No enabled policies registered; defaulting to deny');
      return {
        decision: 'deny',
        reason: 'No enabled policies registered',
        details: [],
        evaluatedAt,
      };
    }

    const policyDetails: PolicyEvaluationDetail[] = [];

    for (const policy of sortedPolicies) {
      const ruleDetails: RuleEvaluationDetail[] = [];

      for (let i = 0; i < policy.rules.length; i++) {
        const result = evaluateRule(policy.rules[i]!, i, subject, action, resource, context);
        if (result) {
          ruleDetails.push(result);
        }
      }

      if (ruleDetails.length > 0) {
        const policyDecision = combineRuleResults(ruleDetails, policy.combiningAlgorithm);
        policyDetails.push({
          policyId: policy.id,
          policyName: policy.name,
          decision: policyDecision,
          ruleDetails,
        });
      }
    }

    const { decision, reason } = combinePolicyResults(policyDetails, this.combiningAlgorithm);

    logger.debug(
      `ABAC evaluation: subject=${subject.userId} action=${action} resource=${resource.type}:${resource.id} => ${decision}`,
    );

    return { decision, reason, details: policyDetails, evaluatedAt };
  }
}
