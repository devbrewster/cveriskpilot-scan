/**
 * Self-Assessment Engine
 *
 * Generates compliance self-assessment reports for any supported framework.
 * Includes CMMC Level 2 SPRS scoring, gap analysis, and prioritized recommendations.
 */

import type { ComplianceAssessmentInput, ComplianceEvidence, ComplianceFramework } from '@cveriskpilot/compliance';

import type {
  SelfAssessmentConfig,
  SelfAssessmentReport,
  DomainScore,
  GapItem,
  Recommendation,
  ReadinessLevel,
  ControlSummary,
  FrameworkRegistryEntry,
  RecommendationCategory,
} from './types';

// Re-export types
export type {
  SelfAssessmentConfig,
  SelfAssessmentReport,
  DomainScore,
  GapItem,
  Recommendation,
  ReadinessLevel,
  ControlSummary,
  FrameworkRegistryEntry,
};

// ---------------------------------------------------------------------------
// Framework Registry — maps framework IDs to their assess functions
// ---------------------------------------------------------------------------

import {
  CMMC_FRAMEWORK, assessCMMC, CMMC_SPRS_WEIGHTS, calculateSPRSScore,
  SOC2_FRAMEWORK, assessSOC2,
  FEDRAMP_FRAMEWORK, assessFedRAMP,
  SSDF_FRAMEWORK, assessSSDF,
  ASVS_FRAMEWORK, assessASVS,
  NIST_800_53_FRAMEWORK, assessNIST80053,
  GDPR_FRAMEWORK, assessGDPR,
  HIPAA_FRAMEWORK, assessHIPAA,
  PCI_DSS_FRAMEWORK, assessPCIDSS,
  ISO27001_FRAMEWORK, assessISO27001,
} from '@cveriskpilot/compliance';

interface RegistryItem {
  framework: ComplianceFramework;
  assess: (input: ComplianceAssessmentInput) => ComplianceEvidence[];
}

