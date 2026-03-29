import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateExternalUrl, encryptForTenant } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

/**
 * ServiceNow integration config stored in org.entitlements.servicenow.
 *
 * GET  — retrieve the org's current ServiceNow config (credentials masked).
 * PUT  — create or update the org's ServiceNow config.
 * DELETE — remove the org's ServiceNow config.
 */

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

export async function GET(request: NextRequest) {
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
    const snConfig = (settings.servicenow ?? {}) as Partial<StoredServiceNowConfig>;

    // Never return raw credentials — mask them
    return NextResponse.json({
      instanceUrl: snConfig.instanceUrl ?? '',
      authType: snConfig.authType ?? 'basic',
      username: snConfig.username ?? '',
      hasPassword: Boolean(snConfig.password),
      hasClientSecret: Boolean(snConfig.clientSecret),
      clientId: snConfig.clientId ?? '',
      tokenUrl: snConfig.tokenUrl ?? '',
      assignmentGroup: snConfig.assignmentGroup ?? '',
      category: snConfig.category ?? 'Security',
    });
  } catch (error) {
    console.error('[API] GET /api/integrations/servicenow/config error:', error);
    return NextResponse.json(
      { error: 'Failed to load ServiceNow config' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { organizationId } = session;

    const body = await request.json();
    const {
      instanceUrl,
      authType,
      username,
      password,
      clientId,
      clientSecret,
      tokenUrl,
      assignmentGroup,
      category,
    } = body as {
      instanceUrl?: string;
      authType?: 'basic' | 'oauth2';
      username?: string;
      password?: string;
      clientId?: string;
      clientSecret?: string;
      tokenUrl?: string;
      assignmentGroup?: string;
      category?: string;
    };

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const settings = (org.entitlements ?? {}) as Record<string, unknown>;
    const existing = (settings.servicenow ?? {}) as Partial<StoredServiceNowConfig>;

    // SSRF protection — validate instanceUrl
    const effectiveUrl = instanceUrl ?? existing.instanceUrl ?? '';
    if (effectiveUrl) {
      const urlCheck = validateExternalUrl(effectiveUrl);
      if (!urlCheck.valid) {
        return NextResponse.json({ error: `Invalid instanceUrl: ${urlCheck.reason}` }, { status: 400 });
      }
    }

    // Encrypt sensitive fields before storing
    let encryptedPassword = existing.password ?? '';
    let encryptedClientSecret = existing.clientSecret ?? '';

    try {
      if (password) {
        const encrypted = await encryptForTenant(password, organizationId);
        encryptedPassword = JSON.stringify(encrypted);
      }
      if (clientSecret) {
        const encrypted = await encryptForTenant(clientSecret, organizationId);
        encryptedClientSecret = JSON.stringify(encrypted);
      }
    } catch {
      // If encryption is unavailable (e.g., dev without keys), store as-is
      console.warn('[servicenow/config] Encryption unavailable — storing credentials in plaintext');
      if (password) encryptedPassword = password;
      if (clientSecret) encryptedClientSecret = clientSecret;
    }

    // Merge — only overwrite provided fields
    const updated: StoredServiceNowConfig = {
      instanceUrl: effectiveUrl,
      authType: authType ?? existing.authType ?? 'basic',
      username: username ?? existing.username ?? '',
      password: encryptedPassword,
      clientId: clientId ?? existing.clientId ?? '',
      clientSecret: encryptedClientSecret,
      tokenUrl: tokenUrl ?? existing.tokenUrl ?? '',
      assignmentGroup: assignmentGroup ?? existing.assignmentGroup ?? '',
      category: category ?? existing.category ?? 'Security',
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        entitlements: {
          ...settings,
          servicenow: updated,
        } as any,
      },
    });

    // Return masked response
    return NextResponse.json({
      instanceUrl: updated.instanceUrl,
      authType: updated.authType,
      username: updated.username,
      hasPassword: Boolean(updated.password),
      hasClientSecret: Boolean(updated.clientSecret),
      clientId: updated.clientId,
      tokenUrl: updated.tokenUrl,
      assignmentGroup: updated.assignmentGroup,
      category: updated.category,
    });
  } catch (error) {
    console.error('[API] PUT /api/integrations/servicenow/config error:', error);
    return NextResponse.json(
      { error: 'Failed to update ServiceNow config' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    delete settings.servicenow;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        entitlements: settings as any,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/integrations/servicenow/config error:', error);
    return NextResponse.json(
      { error: 'Failed to remove ServiceNow config' },
      { status: 500 },
    );
  }
}
