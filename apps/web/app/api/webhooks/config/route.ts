import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';
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
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;

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
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;
    const body = await request.json();
    const { url, secret, events } = body as {
      url: string;
      secret: string;
      events: string[];
    };

    if (!url || !secret || !events?.length) {
      return NextResponse.json(
        { error: 'url, secret, and events are required' },
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
// PUT /api/webhooks/config — update an existing webhook endpoint
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;
    const body = await request.json();
    const { endpointId, url, events, active } = body as {
      endpointId: string;
      url?: string;
      events?: string[];
      active?: boolean;
    };

    if (!endpointId) {
      return NextResponse.json(
        { error: 'endpointId is required' },
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
    const idx = existing.findIndex((e) => e.id === endpointId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    const updated = [...existing];
    updated[idx] = {
      ...updated[idx],
      ...(url !== undefined && { url }),
      ...(events !== undefined && { events }),
      ...(active !== undefined && { isActive: active }),
      updatedAt: new Date().toISOString(),
    };

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

    const { secret: _s, ...safe } = updated[idx];
    return NextResponse.json({ ...safe, secretLast4: _s ? '****' + _s.slice(-4) : null });
  } catch (error) {
    console.error('[API] PUT /api/webhooks/config error:', error);
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/webhooks/config — remove a webhook endpoint
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;
    const body = await request.json();
    const { endpointId } = body as {
      endpointId: string;
    };

    if (!endpointId) {
      return NextResponse.json(
        { error: 'endpointId is required' },
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
