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
// Storage interface — decouples from Prisma for testability
// ---------------------------------------------------------------------------

export interface BrandConfigStorage {
  get(organizationId: string): Promise<BrandConfig | null>;
  upsert(organizationId: string, config: Partial<BrandConfig>): Promise<BrandConfig>;
  delete(organizationId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory storage — for tests and dev
// ---------------------------------------------------------------------------

export function createMemoryStorage(): BrandConfigStorage {
  const store = new Map<string, BrandConfig>();

  return {
    async get(organizationId: string): Promise<BrandConfig | null> {
      return store.get(organizationId) ?? null;
    },

    async upsert(organizationId: string, config: Partial<BrandConfig>): Promise<BrandConfig> {
      const existing = store.get(organizationId);
      const merged: BrandConfig = {
        ...DEFAULT_BRAND_CONFIG,
        ...existing,
        ...config,
        orgId: organizationId,
        colors: {
          ...DEFAULT_COLORS,
          ...(existing?.colors ?? {}),
          ...(config.colors ?? {}),
        },
        logo: {
          ...DEFAULT_BRAND_CONFIG.logo,
          ...(existing?.logo ?? {}),
          ...(config.logo ?? {}),
        },
        email: {
          ...DEFAULT_BRAND_CONFIG.email!,
          ...(existing?.email ?? {}),
          ...(config.email ?? {}),
        },
        isCustom: true,
        updatedAt: new Date().toISOString(),
      };
      store.set(organizationId, merged);
      return merged;
    },

    async delete(organizationId: string): Promise<void> {
      store.delete(organizationId);
    },
  };
}

// ---------------------------------------------------------------------------
// Settings store (still in-memory — lightweight feature flags per org)
// ---------------------------------------------------------------------------

const settingsStore = new Map<string, WhiteLabelSettings>();

// ---------------------------------------------------------------------------
// Public async functions
// ---------------------------------------------------------------------------

/**
 * Get the brand configuration for an organization.
 * Falls back to defaults if no custom config exists in storage.
 */
export async function getBrandConfig(
  storage: BrandConfigStorage,
  organizationId: string,
): Promise<BrandConfig> {
  const stored = await storage.get(organizationId);
  if (stored) {
    return stored;
  }

  logger.debug(`No custom brand config for org ${organizationId}; returning defaults`);
  return {
    ...DEFAULT_BRAND_CONFIG,
    orgId: organizationId,
    isCustom: false,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update (or create) the brand configuration for an organization.
 * Merges the partial update with existing config (or defaults).
 * Enforces white-label settings restrictions.
 */
export async function updateBrandConfig(
  storage: BrandConfigStorage,
  organizationId: string,
  updates: Partial<Omit<BrandConfig, 'orgId'>>,
): Promise<BrandConfig> {
  const settings = getSettings(organizationId);

  // Enforce settings restrictions
  if (updates.customCSS && !settings.allowCustomCSS) {
    logger.warn(`Org ${organizationId} attempted to set custom CSS but it is not allowed`);
    delete updates.customCSS;
  }

  if (updates.customCSS && updates.customCSS.length > settings.maxCustomCSSLength) {
    logger.warn(
      `Custom CSS for org ${organizationId} exceeds max length (${updates.customCSS.length} > ${settings.maxCustomCSSLength})`,
    );
    updates.customCSS = updates.customCSS.slice(0, settings.maxCustomCSSLength);
  }

  if (updates.customDomain && !settings.allowCustomDomain) {
    logger.warn(`Org ${organizationId} attempted to set custom domain but it is not allowed`);
    delete updates.customDomain;
  }

  if (updates.email && !settings.allowEmailBranding) {
    logger.warn(`Org ${organizationId} attempted to set email branding but it is not allowed`);
    delete updates.email;
  }

  const result = await storage.upsert(organizationId, updates);
  logger.info(`Brand config updated for org ${organizationId}`);
  return result;
}

/**
 * Remove custom brand config, reverting to defaults.
 */
export async function resetBrandConfig(
  storage: BrandConfigStorage,
  organizationId: string,
): Promise<void> {
  await storage.delete(organizationId);
  logger.info(`Brand config reset to defaults for org ${organizationId}`);
}

/** Get white-label settings for an org. */
export function getSettings(orgId: string): WhiteLabelSettings {
  return settingsStore.get(orgId) ?? { ...DEFAULT_SETTINGS };
}

/** Update white-label settings for an org. */
export function updateSettings(orgId: string, update: Partial<WhiteLabelSettings>): WhiteLabelSettings {
  const current = getSettings(orgId);
  const merged = { ...current, ...update };
  settingsStore.set(orgId, merged);
  logger.info(`White-label settings updated for org ${orgId}`);
  return merged;
}

/** Get the default brand config (for reference). */
export function getDefaultBrandConfig(): Omit<BrandConfig, 'orgId'> {
  return { ...DEFAULT_BRAND_CONFIG };
}

/** Get the default theme colors. */
export function getDefaultColors(): ThemeColors {
  return { ...DEFAULT_COLORS };
}
