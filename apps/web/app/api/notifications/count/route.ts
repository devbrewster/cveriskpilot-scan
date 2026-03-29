import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/notifications/count — unread notification count for a user
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

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
