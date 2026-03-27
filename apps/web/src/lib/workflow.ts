/**
 * Case status transition validation for CVERiskPilot workflow engine.
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
 * Check whether a status transition is allowed.
 */
export function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Return the list of statuses reachable from the current status.
 */
export function getValidNextStatuses(current: string): string[] {
  return VALID_TRANSITIONS[current] ?? [];
}
