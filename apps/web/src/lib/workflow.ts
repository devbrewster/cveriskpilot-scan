/**
 * Case status transition validation for CVERiskPilot workflow engine.
 *
 * Supports optional approval gates: certain transitions can require
 * a second user to approve before the transition takes effect.
 */

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['TRIAGE', 'ACCEPTED_RISK', 'FALSE_POSITIVE', 'NOT_APPLICABLE'],
  TRIAGE: ['IN_REMEDIATION', 'ACCEPTED_RISK', 'FALSE_POSITIVE', 'NOT_APPLICABLE'],
  IN_REMEDIATION: ['FIXED_PENDING_VERIFICATION', 'REOPENED'],
  FIXED_PENDING_VERIFICATION: ['VERIFIED_CLOSED', 'REOPENED'],
  VERIFIED_CLOSED: ['REOPENED'],
  REOPENED: ['IN_REMEDIATION', 'ACCEPTED_RISK', 'FALSE_POSITIVE'],
  ACCEPTED_RISK: ['REOPENED'],
  FALSE_POSITIVE: ['REOPENED'],
  NOT_APPLICABLE: ['REOPENED'],
};

/**
 * Transitions that require approval when the case has `requiresApproval: true`.
 * These are high-impact transitions where a second pair of eyes prevents errors.
 */
const APPROVAL_REQUIRED_TRANSITIONS = new Set([
  'TRIAGE->IN_REMEDIATION',
  'IN_REMEDIATION->FIXED_PENDING_VERIFICATION',
  'FIXED_PENDING_VERIFICATION->VERIFIED_CLOSED',
  'NEW->ACCEPTED_RISK',
  'TRIAGE->ACCEPTED_RISK',
  'NEW->FALSE_POSITIVE',
  'TRIAGE->FALSE_POSITIVE',
]);

/**
 * Check whether a status transition is allowed.
 */
export function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Check whether a transition requires approval.
 * Only applies when the case has `requiresApproval: true`.
 */
export function transitionRequiresApproval(
  from: string,
  to: string,
  caseRequiresApproval: boolean,
): boolean {
  if (!caseRequiresApproval) return false;
  return APPROVAL_REQUIRED_TRANSITIONS.has(`${from}->${to}`);
}

/**
 * Validate a transition, returning an error message or null if valid.
 * When approval is required, returns an error unless an approved approvalId is provided.
 */
export function validateTransition(
  from: string,
  to: string,
  opts?: {
    requiresApproval?: boolean;
    approvalStatus?: string | null;
  },
): { valid: boolean; error?: string; needsApproval?: boolean } {
  if (!isValidTransition(from, to)) {
    return { valid: false, error: `Invalid transition: ${from} → ${to}` };
  }

  if (opts?.requiresApproval && transitionRequiresApproval(from, to, true)) {
    if (opts.approvalStatus !== 'APPROVED') {
      return {
        valid: false,
        needsApproval: true,
        error: `Transition ${from} → ${to} requires approval. Current approval status: ${opts.approvalStatus ?? 'none'}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Return the list of statuses reachable from the current status.
 */
export function getValidNextStatuses(current: string): string[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * Return the list of transitions that require approval for a given status.
 */
export function getApprovalRequiredTransitions(from: string): string[] {
  const nextStatuses = getValidNextStatuses(from);
  return nextStatuses.filter((to) =>
    APPROVAL_REQUIRED_TRANSITIONS.has(`${from}->${to}`),
  );
}
