import type { ScannerAdapter, ScannerAdapterFactory } from './types';
import { TenableAdapter } from './adapters/tenable';
import { QualysAdapter } from './adapters/qualys';
import { CrowdStrikeSpotlightAdapter } from './adapters/crowdstrike';
import { Rapid7InsightVMAdapter } from './adapters/rapid7';
import { SnykAdapter } from './adapters/snyk';

// ---------------------------------------------------------------------------
// Scanner Adapter Registry
// ---------------------------------------------------------------------------

/**
 * Registry mapping scanner type strings to adapter factory functions.
 * Factories are lazy — adapters are only instantiated when requested.
 */
class AdapterRegistry {
  private readonly factories = new Map<string, ScannerAdapterFactory>();

  /**
   * Register an adapter factory for a scanner type.
   */
  register(type: string, factory: ScannerAdapterFactory): void {
    this.factories.set(type.toUpperCase(), factory);
  }

  /**
   * Get a scanner adapter instance by type.
   * Returns undefined if no adapter is registered for the given type.
   */
  get(type: string): ScannerAdapter | undefined {
    const factory = this.factories.get(type.toUpperCase());
    if (!factory) return undefined;
    return factory();
  }

  /**
   * List all registered scanner types.
   */
  list(): string[] {
    return [...this.factories.keys()];
  }

  /**
   * Check if an adapter is registered for the given type.
   */
  has(type: string): boolean {
    return this.factories.has(type.toUpperCase());
  }
}

// ---------------------------------------------------------------------------
// Singleton instance with pre-registered scanner types
// ---------------------------------------------------------------------------

export const adapterRegistry = new AdapterRegistry();

// Pre-register all 5 scanner types with lazy imports.
// Adapter modules are loaded only when first requested.
adapterRegistry.register('TENABLE_IO', () => new TenableAdapter());

adapterRegistry.register('QUALYS_VMDR', () => new QualysAdapter());

adapterRegistry.register('CROWDSTRIKE_SPOTLIGHT', () => new CrowdStrikeSpotlightAdapter());

adapterRegistry.register('RAPID7_INSIGHTVM', () => new Rapid7InsightVMAdapter());

adapterRegistry.register('SNYK', () => new SnykAdapter());
