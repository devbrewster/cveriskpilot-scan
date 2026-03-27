// ---------------------------------------------------------------------------
// CloudEvents Formatter (t110)
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';
import type {
  CloudEvent,
  FindingEventData,
  CaseEventData,
  ComplianceEventData,
} from './types';

const SOURCE = 'cveriskpilot.io';

/**
 * Converts CVERiskPilot domain events into CloudEvents v1.0 format.
 */
export class CloudEventsFormatter {
  private readonly source: string;

  constructor(source?: string) {
    this.source = source ?? SOURCE;
  }

  /**
   * Format a finding event (new or updated finding).
   */
  formatFindingEvent(
    finding: FindingEventData,
    action: 'created' | 'updated' | 'resolved' | 'closed' = 'created',
  ): CloudEvent {
    return {
      specversion: '1.0',
      id: randomUUID(),
      type: `com.cveriskpilot.finding.${action}`,
      source: this.source,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      subject: finding.findingId,
      data: {
        findingId: finding.findingId,
        caseId: finding.caseId,
        title: finding.title,
        severity: finding.severity,
        cveIds: finding.cveIds,
        cvssScore: finding.cvssScore,
        epssScore: finding.epssScore,
        kevListed: finding.kevListed,
        assetName: finding.assetName,
        status: finding.status,
        discoveredAt: finding.discoveredAt,
        action,
      },
    };
  }

  /**
   * Format a case lifecycle event (e.g., status change, assignment).
   */
  formatCaseEvent(
    caseData: CaseEventData,
    action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'closed' = 'updated',
  ): CloudEvent {
    return {
      specversion: '1.0',
      id: randomUUID(),
      type: `com.cveriskpilot.case.${action}`,
      source: this.source,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      subject: caseData.caseId,
      data: {
        caseId: caseData.caseId,
        title: caseData.title,
        severity: caseData.severity,
        status: caseData.status,
        previousStatus: caseData.previousStatus,
        assignedTo: caseData.assignedTo,
        findingCount: caseData.findingCount,
        createdAt: caseData.createdAt,
        updatedAt: caseData.updatedAt,
        action,
      },
    };
  }

  /**
   * Format a compliance status change event.
   */
  formatComplianceEvent(
    event: ComplianceEventData,
    action: 'evaluated' | 'status_changed' | 'score_changed' = 'evaluated',
  ): CloudEvent {
    return {
      specversion: '1.0',
      id: randomUUID(),
      type: `com.cveriskpilot.compliance.${action}`,
      source: this.source,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      subject: `${event.frameworkId}/${event.controlId}`,
      data: {
        frameworkId: event.frameworkId,
        frameworkName: event.frameworkName,
        controlId: event.controlId,
        controlName: event.controlName,
        status: event.status,
        previousStatus: event.previousStatus,
        score: event.score,
        evaluatedAt: event.evaluatedAt,
        action,
      },
    };
  }
}
