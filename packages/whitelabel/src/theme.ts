// ---------------------------------------------------------------------------
// White-labeling — Theme Generator
// ---------------------------------------------------------------------------

import type { BrandConfig, ThemeColors } from './types';

// ---------------------------------------------------------------------------
// CSS custom property generation
// ---------------------------------------------------------------------------

/**
 * Generates CSS custom properties from a brand configuration.
 * Returns a string of CSS variable declarations for use in a :root or scoped selector.
 */
export function generateCSSVars(config: BrandConfig): string {
  const { colors, logo } = config;
  const vars: string[] = [];

  // Color variables
  const colorMap: Array<[string, string | undefined]> = [
    ['--brand-primary', colors.primary],
    ['--brand-secondary', colors.secondary],
    ['--brand-accent', colors.accent],
    ['--brand-background', colors.background],
    ['--brand-surface', colors.surface],
    ['--brand-text-primary', colors.textPrimary],
    ['--brand-text-secondary', colors.textSecondary],
    ['--brand-error', colors.error],
    ['--brand-warning', colors.warning],
    ['--brand-success', colors.success],
    ['--brand-info', colors.info],
  ];

  for (const [name, value] of colorMap) {
    if (value) {
      vars.push(`  ${name}: ${value};`);
    }
  }

  // Derived colors (hover/focus variants via opacity)
  vars.push(`  --brand-primary-hover: color-mix(in srgb, ${colors.primary} 85%, black);`);
  vars.push(`  --brand-primary-light: color-mix(in srgb, ${colors.primary} 15%, white);`);
  vars.push(`  --brand-secondary-hover: color-mix(in srgb, ${colors.secondary} 85%, black);`);
  vars.push(`  --brand-accent-hover: color-mix(in srgb, ${colors.accent} 85%, black);`);

  // Logo dimensions
  if (logo.maxWidth) {
    vars.push(`  --brand-logo-max-width: ${logo.maxWidth}px;`);
  }
  if (logo.maxHeight) {
    vars.push(`  --brand-logo-max-height: ${logo.maxHeight}px;`);
  }

  return `:root {\n${vars.join('\n')}\n}`;
}

// ---------------------------------------------------------------------------
// Tailwind theme generation
// ---------------------------------------------------------------------------

export interface TailwindBrandTheme {
  colors: {
    brand: {
      primary: string;
      'primary-hover': string;
      'primary-light': string;
      secondary: string;
      'secondary-hover': string;
      accent: string;
      'accent-hover': string;
      background: string;
      surface: string;
      error: string;
      warning: string;
      success: string;
      info: string;
    };
    text: {
      primary: string;
      secondary: string;
    };
  };
}

/**
 * Generates a Tailwind-compatible theme object from a brand configuration.
 * Use in tailwind.config.ts via `theme.extend`.
 */
export function generateTailwindTheme(config: BrandConfig): TailwindBrandTheme {
  const { colors } = config;

  return {
    colors: {
      brand: {
        primary: colors.primary,
        'primary-hover': `color-mix(in srgb, ${colors.primary} 85%, black)`,
        'primary-light': `color-mix(in srgb, ${colors.primary} 15%, white)`,
        secondary: colors.secondary,
        'secondary-hover': `color-mix(in srgb, ${colors.secondary} 85%, black)`,
        accent: colors.accent,
        'accent-hover': `color-mix(in srgb, ${colors.accent} 85%, black)`,
        background: colors.background ?? '#ffffff',
        surface: colors.surface ?? '#f8fafc',
        error: colors.error ?? '#ef4444',
        warning: colors.warning ?? '#f59e0b',
        success: colors.success ?? '#22c55e',
        info: colors.info ?? '#3b82f6',
      },
      text: {
        primary: colors.textPrimary ?? '#0f172a',
        secondary: colors.textSecondary ?? '#64748b',
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Full CSS stylesheet generation
// ---------------------------------------------------------------------------

/**
 * Generates a complete CSS stylesheet for white-labeling, including
 * custom properties and optional custom CSS from the org config.
 */
export function generateStylesheet(config: BrandConfig): string {
  const parts: string[] = [];

  // CSS custom properties
  parts.push(generateCSSVars(config));

  // Custom CSS (if any and sanitized)
  if (config.customCSS) {
    parts.push(`/* Custom CSS for org: ${config.orgId} */`);
    parts.push(sanitizeCustomCSS(config.customCSS));
  }

  return parts.join('\n\n');
}

/**
 * Basic CSS sanitization: strips @import, url() with non-https schemes,
 * and javascript: expressions.
 */
function sanitizeCustomCSS(css: string): string {
  let sanitized = css;

  // Remove @import rules
  sanitized = sanitized.replace(/@import\s+[^;]+;/gi, '/* @import removed */');

  // Remove url() with non-https schemes
  sanitized = sanitized.replace(
    /url\s*\(\s*['"]?\s*(?!https?:\/\/)[a-z]+:/gi,
    'url(/* blocked: ',
  );

  // Remove javascript: in any context
  sanitized = sanitized.replace(/javascript\s*:/gi, '/* javascript: blocked */');

  // Remove expression() (IE legacy)
  sanitized = sanitized.replace(/expression\s*\(/gi, '/* expression blocked */(');

  return sanitized;
}

// ---------------------------------------------------------------------------
// Theme utilities
// ---------------------------------------------------------------------------

/**
 * Validates that a hex color string is well-formed.
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

/**
 * Validate all colors in a ThemeColors object. Returns list of invalid field names.
 */
export function validateThemeColors(colors: ThemeColors): string[] {
  const invalid: string[] = [];
  const entries = Object.entries(colors) as Array<[string, string | undefined]>;
  for (const [key, value] of entries) {
    if (value && !isValidHexColor(value)) {
      invalid.push(key);
    }
  }
  return invalid;
}
