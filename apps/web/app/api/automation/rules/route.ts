// ---------------------------------------------------------------------------
// GET  /api/automation/rules — list automation rules for the org
// POST /api/automation/rules — create a new automation rule
// ---------------------------------------------------------------------------

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { getOrgTier, checkBillingGate } from '@/lib/billing';
import { logAudit } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'not_in';
  value: unknown;
}

export interface RuleAction {
  type: 'assign' | 'set_status' | 'set_severity' | 'add_tag' | 'notify' | 'create_ticket' | 'auto_triage';
  params: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ---------------------------------------------------------------------------
// In-memory rule store (per org)
// In production, this would use a dedicated Prisma model or Organization
// metadata JSON field. Using in-memory store consistent with other settings
// routes while the automation feature is being built out.
// ---------------------------------------------------------------------------

const ruleStore: Record<string, AutomationRule[]> = {};

export function getRulesForOrg(orgId: string): AutomationRule[] {
  return ruleStore[orgId] ?? [];
}

export function setRulesForOrg(orgId: string, rules: AutomationRule[]): void {
  ruleStore[orgId] = rules;
}

// ---------------------------------------------------------------------------
// Tier-based rule limits
// ---------------------------------------------------------------------------

const RULE_LIMITS: Record<string, number> = {
  FREE: 0,
  FOUNDERS_BETA: 3,
  PRO: 5,
  ENTERPRISE: 100,
  MSSP: 100,
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_CONDITION_FIELDS = [
  'severity', 'cvssScore', 'epssScore', 'kevListed', 'status',
  'cveIds', 'cweIds', 'title', 'assignedToId', 'triageVerdict',
  'triageConfidence', 'findingCount',
];

const VALID_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'not_in'];

const VALID_ACTION_TYPES = [
  'assign', 'set_status', 'set_severity', 'add_tag', 'notify',
  'create_ticket', 'auto_triage',
];

function validateCondition(c: unknown, index: number): string | null {
  if (!c || typeof c !== 'object') return `conditions[${index}]: must be an object`;
  const cond = c as Record<string, unknown>;
  if (typeof cond.field !== 'string' || !VALID_CONDITION_FIELDS.includes(cond.field)) {
    return `conditions[${index}].field: must be one of ${VALID_CONDITION_FIELDS.join(', ')}`;
  }
  if (typeof cond.operator !== 'string' || !VALID_OPERATORS.includes(cond.operator)) {
    return `conditions[${index}].operator: must be one of ${VALID_OPERATORS.join(', ')}`;
  }
  if (cond.value === undefined || cond.value === null) {
    return `conditions[${index}].value: required`;
  }
  return null;
}

function validateAction(a: unknown, index: number): string | null {
  if (!a || typeof a !== 'object') return `actions[${index}]: must be an object`;
  const act = a as Record<string, unknown>;
  if (typeof act.type !== 'string' || !VALID_ACTION_TYPES.includes(act.type)) {
    return `actions[${index}].type: must be one of ${VALID_ACTION_TYPES.join(', ')}`;
  }
  if (!act.params || typeof act.params !== 'object' || Array.isArray(act.params)) {
    return `actions[${index}].params: must be an object`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/automation/rules
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const permError = requirePerm(session.role, 'org:read');
    if (permError) return permError;

    const rules = getRulesForOrg(session.organizationId);

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('[API] GET /api/automation/rules error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/automation/rules
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'org:update');
    if (permError) return permError;

    // --- Billing gate ---
    const tier = await getOrgTier(session.organizationId);
    const gate = await checkBillingGate(session.organizationId, tier, 'automation_rules');
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: gate.reason ?? 'Automation rules require a paid plan',
          code: 'BILLING_LIMIT_EXCEEDED',
          upgradeRequired: gate.upgradeRequired,
          upgradeUrl: '/settings/billing',
        },
        { status: 402 },
      );
    }

    // --- Check rule limit per tier ---
    const existingRules = getRulesForOrg(session.organizationId);
    const limit = RULE_LIMITS[tier] ?? 0;
    if (limit > 0 && existingRules.length >= limit) {
      return NextResponse.json(
        {
          error: `Rule limit reached (${limit} rules for ${tier} tier). Upgrade for more.`,
          code: 'RULE_LIMIT_EXCEEDED',
          currentCount: existingRules.length,
          limit,
          upgradeUrl: '/settings/billing',
        },
        { status: 402 },
      );
    }

    // --- Parse and validate body ---
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, description, conditions, conditionLogic, actions, priority, enabled } = body;

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 },
      );
    }
    if (name.trim().length > 200) {
      return NextResponse.json(
        { error: 'name must be 200 characters or fewer' },
        { status: 400 },
      );
    }

    // Validate conditions
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return NextResponse.json(
        { error: 'conditions must be a non-empty array' },
        { status: 400 },
      );
    }
    for (let i = 0; i < conditions.length; i++) {
      const err = validateCondition(conditions[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    // Validate conditionLogic
    if (conditionLogic !== 'AND' && conditionLogic !== 'OR') {
      return NextResponse.json(
        { error: 'conditionLogic must be "AND" or "OR"' },
        { status: 400 },
      );
    }

    // Validate actions
    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'actions must be a non-empty array' },
        { status: 400 },
      );
    }
    for (let i = 0; i < actions.length; i++) {
      const err = validateAction(actions[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    // Validate priority
    const parsedPriority = typeof priority === 'number' ? priority : 0;
    if (!Number.isFinite(parsedPriority) || parsedPriority < 0 || parsedPriority > 1000) {
      return NextResponse.json(
        { error: 'priority must be a number between 0 and 1000' },
        { status: 400 },
      );
    }

    // Validate enabled
    const parsedEnabled = typeof enabled === 'boolean' ? enabled : true;

    // --- Create rule ---
    const now = new Date().toISOString();
    const rule: AutomationRule = {
      id: randomUUID(),
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : undefined,
      conditions: conditions as RuleCondition[],
      conditionLogic,
      actions: actions as RuleAction[],
      priority: parsedPriority,
      enabled: parsedEnabled,
      createdAt: now,
      updatedAt: now,
      createdBy: session.userId,
    };

    existingRules.push(rule);
    setRulesForOrg(session.organizationId, existingRules);

    // --- Audit log ---
    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'CREATE',
      entityType: 'AutomationRule',
      entityId: rule.id,
      details: { name: rule.name, conditionLogic, conditionCount: conditions.length, actionCount: actions.length },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/automation/rules error:', error);
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500 },
    );
  }
}
