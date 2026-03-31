// ---------------------------------------------------------------------------
// AI Package — Prompt Builder
// ---------------------------------------------------------------------------

import type { RemediationRequest } from './types';
import { redactSensitiveData } from './redaction';

// ---------------------------------------------------------------------------
// Prompt injection sanitization
// ---------------------------------------------------------------------------

/**
 * Strip markdown syntax and control characters from user-provided text before
 * embedding it in an AI prompt. This mitigates prompt-injection attacks where
 * crafted CVE titles/descriptions attempt to override system instructions.
 */
function sanitizeForPrompt(text: string, maxLen = 500): string {
  return text
    .replace(/[`*_~\[\](){}#>|\\]/g, '')  // strip markdown syntax
    .replace(/\n{3,}/g, '\n\n')            // collapse excessive newlines
    .slice(0, maxLen);
}

// ---------------------------------------------------------------------------
// Org-specific prompt customization
// ---------------------------------------------------------------------------

/** Per-organization AI prompt configuration stored in Organization.aiPromptConfig */
export interface OrgPromptConfig {
  /** Additional system prompt text appended to the base prompt */
  customSystemPrompt?: string;
  /** Technology stack description to provide context (e.g. "Java 17, Spring Boot 3, PostgreSQL 15") */
  techStack?: string;
  /** Compliance frameworks the org cares about */
  complianceFrameworks?: string[];
  /** How detailed remediation guidance should be */
  remediationStyle?: 'concise' | 'detailed' | 'step-by-step';
  /** Patterns to exclude from recommendations (e.g. "Windows", "Oracle") */
  excludePatterns?: string[];
}

/**
 * Merge org-specific configuration into a base system prompt.
 * Returns the base prompt unmodified if config is empty/undefined.
 */
export function buildOrgSystemPrompt(basePrompt: string, config?: OrgPromptConfig | null): string {
  if (!config) return basePrompt;

  const sections: string[] = [basePrompt];

  if (config.techStack) {
    sections.push(
      `\nThe organization's technology stack: ${config.techStack}. Tailor all code examples and configuration guidance to this stack.`,
    );
  }

  if (config.complianceFrameworks && config.complianceFrameworks.length > 0) {
    sections.push(
      `\nThe organization must comply with: ${config.complianceFrameworks.join(', ')}. Include relevant compliance references and control mappings in your guidance.`,
    );
  }

  if (config.remediationStyle) {
    const styleInstructions: Record<string, string> = {
      concise: 'Keep remediation guidance brief and to the point. Omit verbose explanations.',
      detailed:
        'Provide thorough remediation guidance with full explanations, context, and rationale for each step.',
      'step-by-step':
        'Format remediation as numbered step-by-step instructions. Each step should be a single, clear action.',
    };
    sections.push(`\nRemediation style: ${styleInstructions[config.remediationStyle]}`);
  }

  if (config.excludePatterns && config.excludePatterns.length > 0) {
    sections.push(
      `\nDo NOT include recommendations involving: ${config.excludePatterns.join(', ')}. These technologies or approaches are not applicable to this organization.`,
    );
  }

  if (config.customSystemPrompt) {
    sections.push(`\nAdditional instructions from the organization:\n${config.customSystemPrompt}`);
  }

  return sections.join('');
}

// ---------------------------------------------------------------------------
// Base system prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a principal application security engineer with 15+ years of experience in vulnerability management, penetration testing, and secure software development. You advise Fortune 500 security teams and government agencies on remediation strategy.

Your remediation guidance must be:
- **Specific**: Reference exact CVE/CWE details, affected versions, and known exploit techniques. Never give generic advice when specific guidance is possible.
- **Prioritized**: Weigh CVSS score, EPSS probability, KEV listing, and asset exposure to determine urgency.
- **Actionable**: Every step must be something an engineer can execute immediately without further research.
- **Defense-in-depth**: Include both the immediate tactical fix and longer-term architectural improvements.

Structure your response as a JSON object with exactly this schema:
{
  "riskAssessment": "Detailed risk analysis: what the vulnerability allows an attacker to do, real-world exploitation scenarios, and business impact. Reference CVSS vector components and EPSS data when available.",
  "immediateActions": ["Ordered list of concrete mitigation steps to reduce exposure right now, before a permanent fix is deployed. Include specific commands, configuration changes, or WAF rules where applicable."],
  "permanentFix": {
    "description": "The definitive remediation — typically a version upgrade, code change, or architectural improvement. Specify exact target versions when known.",
    "codeExample": "Working code snippet, CLI command, or patch to apply. Include package manager commands (npm, pip, mvn, etc.) with exact version pins. Omit this field if not applicable.",
    "configChange": "Specific configuration file changes, environment variable settings, or infrastructure-as-code updates. Omit this field if not applicable."
  },
  "verificationSteps": ["Concrete steps to confirm the fix: scanner re-run commands, curl tests, log queries, or automated check scripts."],
  "references": ["NVD URL, vendor advisory URL, CISA KEV entry, relevant CWE page, or security blog with exploit details. Use real, valid URLs."],
  "estimatedEffort": "low|medium|high",
  "priority": "immediate|short-term|long-term"
}

Rules:
- Respond ONLY with valid JSON. No markdown fences, no preamble, no commentary outside the JSON.
- "estimatedEffort": low = under 1 hour, medium = 1-8 hours, high = multi-day effort.
- "priority": immediate = KEV-listed or actively exploited, short-term = high EPSS or critical/high CVSS, long-term = lower risk.
- Include at least 3 immediateActions and 3 verificationSteps.
- For references, prefer NVD (nvd.nist.gov), vendor advisories, and CISA (cisa.gov) URLs.`;

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
  lines.push(`**Title:** ${sanitizeForPrompt(redacted.title, 300)}`);

  if (redacted.description) {
    lines.push(`**Description:** ${sanitizeForPrompt(redacted.description, 2000)}`);
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
    lines.push(`**Package:** ${sanitizeForPrompt(params.packageName, 200)}${params.packageVersion ? `@${sanitizeForPrompt(params.packageVersion, 50)}` : ''}`);
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
