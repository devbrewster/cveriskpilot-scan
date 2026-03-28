import type { CanonicalFinding } from '@cveriskpilot/parsers';

// Re-export for convenience
export type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// Credential Types
// ---------------------------------------------------------------------------

export interface DecryptedCredentials {
  type: 'api_key' | 'basic_auth' | 'oauth2_client' | 'token';
  apiKey?: string;
  accessKey?: string;
  secretKey?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  token?: string;
  baseUrl: string;
}

// ---------------------------------------------------------------------------
// Scanner Adapter Interface
// ---------------------------------------------------------------------------

export interface ScannerAdapterConfig {
  credentials: DecryptedCredentials;
  scannerConfig: Record<string, unknown>;
  lastSyncAt: Date | null;
  onProgress: (msg: string) => void;
}

export interface ScannerAdapter {
  /** Unique scanner type identifier (e.g., 'TENABLE_IO') */
  readonly scannerId: string;
  /** Human-readable name for logging */
  readonly scannerName: string;

  /** Validate that the credentials and endpoint are reachable */
  testConnection(credentials: DecryptedCredentials): Promise<{ ok: boolean; message: string }>;

  /**
   * Stream findings from the scanner API.
   * Uses AsyncGenerator to support backpressure and streaming processing
   * of large result sets without loading everything into memory.
   * Yields batches of CanonicalFinding for pipeline efficiency.
   */
  fetchFindings(config: ScannerAdapterConfig): AsyncGenerator<CanonicalFinding[], void, undefined>;
}

// ---------------------------------------------------------------------------
// Sync Progress
// ---------------------------------------------------------------------------

export interface SyncProgress {
  phase: 'authenticating' | 'exporting' | 'polling' | 'downloading' | 'mapping';
  totalChunks?: number;
  processedChunks?: number;
  findingsReceived?: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// HTTP Client Types
// ---------------------------------------------------------------------------

export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  rateLimitPerMinute: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  timeoutMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
  onLog?: (level: 'info' | 'warn' | 'error', message: string) => void;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  parseXml?: boolean;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Adapter Factory
// ---------------------------------------------------------------------------

export type ScannerAdapterFactory = () => ScannerAdapter;
