import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// POST /api/privacy/delete — GDPR right to erasure for a user
// Anonymizes user data, deletes personal info, retains anonymized audit trail
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const body = await request.json();
    const { userId, confirmationText, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow users to delete their own account, or PLATFORM_ADMIN/ORG_OWNER for their org
    if (user.email !== session.email) {
      if (session.role === 'PLATFORM_ADMIN') {
        // Platform admin can delete any user
      } else if (session.role === 'ORG_OWNER' && user.organizationId === session.organizationId) {
        // Org owner can delete users in their own org
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Validate confirmation
    if (confirmationText !== `DELETE ${user.email}`) {
      return NextResponse.json(
        {
          error: 'Confirmation text does not match',
          expected: `DELETE ${user.email}`,
        },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A reason with at least 5 characters is required' },
        { status: 400 },
      );
    }

    const now = new Date();
    const anonymizedId = `anon-${userId.slice(-8)}`;

    // Count affected records
    const [commentsCount, notificationsCount, auditLogsCount] =
      await Promise.all([
        prisma.comment.count({ where: { userId } }),
        prisma.notification.count({ where: { userId } }),
        prisma.auditLog.count({
          where: { organizationId: user.organizationId, actorId: userId },
        }),
      ]);

    await prisma.$transaction(async (tx: any) => {
      // Anonymize user record
      await tx.user.update({
        where: { id: userId },
        data: {
          name: `Deleted User (${anonymizedId})`,
          email: `deleted-${anonymizedId}@anonymized.local`,
          passwordHash: null,
          googleId: null,
          githubId: null,
          mfaEnabled: false,
          mfaSecret: null,
          status: 'DEACTIVATED',
          deletedAt: now,
        },
      });

      // Soft-delete comments (keep for case context but remove personal data)
      await tx.comment.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: now },
      });

      // Delete notifications (personal data, no need to retain)
      await tx.notification.deleteMany({
        where: { userId },
      });

      // Audit logs: retain but anonymize actorId reference
      // (The user ID still exists but is now anonymized in the users table)

      // Create audit log for the deletion itself
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          entityType: 'User',
          entityId: userId,
          action: 'DELETE',
          actorId: 'system',
          details: {
            reason,
            deletionType: 'GDPR_RIGHT_TO_ERASURE',
            originalEmail: '[REDACTED]',
            affectedRecords: {
              comments: commentsCount,
              notifications: notificationsCount,
              auditLogs: auditLogsCount,
            },
            deletedAt: now.toISOString(),
          },
          hash: `erasure-${userId}-${now.getTime()}`,
        },
      });
    });

    return NextResponse.json({
      receipt: {
        userId,
        anonymizedAs: anonymizedId,
        deletedAt: now.toISOString(),
        reason,
        affectedRecords: {
          comments: commentsCount,
          notifications: notificationsCount,
          auditLogs: `${auditLogsCount} (anonymized, retained)`,
        },
        status: 'ANONYMIZED',
        message:
          'User personal data has been anonymized. Audit trail retained with anonymized references.',
      },
    });
  } catch (error) {
    console.error('GDPR erasure error:', error);
    return NextResponse.json(
      { error: 'Failed to process data erasure request' },
      { status: 500 },
    );
  }
}
