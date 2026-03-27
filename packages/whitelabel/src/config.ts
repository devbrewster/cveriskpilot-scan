// ---------------------------------------------------------------------------
// White-labeling — Brand Configuration Service
// ---------------------------------------------------------------------------

import { createLogger } from '@cveriskpilot/shared';
import type { BrandConfig, ThemeColors, WhiteLabelSettings } from './types';

const logger = createLogger('whitelabel:config');

// ---------------------------------------------------------------------------
// Default brand configuration
// ---------------------------------------------------------------------------

const DEFAULT_COLORS: ThemeColors = {
  primary: '#2563eb',
  secondary: '#475569',
  accent: '#f59e0b',
  background: '#ffffff',
  surface: '#f8fafc',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
};

const DEFAULT_BRAND_CONFIG: Omit<BrandConfig, 'orgId'> = {
  appName: 'CVERiskPilot',
  tagline: 'Vulnerability Management Platform',
  colors: DEFAULT_COLORS,
  logo: {
    primaryUrl: '/images/logo.svg',
    darkUrl: '/images/logo-dark.svg',
    iconUrl: '/images/icon.svg',
    altText: 'CVERiskPilot',
    maxWidth: 200,
    maxHeight: 48,
  },
  faviconUrl: '/favicon.ico',
  email: {
    fromName: 'CVERiskPilot',
    headerLogoUrl: '/images/logo-email.png',
    footerText: 'CVERiskPilot - Vulnerability Management Platform',
    buttonColor: '#2563eb',
  },
  isCustom: false,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_SETTINGS: WhiteLabelSettings = {
  enabled: false,
  allowCustomDomain: false,
  allowCustomCSS: false,
  allowEmailBranding: false,
  maxCustomCSSLength: 10_000,
};

// ---------------------------------------------------------------------------
// BrandConfigService
// ---------------------------------------------------------------------------

export class BrandConfigService {
  /** In-memory store. Replace with database-backed implementation in production. */
  private configs: Map<string, BrandConfig> = new Map();
  private settings: Map<string, WhiteLabelSettings> = new Map();

  /**
   * Get the brand configuration for an organization.
   * Falls back to defaults if no custom config exists.
   */
  getBrandConfig(orgId: string): BrandConfig {
    const stored = this.configs.get(orgId);
    if (stored) {
      return stored;
    }

    logger.debug(`No custom brand config for org ${orgId}; returning defaults`);
    return {
      ...DEFAULT_BRAND_CONFIG,
      orgId,
      isCustom: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update the brand configuration for an organization.
   * Merges the partial update with existing config (or defaults).
   */
  updateBrandConfig(orgId: string, update: Partial<Omit<BrandConfig, 'orgId'>>): BrandConfig {
    const current = this.getBrandConfig(orgId);
    const settings = this.getSettings(orgId);

    // Enforce settings restrictions
    if (update.customCSS && !settings.allowCustomCSS) {
      logger.warn(`Org ${orgId} attempted to set custom CSS but it is not allowed`);
      delete update.customCSS;
    }

    if (update.customCSS && update.customCSS.length > settings.maxCustomCSSLength) {
      logger.warn(
        `Custom CSS for org ${orgId} exceeds max length (${update.customCSS.length} > ${settings.maxCustomCSSLength})`,
      );
      update.customCSS = update.customCSS.slice(0, settings.maxCustomCSSLength);
    }

    if (update.customDomain && !settings.allowCustomDomain) {
      logger.warn(`Org ${orgId} attempted to set custom domain but it is not allowed`);
      delete update.customDomain;
    }

    if (update.email && !settings.allowEmailBranding) {
      logger.warn(`Org ${orgId} attempted to set email branding but it is not allowed`);
      delete update.email;
    }

    const merged: BrandConfig = {
      ...current,
      ...update,
      orgId,
      colors: {
        ...current.colors,
        ...(update.colors ?? {}),
      },
      logo: {
        ...current.logo,
        ...(update.logo ?? {}),
      },
      email: update.email
        ? { ...current.email, ...update.email }
        : current.email,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    this.configs.set(orgId, merged);
    logger.info(`Brand config updated for org ${orgId}`);
    return merged;
  }

  /** Remove custom brand config, reverting to defaults. */
  resetBrandConfig(orgId: string): void {
    this.configs.delete(orgId);
    logger.info(`Brand config reset to defaults for org ${orgId}`);
  }

  /** Get white-label settings for an org. */
  getSettings(orgId: string): WhiteLabelSettings {
    return this.settings.get(orgId) ?? { ...DEFAULT_SETTINGS };
  }

  /** Update white-label settings for an org. */
  updateSettings(orgId: string, update: Partial<WhiteLabelSettings>): WhiteLabelSettings {
    const current = this.getSettings(orgId);
    const merged = { ...current, ...update };
    this.settings.set(orgId, merged);
    logger.info(`White-label settings updated for org ${orgId}`);
    return merged;
  }

  /** Get the default brand config (for reference). */
  getDefaultBrandConfig(): Omit<BrandConfig, 'orgId'> {
    return { ...DEFAULT_BRAND_CONFIG };
  }

  /** Get the default theme colors. */
  getDefaultColors(): ThemeColors {
    return { ...DEFAULT_COLORS };
  }
}
