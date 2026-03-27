import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Webhook configuration is stored in a JSON column on the Organization model.
// Since the current schema does not have a dedicated WebhookEndpoint table, we
// store webhook configs as an array inside the organization's `entitlements`
// JSON field under the key "webhookEndpoints".  This avoids a schema migration
// while still being fully functional.
// ---------------------------------------------------------------------------

interface WebhookEndpointConfig {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function getEndpoints(entitlements: unknown): WebhookEndpointConfig[] {
  if (!entitlements || typeof entitlements !== 'object') return [];
  const ent = entitlements as Record<string, unknown>;
  if (!Array.isArray(ent.webhookEndpoints)) return [];
  return ent.webhookEndpoints as WebhookEndpointConfig[];
}

// ---------------------------------------------------------------------------
// GET /api/webhooks/config — list webhook endpoints for an org
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { entitlements: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const endpoints = getEndpoints(org.entitlements);

    // Never expose secrets in list view
    const safe = endpoints.map(({ secret: _s, ...rest }: any) => ({
      ...rest,
      secretLast4: _s ? '****' + _s.slice(-4) : null,
    }));

    return NextResponse.json(safe);
  } catch (error) {
    console.error('[API] GET /api/webhooks/config error:', error);
    return NextResponse.json({ error: 'Failed to list webhooks' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/config — register a new webhook endpoint
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, url, secret, events } = body as {
      organizationId: string;
      url: string;
      secret: string;
      events: string[];
    };

    if (!organizationId || !url || !secret || !events?.length) {
      return NextResponse.json(
        { error: 'organizationId, url, secret, and events are required' },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { entitlements: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const existing = getEndpoints(org.entitlements);
    const newEndpoint: WebhookEndpointConfig = {
      id: crypto.randomUUID(),
      url,
      secret,
      events,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...existing, newEndpoint];
    const entitlements = {
      ...(typeof org.entitlements === 'object' && org.entitlements !== null
        ? org.entitlements
        : {}),
      webhookEndpoints: updated,
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { entitlements: entitlements as any },
    });

    return NextResponse.json(
      { ...newEndpoint, secret: undefined, secretLast4: '****' + secret.slice(-4) },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API] POST /api/webhooks/config error:', error);
    return NextResponse.json({ error: 'Failed to register webhook' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/webhooks/config — remove a webhook endpoint
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, endpointId } = body as {
      organizationId: string;
      endpointId: string;
    };

    if (!organizationId || !endpointId) {
      return NextResponse.json(
        { error: 'organizationId and endpointId are required' },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { entitlements: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const existing = getEndpoints(org.entitlements);
    const filtered = existing.filter((e) => e.id !== endpointId);

    if (filtered.length === existing.length) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    const entitlements = {
      ...(typeof org.entitlements === 'object' && org.entitlements !== null
        ? org.entitlements
        : {}),
      webhookEndpoints: filtered,
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { entitlements: entitlements as any },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/webhooks/config error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
