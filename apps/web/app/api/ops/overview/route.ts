import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Domain gate helper — only @cveriskpilot.com emails may access ops APIs.
// In production this would decode the session JWT; here we read the mock
// session cookie set by /api/auth/session.
// ---------------------------------------------------------------------------

async function getStaffEmail(_req: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('crp_session');
  if (!session?.value) return null;

  try {
    // Session cookie is base64-encoded JSON (matches auth-context-provider flow)
    const payload = JSON.parse(
      Buffer.from(session.value, 'base64').toString('utf-8'),
    );
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    // If the cookie isn't base64 JSON, treat it as an opaque token and
    // fall back to fetching from the session API internally.
    // For the MVP mock, we allow access if the cookie exists (middleware
    // already validated the domain).
    return null;
  }
}

function isStaffEmail(email: string | null): boolean {
  if (!email) return false;
  return email.endsWith('@cveriskpilot.com');
}

// ---------------------------------------------------------------------------
// GET /api/ops/overview — platform-wide mock stats
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // Domain-gate: only internal staff
  const email = await getStaffEmail(req);
  if (!isStaffEmail(email)) {
    // Middleware already handles redirection / 403 for /ops/* pages,
    // but API routes should also self-protect.
    return NextResponse.json({ error: 'Internal staff only' }, { status: 403 });
  }

  // Mock data — replace with real Prisma aggregation queries in production
  const overview = {
    totalOrgs: 47,
    activeUsers30d: 312,
    mrr: 18_450,
    totalScans: 1_284,
    openCases: 763,
    avgMttrDays: 4.2,
  };

  return NextResponse.json(overview);
}
