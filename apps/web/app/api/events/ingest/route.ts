// Signal Engine — POST /api/events/ingest
//
// External scanner webhook ingestion endpoint.
// Accepts finding/scan events from scanners, creates Finding records,
// and broadcasts to connected SSE clients.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requirePerm } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { getOrgTier, checkBillingGate } from '@/lib/billing';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Payload validation
// ---------------------------------------------------------------------------

const IngestEventSchema = z.object({
  eventType: z.enum(['finding.new', 'finding.updated', 'scan.completed']),
  source: z.string().min(1).max(256),
  data: z.object({
    cveIds: z.array(z.string()).optional(),
    severity: z.string().optional(),
    title: z.string().min(1).max(1024),
    asset: z.string().optional(),
    description: z.string().optional(),
    rawData: z.record(z.string(), z.unknown()).optional(),
  }),
});

type IngestEvent = z.infer<typeof IngestEventSchema>;

// ---------------------------------------------------------------------------
// POST /api/events/ingest
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth via API key (X-API-Key header) — requireAuth handles API key auth
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // No CSRF check — external callers use API keys

    // RBAC
    const permError = requirePerm(session.role, 'scans:upload');
    if (permError) return permError;

    // Billing gate — continuous_ingest is a PRO+ feature
    const orgId = session.organizationId;
    const tier = await getOrgTier(orgId);
    const gate = await checkBillingGate(orgId, tier, 'continuous_ingest');
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: gate.reason ?? 'Continuous ingestion requires a Pro or higher plan',
          code: 'BILLING_LIMIT_EXCEEDED',
          upgradeRequired: gate.upgradeRequired,
          upgradeUrl: '/settings/billing',
        },
        { status: 402 },
      );
    }

    // Parse and validate payload
    const body: unknown = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = IngestEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const event: IngestEvent = parsed.data;
    const eventId = randomUUID();

    // For finding.new events, create a Finding record
    if (event.eventType === 'finding.new') {
      // Resolve the default client for this org (first client, or fail gracefully)
      const defaultClient = await prisma.client.findFirst({
        where: { organizationId: orgId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultClient) {
        return NextResponse.json(
          { error: 'No client configured for this organization. Create a client first.' },
          { status: 422 },
        );
      }

      // Resolve or create asset if specified
      let assetId: string;
      if (event.data.asset) {
        const existing = await prisma.asset.findFirst({
          where: {
            organizationId: orgId,
            name: event.data.asset,
          },
          select: { id: true },
        });
        if (existing) {
          assetId = existing.id;
        } else {
          const newAsset = await prisma.asset.create({
            data: {
              organizationId: orgId,
              clientId: defaultClient.id,
              name: event.data.asset,
              type: 'HOST',
            },
            select: { id: true },
          });
          assetId = newAsset.id;
        }
      } else {
        // Use or create a placeholder "Unknown" asset
        const placeholder = await prisma.asset.findFirst({
          where: {
            organizationId: orgId,
            name: 'Unknown (Signal Engine)',
          },
          select: { id: true },
        });
        if (placeholder) {
          assetId = placeholder.id;
        } else {
          const newPlaceholder = await prisma.asset.create({
            data: {
              organizationId: orgId,
              clientId: defaultClient.id,
              name: 'Unknown (Signal Engine)',
              type: 'HOST',
            },
            select: { id: true },
          });
          assetId = newPlaceholder.id;
        }
      }

      // Build dedup key from CVE IDs + asset + source
      const dedupParts = [
        orgId,
        event.source,
        event.data.asset ?? 'unknown',
        ...(event.data.cveIds ?? [event.data.title]),
      ];
      const dedupKey = dedupParts.join('::');

      await prisma.finding.create({
        data: {
          organizationId: orgId,
          clientId: defaultClient.id,
          assetId,
          scannerType: 'SCA',
          scannerName: event.source,
          dedupKey,
          discoveredAt: new Date(),
          observations: JSON.parse(JSON.stringify({
            eventId,
            source: event.source,
            title: event.data.title,
            cveIds: event.data.cveIds ?? [],
            severity: event.data.severity ?? 'UNKNOWN',
            description: event.data.description ?? '',
            rawData: event.data.rawData ?? {},
          })),
        },
      });
    }

    // Audit log
    logAudit({
      organizationId: orgId,
      actorId: session.userId,
      action: 'CREATE',
      entityType: 'SignalEvent',
      entityId: eventId,
      details: {
        eventType: event.eventType,
        source: event.source,
        title: event.data.title,
        cveIds: event.data.cveIds,
      },
    });

    return NextResponse.json(
      { eventId, status: 'accepted' },
      { status: 202 },
    );
  } catch (error) {
    console.error('[Signal Engine] Ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
