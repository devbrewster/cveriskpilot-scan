import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Return a safe subset — never expose internal session IDs or tokens
  return NextResponse.json({
    authenticated: true,
    userId: session.userId,
    organizationId: session.organizationId,
    role: session.role,
    email: session.email,
    clientId: session.clientId ?? null,
    clientName: session.clientName ?? null,
    // Tier is stored on the org in the database, not in session.
    // For now, return a placeholder — will be enhanced when billing is wired.
    tier: (session as Record<string, unknown>).tier as string ?? 'FREE',
  });
}
