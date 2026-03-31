// ---------------------------------------------------------------------------
// POST /api/automation/rules/test — dry-run rules against current cases
// ---------------------------------------------------------------------------

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { getOrgTier, checkBillingGate } from '@/lib/billing';
import { prisma } from '@/lib/prisma';
import {
  getRulesForOrg,
  type AutomationRule,
  type RuleCondition,
} from '../route';

// ---------------------------------------------------------------------------
// Condition evaluation engine
// ---------------------------------------------------------------------------

function evaluateCondition(
  condition: RuleCondition,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  caseData: Record<string, any>,
): boolean {
  const fieldValue = caseData[condition.field];
  const target = condition.value;

  switch (condition.operator) {
    case 'eq':
      return fieldValue === target;
    case 'neq':
      return fieldValue !== target;
    case 'gt':
      return typeof fieldValue === 'number' && typeof target === 'number' && fieldValue > target;
    case 'gte':
      return typeof fieldValue === 'number' && typeof target === 'number' && fieldValue >= target;
    case 'lt':
      return typeof fieldValue === 'number' && typeof target === 'number' && fieldValue < target;
    case 'lte':
      return typeof fieldValue === 'number' && typeof target === 'number' && fieldValue <= target;
    case 'contains':
      if (typeof fieldValue === 'string' && typeof target === 'string') {
        return fieldValue.toLowerCase().includes(target.toLowerCase());
      }
      if (Array.isArray(fieldValue) && typeof target === 'string') {
        return fieldValue.includes(target);
      }
      return false;
    case 'in':
      return Array.isArray(target) && target.includes(fieldValue);
    case 'not_in':
      return Array.isArray(target) && !target.includes(fieldValue);
    default:
      return false;
  }
}

function evaluateRule(
  rule: AutomationRule,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  caseData: Record<string, any>,
): boolean {
  if (rule.conditionLogic === 'AND') {
    return rule.conditions.every((c) => evaluateCondition(c, caseData));
  }
  // OR
  return rule.conditions.some((c) => evaluateCondition(c, caseData));
}

// ---------------------------------------------------------------------------
// POST handler
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

    // --- Parse body ---
    let body: { ruleIds?: string[] };
    try {
      body = (await request.json()) as { ruleIds?: string[] };
    } catch {
      body = {};
    }

    // --- Resolve rules to test ---
    const allRules = getRulesForOrg(session.organizationId);
    let rulesToTest: AutomationRule[];

    if (body.ruleIds && Array.isArray(body.ruleIds) && body.ruleIds.length > 0) {
      rulesToTest = allRules.filter((r) => body.ruleIds!.includes(r.id));
      if (rulesToTest.length === 0) {
        return NextResponse.json(
          { error: 'No matching rules found for the provided ruleIds' },
          { status: 404 },
        );
      }
    } else {
      rulesToTest = allRules.filter((r) => r.enabled);
      if (rulesToTest.length === 0) {
        return NextResponse.json(
          {
            totalCases: 0,
            matchedCases: 0,
            ruleResults: [],
            message: 'No enabled automation rules to test',
          },
        );
      }
    }

    // Sort rules by priority (lower number = higher priority)
    rulesToTest.sort((a, b) => a.priority - b.priority);

    // --- Fetch recent cases ---
    const cases = await prisma.vulnerabilityCase.findMany({
      where: {
        organizationId: session.organizationId,
      },
      select: {
        id: true,
        title: true,
        severity: true,
        cvssScore: true,
        epssScore: true,
        kevListed: true,
        status: true,
        cveIds: true,
        cweIds: true,
        assignedToId: true,
        triageVerdict: true,
        triageConfidence: true,
        findingCount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // --- Evaluate rules against cases (dry-run) ---
    const ruleResults = rulesToTest.map((rule) => {
      const matchedCaseIds: string[] = [];
      const matchedCaseTitles: string[] = [];

      for (const c of cases) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (evaluateRule(rule, c as unknown as Record<string, any>)) {
          matchedCaseIds.push(c.id);
          matchedCaseTitles.push(c.title);
        }
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        enabled: rule.enabled,
        priority: rule.priority,
        conditionLogic: rule.conditionLogic,
        conditionCount: rule.conditions.length,
        actionCount: rule.actions.length,
        actions: rule.actions.map((a) => a.type),
        matchedCount: matchedCaseIds.length,
        matchedCaseIds,
        matchedCaseTitles: matchedCaseTitles.slice(0, 10), // limit preview
      };
    });

    const totalMatched = new Set(ruleResults.flatMap((r) => r.matchedCaseIds)).size;

    return NextResponse.json({
      totalCases: cases.length,
      matchedCases: totalMatched,
      rulesEvaluated: rulesToTest.length,
      ruleResults,
    });
  } catch (error) {
    console.error('[API] POST /api/automation/rules/test error:', error);
    return NextResponse.json(
      { error: 'Failed to run automation rules dry-run' },
      { status: 500 },
    );
  }
}
