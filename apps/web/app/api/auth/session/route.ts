import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Try Redis-backed session first
  try {
    const { getServerSession } = await import('@cveriskpilot/auth');
    const session = await getServerSession(request);
    if (session) {
      return NextResponse.json({
        authenticated: true,
        userId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        email: session.email,
        clientId: session.clientId ?? null,
        clientName: session.clientName ?? null,
        tier: (session as unknown as Record<string, unknown>).tier as string ?? 'FREE',
      });
    }
  } catch {
    // Redis unavailable — fall through to dev cookie check
  }

  // Dev-mode fallback: decode dev session from cookie
  if (process.env.NODE_ENV !== 'production') {
    const cookie = request.cookies.get('crp_session')?.value;
    if (cookie?.startsWith('dev:')) {
      try {
        const data = JSON.parse(
          Buffer.from(cookie.slice(4), 'base64').toString('utf-8'),
        );
        return NextResponse.json({
          authenticated: true,
          userId: data.userId,
          organizationId: data.organizationId,
          role: data.role,
          email: data.email,
          clientId: data.clientId ?? null,
          clientName: data.clientName ?? null,
          tier: data.tier ?? 'FREE',
        });
      } catch {
        // Invalid dev cookie — fall through
      }
    }
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
