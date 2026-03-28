import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncOrchestrator } from '../sync-orchestrator';
import type { ScannerAdapter, ScannerAdapterConfig, DecryptedCredentials } from '../types';
import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Mock adapter-registry
vi.mock('../adapter-registry', () => {
  const mockGet = vi.fn();
  return {
    adapterRegistry: {
      get: mockGet,
      list: vi.fn(() => ['TENABLE_IO', 'QUALYS_VMDR']),
      has: vi.fn(() => true),
      register: vi.fn(),
    },
  };
});

// Mock credential-resolver
vi.mock('../credential-resolver', () => ({
  resolveCredentials: vi.fn(),
  CredentialResolutionError: class CredentialResolutionError extends Error {
    connectorId: string;
    constructor(msg: string, connectorId: string) {
      super(msg);
      this.name = 'CredentialResolutionError';
      this.connectorId = connectorId;
    }
  },
}));

// Mock pipeline dependencies
vi.mock('@cveriskpilot/parsers', () => ({
  normalizeFindings: vi.fn((f: CanonicalFinding[]) => f),
  deduplicateFindings: vi.fn((f: CanonicalFinding[]) => f),
}));

vi.mock('@cveriskpilot/enrichment', () => ({
  enrichFindings: vi.fn((f: CanonicalFinding[]) => Promise.resolve(f)),
}));

vi.mock('@cveriskpilot/storage/case-builder/case-builder', () => ({
  buildCases: vi.fn(() =>
    Promise.resolve({
      findingsLinked: 5,
      casesCreated: 2,
      casesUpdated: 1,
    }),
  ),
}));

import { adapterRegistry } from '../adapter-registry';
import { resolveCredentials, CredentialResolutionError } from '../credential-resolver';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockConnector = {
  id: 'conn-001',
  organizationId: 'org-001',
  clientId: 'client-001',
  type: 'TENABLE_IO',
  endpoint: 'https://cloud.tenable.com',
  authConfig: { ciphertext: 'enc', method: 'aes-256-gcm', iv: 'iv', tag: 'tag', keyRef: 'key' },
  scannerConfig: { filters: {} },
  lastSyncAt: new Date('2024-08-01T00:00:00Z'),
  lastSyncError: null,
};

const mockSyncJob = {
  id: 'job-001',
  connectorId: 'conn-001',
  organizationId: 'org-001',
  clientId: 'client-001',
  status: 'PENDING',
  trigger: 'MANUAL',
  connector: mockConnector,
  findingsReceived: 0,
  findingsCreated: 0,
  casesCreated: 0,
  casesUpdated: 0,
  processedChunks: 0,
  totalChunks: 0,
};

const mockCredentials: DecryptedCredentials = {
  type: 'api_key',
  apiKey: 'test-key',
  baseUrl: 'https://cloud.tenable.com',
};

function makeFinding(title: string): CanonicalFinding {
  return {
    title,
    description: `Description for ${title}`,
    cveIds: ['CVE-2024-1234'],
    cweIds: [],
    severity: 'HIGH',
    scannerType: 'tenable',
    scannerName: 'Tenable.io',
    assetName: 'test-host',
    rawObservations: {},
    discoveredAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Mock Prisma Client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    scannerConnector: {
      findUnique: vi.fn().mockResolvedValue(mockConnector),
      update: vi.fn().mockResolvedValue(mockConnector),
    },
    syncJob: {
      create: vi.fn().mockResolvedValue({ id: 'job-001' }),
      findUnique: vi.fn().mockResolvedValue(mockSyncJob),
      update: vi.fn().mockResolvedValue(mockSyncJob),
    },
    syncLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (ops: unknown[]) => {
      // Execute all operations
      for (const op of ops) {
        if (op && typeof op === 'object' && 'then' in op) {
          await (op as Promise<unknown>);
        }
      }
      return ops;
    }),
  };
}

// ---------------------------------------------------------------------------
// Mock Adapter
// ---------------------------------------------------------------------------

function createMockAdapter(batches: CanonicalFinding[][]): ScannerAdapter {
  return {
    scannerId: 'TENABLE_IO',
    scannerName: 'Tenable.io',
    testConnection: vi.fn().mockResolvedValue({ ok: true, message: 'Connected' }),
    async *fetchFindings(config: ScannerAdapterConfig) {
      config.onProgress('Starting fetch');
      for (const batch of batches) {
        yield batch;
      }
      config.onProgress('Fetch complete');
    },
  };
}

