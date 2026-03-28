// ---------------------------------------------------------------------------
// Token Bucket Rate Limiter
// ---------------------------------------------------------------------------

export interface TokenBucketConfig {
  /** Number of tokens replenished per interval */
  tokensPerInterval: number;
  /** Interval in milliseconds */
  intervalMs: number;
  /** Maximum burst capacity (defaults to tokensPerInterval) */
  maxBurst?: number;
}

/**
 * Token bucket rate limiter.
 * Callers call `acquire()` which returns a Promise that resolves
 * when a token is available. Tokens are replenished at a fixed rate.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private lastRefill: number;
  private readonly waitQueue: Array<() => void> = [];

  constructor(config: TokenBucketConfig) {
    this.maxTokens = config.maxBurst ?? config.tokensPerInterval;
    this.tokens = this.maxTokens;
    this.refillRate = config.tokensPerInterval / config.intervalMs;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token. Resolves immediately if a token is available,
   * otherwise waits until one becomes available.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // No tokens available — wait for the next refill
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
      // Schedule a drain check based on when the next token arrives
      const msUntilNextToken = Math.ceil(1 / this.refillRate);
      setTimeout(() => this.drainQueue(), msUntilNextToken);
    });
  }

  /**
   * Get the current number of available tokens (for diagnostics).
   */
  get availableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;

    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  private drainQueue(): void {
    this.refill();

    while (this.waitQueue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const resolve = this.waitQueue.shift()!;
      resolve();
    }

    // If there are still waiters, schedule another drain
    if (this.waitQueue.length > 0) {
      const msUntilNextToken = Math.ceil(1 / this.refillRate);
      setTimeout(() => this.drainQueue(), msUntilNextToken);
    }
  }
}
