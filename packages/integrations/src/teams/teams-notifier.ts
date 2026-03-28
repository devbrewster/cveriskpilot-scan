// ---------------------------------------------------------------------------
// Microsoft Teams webhook notifier — Adaptive Cards for pipeline scan results
// ---------------------------------------------------------------------------

import type {
  PipelineScanResult,
  ComplianceAlert,
  PipelineVerdict,
} from '../notifications/pipeline-types';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;
const REQUEST_TIMEOUT_MS = 10_000;

const TEAMS_WEBHOOK_PATTERN = /^https:\/\/.*\.webhook\.office\.com\//;

/**
 * Validate that a URL looks like a legitimate Microsoft Teams incoming webhook.
 */
export function isValidTeamsWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && TEAMS_WEBHOOK_PATTERN.test(url);
  } catch {
    return false;
  }
}

function verdictDisplay(verdict: PipelineVerdict): { text: string; color: string } {
  switch (verdict) {
    case 'PASS':
      return { text: 'PASS', color: 'good' };
    case 'FAIL':
      return { text: 'FAIL', color: 'attention' };
    case 'WARN':
      return { text: 'WARN', color: 'warning' };
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'attention';
    case 'high':
      return 'attention';
    case 'medium':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * TeamsNotifier sends Adaptive Card messages to a Microsoft Teams incoming webhook.
 */
export class TeamsNotifier {
  private readonly webhookUrl: string;

  constructor(webhookUrl: string) {
    if (!isValidTeamsWebhookUrl(webhookUrl)) {
      throw new Error(
        `Invalid Teams webhook URL. Must match https://*.webhook.office.com/`,
      );
    }
    this.webhookUrl = webhookUrl;
  }

  /**
   * Send a pipeline scan result notification to Teams using Adaptive Cards.
   */
  async sendPipelineScanResult(result: PipelineScanResult): Promise<void> {
    const v = verdictDisplay(result.verdict);
    const s = result.severityCounts;
    const controlsFailed = result.complianceControls.filter(
      (c) => c.status === 'fail',
    );

    const cardBody: Record<string, unknown>[] = [
      // Title
      {
        type: 'TextBlock',
        size: 'Large',
        weight: 'Bolder',
        text: 'CVERiskPilot Pipeline Scan',
      },
      // Verdict + repo facts
      {
        type: 'FactSet',
        facts: [
          { title: 'Verdict', value: v.text },
          { title: 'Repository', value: result.repository },
          { title: 'Branch', value: result.branch },
          { title: 'Commit', value: result.commitSha },
          {
            title: 'Findings',
            value: `${result.totalFindings} total (${result.newFindings} new, ${result.fixedFindings} fixed)`,
          },
        ],
      },
      // Severity breakdown
      {
        type: 'TextBlock',
        text: 'Severity Breakdown',
        weight: 'Bolder',
        spacing: 'Medium',
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Critical', value: String(s.critical) },
          { title: 'High', value: String(s.high) },
          { title: 'Medium', value: String(s.medium) },
          { title: 'Low', value: String(s.low) },
          { title: 'Info', value: String(s.info) },
        ],
      },
    ];

    // Compliance controls (failed)
    if (controlsFailed.length > 0) {
      cardBody.push(
        {
          type: 'TextBlock',
          text: `Failed Compliance Controls (${controlsFailed.length})`,
          weight: 'Bolder',
          color: 'Attention',
          spacing: 'Medium',
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'auto',
              items: controlsFailed.slice(0, 10).map((c) => ({
                type: 'TextBlock',
                text: `**${c.controlId}**`,
                spacing: 'None',
              })),
            },
            {
              type: 'Column',
              width: 'stretch',
              items: controlsFailed.slice(0, 10).map((c) => ({
                type: 'TextBlock',
                text: `${c.title} (${c.framework})`,
                spacing: 'None',
              })),
            },
          ],
        },
      );
    }

    // POAM entries
    if (result.poamEntriesCreated > 0) {
      cardBody.push({
        type: 'TextBlock',
        text: `POAM Entries Created: **${result.poamEntriesCreated}**`,
        spacing: 'Medium',
      });
    }

    // Context footer
    const contextParts = [`Completed: ${result.completedAt}`];
    if (result.frameworks.length > 0) {
      contextParts.push(`Frameworks: ${result.frameworks.join(', ')}`);
    }
    cardBody.push({
      type: 'TextBlock',
      text: contextParts.join(' | '),
      size: 'Small',
      isSubtle: true,
      spacing: 'Medium',
    });

    const adaptiveCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: cardBody,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Results',
          url: result.dashboardUrl,
        },
      ],
    };

    const teamsPayload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: adaptiveCard,
        },
      ],
    };

    await this.postMessage(teamsPayload);
  }

  /**
   * Send a compliance policy violation alert to Teams.
   */
  async sendComplianceAlert(alert: ComplianceAlert): Promise<void> {
    const cardBody: Record<string, unknown>[] = [
      {
        type: 'TextBlock',
        size: 'Large',
        weight: 'Bolder',
        text: 'CVERiskPilot Compliance Alert',
        color: 'Attention',
      },
      {
        type: 'TextBlock',
        text: `**${alert.severity.toUpperCase()}** — Compliance Violation Detected`,
        color: severityColor(alert.severity),
        spacing: 'Small',
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Framework', value: alert.framework },
          { title: 'Control', value: `${alert.controlId} — ${alert.controlTitle}` },
          ...(alert.repository
            ? [{ title: 'Repository', value: alert.repository }]
            : []),
        ],
      },
      {
        type: 'TextBlock',
        text: alert.description,
        wrap: true,
        spacing: 'Medium',
      },
      {
        type: 'TextBlock',
        text: `Detected: ${alert.detectedAt}`,
        size: 'Small',
        isSubtle: true,
        spacing: 'Medium',
      },
    ];

    const adaptiveCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: cardBody,
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Details',
          url: alert.dashboardUrl,
        },
      ],
    };

    const teamsPayload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: adaptiveCard,
        },
      ],
    };

    await this.postMessage(teamsPayload);
  }

  /**
   * POST a message payload to the Teams webhook with retry + exponential backoff.
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

        lastError = `Teams webhook returned HTTP ${response.status}: ${response.statusText}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error(
      `[teams-notifier] Failed after ${MAX_RETRIES} attempts: ${lastError}`,
    );
    throw new Error(`Teams notification failed after ${MAX_RETRIES} attempts: ${lastError}`);
  }
}
