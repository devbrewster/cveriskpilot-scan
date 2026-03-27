// ---------------------------------------------------------------------------
// ServiceNow Bi-directional Sync (t109)
// ---------------------------------------------------------------------------

import { ServiceNowClient } from './client';
import type { ServiceNowConfig, ServiceNowIncident } from './client';
import {
  mapCaseToIncident,
  mapIncidentToCase,
  mapCaseStatusToSnState,
} from './mapping';
import type { CaseFields } from './mapping';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncMapping {
  mappingId: string;
  caseId: string;
  incidentSysId: string;
  lastSyncedAt: Date;
  lastSyncDirection: 'TO_SERVICENOW' | 'FROM_SERVICENOW';
}

export interface SyncResult {
  success: boolean;
  direction: 'TO_SERVICENOW' | 'FROM_SERVICENOW' | 'BIDIRECTIONAL';
  caseId: string;
  incidentSysId?: string;
  incidentNumber?: string;
  error?: string;
  conflictResolved?: boolean;
}

export interface SyncAuditEntry {
  timestamp: Date;
  mappingId: string;
  action: 'CREATE' | 'UPDATE' | 'CONFLICT_RESOLVED';
  direction: 'TO_SERVICENOW' | 'FROM_SERVICENOW';
  details: Record<string, unknown>;
}

