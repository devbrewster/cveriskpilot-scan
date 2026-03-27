// ---------------------------------------------------------------------------
// Tenant-aware Observability — Structured Logger with PII Redaction
// ---------------------------------------------------------------------------

import type { LogEntry, LogSeverity } from './types';

// ---------------------------------------------------------------------------
// PII Redaction
// ---------------------------------------------------------------------------

/** Regex patterns for common PII. */
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    // Email addresses: keep first 2 chars of local part
    pattern: /([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    replacement: '$1***@$2',
  },
  {
    // IPv4 addresses: redact last two octets
    pattern: /\b(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}\b/g,
    replacement: '$1.xxx.xxx',
  },
];

function redactPII(value: string): string {
  let result = value;
  for (const { pattern, replacement } of PII_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }
  return result;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      redacted[key] = redactPII(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = redactObject(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// ---------------------------------------------------------------------------
// Cloud Logging severity mapping
// ---------------------------------------------------------------------------

function isDevelopment(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    (!process.env.NODE_ENV && !process.env.K_SERVICE)
  );
}

// ---------------------------------------------------------------------------
// StructuredLogger
// ---------------------------------------------------------------------------

export interface StructuredLoggerOptions {
  /** Default context name (e.g. module or service). */
  context?: string;
  /** Default tenant ID to include in all log entries. */
  tenantId?: string;
  /** Whether to redact PII. Defaults to true. */
  redactPII?: boolean;
}

export class StructuredLogger {
  private context?: string;
  private defaultTenantId?: string;
  private shouldRedactPII: boolean;

  constructor(options: StructuredLoggerOptions = {}) {
    this.context = options.context;
    this.defaultTenantId = options.tenantId;
    this.shouldRedactPII = options.redactPII ?? true;
  }

  /** Create a child logger with additional context. */
  child(overrides: Partial<StructuredLoggerOptions>): StructuredLogger {
    return new StructuredLogger({
      context: overrides.context ?? this.context,
      tenantId: overrides.tenantId ?? this.defaultTenantId,
      redactPII: overrides.redactPII ?? this.shouldRedactPII,
    });
  }

  debug(message: string, logContext?: LogContext): void {
    this.log('DEBUG', message, logContext);
  }

  info(message: string, logContext?: LogContext): void {
    this.log('INFO', message, logContext);
  }

  warn(message: string, logContext?: LogContext): void {
    this.log('WARNING', message, logContext);
  }

  error(message: string, logContext?: LogContext): void {
    this.log('ERROR', message, logContext);
  }

  critical(message: string, logContext?: LogContext): void {
    this.log('CRITICAL', message, logContext);
  }

  /**
   * Core log method. Outputs structured JSON compatible with Google Cloud Logging.
   * Automatically redacts PII when enabled.
   */
  log(severity: LogSeverity, message: string, logContext?: LogContext): void {
    const entry: LogEntry = {
      severity,
      message: this.shouldRedactPII ? redactPII(message) : message,
      tenantId: logContext?.tenantId ?? this.defaultTenantId,
      userId: logContext?.userId,
      requestId: logContext?.requestId,
      traceId: logContext?.traceId,
      spanId: logContext?.spanId,
      timestamp: new Date().toISOString(),
      context: logContext?.context ?? this.context,
    };

    if (logContext?.data) {
      entry.data = this.shouldRedactPII
        ? redactObject(logContext.data)
        : logContext.data;
    }

    // Remove undefined fields for cleaner output
    const cleaned = Object.fromEntries(
      Object.entries(entry).filter(([, v]) => v !== undefined),
    );

    if (isDevelopment()) {
      this.writeDevLog(severity, cleaned);
    } else {
      this.writeProductionLog(severity, cleaned);
    }
  }

  private writeDevLog(severity: LogSeverity, entry: Record<string, unknown>): void {
    const COLORS: Record<LogSeverity, string> = {
      DEFAULT: '\x1b[0m',
      DEBUG: '\x1b[36m',
      INFO: '\x1b[32m',
      WARNING: '\x1b[33m',
      ERROR: '\x1b[31m',
      CRITICAL: '\x1b[35m',
    };
    const RESET = '\x1b[0m';
    const color = COLORS[severity] || RESET;
    const ts = (entry.timestamp as string).slice(11, 23);
    const ctx = entry.context ? `[${entry.context}]` : '';
    const tenant = entry.tenantId ? ` tenant=${entry.tenantId}` : '';
    const line = `${color}[${severity}]${RESET} ${ts} ${ctx}${color} ${entry.message}${RESET}${tenant}`;

    if (severity === 'ERROR' || severity === 'CRITICAL') {
      console.error(line);
    } else if (severity === 'WARNING') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  private writeProductionLog(severity: LogSeverity, entry: Record<string, unknown>): void {
    const json = JSON.stringify(entry);
    if (severity === 'ERROR' || severity === 'CRITICAL') {
      console.error(json);
    } else if (severity === 'WARNING') {
      console.warn(json);
    } else {
      console.log(json);
    }
  }
}

// ---------------------------------------------------------------------------
// Log context type
// ---------------------------------------------------------------------------

export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  context?: string;
  data?: Record<string, unknown>;
}
