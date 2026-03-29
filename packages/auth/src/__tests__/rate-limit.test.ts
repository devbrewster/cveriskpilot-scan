import { describe, it, expect, vi } from 'vitest';
import { createRateLimiter } from '../security/rate-limit';

// ---------------------------------------------------------------------------
// Mock Redis
// ---------------------------------------------------------------------------

function createMockRedis(currentCount = 0) {
  const mockPipeline = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([
      [null, 0],            // zremrangebyscore result
      [null, currentCount], // zcard result
      [null, 1],            // zadd result
      [null, 1],            // expire result
    ]),
  };

  return {
    client: {
      pipeline: vi.fn(() => mockPipeline),
      zrem: vi.fn().mockResolvedValue(1),
      zrangebyscore: vi.fn().mockResolvedValue([`${Date.now()}:abc`]),
    } as any,
    pipeline: mockPipeline,
  };
}

describe('Rate limiter', () => {
  describe('createRateLimiter', () => {
    it('allows requests under the limit', async () => {
      const { client } = createMockRedis(0);
      const limiter = createRateLimiter(
        { windowMs: 60_000, maxRequests: 5, keyPrefix: 'test' },
        client,
      );

      const result = await limiter.check('user-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 0 - 1
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.retryAfter).toBeUndefined();
    });

    it('denies requests at the limit', async () => {
      const { client } = createMockRedis(5);
      const limiter = createRateLimiter(
        { windowMs: 60_000, maxRequests: 5, keyPrefix: 'test' },
        client,
      );

      const result = await limiter.check('user-1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('denies requests over the limit', async () => {
      const { client } = createMockRedis(10);
      const limiter = createRateLimiter(
        { windowMs: 60_000, maxRequests: 5, keyPrefix: 'test' },
        client,
      );

      const result = await limiter.check('user-1');
      expect(result.allowed).toBe(false);
    });

    it('removes optimistically added entry when denied', async () => {
      const { client } = createMockRedis(5);
      const limiter = createRateLimiter(
        { windowMs: 60_000, maxRequests: 5, keyPrefix: 'test' },
        client,
      );

      await limiter.check('user-1');
      expect(client.zrem).toHaveBeenCalled();
    });

    it('calls pipeline methods in the correct order', async () => {
      const { client, pipeline } = createMockRedis(0);
      const limiter = createRateLimiter(
        { windowMs: 60_000, maxRequests: 10, keyPrefix: 'api' },
        client,
      );

      await limiter.check('org-abc');

      expect(client.pipeline).toHaveBeenCalled();
      expect(pipeline.zremrangebyscore).toHaveBeenCalled();
      expect(pipeline.zcard).toHaveBeenCalled();
      expect(pipeline.zadd).toHaveBeenCalled();
      expect(pipeline.expire).toHaveBeenCalled();
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('uses the correct key prefix', async () => {
      const { client, pipeline } = createMockRedis(0);
      const limiter = createRateLimiter(
        { windowMs: 60_000, maxRequests: 10, keyPrefix: 'login' },
        client,
      );

      await limiter.check('192.168.1.1');

      const zremCall = pipeline.zremrangebyscore.mock.calls[0];
      expect(zremCall[0]).toContain('ratelimit:login:192.168.1.1:');
    });
  });
});
