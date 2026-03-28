import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBucketRateLimiter } from '../rate-limiter';

describe('TokenBucketRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('token acquisition', () => {
    it('grants tokens immediately when bucket is full', async () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 10,
        intervalMs: 1000,
        maxBurst: 10,
      });

      // Should resolve immediately for 10 tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }

      expect(limiter.availableTokens).toBe(0);
    });

    it('initializes with maxBurst tokens', () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 100,
        intervalMs: 60_000,
        maxBurst: 5,
      });

      expect(limiter.availableTokens).toBe(5);
    });

    it('defaults maxBurst to tokensPerInterval when not specified', () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 10,
        intervalMs: 1000,
      });

      expect(limiter.availableTokens).toBe(10);
    });
  });

  describe('burst handling', () => {
    it('limits burst to maxBurst even after long idle period', () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 100,
        intervalMs: 1000,
        maxBurst: 5,
      });

      // Advance time significantly — tokens should cap at maxBurst
      vi.advanceTimersByTime(60_000);

      expect(limiter.availableTokens).toBe(5);
    });

    it('allows rapid acquisition up to burst limit', async () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 60,
        intervalMs: 60_000,
        maxBurst: 3,
      });

      // 3 tokens should be acquired instantly
      const startTime = Date.now();
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      // No time should have passed (fake timers)
      expect(Date.now() - startTime).toBe(0);
      expect(limiter.availableTokens).toBe(0);
    });
  });

  describe('queue draining under load', () => {
    it('queues requests when tokens are exhausted', async () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 2,
        intervalMs: 1000,
        maxBurst: 2,
      });

      // Exhaust tokens
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.availableTokens).toBe(0);

      // Next acquire should queue
      let resolved = false;
      const promise = limiter.acquire().then(() => {
        resolved = true;
      });

      // Should not have resolved yet
      expect(resolved).toBe(false);

      // Advance time to allow token replenishment
      // With 2 tokens per 1000ms, one token arrives every 500ms
      vi.advanceTimersByTime(500);

      // Give microtask queue a chance to process
      await vi.runAllTimersAsync();
      await promise;

      expect(resolved).toBe(true);
    });

    it('drains multiple waiters as tokens become available', async () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 10,
        intervalMs: 1000,
        maxBurst: 1,
      });

      // Exhaust the single burst token
      await limiter.acquire();

      const resolved: number[] = [];

      // Queue 3 more requests
      const p1 = limiter.acquire().then(() => resolved.push(1));
      const p2 = limiter.acquire().then(() => resolved.push(2));
      const p3 = limiter.acquire().then(() => resolved.push(3));

      expect(resolved).toEqual([]);

      // Advance enough time for tokens to refill
      await vi.advanceTimersByTimeAsync(1000);

      await Promise.all([p1, p2, p3]);
      expect(resolved).toHaveLength(3);
    });
  });

  describe('token replenishment', () => {
    it('replenishes tokens over time', async () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 10,
        intervalMs: 1000,
        maxBurst: 10,
      });

      expect(limiter.availableTokens).toBe(10);

      // Drain all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }

      expect(limiter.availableTokens).toBe(0);

      // Advance half interval — should have ~5 tokens
      vi.advanceTimersByTime(500);
      const tokens = limiter.availableTokens;
      expect(tokens).toBeGreaterThanOrEqual(4);
      expect(tokens).toBeLessThanOrEqual(6);
    });

    it('does not exceed maxBurst after replenishment', () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 100,
        intervalMs: 1000,
        maxBurst: 5,
      });

      // Advance far into the future
      vi.advanceTimersByTime(100_000);

      // Should still be capped at maxBurst
      expect(limiter.availableTokens).toBe(5);
    });

    it('replenishes at the correct rate', async () => {
      const limiter = new TokenBucketRateLimiter({
        tokensPerInterval: 60,
        intervalMs: 60_000, // 1 token per second
        maxBurst: 60,
      });

      // Exhaust all tokens
      for (let i = 0; i < 60; i++) {
        await limiter.acquire();
      }

      expect(limiter.availableTokens).toBe(0);

      // Wait 10 seconds — should have ~10 tokens
      vi.advanceTimersByTime(10_000);
      const tokens = limiter.availableTokens;
      expect(tokens).toBeGreaterThanOrEqual(9);
      expect(tokens).toBeLessThanOrEqual(11);
    });
  });
});