export interface CaseProvider {
  getCase(caseId: string): Promise<CaseFields | null>;
  updateCase(
    caseId: string,
    data: { status: string; resolvedAt?: string | null; closedAt?: string | null },
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// ServiceNowSync
// ---------------------------------------------------------------------------

export class ServiceNowSync {
  private readonly client: ServiceNowClient;
  private readonly caseProvider: CaseProvider;
  private mappings: Map<string, SyncMapping> = new Map();
  private auditLog: SyncAuditEntry[] = [];

  constructor(config: ServiceNowConfig, caseProvider: CaseProvider) {
    this.client = new ServiceNowClient(config);
    this.caseProvider = caseProvider;
  }

  /**
   * Sync a CVERiskPilot case to ServiceNow (create or update incident).
   */
  async syncCaseToIncident(caseId: string): Promise<SyncResult> {
    try {
      const caseData = await this.caseProvider.getCase(caseId);
      if (!caseData) {
        return {
          success: false,
          direction: 'TO_SERVICENOW',
          caseId,
          error: `Case ${caseId} not found`,
        };
      }

      // Check if mapping already exists
      const existingMapping = this.findMappingByCaseId(caseId);

      if (existingMapping) {
        // Update existing incident
        const incidentData = mapCaseToIncident(caseData);
        incidentData.state = mapCaseStatusToSnState(caseData.status);

        const incident = await this.client.updateIncident(
          existingMapping.incidentSysId,
          incidentData,
        );

        existingMapping.lastSyncedAt = new Date();
        existingMapping.lastSyncDirection = 'TO_SERVICENOW';

        this.recordAudit({
          timestamp: new Date(),
          mappingId: existingMapping.mappingId,
          action: 'UPDATE',
          direction: 'TO_SERVICENOW',
          details: { caseId, incidentSysId: incident.sys_id },
        });

        return {
          success: true,
          direction: 'TO_SERVICENOW',
          caseId,
          incidentSysId: incident.sys_id,
          incidentNumber: incident.number,
        };
      }

      // Create new incident
      const incidentData = mapCaseToIncident(caseData);
      const incident = await this.client.createIncident(incidentData);

      const mapping: SyncMapping = {
        mappingId: `map_${caseId}_${incident.sys_id}`,
        caseId,
        incidentSysId: incident.sys_id,
        lastSyncedAt: new Date(),
        lastSyncDirection: 'TO_SERVICENOW',
      };
      this.mappings.set(mapping.mappingId, mapping);

      this.recordAudit({
        timestamp: new Date(),
        mappingId: mapping.mappingId,
        action: 'CREATE',
        direction: 'TO_SERVICENOW',
        details: {
          caseId,
          incidentSysId: incident.sys_id,
          incidentNumber: incident.number,
        },
      });

      return {
        success: true,
        direction: 'TO_SERVICENOW',
        caseId,
        incidentSysId: incident.sys_id,
        incidentNumber: incident.number,
      };
    } catch (error) {
      return {
        success: false,
        direction: 'TO_SERVICENOW',
        caseId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Pull status updates from a ServiceNow incident back to a CVERiskPilot case.
   */
  async syncIncidentToCase(sysId: string): Promise<SyncResult> {
    try {
      const mapping = this.findMappingByIncidentId(sysId);
      if (!mapping) {
        return {
          success: false,
          direction: 'FROM_SERVICENOW',
          caseId: '',
          error: `No mapping found for incident ${sysId}`,
        };
      }

      const incident = await this.client.getIncident(sysId);
      const caseUpdate = mapIncidentToCase(incident);

      await this.caseProvider.updateCase(mapping.caseId, caseUpdate);

      mapping.lastSyncedAt = new Date();
      mapping.lastSyncDirection = 'FROM_SERVICENOW';

      this.recordAudit({
        timestamp: new Date(),
        mappingId: mapping.mappingId,
        action: 'UPDATE',
        direction: 'FROM_SERVICENOW',
        details: {
          caseId: mapping.caseId,
          incidentSysId: sysId,
          newStatus: caseUpdate.status,
        },
      });

      return {
        success: true,
        direction: 'FROM_SERVICENOW',
        caseId: mapping.caseId,
        incidentSysId: sysId,
      };
    } catch (error) {
      return {
        success: false,
        direction: 'FROM_SERVICENOW',
        caseId: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Full bidirectional sync. Uses latest-write-wins conflict resolution.
   */
  async bidirectionalSync(mappingId: string): Promise<SyncResult> {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      return {
        success: false,
        direction: 'BIDIRECTIONAL',
        caseId: '',
        error: `Mapping ${mappingId} not found`,
      };
    }

    try {
      const [caseData, incident] = await Promise.all([
        this.caseProvider.getCase(mapping.caseId),
        this.client.getIncident(mapping.incidentSysId),
      ]);

      if (!caseData) {
        return {
          success: false,
          direction: 'BIDIRECTIONAL',
          caseId: mapping.caseId,
          error: `Case ${mapping.caseId} not found`,
        };
      }

      // Conflict resolution: latest-write-wins
      const caseUpdatedAt = caseData.updatedAt ?? new Date(0);
      const incidentUpdatedAt = new Date(incident.sys_updated_on);
      let conflictResolved = false;

      if (incidentUpdatedAt > caseUpdatedAt) {
        // ServiceNow is newer — pull to case
        const caseUpdate = mapIncidentToCase(incident);
        await this.caseProvider.updateCase(mapping.caseId, caseUpdate);
        mapping.lastSyncDirection = 'FROM_SERVICENOW';
        conflictResolved = true;

        this.recordAudit({
          timestamp: new Date(),
          mappingId,
          action: 'CONFLICT_RESOLVED',
          direction: 'FROM_SERVICENOW',
          details: {
            reason: 'ServiceNow incident updated more recently',
            incidentUpdatedAt: incidentUpdatedAt.toISOString(),
            caseUpdatedAt: caseUpdatedAt.toISOString(),
          },
        });
      } else {
        // Case is newer (or same) — push to ServiceNow
        const incidentData = mapCaseToIncident(caseData);
        incidentData.state = mapCaseStatusToSnState(caseData.status);
        await this.client.updateIncident(mapping.incidentSysId, incidentData);
        mapping.lastSyncDirection = 'TO_SERVICENOW';

        if (incidentUpdatedAt.getTime() !== caseUpdatedAt.getTime()) {
          conflictResolved = true;
          this.recordAudit({
            timestamp: new Date(),
            mappingId,
            action: 'CONFLICT_RESOLVED',
            direction: 'TO_SERVICENOW',
            details: {
              reason: 'CVERiskPilot case updated more recently',
              incidentUpdatedAt: incidentUpdatedAt.toISOString(),
              caseUpdatedAt: caseUpdatedAt.toISOString(),
            },
          });
        }
      }

      mapping.lastSyncedAt = new Date();

      return {
        success: true,
        direction: 'BIDIRECTIONAL',
        caseId: mapping.caseId,
        incidentSysId: mapping.incidentSysId,
        conflictResolved,
      };
    } catch (error) {
      return {
        success: false,
        direction: 'BIDIRECTIONAL',
        caseId: mapping.caseId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the sync audit log.
   */
  getAuditLog(): ReadonlyArray<SyncAuditEntry> {
    return this.auditLog;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private findMappingByCaseId(caseId: string): SyncMapping | undefined {
    for (const mapping of this.mappings.values()) {
      if (mapping.caseId === caseId) return mapping;
    }
    return undefined;
  }

  private findMappingByIncidentId(sysId: string): SyncMapping | undefined {
    for (const mapping of this.mappings.values()) {
      if (mapping.incidentSysId === sysId) return mapping;
    }
    return undefined;
  }

  private recordAudit(entry: SyncAuditEntry): void {
    this.auditLog.push(entry);
  }
}
