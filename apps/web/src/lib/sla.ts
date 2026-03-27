import type { Severity } from '@cveriskpilot/domain';

/**
 * Compute the SLA due date for a case based on its severity and the active SLA policy.
 */
export function computeDueDate(
  severity: Severity,
  policy: {
    criticalDays: number;
    highDays: number;
    mediumDays: number;
    lowDays: number;
    kevCriticalDays: number;
  },
  options?: { kevListed?: boolean; fromDate?: Date },
): Date | null {
  const from = options?.fromDate ?? new Date();

  const daysMap: Record<string, number | null> = {
    CRITICAL: policy.criticalDays,
    HIGH: policy.highDays,
    MEDIUM: policy.mediumDays,
    LOW: policy.lowDays,
    INFO: null,
  };

  let days = daysMap[severity];
  if (days === null || days === undefined) return null;

  // KEV-listed critical vulnerabilities use the tighter deadline
  if (options?.kevListed && severity === 'CRITICAL' && policy.kevCriticalDays < days) {
    days = policy.kevCriticalDays;
  }

  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return due;
}

/**
 * Default SLA policy values.
 */
export const DEFAULT_SLA_POLICY = {
  name: 'Default Policy',
  description: 'Standard SLA policy with industry-recommended timeframes',
  criticalDays: 7,
  highDays: 30,
  mediumDays: 90,
  lowDays: 180,
  kevCriticalDays: 3,
  isDefault: true,
} as const;
