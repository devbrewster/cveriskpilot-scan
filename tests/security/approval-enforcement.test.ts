/**
 * Approval enforcement tests — verify that the workflow transition
 * validation correctly blocks status changes when approval is required.
 */

import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  isValidTransition,
  transitionRequiresApproval,
  getValidNextStatuses,
  getApprovalRequiredTransitions,
} from '../../apps/web/src/lib/workflow';

// ---------------------------------------------------------------------------
// Test: Basic transition validation
// ---------------------------------------------------------------------------

describe('Workflow: Valid status transitions', () => {
  const validTransitions = [
    ['NEW', 'TRIAGE'],
    ['TRIAGE', 'IN_REMEDIATION'],
    ['IN_REMEDIATION', 'FIXED_PENDING_VERIFICATION'],
    ['FIXED_PENDING_VERIFICATION', 'VERIFIED_CLOSED'],
    ['VERIFIED_CLOSED', 'REOPENED'],
    ['REOPENED', 'IN_REMEDIATION'],
  ];

  for (const [from, to] of validTransitions) {
    it(`allows ${from} → ${to}`, () => {
      expect(isValidTransition(from, to)).toBe(true);
    });
  }

  const invalidTransitions = [
    ['NEW', 'VERIFIED_CLOSED'],
    ['NEW', 'IN_REMEDIATION'],
    ['TRIAGE', 'VERIFIED_CLOSED'],
    ['VERIFIED_CLOSED', 'NEW'],
    ['IN_REMEDIATION', 'TRIAGE'],
  ];

  for (const [from, to] of invalidTransitions) {
    it(`blocks ${from} → ${to}`, () => {
      expect(isValidTransition(from, to)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// Test: Approval-required transitions
// ---------------------------------------------------------------------------

describe('Workflow: Approval enforcement', () => {
  it('TRIAGE → IN_REMEDIATION requires approval when case has requiresApproval', () => {
    expect(transitionRequiresApproval('TRIAGE', 'IN_REMEDIATION', true)).toBe(true);
  });

  it('TRIAGE → IN_REMEDIATION does NOT require approval when case lacks flag', () => {
    expect(transitionRequiresApproval('TRIAGE', 'IN_REMEDIATION', false)).toBe(false);
  });

  it('IN_REMEDIATION → FIXED_PENDING_VERIFICATION requires approval', () => {
    expect(transitionRequiresApproval('IN_REMEDIATION', 'FIXED_PENDING_VERIFICATION', true)).toBe(true);
  });

  it('FIXED_PENDING_VERIFICATION → VERIFIED_CLOSED requires approval', () => {
    expect(transitionRequiresApproval('FIXED_PENDING_VERIFICATION', 'VERIFIED_CLOSED', true)).toBe(true);
  });

  it('NEW → ACCEPTED_RISK requires approval (risk acceptance is high-impact)', () => {
    expect(transitionRequiresApproval('NEW', 'ACCEPTED_RISK', true)).toBe(true);
  });

  it('NEW → FALSE_POSITIVE requires approval', () => {
    expect(transitionRequiresApproval('NEW', 'FALSE_POSITIVE', true)).toBe(true);
  });

  it('VERIFIED_CLOSED → REOPENED does NOT require approval', () => {
    expect(transitionRequiresApproval('VERIFIED_CLOSED', 'REOPENED', true)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test: validateTransition blocks unapproved transitions
// ---------------------------------------------------------------------------

describe('Workflow: validateTransition with approval gates', () => {
  it('blocks transition when approval required but not approved', () => {
    const result = validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: true,
      approvalStatus: null,
    });

    expect(result.valid).toBe(false);
    expect(result.needsApproval).toBe(true);
    expect(result.error).toContain('requires approval');
  });

  it('blocks transition when approval is PENDING', () => {
    const result = validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: true,
      approvalStatus: 'PENDING',
    });

    expect(result.valid).toBe(false);
    expect(result.needsApproval).toBe(true);
  });

  it('blocks transition when approval is REJECTED', () => {
    const result = validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: true,
      approvalStatus: 'REJECTED',
    });

    expect(result.valid).toBe(false);
    expect(result.needsApproval).toBe(true);
  });

  it('allows transition when approval is APPROVED', () => {
    const result = validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: true,
      approvalStatus: 'APPROVED',
    });

    expect(result.valid).toBe(true);
    expect(result.needsApproval).toBeUndefined();
  });

  it('allows transition when requiresApproval is false', () => {
    const result = validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: false,
      approvalStatus: null,
    });

    expect(result.valid).toBe(true);
  });

  it('allows transition when no opts provided', () => {
    const result = validateTransition('TRIAGE', 'IN_REMEDIATION');

    expect(result.valid).toBe(true);
  });

  it('invalid transition returns valid:false without needsApproval', () => {
    const result = validateTransition('NEW', 'VERIFIED_CLOSED', {
      requiresApproval: true,
      approvalStatus: 'APPROVED',
    });

    expect(result.valid).toBe(false);
    expect(result.needsApproval).toBeUndefined();
    expect(result.error).toContain('Invalid transition');
  });
});

// ---------------------------------------------------------------------------
// Test: getApprovalRequiredTransitions
// ---------------------------------------------------------------------------

describe('Workflow: Approval-required transition enumeration', () => {
  it('TRIAGE has approval-required transitions', () => {
    const transitions = getApprovalRequiredTransitions('TRIAGE');
    expect(transitions).toContain('IN_REMEDIATION');
    expect(transitions).toContain('ACCEPTED_RISK');
    expect(transitions).toContain('FALSE_POSITIVE');
  });

  it('VERIFIED_CLOSED has NO approval-required transitions', () => {
    const transitions = getApprovalRequiredTransitions('VERIFIED_CLOSED');
    expect(transitions.length).toBe(0);
  });

  it('unknown status returns empty array', () => {
    const transitions = getApprovalRequiredTransitions('NONEXISTENT');
    expect(transitions.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test: Full case lifecycle with approval gates
// ---------------------------------------------------------------------------

describe('Workflow: Full case lifecycle simulation', () => {
  it('standard remediation flow works without approval', () => {
    const opts = { requiresApproval: false, approvalStatus: null };
    expect(validateTransition('NEW', 'TRIAGE', opts).valid).toBe(true);
    expect(validateTransition('TRIAGE', 'IN_REMEDIATION', opts).valid).toBe(true);
    expect(validateTransition('IN_REMEDIATION', 'FIXED_PENDING_VERIFICATION', opts).valid).toBe(true);
    expect(validateTransition('FIXED_PENDING_VERIFICATION', 'VERIFIED_CLOSED', opts).valid).toBe(true);
  });

  it('approval-required flow blocks at each gate until approved', () => {
    // Step 1: NEW → TRIAGE (no approval needed for this transition)
    expect(validateTransition('NEW', 'TRIAGE', {
      requiresApproval: true,
      approvalStatus: null,
    }).valid).toBe(true);

    // Step 2: TRIAGE → IN_REMEDIATION (needs approval)
    expect(validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: true,
      approvalStatus: null,
    }).valid).toBe(false);

    // After approval granted
    expect(validateTransition('TRIAGE', 'IN_REMEDIATION', {
      requiresApproval: true,
      approvalStatus: 'APPROVED',
    }).valid).toBe(true);
  });

  it('false positive flow with approval', () => {
    // NEW → FALSE_POSITIVE requires approval
    const blocked = validateTransition('NEW', 'FALSE_POSITIVE', {
      requiresApproval: true,
      approvalStatus: null,
    });
    expect(blocked.valid).toBe(false);
    expect(blocked.needsApproval).toBe(true);

    // After approval
    const allowed = validateTransition('NEW', 'FALSE_POSITIVE', {
      requiresApproval: true,
      approvalStatus: 'APPROVED',
    });
    expect(allowed.valid).toBe(true);
  });
});
