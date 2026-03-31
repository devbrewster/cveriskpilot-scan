// ---------------------------------------------------------------------------
// GET    /api/automation/rules/[id] — get a single automation rule
// PUT    /api/automation/rules/[id] — update an automation rule
// DELETE /api/automation/rules/[id] — delete an automation rule
// ---------------------------------------------------------------------------

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { getOrgTier, checkBillingGate } from '@/lib/billing';
import { logAudit } from '@/lib/audit';
import {
  getRulesForOrg,
  setRulesForOrg,
  type RuleCondition,
  type RuleAction,
} from '../route';

// ---------------------------------------------------------------------------
// Validation helpers (shared with parent route)
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
// Route context type
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/automation/rules/[id]
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const permError = requirePerm(session.role, 'org:read');
    if (permError) return permError;

    const { id } = await context.params;
    const rules = getRulesForOrg(session.organizationId);
    const rule = rules.find((r) => r.id === id);

    if (!rule) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('[API] GET /api/automation/rules/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation rule' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/automation/rules/[id]
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const rules = getRulesForOrg(session.organizationId);
    const ruleIndex = rules.findIndex((r) => r.id === id);

    if (ruleIndex === -1) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 });
    }

    // --- Parse and validate body ---
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, description, conditions, conditionLogic, actions, priority, enabled } = body;
    const existing = rules[ruleIndex];

    // Validate name (if provided)
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'name must be a non-empty string' },
          { status: 400 },
        );
      }
      if (name.trim().length > 200) {
        return NextResponse.json(
          { error: 'name must be 200 characters or fewer' },
          { status: 400 },
        );
      }
    }

    // Validate conditions (if provided)
    if (conditions !== undefined) {
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
    }

    // Validate conditionLogic (if provided)
    if (conditionLogic !== undefined && conditionLogic !== 'AND' && conditionLogic !== 'OR') {
      return NextResponse.json(
        { error: 'conditionLogic must be "AND" or "OR"' },
        { status: 400 },
      );
    }

    // Validate actions (if provided)
    if (actions !== undefined) {
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
    }

    // Validate priority (if provided)
    if (priority !== undefined) {
      if (typeof priority !== 'number' || !Number.isFinite(priority) || priority < 0 || priority > 1000) {
        return NextResponse.json(
          { error: 'priority must be a number between 0 and 1000' },
          { status: 400 },
        );
      }
    }

    // Validate enabled (if provided)
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 },
      );
    }

    // --- Apply updates ---
    const updated = {
      ...existing,
      name: name !== undefined ? (name as string).trim() : existing.name,
      description: description !== undefined ? (typeof description === 'string' ? description.trim() : undefined) : existing.description,
      conditions: conditions !== undefined ? (conditions as RuleCondition[]) : existing.conditions,
      conditionLogic: conditionLogic !== undefined ? (conditionLogic as 'AND' | 'OR') : existing.conditionLogic,
      actions: actions !== undefined ? (actions as RuleAction[]) : existing.actions,
      priority: priority !== undefined ? (priority as number) : existing.priority,
      enabled: enabled !== undefined ? (enabled as boolean) : existing.enabled,
      updatedAt: new Date().toISOString(),
    };

    rules[ruleIndex] = updated;
    setRulesForOrg(session.organizationId, rules);

    // --- Audit log ---
    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'UPDATE',
      entityType: 'AutomationRule',
      entityId: id,
      details: { name: updated.name, fieldsUpdated: Object.keys(body) },
    });

    return NextResponse.json({ rule: updated });
  } catch (error) {
    console.error('[API] PUT /api/automation/rules/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update automation rule' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/automation/rules/[id]
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'org:update');
    if (permError) return permError;

    const { id } = await context.params;
    const rules = getRulesForOrg(session.organizationId);
    const ruleIndex = rules.findIndex((r) => r.id === id);

    if (ruleIndex === -1) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 });
    }

    const deleted = rules[ruleIndex];
    rules.splice(ruleIndex, 1);
    setRulesForOrg(session.organizationId, rules);

    // --- Audit log ---
    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'DELETE',
      entityType: 'AutomationRule',
      entityId: id,
      details: { name: deleted.name },
    });

    return NextResponse.json({ message: 'Automation rule deleted', id });
  } catch (error) {
    console.error('[API] DELETE /api/automation/rules/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete automation rule' },
      { status: 500 },
    );
  }
}
