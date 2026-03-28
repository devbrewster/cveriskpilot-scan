// ---------------------------------------------------------------------------
// White-labeling — Middleware for Next.js
// ---------------------------------------------------------------------------

import { createLogger } from '@cveriskpilot/shared';
import { getBrandConfig } from './config';
import type { BrandConfigStorage } from './config';
import type { BrandConfig } from './types';

const logger = createLogger('whitelabel:middleware');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal request interface the middleware needs. */
export interface WhiteLabelRequest {
  headers: Record<string, string | string[] | undefined>;
  url: string;
}

/** Result of the white-label middleware. */
export interface WhiteLabelResult {
  /** The resolved brand configuration. */
  brandConfig: BrandConfig;
  /** The org ID that was resolved. */
  orgId: string;
  /** Whether the config is custom (true) or default (false). */
  isCustom: boolean;
}

/** Options for the middleware. */
export interface WhiteLabelMiddlewareOptions {
  /** A BrandConfigStorage implementation. */
  storage: BrandConfigStorage;
  /** Function to extract the org ID from the request (e.g. from session, header, or host). */
  getOrgId: (req: WhiteLabelRequest) => Promise<string | null>;
  /** Optional: fallback org ID if extraction fails. */
  fallbackOrgId?: string;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * White-label middleware that injects brand configuration into the request context.
 * Resolves the org ID from the request and looks up the corresponding brand config.
 */
export async function whiteLabelMiddleware(
  req: WhiteLabelRequest,
  options: WhiteLabelMiddlewareOptions,
): Promise<WhiteLabelResult> {
  const { storage, getOrgId, fallbackOrgId } = options;

  let orgId = await getOrgId(req);

  if (!orgId) {
    if (fallbackOrgId) {
      logger.debug(`No org ID resolved from request; using fallback: ${fallbackOrgId}`);
      orgId = fallbackOrgId;
    } else {
      logger.debug('No org ID resolved from request; using default brand config');
      orgId = 'default';
    }
  }

  const brandConfig = await getBrandConfig(storage, orgId);

  logger.debug(
    `White-label resolved: org=${orgId}, custom=${brandConfig.isCustom}, app=${brandConfig.appName}`,
  );

  return {
    brandConfig,
    orgId,
    isCustom: brandConfig.isCustom,
  };
}

// ---------------------------------------------------------------------------
// Helper: extract org ID from custom domain header
// ---------------------------------------------------------------------------

/**
 * Extracts org ID based on the Host header, looking up against a domain-to-org mapping.
 * Useful for custom domain white-labeling.
 */
export function createDomainOrgResolver(
  domainToOrgMap: Map<string, string>,
): (req: WhiteLabelRequest) => Promise<string | null> {
  return async (req: WhiteLabelRequest) => {
    const host = typeof req.headers['host'] === 'string'
      ? req.headers['host']
      : Array.isArray(req.headers['host'])
        ? req.headers['host'][0]
        : undefined;

    if (!host) return null;

    // Strip port if present
    const domain = host.split(':')[0]?.toLowerCase();
    if (!domain) return null;

    return domainToOrgMap.get(domain) ?? null;
  };
}
