import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClientWithRetry, HttpClientError } from '../http-client';

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn<typeof globalThis.fetch>();

vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Helper to create a mock Response
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  const headersObj = new Headers(headers);
  headersObj.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers: headersObj });
}

function textResponse(text: string, status = 200, headers?: Record<string, string>): Response {
  return new Response(text, { status, headers: new Headers(headers) });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HttpClientWithRetry', () => {
  let client: HttpClientWithRetry;
  const baseConfig = {
    baseUrl: 'https://api.example.com',
    rateLimitPerMinute: 600, // high limit to avoid throttling in tests
    maxRetries: 3,
    retryBackoffMs: 10, // very short for tests
    timeoutMs: 5000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 100, // short for tests
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
    client = new HttpClientWithRetry(baseConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Successful Requests
  // -------------------------------------------------------------------------

  describe('successful requests', () => {
    it('performs a GET request and returns parsed JSON', async () => {
      const payload = { data: [1, 2, 3] };
      mockFetch.mockResolvedValueOnce(jsonResponse(payload));

      const result = await client.get<typeof payload>('/items');

      expect(result).toEqual(payload);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/items');
      expect(init?.method).toBe('GET');
    });

    it('performs a POST request with JSON body', async () => {
      const requestBody = { name: 'test' };
      const responsePayload = { id: '123', name: 'test' };
      mockFetch.mockResolvedValueOnce(jsonResponse(responsePayload));

      const result = await client.post<typeof responsePayload>('/items', requestBody);

      expect(result).toEqual(responsePayload);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, init] = mockFetch.mock.calls[0];
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify(requestBody));
    });

    it('performs a PUT request', async () => {
      const payload = { updated: true };
      mockFetch.mockResolvedValueOnce(jsonResponse(payload));

      const result = await client.put<typeof payload>('/items/1', { name: 'updated' });

      expect(result).toEqual(payload);
      const [, init] = mockFetch.mock.calls[0];
      expect(init?.method).toBe('PUT');
    });

    it('returns raw text when parseXml option is set', async () => {
      const xml = '<root><item>test</item></root>';
      mockFetch.mockResolvedValueOnce(textResponse(xml));

      const result = await client.get<string>('/data.xml', { parseXml: true });

      expect(result).toBe(xml);
    });
  });

  // -------------------------------------------------------------------------
  // Custom Headers
  // -------------------------------------------------------------------------

  describe('custom headers', () => {
    it('sends default headers from config', async () => {
      const clientWithHeaders = new HttpClientWithRetry({
        ...baseConfig,
        defaultHeaders: {
          'X-Api-Key': 'secret-key-123',
          'Accept': 'application/json',
        },
      });

      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await clientWithHeaders.get('/test');

      const [, init] = mockFetch.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers['X-Api-Key']).toBe('secret-key-123');
      expect(headers['Accept']).toBe('application/json');
    });

    it('merges per-request headers with defaults', async () => {
      const clientWithHeaders = new HttpClientWithRetry({
        ...baseConfig,
        defaultHeaders: { 'X-Default': 'default-val' },
      });

      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await clientWithHeaders.get('/test', {
        headers: { 'X-Custom': 'custom-val' },
      });

      const [, init] = mockFetch.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers['X-Default']).toBe('default-val');
      expect(headers['X-Custom']).toBe('custom-val');
    });

    it('per-request headers override defaults', async () => {
      const clientWithHeaders = new HttpClientWithRetry({
        ...baseConfig,
        defaultHeaders: { 'Authorization': 'Bearer old' },
      });

      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await clientWithHeaders.get('/test', {
        headers: { 'Authorization': 'Bearer new' },
      });

      const [, init] = mockFetch.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer new');
    });

    it('appends query parameters to the URL', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await client.get('/search', {
        params: { q: 'test', page: '1' },
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('?q=test&page=1');
    });

    it('sets Content-Type to application/json for POST with body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await client.post('/items', { data: 'test' });

      const [, init] = mockFetch.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  // -------------------------------------------------------------------------
  // Retry on 5xx
  // -------------------------------------------------------------------------

  describe('retry on server errors', () => {
    it('retries on 500 and succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(textResponse('Internal Server Error', 500))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const result = await client.get<{ ok: boolean }>('/flaky');

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 502 and succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(textResponse('Bad Gateway', 502))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const result = await client.get<{ ok: boolean }>('/flaky');
      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 503 and succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(textResponse('Service Unavailable', 503))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const result = await client.get<{ ok: boolean }>('/flaky');
      expect(result).toEqual({ ok: true });
    });

    it('throws HttpClientError after exhausting retries on 500', async () => {
      mockFetch.mockResolvedValue(textResponse('Server Error', 500));

      await expect(client.get('/always-fails')).rejects.toThrow(HttpClientError);
      // 1 initial + 3 retries = 4 total attempts
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('does NOT retry on 400 (not retryable)', async () => {
      mockFetch.mockResolvedValueOnce(textResponse('Bad Request', 400));

      await expect(client.get('/bad-request')).rejects.toThrow(HttpClientError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 401 (not retryable)', async () => {
      mockFetch.mockResolvedValueOnce(textResponse('Unauthorized', 401));

      await expect(client.get('/unauthorized')).rejects.toThrow(HttpClientError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 403 (not retryable)', async () => {
      mockFetch.mockResolvedValueOnce(textResponse('Forbidden', 403));

      await expect(client.get('/forbidden')).rejects.toThrow(HttpClientError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 429 with Retry-After
  // -------------------------------------------------------------------------

  describe('429 rate limit handling', () => {
    it('respects Retry-After header on 429', async () => {
      mockFetch
        .mockResolvedValueOnce(textResponse('Too Many Requests', 429, { 'Retry-After': '2' }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const resultPromise = client.get<{ ok: boolean }>('/rate-limited');
      // Advance past the 2s Retry-After
      await vi.advanceTimersByTimeAsync(3000);
      const result = await resultPromise;

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries 429 without Retry-After using exponential backoff', async () => {
      mockFetch
        .mockResolvedValueOnce(textResponse('Too Many Requests', 429))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const resultPromise = client.get<{ ok: boolean }>('/rate-limited');
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result).toEqual({ ok: true });
    });
  });

  // -------------------------------------------------------------------------
  // Circuit Breaker
  // -------------------------------------------------------------------------

  describe('circuit breaker', () => {
    it('opens after 5 consecutive failures', async () => {
      // Use a client with 0 retries so each call = 1 fetch
      const cbClient = new HttpClientWithRetry({
        ...baseConfig,
        maxRetries: 0,
        circuitBreakerThreshold: 5,
        circuitBreakerResetMs: 1000,
      });

      mockFetch.mockResolvedValue(textResponse('Server Error', 500));

      // Trigger 5 failures
      for (let i = 0; i < 5; i++) {
        await expect(cbClient.get('/failing')).rejects.toThrow(HttpClientError);
      }

      // 6th request should fail immediately with circuit breaker error
      await expect(cbClient.get('/failing')).rejects.toThrow(/Circuit breaker is open/);
      // Fetch should NOT have been called for the 6th request
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('transitions to half-open after reset window', async () => {
      const cbClient = new HttpClientWithRetry({
        ...baseConfig,
        maxRetries: 0,
        circuitBreakerThreshold: 5,
        circuitBreakerResetMs: 1000,
      });

      mockFetch.mockResolvedValue(textResponse('Server Error', 500));

      // Trigger 5 failures to open circuit
      for (let i = 0; i < 5; i++) {
        await expect(cbClient.get('/failing')).rejects.toThrow(HttpClientError);
      }

      // Advance past the reset window
      vi.advanceTimersByTime(1100);

      // Now the circuit should be half-open — a probe request is allowed
      // Make it succeed this time
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      const result = await cbClient.get<{ ok: boolean }>('/recovering');
      expect(result).toEqual({ ok: true });
    });

    it('closes circuit breaker after a successful probe', async () => {
      const cbClient = new HttpClientWithRetry({
        ...baseConfig,
        maxRetries: 0,
        circuitBreakerThreshold: 5,
        circuitBreakerResetMs: 100,
      });

      mockFetch.mockResolvedValue(textResponse('Server Error', 500));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await expect(cbClient.get('/failing')).rejects.toThrow();
      }

      // Wait for reset
      vi.advanceTimersByTime(150);

      // Successful probe
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await cbClient.get('/probe');

      // Should now be closed — subsequent requests go through
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'works' }));
      const result = await cbClient.get<{ data: string }>('/normal');
      expect(result).toEqual({ data: 'works' });
    });
  });

  // -------------------------------------------------------------------------
  // Timeout Handling
  // -------------------------------------------------------------------------

  describe('timeout handling', () => {
    it('throws on request timeout', async () => {
      // Use real timers for timeout tests since AbortController relies on real setTimeout
      vi.useRealTimers();

      const timeoutClient = new HttpClientWithRetry({
        ...baseConfig,
        timeoutMs: 50, // very short timeout
        maxRetries: 0,
        rateLimitPerMinute: 6000,
      });

      // Mock fetch that respects abort signal (hangs until aborted)
      mockFetch.mockImplementation(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = (init as RequestInit)?.signal;
            if (signal) {
              signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              });
            }
          }),
      );

      await expect(timeoutClient.get('/slow')).rejects.toThrow(HttpClientError);

      // Restore fake timers for remaining tests
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    it('respects per-request timeout override', async () => {
      vi.useRealTimers();

      const shortClient = new HttpClientWithRetry({
        ...baseConfig,
        timeoutMs: 30_000,
        maxRetries: 0,
        rateLimitPerMinute: 6000,
      });

      mockFetch.mockImplementation(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = (init as RequestInit)?.signal;
            if (signal) {
              signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              });
            }
          }),
      );

      await expect(shortClient.get('/slow', { timeout: 50 })).rejects.toThrow(HttpClientError);

      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
  });

  // -------------------------------------------------------------------------
  // Network Errors
  // -------------------------------------------------------------------------

  describe('network errors', () => {
    it('retries on network errors and succeeds', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const result = await client.get<{ ok: boolean }>('/recovering');
      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting retries on network errors', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(client.get('/unreachable')).rejects.toThrow(HttpClientError);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 + 3 retries
    });
  });

  // -------------------------------------------------------------------------
  // HttpClientError shape
  // -------------------------------------------------------------------------

  describe('HttpClientError', () => {
    it('includes status code and url', async () => {
      mockFetch.mockResolvedValueOnce(textResponse('Not Found', 404));

      try {
        await client.get('/missing');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpClientError);
        const httpErr = err as HttpClientError;
        expect(httpErr.statusCode).toBe(404);
        expect(httpErr.url).toBe('https://api.example.com/missing');
        expect(httpErr.retryable).toBe(false);
      }
    });

    it('marks 5xx as retryable', async () => {
      const noRetryClient = new HttpClientWithRetry({ ...baseConfig, maxRetries: 0 });
      mockFetch.mockResolvedValueOnce(textResponse('Error', 503));

      try {
        await noRetryClient.get('/error');
        expect.unreachable('Should have thrown');
      } catch (err) {
        const httpErr = err as HttpClientError;
        expect(httpErr.retryable).toBe(true);
      }
    });
  });
});
