// ---------------------------------------------------------------------------
// AI Package — Triage Agent (t108)
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import { getClient } from './client';
import type { Severity, AssetContext } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TriageCaseData {
  caseId: string;
  title: string;
  description?: string;
  cveIds: string[];
  cweIds: string[];
  severity: Severity;
  cvssScore: number | null;
  cvssVector: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  kevListed: boolean;
  kevDueDate: string | null;
  assets?: AssetContext[];
  packageName?: string;
  packageVersion?: string;
  existingFindings?: number;
  exploitAvailable?: boolean;
}

export type RecommendedAction =
  | 'PATCH_IMMEDIATELY'
  | 'SCHEDULE_PATCH'
  | 'MITIGATE'
  | 'ACCEPT_RISK'
  | 'INVESTIGATE'
  | 'DEFER';

export interface TriageDecision {
  caseId: string;
  severityOverride: Severity | null;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: RecommendedAction;
  reasoning: string;
  confidenceScore: number;
  requiresHumanReview: boolean;
  autoApproved: boolean;
  model: string;
  triagedAt: Date;
  usage: { inputTokens: number; outputTokens: number };
}

export interface TriageAuditEntry {
  caseId: string;
  decision: TriageDecision;
  timestamp: Date;
  reviewedBy: string | null;
  reviewOutcome: 'APPROVED' | 'REJECTED' | 'MODIFIED' | null;
}

export interface BatchTriageResult {
  decisions: TriageDecision[];
  errors: Array<{ caseId: string; error: string }>;
  totalProcessed: number;
  totalErrors: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIAGE_MODEL = 'claude-sonnet-4-20250514';
const TRIAGE_MAX_TOKENS = 1024;
const AUTO_APPROVE_THRESHOLD = 0.9;
const BATCH_CONCURRENCY = 5;
const BATCH_DELAY_MS = 200;

const TRIAGE_SYSTEM_PROMPT = `You are a vulnerability triage specialist for an enterprise vulnerability management platform.
Analyze the provided CVE case data and return a triage decision as valid JSON with these fields:

{
  "severityOverride": null or "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"|"INFO" (only if scanner severity is inaccurate given context),
  "priority": "CRITICAL"|"HIGH"|"MEDIUM"|"LOW",
  "recommendedAction": "PATCH_IMMEDIATELY"|"SCHEDULE_PATCH"|"MITIGATE"|"ACCEPT_RISK"|"INVESTIGATE"|"DEFER",
  "reasoning": "Brief explanation of the triage decision",
  "confidenceScore": 0.0 to 1.0
}

Factors to consider:
- CVSS score and vector (attack complexity, privileges required, user interaction)
- EPSS score (probability of exploitation in the wild)
- KEV listing (known actively exploited vulnerabilities must be prioritized)
- Asset criticality and internet exposure
- Whether a fix/patch is available
- Exploit availability

Rules:
- KEV-listed vulnerabilities should always be CRITICAL or HIGH priority
- EPSS > 0.5 warrants higher priority regardless of CVSS
- Internet-exposed assets with high-severity vulns should be PATCH_IMMEDIATELY
- Low EPSS + low CVSS + no KEV + internal-only = candidate for DEFER or ACCEPT_RISK
- Always respond with valid JSON only.`;

// ---------------------------------------------------------------------------
// TriageAgent Class
// ---------------------------------------------------------------------------

export class TriageAgent {
  private auditTrail: TriageAuditEntry[] = [];

  /**
   * Build the triage prompt from case data.
   */
  buildTriagePrompt(caseData: TriageCaseData): {
    system: string;
    userMessage: string;
  } {
    const lines: string[] = [];

    lines.push('## CVE Case for Triage');
    lines.push(`**Case ID:** ${caseData.caseId}`);
    lines.push(`**Title:** ${caseData.title}`);

    if (caseData.description) {
      lines.push(`**Description:** ${caseData.description}`);
    }

    if (caseData.cveIds.length > 0) {
      lines.push(`**CVE IDs:** ${caseData.cveIds.join(', ')}`);
    }
    if (caseData.cweIds.length > 0) {
      lines.push(`**CWE IDs:** ${caseData.cweIds.join(', ')}`);
    }

    lines.push(`**Scanner Severity:** ${caseData.severity}`);

    if (caseData.cvssScore !== null) {
      lines.push(`**CVSS Score:** ${caseData.cvssScore}`);
    }
    if (caseData.cvssVector) {
      lines.push(`**CVSS Vector:** ${caseData.cvssVector}`);
    }
    if (caseData.epssScore !== null) {
      lines.push(`**EPSS Score:** ${caseData.epssScore}`);
    }
    if (caseData.epssPercentile !== null) {
      lines.push(`**EPSS Percentile:** ${caseData.epssPercentile}`);
    }

    lines.push(`**KEV Listed:** ${caseData.kevListed ? 'Yes' : 'No'}`);
    if (caseData.kevDueDate) {
      lines.push(`**KEV Due Date:** ${caseData.kevDueDate}`);
    }

    if (caseData.exploitAvailable !== undefined) {
      lines.push(`**Exploit Available:** ${caseData.exploitAvailable ? 'Yes' : 'No'}`);
    }

    if (caseData.packageName) {
      lines.push(
        `**Package:** ${caseData.packageName}${caseData.packageVersion ? `@${caseData.packageVersion}` : ''}`,
      );
    }

    if (caseData.assets && caseData.assets.length > 0) {
      lines.push('');
      lines.push('## Affected Assets');
      for (const asset of caseData.assets) {
        const parts: string[] = [];
        if (asset.name) parts.push(`Name: ${asset.name}`);
        if (asset.type) parts.push(`Type: ${asset.type}`);
        if (asset.environment) parts.push(`Env: ${asset.environment}`);
        if (asset.criticality) parts.push(`Criticality: ${asset.criticality}`);
        if (asset.internetExposed !== undefined) {
          parts.push(`Internet-exposed: ${asset.internetExposed ? 'Yes' : 'No'}`);
        }
        lines.push(`- ${parts.join(' | ')}`);
      }
    }

    if (caseData.existingFindings !== undefined) {
      lines.push(`**Existing Related Findings:** ${caseData.existingFindings}`);
    }

    lines.push('');
    lines.push('Provide your triage decision for this vulnerability case.');

    return {
      system: TRIAGE_SYSTEM_PROMPT,
      userMessage: lines.join('\n'),
    };
  }

