import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkCsrf, requireRole, WRITE_ROLES } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/notifications — list notifications for the authenticated user (paginated)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { searchParams } = new URL(request.url);
    const userId = session.userId;
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '20')));
    const filter = searchParams.get('filter'); // all | unread | mention | assignment | sla

    const where: Record<string, unknown> = { userId, organizationId: session.organizationId };

    if (filter === 'unread') {
      where.isRead = false;
    } else if (filter && filter !== 'all') {
      // Map filter names to notification types
      const typeMap: Record<string, string> = {
        mentions: 'mention',
        assignments: 'assignment',
        sla: 'sla_breach',
      };
      if (typeMap[filter]) {
        where.type = typeMap[filter];
      }
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/notifications — mark notifications as read
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const auth2 = await requireAuth(request);
    if (auth2 instanceof NextResponse) return auth2;
    const session = auth2;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, WRITE_ROLES);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { notificationIds, markAllRead } = body as {
      notificationIds?: string[];
      markAllRead?: boolean;
    };

    const userId = session.userId;
    const now = new Date();

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, organizationId: session.organizationId, isRead: false },
        data: { isRead: true, readAt: now },
      });
    } else if (notificationIds && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId, // ensure the user owns these notifications
          organizationId: session.organizationId,
        },
        data: { isRead: true, readAt: now },
      });
    } else {
      return NextResponse.json(
        { error: 'notificationIds or markAllRead is required' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
