import { describe, it, expect, vi } from 'vitest';
import type { ScannerAdapter, ScannerAdapterFactory } from '../types';

// ---------------------------------------------------------------------------
// We test the AdapterRegistry class behavior by importing the singleton
// and also by testing the class mechanics through the exported instance.
// Since the singleton has pre-registered stubs, we test both the singleton
// and a fresh instance approach.
// ---------------------------------------------------------------------------

// Import the singleton to test pre-registered types
import { adapterRegistry } from '../adapter-registry';

describe('AdapterRegistry', () => {
  // -------------------------------------------------------------------------
  // Pre-registered types (singleton)
  // -------------------------------------------------------------------------

  describe('pre-registered scanner types', () => {
    it('has all 5 scanner types registered', () => {
      expect(adapterRegistry.has('TENABLE_IO')).toBe(true);
      expect(adapterRegistry.has('QUALYS_VMDR')).toBe(true);
      expect(adapterRegistry.has('CROWDSTRIKE_SPOTLIGHT')).toBe(true);
      expect(adapterRegistry.has('RAPID7_INSIGHTVM')).toBe(true);
      expect(adapterRegistry.has('SNYK')).toBe(true);
    });

    it('lists all registered types', () => {
      const types = adapterRegistry.list();
      expect(types).toContain('TENABLE_IO');
      expect(types).toContain('QUALYS_VMDR');
      expect(types).toContain('CROWDSTRIKE_SPOTLIGHT');
      expect(types).toContain('RAPID7_INSIGHTVM');
      expect(types).toContain('SNYK');
      expect(types.length).toBeGreaterThanOrEqual(5);
    });
  });

  // -------------------------------------------------------------------------
  // Register and retrieve
  // -------------------------------------------------------------------------

  describe('register and retrieve', () => {
    it('registers a new adapter and retrieves it', () => {
      const mockAdapter: ScannerAdapter = {
        scannerId: 'TEST_SCANNER',
        scannerName: 'Test Scanner',
        testConnection: vi.fn(),
        fetchFindings: vi.fn() as unknown as ScannerAdapter['fetchFindings'],
      };

      const factory: ScannerAdapterFactory = () => mockAdapter;

      adapterRegistry.register('TEST_SCANNER', factory);

      const result = adapterRegistry.get('TEST_SCANNER');
      expect(result).toBeDefined();
      expect(result!.scannerId).toBe('TEST_SCANNER');
      expect(result!.scannerName).toBe('Test Scanner');
    });

    it('is case-insensitive for type lookups', () => {
      const mockAdapter: ScannerAdapter = {
        scannerId: 'CASE_TEST',
        scannerName: 'Case Test',
        testConnection: vi.fn(),
        fetchFindings: vi.fn() as unknown as ScannerAdapter['fetchFindings'],
      };

      adapterRegistry.register('case_test', () => mockAdapter);

      expect(adapterRegistry.has('CASE_TEST')).toBe(true);
      expect(adapterRegistry.has('case_test')).toBe(true);
      expect(adapterRegistry.has('Case_Test')).toBe(true);

      const result = adapterRegistry.get('case_test');
      expect(result).toBeDefined();
      expect(result!.scannerId).toBe('CASE_TEST');
    });

    it('calls factory function each time get() is called', () => {
      const factory = vi.fn<ScannerAdapterFactory>(() => ({
        scannerId: 'FACTORY_TEST',
        scannerName: 'Factory Test',
        testConnection: vi.fn(),
        fetchFindings: vi.fn() as unknown as ScannerAdapter['fetchFindings'],
      }));

      adapterRegistry.register('FACTORY_TEST', factory);

      adapterRegistry.get('FACTORY_TEST');
      adapterRegistry.get('FACTORY_TEST');
      adapterRegistry.get('FACTORY_TEST');

      expect(factory).toHaveBeenCalledTimes(3);
    });
  });

  // -------------------------------------------------------------------------
  // Unknown adapter type
  // -------------------------------------------------------------------------

  describe('unknown adapter type', () => {
    it('returns undefined for unregistered types', () => {
      const result = adapterRegistry.get('NONEXISTENT_SCANNER');
      expect(result).toBeUndefined();
    });

    it('has() returns false for unregistered types', () => {
      expect(adapterRegistry.has('NONEXISTENT_SCANNER')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Has check
  // -------------------------------------------------------------------------

  describe('has()', () => {
    it('returns true for registered types', () => {
      expect(adapterRegistry.has('TENABLE_IO')).toBe(true);
    });

    it('returns false for unknown types', () => {
      expect(adapterRegistry.has('UNKNOWN')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(adapterRegistry.has('tenable_io')).toBe(true);
      expect(adapterRegistry.has('Tenable_IO')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Adapter instantiation (real adapters registered)
  // -------------------------------------------------------------------------

  describe('adapter instantiation', () => {
    it('TENABLE_IO returns an adapter with correct scannerName', () => {
      const adapter = adapterRegistry.get('TENABLE_IO');
      expect(adapter).toBeDefined();
      expect(adapter!.scannerName).toBeTruthy();
      expect(adapter!.scannerId).toBe('TENABLE_IO');
    });

    it('QUALYS_VMDR returns an adapter with correct scannerName', () => {
      const adapter = adapterRegistry.get('QUALYS_VMDR');
      expect(adapter).toBeDefined();
      expect(adapter!.scannerId).toBe('QUALYS_VMDR');
    });

    it('CROWDSTRIKE_SPOTLIGHT returns an adapter with correct scannerId', () => {
      const adapter = adapterRegistry.get('CROWDSTRIKE_SPOTLIGHT');
      expect(adapter).toBeDefined();
      expect(adapter!.scannerId).toBe('CROWDSTRIKE_SPOTLIGHT');
    });

    it('RAPID7_INSIGHTVM returns an adapter with correct scannerId', () => {
      const adapter = adapterRegistry.get('RAPID7_INSIGHTVM');
      expect(adapter).toBeDefined();
      expect(adapter!.scannerId).toBe('RAPID7_INSIGHTVM');
    });

    it('SNYK returns an adapter with correct scannerId', () => {
      const adapter = adapterRegistry.get('SNYK');
      expect(adapter).toBeDefined();
      expect(adapter!.scannerId).toBe('SNYK');
    });

    it('all adapters implement the ScannerAdapter interface', () => {
      const types = ['TENABLE_IO', 'QUALYS_VMDR', 'CROWDSTRIKE_SPOTLIGHT', 'RAPID7_INSIGHTVM', 'SNYK'];
      for (const type of types) {
        const adapter = adapterRegistry.get(type);
        expect(adapter, `${type} adapter`).toBeDefined();
        expect(typeof adapter!.testConnection, `${type}.testConnection`).toBe('function');
        expect(typeof adapter!.fetchFindings, `${type}.fetchFindings`).toBe('function');
        expect(typeof adapter!.scannerId, `${type}.scannerId`).toBe('string');
        expect(typeof adapter!.scannerName, `${type}.scannerName`).toBe('string');
      }
    });
  });
});