  /**
   * Triage a single case using Claude AI.
   */
  async triageCase(caseData: TriageCaseData): Promise<TriageDecision> {
    const client = getClient();
    const { system, userMessage } = this.buildTriagePrompt(caseData);

    const response = await client.messages.create({
      model: TRIAGE_MODEL,
      max_tokens: TRIAGE_MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const content = textBlock && 'text' in textBlock ? textBlock.text : '';

    const parsed = this.parseTriageResponse(content, caseData.caseId);

    const decision: TriageDecision = {
      caseId: caseData.caseId,
      severityOverride: parsed.severityOverride,
      priority: parsed.priority,
      recommendedAction: parsed.recommendedAction,
      reasoning: parsed.reasoning,
      confidenceScore: parsed.confidenceScore,
      requiresHumanReview: parsed.confidenceScore < AUTO_APPROVE_THRESHOLD,
      autoApproved: parsed.confidenceScore >= AUTO_APPROVE_THRESHOLD,
      model: response.model,
      triagedAt: new Date(),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    // Store in audit trail
    this.recordAuditEntry(decision);

    return decision;
  }

  /**
   * Batch-triage multiple cases with rate limiting.
   */
  async batchTriage(cases: TriageCaseData[]): Promise<BatchTriageResult> {
    const decisions: TriageDecision[] = [];
    const errors: Array<{ caseId: string; error: string }> = [];

    // Process in chunks of BATCH_CONCURRENCY
    for (let i = 0; i < cases.length; i += BATCH_CONCURRENCY) {
      const chunk = cases.slice(i, i + BATCH_CONCURRENCY);

      const results = await Promise.allSettled(
        chunk.map((caseData) => this.triageCase(caseData)),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j]!;
        const caseData = chunk[j]!;

        if (result.status === 'fulfilled') {
          decisions.push(result.value);
        } else {
          errors.push({
            caseId: caseData.caseId,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }

      // Rate-limit delay between batches
      if (i + BATCH_CONCURRENCY < cases.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    return {
      decisions,
      errors,
      totalProcessed: decisions.length,
      totalErrors: errors.length,
    };
  }

  /**
   * Get the full audit trail.
   */
  getAuditTrail(): ReadonlyArray<TriageAuditEntry> {
    return this.auditTrail;
  }

  /**
   * Get audit entries for a specific case.
   */
  getAuditForCase(caseId: string): ReadonlyArray<TriageAuditEntry> {
    return this.auditTrail.filter((entry) => entry.caseId === caseId);
  }

  /**
   * Record a human review outcome for a triage decision.
   */
  recordReview(
    caseId: string,
    reviewedBy: string,
    outcome: 'APPROVED' | 'REJECTED' | 'MODIFIED',
  ): void {
    const entry = this.auditTrail.find(
      (e) => e.caseId === caseId && e.reviewOutcome === null,
    );
    if (entry) {
      entry.reviewedBy = reviewedBy;
      entry.reviewOutcome = outcome;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private parseTriageResponse(
    content: string,
    caseId: string,
  ): {
    severityOverride: Severity | null;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    recommendedAction: RecommendedAction;
    reasoning: string;
    confidenceScore: number;
  } {
    try {
      // Extract JSON from potential markdown code fences
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, content];
      const jsonStr = (jsonMatch[1] ?? content).trim();
      const parsed = JSON.parse(jsonStr);

      const validSeverities = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
      const validPriorities = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
      const validActions = new Set([
        'PATCH_IMMEDIATELY',
        'SCHEDULE_PATCH',
        'MITIGATE',
        'ACCEPT_RISK',
        'INVESTIGATE',
        'DEFER',
      ]);

      const severityOverride =
        parsed.severityOverride && validSeverities.has(parsed.severityOverride)
          ? (parsed.severityOverride as Severity)
          : null;

      const priority = validPriorities.has(parsed.priority)
        ? (parsed.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')
        : 'MEDIUM';

      const recommendedAction = validActions.has(parsed.recommendedAction)
        ? (parsed.recommendedAction as RecommendedAction)
        : 'INVESTIGATE';

      const confidenceScore =
        typeof parsed.confidenceScore === 'number'
          ? Math.max(0, Math.min(1, parsed.confidenceScore))
          : 0.5;

      return {
        severityOverride,
        priority,
        recommendedAction,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided',
        confidenceScore,
      };
    } catch {
      // Fallback if parsing fails
      return {
        severityOverride: null,
        priority: 'MEDIUM',
        recommendedAction: 'INVESTIGATE',
        reasoning: `Failed to parse AI response for case ${caseId}. Manual review required.`,
        confidenceScore: 0,
      };
    }
  }

  private recordAuditEntry(decision: TriageDecision): void {
    this.auditTrail.push({
      caseId: decision.caseId,
      decision,
      timestamp: new Date(),
      reviewedBy: decision.autoApproved ? 'SYSTEM_AUTO' : null,
      reviewOutcome: decision.autoApproved ? 'APPROVED' : null,
    });
  }
}
