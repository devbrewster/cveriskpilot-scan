// ---------------------------------------------------------------------------
// Pipeline notification dispatcher — routes scan results to configured channels
// ---------------------------------------------------------------------------

import type {
  PipelineScanResult,
  ComplianceAlert,
  NotificationChannelConfig,
} from './pipeline-types';
import { SlackNotifier } from '../slack/slack-notifier';
import { TeamsNotifier } from '../teams/teams-notifier';
import { createLogger } from '@cveriskpilot/shared';

const logger = createLogger('integrations:pipeline-dispatcher');

export interface DispatchResult {
  channelId: string;
  channel: string;
  success: boolean;
  error?: string;
}

/**
 * PipelineNotificationDispatcher routes pipeline scan results and compliance
 * alerts to all configured notification channels. Each channel is dispatched
 * independently — a failure on one channel does not block others.
 */
export class PipelineNotificationDispatcher {
  /**
   * Dispatch a pipeline scan result to all enabled channels.
   */
  async dispatch(
    result: PipelineScanResult,
    channels: NotificationChannelConfig[],
  ): Promise<DispatchResult[]> {
    const enabled = channels.filter((c) => c.enabled);

    const settled = await Promise.allSettled(
      enabled.map(async (config): Promise<DispatchResult> => {
        try {
          await this.sendToChannel(config, result);
          logger.info(
            `Delivered scan result to ${config.channel} channel "${config.label ?? config.id}"`,
          );
          return { channelId: config.id, channel: config.channel, success: true };
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error(
            `Failed to deliver to ${config.channel} channel "${config.label ?? config.id}": ${error}`,
          );
          return { channelId: config.id, channel: config.channel, success: false, error };
        }
      }),
    );

    return settled.map((s) =>
      s.status === 'fulfilled'
        ? s.value
        : {
            channelId: 'unknown',
            channel: 'unknown',
            success: false,
            error: s.reason instanceof Error ? s.reason.message : String(s.reason),
          },
    );
  }

  /**
   * Dispatch a compliance alert to all enabled channels.
   */
  async dispatchComplianceAlert(
    alert: ComplianceAlert,
    channels: NotificationChannelConfig[],
  ): Promise<DispatchResult[]> {
    const enabled = channels.filter((c) => c.enabled);

    const settled = await Promise.allSettled(
      enabled.map(async (config): Promise<DispatchResult> => {
        try {
          await this.sendComplianceAlertToChannel(config, alert);
          logger.info(
            `Delivered compliance alert to ${config.channel} channel "${config.label ?? config.id}"`,
          );
          return { channelId: config.id, channel: config.channel, success: true };
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error(
            `Failed compliance alert to ${config.channel} channel "${config.label ?? config.id}": ${error}`,
          );
          return { channelId: config.id, channel: config.channel, success: false, error };
        }
      }),
    );

    return settled.map((s) =>
      s.status === 'fulfilled'
        ? s.value
        : {
            channelId: 'unknown',
            channel: 'unknown',
            success: false,
            error: s.reason instanceof Error ? s.reason.message : String(s.reason),
          },
    );
  }

  private async sendToChannel(
    config: NotificationChannelConfig,
    result: PipelineScanResult,
  ): Promise<void> {
    switch (config.channel) {
      case 'slack': {
        const notifier = new SlackNotifier(config.webhookUrl);
        await notifier.sendPipelineScanResult(result);
        return;
      }
      case 'teams': {
        const notifier = new TeamsNotifier(config.webhookUrl);
        await notifier.sendPipelineScanResult(result);
        return;
      }
      case 'webhook':
        // Generic webhook channels are handled by the existing webhook-sender
        // infrastructure. This dispatcher focuses on Slack/Teams rich formatting.
        logger.warn(
          `Generic webhook channel "${config.id}" should use emitWebhookEvent() instead.`,
        );
        return;
      default:
        throw new Error(`Unsupported notification channel: ${config.channel}`);
    }
  }

  private async sendComplianceAlertToChannel(
    config: NotificationChannelConfig,
    alert: ComplianceAlert,
  ): Promise<void> {
    switch (config.channel) {
      case 'slack': {
        const notifier = new SlackNotifier(config.webhookUrl);
        await notifier.sendComplianceAlert(alert);
        return;
      }
      case 'teams': {
        const notifier = new TeamsNotifier(config.webhookUrl);
        await notifier.sendComplianceAlert(alert);
        return;
      }
      case 'webhook':
        logger.warn(
          `Generic webhook channel "${config.id}" should use emitWebhookEvent() instead.`,
        );
        return;
      default:
        throw new Error(`Unsupported notification channel: ${config.channel}`);
    }
  }
}
