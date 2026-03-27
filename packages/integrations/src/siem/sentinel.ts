// ---------------------------------------------------------------------------
// Azure Sentinel Data Collector API Exporter (t110)
// ---------------------------------------------------------------------------

import { createHmac } from 'node:crypto';
import type {
  SentinelConfig,
  CloudEvent,
  SIEMExporter,
  SIEMExportResult,
} from './types';

const SENTINEL_API_VERSION = '2016-04-01';
const SENTINEL_RESOURCE = '/api/logs';

export class SentinelExporter implements SIEMExporter {
  readonly type = 'sentinel';
  private readonly config: SentinelConfig;

  constructor(config: SentinelConfig) {
    this.config = config;
  }

  async sendEvents(events: CloudEvent[]): Promise<SIEMExportResult> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    const batches = this.chunk(events, this.config.batchSize);

    for (const batch of batches) {
      const body = JSON.stringify(
        batch.map((event) => ({
          ...event.data,
          CloudEventId: event.id,
          CloudEventType: event.type,
          CloudEventSource: event.source,
          CloudEventSubject: event.subject,
          TimeGenerated: event.time,
        })),
      );

      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          const dateString = new Date().toUTCString();
          const signature = this.buildSignature(
            dateString,
            body.length,
            'POST',
            'application/json',
            SENTINEL_RESOURCE,
          );

          const url =
            `https://${this.config.workspaceId}.ods.opinsights.azure.com` +
            `${SENTINEL_RESOURCE}?api-version=${this.config.apiVersion ?? SENTINEL_API_VERSION}`;

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: signature,
              'Log-Type': this.config.logType,
              'x-ms-date': dateString,
              'time-generated-field': 'TimeGenerated',
            },
            body,
          });

          if (res.ok || res.status === 200) {
            sent += batch.length;
            break;
          }

          if (attempt === this.config.retryAttempts) {
            const errorText = await res.text();
            errors.push(`Sentinel API error ${res.status}: ${errorText}`);
            failed += batch.length;
          } else {
            await this.delay(this.config.retryDelayMs * (attempt + 1));
          }
        } catch (err) {
          if (attempt === this.config.retryAttempts) {
            errors.push(
              `Sentinel connection error: ${err instanceof Error ? err.message : String(err)}`,
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
    const testPayload = JSON.stringify([
      {
        CloudEventType: 'com.cveriskpilot.test',
        Message: 'CVERiskPilot connection test',
        TimeGenerated: new Date().toISOString(),
      },
    ]);

    try {
      const dateString = new Date().toUTCString();
      const signature = this.buildSignature(
        dateString,
        testPayload.length,
        'POST',
        'application/json',
        SENTINEL_RESOURCE,
      );

      const url =
        `https://${this.config.workspaceId}.ods.opinsights.azure.com` +
        `${SENTINEL_RESOURCE}?api-version=${this.config.apiVersion ?? SENTINEL_API_VERSION}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: signature,
          'Log-Type': this.config.logType,
          'x-ms-date': dateString,
          'time-generated-field': 'TimeGenerated',
        },
        body: testPayload,
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Signature generation for Azure Data Collector API
  // ---------------------------------------------------------------------------

  private buildSignature(
    date: string,
    contentLength: number,
    method: string,
    contentType: string,
    resource: string,
  ): string {
    const stringToSign = [
      method,
      String(contentLength),
      contentType,
      `x-ms-date:${date}`,
      resource,
    ].join('\n');

    const decodedKey = Buffer.from(this.config.sharedKey, 'base64');
    const hmac = createHmac('sha256', decodedKey)
      .update(stringToSign, 'utf8')
      .digest('base64');

    return `SharedKey ${this.config.workspaceId}:${hmac}`;
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
