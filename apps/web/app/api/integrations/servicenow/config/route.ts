import { NextRequest, NextResponse } from 'next/server';
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
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId query param is required' },
        { status: 400 },
      );
    }

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
    const body = await request.json();
    const {
      organizationId,
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
      organizationId?: string;
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

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const settings = (org.entitlements ?? {}) as Record<string, unknown>;
    const existing = (settings.servicenow ?? {}) as Partial<StoredServiceNowConfig>;

    // Merge — only overwrite provided fields
    const updated: StoredServiceNowConfig = {
      instanceUrl: instanceUrl ?? existing.instanceUrl ?? '',
      authType: authType ?? existing.authType ?? 'basic',
      username: username ?? existing.username ?? '',
      password: password ?? existing.password ?? '',
      clientId: clientId ?? existing.clientId ?? '',
      clientSecret: clientSecret ?? existing.clientSecret ?? '',
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
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId query param is required' },
        { status: 400 },
      );
    }

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
