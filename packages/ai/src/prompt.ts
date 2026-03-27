// ---------------------------------------------------------------------------
// AI Package — Prompt Builder
// ---------------------------------------------------------------------------

import type { RemediationRequest } from './types';
import { redactSensitiveData } from './redaction';

const SYSTEM_PROMPT = `You are a senior application security engineer specializing in vulnerability remediation.
Provide actionable, specific remediation guidance. Structure your response in the following JSON format:
{
  "riskAssessment": "Brief risk analysis explaining the real-world impact",
  "immediateActions": ["Step-by-step actions to mitigate immediately"],
  "permanentFix": {
    "description": "How to permanently resolve the vulnerability",
    "codeExample": "Code snippet if applicable (optional)",
    "configChange": "Configuration change if applicable (optional)"
  },
  "verificationSteps": ["How to verify the fix was applied correctly"],
  "references": ["Relevant documentation URLs or advisories"],
  "estimatedEffort": "low|medium|high",
  "priority": "immediate|short-term|long-term"
}
Always respond with valid JSON only.`;

/**
 * Build the system prompt and user message for a remediation request.
 * Sensitive data is redacted before inclusion.
 */
export function buildRemediationPrompt(params: RemediationRequest): {
  system: string;
  userMessage: string;
} {
  // Redact sensitive infrastructure details
  const redacted = redactSensitiveData({
    title: params.title,
    description: params.description,
    observations: params.findings?.map((f) => (f.observations ?? {}) as Record<string, unknown>),
    assetNames: params.assets?.map((a) => a.name).filter(Boolean) as string[] | undefined,
  });

  const lines: string[] = [];

  lines.push(`## Vulnerability Case`);
  lines.push(`**Title:** ${redacted.title}`);

  if (redacted.description) {
    lines.push(`**Description:** ${redacted.description}`);
  }

  // CVE / CWE
  if (params.cveIds.length > 0) {
    lines.push(`**CVE IDs:** ${params.cveIds.join(', ')}`);
  }
  if (params.cweIds.length > 0) {
    lines.push(`**CWE IDs:** ${params.cweIds.join(', ')}`);
  }

  // Scoring
  lines.push(`**Severity:** ${params.severity}`);
  if (params.cvssScore !== null) {
    lines.push(`**CVSS Score:** ${params.cvssScore}`);
  }
  if (params.cvssVector) {
    lines.push(`**CVSS Vector:** ${params.cvssVector}`);
  }
  if (params.epssScore !== null) {
    lines.push(`**EPSS Score:** ${params.epssScore}`);
  }
  if (params.epssPercentile !== null) {
    lines.push(`**EPSS Percentile:** ${params.epssPercentile}`);
  }

  // KEV
  lines.push(`**KEV Listed:** ${params.kevListed ? 'Yes' : 'No'}`);
  if (params.kevDueDate) {
    lines.push(`**KEV Due Date:** ${params.kevDueDate}`);
  }

  // Package info (SCA)
  if (params.packageName) {
    lines.push(`**Package:** ${params.packageName}${params.packageVersion ? `@${params.packageVersion}` : ''}`);
  }

  // Asset context
  if (params.assets && params.assets.length > 0) {
    lines.push('');
    lines.push('## Affected Assets');
    for (let i = 0; i < params.assets.length; i++) {
      const asset = params.assets[i]!;
      const redactedName = redacted.assetNames?.[i] ?? asset.type ?? 'unknown';
      const parts: string[] = [`Name: ${redactedName}`];
      if (asset.type) parts.push(`Type: ${asset.type}`);
      if (asset.environment) parts.push(`Env: ${asset.environment}`);
      if (asset.criticality) parts.push(`Criticality: ${asset.criticality}`);
      if (asset.internetExposed !== undefined) {
        parts.push(`Internet-exposed: ${asset.internetExposed ? 'Yes' : 'No'}`);
      }
      lines.push(`- ${parts.join(' | ')}`);
    }
  }

  // Observations (redacted)
  if (redacted.observations && redacted.observations.length > 0) {
    lines.push('');
    lines.push('## Scanner Observations (redacted)');
    for (const obs of redacted.observations) {
      lines.push(`\`\`\`json\n${obs}\n\`\`\``);
    }
  }

  lines.push('');
  lines.push('Provide remediation guidance for this vulnerability.');

  return {
    system: SYSTEM_PROMPT,
    userMessage: lines.join('\n'),
  };
}
