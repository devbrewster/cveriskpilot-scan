import type { SanitizedFinding } from './types.js';

interface PromptPair {
  system: string;
  user: string;
}

/**
 * Batch remediation prompt — up to 5 findings per call.
 * Returns JSON: { "remediations": [{ "index": N, "text": "..." }] }
 */
export function buildRemediationPrompt(findings: SanitizedFinding[]): PromptPair {
  return {
    system: `You are a security remediation analyst. For each vulnerability, provide a specific, actionable remediation in 1-3 sentences. Respond ONLY with valid JSON matching this schema: { "remediations": [{ "index": <number>, "text": "<remediation>" }] }. Do not include markdown fences or explanations outside the JSON.`,
    user: `Provide remediations for these vulnerabilities:\n${JSON.stringify(findings.map(f => ({
      index: f.index,
      title: f.title,
      severity: f.severity,
      cweIds: f.cweIds,
      cveIds: f.cveIds,
      scanner: f.scannerType,
      package: f.packageName ? `${f.packageName}@${f.packageVersion ?? 'unknown'}` : undefined,
      file: f.filePath ? f.filePath.split('/').pop() : undefined,
    })), null, 0)}`,
  };
}

/**
 * Compliance explanation prompt — per finding.
 * Returns JSON: { "explanation": "..." }
 */
export function buildComplianceExplanationPrompt(
  finding: SanitizedFinding,
  controls: string[],
): PromptPair {
  return {
    system: `You are a compliance analyst. Explain why a specific vulnerability affects the given compliance controls. Be concise (2-4 sentences). Respond ONLY with valid JSON: { "explanation": "<text>" }. No markdown fences.`,
    user: `Vulnerability: ${finding.title} (${finding.severity}, ${finding.cweIds.join(', ') || 'no CWE'})\nAffected controls: ${controls.join(', ')}\n\nExplain the compliance impact.`,
  };
}

/**
 * Executive risk summary prompt — one per scan.
 * Returns JSON: { "summary": "..." }
 */
export function buildRiskSummaryPrompt(
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    topCwes: string[];
    frameworksAffected: number;
    controlsAffected: number;
    actionable: number;
  },
): PromptPair {
  return {
    system: `You are a CISO writing a risk assessment. Provide a 3-5 sentence executive summary of the security posture based on scan results. Mention the most critical risks and compliance implications. Respond ONLY with valid JSON: { "summary": "<text>" }. No markdown fences.`,
    user: `Scan results:\n- Total findings: ${stats.total} (${stats.actionable} actionable)\n- Critical: ${stats.critical}, High: ${stats.high}, Medium: ${stats.medium}, Low: ${stats.low}\n- Top CWEs: ${stats.topCwes.join(', ') || 'none'}\n- Frameworks affected: ${stats.frameworksAffected}\n- Compliance controls affected: ${stats.controlsAffected}\n\nProvide an executive risk summary.`,
  };
}

/**
 * Priority ordering prompt — one per scan.
 * Returns JSON: { "priority": [{ "index": N, "reason": "..." }] }
 */
export function buildPriorityOrderPrompt(findings: SanitizedFinding[]): PromptPair {
  return {
    system: `You are a security triage analyst. Order the given vulnerabilities by remediation priority (most urgent first). Consider: severity, exploitability (CWE type), compliance impact, and blast radius. Respond ONLY with valid JSON: { "priority": [{ "index": <number>, "reason": "<brief justification>" }] }. No markdown fences.`,
    user: `Order these findings by remediation priority:\n${JSON.stringify(findings.map(f => ({
      index: f.index,
      title: f.title,
      severity: f.severity,
      cweIds: f.cweIds,
      cveIds: f.cveIds,
      scanner: f.scannerType,
      package: f.packageName ?? undefined,
      file: f.filePath ? f.filePath.split('/').pop() : undefined,
    })), null, 0)}`,
  };
}
