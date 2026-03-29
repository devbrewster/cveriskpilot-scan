// ---------------------------------------------------------------------------
// ABAC Middleware for Next.js API Routes
// ---------------------------------------------------------------------------

import { createLogger } from '@cveriskpilot/shared';
import type { ABACEngine } from './engine';
import type {
  Action,
  DataClassification,
  EvaluationContext,
  EvaluationResult,
  Resource,
  Subject,
} from './types';

const logger = createLogger('abac:middleware');

// ---------------------------------------------------------------------------
// Types for Next.js integration
// ---------------------------------------------------------------------------

/** Minimal session shape expected by the middleware. */
export interface SessionUser {
  userId: string;
  orgId: string;
  roles: string[];
  allowedClassifications: DataClassification[];
  assignedClientIds?: string[];
}

/** Configuration for extracting resource info from a request. */
export interface ResourceMapping {
  /** How to determine the resource type from the request path (e.g. 'vulnerability'). */
  type: string;
  /** Function to extract the resource ID from the request. */
  extractId: (req: ABACRequest) => string;
  /** Function to extract the resource orgId. */
  extractOrgId: (req: ABACRequest) => string;
  /** Default classification if not determinable from request. */
  defaultClassification?: DataClassification;
  /** Optional: extract classification from request. */
  extractClassification?: (req: ABACRequest) => DataClassification;
  /** Optional: extract clientId for MSSP. */
  extractClientId?: (req: ABACRequest) => string | undefined;
}

/** Minimal request interface the middleware needs. */
export interface ABACRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  /** Parsed path parameters (e.g. { id: '123' }). */
  params?: Record<string, string>;
  /** Parsed query parameters. */
  query?: Record<string, string | string[]>;
  /** Parsed body (for POST/PUT). */
  body?: unknown;
}

/** Middleware options. */
export interface ABACMiddlewareOptions {
  /** The ABAC engine instance to use. */
  engine: ABACEngine;
  /** Function to extract the session user. */
  getSessionUser: (req: ABACRequest) => Promise<SessionUser | null>;
  /** Resource mapping for the route. */
  resourceMapping: ResourceMapping;
  /** Map HTTP methods to ABAC actions. */
  actionMap?: Partial<Record<string, Action>>;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_ACTION_MAP: Record<string, Action> = {
  GET: 'read',
  HEAD: 'read',
  POST: 'write',
  PUT: 'write',
  PATCH: 'write',
  DELETE: 'delete',
};

// ---------------------------------------------------------------------------
// Middleware result
// ---------------------------------------------------------------------------

export interface ABACMiddlewareResult {
  allowed: boolean;
  status: number;
  evaluation: EvaluationResult | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Core middleware function
// ---------------------------------------------------------------------------

/**
 * Evaluates an ABAC access decision for a given request.
 * Returns a result object; the caller decides how to handle denial (e.g. return 403).
 */
export async function abacMiddleware(
  req: ABACRequest,
  options: ABACMiddlewareOptions,
): Promise<ABACMiddlewareResult> {
  const { engine, getSessionUser, resourceMapping, actionMap } = options;

  // 1. Extract session user
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    logger.warn('ABAC middleware: no session user found');
    return { allowed: false, status: 401, evaluation: null, error: 'Unauthenticated' };
  }

  // 2. Build subject
  const ipHeader = req.headers['x-forwarded-for'];
  const ipAddress = typeof ipHeader === 'string'
    ? ipHeader.split(',')[0]?.trim()
    : Array.isArray(ipHeader)
      ? ipHeader[0]
      : undefined;

  const subject: Subject = {
    userId: sessionUser.userId,
    orgId: sessionUser.orgId,
    roles: sessionUser.roles,
    allowedClassifications: sessionUser.allowedClassifications,
    assignedClientIds: sessionUser.assignedClientIds,
    ipAddress,
  };

  // 3. Determine action
  const effectiveActionMap = { ...DEFAULT_ACTION_MAP, ...actionMap };
  const action = effectiveActionMap[req.method.toUpperCase()] ?? 'read';

  // 4. Build resource
  const classification = resourceMapping.extractClassification
    ? resourceMapping.extractClassification(req)
    : (resourceMapping.defaultClassification ?? 'internal');

  const resource: Resource = {
    type: resourceMapping.type,
    id: resourceMapping.extractId(req),
    orgId: resourceMapping.extractOrgId(req),
    classification,
    clientId: resourceMapping.extractClientId?.(req),
  };

  // 5. Build context
  const context: EvaluationContext = {
    timestamp: new Date().toISOString(),
  };

  // 6. Evaluate
  const evaluation = engine.evaluate(subject, action, resource, context);

  if (evaluation.decision === 'deny') {
    logger.info(
      `Access denied: user=${subject.userId} action=${action} resource=${resource.type}:${resource.id}`,
      { reason: evaluation.reason },
    );
    return { allowed: false, status: 403, evaluation, error: evaluation.reason };
  }

  return { allowed: true, status: 200, evaluation };
}
