// -----------------------------------------------------------------------------
// Jira <-> CaseStatus mapping
// -----------------------------------------------------------------------------

/**
 * Default mapping: Jira status name -> CaseStatus value.
 * Organizations can override this via their settings JSON.
 */
export const DEFAULT_JIRA_TO_CASE_STATUS: Record<string, string> = {
  'To Do': 'NEW',
  'In Progress': 'IN_REMEDIATION',
  'Done': 'FIXED_PENDING_VERIFICATION',
  "Won't Do": 'ACCEPTED_RISK',
};

/**
 * Reverse default mapping: CaseStatus -> Jira status name used as the
 * target transition name when pushing status changes to Jira.
 */
export const DEFAULT_CASE_TO_JIRA_STATUS: Record<string, string> = {
  NEW: 'To Do',
  TRIAGE: 'To Do',
  IN_REMEDIATION: 'In Progress',
  FIXED_PENDING_VERIFICATION: 'Done',
  VERIFIED_CLOSED: 'Done',
  REOPENED: 'In Progress',
  ACCEPTED_RISK: "Won't Do",
  FALSE_POSITIVE: "Won't Do",
  NOT_APPLICABLE: "Won't Do",
  DUPLICATE: "Won't Do",
};

/**
 * Map a Jira status name to a CaseStatus string.
 * Falls through to the default mapping when no org-level override matches.
 */
export function mapJiraStatusToCaseStatus(
  jiraStatus: string,
  customMapping?: Record<string, string> | null,
): string | null {
  if (customMapping && customMapping[jiraStatus]) {
    return customMapping[jiraStatus];
  }
  return DEFAULT_JIRA_TO_CASE_STATUS[jiraStatus] ?? null;
}

/**
 * Map a CaseStatus to the Jira transition/status name we should target.
 * Returns null if there is no mapping.
 */
export function mapCaseStatusToJiraTransition(
  caseStatus: string,
  customMapping?: Record<string, string> | null,
): string | null {
  // If org provides a reverse mapping (caseStatus -> jiraStatus), use it.
  if (customMapping) {
    // Build a reverse of the custom jira->case mapping
    const reverse: Record<string, string> = {};
    for (const [jiraName, caseVal] of Object.entries(customMapping)) {
      // First match wins (reverse)
      if (!reverse[caseVal]) {
        reverse[caseVal] = jiraName;
      }
    }
    if (reverse[caseStatus]) {
      return reverse[caseStatus];
    }
  }
  return DEFAULT_CASE_TO_JIRA_STATUS[caseStatus] ?? null;
}
