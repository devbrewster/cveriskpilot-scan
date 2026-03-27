// ---------------------------------------------------------------------------
// Structured JSON logger compatible with Google Cloud Logging
// ---------------------------------------------------------------------------

/**
 * Severity levels matching Cloud Logging:
 * https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
 */
type Severity = 'DEFAULT' | 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

interface LogEntry {
  severity: Severity;
  message: string;
  context: string;
  timestamp: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// ANSI color helpers (development only)
// ---------------------------------------------------------------------------

const COLORS: Record<Severity, string> = {
  DEFAULT: '\x1b[0m',
  DEBUG: '\x1b[36m',    // cyan
  INFO: '\x1b[32m',     // green
  WARNING: '\x1b[33m',  // yellow
  ERROR: '\x1b[31m',    // red
  CRITICAL: '\x1b[35m', // magenta
};

const RESET = '\x1b[0m';

function isDevelopment(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    (!process.env.NODE_ENV && !process.env.K_SERVICE)
  );
}

// ---------------------------------------------------------------------------
// Core log function
// ---------------------------------------------------------------------------

function writeLog(
  severity: Severity,
  context: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    severity,
    message,
    context,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const json = JSON.stringify(entry);

  if (isDevelopment()) {
    const color = COLORS[severity] || RESET;
    const ts = entry.timestamp.slice(11, 23); // HH:mm:ss.SSS
    const extra = data && Object.keys(data).length > 0
      ? ` ${JSON.stringify(data)}`
      : '';
    const line = `${color}[${severity}]${RESET} ${ts} [${context}]${color} ${message}${RESET}${extra}`;

    if (severity === 'ERROR' || severity === 'CRITICAL') {
      console.error(line);
    } else if (severity === 'WARNING') {
      console.warn(line);
    } else if (severity === 'DEBUG') {
      console.debug(line);
    } else {
      console.log(line);
    }
  } else {
    // In production, output structured JSON for Cloud Logging to parse
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
// Factory
// ---------------------------------------------------------------------------

export function createLogger(context: string): Logger {
  return {
    debug: (message, data?) => writeLog('DEBUG', context, message, data),
    info: (message, data?) => writeLog('INFO', context, message, data),
    warn: (message, data?) => writeLog('WARNING', context, message, data),
    error: (message, data?) => writeLog('ERROR', context, message, data),
  };
}
