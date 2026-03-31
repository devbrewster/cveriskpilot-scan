// @cveriskpilot/integrations — barrel exports

export { JiraClient, JiraApiError } from './jira/client';
export { pushCaseToJira, pullJiraStatus, syncAllTickets } from './jira/sync';
export type { PushResult, PullResult, SyncAllResult } from './jira/sync';
export {
  DEFAULT_JIRA_TO_CASE_STATUS,
  DEFAULT_CASE_TO_JIRA_STATUS,
  mapJiraStatusToCaseStatus,
  mapCaseStatusToJiraTransition,
} from './jira/status-mapping';
export type {
  JiraClientConfig,
  JiraOrgConfig,
  JiraIssue,
  JiraCreateIssueRequest,
  JiraCreateIssueResponse,
  JiraTransition,
  JiraTransitionsResponse,
  JiraSearchResponse,
  JiraError,
  JiraDocContent,
} from './jira/types';

// Webhooks
export { sendWebhook, generateSignature, verifySignature } from './webhooks/webhook-sender';
export type { WebhookPayload, WebhookEndpoint, WebhookEventType } from './webhooks/types';
export { WEBHOOK_EVENT_TYPES } from './webhooks/types';
export {
  DeliveryTracker,
  getDeliveryTracker,
  resetDeliveryTracker,
} from './webhooks/delivery-tracker';
export type {
  DeliveryRecord,
  DeliveryAttempt,
  DeliveryTrackerConfig,
} from './webhooks/delivery-tracker';
export {
  emitWebhookEvent,
  buildCloudEvent,
  emitCaseCreated,
  emitCaseUpdated,
  emitCaseClosed,
  emitSlaBreached,
  emitScanCompleted,
  emitFindingNew,
  EMITTER_EVENT_TYPES,
} from './webhooks/event-emitter';
export type {
  CloudEvent as WebhookCloudEvent,
  EmitterEventType,
  RegisteredEndpoint,
  EmitResult,
} from './webhooks/event-emitter';

// Scanner connectors
export {
  registerConnector,
  processHeartbeat,
  getConnectorStatus,
  rotateConnectorKey,
  getConnector,
  updateConnector,
  deleteConnector,
  triggerScan,
} from './connectors/connector-manager';
export type {
  ConnectorConfig,
  ConnectorHeartbeat,
  ConnectorRecord,
  ConnectorType,
  ConnectorMode,
  ConnectorStatus,
  ConnectorAuthConfig,
  ScanTriggerConfig,
  ScanTriggerResult,
  PushWebhookConfig,
  PushRegistrationResult,
} from './connectors/types';
export {
  registerPushWebhook,
  verifyPushPayload,
  deregisterPushWebhook,
  getPushConfig,
} from './connectors/push-registry';

// ServiceNow
export { ServiceNowClient, ServiceNowApiError } from './servicenow/client';
export type {
  ServiceNowConfig,
  ServiceNowIncident,
  CreateIncidentData,
  IncidentQueryFilter,
} from './servicenow/client';
export { ServiceNowSync } from './servicenow/sync';
export type { SyncMapping, SyncResult, SyncAuditEntry, CaseProvider } from './servicenow/sync';
export {
  mapCaseToIncident,
  mapIncidentToCase,
  mapSeverityToSnSeverity,
  mapSeverityToSnPriority,
  mapSnStateToCaseStatus,
  mapCaseStatusToSnState,
} from './servicenow/mapping';
export type { CaseFields } from './servicenow/mapping';

// SIEM Export
export {
  CloudEventsFormatter,
  SplunkExporter,
  QRadarExporter,
  SentinelExporter,
} from './siem/index';
export type {
  SIEMConfig,
  SplunkConfig,
  QRadarConfig,
  SentinelConfig,
  CloudEvent,
  SIEMExportJob,
  FindingEventData,
  CaseEventData,
  ComplianceEventData,
  SIEMExporter,
  SIEMExportResult,
} from './siem/index';

// HackerOne Bug Bounty
export { HackerOneClient, HackerOneApiError } from './hackerone/client';
export type {
  HackerOneConfig,
  HackerOneReport,
  ReportFilters,
} from './hackerone/client';
export { HackerOneIngestion } from './hackerone/ingestion';
export type { IngestionResult, DedupConfig } from './hackerone/ingestion';

// Slack
export { SlackNotifier, isValidSlackWebhookUrl } from './slack/index';

// Microsoft Teams
export { TeamsNotifier, isValidTeamsWebhookUrl } from './teams/index';

// Pipeline Notifications
export { PipelineNotificationDispatcher } from './notifications/index';
export type {
  DispatchResult,
  PipelineScanResult,
  ComplianceAlert,
  NotificationChannel,
  NotificationChannelConfig,
  PipelineVerdict,
  SeverityCounts,
  ComplianceControlResult,
} from './notifications/index';

// Cloud Posture (AWS Security Hub, GCP SCC)
export { SecurityHubClient } from './cloud-posture/security-hub';
export { GCPSecurityCommandCenter } from './cloud-posture/gcp-scc';
export type {
  ASFFinding,
  SecurityHubConfig,
  SecurityHubFilters,
  SCCFinding,
  SCCConfig,
  SCCFilters,
  PostureFinding,
} from './cloud-posture/types';
