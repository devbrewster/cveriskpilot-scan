import type { AiClientConfig, AiEnrichmentResult, SanitizedFinding } from './types.js';
import { createAiClient } from './client.js';
import {
  buildRemediationPrompt,
  buildComplianceExplanationPrompt,
  buildRiskSummaryPrompt,
  buildPriorityOrderPrompt,
} from './prompts.js';

// Import the CanonicalFinding type for input
import type { CanonicalFinding } from '../vendor/parsers/types.js';

/**
 * Sanitize a finding for LLM consumption.
 * Strips sensitive fields, truncates snippets, uses basename for paths.
 */
function sanitizeFinding(f: CanonicalFinding, index: number): SanitizedFinding {
  return {
    index,
    title: f.title,
    severity: f.severity,
    cveIds: f.cveIds ?? [],
    cweIds: f.cweIds ?? [],
    scannerType: f.scannerType ?? 'unknown',
    packageName: f.packageName,
    packageVersion: f.packageVersion,
    filePath: f.filePath ? f.filePath.split('/').pop() : undefined,
    lineNumber: f.lineNumber,
    snippet: f.snippet ? f.snippet.slice(0, 200) : undefined,
    verdict: f.verdict,
  };
}

/**
 * Try to parse JSON from LLM response.
 * Falls back to regex extraction if direct parse fails.
 */
function parseJsonResponse<T>(raw: string): T | null {
  const trimmed = raw.trim();

  // Try direct parse
  try {
    return JSON.parse(trimmed) as T;
  } catch { /* fall through */ }

  // Try extracting JSON from markdown fences or surrounding text
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch { /* fall through */ }
  }

  return null;
}

/**
 * Chunk an array into batches of the given size.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export interface ComplianceImpactData {
  totalAffectedControls: number;
  frameworkSummary: Array<{
    framework: string;
    affectedControls: number;
    controlIds: string[];
  }>;
}

/**
 * Run AI enrichment on scan findings.
 * Non-fatal: returns partial results on timeout or errors.
 */
export async function enrichWithAi(
  findings: CanonicalFinding[],
  complianceImpact: ComplianceImpactData | null,
  config: AiClientConfig,
  verbose: boolean,
): Promise<AiEnrichmentResult> {
  const startTime = Date.now();
  const result: AiEnrichmentResult = {
    remediations: new Map(),
    complianceExplanations: new Map(),
    riskSummary: '',
    priorityOrder: [],
    errors: [],
    durationMs: 0,
  };

  const log = verbose ? (msg: string) => process.stderr.write(`  [ai] ${msg}\n`) : () => {};

  // Only process true positives
  const actionable = findings
    .map((f, i) => ({ finding: f, index: i }))
    .filter(({ finding }) => finding.verdict === 'TRUE_POSITIVE');

  if (actionable.length === 0) {
    log('No actionable findings — skipping AI enrichment');
    result.durationMs = Date.now() - startTime;
    return result;
  }

  let client;
  try {
    client = createAiClient(config);
    log(`Connected to ${config.provider} (${config.model}) at ${config.baseUrl}`);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    result.durationMs = Date.now() - startTime;
    return result;
  }

  const timeRemaining = () => config.maxTotalMs - (Date.now() - startTime);
  const isTimedOut = () => timeRemaining() <= 0;

  // Sanitize findings
  const sanitized = actionable.map(({ finding, index }) => sanitizeFinding(finding, index));

  // Phase 1: Batch remediations (5 per prompt) — run batches concurrently (up to 3)
  if (!isTimedOut()) {
    log(`Generating remediations for ${sanitized.length} findings...`);
    const batches = chunk(sanitized, 5);
    const AI_CONCURRENCY = 3;

    for (let i = 0; i < batches.length; i += AI_CONCURRENCY) {
      if (isTimedOut()) {
        result.errors.push('Time budget exceeded during remediation phase');
        break;
      }

      const concurrentBatches = batches.slice(i, i + AI_CONCURRENCY);
      const promises = concurrentBatches.map(async (batch) => {
        if (isTimedOut()) return;
        try {
          const prompt = buildRemediationPrompt(batch);
          const raw = await client.complete(prompt.system, prompt.user);
          const parsed = parseJsonResponse<{ remediations: Array<{ index: number; text: string }> }>(raw);

          if (parsed?.remediations) {
            for (const r of parsed.remediations) {
              if (typeof r.index === 'number' && typeof r.text === 'string') {
                result.remediations.set(r.index, r.text);
              }
            }
          } else {
            result.errors.push('Failed to parse remediation response');
          }
        } catch (err) {
          result.errors.push(`Remediation error: ${err instanceof Error ? err.message : String(err)}`);
        }
      });

      await Promise.all(promises);
    }
    log(`Got ${result.remediations.size} remediations`);
  }

  // Phase 2+3: Risk summary and priority ordering — run concurrently (independent calls)
  const phase2Promises: Promise<void>[] = [];

  if (!isTimedOut()) {
    // Risk summary
    phase2Promises.push((async () => {
      log('Generating executive risk summary...');
      try {
        const severityCounts: Record<string, number> = {};
        const cweCounts: Record<string, number> = {};
        for (const f of findings) {
          severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1;
          for (const cwe of (f.cweIds ?? [])) {
            cweCounts[cwe] = (cweCounts[cwe] ?? 0) + 1;
          }
        }

        const topCwes = Object.entries(cweCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cwe]) => cwe);

        const prompt = buildRiskSummaryPrompt({
          total: findings.length,
          critical: severityCounts['CRITICAL'] ?? 0,
          high: severityCounts['HIGH'] ?? 0,
          medium: severityCounts['MEDIUM'] ?? 0,
          low: severityCounts['LOW'] ?? 0,
          topCwes,
          frameworksAffected: complianceImpact?.frameworkSummary.length ?? 0,
          controlsAffected: complianceImpact?.totalAffectedControls ?? 0,
          actionable: actionable.length,
        });

        const raw = await client.complete(prompt.system, prompt.user);
        const parsed = parseJsonResponse<{ summary: string }>(raw);
        if (parsed?.summary) {
          result.riskSummary = parsed.summary;
          log('Risk summary generated');
        } else {
          result.errors.push('Failed to parse risk summary response');
        }
      } catch (err) {
        result.errors.push(`Risk summary error: ${err instanceof Error ? err.message : String(err)}`);
      }
    })());

    // Priority ordering (only if >1 actionable finding)
    if (sanitized.length > 1) {
      phase2Promises.push((async () => {
        log('Generating priority ordering...');
        try {
          const prompt = buildPriorityOrderPrompt(sanitized);
          const raw = await client.complete(prompt.system, prompt.user);
          const parsed = parseJsonResponse<{ priority: Array<{ index: number; reason: string }> }>(raw);
          if (parsed?.priority) {
            result.priorityOrder = parsed.priority.map(p => p.index);
            log(`Priority order: ${result.priorityOrder.length} findings ranked`);
          }
        } catch (err) {
          result.errors.push(`Priority error: ${err instanceof Error ? err.message : String(err)}`);
        }
      })());
    }
  }

  await Promise.all(phase2Promises);

  result.durationMs = Date.now() - startTime;
  log(`AI enrichment complete in ${result.durationMs}ms`);
  return result;
}
