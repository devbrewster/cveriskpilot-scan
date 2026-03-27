// ---------------------------------------------------------------------------
// QRadar Exporter — syslog/REST integration (t110)
// ---------------------------------------------------------------------------

import { createSocket, type Socket } from 'node:dgram';
import { createConnection, type Socket as NetSocket } from 'node:net';
import type {
  QRadarConfig,
  CloudEvent,
  SIEMExporter,
  SIEMExportResult,
} from './types';

// Syslog severity mapping for CEF
const CEF_SEVERITY_MAP: Record<string, number> = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 5,
  LOW: 3,
  INFO: 1,
};

export class QRadarExporter implements SIEMExporter {
  readonly type = 'qradar';
  private readonly config: QRadarConfig;

  constructor(config: QRadarConfig) {
    this.config = config;
  }

  async sendEvents(events: CloudEvent[]): Promise<SIEMExportResult> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    // Prefer REST API if configured, otherwise fall back to syslog
    if (this.config.apiUrl && this.config.apiToken) {
      return this.sendViaRest(events);
    }

    // Syslog transport
    for (const event of events) {
      try {
        const cefMessage = this.toCEF(event);
        await this.sendSyslog(cefMessage);
        sent++;
      } catch (err) {
        failed++;
        errors.push(
          `QRadar syslog error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { success: failed === 0, sent, failed, errors };
  }

  async testConnection(): Promise<boolean> {
    if (this.config.apiUrl && this.config.apiToken) {
      try {
        const res = await fetch(`${this.config.apiUrl}/api/system/about`, {
          headers: {
            SEC: this.config.apiToken,
            Accept: 'application/json',
          },
        });
        return res.ok;
      } catch {
        return false;
      }
    }

    // Test syslog by sending a minimal message
    try {
      await this.sendSyslog('<14>CVERiskPilot connection test');
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // REST API
  // ---------------------------------------------------------------------------

  private async sendViaRest(events: CloudEvent[]): Promise<SIEMExportResult> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    const batches = this.chunk(events, this.config.batchSize);

    for (const batch of batches) {
      const payload = batch.map((event) => ({
        log_source_id: this.config.logSourceIdentifier,
        ...event.data,
        ce_type: event.type,
        ce_source: event.source,
        ce_time: event.time,
        ce_id: event.id,
      }));

      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const res = await fetch(
            `${this.config.apiUrl}/api/data_ingestion/events`,
            {
              method: 'POST',
              headers: {
                SEC: this.config.apiToken!,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(payload),
            },
          );

          if (res.ok) {
            sent += batch.length;
            break;
          }

          if (attempt === this.config.retryAttempts) {
            const errorText = await res.text();
            errors.push(`QRadar REST error ${res.status}: ${errorText}`);
            failed += batch.length;
          } else {
            await this.delay(this.config.retryDelayMs * (attempt + 1));
          }
        } catch (err) {
          if (attempt === this.config.retryAttempts) {
            errors.push(
              `QRadar REST connection error: ${err instanceof Error ? err.message : String(err)}`,
            );
            failed += batch.length;
          } else {
            await this.delay(this.config.retryDelayMs * (attempt + 1));
          }
        }
      }
    }

    return { success: failed === 0, sent, failed, errors };
  }

  // ---------------------------------------------------------------------------
  // Syslog transport
  // ---------------------------------------------------------------------------

  private toCEF(event: CloudEvent): string {
    const severity = typeof event.data['severity'] === 'string'
      ? (CEF_SEVERITY_MAP[event.data['severity'] as string] ?? 5)
      : 5;

    const extensions: string[] = [
      `msg=${this.escapeCef(event.type)}`,
      `src=${this.escapeCef(event.source)}`,
      `externalId=${this.escapeCef(event.id)}`,
      `rt=${new Date(event.time).getTime()}`,
    ];

    if (event.subject) {
      extensions.push(`cs1=${this.escapeCef(event.subject)}`);
      extensions.push('cs1Label=Subject');
    }

    // Add key data fields
    for (const [key, value] of Object.entries(event.data)) {
      if (value !== null && value !== undefined && typeof value !== 'object') {
        extensions.push(`cs2=${this.escapeCef(String(value))}`);
        extensions.push(`cs2Label=${key}`);
        break; // CEF has limited custom string fields
      }
    }

    return [
      'CEF:0',
      'CVERiskPilot',
      'VulnMgmt',
      '1.0',
      event.type,
      event.subject ?? event.type,
      String(severity),
      extensions.join(' '),
    ].join('|');
  }

  private escapeCef(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\|/g, '\\|')
      .replace(/\n/g, '\\n')
      .replace(/=/g, '\\=');
  }

  private sendSyslog(message: string): Promise<void> {
    if (this.config.protocol === 'udp') {
      return this.sendUdp(message);
    }
    return this.sendTcp(message);
  }

  private sendUdp(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const client: Socket = createSocket('udp4');
      const buf = Buffer.from(message);
      client.send(buf, 0, buf.length, this.config.port, this.config.host, (err) => {
        client.close();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private sendTcp(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const client: NetSocket = createConnection(
        { host: this.config.host, port: this.config.port },
        () => {
          client.write(message + '\n', (err) => {
            client.end();
            if (err) reject(err);
            else resolve();
          });
        },
      );
      client.on('error', reject);
    });
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
