import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/privacy/export — GDPR data export (all personal data for a user)
// Uses authenticated session — users can only export their own data.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // Users can only export their own data
    const userId = session.userId;
    const organizationId = session.organizationId;

    // Fetch the user and all associated personal data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive fields: passwordHash, mfaSecret, googleId, githubId
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch associated data
    const [comments, notifications, auditLogs, teamMemberships] =
      await Promise.all([
        prisma.comment.findMany({
          where: { userId },
          select: {
            id: true,
            content: true,
            createdAt: true,
            vulnerabilityCaseId: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            isRead: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.findMany({
          where: { organizationId, actorId: userId },
          select: {
            id: true,
            entityType: true,
            entityId: true,
            action: true,
            createdAt: true,
            // Exclude details and hashes for privacy export
          },
          orderBy: { createdAt: 'desc' },
          take: 1000, // Limit for performance
        }),
        prisma.teamMembership.findMany({
          where: { userId },
          include: {
            team: { select: { id: true, name: true } },
          },
        }),
      ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'GDPR_DATA_EXPORT',
      subject: {
        ...user,
      },
      comments: comments.map((c: any) => ({
        id: c.id,
        content: c.content,
        caseId: c.vulnerabilityCaseId,
        createdAt: c.createdAt,
      })),
      notifications: notifications.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.isRead,
        createdAt: n.createdAt,
      })),
      auditActivity: auditLogs.map((a: any) => ({
        id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        createdAt: a.createdAt,
      })),
      teamMemberships: teamMemberships.map((tm: any) => ({
        teamId: tm.team.id,
        teamName: tm.team.name,
        role: tm.role,
        joinedAt: tm.createdAt,
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="gdpr-export-${userId}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error('GDPR export error:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 },
    );
  }
}
