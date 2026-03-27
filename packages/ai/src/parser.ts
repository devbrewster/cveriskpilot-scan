// ---------------------------------------------------------------------------
// AI Package — Structured Response Parser
// ---------------------------------------------------------------------------

import type { RemediationResult } from './types';

const VALID_EFFORTS = new Set(['low', 'medium', 'high']);
const VALID_PRIORITIES = new Set(['immediate', 'short-term', 'long-term']);

/**
 * Extract JSON from a Claude response that may be wrapped in markdown fences.
 */
function extractJson(raw: string): string {
  // Try to find JSON inside ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  // Try to find a JSON object directly
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return objectMatch[0].trim();
  }

  return raw.trim();
}

/**
 * Validate and coerce a parsed object into a RemediationResult.
 * Throws if required fields are missing.
 */
function validateParsed(obj: Record<string, unknown>, raw: string, model: string): RemediationResult {
  const riskAssessment = typeof obj['riskAssessment'] === 'string' ? obj['riskAssessment'] : undefined;
  if (!riskAssessment) throw new Error('Missing riskAssessment');

  const immediateActions = Array.isArray(obj['immediateActions'])
    ? (obj['immediateActions'] as unknown[]).map(String)
    : undefined;
  if (!immediateActions || immediateActions.length === 0) throw new Error('Missing immediateActions');

  const permanentFixRaw = obj['permanentFix'];
  if (!permanentFixRaw || typeof permanentFixRaw !== 'object') throw new Error('Missing permanentFix');
  const pf = permanentFixRaw as Record<string, unknown>;
  if (typeof pf['description'] !== 'string') throw new Error('Missing permanentFix.description');

  const verificationSteps = Array.isArray(obj['verificationSteps'])
    ? (obj['verificationSteps'] as unknown[]).map(String)
    : [];

  const references = Array.isArray(obj['references'])
    ? (obj['references'] as unknown[]).map(String)
    : [];

  const estimatedEffort = VALID_EFFORTS.has(String(obj['estimatedEffort']))
    ? (String(obj['estimatedEffort']) as RemediationResult['estimatedEffort'])
    : 'medium';

  const priority = VALID_PRIORITIES.has(String(obj['priority']))
    ? (String(obj['priority']) as RemediationResult['priority'])
    : 'short-term';

  return {
    riskAssessment,
    immediateActions,
    permanentFix: {
      description: String(pf['description']),
      codeExample: typeof pf['codeExample'] === 'string' ? pf['codeExample'] : undefined,
      configChange: typeof pf['configChange'] === 'string' ? pf['configChange'] : undefined,
    },
    verificationSteps,
    references,
    estimatedEffort,
    priority,
    raw,
    model,
    generatedAt: new Date(),
  };
}

/**
 * Parse a Claude response string into a structured RemediationResult.
 * Falls back to a simplified result when JSON parsing fails.
 */
export function parseRemediationResponse(
  raw: string,
  model = 'unknown',
): RemediationResult {
  try {
    const jsonStr = extractJson(raw);
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return validateParsed(parsed, raw, model);
  } catch {
    // Fallback — put the raw text into riskAssessment
    return {
      riskAssessment: raw,
      immediateActions: [],
      permanentFix: { description: 'See risk assessment above for details.' },
      verificationSteps: [],
      references: [],
      estimatedEffort: 'medium',
      priority: 'short-term',
      raw,
      model,
      generatedAt: new Date(),
    };
  }
}
