/**
 * CLI Constants — Framework presets, aliases, planned frameworks, exit codes
 */

// ---------------------------------------------------------------------------
// Implemented Frameworks
// ---------------------------------------------------------------------------

export const IMPLEMENTED_FRAMEWORKS: Record<string, { id: string; name: string; controls: number }> = {
  'nist-800-53': { id: 'nist-800-53', name: 'NIST 800-53 Rev 5', controls: 45 },
  'soc2-type2': { id: 'soc2-type2', name: 'SOC 2 Type II', controls: 7 },
  'cmmc-level2': { id: 'cmmc-level2', name: 'CMMC Level 2', controls: 33 },
  'fedramp-moderate': { id: 'fedramp-moderate', name: 'FedRAMP Moderate', controls: 35 },
  'owasp-asvs': { id: 'owasp-asvs', name: 'OWASP ASVS 4.0', controls: 7 },
  'nist-ssdf': { id: 'nist-ssdf', name: 'NIST SSDF 1.1', controls: 8 },
  'gdpr': { id: 'gdpr', name: 'EU General Data Protection Regulation', controls: 15 },
  'hipaa': { id: 'hipaa', name: 'HIPAA Security Rule', controls: 19 },
  'pci-dss': { id: 'pci-dss', name: 'PCI-DSS 4.0', controls: 20 },
  'iso-27001': { id: 'iso-27001', name: 'ISO/IEC 27001:2022', controls: 24 },
  'nist-csf': { id: 'nist-csf', name: 'NIST Cybersecurity Framework 2.0', controls: 30 },
  'eu-cra': { id: 'eu-cra', name: 'EU Cyber Resilience Act', controls: 15 },
  'nis2': { id: 'nis2', name: 'NIS2 Directive', controls: 12 },
};

// ---------------------------------------------------------------------------
// Framework Aliases — shorthand → canonical ID
// ---------------------------------------------------------------------------

export const FRAMEWORK_ALIASES: Record<string, string> = {
  // NIST 800-53
  'nist': 'nist-800-53',
  'nist800': 'nist-800-53',
  'nist-800': 'nist-800-53',
  '800-53': 'nist-800-53',
  // SOC 2
  'soc2': 'soc2-type2',
  'soc': 'soc2-type2',
  'soc-2': 'soc2-type2',
  // CMMC
  'cmmc': 'cmmc-level2',
  'cmmc2': 'cmmc-level2',
  'cmmc-2': 'cmmc-level2',
  // FedRAMP
  'fedramp': 'fedramp-moderate',
  'fedramp-mod': 'fedramp-moderate',
  // OWASP ASVS
  'asvs': 'owasp-asvs',
  'owasp': 'owasp-asvs',
  // NIST SSDF
  'ssdf': 'nist-ssdf',
  'nist-ssdf-1.1': 'nist-ssdf',
  // GDPR
  'eu-gdpr': 'gdpr',
  // HIPAA
  'hipaa-security': 'hipaa',
  // PCI-DSS
  'pci': 'pci-dss',
  'pcidss': 'pci-dss',
  'pci-dss-4': 'pci-dss',
  // ISO 27001
  'iso': 'iso-27001',
  'iso27001': 'iso-27001',
  'iso-27001-2022': 'iso-27001',
  // NIST CSF
  'csf': 'nist-csf',
  'nist-csf-2': 'nist-csf',
  'csf2': 'nist-csf',
  // EU CRA
  'cra': 'eu-cra',
  'cyber-resilience': 'eu-cra',
  // NIS2
  'nis-2': 'nis2',
};

// ---------------------------------------------------------------------------
// Planned Frameworks (accept with warning, no mapping yet)
// ---------------------------------------------------------------------------

export const PLANNED_FRAMEWORKS: Record<string, string> = {
  // All planned frameworks are now implemented.
};

// ---------------------------------------------------------------------------
// Framework Presets — shorthand for common bundles
// ---------------------------------------------------------------------------

export const FRAMEWORK_PRESETS: Record<string, string[]> = {
  'federal': ['nist-800-53', 'fedramp-moderate', 'nist-ssdf'],
  'defense': ['nist-800-53', 'cmmc-level2', 'nist-ssdf'],
  'enterprise': ['nist-800-53', 'soc2-type2', 'owasp-asvs', 'nist-ssdf'],
  'startup': ['soc2-type2', 'owasp-asvs'],
  'devsecops': ['owasp-asvs', 'nist-ssdf'],
  'healthcare': ['hipaa', 'nist-800-53'],
  'payments': ['pci-dss', 'nist-800-53', 'soc2-type2'],
  'international': ['iso-27001', 'gdpr', 'nis2'],
  'eu-compliance': ['gdpr', 'eu-cra', 'nis2'],
  'all': Object.keys(IMPLEMENTED_FRAMEWORKS),
};

// ---------------------------------------------------------------------------
// Exit Codes
// ---------------------------------------------------------------------------

export const EXIT_PASS = 0;
export const EXIT_VIOLATION = 1;
export const EXIT_ERROR = 2;

// ---------------------------------------------------------------------------
// Severity Order
// ---------------------------------------------------------------------------

export const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

// ---------------------------------------------------------------------------
// Resolve Framework IDs
// ---------------------------------------------------------------------------

export interface FrameworkResolution {
  resolved: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Resolve raw user input (aliases, planned, presets) into canonical framework IDs.
 * Returns resolved IDs + warnings for planned frameworks + errors for unknown ones.
 */
export function resolveFrameworks(raw: string[]): FrameworkResolution {
  const resolved: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const input of raw) {
    const lower = input.toLowerCase().trim();

    // Check if it's a canonical ID
    if (IMPLEMENTED_FRAMEWORKS[lower]) {
      if (!resolved.includes(lower)) resolved.push(lower);
      continue;
    }

    // Check aliases
    const aliased = FRAMEWORK_ALIASES[lower];
    if (aliased) {
      if (!resolved.includes(aliased)) resolved.push(aliased);
      continue;
    }

    // Check planned frameworks
    const planned = PLANNED_FRAMEWORKS[lower];
    if (planned) {
      warnings.push(`${planned} (${lower}) is planned but not yet supported. Scan will proceed without it.`);
      continue;
    }

    // Unknown
    errors.push(`Unknown framework: "${input}". Use --list-frameworks to see available options.`);
  }

  return { resolved, warnings, errors };
}

/**
 * Resolve a preset name into framework IDs.
 */
export function resolvePreset(preset: string): string[] | null {
  return FRAMEWORK_PRESETS[preset.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// AI Enrichment Defaults
// ---------------------------------------------------------------------------

export const AI_DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
export const AI_DEFAULT_LLAMACPP_URL = 'http://127.0.0.1:8080';
export const AI_DEFAULT_MODEL = 'llama3.2';
export const AI_REQUEST_TIMEOUT_MS = 30_000;
export const AI_TOTAL_TIMEOUT_MS = 120_000;