function createFailingAdapter(error: Error): ScannerAdapter {
  return {
    scannerId: 'TENABLE_IO',
    scannerName: 'Tenable.io',
    testConnection: vi.fn(),
    async *fetchFindings() {
      throw error;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SyncOrchestrator', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let orchestrator: SyncOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    orchestrator = new SyncOrchestrator(mockPrisma as unknown as Parameters<typeof SyncOrchestrator.prototype.runSync extends (id: string) => unknown ? never : never>);
    // Fix the type — just cast it
    orchestrator = new SyncOrchestrator(mockPrisma as any);

    // Default mock setup
    vi.mocked(resolveCredentials).mockResolvedValue(mockCredentials);
  });

  // -------------------------------------------------------------------------
  // enqueueSyncJob
  // -------------------------------------------------------------------------

  describe('enqueueSyncJob', () => {
    it('creates a SyncJob record with PENDING status', async () => {
      const jobId = await orchestrator.enqueueSyncJob('conn-001', 'MANUAL');

      expect(jobId).toBe('job-001');
      expect(mockPrisma.syncJob.create).toHaveBeenCalledWith({
        data: {
          connectorId: 'conn-001',
          organizationId: 'org-001',
          clientId: 'client-001',
          status: 'PENDING',
          trigger: 'MANUAL',
        },
      });
    });

    it('throws when connector not found', async () => {
      mockPrisma.scannerConnector.findUnique.mockResolvedValueOnce(null);

      await expect(
        orchestrator.enqueueSyncJob('nonexistent', 'MANUAL'),
      ).rejects.toThrow(/ScannerConnector not found/);
    });
  });

  // -------------------------------------------------------------------------
  // Happy Path: PENDING -> RUNNING -> COMPLETED
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('transitions job from PENDING to RUNNING to COMPLETED', async () => {
      const batches = [
        [makeFinding('vuln-1'), makeFinding('vuln-2')],
        [makeFinding('vuln-3')],
      ];

      const adapter = createMockAdapter(batches);
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      // Check job was updated to RUNNING
      const runningUpdate = mockPrisma.syncJob.update.mock.calls.find(
        (call: any[]) => call[0].data.status === 'RUNNING',
      );
      expect(runningUpdate).toBeDefined();

      // Check $transaction was called for COMPLETED
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Check connector.lastSyncAt was updated
      const txnArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(txnArgs).toHaveLength(2); // syncJob update + connector update
    });

    it('processes all batches and tracks finding counts', async () => {
      const batches = [
        [makeFinding('v1'), makeFinding('v2'), makeFinding('v3')],
        [makeFinding('v4'), makeFinding('v5')],
      ];

      const adapter = createMockAdapter(batches);
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      // Progress updates should track batch processing
      const processingUpdates = mockPrisma.syncJob.update.mock.calls.filter(
        (call: any[]) => call[0].data.status === 'PROCESSING',
      );
      expect(processingUpdates.length).toBeGreaterThanOrEqual(2);
    });

    it('creates SyncLog entries for key events', async () => {
      const adapter = createMockAdapter([[makeFinding('v1')]]);
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      // Should have log entries for: resolving credentials, starting sync,
      // batch processing, progress, completion
      expect(mockPrisma.syncLog.create).toHaveBeenCalled();

      const logMessages = mockPrisma.syncLog.create.mock.calls.map(
        (call: any[]) => call[0].data.message,
      );

      expect(logMessages.some((m: string) => m.includes('Resolving credentials'))).toBe(true);
      expect(logMessages.some((m: string) => m.includes('Starting sync'))).toBe(true);
      expect(logMessages.some((m: string) => m.includes('completed'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Error Path: adapter throws -> FAILED
  // -------------------------------------------------------------------------

  describe('error path', () => {
    it('marks job as FAILED when adapter throws', async () => {
      const adapter = createFailingAdapter(new Error('Connection refused'));
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await expect(orchestrator.runSync('job-001')).rejects.toThrow('Connection refused');

      // Job should be updated to FAILED
      const failedUpdate = mockPrisma.syncJob.update.mock.calls.find(
        (call: any[]) => call[0].data.status === 'FAILED',
      );
      expect(failedUpdate).toBeDefined();
      expect(failedUpdate![0].data.errorMessage).toContain('Connection refused');
    });

    it('records error on connector when sync fails', async () => {
      const adapter = createFailingAdapter(new Error('API error'));
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await expect(orchestrator.runSync('job-001')).rejects.toThrow();

      expect(mockPrisma.scannerConnector.update).toHaveBeenCalledWith({
        where: { id: 'conn-001' },
        data: { lastSyncError: expect.stringContaining('API error') },
      });
    });

    it('marks job as FAILED when credential resolution fails', async () => {
      vi.mocked(resolveCredentials).mockRejectedValueOnce(
        new (CredentialResolutionError as any)('Decryption failed', 'conn-001'),
      );

      await expect(orchestrator.runSync('job-001')).rejects.toThrow('Decryption failed');

      const failedUpdate = mockPrisma.syncJob.update.mock.calls.find(
        (call: any[]) => call[0].data.status === 'FAILED',
      );
      expect(failedUpdate).toBeDefined();
    });

    it('logs error to SyncLog on failure', async () => {
      const adapter = createFailingAdapter(new Error('Timeout'));
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await expect(orchestrator.runSync('job-001')).rejects.toThrow();

      const errorLogs = mockPrisma.syncLog.create.mock.calls.filter(
        (call: any[]) => call[0].data.level === 'error',
      );
      expect(errorLogs.length).toBeGreaterThanOrEqual(1);
      expect(errorLogs[0][0].data.message).toContain('Sync failed');
    });

    it('throws when no adapter is registered for connector type', async () => {
      vi.mocked(adapterRegistry.get).mockReturnValue(undefined);

      await expect(orchestrator.runSync('job-001')).rejects.toThrow(
        /No adapter registered for scanner type/,
      );
    });

    it('throws when sync job is not in PENDING status', async () => {
      mockPrisma.syncJob.findUnique.mockResolvedValueOnce({
        ...mockSyncJob,
        status: 'RUNNING',
      });

      await expect(orchestrator.runSync('job-001')).rejects.toThrow(
        /expected PENDING/,
      );
    });

    it('throws when sync job is not found', async () => {
      mockPrisma.syncJob.findUnique.mockResolvedValueOnce(null);

      await expect(orchestrator.runSync('nonexistent')).rejects.toThrow(
        /SyncJob not found/,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Incremental Sync
  // -------------------------------------------------------------------------

  describe('incremental sync', () => {
    it('passes lastSyncAt to adapter config', async () => {
      const batches = [[makeFinding('v1')]];
      let capturedConfig: ScannerAdapterConfig | undefined;

      const adapter: ScannerAdapter = {
        scannerId: 'TENABLE_IO',
        scannerName: 'Tenable.io',
        testConnection: vi.fn(),
        async *fetchFindings(config: ScannerAdapterConfig) {
          capturedConfig = config;
          for (const batch of batches) {
            yield batch;
          }
        },
      };

      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      expect(capturedConfig).toBeDefined();
      expect(capturedConfig!.lastSyncAt).toEqual(new Date('2024-08-01T00:00:00Z'));
    });

    it('passes null lastSyncAt for first-time sync', async () => {
      // Connector with no lastSyncAt
      mockPrisma.syncJob.findUnique.mockResolvedValueOnce({
        ...mockSyncJob,
        connector: { ...mockConnector, lastSyncAt: null },
      });

      let capturedConfig: ScannerAdapterConfig | undefined;

      const adapter: ScannerAdapter = {
        scannerId: 'TENABLE_IO',
        scannerName: 'Tenable.io',
        testConnection: vi.fn(),
        async *fetchFindings(config: ScannerAdapterConfig) {
          capturedConfig = config;
          yield [makeFinding('v1')];
        },
      };

      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      expect(capturedConfig!.lastSyncAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // SyncLog Entries
  // -------------------------------------------------------------------------

  describe('SyncLog entries', () => {
    it('creates log entries for each sync phase', async () => {
      const adapter = createMockAdapter([[makeFinding('v1')]]);
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      // Verify multiple log entries were created
      expect(mockPrisma.syncLog.create.mock.calls.length).toBeGreaterThanOrEqual(3);

      // All logs should reference the correct sync job
      for (const call of mockPrisma.syncLog.create.mock.calls) {
        expect(call[0].data.syncJobId).toBe('job-001');
      }
    });

    it('logs batch processing metadata', async () => {
      const adapter = createMockAdapter([
        [makeFinding('v1'), makeFinding('v2')],
      ]);
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      const batchLogs = mockPrisma.syncLog.create.mock.calls.filter(
        (call: any[]) => call[0].data.message.includes('Batch'),
      );
      expect(batchLogs.length).toBeGreaterThanOrEqual(1);

      // Batch log should include metadata
      const batchMeta = batchLogs[0][0].data.metadata;
      expect(batchMeta).toBeDefined();
      expect(batchMeta.rawCount).toBe(2);
    });

    it('does not break sync pipeline if logging fails', async () => {
      // Make syncLog.create fail
      mockPrisma.syncLog.create.mockRejectedValue(new Error('DB error'));

      const adapter = createMockAdapter([[makeFinding('v1')]]);
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      // Should still complete despite log failures
      await orchestrator.runSync('job-001');

      // Transaction should still have been called (completion)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Empty Results
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles empty results from adapter', async () => {
      const adapter = createMockAdapter([]);
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      // Should still complete successfully
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('handles adapter yielding empty batches', async () => {
      const adapter = createMockAdapter([[], [], []]);
      vi.mocked(adapterRegistry.get).mockReturnValue(adapter);

      await orchestrator.runSync('job-001');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
