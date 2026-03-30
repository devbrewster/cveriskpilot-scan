/**
 * Passkey (WebAuthn) registration endpoints.
 *
 * STATUS: Not yet implemented — returns 501 until DB persistence and
 * session integration are completed. See packages/auth/src/security/webauthn.ts
 * for the underlying crypto which is ready.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSensitiveWriteLimiter } from '@cveriskpilot/auth';

async function rateLimitCheck(request: NextRequest): Promise<NextResponse | null> {
  try {
    const limiter = getSensitiveWriteLimiter();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const allowed = await limiter.check(ip);
    if (!allowed.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  } catch { /* Redis unavailable — don't block */ }
  return null;
}

export async function POST(request: NextRequest) {
  const limited = await rateLimitCheck(request);
  if (limited) return limited;

  return NextResponse.json(
    { ok: false, error: { code: 'not_implemented', message: 'Passkey registration is not yet available.' } },
    { status: 501 },
  );
}

export async function PUT(request: NextRequest) {
  const limited = await rateLimitCheck(request);
  if (limited) return limited;

  return NextResponse.json(
    { ok: false, error: { code: 'not_implemented', message: 'Passkey registration is not yet available.' } },
    { status: 501 },
  );
}
