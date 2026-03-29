import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';
import {
  ServiceNowClient,
  mapIncidentToCase,
} from '@cveriskpilot/integrations';
import type { ServiceNowConfig } from '@cveriskpilot/integrations';

interface StoredServiceNowConfig {
  instanceUrl: string;
  authType: 'basic' | 'oauth2';
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  assignmentGroup?: string;
  category?: string;
}

/**
 * Build a ServiceNowConfig from the stored org config.
 */
function buildClientConfig(stored: StoredServiceNowConfig): ServiceNowConfig {
  if (stored.authType === 'oauth2') {
    return {
      instanceUrl: stored.instanceUrl,
      auth: {
        type: 'oauth2',
        clientId: stored.clientId ?? '',
        clientSecret: stored.clientSecret ?? '',
        tokenUrl: stored.tokenUrl,
      },
    };
  }

  return {
    instanceUrl: stored.instanceUrl,
    auth: {
      type: 'basic',
      username: stored.username ?? '',
      password: stored.password ?? '',
    },
  };
}

interface SyncResultEntry {
  ticketId: string;
  ticketKey: string;
  success: boolean;
  newStatus?: string;
  error?: string;
}

/**
 * POST — sync all ServiceNow-linked tickets for an organization.
 *
 * For each open ticket with system='servicenow', fetch the current incident
 * state from ServiceNow and update the local Ticket + VulnerabilityCase status.
 *
 * Body: { organizationId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { organizationId } = session;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const settings = (org.entitlements ?? {}) as Record<string, unknown>;
    const snConfig = settings.servicenow as StoredServiceNowConfig | undefined;

    if (!snConfig?.instanceUrl) {
      return NextResponse.json(
        { error: 'ServiceNow integration is not configured for this organization' },
        { status: 422 },
      );
    }

    // Validate required auth credentials
    if (snConfig.authType === 'oauth2') {
      if (!snConfig.clientId || !snConfig.clientSecret) {
        return NextResponse.json(
          { error: 'ServiceNow OAuth2 credentials are incomplete' },
          { status: 422 },
        );
      }
    } else {
      if (!snConfig.username || !snConfig.password) {
        return NextResponse.json(
          { error: 'ServiceNow basic auth credentials are incomplete' },
          { status: 422 },
        );
      }
    }

    const clientConfig = buildClientConfig(snConfig);
    const client = new ServiceNowClient(clientConfig);

    // Find all ServiceNow tickets belonging to cases in this org
    // that are not yet in a terminal status
    const tickets = await prisma.ticket.findMany({
      where: {
        system: 'servicenow',
        status: { notIn: ['Closed', 'Canceled'] },
        vulnerabilityCase: { organizationId },
      },
      select: {
        id: true,
        ticketKey: true,
        ticketUrl: true,
        vulnerabilityCaseId: true,
      },
    });

    if (tickets.length === 0) {
      return NextResponse.json({ total: 0, synced: 0, results: [] });
    }

    const results: SyncResultEntry[] = [];

    for (const ticket of tickets) {
      try {
        // ticketKey stores the incident number (e.g. INC0010001).
        // We need the sys_id to fetch from ServiceNow API.
        // Query by number to resolve the sys_id.
        const incidents = await client.queryIncidents({
          sysparm_query: `number=${ticket.ticketKey}`,
          sysparm_limit: 1,
        });

        if (incidents.length === 0) {
          results.push({
            ticketId: ticket.id,
            ticketKey: ticket.ticketKey,
            success: false,
            error: `Incident ${ticket.ticketKey} not found in ServiceNow`,
          });
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              lastSyncError: `Incident ${ticket.ticketKey} not found in ServiceNow`,
              syncedAt: new Date(),
            },
          });
          continue;
        }

        const incident = incidents[0];
        const caseUpdate = mapIncidentToCase(incident);

        // Update the ticket record
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: incident.state,
            assignee: incident.assigned_to || null,
            syncedAt: new Date(),
            lastSyncError: null,
          },
        });

        // Update the vulnerability case status
        await prisma.vulnerabilityCase.update({
          where: { id: ticket.vulnerabilityCaseId },
          data: {
            status: caseUpdate.status as any,
          },
        });

        results.push({
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          success: true,
          newStatus: caseUpdate.status,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({
          ticketId: ticket.id,
          ticketKey: ticket.ticketKey,
          success: false,
          error: errorMessage,
        });

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            lastSyncError: errorMessage,
            syncedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      total: tickets.length,
      synced: results.filter((r) => r.success).length,
      errors: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('[API] POST /api/integrations/servicenow/sync error:', error);
    return NextResponse.json(
      { error: (error as Error).message ?? 'Failed to sync ServiceNow incidents' },
      { status: 500 },
    );
  }
}
