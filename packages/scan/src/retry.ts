/**
 * Exponential backoff with jitter for retryable network calls.
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  signal?: AbortSignal;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 16_000,
};

function getRetryDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const baseDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  const jitter = Math.random() * 0.25 * baseDelay;
  return baseDelay + jitter;
}

function isTransient(err: unknown): boolean {
  if (err instanceof TypeError && (err as Error).message.includes('fetch')) return true;
  if (err && typeof err === 'object' && 'name' in err && (err as Error).name === 'AbortError') return false;
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return status === 429 || status === 502 || status === 503 || status === 504;
  }
  return true;
}

/**
 * Retry an async operation with exponential backoff + jitter.
 * Non-transient errors (AbortError, 4xx except 429) are thrown immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: Partial<RetryOptions>,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, signal } = { ...DEFAULT_OPTIONS, ...opts };
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new Error('Aborted');

    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!isTransient(err) || attempt === maxRetries) throw err;

      const delay = getRetryDelay(attempt, baseDelayMs, maxDelayMs);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        if (signal) {
          const onAbort = () => { clearTimeout(timer); reject(new Error('Aborted')); };
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }
  }

  throw lastError;
}
