import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/notifications/count — unread notification count for a user
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always use the authenticated user's ID — ignore any query param
    const userId = session.userId;

    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('[API] GET /api/notifications/count error:', error);
    return NextResponse.json({ error: 'Failed to count notifications' }, { status: 500 });
  }
}
