import { TokenBucketRateLimiter } from './rate-limiter';
import type { HttpClientConfig, RequestOptions } from './types';

// ---------------------------------------------------------------------------
// Circuit Breaker State
// ---------------------------------------------------------------------------

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number;
  threshold: number;
  resetMs: number;
}

// ---------------------------------------------------------------------------
// HTTP Errors
// ---------------------------------------------------------------------------

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | undefined,
    public readonly url: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

// ---------------------------------------------------------------------------
// HttpClientWithRetry
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BACKOFF_MS = 1000;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_CIRCUIT_THRESHOLD = 5;
const DEFAULT_CIRCUIT_RESET_MS = 30_000;

/** Status codes that are safe to retry */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * HTTP client with rate limiting, exponential backoff retry, and circuit breaker.
 * Uses native `fetch` — no external HTTP dependencies.
 */
export class HttpClientWithRetry {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly timeoutMs: number;
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly onLog: (level: 'info' | 'warn' | 'error', message: string) => void;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryBackoffMs = config.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onLog = config.onLog ?? (() => {});

    // Token bucket: convert requests/minute to tokens/interval
    this.rateLimiter = new TokenBucketRateLimiter({
      tokensPerInterval: config.rateLimitPerMinute,
      intervalMs: 60_000,
      maxBurst: Math.min(config.rateLimitPerMinute, 10),
    });

    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0,
      lastFailureAt: 0,
      threshold: config.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_THRESHOLD,
      resetMs: config.circuitBreakerResetMs ?? DEFAULT_CIRCUIT_RESET_MS,
    };
  }

  // -------------------------------------------------------------------------
  // Public HTTP Methods
  // -------------------------------------------------------------------------

  async get<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, opts);
  }

  async post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, opts);
  }

  async put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, opts);
  }

  // -------------------------------------------------------------------------
  // Core Request Logic
  // -------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body: unknown | undefined,
    opts?: RequestOptions,
  ): Promise<T> {
    this.checkCircuitBreaker();

    let url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    // Append query parameters
    if (opts?.params) {
      const searchParams = new URLSearchParams(opts.params);
      url += `?${searchParams.toString()}`;
    }

    const timeout = opts?.timeout ?? this.timeoutMs;
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...opts?.headers,
    };

    if (body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.calculateBackoff(attempt);
        this.onLog('info', `Retry ${attempt}/${this.maxRetries} after ${delay}ms for ${method} ${path}`);
        await this.sleep(delay);
      }

      // Acquire rate limit token before each attempt
      await this.rateLimiter.acquire();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: opts?.signal
            ? this.combineSignals(opts.signal, controller.signal)
            : controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-OK responses
        if (!response.ok) {
          const isRetryable = RETRYABLE_STATUS_CODES.has(response.status);

          // Special handling for 429 — respect Retry-After header
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter && attempt < this.maxRetries) {
              const retryMs = parseInt(retryAfter, 10) * 1000;
              if (!isNaN(retryMs) && retryMs > 0 && retryMs <= 120_000) {
                this.onLog('warn', `Rate limited (429), waiting ${retryMs}ms (Retry-After)`);
                await this.sleep(retryMs);
                continue;
              }
            }
          }

          const responseBody = await response.text().catch(() => '');
          const error = new HttpClientError(
            `${method} ${path} returned ${response.status}: ${responseBody.slice(0, 500)}`,
            response.status,
            url,
            isRetryable,
          );

          if (isRetryable && attempt < this.maxRetries) {
            lastError = error;
            this.recordFailure();
            continue;
          }

          this.recordFailure();
          throw error;
        }

        // Success — reset circuit breaker
        this.recordSuccess();

        // Parse response
        if (opts?.parseXml) {
          const text = await response.text();
          return text as unknown as T;
        }

        const json = await response.json();
        return json as T;
      } catch (error) {
        if (error instanceof HttpClientError) {
          throw error;
        }

        // Network errors, timeouts, etc.
        const isTimeout = error instanceof DOMException && error.name === 'AbortError';
        const message = isTimeout
          ? `Request timed out after ${timeout}ms: ${method} ${path}`
          : `Network error: ${method} ${path}: ${error instanceof Error ? error.message : String(error)}`;

        lastError = new HttpClientError(message, undefined, url, true);
        this.recordFailure();

        if (attempt < this.maxRetries) {
          this.onLog('warn', message);
          continue;
        }
      }
    }

    throw lastError ?? new HttpClientError(`Request failed after ${this.maxRetries} retries`, undefined, url, false);
  }

  // -------------------------------------------------------------------------
  // Circuit Breaker
  // -------------------------------------------------------------------------

  private checkCircuitBreaker(): void {
    const cb = this.circuitBreaker;

    if (cb.state === 'open') {
      const elapsed = Date.now() - cb.lastFailureAt;
      if (elapsed >= cb.resetMs) {
        // Transition to half-open — allow one probe request
        cb.state = 'half-open';
        this.onLog('info', 'Circuit breaker transitioning to half-open');
      } else {
        throw new HttpClientError(
          `Circuit breaker is open. ${Math.ceil((cb.resetMs - elapsed) / 1000)}s until reset.`,
          undefined,
          this.baseUrl,
          false,
        );
      }
    }
  }

  private recordFailure(): void {
    const cb = this.circuitBreaker;
    cb.failureCount++;
    cb.lastFailureAt = Date.now();

    if (cb.failureCount >= cb.threshold && cb.state !== 'open') {
      cb.state = 'open';
      this.onLog('error', `Circuit breaker opened after ${cb.failureCount} consecutive failures`);
    }
  }

  private recordSuccess(): void {
    const cb = this.circuitBreaker;
    if (cb.state === 'half-open') {
      this.onLog('info', 'Circuit breaker closed after successful probe');
    }
    cb.state = 'closed';
    cb.failureCount = 0;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Exponential backoff with jitter.
   * Base delays: 1s, 2s, 4s (configurable via retryBackoffMs)
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = this.retryBackoffMs * Math.pow(2, attempt - 1);
    // Add jitter: 0-50% of base delay
    const jitter = Math.random() * baseDelay * 0.5;
    return Math.floor(baseDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private combineSignals(userSignal: AbortSignal, timeoutSignal: AbortSignal): AbortSignal {
    const controller = new AbortController();

    const onAbort = () => controller.abort();
    userSignal.addEventListener('abort', onAbort, { once: true });
    timeoutSignal.addEventListener('abort', onAbort, { once: true });

    return controller.signal;
  }
}
