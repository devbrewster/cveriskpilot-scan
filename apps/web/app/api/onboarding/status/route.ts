import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

/**
 * GET /api/onboarding/status
 * Returns checklist items with completion status for the current user's org.
 * Used by the onboarding checklist component on the dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const orgId = session.organizationId;

    // Check completion of each onboarding step in parallel
    const [scanCount, caseCount, teamCount] = await Promise.all([
      prisma.scanArtifact.count({ where: { organizationId: orgId }, take: 1 }),
      prisma.vulnerabilityCase.count({ where: { organizationId: orgId }, take: 1 }),
      prisma.user.count({ where: { organizationId: orgId } }),
    ]);

    const items = [
      {
        id: 'upload',
        title: 'Upload your first scan',
        description: 'Drag & drop a scan file (Nessus, SARIF, CycloneDX, and 8 more)',
        href: '/upload',
        completed: scanCount > 0,
      },
      {
        id: 'findings',
        title: 'Review your findings',
        description: 'See enriched vulnerabilities with EPSS scores and KEV status',
        href: '/findings',
        completed: caseCount > 0,
      },
      {
        id: 'compliance',
        title: 'Select compliance frameworks',
        description: 'Map findings to NIST 800-53, SOC 2, CMMC, and more',
        href: '/compliance',
        completed: false, // Always show — encourage revisiting
      },
      {
        id: 'team',
        title: 'Invite your team',
        description: 'Add analysts and developers to collaborate on remediation',
        href: '/settings/users',
        completed: teamCount > 1,
      },
    ];

    const allComplete = items.every(i => i.completed);

    return NextResponse.json({ items, allComplete });
  } catch (error) {
    console.error('[API] GET /api/onboarding/status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding status' },
      { status: 500 },
    );
  }
}
