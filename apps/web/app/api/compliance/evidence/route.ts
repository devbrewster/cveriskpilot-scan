import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';

/**
 * GET /api/compliance/evidence — List evidence records for the org
 *
 * Query params:
 *   frameworkId — filter by framework (e.g. "nist-800-53")
 *   controlId  — filter by control (e.g. "AC-3")
 *   status     — filter by status (CURRENT, STALE, MISSING, EXPIRED)
 *   source     — filter by source (AUTO_SCAN, MANUAL_UPLOAD, etc.)
 *   clientId   — filter by client (MSSP)
 *   page       — pagination (default 1)
 *   limit      — page size (default 25, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const url = request.nextUrl;
    const frameworkId = url.searchParams.get('frameworkId');
    const controlId = url.searchParams.get('controlId');
    const status = url.searchParams.get('status');
    const source = url.searchParams.get('source');
    const clientId = url.searchParams.get('clientId');
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 25));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      organizationId: session.organizationId,
    };
    if (frameworkId) where.frameworkId = frameworkId;
    if (controlId) where.controlId = controlId;
    if (status) where.status = status;
    if (source) where.source = source;
    if (clientId) where.clientId = clientId;

    const [records, total] = await Promise.all([
      prisma.complianceEvidenceRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.complianceEvidenceRecord.count({ where }),
    ]);

    // Compute summary stats
    const stats = await prisma.complianceEvidenceRecord.groupBy({
      by: ['status'],
      where: { organizationId: session.organizationId },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    for (const s of stats) {
      statusCounts[s.status] = s._count;
    }

    return NextResponse.json({
      records,
      total,
      page,
      limit,
      stats: {
        current: statusCounts.CURRENT ?? 0,
        stale: statusCounts.STALE ?? 0,
        missing: statusCounts.MISSING ?? 0,
        expired: statusCounts.EXPIRED ?? 0,
        total,
      },
    });
  } catch (error) {
    console.error('Evidence list error:', error);
    return NextResponse.json(
      { error: 'Failed to load evidence records' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/compliance/evidence — Create a new evidence record (manual entry)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'cases:create');
    if (permError) return permError;

    const body = await request.json();
    const {
      frameworkId,
      controlId,
      controlTitle,
      title,
      description,
      body: evidenceBody,
      source,
      sourceSystem,
      sourceRef,
      freshnessDays,
      expiresAt,
      clientId,
      tags,
    } = body as Record<string, unknown>;

    // Validate required fields
    if (!frameworkId || typeof frameworkId !== 'string') {
      return NextResponse.json({ error: 'frameworkId is required' }, { status: 400 });
    }
    if (!controlId || typeof controlId !== 'string') {
      return NextResponse.json({ error: 'controlId is required' }, { status: 400 });
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const record = await prisma.complianceEvidenceRecord.create({
      data: {
        organizationId: session.organizationId,
        clientId: typeof clientId === 'string' ? clientId : null,
        frameworkId: frameworkId as string,
        controlId: controlId as string,
        controlTitle: typeof controlTitle === 'string' ? controlTitle : controlId as string,
        title: title as string,
        description: typeof description === 'string' ? description : null,
        body: typeof evidenceBody === 'string' ? evidenceBody : null,
        status: 'CURRENT',
        source: typeof source === 'string' ? (source as 'MANUAL_ENTRY') : 'MANUAL_ENTRY',
        collectorId: session.userId,
        collectorName: session.email ?? session.userId,
        sourceSystem: typeof sourceSystem === 'string' ? sourceSystem : null,
        sourceRef: typeof sourceRef === 'string' ? sourceRef : null,
        freshnessDays: typeof freshnessDays === 'number' ? freshnessDays : 90,
        expiresAt: typeof expiresAt === 'string' ? new Date(expiresAt) : null,
        verifiedAt: new Date(),
        tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string') : [],
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Evidence create error:', error);
    return NextResponse.json(
      { error: 'Failed to create evidence record' },
      { status: 500 },
    );
  }
}
