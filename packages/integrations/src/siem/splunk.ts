// ---------------------------------------------------------------------------
// Splunk HEC Exporter (t110)
// ---------------------------------------------------------------------------

import type {
  SplunkConfig,
  CloudEvent,
  SIEMExporter,
  SIEMExportResult,
} from './types';

interface SplunkHECEvent {
  time: number;
  host: string;
  source: string;
  sourcetype: string;
  index?: string;
  event: Record<string, unknown>;
}

export class SplunkExporter implements SIEMExporter {
  readonly type = 'splunk';
  private readonly config: SplunkConfig;

  constructor(config: SplunkConfig) {
    this.config = config;
  }

  async sendEvents(events: CloudEvent[]): Promise<SIEMExportResult> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    // Batch events for HEC
    const batches = this.chunk(events, this.config.batchSize);

    for (const batch of batches) {
      const hecEvents = batch.map((event) => this.toHECEvent(event));
      const body = hecEvents.map((e) => JSON.stringify(e)).join('\n');

      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const res = await fetch(this.config.hecUrl, {
            method: 'POST',
            headers: {
              Authorization: `Splunk ${this.config.hecToken}`,
              'Content-Type': 'application/json',
            },
            body,
          });

          if (res.ok) {
            sent += batch.length;
            break;
          }

          if (attempt === this.config.retryAttempts) {
            const errorText = await res.text();
            errors.push(`Splunk HEC error ${res.status}: ${errorText}`);
            failed += batch.length;
          } else {
            await this.delay(this.config.retryDelayMs * (attempt + 1));
          }
        } catch (err) {
          if (attempt === this.config.retryAttempts) {
            errors.push(
              `Splunk HEC connection error: ${err instanceof Error ? err.message : String(err)}`,
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

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(this.config.hecUrl, {
        method: 'POST',
        headers: {
          Authorization: `Splunk ${this.config.hecToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'CVERiskPilot connection test',
          sourcetype: '_json',
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private toHECEvent(event: CloudEvent): SplunkHECEvent {
    return {
      time: new Date(event.time).getTime() / 1000,
      host: event.source,
      source: this.config.source ?? 'cveriskpilot',
      sourcetype: this.config.sourcetype ?? '_json',
      index: this.config.index,
      event: {
        ...event.data,
        ce_id: event.id,
        ce_type: event.type,
        ce_source: event.source,
        ce_subject: event.subject,
        ce_specversion: event.specversion,
      },
    };
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
