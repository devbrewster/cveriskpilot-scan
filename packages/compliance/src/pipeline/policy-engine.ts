/**
 * Pipeline Policy Engine
 *
 * Evaluates scan findings against an organization's pipeline policy to produce
 * a pass / fail / warn verdict.  Used by the CI/CD pipeline scan endpoint to
 * decide whether a pull request should be blocked.
 */

import type { CanonicalFinding } from '@cveriskpilot/parsers';
import type { ComplianceImpactReport } from '../mapping/cross-framework';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type PolicyVerdict = 'pass' | 'fail' | 'warn';

export interface AutoExceptionRule {
  /** Human-readable label for this rule */
  name: string;
  /** Glob pattern matched against finding filePath (e.g., "test/**", "*.spec.ts") */
  filePattern?: string;
  /** Severities to skip (e.g., exclude INFO findings from policy evaluation) */
  severities?: Severity[];
  /** CWE IDs to always allow (e.g., ["CWE-200"] for info disclosure in tests) */
  cweIds?: string[];
}

export interface PipelinePolicy {
  orgId: string;
  /** Which frameworks to enforce in the pipeline */
  frameworks: string[];
  /** Block PR if any findings at or above this severity */
  blockOnSeverity: Severity;
  /** Block if any mapped compliance controls are violated */
  blockOnControlViolation: boolean;
  /** Warn mode — never block, only warn */
  warnOnly: boolean;
  /** Rules to automatically exclude certain findings from evaluation */
  autoExceptionRules: AutoExceptionRule[];
  /** Days after first detection before enforcement begins */
  gracePeriodDays: number;
}

export interface PolicyEvaluationResult {
  verdict: PolicyVerdict;
  reasons: string[];
  blockedFindings: CanonicalFinding[];
}

// ---------------------------------------------------------------------------
// Severity ordering (higher index = more severe)
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// ---------------------------------------------------------------------------
// Default policy
// ---------------------------------------------------------------------------

export function getDefaultPolicy(orgId: string): PipelinePolicy {
  return {
    orgId,
    frameworks: ['nist-800-53'],
    blockOnSeverity: 'CRITICAL',
    blockOnControlViolation: false,
    warnOnly: false,
    autoExceptionRules: [],
    gracePeriodDays: 0,
  };
}

// ---------------------------------------------------------------------------
// Exception matching
// ---------------------------------------------------------------------------

function matchGlob(pattern: string, value: string): boolean {
  // Simple glob: supports * and ** wildcards
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/\*\*/g, '{{DOUBLESTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\{\{DOUBLESTAR\}\}/g, '.*')
        .replace(/\?/g, '.') +
      '$',
  );
  return regex.test(value);
}

function isExcepted(
  finding: CanonicalFinding,
  rules: AutoExceptionRule[],
): boolean {
  for (const rule of rules) {
    // Match by file pattern
    if (rule.filePattern && finding.filePath) {
      if (matchGlob(rule.filePattern, finding.filePath)) return true;
    }

    // Match by severity
    if (rule.severities && rule.severities.includes(finding.severity)) {
      return true;
    }

    // Match by CWE
    if (rule.cweIds && rule.cweIds.length > 0) {
      const findingCwes = finding.cweIds.map((c) =>
        c.startsWith('CWE-') ? c : `CWE-${c}`,
      );
      if (rule.cweIds.some((cwe) => findingCwes.includes(cwe))) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Grace period check
// ---------------------------------------------------------------------------

function isWithinGracePeriod(
  finding: CanonicalFinding,
  gracePeriodDays: number,
): boolean {
  if (gracePeriodDays <= 0) return false;

  const detectedAt = finding.discoveredAt instanceof Date
    ? finding.discoveredAt
    : new Date(finding.discoveredAt);

  const graceEnd = new Date(
    detectedAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000,
  );

  return new Date() < graceEnd;
}

// ---------------------------------------------------------------------------
// Main evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate findings against a pipeline policy and produce a verdict.
 */
export function evaluatePolicy(
  findings: CanonicalFinding[],
  policy: PipelinePolicy,
  complianceImpact: ComplianceImpactReport,
): PolicyEvaluationResult {
  const reasons: string[] = [];
  const blockedFindings: CanonicalFinding[] = [];

  const blockThreshold = SEVERITY_ORDER[policy.blockOnSeverity];

  // Evaluate each finding
  for (const finding of findings) {
    // Skip auto-excepted findings
    if (isExcepted(finding, policy.autoExceptionRules)) continue;

    // Skip findings within grace period
    if (isWithinGracePeriod(finding, policy.gracePeriodDays)) continue;

    const findingSeverity = SEVERITY_ORDER[finding.severity] ?? 0;

    if (findingSeverity >= blockThreshold) {
      blockedFindings.push(finding);
    }
  }

  // Check severity-based blocking
  if (blockedFindings.length > 0) {
    const severityCounts: Record<string, number> = {};
    for (const f of blockedFindings) {
      severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1;
    }

    const breakdown = Object.entries(severityCounts)
      .sort(
        ([a], [b]) =>
          (SEVERITY_ORDER[b as Severity] ?? 0) -
          (SEVERITY_ORDER[a as Severity] ?? 0),
      )
      .map(([sev, count]) => `${count} ${sev}`)
      .join(', ');

    reasons.push(
      `${blockedFindings.length} finding(s) at or above ${policy.blockOnSeverity} severity: ${breakdown}`,
    );
  }

  // Check compliance control violations
  if (
    policy.blockOnControlViolation &&
    complianceImpact.totalAffectedControls > 0
  ) {
    const frameworkNames = complianceImpact.frameworkSummary
      .filter(
        (fw) =>
          policy.frameworks.length === 0 ||
          policy.frameworks.includes(fw.frameworkId),
      )
      .map(
        (fw) =>
          `${fw.frameworkName} (${fw.affectedControlCount} control${fw.affectedControlCount === 1 ? '' : 's'})`,
      );

    if (frameworkNames.length > 0) {
      reasons.push(
        `Compliance control violations detected: ${frameworkNames.join(', ')}`,
      );
    }
  }

  // Determine final verdict
  let verdict: PolicyVerdict = 'pass';

  if (reasons.length > 0) {
    verdict = policy.warnOnly ? 'warn' : 'fail';
  } else if (findings.length > 0) {
    // Findings exist but none breach the policy threshold
    const hasWarnableFindings = findings.some(
      (f) =>
        !isExcepted(f, policy.autoExceptionRules) &&
        !isWithinGracePeriod(f, policy.gracePeriodDays),
    );
    if (hasWarnableFindings) {
      verdict = 'warn';
      reasons.push(
        `${findings.length} finding(s) detected below ${policy.blockOnSeverity} threshold`,
      );
    }
  }

  return { verdict, reasons, blockedFindings };
}
