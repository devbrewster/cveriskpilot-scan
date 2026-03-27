// ---------------------------------------------------------------------------
// White-labeling — Type Definitions
// ---------------------------------------------------------------------------

/** Color configuration for branding. */
export interface ThemeColors {
  /** Primary brand color (hex). */
  primary: string;
  /** Secondary brand color (hex). */
  secondary: string;
  /** Accent color for highlights/CTAs (hex). */
  accent: string;
  /** Background color (hex). */
  background?: string;
  /** Surface/card background color (hex). */
  surface?: string;
  /** Primary text color (hex). */
  textPrimary?: string;
  /** Secondary/muted text color (hex). */
  textSecondary?: string;
  /** Error/danger color (hex). */
  error?: string;
  /** Warning color (hex). */
  warning?: string;
  /** Success color (hex). */
  success?: string;
  /** Info color (hex). */
  info?: string;
}

/** Logo configuration. */
export interface LogoConfig {
  /** URL to the primary logo image. */
  primaryUrl: string;
  /** URL to the logo used on dark backgrounds. */
  darkUrl?: string;
  /** URL to a small icon/favicon version. */
  iconUrl?: string;
  /** Alt text for accessibility. */
  altText: string;
  /** Max width in pixels for the primary logo. */
  maxWidth?: number;
  /** Max height in pixels for the primary logo. */
  maxHeight?: number;
}

/** Email template branding. */
export interface EmailBrandConfig {
  /** From name for outgoing emails. */
  fromName: string;
  /** Reply-to address. */
  replyTo?: string;
  /** Header logo URL for emails. */
  headerLogoUrl?: string;
  /** Footer text (e.g. company address, disclaimers). */
  footerText?: string;
  /** Primary button color in emails (hex). */
  buttonColor?: string;
}

/** Complete brand configuration for an organization. */
export interface BrandConfig {
  /** Organization ID this config belongs to. */
  orgId: string;
  /** Application display name. */
  appName: string;
  /** Short tagline or description. */
  tagline?: string;
  /** Theme colors. */
  colors: ThemeColors;
  /** Logo configuration. */
  logo: LogoConfig;
  /** Favicon URL. */
  faviconUrl?: string;
  /** Custom CSS to inject (limited scope). */
  customCSS?: string;
  /** Email branding. */
  email?: EmailBrandConfig;
  /** Custom domain for the org's portal. */
  customDomain?: string;
  /** Whether this is a custom config or the default. */
  isCustom: boolean;
  /** Last updated timestamp (ISO 8601). */
  updatedAt: string;
}

/** Settings that control which white-label features are enabled. */
export interface WhiteLabelSettings {
  /** Whether white-labeling is enabled for this org. */
  enabled: boolean;
  /** Allow custom domain mapping. */
  allowCustomDomain: boolean;
  /** Allow custom CSS injection. */
  allowCustomCSS: boolean;
  /** Allow email template customization. */
  allowEmailBranding: boolean;
  /** Maximum custom CSS length in characters. */
  maxCustomCSSLength: number;
}
