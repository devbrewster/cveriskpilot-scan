// ---------------------------------------------------------------------------
// Structured request logging utility for API routes
// Emits JSON logs that Cloud Logging parses automatically.
// The "context: http" field is used by Terraform log-based metrics.
// ---------------------------------------------------------------------------

import { createLogger } from '@cveriskpilot/shared';

const logger = createLogger('http');

export interface RequestLogData {
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  user_id?: string;
  query?: string;
  error?: string;
}

/**
 * Log a completed HTTP request with structured fields.
 *
 * Fields emitted:
 *   - method, path, status, duration_ms — always present
 *   - user_id — present when the caller is authenticated
 *   - error — present when the response indicates failure
 *
 * These fields are indexed by Cloud Logging and consumed by log-based
 * metrics defined in deploy/terraform/logging.tf.
 */
export function logRequest(data: RequestLogData): void {
  const { method, path, status, duration_ms, user_id, query, error } = data;

  const payload: Record<string, unknown> = {
    method,
    path,
    status,
    duration_ms,
    httpRequest: {
      requestMethod: method,
      requestUrl: path,
      status,
      latency: `${(duration_ms / 1000).toFixed(3)}s`,
    },
  };

  if (user_id) {
    payload.user_id = user_id;
  }
  if (query) {
    payload.query = query;
  }
  if (error) {
    payload.error = error;
  }

  if (status >= 500) {
    logger.error(`${method} ${path} ${status} ${duration_ms}ms`, payload);
  } else if (status >= 400) {
    logger.warn(`${method} ${path} ${status} ${duration_ms}ms`, payload);
  } else {
    logger.info(`${method} ${path} ${status} ${duration_ms}ms`, payload);
  }
}

/**
 * Wraps a Next.js API route handler to automatically log request details.
 *
 * Usage:
 *   export const GET = withRequestLogging(async (req) => { ... });
 *
 * Or with user extraction:
 *   export const GET = withRequestLogging(handler, {
 *     extractUserId: (req) => req.headers.get('x-user-id') ?? undefined,
 *   });
 */
export function withRequestLogging(
  handler: (req: Request, ctx?: unknown) => Promise<Response> | Response,
  options?: {
    extractUserId?: (req: Request) => string | undefined;
  },
): (req: Request, ctx?: unknown) => Promise<Response> {
  return async (req: Request, ctx?: unknown): Promise<Response> => {
    const start = Date.now();
    const url = new URL(req.url);

    let response: Response;
    let errorMessage: string | undefined;

    try {
      response = await handler(req, ctx);
    } catch (err) {
      const duration_ms = Date.now() - start;
      errorMessage = err instanceof Error ? err.message : String(err);

      logRequest({
        method: req.method,
        path: url.pathname,
        status: 500,
        duration_ms,
        user_id: options?.extractUserId?.(req),
        error: errorMessage,
      });

      throw err;
    }

    const duration_ms = Date.now() - start;

    logRequest({
      method: req.method,
      path: url.pathname,
      status: response.status,
      duration_ms,
      user_id: options?.extractUserId?.(req),
      query: url.search || undefined,
    });

    return response;
  };
}
