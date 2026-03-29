import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, validateExternalUrl, checkCsrf, encryptForTenant, requireRole, ADMIN_ROLES, getSensitiveWriteLimiter } from '@cveriskpilot/auth';
import type { EncryptedPayload } from '@cveriskpilot/auth';
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
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

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
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // Rate limiting — 10 req/min per user
    try {
      const limiter = getSensitiveWriteLimiter();
      const rl = await limiter.check(`webhook_config:${session.userId}`);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
        );
      }
    } catch {
      // Redis not available — skip rate limiting
    }

    const roleError = requireRole(session.role, ADMIN_ROLES);
    if (roleError) return roleError;

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

    // SSRF protection — validate webhook URL
    const urlCheck = validateExternalUrl(url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: `Invalid URL: ${urlCheck.reason}` }, { status: 400 });
    }

    // CSRF protection
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { entitlements: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Encrypt the webhook signing secret before storing
    let storedSecret: string | EncryptedPayload = secret;
    try {
      storedSecret = await encryptForTenant(secret, organizationId);
    } catch {
      return NextResponse.json(
        { error: 'Encryption service unavailable. Cannot store secrets.' },
        { status: 503 },
      );
    }

    const existing = getEndpoints(org.entitlements);
    const newEndpoint: WebhookEndpointConfig = {
      id: crypto.randomUUID(),
      url,
      secret: typeof storedSecret === 'string' ? storedSecret : JSON.stringify(storedSecret),
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

    // Audit log for webhook creation
    try {
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorId: session.userId,
          action: 'CREATE',
          entityType: 'WebhookEndpoint',
          entityId: newEndpoint.id,
          details: { url, events },
          hash: `create-webhook-${newEndpoint.id}-${Date.now()}`,
        },
      });
    } catch {
      // Non-fatal
    }

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
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // Rate limiting — 10 req/min per user
    try {
      const limiter = getSensitiveWriteLimiter();
      const rl = await limiter.check(`webhook_config:${session.userId}`);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
        );
      }
    } catch {
      // Redis not available — skip rate limiting
    }

    const roleError2 = requireRole(session.role, ADMIN_ROLES);
    if (roleError2) return roleError2;

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

    // SSRF protection — validate webhook URL if being updated
    if (url !== undefined) {
      const urlCheck = validateExternalUrl(url);
      if (!urlCheck.valid) {
        return NextResponse.json({ error: `Invalid URL: ${urlCheck.reason}` }, { status: 400 });
      }
    }

    // CSRF protection
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

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

    // Audit log for webhook update
    try {
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorId: session.userId,
          action: 'UPDATE',
          entityType: 'WebhookEndpoint',
          entityId: endpointId,
          details: { url, events, active },
          hash: `update-webhook-${endpointId}-${Date.now()}`,
        },
      });
    } catch {
      // Non-fatal
    }

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
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // CSRF protection
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleError3 = requireRole(session.role, ADMIN_ROLES);
    if (roleError3) return roleError3;

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

    // Audit log for webhook deletion
    try {
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorId: session.userId,
          action: 'DELETE',
          entityType: 'WebhookEndpoint',
          entityId: endpointId,
          details: {},
          hash: `delete-webhook-${endpointId}-${Date.now()}`,
        },
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/webhooks/config error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