const FRAMEWORK_REGISTRY: Record<string, RegistryItem> = {
  'cmmc-level2': { framework: CMMC_FRAMEWORK, assess: assessCMMC },
  'soc2-type2': { framework: SOC2_FRAMEWORK, assess: assessSOC2 },
  'fedramp-moderate': { framework: FEDRAMP_FRAMEWORK, assess: assessFedRAMP },
  'nist-ssdf': { framework: SSDF_FRAMEWORK, assess: assessSSDF },
  'owasp-asvs': { framework: ASVS_FRAMEWORK, assess: assessASVS },
  'nist-800-53': { framework: NIST_800_53_FRAMEWORK, assess: assessNIST80053 },
  'gdpr': { framework: GDPR_FRAMEWORK, assess: assessGDPR },
  'hipaa': { framework: HIPAA_FRAMEWORK, assess: assessHIPAA },
  'pci-dss': { framework: PCI_DSS_FRAMEWORK, assess: assessPCIDSS },
  'iso-27001': { framework: ISO27001_FRAMEWORK, assess: assessISO27001 },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a self-assessment against a compliance framework.
 *
 * Returns a full report with domain scores, gap analysis, recommendations,
 * and (for CMMC) SPRS scoring.
 */
export function runSelfAssessment(
  config: SelfAssessmentConfig,
  input: ComplianceAssessmentInput,
): SelfAssessmentReport {
  const registry = FRAMEWORK_REGISTRY[config.frameworkId];
  if (!registry) {
    const supported = Object.keys(FRAMEWORK_REGISTRY).join(', ');
    throw new Error(`Unknown framework: ${config.frameworkId}. Supported: ${supported}`);
  }

  const { framework, assess } = registry;
  const evidences = assess(input);

  // Build assessment summary
  const metCount = evidences.filter((e) => e.status === 'met').length;
  const partialCount = evidences.filter((e) => e.status === 'partial').length;
  const notMetCount = evidences.filter((e) => e.status === 'not_met').length;
  const naCount = evidences.filter((e) => e.status === 'na').length;
  const totalControls = evidences.length;
  const assessableControls = totalControls - naCount;
  const overallScore = assessableControls > 0
    ? Math.round(((metCount + partialCount * 0.5) / assessableControls) * 100)
    : 100;

  const assessment = {
    frameworkId: framework.id,
    frameworkName: framework.name,
    assessedAt: config.assessmentDate,
    totalControls,
    metCount,
    partialCount,
    notMetCount,
    naCount,
    overallScore,
    evidences,
  };

  const controlSummary: ControlSummary = {
    total: totalControls,
    met: metCount,
    partial: partialCount,
    notMet: notMetCount,
    notApplicable: naCount,
    percentMet: totalControls > 0 ? Math.round((metCount / totalControls) * 100) : 0,
    percentCompliant: totalControls > 0 ? Math.round(((metCount + naCount) / totalControls) * 100) : 0,
  };

  // Domain scores
  const domainScores = computeDomainScores(framework, evidences);

  // Gap analysis
  const gaps = generateGapAnalysis(framework, evidences, config.frameworkId);

  // Recommendations
  const recommendations = generateRecommendations(gaps);

  // SPRS score (CMMC only)
  const sprsScore = config.frameworkId === 'cmmc-level2'
    ? computeSPRSScore(evidences)
    : null;

  // Readiness level
  const readinessLevel = determineReadiness(overallScore, notMetCount, config.frameworkId);

  return {
    config,
    framework,
    assessment,
    domainScores,
    gaps,
    recommendations,
    sprsScore,
    readinessLevel,
    controlSummary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Run self-assessment for ALL supported frameworks at once.
 * Returns a map of framework ID to report.
 */
export function runFullComplianceAudit(
  organizationName: string,
  assessorName: string,
  scopeDescription: string,
  input: ComplianceAssessmentInput,
): Record<string, SelfAssessmentReport> {
  const results: Record<string, SelfAssessmentReport> = {};
  const assessmentDate = new Date().toISOString();

  for (const frameworkId of Object.keys(FRAMEWORK_REGISTRY)) {
    results[frameworkId] = runSelfAssessment(
      { frameworkId, organizationName, assessorName, assessmentDate, scopeDescription },
      input,
    );
  }

  return results;
}

/**
 * List all supported frameworks with metadata.
 */
export function listFrameworks(): FrameworkRegistryEntry[] {
  return Object.entries(FRAMEWORK_REGISTRY).map(([id, { framework }]) => ({
    id,
    name: framework.name,
    version: framework.version,
    controlCount: framework.controls.length,
    hasAssessment: true,
    hasSPRS: id === 'cmmc-level2',
  }));
}

/**
 * Compute the DoD SPRS score for a CMMC Level 2 assessment.
 *
 * SPRS starts at 110 (all met) and deducts based on the official
 * DoD Assessment Methodology weight table:
 * - 'met' = 0 deduction
 * - 'partial' = half the control weight (rounded up)
 * - 'not_met' = full control weight
 * - 'na' = 0 deduction
 *
 * Range: -203 (all not met) to 110 (all met)
 */
export function computeSPRSScore(evidences: ComplianceEvidence[]): number {
  // Use the exported calculateSPRSScore if available, otherwise compute locally
  if (typeof calculateSPRSScore === 'function') {
    return calculateSPRSScore(evidences);
  }

  let score = 110;
  for (const ev of evidences) {
    // Extract the practice number from the control ID (e.g., 'AC.L2-3.1.1' → '3.1.1')
    const practiceMatch = ev.controlId.match(/(\d+\.\d+\.\d+)/);
    if (!practiceMatch) continue;
    const practiceNum = practiceMatch[1];
    const weight = CMMC_SPRS_WEIGHTS[practiceNum] ?? 1;

    if (ev.status === 'not_met') {
      score -= weight;
    } else if (ev.status === 'partial') {
      score -= Math.ceil(weight / 2);
    }
  }

  return score;
}

/**
 * Export self-assessment report as JSON string.
 */
export function exportSelfAssessmentJson(report: SelfAssessmentReport): string {
  return JSON.stringify({
    ...report,
    // Don't include the full framework definition in export to reduce size
    framework: {
      id: report.framework.id,
      name: report.framework.name,
      version: report.framework.version,
      controlCount: report.framework.controls.length,
    },
  }, null, 2);
}

/**
 * Export self-assessment report as CSV string.
 */
export function exportSelfAssessmentCsv(report: SelfAssessmentReport): string {
  const lines: string[] = [
    '# Self-Assessment Report',
    `# Framework: ${report.framework.name} ${report.framework.version}`,
    `# Organization: ${report.config.organizationName}`,
    `# Assessor: ${report.config.assessorName}`,
    `# Date: ${report.config.assessmentDate}`,
    `# Overall Score: ${report.assessment.overallScore}%`,
    `# Readiness: ${report.readinessLevel}`,
    report.sprsScore !== null ? `# SPRS Score: ${report.sprsScore}` : '',
    '',
    'Control ID,Control Title,Domain,Status,SPRS Weight,Evidence,Priority,Remediation',
  ].filter(Boolean);

  for (const ev of report.assessment.evidences) {
    const control = report.framework.controls.find((c) => c.id === ev.controlId);
    const gap = report.gaps.find((g) => g.controlId === ev.controlId);
    const csvEvidence = `"${ev.evidence.replace(/"/g, '""')}"`;
    const csvRemediation = gap ? `"${gap.remediationGuidance.replace(/"/g, '""')}"` : '';

    lines.push([
      ev.controlId,
      `"${control?.title ?? ''}"`,
      `"${control?.category ?? ''}"`,
      ev.status,
      gap?.sprsWeight ?? '',
      csvEvidence,
      gap?.priority ?? '',
      csvRemediation,
    ].join(','));
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function computeDomainScores(
  framework: ComplianceFramework,
  evidences: ComplianceEvidence[],
): DomainScore[] {
  const domainMap = new Map<string, { label: string; evidences: ComplianceEvidence[] }>();

  for (const control of framework.controls) {
    const domain = control.category;
    if (!domainMap.has(domain)) {
      domainMap.set(domain, { label: domain, evidences: [] });
    }
  }

  for (const ev of evidences) {
    const control = framework.controls.find((c) => c.id === ev.controlId);
    if (control) {
      const entry = domainMap.get(control.category);
      if (entry) entry.evidences.push(ev);
    }
  }

  const scores: DomainScore[] = [];
  for (const [domain, data] of domainMap) {
    const met = data.evidences.filter((e) => e.status === 'met').length;
    const partial = data.evidences.filter((e) => e.status === 'partial').length;
    const notMet = data.evidences.filter((e) => e.status === 'not_met').length;
    const na = data.evidences.filter((e) => e.status === 'na').length;
    const total = data.evidences.length;
    const assessable = total - na;
    const score = assessable > 0
      ? Math.round(((met + partial * 0.5) / assessable) * 100)
      : 100;

    let status: 'met' | 'partial' | 'not_met' | 'na';
    if (notMet === 0 && partial === 0) status = 'met';
    else if (notMet === 0) status = 'partial';
    else status = 'not_met';

    scores.push({
      domain: extractDomainCode(domain),
      domainLabel: data.label,
      totalControls: total,
      metCount: met,
      partialCount: partial,
      notMetCount: notMet,
      naCount: na,
      score,
      status,
    });
  }

  return scores.sort((a, b) => a.score - b.score); // worst first
}

function generateGapAnalysis(
  framework: ComplianceFramework,
  evidences: ComplianceEvidence[],
  frameworkId: string,
): GapItem[] {
  const gaps: GapItem[] = [];

  for (const ev of evidences) {
    if (ev.status === 'met' || ev.status === 'na') continue;

    const control = framework.controls.find((c) => c.id === ev.controlId);
    if (!control) continue;

    // Determine SPRS weight for CMMC
    let sprsWeight: number | undefined;
    if (frameworkId === 'cmmc-level2') {
      const practiceMatch = ev.controlId.match(/(\d+\.\d+\.\d+)/);
      if (practiceMatch) {
        sprsWeight = CMMC_SPRS_WEIGHTS[practiceMatch[1]] ?? 1;
      }
    }

    // Priority based on SPRS weight or status
    let priority: 'critical' | 'high' | 'medium' | 'low';
    if (sprsWeight && sprsWeight >= 5 && ev.status === 'not_met') {
      priority = 'critical';
    } else if (sprsWeight && sprsWeight >= 3 && ev.status === 'not_met') {
      priority = 'high';
    } else if (ev.status === 'not_met') {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    gaps.push({
      controlId: ev.controlId,
      controlTitle: control.title,
      domain: control.category,
      currentStatus: ev.status,
      evidence: ev.evidence,
      priority,
      sprsWeight,
      remediationGuidance: generateRemediationGuidance(control, ev),
    });
  }

  // Sort: critical first, then high, medium, low
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function generateRemediationGuidance(
  control: { id: string; title: string; description: string; evidenceRequirements: string[] },
  evidence: ComplianceEvidence,
): string {
  if (evidence.status === 'partial') {
    return `Strengthen existing implementation of "${control.title}". Evidence requirements: ${control.evidenceRequirements.join('; ')}.`;
  }
  return `Implement "${control.title}": ${control.description}. Required evidence: ${control.evidenceRequirements.join('; ')}.`;
}

function generateRecommendations(gaps: GapItem[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const domainGaps = new Map<string, GapItem[]>();

  for (const gap of gaps) {
    const domain = gap.domain;
    if (!domainGaps.has(domain)) domainGaps.set(domain, []);
    domainGaps.get(domain)!.push(gap);
  }

  let id = 1;
  for (const [domain, domGaps] of domainGaps) {
    const criticalCount = domGaps.filter((g) => g.priority === 'critical').length;
    const highCount = domGaps.filter((g) => g.priority === 'high').length;
    const notMetCount = domGaps.filter((g) => g.currentStatus === 'not_met').length;

    const priority: 'critical' | 'high' | 'medium' | 'low' =
      criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : notMetCount > 0 ? 'medium' : 'low';

    const category = classifyDomainCategory(domain);

    const effort: 'low' | 'medium' | 'high' =
      notMetCount > 3 ? 'high' : notMetCount > 1 ? 'medium' : 'low';

    recommendations.push({
      id: `REC-${String(id++).padStart(3, '0')}`,
      priority,
      title: `Address ${domGaps.length} gap${domGaps.length > 1 ? 's' : ''} in ${domain}`,
      description: notMetCount > 0
        ? `${notMetCount} control(s) not met, ${domGaps.length - notMetCount} partially met in the ${domain} domain. Focus on critical/high-priority gaps first.`
        : `${domGaps.length} control(s) partially met in the ${domain} domain. Strengthen existing implementations.`,
      affectedControls: domGaps.map((g) => g.controlId),
      estimatedEffort: effort,
      category,
    });
  }

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function determineReadiness(
  overallScore: number,
  notMetCount: number,
  _frameworkId: string,
): ReadinessLevel {
  if (overallScore >= 95 && notMetCount === 0) return 'READY';
  if (overallScore >= 75) return 'SUBSTANTIALLY_READY';
  if (overallScore >= 40) return 'PARTIAL';
  return 'NOT_READY';
}

function extractDomainCode(category: string): string {
  // Extract domain code like "AC" from "Access Control (AC)" or return first word
  const match = category.match(/\(([A-Z]{1,3})\)/);
  return match ? match[1] : category.split(/\s/)[0];
}

function classifyDomainCategory(domain: string): RecommendationCategory {
  const lower = domain.toLowerCase();
  if (lower.includes('training') || lower.includes('awareness')) return 'training';
  if (lower.includes('personnel') || lower.includes('physical')) return 'organizational';
  if (lower.includes('policy') || lower.includes('planning') || lower.includes('documentation')) return 'documentation';
  if (lower.includes('incident') || lower.includes('maintenance') || lower.includes('contingency')) return 'process';
  return 'technical';
}
