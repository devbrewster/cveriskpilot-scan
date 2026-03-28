import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePOAM, exportPOAMCsv, exportPOAMJson } from '@cveriskpilot/compliance';
import { getServerSession } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/compliance/poam — Generate POAM from open cases
// Query params: clientId, format (csv|json), organizationId
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const format = searchParams.get('format') ?? 'json';
    const organizationId = session.organizationId;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter is required' },
        { status: 400 },
      );
    }

    // Fetch the organization name
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const orgName = org?.name ?? 'Organization';

    // Fetch open vulnerability cases for this client
    const cases = await prisma.vulnerabilityCase.findMany({
      where: {
        organizationId,
        clientId,
        status: {
          notIn: ['VERIFIED_CLOSED', 'FALSE_POSITIVE', 'NOT_APPLICABLE', 'DUPLICATE'],
        },
      },
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
      },
      orderBy: { severity: 'asc' },
    });

    // Map to the input type expected by the generator
    const caseInputs = cases.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      cveIds: c.cveIds,
      cweIds: c.cweIds,
      severity: c.severity,
      cvssScore: c.cvssScore,
      status: c.status,
      assignedToId: c.assignedToId,
      assignedTo: c.assignedTo,
      dueAt: c.dueAt?.toISOString() ?? null,
      firstSeenAt: c.firstSeenAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      findingCount: c.findingCount,
      remediationNotes: c.remediationNotes,
    }));

    const poamItems = generatePOAM(caseInputs, orgName);

    if (format === 'csv') {
      const csv = exportPOAMCsv(poamItems);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="poam-${clientId}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    if (format === 'json-download') {
      const json = exportPOAMJson(poamItems);
      return new NextResponse(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="poam-${clientId}-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // Default: return as API response
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      organizationName: orgName,
      clientId,
      totalItems: poamItems.length,
      items: poamItems,
    });
  } catch (error) {
    console.error('POAM generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate POAM' },
      { status: 500 },
    );
  }
}
