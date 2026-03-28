// ---------------------------------------------------------------------------
// Slack webhook notifier — Block Kit rich messages for pipeline scan results
// ---------------------------------------------------------------------------

import type {
  PipelineScanResult,
  ComplianceAlert,
  PipelineVerdict,
} from '../notifications/pipeline-types';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;
const REQUEST_TIMEOUT_MS = 10_000;

const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\//;

/**
 * Validate that a URL looks like a legitimate Slack incoming webhook.
 */
export function isValidSlackWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && SLACK_WEBHOOK_PATTERN.test(url);
  } catch {
    return false;
  }
}

function verdictEmoji(verdict: PipelineVerdict): string {
  switch (verdict) {
    case 'PASS':
      return ':white_check_mark: PASS';
    case 'FAIL':
      return ':x: FAIL';
    case 'WARN':
      return ':warning: WARN';
  }
}

function severityLine(label: string, count: number): string {
  return `*${label}:* ${count}`;
}

/**
 * SlackNotifier sends rich Block Kit messages to a Slack incoming webhook.
 */
export class SlackNotifier {
  private readonly webhookUrl: string;

  constructor(webhookUrl: string) {
    if (!isValidSlackWebhookUrl(webhookUrl)) {
      throw new Error(
        `Invalid Slack webhook URL. Must start with https://hooks.slack.com/`,
      );
    }
    this.webhookUrl = webhookUrl;
  }

  /**
   * Send a pipeline scan result notification to Slack using Block Kit.
   */
  async sendPipelineScanResult(result: PipelineScanResult): Promise<void> {
    const s = result.severityCounts;
    const controlsFailed = result.complianceControls.filter(
      (c) => c.status === 'fail',
    );

    const blocks: Record<string, unknown>[] = [
      // Header
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':shield: CVERiskPilot Pipeline Scan',
          emoji: true,
        },
      },
      // Verdict + repo info
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*Verdict:* ${verdictEmoji(result.verdict)}`,
            `*Repository:* \`${result.repository}\``,
            `*Branch:* \`${result.branch}\``,
            `*Commit:* \`${result.commitSha}\``,
          ].join('\n'),
        },
      },
      { type: 'divider' },
      // Severity summary
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: severityLine('Critical', s.critical) },
          { type: 'mrkdwn', text: severityLine('High', s.high) },
          { type: 'mrkdwn', text: severityLine('Medium', s.medium) },
          { type: 'mrkdwn', text: severityLine('Low', s.low) },
          { type: 'mrkdwn', text: severityLine('Info', s.info) },
          {
            type: 'mrkdwn',
            text: `*Total:* ${result.totalFindings} (${result.newFindings} new, ${result.fixedFindings} fixed)`,
          },
        ],
      },
    ];

    // Compliance controls (only if any failed)
    if (controlsFailed.length > 0) {
      const controlLines = controlsFailed
        .slice(0, 10) // cap at 10 to stay within Slack limits
        .map((c) => `- \`${c.controlId}\` ${c.title} (${c.framework})`)
        .join('\n');

      blocks.push(
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*:rotating_light: Failed Compliance Controls (${controlsFailed.length}):*\n${controlLines}`,
          },
        },
      );
    }

    // POAM entries
    if (result.poamEntriesCreated > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*POAM Entries Created:* ${result.poamEntriesCreated}`,
        },
      });
    }

    // Action button
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Full Results',
            emoji: true,
          },
          url: result.dashboardUrl,
          style: result.verdict === 'FAIL' ? 'danger' : 'primary',
        },
      ],
    });

    // Context footer
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: [
            `Scan completed at ${result.completedAt}`,
            result.frameworks.length > 0
              ? `Frameworks: ${result.frameworks.join(', ')}`
              : null,
          ]
            .filter(Boolean)
            .join(' | '),
        },
      ],
    });

    await this.postMessage({ blocks });
  }

  /**
   * Send a compliance policy violation alert to Slack.
   */
  async sendComplianceAlert(alert: ComplianceAlert): Promise<void> {
    const severityEmoji =
      alert.severity === 'critical'
        ? ':rotating_light:'
        : alert.severity === 'high'
          ? ':red_circle:'
          : alert.severity === 'medium'
            ? ':large_orange_circle:'
            : ':large_yellow_circle:';

    const blocks: Record<string, unknown>[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':shield: CVERiskPilot Compliance Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `${severityEmoji} *${alert.severity.toUpperCase()}* — Compliance Violation Detected`,
            '',
            `*Framework:* ${alert.framework}`,
            `*Control:* \`${alert.controlId}\` — ${alert.controlTitle}`,
            alert.repository ? `*Repository:* \`${alert.repository}\`` : null,
            '',
            alert.description,
          ]
            .filter((line) => line !== null)
            .join('\n'),
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Details', emoji: true },
            url: alert.dashboardUrl,
            style: 'danger',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Detected at ${alert.detectedAt}`,
          },
        ],
      },
    ];

    await this.postMessage({ blocks });
  }

  /**
   * POST a message payload to the Slack webhook with retry + exponential backoff.
   */
  private async postMessage(payload: Record<string, unknown>): Promise<void> {
    const body = JSON.stringify(payload);
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.ok) {
          return;
        }

        lastError = `Slack webhook returned HTTP ${response.status}: ${response.statusText}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error(
      `[slack-notifier] Failed after ${MAX_RETRIES} attempts: ${lastError}`,
    );
    throw new Error(`Slack notification failed after ${MAX_RETRIES} attempts: ${lastError}`);
  }
}
