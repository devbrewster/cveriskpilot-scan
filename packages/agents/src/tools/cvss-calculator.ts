// ---------------------------------------------------------------------------
// CVSS Calculator Tool
// ---------------------------------------------------------------------------
// Parses a CVSS v3.1 vector string into its component metrics and severity
// rating. No external API call — pure computation.

import type { AgentTool } from './Tool.js';

interface CvssInput {
  cvss_vector: string;
}

interface CvssOutput {
  valid: boolean;
  version?: string;
  base_score?: number;
  severity?: string;
  metrics?: Record<string, string>;
  error?: string;
}

// CVSS v3.1 metric value labels
const METRIC_LABELS: Record<string, Record<string, string>> = {
  AV: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' },
  AC: { L: 'Low', H: 'High' },
  PR: { N: 'None', L: 'Low', H: 'High' },
  UI: { N: 'None', R: 'Required' },
  S: { U: 'Unchanged', C: 'Changed' },
  C: { N: 'None', L: 'Low', H: 'High' },
  I: { N: 'None', L: 'Low', H: 'High' },
  A: { N: 'None', L: 'Low', H: 'High' },
};

// CVSS v3.1 base score weights
const AV_WEIGHTS: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.20 };
const AC_WEIGHTS: Record<string, number> = { L: 0.77, H: 0.44 };
const PR_WEIGHTS_UNCHANGED: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 };
const PR_WEIGHTS_CHANGED: Record<string, number> = { N: 0.85, L: 0.68, H: 0.50 };
const UI_WEIGHTS: Record<string, number> = { N: 0.85, R: 0.62 };
const CIA_WEIGHTS: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };

function getSeverity(score: number): string {
  if (score === 0) return 'NONE';
  if (score < 4.0) return 'LOW';
  if (score < 7.0) return 'MEDIUM';
  if (score < 9.0) return 'HIGH';
  return 'CRITICAL';
}

function roundUp(value: number): number {
  return Math.ceil(value * 10) / 10;
}

function computeCvss31(metrics: Record<string, string>): number {
  const av = AV_WEIGHTS[metrics['AV']!] ?? 0;
  const ac = AC_WEIGHTS[metrics['AC']!] ?? 0;
  const scopeChanged = metrics['S'] === 'C';
  const pr = scopeChanged
    ? (PR_WEIGHTS_CHANGED[metrics['PR']!] ?? 0)
    : (PR_WEIGHTS_UNCHANGED[metrics['PR']!] ?? 0);
  const ui = UI_WEIGHTS[metrics['UI']!] ?? 0;

  const c = CIA_WEIGHTS[metrics['C']!] ?? 0;
  const i = CIA_WEIGHTS[metrics['I']!] ?? 0;
  const a = CIA_WEIGHTS[metrics['A']!] ?? 0;

  const iss = 1 - ((1 - c) * (1 - i) * (1 - a));

  if (iss <= 0) return 0;

  const impact = scopeChanged
    ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
    : 6.42 * iss;

  if (impact <= 0) return 0;

  const exploitability = 8.22 * av * ac * pr * ui;

  const raw = scopeChanged
    ? Math.min(1.08 * (impact + exploitability), 10)
    : Math.min(impact + exploitability, 10);

  return roundUp(raw);
}

export const cvssCalculatorTool: AgentTool<CvssInput, CvssOutput> = {
  name: 'cvss-parser',
  description:
    'Parse a CVSS v3.1 vector string into component metrics, compute the base score, and return the severity rating. Use this to validate or recompute CVSS scores from vector strings.',
  inputSchema: {
    type: 'object',
    properties: {
      cvss_vector: {
        type: 'string',
        description: 'CVSS v3.1 vector string (e.g. CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H)',
      },
    },
    required: ['cvss_vector'],
  },
  isReadOnly: true,
  requiresApproval: false,

  async execute(input) {
    const vec = input.cvss_vector.trim();

    // Validate prefix
    if (!vec.startsWith('CVSS:3.1/') && !vec.startsWith('CVSS:3.0/')) {
      return { valid: false, error: 'Only CVSS v3.0/v3.1 vectors are supported' };
    }

    const version = vec.startsWith('CVSS:3.1/') ? '3.1' : '3.0';
    const parts = vec.split('/').slice(1); // skip "CVSS:3.x"
    const metrics: Record<string, string> = {};
    const expanded: Record<string, string> = {};

    for (const part of parts) {
      const [key, val] = part.split(':');
      if (!key || !val) {
        return { valid: false, error: `Malformed metric: ${part}` };
      }
      metrics[key] = val;
      const label = METRIC_LABELS[key]?.[val];
      expanded[key] = label ?? val;
    }

    const requiredMetrics = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
    for (const m of requiredMetrics) {
      if (!metrics[m]) {
        return { valid: false, error: `Missing required metric: ${m}` };
      }
    }

    const baseScore = computeCvss31(metrics);

    return {
      valid: true,
      version,
      base_score: baseScore,
      severity: getSeverity(baseScore),
      metrics: expanded,
    };
  },
};
